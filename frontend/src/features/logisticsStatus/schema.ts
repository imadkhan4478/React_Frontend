import { z } from 'zod'

/**
 * One zod object per wizard step, merged into a single draft schema. The
 * wizard validates only the current step's fields via `trigger(fields)` on
 * each Next click, so a schema-level `required` on a later step's field never
 * blocks an earlier one — see wizard/LogisticsStatusWizard.tsx.
 *
 * STEP LAYOUT (5 steps, Packing replaces the old Transportation step):
 *   1. Order        — header (order type, origin, customer, MO no., incoterm) + item lines
 *   2. Packing       — one or more packages, each with its own cost/status/
 *                      weight, plus a per-package allocation of item quantities
 *   3. Shipping      — ports, containers, sailing dates (Export-heavy, unchanged shape)
 *   4. Expenditures  — cost lines (unchanged shape)
 *   5. Status        — order status, marketing delay, trucking handoff readout,
 *                      and the full remarks feed (user-entered + system-generated)
 *
 * TRANSPORTATION IS NO LONGER A LOGISTICS STEP. Per the confirmed design, an
 * order moves to Trucking via a "Send to Trucking" checkbox on Step 5. Once
 * checked, the order becomes an open request in Trucking Status; Logistics
 * only ever shows a READ-THROUGH summary of the trucking job's progress here
 * (transporter, vehicle/package count, tracking rollup) — it never edits
 * trucking fields directly. See sentToTrucking / TruckingReadthrough below.
 *
 * PER-ITEM RFD AUDIT TRAIL: plannedRfdDate and actualRfdDate can both be
 * changed after the fact, and every change must be logged — who changed it,
 * when, and what the previous value was — surfaced as system-generated
 * remarks alongside the user's own. This lives on rfdHistory, one entry per
 * change, keyed to the item it belongs to (confirmed: per item, not per
 * order, since each item can genuinely run to a different production
 * timeline within the same order).
 */

export const ORDER_TYPES = ['Export', 'Local'] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DAP'] as const
export type Incoterm = (typeof INCOTERMS)[number]

/** Number inputs hand back '' when cleared — treat that as absent, not 0. */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || Number.isNaN(v) ? undefined : v),
  z.coerce.number().nonnegative().optional(),
)

// --- Per-item RFD change audit ---------------------------------------------

/**
 * One logged change to an item's planned or actual RFD date. Append-only —
 * never edited or removed once written, except that an admin may edit the
 * REMARK text of an existing entry (never the date values themselves, and
 * never who/when). This mirrors importsStatus's ETA/status-history-as-events
 * pattern: history is a fact record, not a mutable field.
 */
export const rfdChangeEventSchema = z.object({
  id: z.string(),
  field: z.enum(['plannedRfdDate', 'actualRfdDate']),
  previousValue: z.string().optional(), // '' / undefined = was not set before
  newValue: z.string(),
  changedBy: z.string(), // username/display name of who made the change
  changedAt: z.string(), // ISO datetime
  /** User-entered note attached to this specific change. Only an admin may
   *  edit this after the fact (see canEditRemark in the data layer) — the
   *  date/who/when fields themselves are never editable by anyone. */
  remark: z.string().optional(),
})
export type RfdChangeEvent = z.infer<typeof rfdChangeEventSchema>

// --- Step 1: Order item lines ----------------------------------------------

/**
 * One line per item in the order. Export no. sits HERE, not on the header —
 * a single order can bundle items filed under different exports.
 *
 * netWeight is DERIVED (quantity × unitWeight) — see totalNetWeight/
 * itemNetWeight below — never a field the user types into directly. It's
 * kept out of the persisted schema for that reason; only unitWeight and
 * grossWeight are real inputs.
 */
export const logisticsItemSchema = z.object({
  id: z.string(),
  jobNo: z.string().default(''),
  itemDetail: z.string().default(''),
  quantity: optionalNumber,
  unitWeight: optionalNumber, // per-unit weight; netWeight = quantity × unitWeight, derived
  grossWeight: optionalNumber,
  idm: z.string().default(''),
  /** Export orders only. Independent per item. */
  exportNo: z.string().optional(),
  batchNo: z.string().optional(),
  plannedRfdDate: z.string().optional(), // ISO yyyy-mm-dd
  actualRfdDate: z.string().optional(),
  /** Append-only log of every change to either RFD date on this item. */
  rfdHistory: z.array(rfdChangeEventSchema).default([]),
})
export type LogisticsItem = z.infer<typeof logisticsItemSchema>

