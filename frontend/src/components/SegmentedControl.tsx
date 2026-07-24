import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** 'solid' for standalone controls (brand-filled active state), 'ghost'
   * for nesting inside a card that already has its own surface. */
  variant?: 'solid' | 'ghost'
}

/** Small pill-group toggle — reused for range pickers, insight tabs, and
 * anywhere else a page needs an instant, no-reload view switch. */
export function SegmentedControl<T extends string>({ options, value, onChange, variant = 'solid' }: Props<T>) {
  return (
    <div className={cn('inline-flex rounded-lg p-0.5', variant === 'solid' ? 'border border-line bg-surface' : 'bg-canvas-alt')}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? variant === 'solid' ? 'bg-brand text-white' : 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
