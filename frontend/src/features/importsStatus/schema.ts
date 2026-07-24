import { z } from 'zod'

/**
 * One zod object per wizard step, merged into a single draft schema. The
 * wizard validates only the current step's fields via `trigger(fields)` on
 * each Next click (react-hook-form's documented multi-step pattern), so a
 * schema-level `required` on a later step's field never blocks an earlier
 * one — see wizard/ImportsStatusWizard.tsx.
 */
export const consignmentSchema = z.object({
  consignmentNo: z.string().min(1, 'Consignment number is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
})

export const financeSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  invoiceValue: z.number().positive('Invoice value must be greater than 0'),
})

export const shippingSchema = z.object({
  modeOfShipment: z.enum(['Sea', 'Air', 'Land']),
  billOfLadingNo: z.string().optional(),
})

export const paymentsSchema = z.object({
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  amountPaid: z.number().min(0).optional(),
})

export const statusRemarksSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  remarks: z.string().optional(),
})

export const clearanceSchema = z.object({
  clearingAgent: z.string().optional(),
  customsDutyPaid: z.number().min(0).optional(),
})

export const landedCostSchema = z.object({
  freightCost: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional(),
})

export const consignmentDraftSchema = consignmentSchema
  .merge(financeSchema)
  .merge(shippingSchema)
  .merge(paymentsSchema)
  .merge(statusRemarksSchema)
  .merge(clearanceSchema)
  .merge(landedCostSchema)

export type ConsignmentDraft = z.infer<typeof consignmentDraftSchema>

export const DRAFT_DEFAULT_VALUES: ConsignmentDraft = {
  consignmentNo: '',
  supplier: '',
  itemDescription: '',
  currency: '',
  invoiceValue: 0,
  modeOfShipment: 'Sea',
  billOfLadingNo: '',
  paymentTerms: '',
  amountPaid: 0,
  status: '',
  remarks: '',
  clearingAgent: '',
  customsDutyPaid: 0,
  freightCost: 0,
  otherCharges: 0,
}

export interface WizardStepDef {
  step: number
  key: string
  label: string
  fields: (keyof ConsignmentDraft)[]
}

// Mirrors the seven steps from the README: Consignment, Finance, Shipping,
// Payments, Status & Remarks, Clearance, Landed Cost.
export const WIZARD_STEPS: WizardStepDef[] = [
  { step: 1, key: 'consignment', label: 'Consignment', fields: ['consignmentNo', 'supplier', 'itemDescription'] },
  { step: 2, key: 'finance', label: 'Finance', fields: ['currency', 'invoiceValue'] },
  { step: 3, key: 'shipping', label: 'Shipping', fields: ['modeOfShipment', 'billOfLadingNo'] },
  { step: 4, key: 'payments', label: 'Payments', fields: ['paymentTerms', 'amountPaid'] },
  { step: 5, key: 'status-remarks', label: 'Status & Remarks', fields: ['status', 'remarks'] },
  { step: 6, key: 'clearance', label: 'Clearance', fields: ['clearingAgent', 'customsDutyPaid'] },
  { step: 7, key: 'landed-cost', label: 'Landed Cost', fields: ['freightCost', 'otherCharges'] },
]
