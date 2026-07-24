import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step6Clearance() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clearingAgent">Clearing Agent</Label>
        <Input id="clearingAgent" {...register('clearingAgent')} />
        {errors.clearingAgent && <p className="text-xs text-risk">{errors.clearingAgent.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customsDutyPaid">Customs Duty Paid</Label>
        <Input id="customsDutyPaid" type="number" step="0.01" {...register('customsDutyPaid', { valueAsNumber: true })} />
        {errors.customsDutyPaid && <p className="text-xs text-risk">{errors.customsDutyPaid.message}</p>}
      </div>
    </div>
  )
}
