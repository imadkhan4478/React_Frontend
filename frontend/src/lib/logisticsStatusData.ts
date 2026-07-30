import {
  ORDER_TYPES,
  statusesFor,
  type LogisticsDraft,
  type LogisticsItem,
  type LogisticsContainer,
  type OrderType,
} from '@/features/logisticsStatus/schema'
// Cross-module: FOB imports need Logistics to arrange the sea freight and
// clearing agent, so they surface here as read-only open requests — the
// mirror of what Trucking does for the same consignments (see
// lib/truckingStatusData.ts deriveFromImportsFob).
import * as importsData from '@/lib/importsStatusData'
import { CONSIGNMENT_STATUSES } from '@/features/importsStatus/schema'

/**
 * Logistics Status mock data.
 *
 * Matches the house style of lib/importsStatusData.ts — a module-level array
 * built once with a seeded RNG for determinism, a *Filters interface, and a
 * get*() that filters it. Unlike Imports Status, `LogisticsDraft` (the
 * wizard's form schema) is already flat, so there's no separate "row" shape
 * to bridge: a mock order IS a `LogisticsDraft` plus its `systemId`, and it's
 * exactly what the wizard's `defaultValues` needs in edit mode.
 *
 * Replaced wholesale once the real API lands.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(77)
const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (from: string, n: number) => iso(new Date(+new Date(from) + n * 86_400_000))

export const CUSTOMERS = [
  'Al Futtaim Trading LLC', 'Nordic Cargo Partners', 'Kansai Steel Traders',
  'Meridian Export House', 'Anatolia Machinery Import', 'Prime Freight Solutions',
  'Lahore Textile Mills', 'Karachi Engineering Works', 'Faisalabad Weaving Co.',
] as const
const CATALOGUE = [
  'Cotton yarn — 30s combed', 'Surgical instruments — assorted', 'Auto parts — brake assemblies',
  'Sports goods — footballs', 'Leather goods — finished hides', 'Cutlery — stainless steel sets',
  'Rice — Basmati 1121', 'Textile machinery spares',
] as const
const COUNTRIES = ['United Arab Emirates', 'Germany', 'United Kingdom', 'Türkiye', 'Japan', 'United States'] as const
const CITIES: Record<string, string> = {
  Punjab: 'Lahore', Sindh: 'Karachi', 'Khyber Pakhtunkhwa': 'Peshawar',
}
const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa'] as const
const TRANSPORTERS = ['Bilal Goods Transport', 'Al-Hamd Logistics', 'Sindh Cargo Movers'] as const
const VEHICLE_TYPES = ['20ft container truck', '40ft container truck', 'Flatbed'] as const
const SHIPPING_LINES = ['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd'] as const
const CONTAINER_TYPES = ["20' Dry", "40' Dry", "40' High Cube"] as const
const CLEARING_AGENTS = ['Prime Cargo Services', 'Indus Clearing Co.', 'Sea Link Logistics'] as const
const DESTINATIONS = ['Jebel Ali, UAE', 'Hamburg, Germany', 'Felixstowe, UK', 'Mersin, Türkiye', 'Yokohama, Japan'] as const

export interface LogisticsOrder extends LogisticsDraft {
  systemId: string
}

function makeOrder(i: number): LogisticsOrder {
  const orderType: OrderType = pick(ORDER_TYPES)
  const isExport = orderType === 'Export'
  const statuses = statusesFor(orderType)
  const status = pick(statuses)
  const stageIndex = statuses.indexOf(status)

  // 1-3 items per order. Export numbers are independent per line — some
  // orders share one filing across every item, others don't, matching how
  // this is actually booked.
  const lineCount = randInt(1, 3)
  const items: LogisticsItem[] = Array.from({ length: lineCount }, (_, n) => {
    const netWeight = randInt(200, 18000)
    return {
      id: `item-${240 - i}-${n}`,
      itemDetail: pick(CATALOGUE),
      quantity: randInt(50, 5000),
      netWeight,
      grossWeight: netWeight + randInt(20, 400),
      idm: `IDM-${randInt(1000, 9999)}`,
      exportNo: isExport ? `EXP-${randInt(1000, 9999)}` : '',
      batchNo: rng() > 0.4 ? `B-${randInt(100, 999)}` : '',
    }
  })

  const hasTransport = stageIndex >= 2
  const dispatchNoteDate = hasTransport ? addDays('2026-04-01', randInt(20, 100)) : ''
  const gateOutDate = hasTransport ? addDays(dispatchNoteDate, randInt(0, 3)) : ''
  const actualDeliveryDate = stageIndex >= statuses.length - 1 ? addDays(gateOutDate || '2026-05-01', randInt(3, 20)) : ''

  const province = pick(PROVINCES)
  const hasContainers = isExport && stageIndex >= 3
  const containers: LogisticsContainer[] = hasContainers
    ? Array.from({ length: randInt(1, 4) }, (_, n) => ({
        id: `container-${240 - i}-${n}`,
        containerType: pick(CONTAINER_TYPES),
        containerNo: rng() > 0.3 ? `MSKU${randInt(1000000, 9999999)}` : '',
      }))
    : []

  return {
    systemId: `LOG-2026-${String(240 - i).padStart(4, '0')}`,
    orderType,
    originCountry: isExport ? pick(COUNTRIES) : '',
    originCity: isExport ? '' : CITIES[province],
    originProvince: isExport ? '' : province,
    customerName: pick(CUSTOMERS),
    items,

    transporterName: hasTransport ? pick(TRANSPORTERS) : '',
    vehicleType: hasTransport ? pick(VEHICLE_TYPES) : '',
    gateOutDate,
    dispatchNoteDate,
    quotedFreight: hasTransport ? randInt(15_000, 90_000) : 0,
    actualFreight: hasTransport ? randInt(15_000, 95_000) : 0,
    actualDeliveryDate,
    originFactory: rng() > 0.3 ? 'Unit 2 — Manga Mandi' : '',
    destination: isExport ? pick(DESTINATIONS) : 'Local delivery',

    containers,
    pol: isExport && stageIndex >= 3 ? 'Port Qasim, Karachi' : '',
    pod: isExport && stageIndex >= 3 ? pick(DESTINATIONS) : '',
    shippingLine: isExport && stageIndex >= 3 ? pick(SHIPPING_LINES) : '',
    clearingAgent: isExport && stageIndex >= 3 ? pick(CLEARING_AGENTS) : '',
    bookingNo: isExport && stageIndex >= 3 ? `BK-${randInt(10000, 99999)}` : '',
    portInDate: isExport && stageIndex >= 4 ? addDays(gateOutDate || '2026-05-01', randInt(1, 5)) : '',
    etdSailingDate: isExport && stageIndex >= 4 ? addDays(gateOutDate || '2026-05-01', randInt(3, 8)) : '',
    croArrivalDate: isExport && stageIndex >= 5 ? addDays(gateOutDate || '2026-05-01', randInt(20, 35)) : '',
    actualArrivalDate: isExport && stageIndex >= statuses.length - 1 ? addDays(gateOutDate || '2026-05-01', randInt(22, 40)) : '',

    packingCost: randInt(2_000, 15_000),
    transportationCharges: !isExport ? randInt(5_000, 25_000) : 0,
    insurance: isExport ? randInt(3_000, 12_000) : 0,
    truckingLhrToKhi: isExport ? randInt(8_000, 20_000) : 0,
    fumigationCost: isExport && rng() > 0.5 ? randInt(2_000, 6_000) : 0,
    lashing: isExport ? randInt(1_000, 4_000) : 0,
    qflCharges: isExport ? randInt(3_000, 9_000) : 0,
    qflContainerMovement: isExport ? randInt(2_000, 7_000) : 0,
    customClearanceCharges: isExport ? randInt(5_000, 18_000) : 0,
    portCharges: isExport ? randInt(4_000, 14_000) : 0,
    dhlCharges: rng() > 0.6 ? randInt(500, 3_000) : 0,
    seaAirFreight: isExport ? randInt(40_000, 220_000) : 0,

    status,
    remarks: '',
  }
}

const ALL: LogisticsOrder[] = Array.from({ length: 24 }, (_, i) => makeOrder(i))

/* -- filtering ------------------------------------------------------- */
export interface LogisticsFilters {
  search?: string
  orderType?: OrderType[]
  status?: string[]
  customer?: string[]
}

