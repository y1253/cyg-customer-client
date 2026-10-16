import { useState } from 'react'
import { Mail, MessageCircle, MessageSquare, Phone, PlugZap } from 'lucide-react'
import type { PortalOverview } from '@/api/portal'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatList, EmailList, PhoneList, WhatsAppList } from './ChannelLists'
import type { Selection } from './portal-types'
import { ThreadSheet } from './ThreadSheet'

/**
 * Every channel our team handles for this business, one tab each, read-only: each
 * message carries a Read / Completed tag and nothing here can change either.
 */
export function CommunicationsView({ companyId, overview }: { companyId: number; overview: PortalOverview }) {
  const [selection, setSelection] = useState<Selection | null>(null)

  const channels = [
    overview.mailbox && { key: 'email', label: 'Email', icon: Mail },
    overview.mailbox && {
      key: 'chat',
      label: overview.mailbox.provider === 'MICROSOFT' ? 'Teams' : 'Chat',
      icon: MessageSquare,
    },
    overview.supportNumber && { key: 'phone', label: 'Calls & texts', icon: Phone },
    overview.whatsappNumber && { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Mail }[]

  if (channels.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <PlugZap className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">
          No mailbox, phone line or WhatsApp is connected to this business yet.
        </p>
      </Card>
    )
  }

  return (
    <>
      <Tabs defaultValue={channels[0].key} className="gap-4">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b">
          {channels.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="flex-none px-3">
              <Icon /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {channels.some((c) => c.key === 'email') && (
          <TabsContent value="email">
            {overview.mailbox && (
              <p className="mb-3 text-xs text-muted-foreground">{overview.mailbox.emailAddress}</p>
            )}
            <EmailList companyId={companyId} onOpen={setSelection} />
          </TabsContent>
        )}
        {channels.some((c) => c.key === 'chat') && (
          <TabsContent value="chat">
            <ChatList companyId={companyId} onOpen={setSelection} />
          </TabsContent>
        )}
        {channels.some((c) => c.key === 'phone') && (
          <TabsContent value="phone">
            <p className="mb-3 text-xs text-muted-foreground">Your line: {overview.supportNumber}</p>
            <PhoneList companyId={companyId} onOpen={setSelection} />
          </TabsContent>
        )}
        {channels.some((c) => c.key === 'whatsapp') && (
          <TabsContent value="whatsapp">
            <p className="mb-3 text-xs text-muted-foreground">WhatsApp: {overview.whatsappNumber}</p>
            <WhatsAppList companyId={companyId} onOpen={setSelection} />
          </TabsContent>
        )}
      </Tabs>
      <ThreadSheet companyId={companyId} selection={selection} onClose={() => setSelection(null)} />
    </>
  )
}
