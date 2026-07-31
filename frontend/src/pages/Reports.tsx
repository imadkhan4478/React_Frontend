import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, FileText, Save, Trash2, Pencil, Eye, EyeOff, X, Database, Inbox, ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SegmentedControl } from '@/components/SegmentedControl'
import { FilterBar } from '@/components/FilterBar'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ColumnPicker } from '@/components/ColumnPicker'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/DataTable'
import { dateInRange } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import {
  REPORT_TYPES, type ReportType, type ReportRow, type ReportFilters,
  getReportRows, unionColumns, optionsFor, applyFilters,
  SUPPLIERS, BRANCHES, ITEM_CATEGORIES, SHAFT_ITEMS, NON_SHAFT_ITEMS, MATERIALS,
} from '@/lib/reportBuilder'
import { exportExcel, exportPdf } from '@/lib/reportExport'
import { getSavedReports, createSavedReport, updateSavedReport, deleteSavedReport, type SavedReport } from '@/lib/savedReports'

const VIEWS = [
  { value: 'build', label: 'Build Report' },
  { value: 'saved', label: 'Saved Reports' },
] as const

function passesDate(row: ReportRow, from: string, to: string): boolean {
  if (!from && !to) return true
  const d = row.date
  if (!(d instanceof Date)) return true
  return dateInRange(d, from, to)
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'report'
}

