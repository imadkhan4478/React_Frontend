import { z } from 'zod'

/**
 * One zod object per wizard step, merged into a single draft schema. The
 * wizard validates only the current step's fields via `trigger(fields)` on
 * each Next click (react-hook-form's documented multi-step pattern), so a
 * schema-level `required` on a later step's field never blocks an earlier
 * one — see wizard/LogisticsStatusWizard.tsx.
 *
 * Mirrors features/importsStatus/schema.ts, including the header/lines split:
 * an order can carry several items, and — since a single order can bundle
 * shipments that were booked under different export filings — each item
 * carries its OWN export number rather than one on the header. Quantity and
 * both weights are per item too, so a mixed order's true total weight is
 * summed, never a single header field standing in for several items' worth
 * of cargo.
 *
 * The one other structural feature: a Logistics order is Export | Local, and
 * that choice drives conditional fields across several steps (origin shape,
 * per-item export numbers, the expenditure set, and the status list). The
 * order type lives on Step 1 and each step reads it from the form context —
 * same "single rules object per screen" convention the imports module and
 * CLAUDE.md call for.
 */

export const ORDER_TYPES = ['Export', 'Local'] as const
export type OrderType = (typeof ORDER_TYPES)[number]

/** Number inputs hand back '' when cleared — treat that as absent, not 0. */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || Number.isNaN(v) ? undefined : v),
  z.coerce.number().nonnegative().optional(),
)

// --- Step 1: Order item lines ----------------------------------------------

/**
 * One line per item in the order. Export no. sits HERE, not on the header —
 * a single order can bundle items filed under different exports, and forcing
 * one export number for the whole order would misrepresent that.
 */
export const logisticsItemSchema = z.object({
  id: z.string(),
  itemDetail: z.string().default(''),
  quantity: optionalNumber,
  netWeight: optionalNumber,
  grossWeight: optionalNumber,
  idm: z.string().default(''),
  /** Export orders only. Independent per item — two lines in the same order
   *  can carry different export numbers, or share one. */
  exportNo: z.string().optional(),
  batchNo: z.string().optional(),
})
export type LogisticsItem = z.infer<typeof logisticsItemSchema>

export const emptyItem = (id: string): LogisticsItem => ({
  id, itemDetail: '', quantity: undefined, netWeight: undefined, grossWeight: undefined,
  idm: '', exportNo: '', batchNo: '',
})

// --- Step 1: Order details --------------------------------------------------
export const consignmentSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES),
    // Origin is a country for exports, and city + province for local orders.
    // All three are kept on the draft; the form only requires the pair that
    // matches the current order type (enforced in superRefine below).
    originCountry: z.string().optional(),
    originCity: z.string().optional(),
    originProvince: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
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
      if (item.grossWeight !== undefined && item.netWeight !== undefined && item.netWeight > item.grossWeight) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i, 'netWeight'], message: 'Net weight cannot exceed gross weight' })
      }
    })
  })

// --- Step 2: Transportation -----------------------------------------------
export const transportationSchema = z.object({
  transporterName: z.string().optional(),
  vehicleType: z.string().optional(),
  gateOutDate: z.string().optional(), // ISO yyyy-mm-dd
  dispatchNoteDate: z.string().optional(),
  // delayDays is derived (gate out - dispatch note) and never keyed in.
  quotedFreight: z.number().min(0).optional(),
  actualFreight: z.number().min(0).optional(),
  // ratePerWeight is derived from actual freight ÷ the SUM of every item's
  // gross weight — never keyed in, and never a single item's weight standing
  // in for the whole order.
  actualDeliveryDate: z.string().optional(),
  originFactory: z.string().optional(),
  destination: z.string().optional(),
})

// --- Step 3: Shipping --------------------------------------------------------

/**
 * One line per physical container. Split out because a single shipment
 * routinely mixes container types (e.g. two 40' plus one 20' for an
 * over-flow lot), and a single "type" field can only ever describe one of
 * them.
 */
export const logisticsContainerSchema = z.object({
  id: z.string(),
  containerNo: z.string().optional(),
  containerType: z.string().default(''),
})
export type LogisticsContainer = z.infer<typeof logisticsContainerSchema>

export const emptyContainer = (id: string): LogisticsContainer => ({ id, containerNo: '', containerType: '' })

export const shippingSchema = z.object({
  containers: z.array(logisticsContainerSchema).default([]),
  pol: z.string().optional(), // Port of Loading
  pod: z.string().optional(), // Port of Discharge
  shippingLine: z.string().optional(),
  clearingAgent: z.string().optional(),
  bookingNo: z.string().optional(),
  portInDate: z.string().optional(),
  etdSailingDate: z.string().optional(),
  croArrivalDate: z.string().optional(),
  actualArrivalDate: z.string().optional(),
  // arrivalDelayDays is derived (actual arrival - CRO arrival) and never keyed in.
})

