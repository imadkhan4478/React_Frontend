import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FilterBar } from '@/components/FilterBar'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'
import { MOVEMENT_TYPES, TRUCKING_SOURCES, vehicleCount } from './schema'
import {
  getTruckingJobs,
  rollupLabel,
  rowGrossWeight,
  sourceLabel,
  takeAction,
  type TruckingRow,
} from '@/lib/truckingStatusData'

/**
 * List mirrors logisticsStatusList: a real table with filters, a role-gated
 * New button, and CSV + print-to-PDF export over the filtered set. It shows the
 * union of manual jobs and live-derived open requests (from logistics /
 * imports-FOB), with a source tag on each row and open requests surfaced first.
 *
 * Filters use FilterBar + MultiSelectFilter (children pattern, not a `filters`
 * prop) and StatusBadge, matching LogisticsStatusList — confirmed against
 * those components' real prop signatures in components/FilterBar.tsx and
 * components/MultiSelectFilter.tsx.
 */
const sourceOptions = TRUCKING_SOURCES.map((s) => sourceLabel(s))
const sourceLabelToValue = new Map(TRUCKING_SOURCES.map((s) => [sourceLabel(s), s]))

export function TruckingStatusList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [movementFilter, setMovementFilter] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [openOnly, setOpenOnly] = useState(false)
  // Distinct from "Open requests only": openOnly covers every job not yet
  // fully delivered (manual jobs included), while this is specifically the
  // still-live, not-yet-taken derived requests (source !== 'manual') — a
  // manual job in progress is "open" but was never a "pending request".
  const [pendingOnly, setPendingOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [takingId, setTakingId] = useState<string | null>(null)
  const [executionFrom, setExecutionFrom] = useState('')
  const [executionTo, setExecutionTo] = useState('')

  const rows = useMemo(
    () =>
      getTruckingJobs({
        movementType: movementFilter.length ? movementFilter : undefined,
        source: sourceFilter.length ? sourceFilter.map((label) => sourceLabelToValue.get(label)!) : undefined,
        openOnly,
        search,
      }),
    [movementFilter, sourceFilter, openOnly, search],
  )

  const pendingFiltered = useMemo(
    () => {
      let out = pendingOnly ? rows.filter((r) => r.source !== 'manual') : rows
      // Date-range filter against executionDate, the most prominent
      // chronological field on a trucking job.
      if (executionFrom) out = out.filter((r) => r.executionDate && r.executionDate >= executionFrom)
      if (executionTo) out = out.filter((r) => r.executionDate && r.executionDate <= executionTo)
      return out
    },
    [rows, pendingOnly, executionFrom, executionTo],
  )

  // Open requests first, then by id.
  const sorted = useMemo(
    () => [...pendingFiltered].sort((a, b) => Number(!!b.open) - Number(!!a.open) || a.systemId.localeCompare(b.systemId)),
    [pendingFiltered],
  )

  function handleTakeAction(r: TruckingRow) {
    if (r.source !== 'from-logistics' && r.source !== 'from-import-fob') return
    if (!r.sourceRef) return
    setTakingId(r.systemId)
    const newId = takeAction(r.source, r.sourceRef)
    navigate(`/trucking-status/${newId}/edit/1`)
  }

  function exportCsv() {
    const header = [
      'ID', 'Source', 'Movement', 'Transporter', 'Pickup', 'Destination',
      'Reference', 'Vehicles', 'Gross (kg)', 'Tracking', 'Quoted', 'Actual', 'Payment',
    ]
    const lines = sorted.map((r) =>
      [
        r.systemId, sourceLabel(r.source), r.movementType, r.transporterName ?? '',
        r.pickup ?? '', r.destination ?? '', r.referenceNo ?? '', vehicleCount(r.vehicles),
        rowGrossWeight(r).toFixed(2), rollupLabel(r), r.quotedFreight ?? '', r.actualFreight ?? '',
        r.paymentStatus ?? '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    )
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trucking-status-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Trucking Status" subtitle="Vehicle movements & open requests" module="truckingStatus" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download size={16} /> CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> PDF
          </Button>
          {can(user, 'enter') && (
            <Button asChild>
              <Link to="/trucking-status/new">New Trucking Job</Link>
            </Button>
          )}
        </div>
      </div>

      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'ID, transporter, item…',
        }}
      >
        <MultiSelectFilter
          label="Movement"
          options={[...MOVEMENT_TYPES]}
          value={movementFilter}
          onChange={setMovementFilter}
        />
        <MultiSelectFilter
          label="Source"
          options={sourceOptions}
          value={sourceFilter}
          onChange={setSourceFilter}
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Open requests only
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          Pending requests only
        </label>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Execution from</label>
          <input
            type="date"
            value={executionFrom}
            onChange={(e) => setExecutionFrom(e.target.value)}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Execution to</label>
          <input
            type="date"
            value={executionTo}
            onChange={(e) => setExecutionTo(e.target.value)}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          />
        </div>
      </FilterBar>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-alt text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Movement</th>
              <th className="px-3 py-2">Transporter</th>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Vehicles</th>
              <th className="px-3 py-2">Tracking</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.systemId}
                className="cursor-pointer border-t border-line hover:bg-canvas-alt"
                onClick={() => navigate(`/trucking-status/${r.systemId}`)}
              >
                <td className="px-3 py-2 font-medium text-ink">
                  {r.systemId}
                  {r.open && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand">open</span>}
                </td>
                <td className="px-3 py-2">
                  <SourceTag row={r} />
                </td>
                <td className="px-3 py-2">{r.movementType}</td>
                <td className="px-3 py-2">{r.transporterName ?? '—'}</td>
                <td className="px-3 py-2 text-muted">
                  {(r.pickup ?? '—')} → {(r.destination ?? '—')}
                </td>
                <td className="px-3 py-2 tabular-nums">{vehicleCount(r.vehicles) || '—'}</td>
                <td className="px-3 py-2">
                  {vehicleCount(r.vehicles) ? <StatusBadge label={rollupLabel(r)} /> : <span className="text-muted">awaiting vehicles</span>}
                </td>
                <td className="px-3 py-2">{r.paymentStatus ?? '—'}</td>
                <td className="px-3 py-2">
                  {r.open && (r.source === 'from-logistics' || r.source === 'from-import-fob') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTakeAction(r) }}
                      disabled={takingId === r.systemId}
                      className="rounded border border-line px-2.5 py-1 text-[11px] hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      Take Action
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  No trucking jobs match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SourceTag({ row }: { row: TruckingRow }) {
  const label = sourceLabel(row.source)
  const style =
    row.source === 'from-logistics'
      ? { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }
      : row.source === 'from-import-fob'
        ? { backgroundColor: 'var(--color-watch-bg)', color: 'var(--color-watch)' }
      : row.source === 'from-export'
        ? { backgroundColor: 'var(--color-healthy-bg)', color: 'var(--color-healthy)' }
        : undefined
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${style ? '' : 'bg-canvas-alt text-muted'}`}
      style={style}
    >
      {label}
    </span>
  )
}