export const emptyItem = (id: string): LogisticsItem => ({
  id, jobNo: '', itemDetail: '', quantity: undefined, unitWeight: undefined, grossWeight: undefined,
  idm: '', exportNo: '', batchNo: '', plannedRfdDate: '', actualRfdDate: '', rfdHistory: [],
})

// --- Step 1: Order details --------------------------------------------------
export const consignmentSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES),
    // Origin is a country for exports, and city + province for local orders.
    originCountry: z.string().optional(),
    originCity: z.string().optional(),
    originProvince: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    moNo: z.string().optional(), // MO (Manufacturing/Marketing Order) number
    incoterm: z.enum(INCOTERMS).optional().or(z.literal('')),
    items: z.array(logisticsItemSchema).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.orderType === 'Export') {
      if (!val.originCountry?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['originCountry'], message: 'Country of origin is required for exports' })
      }
    } else {
      if (!val.originCity?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['originCity'], message: 'City is required for local orders' })
      }
      if (!val.originProvince?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['originProvince'], message: 'Province is required for local orders' })
      }
    }
    if (val.items.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Add at least one item' })
    }
    val.items.forEach((item, i) => {
      if (!item.itemDetail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i, 'itemDetail'], message: 'Item detail is required' })
      }
      if (item.quantity === undefined || item.quantity <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i, 'quantity'], message: 'Quantity must be greater than 0' })
      }
      if (!item.idm) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i, 'idm'], message: 'IDM is required' })
      }
      if (val.orderType === 'Export' && !item.exportNo?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i, 'exportNo'], message: 'Export no. is required for exports' })
      }
    })
  })

// --- Step 2: Packing (replaces Transportation) ------------------------------

export const PACKING_STATUSES = [
  'Sourcing packing material',
  'Under Packing',
  'Under Paint',
  'Under Final Packing',
  'Packed',
] as const
export type PackingStatus = (typeof PACKING_STATUSES)[number]

/**
 * One line per allocation of an item's quantity into a package — a package
 * routinely holds partial quantities from more than one item, so this is a
 * many-to-many join, not a single itemId per package.
 */
export const packageAllocationSchema = z.object({
  id: z.string(),
  itemId: z.string(), // references LogisticsItem.id
  quantity: optionalNumber, // quantity of that item placed in this package
})
export type PackageAllocation = z.infer<typeof packageAllocationSchema>

/**
 * One physical package. An export number can have several packages; this
 * mirrors the item/container arrays elsewhere in this schema (repeating
 * useFieldArray panel, not a flat field).
 */
export const logisticsPackageSchema = z.object({
  id: z.string(),
  colourCode: z.string().optional(),
  packingWorks: z.string().optional(), // factory where packing is done
  packingReadyDate: z.string().optional(),
  packingDate: z.string().optional(),
  // packingDelay is derived: (planned or actual RFD) − packingDate — never keyed in.
  quotedPackingCost: optionalNumber,
  actualPackingCost: optionalNumber,
  // savings is derived: quoted − actual — never keyed in.
  grossWeight: optionalNumber,
  status: z.enum(PACKING_STATUSES).default('Sourcing packing material'),
  allocations: z.array(packageAllocationSchema).default([]),
})
export type LogisticsPackage = z.infer<typeof logisticsPackageSchema>

export const emptyPackage = (id: string): LogisticsPackage => ({
  id, colourCode: '', packingWorks: '', packingReadyDate: '', packingDate: '',
  quotedPackingCost: undefined, actualPackingCost: undefined, grossWeight: undefined,
  status: 'Sourcing packing material', allocations: [],
})

export const packingSchema = z.object({
  packages: z.array(logisticsPackageSchema).default([]),
})

// --- Step 3: Shipping --------------------------------------------------------
export const logisticsContainerSchema = z.object({
  id: z.string(),
  containerNo: z.string().optional(),
  containerType: z.string().default(''),
})
export type LogisticsContainer = z.infer<typeof logisticsContainerSchema>

export const emptyContainer = (id: string): LogisticsContainer => ({ id, containerNo: '', containerType: '' })

export const shippingSchema = z.object({
  containers: z.array(logisticsContainerSchema).default([]),
  pol: z.string().optional(),
  pod: z.string().optional(),
  shippingLine: z.string().optional(),
  clearingAgent: z.string().optional(),
  bookingNo: z.string().optional(),
  portInDate: z.string().optional(),
  etdSailingDate: z.string().optional(),
  croArrivalDate: z.string().optional(),
  actualArrivalDate: z.string().optional(),
  // arrivalDelayDays is derived (actual arrival - CRO arrival) and never keyed in.
})

