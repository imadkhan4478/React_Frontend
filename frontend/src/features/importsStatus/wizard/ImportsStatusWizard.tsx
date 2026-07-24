import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'
import { consignmentDraftSchema, DRAFT_DEFAULT_VALUES, WIZARD_STEPS, type ConsignmentDraft } from '../schema'
import { WizardStepper } from './WizardStepper'
import { Step1Consignment } from './steps/Step1Consignment'
import { Step2Finance } from './steps/Step2Finance'
import { Step3Shipping } from './steps/Step3Shipping'
import { Step4Payments } from './steps/Step4Payments'
import { Step5StatusRemarks } from './steps/Step5StatusRemarks'
import { Step6Clearance } from './steps/Step6Clearance'
import { Step7LandedCost } from './steps/Step7LandedCost'

const STEP_COMPONENTS = [
  Step1Consignment, Step2Finance, Step3Shipping, Step4Payments,
  Step5StatusRemarks, Step6Clearance, Step7LandedCost,
]

export function ImportsStatusWizard() {
  const { user } = useAuth()
  const { id, step } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const currentStep = isNew ? 1 : Number(step) || 1
  const stepIndex = Math.min(Math.max(currentStep, 1), WIZARD_STEPS.length) - 1
  const stepDef = WIZARD_STEPS[stepIndex]
  const StepComponent = STEP_COMPONENTS[stepIndex]

  const methods = useForm<ConsignmentDraft>({
    resolver: zodResolver(consignmentDraftSchema),
    defaultValues: DRAFT_DEFAULT_VALUES,
    mode: 'onBlur',
  })

  // Same actions the list/detail views gate on — a viewer or a user without
  // create rights should never land on this route, hyperlink or not.
  const allowed = isNew ? can(user, 'enter') : can(user, 'editAny') || can(user, 'editOwnDraft')
  if (!allowed) return <Navigate to="/imports-status" replace />

  async function goToStep(nextStep: number) {
    const valid = await methods.trigger(stepDef.fields)
    if (!valid) return

    const clamped = Math.min(Math.max(nextStep, 1), WIZARD_STEPS.length)
    if (isNew) {
      if (clamped === 1) return
      // Placeholder: a real step-1 submit would return the new consignment's
      // id from the API. Steps 2-7 always live under /:id/edit/:step, so we
      // stand in a client-generated id until that API exists.
      navigate(`/imports-status/${crypto.randomUUID()}/edit/${clamped}`)
    } else {
      navigate(`/imports-status/${id}/edit/${clamped}`)
    }
  }

  function onSubmit(data: ConsignmentDraft) {
    // Placeholder: wire up to the real API once it exists.
    console.log('submit consignment draft', data)
    navigate(id ? `/imports-status/${id}` : '/imports-status')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isNew ? 'New Consignment' : `Edit Consignment ${id}`}
        subtitle={`Step ${stepDef.step} of ${WIZARD_STEPS.length} — ${stepDef.label}`}
        module="importsStatus"
      />

      <WizardStepper steps={WIZARD_STEPS} current={stepDef.step} />

      <Card>
        <CardContent className="p-6">
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <StepComponent />

              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={stepDef.step === 1}
                  onClick={() => goToStep(stepDef.step - 1)}
                >
                  Back
                </Button>
                {stepDef.step < WIZARD_STEPS.length ? (
                  <Button type="button" onClick={() => goToStep(stepDef.step + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit">Submit</Button>
                )}
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
}
