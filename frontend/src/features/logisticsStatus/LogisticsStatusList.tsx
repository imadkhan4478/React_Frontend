import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FilterBar } from '@/components/FilterBar'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'
import { exportNumbers, totalQuantity } from '@/features/logisticsStatus/schema'
import {
  getLogisticsOrders, deriveImportFobRequests,
  customerList, orderTypeList, statusList,
  type LogisticsOrder, type LogisticsFilters,
} from '@/lib/logisticsStatusData'

const num = (v: number) => v.toLocaleString('en-US')
const dateShort = (v?: string) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(+d)) return '—'
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

/**
 * Logistics Status — list view.
 *
 * Two tables: the team's own orders (native, editable), and — separately — a
 * read-only "Open Requests: Import FOB" feed. On FOB terms Qadri owns the
 * goods from the origin port, so Logistics arranges the sea freight and
 * clearing agent for them; those consignments live in Imports Status, so the
 * request rows link back there and cannot be edited here (the record's home
 * is Imports). Same live-derivation idea Trucking Status uses.
 */
export function LogisticsStatusList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filters, setFilters] = useState<LogisticsFilters>({})

  const rows = useMemo(() => getLogisticsOrders(filters), [filters])
  const fobRequests = useMemo(() => deriveImportFobRequests(), [])
  const canEdit = can(user, 'editAny')

  const exportCsv = () => {
    const cols = [
      'System ID', 'Order Type', 'Customer', 'Items', 'Total Quantity', 'Export No(s).',
      'Origin', 'Destination', 'Status', 'Containers', 'Gate Out Date', 'Actual Delivery Date',
    ]
    const line = (o: LogisticsOrder) => [
      o.systemId, o.orderType, o.customerName,
      o.items.map((it) => it.itemDetail).join('; '),
      totalQuantity(o.items),
      exportNumbers(o.items).join('; '),
      o.orderType === 'Export' ? o.originCountry : `${o.originCity}, ${o.originProvince}`,
      o.destination, o.status,
      o.containers.map((c) => c.containerType).join('; '),
      o.gateOutDate, o.actualDeliveryDate,
    ].map((v) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')

    const csv = [cols.join(','), ...rows.map(line)].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `logistics_orders_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Logistics Status" subtitle={`${rows.length} shown`} module="logisticsStatus" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>Export Excel</Button>
          <Button variant="outline" onClick={() => window.print()}>Export PDF</Button>
          {can(user, 'enter') && (
            <Button asChild>
              <Link to="/logistics-status/new">New Logistics Order</Link>
            </Button>
          )}
        </div>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (search) => setFilters((f) => ({ ...f, search })),
          placeholder: 'ID, customer, item, IDM, export no…',
        }}
      >
        <MultiSelectFilter label="Order type" options={orderTypeList} value={filters.orderType ?? []} onChange={(orderType) => setFilters((f) => ({ ...f, orderType: orderType as typeof f.orderType }))} />
        <MultiSelectFilter label="Status" options={statusList} value={filters.status ?? []} onChange={(status) => setFilters((f) => ({ ...f, status }))} />
        <MultiSelectFilter label="Customer" options={customerList} value={filters.customer ?? []} onChange={(customer) => setFilters((f) => ({ ...f, customer }))} />
      </FilterBar>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted">
            <Truck size={28} />
            <p>No logistics orders match this search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-canvas-alt text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Order type</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Items</th>
                <th className="px-3 py-2 text-right">Total qty</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Containers</th>
                <th className="px-3 py-2 text-left">Destination</th>
                <th className="px-3 py-2 text-right">Gate out</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const first = o.items[0]
                const more = o.items.length - 1
                const exportNos = exportNumbers(o.items)
                return (
                  <tr
                    key={o.systemId}
                    className="cursor-pointer border-t border-line hover:bg-canvas-alt"
                    onClick={() => navigate(`/logistics-status/${o.systemId}`)}
                  >
                    <td className="px-3 py-2 font-semibold tabular-nums">{o.systemId}</td>
                    <td className="px-3 py-2">{o.orderType}</td>
                    <td className="px-3 py-2">{o.customerName}</td>
                    <td className="px-3 py-2">
                      <div>{first?.itemDetail ?? '—'}{more > 0 && <span className="text-muted"> · +{more} more</span>}</div>
                      {o.orderType === 'Export' && (
                        <div className="text-[11px] tabular-nums text-muted">
                          {exportNos.length === 0 ? 'No export no.' : exportNos.length === 1 ? exportNos[0] : `${exportNos.length} export nos.`}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(totalQuantity(o.items))}</td>
                    <td className="px-3 py-2">
                      <StatusBadge label={o.status} />
                    </td>
                    <td className="px-3 py-2 text-[13px] text-muted">
                      {o.containers.length === 0
                        ? '—'
                        : o.containers.length === 1
                          ? o.containers[0].containerType
                          : `${o.containers.length} containers`}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-muted">
                      {o.orderType === 'Export' ? o.destination : `${o.originCity}, ${o.originProvince}`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{dateShort(o.gateOutDate)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/logistics-status/${o.systemId}`)}
                          className="rounded border border-line px-2.5 py-1 text-[11px] hover:border-muted"
                        >
                          Open
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/logistics-status/${o.systemId}/edit/order`)}
                            className="rounded border border-line px-2.5 py-1 text-[11px] hover:border-muted"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Open Requests — Import FOB (read-only; the record lives in Imports) */}
      {fobRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Open Requests — Import FOB</h3>
            <span className="rounded-full bg-[var(--color-watch-bg)] px-2 py-0.5 text-[11px] text-[var(--color-watch)]">{fobRequests.length}</span>
            <span className="text-xs text-muted">FOB imports needing shipping &amp; clearing-agent arrangement — managed in Imports Status</span>
          </div>
          <div className="overflow-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-canvas-alt text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Source consignment</th>
                  <th className="px-3 py-2 text-left">Branch</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Origin</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Clearing agent</th>
                  <th className="px-3 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {fobRequests.map((r) => (
                  <tr
                    key={r.systemId}
                    className="cursor-pointer border-t border-line hover:bg-canvas-alt"
                    onClick={() => navigate(`/imports-status/${r.sourceRef}`)}
                  >
                    <td className="px-3 py-2 font-semibold tabular-nums">{r.sourceRef}</td>
                    <td className="px-3 py-2">{r.customerName}</td>
                    <td className="px-3 py-2">{r.itemSummary}</td>
                    <td className="px-3 py-2 text-muted">{r.origin}</td>
                    <td className="px-3 py-2"><StatusBadge label={r.status} /></td>
                    <td className="px-3 py-2 text-[13px]">
                      {r.needsClearingAgent
                        ? <span className="rounded border border-[var(--color-watch)]/30 bg-[var(--color-watch-bg)] px-1.5 py-0.5 text-[11px] text-[var(--color-watch)]">Needs agent</span>
                        : <span className="text-muted">Assigned</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/imports-status/${r.sourceRef}`) }}
                        className="rounded border border-line px-2.5 py-1 text-[11px] hover:border-muted"
                      >
                        Open in Imports
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
