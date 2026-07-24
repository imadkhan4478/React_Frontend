import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ConsignmentDraft } from '../../schema'

const MODES = ['Sea', 'Air', 'Land'] as const

export function Step3Shipping() {
  const { register, formState: { errors } } = useFormContext<ConsignmentDraft>()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="modeOfShipment">Mode of Shipment</Label>
        <select
          id="modeOfShipment"
          className="flex h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          {...register('modeOfShipment')}
        >
          {MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
        {errors.modeOfShipment && <p className="text-xs text-risk">{errors.modeOfShipment.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billOfLadingNo">Bill of Lading No.</Label>
        <Input id="billOfLadingNo" {...register('billOfLadingNo')} />
        {errors.billOfLadingNo && <p className="text-xs text-risk">{errors.billOfLadingNo.message}</p>}
      </div>
    </div>
  )
}