// --- Step 4: Expenditures --------------------------------------------------
// The full export set; local orders only use packingCost + transportationCharges.
// Everything is optional here — costs land piecemeal, and the pending-info
// convention (imports module) surfaces what is still missing.
export const expendituresSchema = z.object({
  // shared
  packingCost: z.number().min(0).optional(),
  // local
  transportationCharges: z.number().min(0).optional(),
  // export-only
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

// --- Step 5: Status --------------------------------------------------------
export const statusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  remarks: z.string().optional(),
})

/**
 * The wizard needs one flat object for react-hook-form. `consignmentSchema`
 * is a ZodEffects (because of superRefine), which has no `.merge`, so the
 * draft is composed from the raw shapes and the cross-field refinement is
 * re-applied on top. Step-level validation still uses the per-step schemas
 * above via `safeParse` in the wizard.
 */
export const consignmentDraftSchema = z
  .object({
    orderType: z.enum(ORDER_TYPES),
    originCountry: z.string().optional(),
    originCity: z.string().optional(),
    originProvince: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    items: z.array(logisticsItemSchema).default([]),
  })
  .merge(transportationSchema)
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
  items: [emptyItem('item-1')],
  transporterName: '',
  vehicleType: '',
  gateOutDate: '',
  dispatchNoteDate: '',
  quotedFreight: 0,
  actualFreight: 0,
  actualDeliveryDate: '',
  originFactory: '',
  destination: '',
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
  remarks: '',
}

export interface WizardStepDef {
  step: number
  key: string
  label: string
  fields: (keyof LogisticsDraft)[]
}

// Five steps per the Logistics spec: Order, Transportation, Shipping,
// Expenditures, Status. The `fields` arrays are what the wizard runs
// step-level validation against on each Next click. Naming an array field
// (`items`, `containers`) validates every row in it, same convention as
// importsStatus.
export const WIZARD_STEPS: WizardStepDef[] = [
  {
    step: 1,
    key: 'order',
    label: 'Order Details',
    fields: [
      'orderType', 'originCountry', 'originCity', 'originProvince', 'customerName',
      'items',
    ],
  },
  {
    step: 2,
    key: 'transportation',
    label: 'Transportation',
    fields: [
      'transporterName', 'vehicleType', 'gateOutDate', 'dispatchNoteDate',
      'quotedFreight', 'actualFreight', 'actualDeliveryDate', 'originFactory', 'destination',
    ],
  },
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
  { step: 5, key: 'status', label: 'Status', fields: ['status', 'remarks'] },
]

// --- Status choices --------------------------------------------------------
// Ordered pipeline. Export orders run the full chain; local orders skip the
// sea legs and close at Delivered. Kept as one map so a step can offer only
// the statuses valid for the current order type.
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

// --- Derived-value helpers (calculated, never keyed in) --------------------

/** Whole-day difference between two ISO dates (later - earlier). Null if either is missing. */
export function daysBetween(fromISO?: string, toISO?: string): number | null {
  if (!fromISO || !toISO) return null
  const a = new Date(fromISO).getTime()
  const b = new Date(toISO).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/** Total quantity across every item line. */
export const totalQuantity = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + (it.quantity ?? 0), 0)

/** Total net weight across every item line, in kg. */
export const totalNetWeight = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + (it.netWeight ?? 0), 0)

/** Total gross weight across every item line, in kg — this is what freight
 *  rate is actually calculated against, never one item's weight alone. */
export const totalGrossWeight = (items: LogisticsItem[]) =>
  items.reduce((s, it) => s + (it.grossWeight ?? 0), 0)

/** Actual freight per unit of gross weight, summed across all items.
 *  Null if either input is missing/zero. */
export function ratePerWeight(actualFreight: number | undefined, items: LogisticsItem[]): number | null {
  const gross = totalGrossWeight(items)
  if (!actualFreight || !gross) return null
  return actualFreight / gross
}

/** Every distinct export number across the order's items — an order can
 *  legitimately carry more than one. Empty/blank entries excluded. */
export const exportNumbers = (items: LogisticsItem[]) =>
  [...new Set(items.map((it) => it.exportNo?.trim()).filter((x): x is string => !!x))]

/** Named gaps for one item line — mirrors importsStatus's itemPendingFields. */
export function itemPendingFields(item: LogisticsItem, orderType: OrderType): string[] {
  const out: string[] = []
  if (!item.itemDetail) out.push('Item detail')
  if (item.quantity === undefined) out.push('Quantity')
  if (!item.idm) out.push('IDM')
  if (orderType === 'Export' && !item.exportNo) out.push('Export no.')
  return out
}
