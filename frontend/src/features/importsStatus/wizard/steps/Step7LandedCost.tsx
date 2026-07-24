import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step7LandedCost() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="freightCost">Freight Cost</Label>
        <Input id="freightCost" type="number" step="0.01" {...register('freightCost', { valueAsNumber: true })} />
        {errors.freightCost && <p className="text-xs text-risk">{errors.freightCost.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otherCharges">Other Charges</Label>
        <Input id="otherCharges" type="number" step="0.01" {...register('otherCharges', { valueAsNumber: true })} />
        {errors.otherCharges && <p className="text-xs text-risk">{errors.otherCharges.message}</p>}
      </div>
    </div>
  )
}
