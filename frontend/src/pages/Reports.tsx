import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FilterBar } from '@/components/FilterBar'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ColumnPicker } from '@/components/ColumnPicker'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/DataTable'
import { dateInRange } from '@/lib/format'
import {
  REPORT_TYPES, type ReportType, type ReportRow,
  getReportRows, unionColumns, optionsFor,
  ITEMS, SUPPLIERS, BRANCHES, ITEM_CATEGORIES,
} from '@/lib/reportBuilder'
import { exportExcel, exportPdf } from '@/lib/reportExport'

// A filter only applies to rows whose data type actually has that field —
// e.g. picking a Supplier still shows Logistics rows (no supplier concept)
// rather than wiping them out for a field they were never going to have.
function passesMulti(row: ReportRow, key: string, selected: string[]): boolean {
  if (selected.length === 0) return true
  const v = row[key]
  if (v === undefined) return true
  return selected.includes(v as string)
}

function passesDate(row: ReportRow, from: string, to: string): boolean {
  if (!from && !to) return true
  const d = row.date
  if (!(d instanceof Date)) return true
  return dateInRange(d, from, to)
}

export function Reports() {
  const [types, setTypes] = useState<ReportType[]>(['purchases'])
  const [item, setItem] = useState<string[]>([])
  const [supplier, setSupplier] = useState<string[]>([])
  const [branch, setBranch] = useState<string[]>([])
  const [category, setCategory] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const allRows = useMemo(() => getReportRows(types), [types])
  const availableColumns = useMemo(() => unionColumns(types), [types])

  // "Select data → see every header those types have → pick which ones to
  // keep": the column checklist always starts fully checked against
  // whatever the current type selection makes available, and resets to
  // fully checked again whenever that type selection changes.
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => availableColumns.map((c) => c.key))
  useEffect(() => {
    setSelectedColumns(availableColumns.map((c) => c.key))
  }, [availableColumns])

  const itemOptions = useMemo(() => optionsFor(allRows, 'item', ITEMS), [allRows])
  const supplierOptions = useMemo(() => optionsFor(allRows, 'supplier', SUPPLIERS), [allRows])
  const branchOptions = useMemo(() => optionsFor(allRows, 'branch', BRANCHES), [allRows])
  const categoryOptions = useMemo(() => optionsFor(allRows, 'category', ITEM_CATEGORIES), [allRows])

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          passesMulti(row, 'item', item) &&
          passesMulti(row, 'supplier', supplier) &&
          passesMulti(row, 'branch', branch) &&
          passesMulti(row, 'category', category) &&
          passesDate(row, dateFrom, dateTo),
      ),
    [allRows, item, supplier, branch, category, dateFrom, dateTo],
  )

  const visibleColumns = useMemo(
    () => availableColumns.filter((c) => selectedColumns.includes(c.key)),
    [availableColumns, selectedColumns],
  )

  const searchedRows = useMemo(() => {
    if (!search.trim()) return filteredRows
    const needle = search.toLowerCase()
    return filteredRows.filter((row) => visibleColumns.some((col) => col.text(row[col.key], row).toLowerCase().includes(needle)))
  }, [filteredRows, search, visibleColumns])

  const tableColumns: Column[] = useMemo(
    () =>
      visibleColumns.map((col) => ({
        key: col.key,
        label: col.label,
        align: col.align,
        render: (row) => col.render!(row[col.key], row as ReportRow),
      })),
    [visibleColumns],
  )

  const typeLabels = types.map((t) => REPORT_TYPES.find((r) => r.value === t)!.label)
  const stamp = new Date().toISOString().slice(0, 10)
  const fileBase = `qg-irs-report-${types.join('-') || 'empty'}-${stamp}`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle="Build a custom report — pick your data, pick your columns, filter, then export"
        module="reports"
      />

      <FilterBar search={{ value: search, onChange: setSearch, placeholder: 'Search within results…' }}>
        <MultiSelectFilter
          label="Data"
          options={REPORT_TYPES.map((t) => t.label)}
          value={typeLabels}
          onChange={(labels) => setTypes(labels.map((l) => REPORT_TYPES.find((r) => r.label === l)!.value))}
        />
        {itemOptions.length > 0 && <MultiSelectFilter label="Item Name" options={itemOptions} value={item} onChange={setItem} />}
        {supplierOptions.length > 0 && <MultiSelectFilter label="Supplier" options={supplierOptions} value={supplier} onChange={setSupplier} />}
        {branchOptions.length > 0 && <MultiSelectFilter label="Branch" options={branchOptions} value={branch} onChange={setBranch} />}
        {categoryOptions.length > 0 && <MultiSelectFilter label="Category" options={categoryOptions} value={category} onChange={setCategory} />}
        <DateRangeFilter label="Date" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
      </FilterBar>

      {types.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted">
            Select at least one data type above to build a report.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <ColumnPicker
                label="Columns to show"
                options={availableColumns.map((c) => ({ key: c.key, label: c.label }))}
                value={selectedColumns}
                onChange={setSelectedColumns}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">{searchedRows.length.toLocaleString()} records</p>
            <div className="flex gap-2">
              <button
                onClick={() => exportExcel(searchedRows, visibleColumns, `${fileBase}.xlsx`)}
                disabled={searchedRows.length === 0 || visibleColumns.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-alt disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                Export Excel
              </button>
              <button
                onClick={() => exportPdf(searchedRows, visibleColumns, `${fileBase}.pdf`, 'QG-IRS Report')}
                disabled={searchedRows.length === 0 || visibleColumns.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-alt disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={15} />
                Export PDF
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable columns={tableColumns} rows={searchedRows as unknown as Record<string, unknown>[]} height={520} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
