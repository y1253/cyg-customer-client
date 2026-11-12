import { useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { rereadableFile, type Attachment } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAttachmentActions } from '@/hooks/useAttachments'

/**
 * 2026-11-11 (user's request): every file of the list we could not read or link, read again
 * at once — on the error list (the paperclip's red total) and in Unsorted. Hidden when none.
 */
export function RereadAllFiles({ files }: { files: Attachment[] }) {
  const { retryAll } = useAttachmentActions()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const ids = files.filter(rereadableFile).map((a) => a.id)
  if (!ids.length && !note) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ids.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          disabled={retryAll.isPending}
          onClick={() => setOpen(true)}
        >
          {retryAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
          Read all again ({ids.length})
        </Button>
      )}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      {retryAll.error && <span className="text-xs text-destructive">{retryAll.error.message}</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Read {ids.length} file{ids.length === 1 ? '' : 's'} again?
            </DialogTitle>
            <DialogDescription>
              Every file here we could not read or link to a transaction is read again, and we look
              for its transaction once more. Files already linked are not touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button
              disabled={retryAll.isPending}
              onClick={() =>
                retryAll.mutate(ids, {
                  onSuccess: ({ queued }) => {
                    setOpen(false)
                    setNote(
                      queued
                        ? `${queued} file${queued === 1 ? ' is' : 's are'} being read again.`
                        : 'Nothing to read again right now.',
                    )
                  },
                })
              }
            >
              {retryAll.isPending ? 'Starting…' : 'Read all again'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
