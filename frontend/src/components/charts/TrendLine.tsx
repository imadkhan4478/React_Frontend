import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/theme/ThemeContext'
import { BRAND, VIOLET } from '@/theme/tokens'
import { tooltipStyle } from './utils'

interface Props {
  data: Record<string, unknown>[]
  x: string
  y: string
  height?: number
}

/** Smooth trend line with a brand-gradient fill — for values over time. */
export function TrendLine({ data, x, y, height = 300 }: Props) {
  const { colors } = useTheme()
  const gradientId = `trend-${x}-${y}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.line} />
        <XAxis
          dataKey={x}
          tick={{ fill: colors.muted, fontSize: 12 }}
          axisLine={{ stroke: colors.line }}
          tickLine={false}
        />
        <YAxis tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey={y}
          stroke={BRAND}
          strokeWidth={3}
          fill={`url(#${gradientId})`}
          dot={{ r: 4, fill: VIOLET, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
