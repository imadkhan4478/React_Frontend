import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/theme/ThemeContext'
import { statusColors, BRAND } from '@/theme/tokens'
import { tooltipStyle } from './utils'

interface Props {
  labels: string[]
  values: number[]
  height?: number
}

/** Donut for composition (status split, stock health) — status-like
 * labels get their semantic risk/watch/healthy color where recognized. */
export function Donut({ labels, values, height = 300 }: Props) {
  const { colors } = useTheme()
  const data = labels.map((label, i) => ({ label, value: values[i] }))
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="50%"
          outerRadius="72%"
          paddingAngle={2}
          label={({ name, value }) => `${name} ${total ? Math.round((Number(value) / total) * 100) : 0}%`}
          labelLine
          isAnimationActive={false}
        >
          {data.map((d, i) => {
            const [fg] = statusColors(d.label, colors)
            return <Cell key={i} fill={fg === colors.info ? BRAND : fg} stroke={colors.surface} strokeWidth={2} />
          })}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value) => Number(value).toLocaleString()} />
        <Legend wrapperStyle={{ fontSize: 12, color: colors.muted }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
