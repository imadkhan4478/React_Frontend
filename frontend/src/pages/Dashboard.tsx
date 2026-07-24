import { useState } from 'react'
import { ArrowUpRight, Sparkles, TriangleAlert, CircleAlert, Info } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiCard } from '@/components/KpiCard'
import { Card, CardContent } from '@/components/ui/card'
import { TrendLine } from '@/components/charts/TrendLine'
import { RankedBar } from '@/components/charts/RankedBar'
import { Donut } from '@/components/charts/Donut'
import { AgingBuckets } from '@/components/charts/AgingBuckets'
import { money } from '@/lib/format'
import { useTheme } from '@/theme/ThemeContext'
import { BRAND, VIOLET } from '@/theme/tokens'
import { cn } from '@/lib/utils'
import {
  getHealth, getDashboardKpisRich, weeklyTrend, getAlerts,
  getSupplierPerformance, getStatusSplit, getAging,
} from '@/lib/mockData/dashboard'

const RANGE_OPTIONS = [4, 8, 12] as const
const INSIGHT_TABS = [
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'status', label: 'Status' },
  { key: 'aging', label: 'Aging' },
] as const

const ALERT_ICON = { high: TriangleAlert, medium: CircleAlert, low: Info }

export function Dashboard() {
  const { colors } = useTheme()
  const [rangeWeeks, setRangeWeeks] = useState<(typeof RANGE_OPTIONS)[number]>(8)
  const [insightTab, setInsightTab] = useState<(typeof INSIGHT_TABS)[number]['key']>('suppliers')

  const health = getHealth()
  const kpis = getDashboardKpisRich()
  const trend = weeklyTrend.slice(-rangeWeeks)
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
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            {RANGE_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setRangeWeeks(w)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  rangeWeeks === w ? 'bg-brand text-white' : 'text-muted hover:text-ink',
                )}
              >
                {w}W
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero: purchase value + trend, unified into one spotlight card */}
      <Card
        className="overflow-hidden border-0 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${VIOLET} 100%)` }}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Purchase Value</p>
              <p className="font-display mt-1 text-4xl font-extrabold tracking-tight">
                {money(kpis.purchaseValue.value)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                <ArrowUpRight size={12} />
                {kpis.purchaseValue.delta}
              </span>
            </div>
            <Sparkles className="text-white/30" size={32} />
          </div>
          <div className="mt-2">
            <TrendLine data={trend} x="week" y="purchase_value" height={200} onDark />
          </div>
          <p className="mt-1 text-xs text-white/60">PKR millions per week · last {rangeWeeks} weeks</p>
        </CardContent>
      </Card>

      {/* Secondary KPIs */}
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

      {/* Insights: tabbed chart card + attention feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Insights</p>
              <div className="inline-flex rounded-lg bg-canvas-alt p-0.5">
                {INSIGHT_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setInsightTab(t.key)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      insightTab === t.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {insightTab === 'suppliers' && (
              <RankedBar data={supplierPerf} category="supplier" value="on_time_pct" height={300} benchmark={85} />
            )}
            {insightTab === 'status' && <Donut labels={statusSplit.labels} values={statusSplit.values} height={300} />}
            {insightTab === 'aging' && <AgingBuckets data={aging} height={300} />}
          </CardContent>
        </Card>

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
