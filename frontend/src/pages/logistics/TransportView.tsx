import { useMemo, useState } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { Disclosure } from '@/components/Disclosure'
import { KpiCard } from '@/components/KpiCard'
import { InsightsCard } from '@/components/InsightsCard'
import { ChartCard } from '@/components/ChartCard'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { CategoryBar } from '@/components/charts/CategoryBar'
import { Donut } from '@/components/charts/Donut'
import { RankedBar } from '@/components/charts/RankedBar'
import { money } from '@/lib/format'
import {
  getShifting, shiftingStatusList, shiftingMovementTypeList, shiftingPaymentStatusList,
} from '@/lib/mockData/logistics'

const TABS = [
  { value: 'status', label: 'Status' },
  { value: 'transporter', label: 'By Transporter' },
  { value: 'province', label: 'By Province' },
] as const

export function TransportView() {
  const [status, setStatus] = useState<string[]>([])
  const [movementType, setMovementType] = useState<string[]>([])
  const [paymentStatus, setPaymentStatus] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('status')

  const data = useMemo(() => getShifting({ status, movementType, paymentStatus }), [status, movementType, paymentStatus])
  const tableRows = useMemo(() => {
    if (!search.trim()) return data
    const needle = search.toLowerCase()
    return data.filter((r) => [r.customer, r.transporter, r.destination].some((v) => v.toLowerCase().includes(needle)))
  }, [data, search])

  const delivered = data.filter((r) => r.status === 'Delivered').length
  const inProgress = data.filter((r) => r.status === 'In Progress').length
  const totalFreight = data.reduce((s, r) => s + r.actual_freight_rs, 0)
  const totalSavings = data.reduce((s, r) => s + (r.savings_rs ?? 0), 0)
  const transporters = new Set(data.map((r) => r.transporter)).size

  const byStatus = [...new Set(data.map((r) => r.status))].map((s) => ({ label: s, value: data.filter((r) => r.status === s).length }))
  const byTransporter = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of data) map.set(r.transporter, (map.get(r.transporter) ?? 0) + 1)
    return [...map.entries()].map(([transporter, movements]) => ({ transporter, movements })).sort((a, b) => b.movements - a.movements).slice(0, 8)
  }, [data])
  const byProvince = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of data) map.set(r.province, (map.get(r.province) ?? 0) + 1)
    return [...map.entries()].map(([province, movements]) => ({ province, movements })).sort((a, b) => b.movements - a.movements)
  }, [data])
  const freightByTransporter = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of data) map.set(r.transporter, (map.get(r.transporter) ?? 0) + r.actual_freight_rs)
    return [...map.entries()].map(([transporter, actual_freight_rs]) => ({ transporter, actual_freight_rs }))
      .sort((a, b) => b.actual_freight_rs - a.actual_freight_rs).slice(0, 8)
  }, [data])

  const columns: Column[] = [
    { key: 'customer', label: 'Customer' },
    { key: 'transporter', label: 'Transporter' },
    { key: 'province', label: 'Province' },
    { key: 'destination', label: 'Destination' },
    { key: 'actual_freight_rs', label: 'Freight', align: 'right', render: (row) => money(row.actual_freight_rs as number) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge label={row.status as string} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FilterBar>
        <MultiSelectFilter label="Status" options={shiftingStatusList} value={status} onChange={setStatus} />
        <MultiSelectFilter label="Movement Type" options={shiftingMovementTypeList} value={movementType} onChange={setMovementType} />
        <MultiSelectFilter label="Payment Status" options={shiftingPaymentStatusList} value={paymentStatus} onChange={setPaymentStatus} />
      </FilterBar>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Movements Shown" value={data.length.toLocaleString()} />
        <KpiCard label="Delivered" value={`${delivered}`} direction={delivered ? 'up' : null} goodWhen="up" />
        <KpiCard label="In Progress" value={`${inProgress}`} />
        <KpiCard label="Total Freight Cost" value={money(totalFreight)} />
        <KpiCard label="Total Savings" value={totalSavings ? money(totalSavings) : '—'} />
        <KpiCard label="Transporters" value={`${transporters}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InsightsCard title="Insights" tabs={TABS} active={tab} onChange={setTab} className="lg:col-span-2">
          {data.length === 0 && <p className="py-12 text-center text-sm text-muted">No movements match the current filter.</p>}
          {data.length > 0 && tab === 'status' && <Donut labels={byStatus.map((s) => s.label)} values={byStatus.map((s) => s.value)} height={300} />}
          {data.length > 0 && tab === 'transporter' && <RankedBar data={byTransporter} category="transporter" value="movements" height={300} />}
          {data.length > 0 && tab === 'province' && <CategoryBar data={byProvince} category="province" value="movements" height={300} />}
        </InsightsCard>
        <ChartCard title="Freight Cost by Transporter">
          {freightByTransporter.length > 0
            ? <RankedBar data={freightByTransporter} category="transporter" value="actual_freight_rs" height={300} />
            : <p className="py-12 text-center text-sm text-muted">No transporter data in the current view.</p>}
        </ChartCard>
      </div>

      <Disclosure title="View data / search">
        <div className="flex flex-col gap-3 pb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, transporter, or destination…"
            className="h-10 w-full max-w-md rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted"
          />
          <DataTable columns={columns} rows={tableRows as unknown as Record<string, unknown>[]} statusColumn="status" height={420} />
        </div>
      </Disclosure>
    </div>
  )
}
