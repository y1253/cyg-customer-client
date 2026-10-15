import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Registration } from '@/api/registrations'
import { useMailboxConnect } from '@/hooks/useMailboxConnect'
import { useRegistration } from '@/hooks/useRegistrations'
import {
  useDisconnectMailbox,
  useSaveRegistrationStep,
  useSubmitRegistration,
} from '@/hooks/useRegistrationActions'
import { StepIndicator } from './StepIndicator'
import {
  formFromAnswers,
  isStepValid,
  SAVED_STEP_KEYS,
  stepPayload,
  type SavedStepKey,
  type StepKey,
  visibleSteps,
} from './steps'
import type { FormData } from './types'
import { Step1Location } from './steps/Step1Location'
import { Step2Business } from './steps/Step2Business'
import { Step3Contact } from './steps/Step3Contact'
import { Step4Legal } from './steps/Step4Legal'
import { Step5Communication } from './steps/Step5Communication'
import { Step6Reconciliation } from './steps/Step6Reconciliation'
import { Step7Bills } from './steps/Step7Bills'
import { Step8Receivables } from './steps/Step8Receivables'
import { Step9Payroll } from './steps/Step9Payroll'
import { Step10General } from './steps/Step10General'
import { Step11Secretarial } from './steps/Step11Secretarial'
import { Step12Terms } from './steps/Step12Terms'

/** `/dashboard/register/:id` — loads the saved draft, then hands it to the form. */
export function RegisterWizardPage() {
  const id = Number(useParams().id)
  const reg = useRegistration(id)

  if (reg.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }
  if (reg.isError || !reg.data) {
    return (
      <div className="mx-auto max-w-2xl text-sm">
        <p className="text-destructive">{reg.error?.message ?? 'This application could not be found.'}</p>
        <BackLink />
      </div>
    )
  }
  if (!reg.data.isDraft) {
    return <Submitted supportNumber={reg.data.supportNumber} />
  }
  return <RegisterWizard registration={reg.data} />
}

function BackLink() {
  return (
    <Link
      to="/dashboard/register"
      className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={14} /> My businesses
    </Link>
  )
}

/** The key to open at: the server's resume point, or the terms once all is saved. */
function initialKey(r: Registration): StepKey {
  return (SAVED_STEP_KEYS[r.resumeStep] as SavedStepKey | undefined) ?? 'terms'
}