const inSet = <T extends string>(v: T, s?: T[]) => !s || s.length === 0 || s.includes(v)

export function getLogisticsOrders(f: LogisticsFilters = {}): LogisticsOrder[] {
  const q = (f.search ?? '').trim().toLowerCase()
  return ALL.filter((o) => {
    if (!inSet(o.orderType, f.orderType)) return false
    if (!inSet(o.status, f.status as string[] | undefined)) return false
    if (f.customer?.length && !f.customer.includes(o.customerName)) return false
    if (q) {
      const hay = [
        o.systemId, o.customerName,
        ...o.items.map((it) => `${it.itemDetail} ${it.idm} ${it.exportNo}`),
      ].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export const getLogisticsOrder = (systemId: string): LogisticsOrder | undefined =>
  ALL.find((o) => o.systemId === systemId)

/** Mutates the in-memory mock store — same convention as updateConsignment
 *  in lib/importsStatusData.ts. Unlike Imports Status, `LogisticsDraft` is
 *  already the full record shape, so this is a straight replace, no
 *  overlapping-fields bridge needed. */
export function updateLogisticsOrder(systemId: string, data: LogisticsDraft): void {
  const idx = ALL.findIndex((o) => o.systemId === systemId)
  if (idx === -1) return
  ALL[idx] = { ...data, systemId }
}

/**
 * An FOB import consignment surfaced as a Logistics open request. On FOB
 * terms the buyer (Qadri) owns the goods from the origin port, so Qadri's
 * Logistics team books the sea freight and appoints the clearing agent —
 * exactly the work this module does for its own export/local orders. These
 * are READ-ONLY: the real record lives in Imports Status, so the request row
 * links back there rather than opening a Logistics editor. Derived live from
 * the Imports store, never copied, so it always reflects the source.
 */
export interface LogisticsFobRequest {
  systemId: string           // TR-style synthetic id, e.g. LOG-REQ-QC-2026-0148
  sourceRef: string          // the real consignment systemId in Imports
  customerName: string       // the branch taking delivery
  itemSummary: string
  origin: string             // origin port / country
  status: string             // the consignment's current status
  needsClearingAgent: boolean
  open: true
}

/** FOB imports past Under Production that still need shipping / clearing
 *  arrangement. Mirror of truckingStatusData's deriveFromImportsFob. */
export function deriveImportFobRequests(): LogisticsFobRequest[] {
  try {
    const rows = importsData.getConsignments() ?? []
    const productionIdx = CONSIGNMENT_STATUSES.indexOf('Under Production')
    return rows
      .filter((r) => r.incoterm === 'FOB' && CONSIGNMENT_STATUSES.indexOf(r.status) > productionIdx)
      .map((r): LogisticsFobRequest => {
        const first = r.items[0]
        const more = r.items.length - 1
        return {
          systemId: `LOG-REQ-${r.systemId}`,
          sourceRef: r.systemId,
          customerName: r.branch,
          itemSummary: first ? `${first.itemName}${more > 0 ? ` +${more} more` : ''}` : 'No items',
          origin: r.origin,
          status: r.status,
          needsClearingAgent: !r.clearingAgent,
          open: true,
        }
      })
  } catch {
    return []
  }
}

export const customerList = [...CUSTOMERS]
export const orderTypeList = [...ORDER_TYPES]
/** Both pipelines' statuses, deduplicated — a status filter needs every
 *  label either order type can be in, not just one pipeline's set. */
export const statusList = [...new Set([...statusesFor('Export'), ...statusesFor('Local')])]
