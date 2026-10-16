import { describe, expect, it } from 'vitest'
import type { PortalCall, PortalEmail, PortalWhatsApp } from '@/api/portal'
import { clampSources, itemKey, matchesFilters, sourcesFor, type PortalItem } from './unified-inbox'

const email = (id: string, date: string, extra: Partial<PortalEmail> = {}): PortalItem => ({
  kind: 'email',
  sent: false,
  data: {
    id,
    threadId: id,
    subject: 'Invoice',
    from: 'Bob <bob@x.com>',
    to: 'me@x.com',
    date,
    snippet: '',
    isRead: true,
    isCompleted: false,
    hasAttachments: false,
    ...extra,
  },
})

const wa = (id: string, at: string, extra: Partial<PortalWhatsApp> = {}): PortalItem => ({
  kind: 'whatsapp',
  data: {
    id,
    messageId: 1,
    direction: 'inbound',
    peer: '+15145551234',
    peerName: null,
    type: 'text',
    body: 'hello there',
    isVoice: false,
    durationSec: null,
    transcript: null,
    hasMedia: false,
    mediaStatus: null,
    mimeType: null,
    filename: null,
    at,
    isRead: false,
    isCompleted: false,
    ...extra,
  },
})

const call = (id: string, at: string, extra: Partial<PortalCall> = {}): PortalItem => ({
  kind: 'call',
  data: {
    id,
    sid: id,
    kind: 'call',
    direction: 'inbound',
    counterparty: '+15145550000',
    counterpartyName: 'Alice',
    at,
    isRead: true,
    isCompleted: true,
    outcome: 'answered',
    durationSec: 30,
    hasRecording: false,
    hasVoicemail: false,
    ...extra,
  },
})

describe('clampSources', () => {
  it('merges newest first when every source is exhausted', () => {
    const r = clampSources([
      { kind: 'email', hasNext: false, items: [email('e1', '2026-10-01T10:00:00Z')] },
      { kind: 'whatsapp', hasNext: false, items: [wa('w1', '2026-10-03T10:00:00Z'), wa('w2', '2026-09-01T10:00:00Z')] },
    ])
    expect(r.items.map(itemKey)).toEqual(['whatsapp:w1', 'email:e1', 'whatsapp:w2'])
    expect(r.holdingBack).toBeNull()
  })

  it('cuts at the source that still has more and names it', () => {
    const r = clampSources([
      { kind: 'email', hasNext: false, items: [email('e1', '2026-09-01T10:00:00Z')] },
      // WhatsApp has only loaded back to Oct 2; an email from Sept must wait.
      { kind: 'whatsapp', hasNext: true, items: [wa('w1', '2026-10-05T10:00:00Z'), wa('w2', '2026-10-02T10:00:00Z')] },
    ])
    expect(r.items.map(itemKey)).toEqual(['whatsapp:w1', 'whatsapp:w2'])
    expect(r.holdingBack).toBe('whatsapp')
  })

  it('pages the source whose oldest loaded row is newest; ties keep the first', () => {
    const r = clampSources([
      { kind: 'email', hasNext: true, items: [email('e1', '2026-10-02T10:00:00Z')] },
      { kind: 'whatsapp', hasNext: true, items: [wa('w1', '2026-10-02T10:00:00Z')] },
    ])
    expect(r.holdingBack).toBe('email')
  })
})

describe('matchesFilters', () => {
  it('filters by type', () => {
    expect(matchesFilters(wa('w', '2026-10-01'), 'whatsapp', 'all', '')).toBe(true)
    expect(matchesFilters(wa('w', '2026-10-01'), 'email', 'all', '')).toBe(false)
    expect(matchesFilters(call('c', '2026-10-01'), 'voicemail', 'all', '')).toBe(false)
    expect(matchesFilters(call('c', '2026-10-01', { hasVoicemail: true }), 'voicemail', 'all', '')).toBe(true)
    expect(matchesFilters({ ...email('e', '2026-10-01'), sent: true } as PortalItem, 'email', 'all', '')).toBe(false)
    expect(matchesFilters({ ...email('e', '2026-10-01'), sent: true } as PortalItem, 'sent', 'all', '')).toBe(true)
  })

  it('filters by status', () => {
    expect(matchesFilters(wa('w', '2026-10-01'), 'all', 'unread', '')).toBe(true)
    expect(matchesFilters(call('c', '2026-10-01'), 'all', 'unread', '')).toBe(false)
    expect(matchesFilters(call('c', '2026-10-01'), 'all', 'uncompleted', '')).toBe(false)
  })

  it('searches text and phone digits', () => {
    expect(matchesFilters(email('e', '2026-10-01'), 'all', 'all', 'invoice')).toBe(true)
    expect(matchesFilters(email('e', '2026-10-01'), 'all', 'all', 'receipt')).toBe(false)
    expect(matchesFilters(wa('w', '2026-10-01'), 'all', 'all', '514 555')).toBe(true)
    expect(matchesFilters(call('c', '2026-10-01'), 'all', 'all', 'alice')).toBe(true)
  })
})

describe('sourcesFor', () => {
  it('fetches only what the type filter can show', () => {
    expect(sourcesFor('whatsapp')).toEqual({ email: false, chat: false, phone: false, whatsapp: true })
    expect(sourcesFor('voicemail').phone).toBe(true)
    expect(sourcesFor('all')).toEqual({ email: true, chat: true, phone: true, whatsapp: true })
  })
})