export function Reports() {
  const { user } = useAuth()
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('build')

  const [types, setTypes] = useState<ReportType[]>(['purchases'])
  const [item, setItem] = useState<string[]>([])
  const [shaft, setShaft] = useState<string[]>([])
  const [supplier, setSupplier] = useState<string[]>([])
  const [material, setMaterial] = useState<string[]>([])
  const [branch, setBranch] = useState<string[]>([])
  const [category, setCategory] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  // Set while editing an existing saved report (loaded via SavedReportsView's
  // Edit button) instead of building a fresh one — swaps "Save as Report"
  // for "Update Report" and lets Save-as-New branch off it explicitly.
  const [editingId, setEditingId] = useState<string | null>(null)

  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => getSavedReports())

  const allRows = useMemo(() => getReportRows(types), [types])
  const availableColumns = useMemo(() => unionColumns(types), [types])

  // "Select data → see every header those types have → pick which ones to
  // keep": the column checklist normally starts fully checked against
  // whatever the current type selection makes available, and resets to
  // fully checked again whenever that type selection changes — except right
  // after loadReportIntoBuilder sets an explicit saved column set, which
  // this guard lets through untouched for exactly one effect run.
  const skipColumnResetRef = useRef(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => availableColumns.map((c) => c.key))
  useEffect(() => {
    if (skipColumnResetRef.current) {
      skipColumnResetRef.current = false
      return
    }
    setSelectedColumns(availableColumns.map((c) => c.key))
  }, [availableColumns])

  // Item Name and Shaft are two lenses onto the same underlying `item`
  // field (see reportBuilder's applyFilters) — split so each dropdown only
  // ever offers items it actually makes sense to find there, instead of
  // "Round Bar" sitting in the same list as "Thread Gauge".
  const itemOptions = useMemo(() => optionsFor(allRows, 'item', NON_SHAFT_ITEMS), [allRows])
  const shaftOptions = useMemo(() => optionsFor(allRows, 'item', SHAFT_ITEMS), [allRows])
  const supplierOptions = useMemo(() => optionsFor(allRows, 'supplier', SUPPLIERS), [allRows])
  const materialOptions = useMemo(() => optionsFor(allRows, 'material', MATERIALS), [allRows])
  const branchOptions = useMemo(() => optionsFor(allRows, 'branch', BRANCHES), [allRows])
  const categoryOptions = useMemo(() => optionsFor(allRows, 'category', ITEM_CATEGORIES), [allRows])

  const filters: ReportFilters = { item, shaft, supplier, material, branch, category }

  const filteredRows = useMemo(
    () => applyFilters(allRows, filters).filter((row) => passesDate(row, dateFrom, dateTo)),
    [allRows, item, shaft, supplier, material, branch, category, dateFrom, dateTo],
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

  function resetBuilder() {
    setEditingId(null)
    setSaveName('')
    setSaveMessage('')
  }

  function loadReportIntoBuilder(report: SavedReport) {
    skipColumnResetRef.current = true
    setTypes(report.types)
    setSelectedColumns(report.columns)
    setItem(report.filters.item)
    setShaft(report.filters.shaft)
    setSupplier(report.filters.supplier)
    setMaterial(report.filters.material)
    setBranch(report.filters.branch)
    setCategory(report.filters.category)
    setEditingId(report.id)
    setSaveName(report.name)
    setSaveMessage('')
    setView('build')
  }

  function handleSave() {
    if (!user || !saveName.trim() || types.length === 0 || selectedColumns.length === 0) return
    if (editingId) {
      updateSavedReport(editingId, { name: saveName.trim(), createdBy: user.name, types, columns: selectedColumns, filters })
      setSaveMessage(`Updated "${saveName.trim()}".`)
    } else {
      createSavedReport({ name: saveName.trim(), createdBy: user.name, types, columns: selectedColumns, filters })
      setSaveMessage(`Saved as "${saveName.trim()}" — see it under Saved Reports.`)
    }
    setSavedReports(getSavedReports())
  }

  function handleSaveAsNew() {
    setEditingId(null)
    handleSave()
  }

  function handleDeleteSaved(id: string) {
    deleteSavedReport(id)
    setSavedReports(getSavedReports())
    if (editingId === id) resetBuilder()
  }

  // Always recomputed from the current mock data set, never from whatever
  // was true when the template was saved — that's the whole point of a
  // "static" report: fixed shape, live numbers.
  function freshRowsFor(report: SavedReport) {
    return applyFilters(getReportRows(report.types), report.filters)
  }

  function downloadSaved(report: SavedReport, format: 'xlsx' | 'pdf') {
    const rows = freshRowsFor(report)
    const cols = unionColumns(report.types).filter((c) => report.columns.includes(c.key))
    const today = new Date().toISOString().slice(0, 10)
    const base = `qg-irs-${slugify(report.name)}-${today}`
    if (format === 'xlsx') exportExcel(rows, cols, `${base}.xlsx`)
    else exportPdf(rows, cols, `${base}.pdf`, report.name)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Reports"
          subtitle={
            view === 'build'
              ? 'Build a custom report — pick your data, pick your columns, filter, then export'
              : 'Saved report templates — same columns and filters every time, always current data'
          }
          module="reports"
        />
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      </div>

      {view === 'saved' ? (
        <SavedReportsView
          reports={savedReports}
          currentUser={user}
          onDelete={handleDeleteSaved}
          onDownload={downloadSaved}
          onEdit={loadReportIntoBuilder}
          freshRowsFor={freshRowsFor}
        />
      ) : (
        <>
          {editingId && (
            <div className="flex items-center gap-2 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2 text-xs font-medium text-brand">
              <Pencil size={13} />
              Editing "{saveName || 'saved report'}" — Update it below, or Save as New to keep the original untouched.
              <button type="button" onClick={resetBuilder} className="ml-auto flex items-center gap-1 text-brand hover:underline">
                <X size={12} />
                Cancel
              </button>
            </div>
          )}

          <FilterBar search={{ value: search, onChange: setSearch, placeholder: 'Search within results…' }}>
            <MultiSelectFilter
              label="Data"
              options={REPORT_TYPES.map((t) => t.label)}
              value={typeLabels}
              onChange={(labels) => setTypes(labels.map((l) => REPORT_TYPES.find((r) => r.label === l)!.value))}
            />
            {itemOptions.length > 0 && <MultiSelectFilter label="Item Name" options={itemOptions} value={item} onChange={setItem} />}
            {shaftOptions.length > 0 && <MultiSelectFilter label="Shaft" options={shaftOptions} value={shaft} onChange={setShaft} />}
            {supplierOptions.length > 0 && <MultiSelectFilter label="Supplier" options={supplierOptions} value={supplier} onChange={setSupplier} />}
            {materialOptions.length > 0 && <MultiSelectFilter label="Material" options={materialOptions} value={material} onChange={setMaterial} />}
            {branchOptions.length > 0 && <MultiSelectFilter label="Branch" options={branchOptions} value={branch} onChange={setBranch} />}
            {categoryOptions.length > 0 && <MultiSelectFilter label="Category" options={categoryOptions} value={category} onChange={setCategory} />}
            <DateRangeFilter label="Date" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </FilterBar>

          {types.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Database size={22} />
                </span>
                <p className="text-sm text-muted">Select at least one data type above to build a report.</p>
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

              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <ListChecks size={16} className="text-brand" />
                    {searchedRows.length.toLocaleString()} records
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={saveName}
                      onChange={(e) => {
                        setSaveName(e.target.value)
                        setSaveMessage('')
                      }}
                      placeholder="Name this report to save it…"
                      className="h-10 w-56"
                    />
                    <Button variant="outline" onClick={handleSave} disabled={!saveName.trim()}>
                      <Save size={15} />
                      {editingId ? 'Update Report' : 'Save as Report'}
                    </Button>
                    {editingId && (
                      <Button variant="ghost" onClick={handleSaveAsNew} disabled={!saveName.trim()}>
                        Save as New
                      </Button>
                    )}
                    <div className="h-6 w-px bg-line" />
                    <Button onClick={() => exportExcel(searchedRows, visibleColumns, `${fileBase}.xlsx`)} disabled={searchedRows.length === 0 || visibleColumns.length === 0}>
                      <FileSpreadsheet size={15} />
                      Export Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportPdf(searchedRows, visibleColumns, `${fileBase}.pdf`, 'QG-IRS Report')}
                      disabled={searchedRows.length === 0 || visibleColumns.length === 0}
                    >
                      <FileText size={15} />
                      Export PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {saveMessage && <p className="-mt-3 pl-1 text-xs font-medium text-healthy">{saveMessage}</p>}

              <Card>
                <CardContent className="p-0">
                  <DataTable columns={tableColumns} rows={searchedRows as unknown as Record<string, unknown>[]} height={520} />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SavedReportsView({
  reports, currentUser, onDelete, onDownload, onEdit, freshRowsFor,
}: {
  reports: SavedReport[]
  currentUser: { name: string; isAdmin: boolean } | null
  onDelete: (id: string) => void
  onDownload: (report: SavedReport, format: 'xlsx' | 'pdf') => void
  onEdit: (report: SavedReport) => void
  freshRowsFor: (report: SavedReport) => ReportRow[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Inbox size={22} />
          </span>
          <p className="text-sm text-muted">No saved reports yet — build one under "Build Report" and save it to see it here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => {
        const canManage = currentUser && (currentUser.isAdmin || currentUser.name === r.createdBy)
        const typeLabels = r.types.map((t) => REPORT_TYPES.find((rt) => rt.value === t)?.label ?? t).join(', ')
        const expanded = expandedId === r.id

        // Recomputed on every expand, not cached — the whole point of View
        // here is "what does this look like right now."
        const previewRows = expanded ? freshRowsFor(r) : []
        const previewColumns = expanded ? unionColumns(r.types).filter((c) => r.columns.includes(c.key)) : []
        const previewTableColumns: Column[] = previewColumns.map((col) => ({
          key: col.key,
          label: col.label,
          align: col.align,
          render: (row) => col.render!(row[col.key], row as ReportRow),
        }))

        return (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-navy">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {typeLabels} · {r.columns.length} columns · saved by {r.createdBy} on {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExpandedId(expanded ? null : r.id)}>
                    {expanded ? <EyeOff size={14} /> : <Eye size={14} />}
                    {expanded ? 'Hide' : 'View'}
                  </Button>
                  {canManage && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                  )}
                  <Button size="sm" onClick={() => onDownload(r, 'xlsx')}>
                    <FileSpreadsheet size={14} />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDownload(r, 'pdf')}>
                    <FileText size={14} />
                    PDF
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(r.id)}
                      title="Delete this saved report"
                      className="w-9 border-risk/30 px-0 text-risk hover:bg-risk-bg hover:text-risk"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="animate-fade-in-up rounded-xl border border-line">
                  <p className="border-b border-line px-3 py-2 text-xs text-muted">
                    {previewRows.length.toLocaleString()} records, live as of right now
                  </p>
                  <DataTable columns={previewTableColumns} rows={previewRows as unknown as Record<string, unknown>[]} height={360} />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