// --- Step 4: Expenditures ----------------------------------------------------
export const expendituresSchema = z.object({
  packingCost: z.number().min(0).optional(),
  transportationCharges: z.number().min(0).optional(),
  insurance: z.number().min(0).optional(),
  truckingLhrToKhi: z.number().min(0).optional(),
  fumigationCost: z.number().min(0).optional(),
  lashing: z.number().min(0).optional(),
  qflCharges: z.number().min(0).optional(),
  qflContainerMovement: z.number().min(0).optional(),
  customClearanceCharges: z.number().min(0).optional(),
  portCharges: z.number().min(0).optional(),
  dhlCharges: z.number().min(0).optional(),
  seaAirFreight: z.number().min(0).optional(),
})

// --- Step 5: Status ----------------------------------------------------------

/**
 * A single remarks-feed entry shown on the Status step. Both user-entered and
 * system-generated entries share this shape so they render in one
 * chronological feed; `system: true` entries are never editable by anyone
 * except an admin correcting the attached note (see canEditRemark).
 */
export const remarkEntrySchema = z.object({
  id: z.string(),
  text: z.string(),
  authoredBy: z.string(),
  authoredAt: z.string(), // ISO datetime
  system: z.boolean().default(false), // true = auto-generated from an RFD/date change
})
export type RemarkEntry = z.infer<typeof remarkEntrySchema>

export const statusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  /** Chronological feed: every user-entered remark ever saved, plus one
   *  system-generated entry per RFD/date change, never deleted — only an
   *  admin may edit an existing entry's text. */
  remarksLog: z.array(remarkEntrySchema).default([]),
  /** Gate-out date used only for the marketing-delay calculation on this
   *  step; the field itself used to live on the removed Transportation step.
   *  Optional — if absent, marketing delay falls back to (packing date − today). */
  gateOutDate: z.string().optional(),
  /** Sending to Trucking is a one-way handoff: once true, the order becomes
   *  an open request in Trucking Status. Flipping it back off does not pull
   *  the request back — that's a real workflow action, not a form toggle a
   *  user can silently undo (enforced in the wizard, not here). */
  sentToTrucking: z.boolean().default(false),
})

/**
 * Read-through summary of the linked Trucking job, shown (never edited) once
 * sentToTrucking is true. This is NOT part of the persisted draft — it's
 * computed by the data layer at read time from the Trucking store, the same
 * "live, never copied" convention Trucking itself uses for its own derived
 * rows, just mirrored back onto Logistics.
 */
export interface TruckingReadthrough {
  truckingJobId: string
  transporterName?: string
  vehicleCount: number
  trackingRollupLabel: string // e.g. "3/5 delivered · Loading"
  taken: boolean // true once a Trucking operator has clicked Take Action
}

/**
 * The wizard needs one flat object for react-hook-form. `consignmentSchema`
 * is a ZodEffects (superRefine), so the draft is composed from the raw shapes
 * and the cross-field refinement re-applied. Step-level validation uses the
 * per-step schemas above via `trigger`.
 */
export const consignmentDraftSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES),
    originCountry: z.string().optional(),
    originCity: z.string().optional(),
    originProvince: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    moNo: z.string().optional(),
    incoterm: z.enum(INCOTERMS).optional().or(z.literal('')),
    items: z.array(logisticsItemSchema).default([]),
  })
  .merge(packingSchema)
  .merge(shippingSchema)
  .merge(expendituresSchema)
  .merge(statusSchema)

export type LogisticsDraft = z.infer<typeof consignmentDraftSchema>

export const DRAFT_DEFAULT_VALUES: LogisticsDraft = {
  orderType: 'Export',
  originCountry: '',
  originCity: '',
  originProvince: '',
  customerName: '',
  moNo: '',
  incoterm: undefined,
  items: [emptyItem('item-1')],
  packages: [],
  containers: [],
  pol: '',
  pod: '',
  shippingLine: '',
  clearingAgent: '',
  bookingNo: '',
  portInDate: '',
  etdSailingDate: '',
  croArrivalDate: '',
  actualArrivalDate: '',
  packingCost: 0,
  transportationCharges: 0,
  insurance: 0,
  truckingLhrToKhi: 0,
  fumigationCost: 0,
  lashing: 0,
  qflCharges: 0,
  qflContainerMovement: 0,
  customClearanceCharges: 0,
  portCharges: 0,
  dhlCharges: 0,
  seaAirFreight: 0,
  status: '',
  remarksLog: [],
  gateOutDate: '',
  sentToTrucking: false,
}

