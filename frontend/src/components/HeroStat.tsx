import { ArrowUpRight, ArrowDownRight, Sparkles, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { TrendLine } from './charts/TrendLine'
import { BRAND, VIOLET } from '@/theme/tokens'

interface Props {
  label: string
  value: string
  delta?: string
  direction?: 'up' | 'down' | null
  icon?: LucideIcon
  trendData: Record<string, unknown>[]
  trendX: string
  trendY: string
  caption?: string
  trendHeight?: number
}

/** Gradient "spotlight" card that merges a headline KPI with its own trend
 * chart into one visual instead of two separate cards — the page's most
 * important number gets the most visual weight. */
export function HeroStat({
  label, value, delta, direction = 'up', icon: Icon = Sparkles, trendData, trendX, trendY, caption, trendHeight = 200,
}: Props) {
  const DeltaIcon = direction === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <Card
      className="overflow-hidden border-0 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${VIOLET} 100%)` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">{label}</p>
            <p className="font-display mt-1 text-4xl font-extrabold tracking-tight">{value}</p>
            {delta && (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                <DeltaIcon size={12} />
                {delta}
              </span>
            )}
          </div>
          <Icon className="text-white/30" size={32} />
        </div>
        <div className="mt-2">
          <TrendLine data={trendData} x={trendX} y={trendY} height={trendHeight} onDark />
        </div>
        {caption && <p className="mt-1 text-xs text-white/60">{caption}</p>}
      </CardContent>
    </Card>
  )
}
