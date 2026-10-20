import { describe, expect, it } from 'vitest'
import { changedSomething, channelLabel, conversationLabel, optimisticMessage } from './assistant'

describe('assistant helpers', () => {
  it('names each channel', () => {
    expect(channelLabel('BOT')).toBe('Web')
    expect(channelLabel('SMS')).toBe('Text')
    expect(channelLabel('WHATSAPP')).toBe('WhatsApp')
  })

  it('labels a conversation by title, then channel + phone', () => {
    expect(conversationLabel({ title: 'March spending', channel: 'BOT', peer: null, attachmentId: null })).toBe(
      'March spending',
    )
    expect(conversationLabel({ title: null, channel: 'WHATSAPP', peer: '+15145550001', attachmentId: null })).toBe(
      'WhatsApp · +15145550001',
    )
    expect(conversationLabel({ title: null, channel: 'BOT', peer: null, attachmentId: 4 })).toBe('About an attachment')
    expect(conversationLabel({ title: ' ', channel: 'BOT', peer: null, attachmentId: null })).toBe('Chat')
  })

  it('only counts a successful action as a change', () => {
    expect(changedSomething({ actions: null })).toBe(false)
    expect(changedSomething({ actions: [{ tool: 'edit', ok: false, summary: 'x' }] })).toBe(false)
    expect(changedSomething({ actions: [{ tool: 'edit', ok: true, summary: 'x' }] })).toBe(true)
  })

  it('makes a negative-id user message for the optimistic bubble', () => {
    const m = optimisticMessage('hi', new Date('2026-10-20T10:00:00Z'))
    expect(m.id).toBeLessThan(0)
    expect(m).toMatchObject({ role: 'USER', channel: 'BOT', text: 'hi', createdAt: '2026-10-20T10:00:00.000Z' })
  })
})
