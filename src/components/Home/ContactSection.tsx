import { useState, type FormEvent } from 'react'
import { CheckCircle2, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitContact, type ContactValues } from '@/api/contact'
import { CONTACT } from './content'
import { SECTION_TITLE } from './cta'

type Field = keyof ContactValues

const FIELDS: { name: Exclude<Field, 'message' | 'website'>; label: string; type: string; autoComplete: string }[] = [
  { name: 'firstName', label: 'First Name', type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last Name', type: 'text', autoComplete: 'family-name' },
  { name: 'email', label: 'Email Address', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { name: 'company', label: 'Company', type: 'text', autoComplete: 'organization' },
  { name: 'title', label: 'Title', type: 'text', autoComplete: 'organization-title' },
]

const EMPTY: ContactValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  message: '',
  website: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(v: ContactValues): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  for (const f of FIELDS) {
    if (!v[f.name].trim()) errors[f.name] = `${f.label} is required`
  }
  if (!errors.email && !EMAIL_RE.test(v.email.trim())) errors.email = 'Enter a valid email address'
  return errors
}

export function ContactSection() {
  const [values, setValues] = useState<ContactValues>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')

  const set = (name: Field, value: string) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setStatus('sending')
    try {
      await submitContact(values)
      setStatus('sent')
      setValues(EMPTY)
    } catch (err) {
      setSubmitError((err as Error).message)
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="scroll-mt-6 bg-white py-16 lg:py-[100px]">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-4 sm:px-8 lg:grid-cols-[2fr_3fr] lg:gap-20">
        <div>
          <h2 className={SECTION_TITLE}>Contact us</h2>
          <div className="mt-10 flex flex-col gap-8">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-black/50">
                <Mail className="size-4" /> Email us
              </div>
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-lg font-medium text-black underline-offset-4 hover:text-brand hover:underline"
              >
                {CONTACT.email}
              </a>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-black/50">
                <Phone className="size-4" /> Call us
              </div>
              <p className="text-lg text-black">
                Phone:{' '}
                <a
                  href={CONTACT.phoneHref}
                  className="font-medium underline-offset-4 hover:text-brand hover:underline"
                >
                  {CONTACT.phoneLabel}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div id="contact-form" className="scroll-mt-6 rounded-xl bg-[#f9f9f9] p-6 sm:p-8">
          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle2 className="size-12 text-brand" />
              <p className="text-lg font-semibold text-black">
                Thank you! Your submission has been received!
              </p>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Send another message
              </Button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <Label htmlFor={`contact-${f.name}`}>
                    {f.label}
                    <span className="text-brand">*</span>
                  </Label>
                  <Input
                    id={`contact-${f.name}`}
                    name={f.name}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    maxLength={256}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    aria-invalid={!!errors[f.name]}
                    className="h-11 bg-white"
                  />
                  {errors[f.name] && <p className="text-sm text-destructive">{errors[f.name]}</p>}
                </div>
              ))}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="contact-message">Message / Comments</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  maxLength={5000}
                  rows={5}
                  value={values.message}
                  onChange={(e) => set('message', e.target.value)}
                  className="bg-white"
                />
              </div>
              {/* Honeypot: off-screen and out of the tab order, so only a bot fills it. */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </div>
              {status === 'error' && (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {submitError}
                </p>
              )}
              <Button
                type="submit"
                disabled={status === 'sending'}
                className="h-auto rounded-lg px-8 py-4 text-base font-semibold sm:col-span-2 sm:justify-self-start"
              >
                {status === 'sending' ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
