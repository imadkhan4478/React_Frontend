import { useFormContext, useFieldArray, useWatch } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ORDER_TYPES, emptyItem, itemPendingFields,
  type LogisticsDraft, type LogisticsItem,
} from '../../schema'

const selectClass =
  'flex h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'

/**
 * Step 1 — Order details.
 *
 * Order-level fields (type, origin, customer) apply to the whole order. Item detail, quantity, both weights, IDM, export
 * no. and batch no. are per item — an order can bundle several items, and an
 * export order's items can carry different export numbers from each other.
 */
export function Step1Order() {
  const { register, control, watch, formState: { errors } } = useFormContext<LogisticsDraft>()
  // Single rules driver for the screen — origin shape and each item's export
  // no. field both key off this, so nothing branches on a string literal.
  const orderType = useWatch({ control, name: 'orderType' })
  const isExport = orderType === 'Export'

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  return (
    <div className="space-y-5">
      {/* order-level fields */}
      <section className="rounded-xl border border-line bg-surface">
        <h3 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Order details — applies to the whole order
        </h3>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orderType">Order Type</Label>
            <select id="orderType" className={selectClass} {...register('orderType')}>
              {ORDER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.orderType && <p className="text-xs text-risk">{errors.orderType.message}</p>}
          </div>

          {/* Origin: country for exports; city + province for local. */}
          {isExport ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="originCountry">Customer Origin — Country</Label>
              <Input id="originCountry" placeholder="e.g. United Arab Emirates" {...register('originCountry')} />
              {errors.originCountry && <p className="text-xs text-risk">{errors.originCountry.message}</p>}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="originCity">Customer Origin — City</Label>
                <Input id="originCity" placeholder="e.g. Lahore" {...register('originCity')} />
                {errors.originCity && <p className="text-xs text-risk">{errors.originCity.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="originProvince">Customer Origin — Province</Label>
                <Input id="originProvince" placeholder="e.g. Punjab" {...register('originProvince')} />
                {errors.originProvince && <p className="text-xs text-risk">{errors.originProvince.message}</p>}
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input id="customerName" {...register('customerName')} />
            {errors.customerName && <p className="text-xs text-risk">{errors.customerName.message}</p>}
          </div>
        </div>
      </section>

      {/* items */}
      <section className="rounded-xl border border-line bg-surface">
        <h3 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Items — {isExport ? 'each item can carry its own export number' : 'quantity and weight are per item'}
        </h3>

        <div className="space-y-3 p-4">
          {fields.map((f, i) => {
            const item = items?.[i] as LogisticsItem | undefined
            const pending = item ? itemPendingFields(item, orderType) : []
            return (
              <div key={f.id} className="rounded-lg border border-line bg-canvas-alt/40">
                <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Item {i + 1}</span>
                  <span className="truncate text-[13px] font-medium">{item?.itemDetail || 'Not named yet'}</span>
                  <span className="ml-auto" />
                  {pending.length > 0
                    ? <span className="cursor-help rounded border border-[var(--color-watch)]/30 bg-[var(--color-watch-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-watch)]" title={`Still to add: ${pending.join(', ')}`}>{pending.length} pending</span>
                    : <span className="rounded border border-[var(--color-healthy)]/30 bg-[var(--color-healthy-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-healthy)]">Complete</span>}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                    className="ml-1 h-6 w-6 rounded border border-line text-muted hover:border-risk hover:text-risk disabled:opacity-35"
                    title="Remove item"
                  >×</button>
                </div>

                <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                    <Label htmlFor={`items.${i}.itemDetail`}>Item Detail</Label>
                    <Input id={`items.${i}.itemDetail`} {...register(`items.${i}.itemDetail`)} />
                    {errors.items?.[i]?.itemDetail && <p className="text-xs text-risk">{errors.items[i]?.itemDetail?.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`items.${i}.quantity`}>Quantity</Label>
                    <Input id={`items.${i}.quantity`} type="number" step="1" {...register(`items.${i}.quantity`)} />
                    {errors.items?.[i]?.quantity && <p className="text-xs text-risk">{errors.items[i]?.quantity?.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`items.${i}.netWeight`}>Net Weight (kg)</Label>
                    <Input id={`items.${i}.netWeight`} type="number" step="0.01" {...register(`items.${i}.netWeight`)} />
                    {errors.items?.[i]?.netWeight && <p className="text-xs text-risk">{errors.items[i]?.netWeight?.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`items.${i}.grossWeight`}>Gross Weight (kg)</Label>
                    <Input id={`items.${i}.grossWeight`} type="number" step="0.01" {...register(`items.${i}.grossWeight`)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`items.${i}.idm`}>IDM</Label>
                    <Input id={`items.${i}.idm`} {...register(`items.${i}.idm`)} />
                    {errors.items?.[i]?.idm && <p className="text-xs text-risk">{errors.items[i]?.idm?.message}</p>}
                  </div>

                  {isExport && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`items.${i}.exportNo`}>
                        Export No. <span className="font-normal text-muted">(can differ per item)</span>
                      </Label>
                      <Input id={`items.${i}.exportNo`} {...register(`items.${i}.exportNo`)} />
                      {errors.items?.[i]?.exportNo && <p className="text-xs text-risk">{errors.items[i]?.exportNo?.message}</p>}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`items.${i}.batchNo`}>
                      Batch No. <span className="font-normal text-muted">(optional)</span>
                    </Label>
                    <Input id={`items.${i}.batchNo`} {...register(`items.${i}.batchNo`)} />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => append(emptyItem(`item-${Date.now()}`))}
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-muted"
            >
              + Add item
            </button>
            <span className="text-xs text-muted">{fields.length} item{fields.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
