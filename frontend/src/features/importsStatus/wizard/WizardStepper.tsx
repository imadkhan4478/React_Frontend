import { cn } from '@/lib/utils'
import type { WizardStepDef } from '../schema'

export function WizardStepper({ steps, current }: { steps: WizardStepDef[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((s) => (
        <li
          key={s.step}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium',
            s.step === current
              ? 'border-brand bg-brand text-white'
              : s.step < current
                ? 'border-line bg-canvas-alt text-ink'
                : 'border-line text-muted',
          )}
        >
          {s.step}. {s.label}
        </li>
      ))}
    </ol>
  )
}
