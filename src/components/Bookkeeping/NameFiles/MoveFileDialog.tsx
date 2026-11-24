import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Attachment } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useClosingValue } from '@/hooks/useClosingValue'
import { useNameFolders, usePlaceAttachment } from '@/hooks/useNameFiles'
import { fileTitle, folderPath, nameKey, UNSORTED } from '@/lib/name-files'
import { sortByLabel } from '@/lib/sort'
import { cn } from '@/lib/utils'
import { NamePicker } from '../NamePicker'

/**
 * step2 (2026-11-11): move a file to another name (typing a new name makes it) and/or into
 * one of that name's subfolders. The file is still matched to its transaction as before —
 * this only says where it is filed.
 */
export function MoveFileDialog({
  attachment,
  onOpenChange,
}: {
  attachment: Attachment | null
  onOpenChange: (open: boolean) => void
}) {
  const shown = useClosingValue(attachment)
  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {shown && <Body key={shown.id} a={shown} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Body({ a, onDone }: { a: Attachment; onDone: () => void }) {
  const { t } = useTranslation('ledger')
  const [name, setName] = useState(a.name ?? '')
  const [folderId, setFolderId] = useState<number | null>(a.folderId)
  const folders = useNameFolders()
  const place = usePlaceAttachment()
  const key = name.trim() ? nameKey(name) : UNSORTED
  const sameName = key === (a.name ? nameKey(a.name) : UNSORTED)
  const choices = (folders.data ?? []).filter((f) => f.nameKey === key)
  const pathOf = (id: number) =>
    folderPath(folders.data ?? [], id)
      .map((f) => f.title)
      .join(' / ')

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        place.mutate(
          {
            id: a.id,
            ...(sameName ? {} : { name: name.trim() }),
            folderId: choices.some((f) => f.id === folderId) ? folderId : null,
          },
          { onSuccess: onDone },
        )
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('move.title', { name: fileTitle(a) })}</DialogTitle>
        <DialogDescription>{t('move.description')}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="move-name">{t('columns.name')}</Label>
        <NamePicker id="move-name" value={name} onChange={setName} placeholder={t('move.namePlaceholder')} autoFocus />
      </div>
      {choices.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('move.folder')}</Label>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {[
              { id: null as number | null, label: t('move.top', { name: name.trim() || t('files.unsorted') }) },
              // step12 (2026-11-22): A–Z by the folder's whole path.
              ...sortByLabel(
                choices.map((f) => ({ id: f.id, label: pathOf(f.id) })),
                (c) => c.label,
              ),
            ].map(
              (c) => (
                <button
                  key={c.id ?? 'top'}
                  type="button"
                  onClick={() => setFolderId(c.id)}
                  className={cn(
                    'truncate rounded-lg px-3 py-1.5 text-left text-sm ring-1',
                    (folderId ?? null) === c.id ? 'bg-brand/10 font-medium text-[#0B1C2C] ring-brand/30' : 'ring-black/5 hover:bg-muted',
                  )}
                >
                  {c.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
      {place.error && <p className="text-sm text-destructive">{place.error.message}</p>}
      <DialogFooter>
        <Button type="submit" disabled={place.isPending} className="bg-brand text-white hover:bg-brand/85">
          {t('move.move')}
        </Button>
      </DialogFooter>
    </form>
  )
}
