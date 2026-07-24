import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step2Finance() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" placeholder="USD" {...register('currency')} />
        {errors.currency && <p className="text-xs text-risk">{errors.currency.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invoiceValue">Invoice Value</Label>
        <Input id="invoiceValue" type="number" step="0.01" {...register('invoiceValue', { valueAsNumber: true })} />
        {errors.invoiceValue && <p className="text-xs text-risk">{errors.invoiceValue.message}</p>}
      </div>
    </div>
  )
}
