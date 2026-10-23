import { useState, type FormEvent } from 'react'
import { BookUser, Loader2, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import type { Contact } from '@/api/contacts'
import { PageHeader } from '@/components/Dashboard/PageHeader'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useContacts, useDeleteContact, useSaveContact } from '@/hooks/useContacts'
import { formatPhone } from '@/lib/portal-format'

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

/**
 * step12c: the Contacts tab — people the AI assistant calls or texts for the customer. The AI
 * adds them when the customer names someone ("call 514… and tell him…" → "what's his name?"),
 * so next time "call John" works. The customer can add, edit and remove them here too.
 */
export function ContactsPage() {
  const contacts = useContacts()
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)
  const [removing, setRemoving] = useState<Contact | null>(null)
  const list = contacts.data ?? []

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People the AI assistant can call or text for you. Ask it “call John and tell him…”."
        actions={
          <Button className="h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85" onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Add contact
          </Button>
        }
      />

      {contacts.error ? (
        <p className="text-sm text-destructive">{contacts.error.message}</p>
      ) : contacts.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !list.length ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-black/5">
          <BookUser className="mx-auto size-8 text-brand" />
          <p className="mt-3 font-medium text-[#0B1C2C]">No contacts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            When you ask the assistant to call or text someone, it asks their name and saves them here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Last reached</TableHead>
                <TableHead className="w-24 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4">
                    <p className="font-medium text-[#0B1C2C]">{c.name}</p>
                    {c.note && <p className="max-w-xs truncate text-xs text-muted-foreground">{c.note}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted-foreground" />
                        {formatPhone(c.phone)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        {c.email}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                    {fmtDate(c.lastContactedAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => setRemoving(c)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing && (
            <ContactForm
              key={editing === 'new' ? 'new' : editing.id}
              contact={editing === 'new' ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <RemoveDialog contact={removing} onClose={() => setRemoving(null)} />
    </>
  )
}

function ContactForm({ contact, onDone }: { contact: Contact | null; onDone: () => void }) {
  const save = useSaveContact()
  const [name, setName] = useState(contact?.name ?? '')
  const [phone, setPhone] = useState(contact?.phone ? formatPhone(contact.phone) : '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [note, setNote] = useState(contact?.note ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate(
      {
        id: contact?.id ?? null,
        input: {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          note: note.trim() || null,
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle>{contact ? 'Edit contact' : 'Add a contact'}</DialogTitle>
        <DialogDescription>The assistant uses the name to know who you mean.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            placeholder="(514) 555-1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-note">Note</Label>
          <Textarea
            id="contact-note"
            rows={2}
            maxLength={2000}
            placeholder="e.g. my landlord"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {save.error && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={save.isPending || !name.trim()} className="bg-brand text-white hover:bg-brand/85">
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

function RemoveDialog({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const remove = useDeleteContact()
  return (
    <Dialog open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {contact?.name}?</DialogTitle>
          <DialogDescription>
            The assistant will no longer know who they are. Calls and texts already made stay in your history.
          </DialogDescription>
        </DialogHeader>
        {remove.error && <p className="text-sm text-destructive">{remove.error.message}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => contact && remove.mutate(contact.id, { onSuccess: onClose })}
          >
            {remove.isPending && <Loader2 className="size-4 animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
