import { useFormContext, useFieldArray, useWatch } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { QG_FACTORIES } from '@/features/truckingStatus/schema'
import {
  PACKING_STATUSES, emptyPackage, packingDelay, packingSavings, outstandingByItem,
  type LogisticsDraft, type LogisticsPackage, type LogisticsItem, type PackageAllocation,
} from '../../schema'

const selectClass =
  'flex h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'

function DerivedField({ label, value, derivation }: { label: string; value: string; derivation: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex h-10 w-full items-center rounded-lg border border-line bg-canvas-alt px-3 text-sm tabular-nums text-muted">
        {value}
      </div>
      <p className="text-xs text-muted">{derivation}</p>
    </div>
  )
}

/**
 * One row in a package's allocation sub-table: "how much of this item is in
 * this package". Reads/writes `packages.{pkgIndex}.allocations` directly via
 * setValue rather than a nested useFieldArray, since the set of rows is
 * driven by the order's fixed item list, not independently added/removed.
 */
function AllocationRow({
  pkgIndex, item, allocations, onChange,
}: {
  pkgIndex: number
  item: LogisticsItem
  allocations: PackageAllocation[]
  onChange: (next: PackageAllocation[]) => void
}) {
  const existing = allocations.find((a) => a.itemId === item.id)
  const value = existing?.quantity ?? ''

  function handleChange(raw: string) {
    const qty = raw === '' ? undefined : Number(raw)
    const next = allocations.filter((a) => a.itemId !== item.id)
    next.push({ id: existing?.id ?? `alloc-${pkgIndex}-${item.id}`, itemId: item.id, quantity: qty })
    onChange(next)
  }

  return (
    <tr className="border-t border-line">
      <td className="py-1.5 pr-3">{item.itemDetail || <span className="italic text-muted">Not named</span>}</td>
      <td className="py-1.5 pr-3 text-muted">{item.quantity ?? '—'}</td>
      <td className="py-1.5">
        <input
          type="number"
          step="1"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 w-28 rounded border border-line bg-surface px-2 text-sm tabular-nums"
        />
      </td>
    </tr>
  )
}

/**
 * Step 2 — Packing (replaces Transportation).
 *
 * One panel per physical package: cost/status/weight fields, a derived
 * packing delay and savings, and a per-item allocation sub-table (a package
 * routinely holds partial quantities from more than one item). Below every
 * package panel, one summary shows each item's outstanding (unallocated)
 * quantity across ALL packages combined — the one place a partially-split
 * item's remaining balance is visible at a glance.
 */
export function Step2Packing() {
  const { control, register, setValue } = useFormContext<LogisticsDraft>()
  const { fields, append, remove } = useFieldArray({ control, name: 'packages' })
  const items = useWatch({ control, name: 'items' }) ?? []
  const packages = useWatch({ control, name: 'packages' }) ?? []

  const outstanding = outstandingByItem(items as LogisticsItem[], packages as LogisticsPackage[])

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {fields.map((f, i) => {
          const pkg = packages[i] as LogisticsPackage | undefined
          const delay = pkg ? packingDelay(pkg, items as LogisticsItem[]) : null
          const savings = pkg ? packingSavings(pkg) : null
          const allocations = pkg?.allocations ?? []

          return (
            <section key={f.id} className="rounded-xl border border-line bg-surface">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Package {i + 1}</h3>
                <span className="ml-auto" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  className="h-6 w-6 rounded border border-line text-muted hover:border-risk hover:text-risk disabled:opacity-35"
                  title="Remove package"
                >×</button>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.colourCode`}>Colour Code</Label>
                  <Input id={`packages.${i}.colourCode`} {...register(`packages.${i}.colourCode`)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.packingWorks`}>Packing Works</Label>
                  <select id={`packages.${i}.packingWorks`} className={selectClass} {...register(`packages.${i}.packingWorks`)}>
                    <option value="">Select a factory…</option>
                    {QG_FACTORIES.map((f2) => (
                      <option key={f2} value={f2}>{f2}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.packingReadyDate`}>Packing Ready Date</Label>
                  <Input id={`packages.${i}.packingReadyDate`} type="date" {...register(`packages.${i}.packingReadyDate`)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.packingDate`}>Packing Date</Label>
                  <Input id={`packages.${i}.packingDate`} type="date" {...register(`packages.${i}.packingDate`)} />
                </div>

                <DerivedField
                  label="Packing Delay (days)"
                  value={delay === null ? '—' : String(delay)}
                  derivation="Earliest allocated item's planned (or actual) RFD − packing date"
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.quotedPackingCost`}>Quoted Packing Cost</Label>
                  <Input id={`packages.${i}.quotedPackingCost`} type="number" step="0.01" {...register(`packages.${i}.quotedPackingCost`)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.actualPackingCost`}>Actual Packing Cost</Label>
                  <Input id={`packages.${i}.actualPackingCost`} type="number" step="0.01" {...register(`packages.${i}.actualPackingCost`)} />
                </div>

                <DerivedField
                  label="Savings"
                  value={savings === null ? '—' : savings.toFixed(2)}
                  derivation="Quoted packing cost − actual packing cost"
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.grossWeight`}>Gross Weight (kg)</Label>
                  <Input id={`packages.${i}.grossWeight`} type="number" step="0.01" {...register(`packages.${i}.grossWeight`)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`packages.${i}.status`}>Status</Label>
                  <select id={`packages.${i}.status`} className={selectClass} {...register(`packages.${i}.status`)}>
                    {PACKING_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* per-item allocation into this package */}
              <div className="border-t border-line px-4 py-3">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Item allocation — quantity of each item placed in this package
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-muted">
                      <tr>
                        <th className="pb-1 pr-3">Item</th>
                        <th className="pb-1 pr-3">Order qty</th>
                        <th className="pb-1">In this package</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(items as LogisticsItem[]).map((item) => (
                        <AllocationRow
                          key={item.id}
                          pkgIndex={i}
                          item={item}
                          allocations={allocations}
                          onChange={(next) => setValue(`packages.${i}.allocations`, next, { shouldDirty: true })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )
        })}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => append(emptyPackage(`package-${Date.now()}`))}
            className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-muted"
          >
            + Add package
          </button>
          <span className="text-xs text-muted">{fields.length} package{fields.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* outstanding-quantity summary across ALL packages */}
      <section className="rounded-xl border border-line bg-surface">
        <h3 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Outstanding quantity — across all packages combined
        </h3>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-1 pr-3">Item</th>
                <th className="pb-1 pr-3">Order qty</th>
                <th className="pb-1">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {(items as LogisticsItem[]).map((item) => {
                const rest = outstanding[item.id] ?? item.quantity ?? 0
                return (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-1.5 pr-3">{item.itemDetail || <span className="italic text-muted">Not named</span>}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-muted">{item.quantity ?? '—'}</td>
                    <td className="py-1.5 tabular-nums">
                      {rest === 0
                        ? <span className="text-[var(--color-healthy)]">Fully allocated</span>
                        : <span className={rest < 0 ? 'text-[var(--color-risk)]' : 'text-[var(--color-watch)]'}>{rest}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
