import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Check,
  Copy,
  Laptop,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  QrCode,
  Send,
} from 'lucide-react'
import { ATTACHMENT_ACCEPT, isAcceptedAttachment, MAX_ATTACHMENT_BYTES } from '@/api/attachments'
import { FilesDialog, type FilesTarget } from '@/components/Bookkeeping/NameFiles/FilesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/context/AuthContext'
import { BookScopeProvider } from '@/context/BookScopeContext'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useAttachments, useUploadAttachments } from '@/hooks/useAttachments'
import { useIntake } from '@/hooks/useIntake'
import { usePhoneUploadLink, useWelcomeEmail } from '@/hooks/useNameFiles'
import { fmtPhone } from '@/lib/attachment-labels'
import { OPEN_TRANSACTION_EVENT, useFloatingChatState } from '@/lib/floating-chat'
import { BUCKET_LABEL, totalCounts } from '@/lib/name-files'
import { cn } from '@/lib/utils'

/**
 * step2 (2026-11-11): the paperclip beside the AI bubble, on every dashboard page. Its badge
 * is the book's files that need attention; hovering (or clicking) it shows the three counts —
 * each opens that list — and every way to send documents in: text, WhatsApp, email (with a
 * welcome email to any address), this computer, or a phone by QR code. Like the chat it sits
 * outside the book scope and works on the book the page has open, else the default one.
 */
export function DocumentsButton() {
  const { scope } = useFloatingChatState()
  return (
    <BookScopeProvider
      key={scope ? `${scope.bookId}:${scope.companyId}` : 'default'}
      bookId={scope?.bookId ?? null}
      companyId={scope?.companyId ?? null}
    >
      <Inner />
    </BookScopeProvider>
  )
}

