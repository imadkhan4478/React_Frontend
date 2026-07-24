import { useState } from 'react'
import { TriangleAlert, CircleAlert, Info } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiCard } from '@/components/KpiCard'
import { HeroStat } from '@/components/HeroStat'
import { InsightsCard } from '@/components/InsightsCard'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Card, CardContent } from '@/components/ui/card'
import { RankedBar } from '@/components/charts/RankedBar'
import { Donut } from '@/components/charts/Donut'
import { AgingBuckets } from '@/components/charts/AgingBuckets'
import { money } from '@/lib/format'
import { useTheme } from '@/theme/ThemeContext'
import {
  getHealth, getDashboardKpisRich, weeklyTrend, getAlerts,
  getSupplierPerformance, getStatusSplit, getAging,
} from '@/lib/mockData/dashboard'

const RANGE_OPTIONS = [
  { value: '4', label: '4W' }, { value: '8', label: '8W' }, { value: '12', label: '12W' },
] as const
const INSIGHT_TABS = [
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'status', label: 'Status' },
  { value: 'aging', label: 'Aging' },
] as const

const ALERT_ICON = { high: TriangleAlert, medium: CircleAlert, low: Info }

export function Dashboard() {
  const { colors } = useTheme()
  const [rangeWeeks, setRangeWeeks] = useState<'4' | '8' | '12'>('8')
  const [insightTab, setInsightTab] = useState<(typeof INSIGHT_TABS)[number]['value']>('suppliers')

  const health = getHealth()
  const kpis = getDashboardKpisRich()
  const trend = weeklyTrend.slice(-Number(rangeWeeks))
  const alerts = getAlerts()
  const supplierPerf = getSupplierPerformance()
  const statusSplit = getStatusSplit('purchases')
  const aging = getAging()

  const healthColor =
    health.level === 'healthy' ? colors.healthy : health.level === 'risk' ? colors.risk : colors.watch
  const healthBg =
    health.level === 'healthy' ? colors.healthyBg : health.level === 'risk' ? colors.riskBg : colors.watchBg
  const alertColor = { high: colors.risk, medium: colors.watch, low: colors.info }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Executive Dashboard" subtitle="Supply chain performance at a glance" module="dashboard" />
        <div className="mb-6 flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: healthBg, color: healthColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthColor }} />
            {health.message}
          </span>
          <SegmentedControl options={RANGE_OPTIONS} value={rangeWeeks} onChange={setRangeWeeks} />
        </div>
      </div>

      <HeroStat
        label="Purchase Value"
        value={money(kpis.purchaseValue.value)}
        delta={kpis.purchaseValue.delta}
        direction={kpis.purchaseValue.direction}
        trendData={trend}
        trendX="week"
        trendY="purchase_value"
        caption={`PKR millions per week · last ${rangeWeeks} weeks`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Avg Cycle Time" value={kpis.avgCycleTime.value} delta={kpis.avgCycleTime.delta}
          direction={kpis.avgCycleTime.direction} goodWhen={kpis.avgCycleTime.goodWhen}
          spark={weeklyTrend.map((w) => w.avg_cycle_days)} />
        <KpiCard label="Delayed Orders" value={`${kpis.delayedOrders.value}`} delta={kpis.delayedOrders.delta}
          direction={kpis.delayedOrders.direction} goodWhen={kpis.delayedOrders.goodWhen}
          spark={weeklyTrend.map((w) => w.delayed)} />
        <KpiCard label="On-Time Delivery" value={kpis.onTimeRate.value} delta={kpis.onTimeRate.delta}
          direction={kpis.onTimeRate.direction} goodWhen={kpis.onTimeRate.goodWhen}
          spark={weeklyTrend.map((w) => w.on_time_pct)} />
        <KpiCard label="Items at Risk" value={`${kpis.itemsAtRisk.value}`} delta={kpis.itemsAtRisk.delta}
          direction={kpis.itemsAtRisk.direction} goodWhen={kpis.itemsAtRisk.goodWhen} />
        <KpiCard label="Open Imports" value={`${kpis.openImports.value}`} delta={kpis.openImports.delta}
          direction={kpis.openImports.direction} goodWhen={kpis.openImports.goodWhen} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InsightsCard title="Insights" tabs={INSIGHT_TABS} active={insightTab} onChange={setInsightTab} className="lg:col-span-2">
          {insightTab === 'suppliers' && (
            <RankedBar data={supplierPerf} category="supplier" value="on_time_pct" height={300} benchmark={85} />
          )}
          {insightTab === 'status' && <Donut labels={statusSplit.labels} values={statusSplit.values} height={300} />}
          {insightTab === 'aging' && <AgingBuckets data={aging} height={300} />}
        </InsightsCard>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-ink">Attention Required</p>
            <div className="flex flex-col gap-3.5">
              {alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.level]
                const fg = alertColor[a.level]
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${fg}1A`, color: fg }}
                    >
                      <Icon size={14} />
                    </span>
                    <p className="text-sm leading-snug text-ink">{a.message}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
