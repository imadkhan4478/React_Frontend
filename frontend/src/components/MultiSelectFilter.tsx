import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Multi-value filter dropdown. An empty selection means "no filter" (same
 * as the old Streamlit ui.multiselect_filter()) — shown as the "All"
 * placeholder rather than requiring an explicit "All" option to pick.
 */
export function MultiSelectFilter({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm text-ink"
        >
          <span className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted">All</span>
            ) : (
              value.map((v) => (
                <span
                  key={v}
                  className="flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand"
                >
                  {v}
                  <X
                    size={12}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(v)
                    }}
                  />
                </span>
              ))
            )}
          </span>
          <ChevronDown size={16} className="shrink-0 text-muted" />
        </button>

        {open && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
            {options.map((option) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-canvas-alt',
                )}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggle(option)}
                  className="accent-brand"
                />
                {option}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