export interface WizardStepDef {
  step: number
  key: string
  label: string
  fields: (keyof LogisticsDraft)[]
}

// Five steps: Order, Packing, Shipping, Expenditures, Status.
export const WIZARD_STEPS: WizardStepDef[] = [
  {
    step: 1,
    key: 'order',
    label: 'Order Details',
    fields: ['orderType', 'originCountry', 'originCity', 'originProvince', 'customerName', 'moNo', 'incoterm', 'items'],
  },
  { step: 2, key: 'packing', label: 'Packing', fields: ['packages'] },
  {
    step: 3,
    key: 'shipping',
    label: 'Shipping',
    fields: [
      'containers', 'pol', 'pod', 'shippingLine', 'clearingAgent',
      'bookingNo', 'portInDate', 'etdSailingDate', 'croArrivalDate', 'actualArrivalDate',
    ],
  },
  {
    step: 4,
    key: 'expenditures',
    label: 'Expenditures',
    fields: [
      'packingCost', 'transportationCharges', 'insurance', 'truckingLhrToKhi', 'fumigationCost',
      'lashing', 'qflCharges', 'qflContainerMovement', 'customClearanceCharges', 'portCharges',
      'dhlCharges', 'seaAirFreight',
    ],
  },
  { step: 5, key: 'status', label: 'Status', fields: ['status', 'remarksLog', 'gateOutDate', 'sentToTrucking'] },
]

// --- Status choices ----------------------------------------------------------
export const EXPORT_STATUSES = [
  'Under Production',
  'Under Packing',
  'Transportation',
  'Under Shipping Arrangement',
  'At QFL',
  'At Port',
  'On Water',
  'Delivered',
] as const

export const LOCAL_STATUSES = [
  'Under Production',
  'Under Packing',
  'Transportation',
  'Delivered',
] as const

export function statusesFor(orderType: OrderType): readonly string[] {
  return orderType === 'Export' ? EXPORT_STATUSES : LOCAL_STATUSES
}

// --- Derived-value helpers (calculated, never keyed in) ----------------------

export function daysBetween(fromISO?: string, toISO?: string): number | null {
  if (!fromISO || !toISO) return null
  const a = new Date(fromISO).getTime()
  const b = new Date(toISO).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/** netWeight for one item — DERIVED, quantity × unitWeight. Never stored. */
export function itemNetWeight(item: Pick<LogisticsItem, 'quantity' | 'unitWeight'>): number {
  return (item.quantity ?? 0) * (item.unitWeight ?? 0)
}

export const totalQuantity = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + (it.quantity ?? 0), 0)

/** Total net weight across every item — sums the derived per-item net weight. */
export const totalNetWeight = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + itemNetWeight(it), 0)

export const totalGrossWeight = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + (it.grossWeight ?? 0), 0)

export function ratePerWeight(actualFreight: number | undefined, items: LogisticsItem[]): number | null {
  const gross = totalGrossWeight(items)
  if (!actualFreight || !gross) return null
  return actualFreight / gross
}

export const exportNumbers = (items: LogisticsItem[]) =>
  [...new Set(items.map((it) => it.exportNo?.trim()).filter((x): x is string => !!x))]

export function itemPendingFields(item: LogisticsItem, orderType: OrderType): string[] {
  const out: string[] = []
  if (!item.itemDetail) out.push('Item detail')
  if (item.quantity === undefined) out.push('Quantity')
  if (!item.idm) out.push('IDM')
  if (orderType === 'Export' && !item.exportNo) out.push('Export no.')
  return out
}

/**
 * Marketing delay: packingDate − gateOutDate. If there's no gate-out date yet,
 * falls back to packingDate − today, so the metric is always meaningful even
 * before the order has a real gate-out date recorded (per the confirmed spec:
 * "if there is no gate out date then difference it with today").
 * Uses the LATEST packing date across all packages, since that's when the
 * order is actually packing-complete; null if there's no packing date at all.
 */
export function marketingDelay(packages: LogisticsPackage[], gateOutDate?: string): number | null {
  const packingDates = packages.map((p) => p.packingDate).filter((d): d is string => !!d)
  if (packingDates.length === 0) return null
  const latest = packingDates.reduce((a, b) => (a > b ? a : b))
  const reference = gateOutDate || new Date().toISOString().slice(0, 10)
  return daysBetween(reference, latest)
}

