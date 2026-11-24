import { Loader2, Paperclip } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { currentLocale } from '@/i18n'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAttachmentEmail } from '@/hooks/useNameFiles'
import { useClosingValue } from '@/hooks/useClosingValue'

/**
 * step2 (2026-11-11): "View full email" — the email a file came in to our inbox: who sent it,
 * to whom, when, its words and every file that came with it. The email's own HTML is shown in
 * a sandboxed frame (no scripts, no forms, no links that run here).
 */
export function EmailDialog({
  attachmentId,
  onOpenChange,
  onOpenFile,
}: {
  attachmentId: number | null
  onOpenChange: (open: boolean) => void
  /** Open another file of the same email (its folder entry). */
  onOpenFile?: (id: number) => void
}) {
  const { t } = useTranslation(['ledger', 'common'])
  const shown = useClosingValue(attachmentId)
  const email = useAttachmentEmail(shown)
  const e = email.data
  return (
    <Dialog open={attachmentId != null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{e?.subject || t('email.title')}</DialogTitle>
          <DialogDescription>
            {e ? (
              <>
                <Trans
                  t={t}
                  i18nKey="email.from"
                  values={{ from: e.from ?? t('email.unknown') }}
                  components={{ b: <span className="font-medium text-foreground" /> }}
                />
                {e.to && <> · {t('email.to', { to: e.to })}</>}
                {e.receivedAt && <> · {new Date(e.receivedAt).toLocaleString(currentLocale())}</>}
              </>
            ) : (
              t('common:status.loading')
            )}
          </DialogDescription>
        </DialogHeader>
        {email.isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        {email.error && <p className="text-sm text-destructive">{email.error.message}</p>}
        {e && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {e.partial && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t('email.partial')}
              </p>
            )}
            {e.html ? (
              <iframe
                title={t('email.title')}
                sandbox=""
                srcDoc={e.html}
                className="h-[55vh] w-full rounded-lg bg-white ring-1 ring-black/10"
              />
            ) : (
              <pre className="rounded-lg bg-muted/40 p-3 font-sans text-sm whitespace-pre-wrap text-[#0B1C2C]">
                {e.text || t('email.noText')}
              </pre>
            )}
            {e.files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {e.files.map((f) =>
                  onOpenFile ? (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onOpenFile(f.id)}
                      className="inline-flex max-w-64 items-center gap-1.5 truncate rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/20"
                    >
                      <Paperclip className="size-3.5 shrink-0" />
                      <span className="truncate">{f.filename}</span>
                    </button>
                  ) : (
                    <span
                      key={f.id}
                      className="inline-flex max-w-64 items-center gap-1.5 truncate rounded-lg bg-muted px-2.5 py-1 text-xs"
                    >
                      <Paperclip className="size-3.5 shrink-0" />
                      <span className="truncate">{f.filename}</span>
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
