import type { ReactNode } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { money, shortDate } from './format'
import { ITEMS, SUPPLIERS, BRANCHES, ITEM_CATEGORIES } from './mockData/shared'
import { getPurchases, purchaseMaterialList } from './mockData/purchases'
import { getImports } from './mockData/imports'
import { getStock } from './mockData/inventory'
import { getShipments } from './mockData/logistics'

/**
 * Reports is a cross-module report builder: pick one or more data types,
 * pick which of their (unioned) columns to see, filter, then export. Each
 * type's raw row shape is different (Purchases has a PO number and a
 * sourcing officer, Logistics has a shipping line and a POD) — this file
 * normalizes all of them into one ReportRow shape keyed by shared field
 * names (item/supplier/branch/category/status/value/date) where a concept
 * genuinely exists across types, so picking "Branch" as a column shows one
 * merged column instead of four near-duplicates. Type-specific fields (PO
 * Number, Shipping Line, ...) keep their own keys and simply don't appear
 * for rows from a type that doesn't have them.
 */

export type ReportType = 'purchases' | 'imports' | 'inventory' | 'logistics'

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'purchases', label: 'Purchases' },
  { value: 'imports', label: 'Imports' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'logistics', label: 'Logistics' },
]

export interface ReportRow {
  _type: ReportType
  [key: string]: unknown
}

export interface ReportColumn {
  key: string
  label: string
  align?: 'right'
  render?: (value: unknown, row: ReportRow) => ReactNode
  /** Plain-text form of the same value, for search and file export. */
  text: (value: unknown, row: ReportRow) => string
}

function dateText(v: unknown) {
  return v instanceof Date ? shortDate(v) : ''
}
function dateRender(v: unknown) {
  return v instanceof Date ? shortDate(v) : '—'
}
const statusCol: ReportColumn = {
  key: 'status', label: 'Status',
  render: (v) => (v ? <StatusBadge label={String(v)} /> : '—'),
  text: (v) => String(v ?? ''),
}
const dateCol: ReportColumn = { key: 'date', label: 'Date', render: dateRender, text: dateText }
const requiredDateCol: ReportColumn = { key: 'requiredDate', label: 'Required Date', render: dateRender, text: dateText }
// PPC/Store is a date in the source data, not a PPC-vs-Store category.
const ppcStoreCol: ReportColumn = { key: 'ppcStore', label: 'PPC / Store', render: dateRender, text: dateText }
const typeCol: ReportColumn = {
  key: '_type', label: 'Type',
  text: (v) => String(v ?? ''),
  render: (v) => REPORT_TYPES.find((t) => t.value === v)?.label ?? String(v ?? ''),
}

function plainCol(key: string, label: string, align?: 'right'): ReportColumn {
  return { key, label, align, render: (v) => String(v ?? '—'), text: (v) => String(v ?? '') }
}

// One shared 'value' column across all four types (so mixing e.g. Purchases
// + Inventory into one table still collapses to a single "Value" column
// instead of two), formatted per row by its own _type — Inventory's value
// is a quantity, everything else is PKR — rather than by whichever type's
// column def happened to win the union.
const valueCol: ReportColumn = {
  key: 'value', label: 'Value', align: 'right',
  render: (v, row) => (row._type === 'inventory' ? Math.round(Number(v ?? 0)).toLocaleString() : money(Number(v ?? 0))),
  text: (v) => String(Math.round(Number(v ?? 0))),
}

export const COLUMNS_BY_TYPE: Record<ReportType, ReportColumn[]> = {
  purchases: [
    typeCol,
    plainCol('ref', 'Ref No'),
    plainCol('poNumber', 'PO Number'),
    plainCol('billNo', 'Bill No'),
    plainCol('item', 'Item'),
    plainCol('supplier', 'Supplier'),
    plainCol('branch', 'Branch'),
    plainCol('category', 'Category'),
    plainCol('material', 'Material'),
    ppcStoreCol,
    plainCol('mop', 'Mode of Purchase'),
    plainCol('sourcingOfficer', 'Sourcing Officer'),
    plainCol('quantity', 'Quantity', 'right'),
    valueCol,
    dateCol,
    requiredDateCol,
    statusCol,
  ],
  imports: [
    typeCol,
    plainCol('ref', 'Import Ref'),
    plainCol('customer', 'Customer'),
    plainCol('supplier', 'Supplier'),
    plainCol('country', 'Supplier Country'),
    plainCol('branch', 'Branch'),
    plainCol('category', 'Category'),
    valueCol,
    plainCol('weightTon', 'Weight (Ton)', 'right'),
    statusCol,
    plainCol('documentationStatus', 'Documentation'),
    plainCol('shippingLine', 'Shipping Line'),
    plainCol('modeOfShipment', 'Mode of Shipment'),
    plainCol('bank', 'Bank'),
    dateCol,
  ],
  inventory: [
    typeCol,
    plainCol('ref', 'Item Code'),
    plainCol('item', 'Item'),
    plainCol('branch', 'Branch'),
    plainCol('category', 'Category'),
    plainCol('specs', 'Specs'),
    valueCol,
    plainCol('stockQty', 'Stock Qty', 'right'),
    plainCol('holdQty', 'Hold Qty', 'right'),
    plainCol('reorderLevel', 'Reorder Level', 'right'),
    statusCol,
    plainCol('reorderStatus', 'Reorder Status'),
    dateCol,
  ],
  logistics: [
    typeCol,
    plainCol('ref', 'Shipment Ref'),
    plainCol('customer', 'Customer'),
    plainCol('country', 'Country'),
    plainCol('pod', 'Port of Discharge'),
    statusCol,
    plainCol('stage', 'Stage'),
    plainCol('shippingLine', 'Shipping Line'),
    valueCol,
    plainCol('costPerKg', 'Cost / Kg', 'right'),
    dateCol,
  ],
}

