export function money(value: number): string {
  if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `PKR ${Math.round(value / 1_000)}K`
  return `PKR ${Math.round(value).toLocaleString()}`
}

export interface WeeklyPoint {
  week: string
  value: number
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day + 6) % 7 // Monday start
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Group rows into real weekly sums — same granularity as the old
 * ui.weekly_trend_points(), which chose weekly over monthly because a
 * short real date range gives too few monthly points to read as a trend. */
export function weeklyTrendPoints(rows: { date: Date; value: number }[]): WeeklyPoint[] {
  const buckets = new Map<string, number>()
  for (const { date, value } of rows) {
    const key = startOfWeek(date).toISOString().slice(0, 10)
    buckets.set(key, (buckets.get(key) ?? 0) + value)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, value]) => ({ week, value }))
}
