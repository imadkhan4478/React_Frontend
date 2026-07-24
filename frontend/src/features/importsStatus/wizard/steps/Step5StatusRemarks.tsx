import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step5StatusRemarks() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Input id="status" placeholder="e.g. In Transit" {...register('status')} />
        {errors.status && <p className="text-xs text-risk">{errors.status.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Input id="remarks" {...register('remarks')} />
        {errors.remarks && <p className="text-xs text-risk">{errors.remarks.message}</p>}
      </div>
    </div>
  )
}