function RegisterWizard({ registration }: { registration: Registration }) {
  const id = registration.id
  const [form, setForm] = useState<FormData>(() => formFromAnswers(registration.answers))
  const [currentKey, setCurrentKey] = useState<StepKey>(() => initialKey(registration))
  const [billingPasswordSaved, setBillingPasswordSaved] = useState(registration.billingPasswordSaved)
  const save = useSaveRegistrationStep(id)
  const submit = useSubmitRegistration(id)
  const disconnect = useDisconnectMailbox(id)
  const mail = useMailboxConnect(id, registration.mailbox)

  const steps = useMemo(() => visibleSteps(form.country), [form.country])
  // A key that is no longer visible (Legal, after switching to USA) falls back to the first.
  const stepIdx = Math.max(0, steps.findIndex((s) => s.key === currentKey))
  const step = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1
  const busy = save.isPending || submit.isPending

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentKey])

  function patch(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const valid = isStepValid(step.key, form, {
    mailboxConnected: mail.mailbox !== null,
    billingPasswordSaved,
  })

  async function handleNext() {
    if (step.key === 'terms') {
      submit.mutate({
        cardHolderName: form.cardHolderName.trim(),
        cardNumber: form.cardNumber.trim(),
        cardExpiry: form.cardExpiry.trim(),
        cardCvv: form.cardCvv.trim(),
        termsAccepted: form.termsAccepted === true,
      })
      return
    }
    // Save first; only a saved step moves the wizard on.
    try {
      await save.mutateAsync({ key: step.key, body: stepPayload(step.key, form) })
    } catch {
      return
    }
    if (step.key === 'communication' && form.billingPassword) {
      setBillingPasswordSaved(true)
      patch({ billingPassword: '' })
    }
    setCurrentKey(steps[stepIdx + 1].key)
  }

  function handleBack() {
    save.reset()
    if (stepIdx > 0) setCurrentKey(steps[stepIdx - 1].key)
  }

  if (submit.isSuccess) {
    return <Submitted supportNumber={submit.data.supportNumber} justNow businessName={form.businessName} />
  }

  const error = save.error ?? submit.error

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackLink />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B1C2C] sm:text-3xl">
          {form.businessName.trim() || 'Register your business'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your answers are saved each time you click Next, so you can stop and come back any time.
        </p>
      </div>

      <StepIndicator steps={steps} currentStep={stepIdx} />

      <Card className="mt-6">
        <CardHeader className="border-b">
          <CardTitle className="text-base">{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>

        <CardContent className="pt-5">
          {step.key === 'location' && <Step1Location data={form} onChange={patch} />}
          {step.key === 'business' && <Step2Business data={form} onChange={patch} />}
          {step.key === 'contact' && <Step3Contact data={form} onChange={patch} />}
          {step.key === 'legal' && <Step4Legal data={form} onChange={patch} />}
          {step.key === 'communication' && (
            <Step5Communication
              data={form}
              onChange={patch}
              mailbox={mail.mailbox}
              connecting={mail.connecting}
              connectError={mail.error}
              disconnecting={disconnect.isPending}
              billingPasswordSaved={billingPasswordSaved}
              onConnect={mail.connect}
              onDisconnect={() =>
                disconnect.mutate(undefined, { onSuccess: () => mail.setMailbox(null) })
              }
            />
          )}
          {step.key === 'reconciliation' && <Step6Reconciliation data={form} onChange={patch} />}
          {step.key === 'payables' && <Step7Bills data={form} onChange={patch} />}
          {step.key === 'receivables' && <Step8Receivables data={form} onChange={patch} />}
          {step.key === 'payroll' && <Step9Payroll data={form} onChange={patch} />}
          {step.key === 'general' && <Step10General data={form} onChange={patch} />}
          {step.key === 'secretarial' && <Step11Secretarial data={form} onChange={patch} />}
          {step.key === 'terms' && <Step12Terms data={form} onChange={patch} />}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIdx === 0 || busy}
            className="w-full gap-1.5 sm:w-auto"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {error && <p className="text-xs text-destructive sm:max-w-xs">{error.message}</p>}
            <Button onClick={() => void handleNext()} disabled={!valid || busy} className="gap-1.5">
              {isLast ? (
                submit.isPending ? 'Submitting…' : 'Submit application'
              ) : save.isPending ? (
                'Saving…'
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your information is kept confidential and used only for bookkeeping purposes.
      </p>
    </div>
  )
}

function Submitted({
  supportNumber,
  justNow = false,
  businessName,
}: {
  supportNumber: string | null
  justNow?: boolean
  businessName?: string
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <div>
            <h2 className="text-xl font-semibold">
              {justNow ? 'Application received!' : 'Application submitted'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {businessName ? (
                <>
                  Thank you, <span className="font-medium text-foreground">{businessName.trim()}</span>.{' '}
                </>
              ) : null}
              We have your information and will be in touch shortly.
            </p>
          </div>
          <div className="w-full rounded-lg border bg-muted/30 p-4">
            <p className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Phone size={14} /> Your number
            </p>
            {supportNumber ? (
              <>
                <p className="mt-1 text-2xl font-semibold tracking-wide">{formatNumber(supportNumber)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Call, text or WhatsApp us on this number.</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Your new number is being set up. We will send it to you shortly.
              </p>
            )}
          </div>
          <BackLink />
        </CardContent>
      </Card>
    </div>
  )
}

/** "+15145550100" → "(514) 555-0100"; anything else as it came. */
function formatNumber(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164
}
