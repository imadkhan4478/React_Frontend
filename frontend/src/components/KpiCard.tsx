import { Check, TriangleAlert, Circle } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { useTheme } from '@/theme/ThemeContext'
import { BRAND } from '@/theme/tokens'

export interface KpiData {
  label: string
  value: string
  delta?: string
  direction?: 'up' | 'down' | null
  goodWhen?: 'up' | 'down'
  sub?: string
  /** Real historical values (e.g. weekly totals) for a tiny trend line —
   * omit entirely when there's no real series behind a number. */
  spark?: number[]
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const clean = values.filter((v) => v !== null && v !== undefined)
  if (clean.length < 2) return null
  const width = 160
  const height = 28
  const lo = Math.min(...clean)
  const hi = Math.max(...clean)
  const span = hi - lo || 1
  const points = clean
    .map((v, i) => {
      const x = (i / (clean.length - 1)) * width
      const y = height - 2 - ((v - lo) / span) * (height - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({ label, value, delta, direction, goodWhen = 'down', sub, spark }: KpiData) {
  const { colors } = useTheme()
  const hasDirection = direction === 'up' || direction === 'down'
  const isGood = hasDirection && direction === goodWhen
  const ink = hasDirection ? (isGood ? colors.healthy : colors.risk) : BRAND
  const Icon = hasDirection ? (isGood ? Check : TriangleAlert) : Circle

  return (
    <Card className="border-l-4" style={{ borderLeftColor: ink }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ink}1A`, color: ink }}
          >
            <Icon size={16} fill={Icon === Circle ? ink : 'none'} />
          </div>
          {hasDirection && delta && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: colors.canvasAlt, color: ink }}
            >
              {direction === 'up' ? '▲' : '▼'} {delta}
            </span>
          )}
        </div>
        <p className="font-display mt-3 text-2xl font-extrabold text-navy">{value}</p>
        <p className="text-sm font-medium text-muted">{label}</p>
        {!hasDirection && delta && <p className="mt-1 text-xs text-muted">{delta}</p>}
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        {spark && <Sparkline values={spark} color={ink} />}
      </CardContent>
    </Card>
  )
}