function mapPurchases(): ReportRow[] {
  return getPurchases().map((r) => ({
    _type: 'purchases', ref: r.ref_no, poNumber: r.po_number, billNo: r.bill_no,
    item: r.item, supplier: r.supplier, branch: r.branch, category: r.category,
    material: r.material, ppcStore: r.ppc_store, mop: r.mop, sourcingOfficer: r.sourcing_officer,
    quantity: r.quantity, value: r.amount, date: r.purchase_date, requiredDate: r.required_date,
    status: r.status,
  }))
}
function mapImports(): ReportRow[] {
  return getImports().map((r) => ({
    _type: 'imports', ref: r.import_ref, customer: r.customer, supplier: r.supplier,
    country: r.supplier_country, branch: r.branch, category: r.category,
    value: r.total_value_pkr, weightTon: r.total_wt_ton, status: r.current_status,
    documentationStatus: r.documentation_status, shippingLine: r.shipping_line,
    modeOfShipment: r.mode_of_shipment, bank: r.bank, date: r.demand_date,
  }))
}
function mapInventory(): ReportRow[] {
  return getStock().map((r) => ({
    _type: 'inventory', ref: r.item_code, item: r.item, branch: r.branch, category: r.item_category,
    specs: r.specs, value: r.available_qty, stockQty: r.stock_qty, holdQty: r.hold_qty,
    reorderLevel: r.reorder_level, status: r.stock_status, reorderStatus: r.reorder_status,
    date: r.last_restocked,
  }))
}
function mapLogistics(): ReportRow[] {
  return getShipments().map((r) => ({
    _type: 'logistics', ref: r.exp_no, customer: r.customer, country: r.country, pod: r.pod,
    status: r.status, stage: r.stage, shippingLine: r.shipping_line,
    value: r.total_logistics_cost, costPerKg: r.cost_per_kg, date: r.port_in_date,
  }))
}

const ROWS_BY_TYPE: Record<ReportType, () => ReportRow[]> = {
  purchases: mapPurchases,
  imports: mapImports,
  inventory: mapInventory,
  logistics: mapLogistics,
}

export function getReportRows(types: ReportType[]): ReportRow[] {
  return types.flatMap((t) => ROWS_BY_TYPE[t]())
}

/** Union of column defs across the given types, in a stable order, deduped
 * by key (shared keys like 'branch' collapse into a single column). */
export function unionColumns(types: ReportType[]): ReportColumn[] {
  const seen = new Set<string>()
  const out: ReportColumn[] = []
  for (const t of types) {
    for (const col of COLUMNS_BY_TYPE[t]) {
      if (seen.has(col.key)) continue
      seen.add(col.key)
      out.push(col)
    }
  }
  return out
}

/** Filter values that actually appear on at least one row of a field —
 * e.g. only suppliers that show up in Purchases/Imports rows, not every
 * supplier ever seeded, so a picked type never offers dead options. */
export function optionsFor(rows: ReportRow[], key: string, fallback: readonly string[]): string[] {
  const present = new Set(rows.map((r) => r[key]).filter((v): v is string => typeof v === 'string'))
  return fallback.filter((v) => present.has(v))
}

// Warehouse staff search these by the colloquial trade name "Shaft" instead
// of the item's real name — a plain Item Name search for "shaft" would find
// nothing. Give them their own picker instead of teaching search a synonym:
// SHAFT_ITEMS are pulled out of the general Item Name list so each control
// has one clear job, and both feed the same underlying `item` field (see
// applyFilters) so picking from either narrows the same column.
export const SHAFT_ITEMS = ITEMS.filter((i) => i.endsWith('Bar'))
export const NON_SHAFT_ITEMS = ITEMS.filter((i) => !i.endsWith('Bar'))

export interface ReportFilters {
  item: string[]
  shaft: string[]
  supplier: string[]
  material: string[]
  branch: string[]
  category: string[]
}

export const EMPTY_FILTERS: ReportFilters = { item: [], shaft: [], supplier: [], material: [], branch: [], category: [] }

function passesMulti(row: ReportRow, key: string, selected: string[]): boolean {
  if (selected.length === 0) return true
  const v = row[key]
  if (v === undefined) return true
  return selected.includes(v as string)
}

/** Shared by the live builder and every saved-report download, so the two
 * paths can never drift apart on what a given filter set actually means. */
export function applyFilters(rows: ReportRow[], filters: ReportFilters): ReportRow[] {
  const itemAllow = [...filters.item, ...filters.shaft]
  return rows.filter((row) => {
    if (itemAllow.length > 0 && typeof row.item === 'string' && !itemAllow.includes(row.item)) return false
    return (
      passesMulti(row, 'supplier', filters.supplier) &&
      passesMulti(row, 'material', filters.material) &&
      passesMulti(row, 'branch', filters.branch) &&
      passesMulti(row, 'category', filters.category)
    )
  })
}

export const MATERIALS = purchaseMaterialList

export { ITEMS, SUPPLIERS, BRANCHES, ITEM_CATEGORIES }