/** Packing delay for one package: (planned RFD, falling back to actual RFD,
 *  of the FIRST item allocated into it) − packingDate. A package can draw from
 *  several items with different RFDs; the earliest-allocated item's own
 *  timeline is what packing is actually racing against for that package. */
export function packingDelay(pkg: LogisticsPackage, items: LogisticsItem[]): number | null {
  if (!pkg.packingDate || pkg.allocations.length === 0) return null
  const firstItem = items.find((it) => it.id === pkg.allocations[0].itemId)
  const rfd = firstItem?.plannedRfdDate || firstItem?.actualRfdDate
  if (!rfd) return null
  return daysBetween(pkg.packingDate, rfd)
}

/** Quoted − actual packing cost. Null if either is missing. */
export function packingSavings(pkg: LogisticsPackage): number | null {
  if (pkg.quotedPackingCost == null || pkg.actualPackingCost == null) return null
  return pkg.quotedPackingCost - pkg.actualPackingCost
}

/** For one item: quantity allocated so far across every package. */
export function allocatedQuantity(itemId: string, packages: LogisticsPackage[]): number {
  return packages.reduce(
    (sum, pkg) => sum + pkg.allocations.filter((a) => a.itemId === itemId).reduce((s, a) => s + (a.quantity ?? 0), 0),
    0,
  )
}

/** Outstanding (unallocated) quantity for one item — item quantity minus what
 *  has been placed into packages so far. Can be split across many packages. */
export function outstandingQuantity(item: LogisticsItem, packages: LogisticsPackage[]): number {
  return (item.quantity ?? 0) - allocatedQuantity(item.id, packages)
}

/** Outstanding quantity for every item, keyed by item id — what the Packing
 *  step's bottom summary shows so the user can see at a glance what's left
 *  to place into a package. */
export function outstandingByItem(items: LogisticsItem[], packages: LogisticsPackage[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) out[item.id] = outstandingQuantity(item, packages)
  return out
}

/**
 * Records one RFD date change on an item: appends the audit event and updates
 * the field itself. Called from the wizard's save path, never inline in a
 * render — this is a state transition, not a derived read. Returns the
 * updated item (does not mutate the input).
 */
export function recordRfdChange(
  item: LogisticsItem,
  field: 'plannedRfdDate' | 'actualRfdDate',
  newValue: string,
  changedBy: string,
): LogisticsItem {
  const previousValue = item[field]
  if (previousValue === newValue) return item // no-op, nothing to log
  const event: RfdChangeEvent = {
    id: `rfd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field,
    previousValue,
    newValue,
    changedBy,
    changedAt: new Date().toISOString(),
  }
  return { ...item, [field]: newValue, rfdHistory: [...item.rfdHistory, event] }
}

/** Renders one RFD change event into a human-readable system remark line,
 *  e.g. "Planned RFD changed from 2026-08-01 to 2026-08-10 by Usman on
 *  2026-07-30" — this is what feeds the Status step's system-generated
 *  remarks alongside the user's own entries. */
export function formatRfdEvent(event: RfdChangeEvent, itemLabel: string): string {
  const fieldLabel = event.field === 'plannedRfdDate' ? 'Planned RFD' : 'Actual RFD'
  const from = event.previousValue || 'not set'
  const when = new Date(event.changedAt).toLocaleString()
  return `${itemLabel}: ${fieldLabel} changed from ${from} to ${event.newValue} by ${event.changedBy} on ${when}`
}

/** Every RFD change across every item, converted to remark entries, merged
 *  with the order's own remarksLog, and sorted chronologically — this is the
 *  single feed the Status step renders. System entries are marked so the UI
 *  can lock them from non-admin edits. */
export function buildRemarksFeed(items: LogisticsItem[], remarksLog: RemarkEntry[]): RemarkEntry[] {
  const systemEntries: RemarkEntry[] = items.flatMap((item, i) =>
    item.rfdHistory.map((event) => ({
      id: event.id,
      text: formatRfdEvent(event, item.itemDetail || `Item ${i + 1}`),
      authoredBy: event.changedBy,
      authoredAt: event.changedAt,
      system: true,
    })),
  )
  return [...remarksLog, ...systemEntries].sort((a, b) => a.authoredAt.localeCompare(b.authoredAt))
}

/** Only an admin may edit the text of an existing remark entry — the
 *  date/who/when on a system entry, and the authorship of a user entry, are
 *  never editable by anyone; this gate is specifically about correcting a
 *  remark's wording after the fact. */
export function canEditRemark(userRole: string): boolean {
  return userRole === 'admin'
}