function Inner() {
  const attachments = useAttachments()
  const counts = useMemo(() => totalCounts(attachments.data ?? []), [attachments.data])
  const [card, setCard] = useState(false)
  const [list, setList] = useState<FilesTarget | null>(null)
  // Beside the AI bubble when it shows; in the corner itself when the assistant is off.
  const beside = useAssistantEnabled()

  return (
    <>
      <Popover open={card} onOpenChange={setCard}>
        <PopoverTrigger
          openOnHover
          delay={120}
          closeDelay={250}
          aria-label="Your documents, and how to send them"
          className={cn(
            'fixed z-40 flex size-12 items-center justify-center rounded-full bg-white text-[#0B1C2C] shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:outline-none',
            beside ? 'right-[5.5rem] bottom-6 sm:right-[6.5rem] sm:bottom-8' : 'right-4 bottom-4 sm:right-6 sm:bottom-6',
            card && 'scale-105',
          )}
        >
          <Paperclip className="size-5" />
          {counts.error > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 font-semibold text-white tabular-nums ring-2 ring-white">
              {counts.error > 99 ? '99+' : counts.error}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={10} className="w-[22rem] gap-0 overflow-hidden rounded-xl p-0">
          <div className="rounded-t-xl bg-gradient-to-br from-[#0B1C2C] to-[#12384a] px-4 py-3 text-white">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Paperclip className="size-4 text-[#47c4bc]" /> Your documents
            </p>
            <p className="text-xs text-white/70">Every file is kept under its name on the Names tab.</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {(
              [
                ['RELATED', counts.related, 'text-emerald-700 bg-emerald-50 ring-emerald-600/20'],
                ['DOCUMENT', counts.document, 'text-slate-700 bg-slate-50 ring-slate-500/20'],
                ['ERROR', counts.error, 'text-red-700 bg-red-50 ring-red-600/25'],
              ] as const
            ).map(([bucket, n, tone]) => (
              <button
                key={bucket}
                type="button"
                onClick={() => {
                  setCard(false)
                  setList({ kind: 'bucket', bucket })
                }}
                className={cn('flex flex-col items-start rounded-lg px-2.5 py-2 text-left ring-1 hover:brightness-95', tone)}
              >
                <span className="text-lg leading-none font-bold tabular-nums">{n}</span>
                <span className="mt-1 text-[11px] leading-tight font-medium">{BUCKET_LABEL[bucket]}</span>
              </button>
            ))}
          </div>
          {counts.reading > 0 && (
            <p className="flex items-center gap-1.5 px-3 pb-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Reading {counts.reading} file{counts.reading === 1 ? '' : 's'}…
            </p>
          )}
          <SendWays />
        </PopoverContent>
      </Popover>
      <FilesDialog
        target={list}
        onOpenChange={(o) => !o && setList(null)}
        onViewTransaction={(id) => window.dispatchEvent(new CustomEvent(OPEN_TRANSACTION_EVENT, { detail: id }))}
      />
    </>
  )
}

/** Every way to send documents in. */
function SendWays() {
  const { customer } = useAuth()
  const intake = useIntake()
  const number = intake.data?.numbers[0]
  const whatsapp = !!number && (intake.data?.whatsapp ?? []).includes(number)
  const email = intake.data?.email ?? null
  const [open, setOpen] = useState<'email' | 'qr' | null>(null)

  return (
    <div className="flex flex-col gap-1 border-t p-2">
      <p className="px-1 pt-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Send us documents
      </p>
      {number && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/50 px-2.5 py-2">
          <span className="mr-auto text-sm font-semibold text-[#0B1C2C] tabular-nums">{fmtPhone(number)}</span>
          <a
            href={`sms:${number}`}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand ring-1 ring-brand/20 hover:bg-brand/5"
          >
            <MessageSquareText className="size-3.5" /> Text
          </a>
          {whatsapp && (
            <a
              href={`https://wa.me/${number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          )}
        </div>
      )}
      {email && (
        <Way
          icon={<Mail className="size-4" />}
          title={`Email ${email}`}
          hint="Forward receipts, invoices, statements, contracts"
          active={open === 'email'}
          onClick={() => setOpen(open === 'email' ? null : 'email')}
        />
      )}
      {open === 'email' && email && <EmailPanel inbox={email} defaultTo={customer?.email ?? ''} />}
      <BrowseWay />
      <Way
        icon={<QrCode className="size-4" />}
        title="From your phone"
        hint="Scan a QR code and take photos"
        active={open === 'qr'}
        onClick={() => setOpen(open === 'qr' ? null : 'qr')}
      />
      {open === 'qr' && <QrPanel />}
    </div>
  )
}

function Way({
  icon,
  title,
  hint,
  onClick,
  active,
  busy,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  active?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted',
        active && 'bg-muted',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#0B1C2C]">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

/** Copy the inbox address, or have it email a welcome to any address (theirs by default). */
function EmailPanel({ inbox, defaultTo }: { inbox: string; defaultTo: string }) {
  const [to, setTo] = useState(defaultTo)
  const [copied, setCopied] = useState(false)
  const welcome = useWelcomeEmail()
  return (
    <div className="mx-1 flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5">
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(inbox).then(
            () => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            },
            () => undefined,
          )
        }
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy the address'}
      </button>
      <p className="text-xs text-muted-foreground">
        Send a welcome email from {inbox} — reply to it or forward documents to it, from that address:
      </p>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (to.trim()) welcome.mutate(to.trim())
        }}
      >
        <Input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="name@example.com"
          className="h-8 bg-white"
        />
        <Button
          type="submit"
          size="sm"
          disabled={welcome.isPending || !to.trim()}
          className="shrink-0 gap-1 bg-brand text-white hover:bg-brand/85"
        >
          {welcome.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
        </Button>
      </form>
      {(welcome.data || welcome.error) && (
        <p
          role="status"
          className={cn(
            'rounded-lg px-2 py-1 text-xs',
            welcome.data?.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-destructive',
          )}
        >
          {welcome.error?.message ?? welcome.data?.message}
        </p>
      )}
    </div>
  )
}

/** Files from this computer — Unsorted first, the AI files each under its name. */
function BrowseWay() {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAttachments()
  const [note, setNote] = useState<string | null>(null)
  return (
    <>
      <Way
        icon={<Laptop className="size-4" />}
        title={upload.isPending ? `Uploading… ${Math.round(upload.progress * 100)}%` : 'From this computer'}
        hint={note ?? 'Photos, PDFs, spreadsheets, voice notes'}
        busy={upload.isPending}
        onClick={() => input.current?.click()}
      />
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const all = Array.from(e.target.files ?? [])
          e.target.value = ''
          const ok = all.filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
          if (!ok.length) return setNote(all.length ? 'Those files cannot be read here.' : null)
          upload.mutate(
            { files: ok },
            {
              onSuccess: () => setNote(`${ok.length} file${ok.length === 1 ? '' : 's'} added — we're reading them`),
              onError: (err) => setNote(err.message),
            },
          )
        }}
      />
    </>
  )
}

/** A QR code to a 30-minute upload page; counts what arrives while it is open. */
function QrPanel() {
  const link = usePhoneUploadLink()
  const attachments = useAttachments()
  const [qr, setQr] = useState<string | null>(null)
  // The newest file when the code was shown — anything newer came from the phone (or elsewhere).
  const [lastId] = useState(() => Math.max(0, ...(attachments.data ?? []).map((a) => a.id)))
  const { refetch } = attachments
  const { mutate } = link

  useEffect(() => {
    mutate({}, {
      onSuccess: (r) =>
        QRCode.toDataURL(r.url, { margin: 1, width: 360, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(null)),
    })
  }, [mutate])
  // While the code is shown, look for new files every few seconds.
  useEffect(() => {
    const t = setInterval(() => void refetch(), 3000)
    return () => clearInterval(t)
  }, [refetch])

  const received = (attachments.data ?? []).filter((a) => a.id > lastId).length
  return (
    <div className="mx-1 flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-3 text-center">
      {link.isPending || (!qr && !link.error) ? (
        <Loader2 className="my-16 size-6 animate-spin text-muted-foreground" />
      ) : link.error ? (
        <p className="text-xs text-destructive">{link.error.message}</p>
      ) : (
        <img src={qr!} alt="QR code to send files from your phone" className="size-44 rounded-lg bg-white p-1.5" />
      )}
      <p className="text-xs text-muted-foreground">
        Scan with your phone's camera, then take photos or pick files. The code works for 30 minutes.
      </p>
      {received > 0 && (
        <p className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          {received} file{received === 1 ? '' : 's'} received
        </p>
      )}
    </div>
  )
}
