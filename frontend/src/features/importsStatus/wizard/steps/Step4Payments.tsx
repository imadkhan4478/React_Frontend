import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step4Payments() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentTerms">Payment Terms</Label>
        <Input id="paymentTerms" placeholder="e.g. LC at sight" {...register('paymentTerms')} />
        {errors.paymentTerms && <p className="text-xs text-risk">{errors.paymentTerms.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amountPaid">Amount Paid</Label>
        <Input id="amountPaid" type="number" step="0.01" {...register('amountPaid', { valueAsNumber: true })} />
        {errors.amountPaid && <p className="text-xs text-risk">{errors.amountPaid.message}</p>}
      </div>
    </div>
  )
}
