import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

export function Step1Consignment() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="consignmentNo">Consignment No.</Label>
        <Input id="consignmentNo" {...register('consignmentNo')} />
        {errors.consignmentNo && <p className="text-xs text-risk">{errors.consignmentNo.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" {...register('supplier')} />
        {errors.supplier && <p className="text-xs text-risk">{errors.supplier.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="itemDescription">Item Description</Label>
        <Input id="itemDescription" {...register('itemDescription')} />
        {errors.itemDescription && <p className="text-xs text-risk">{errors.itemDescription.message}</p>}
      </div>
    </div>
  )
}
