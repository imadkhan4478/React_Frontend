import { PageHeader } from '@/components/PageHeader'
import { HealthBanner } from '@/components/HealthBanner'
import { Section } from '@/components/Section'
import { KpiCard } from '@/components/KpiCard'
import { Card, CardContent } from '@/components/ui/card'
import { TrendLine } from '@/components/charts/TrendLine'
import { RankedBar } from '@/components/charts/RankedBar'
import { Donut } from '@/components/charts/Donut'
import { AgingBuckets } from '@/components/charts/AgingBuckets'
import { money } from '@/lib/format'
import {
  getHealth, getDashboardKpisRich, getWeeklyTrend, getAlerts,
  getSupplierPerformance, getStatusSplit, getAging,
} from '@/lib/mockData/dashboard'
import { useTheme } from '@/theme/ThemeContext'

export function Dashboard() {
  const { colors } = useTheme()
  const alertFg = { high: colors.risk, medium: colors.watch, low: colors.info } as const
  const alertBg = { high: colors.riskBg, medium: colors.watchBg, low: colors.infoBg } as const
  const health = getHealth()
  const kpis = getDashboardKpisRich()
  const trend = getWeeklyTrend()
  const alerts = getAlerts()
  const supplierPerf = getSupplierPerformance()
  const statusSplit = getStatusSplit('purchases')
  const aging = getAging()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Executive Dashboard" subtitle="Supply chain performance at a glance" module="dashboard" />

      <HealthBanner level={health.level} message={health.message} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Purchase Value" value={money(kpis.purchaseValue.value)} delta={kpis.purchaseValue.delta}
          direction={kpis.purchaseValue.direction} goodWhen={kpis.purchaseValue.goodWhen}
          spark={trend.map((w) => w.purchase_value)} />
        <KpiCard label="Avg Cycle Time" value={kpis.avgCycleTime.value} delta={kpis.avgCycleTime.delta}
          direction={kpis.avgCycleTime.direction} goodWhen={kpis.avgCycleTime.goodWhen}
          spark={trend.map((w) => w.avg_cycle_days)} />
        <KpiCard label="Delayed Orders" value={`${kpis.delayedOrders.value}`} delta={kpis.delayedOrders.delta}
          direction={kpis.delayedOrders.direction} goodWhen={kpis.delayedOrders.goodWhen}
          spark={trend.map((w) => w.delayed)} />
        <KpiCard label="On-Time Delivery" value={kpis.onTimeRate.value} delta={kpis.onTimeRate.delta}
          direction={kpis.onTimeRate.direction} goodWhen={kpis.onTimeRate.goodWhen}
          spark={trend.map((w) => w.on_time_pct)} />
        <KpiCard label="Items at Risk" value={`${kpis.itemsAtRisk.value}`} delta={kpis.itemsAtRisk.delta}
          direction={kpis.itemsAtRisk.direction} goodWhen={kpis.itemsAtRisk.goodWhen} />
        <KpiCard label="Open Imports" value={`${kpis.openImports.value}`} delta={kpis.openImports.delta}
          direction={kpis.openImports.direction} goodWhen={kpis.openImports.goodWhen} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <Section label="Purchase Value Trend" />
            <TrendLine data={trend} x="week" y="purchase_value" height={280} />
            <p className="mt-2 text-xs text-muted">PKR millions per week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Section label="Attention Required" />
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg border-l-4 px-3 py-2 text-sm"
                  style={{
                    borderLeftColor: alertFg[a.level],
                    backgroundColor: alertBg[a.level],
                    color: alertFg[a.level],
                  }}
                >
                  {a.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Section label="Supplier On-Time %" />
            <RankedBar data={supplierPerf} category="supplier" value="on_time_pct" height={300} benchmark={85} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Section label="Purchase Status" />
            <Donut labels={statusSplit.labels} values={statusSplit.values} height={300} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Section label="Delayed Orders — Days Overdue" />
            <AgingBuckets data={aging} height={300} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
