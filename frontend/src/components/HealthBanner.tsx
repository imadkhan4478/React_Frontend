import { Check, TriangleAlert, ChevronUp } from 'lucide-react'
import { useTheme } from '@/theme/ThemeContext'

const ICONS = { healthy: Check, watch: TriangleAlert, risk: ChevronUp } as const

export function HealthBanner({ level, message }: { level: 'healthy' | 'watch' | 'risk'; message: string }) {
  const { colors } = useTheme()
  const [fg, bg] =
    level === 'healthy' ? [colors.healthy, colors.healthyBg] :
    level === 'risk' ? [colors.risk, colors.riskBg] :
    [colors.watch, colors.watchBg]
  const Icon = ICONS[level]

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ backgroundColor: bg, borderColor: `${fg}33` }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${fg}26`, color: fg }}>
        <Icon size={16} />
      </span>
      <p className="text-sm font-semibold" style={{ color: fg }}>{message}</p>
    </div>
  )
}
