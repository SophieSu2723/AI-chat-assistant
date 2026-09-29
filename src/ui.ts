import { authorFor, type Message } from './fixtures'
import type { Copy, Lang } from './i18n'
import { extractDetails, type Details } from './matching'

export type ImportedMessage = Message & { senderName: string }
export type Person = { name: string; initials: string; color: string }
export type ConversationMessage = { id: string; mine: boolean; text: string; sentAt: string; simulated?: boolean }
export type Conversation = {
  id: string; groupId: string; sourceMessageId: string; participantId: string; participantName: string
  createdAt: string; unread: number; messages: ConversationMessage[]
}

const palette = ['#5d8ed5', '#ee7662', '#4da7a0', '#ba699b', '#e2a940', '#7558d9']
function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() || '群友' }
function importColor(name: string) { return palette[[...name].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % palette.length] }

// 头像、名字从应用数据读取，不由模型生成
export function personFor(message: Message): Person {
  const imported = message as ImportedMessage
  if (imported.senderName) return { name: imported.senderName, initials: initials(imported.senderName), color: importColor(imported.senderName) }
  const author = authorFor(message.senderId) ?? { name: message.senderId, initials: initials(message.senderId), color: palette[0] }
  return { name: author.name, initials: author.initials, color: author.color }
}
export const firstName = (name: string) => name.split(' ')[0]

const parts = (iso: string) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Shanghai' })
  .formatToParts(new Date(iso)).map(p => [p.type, p.value]))
export function shortTime(iso: string) { const p = parts(iso); return `${p.month}/${p.day} ${p.hour}:${p.minute}` }
export function shortDay(iso: string) { const p = parts(iso); return `${p.month}/${p.day}` }

export function detailTags(message: Message, t: Copy) {
  const d = extractDetails(message.text)
  return { details: d, day: d.day ? t.day[d.day] : null, place: d.place === 'airport' ? t.airport : d.place }
}

// 开场白只复述对方原文中写出的内容，不替用户编造时间或计划
export function openingFor(message: Message, lang: Lang, t: Copy) {
  const first = firstName(personFor(message).name)
  const { details, day, place } = detailTags(message, t)
  if (lang === 'zh') {
    if (place) return `嗨 ${first}，在群里看到你${day ?? ''}想去 ${place}，还需要${details.ride ? '搭车' : '同伴'}吗？`
    return `嗨 ${first}，在群里看到你发的这条需求，现在还需要吗？`
  }
  if (place) return `Hi ${first}, I saw your ${place} request in Campus Circle. Are you still looking for ${details.ride ? 'a ride' : 'company'}${day ? ` on ${day}` : ''}?`
  return `Hi ${first}, I saw your request in Campus Circle. Is it still open?`
}

// 模拟回复：演示中唯一的“对方”消息，界面上始终标注为模拟
export function simulatedReply(message: Message, lang: Lang) {
  if (message.id === 'm-107') return lang === 'zh' ? '还需要！下午 3 点左右我可以。' : 'Yes, still looking! Around 3pm works for me.'
  return lang === 'zh' ? '还需要，我们具体聊聊。' : 'Yes, it’s still open. Let’s sort out the details.'
}

export function requestTitle(message: Message, t: Copy) {
  const { day, place } = detailTags(message, t)
  if (place && day) return `${place} · ${day}`
  return place ?? (message.text.length > 22 ? `${message.text.slice(0, 22)}…` : message.text)
}

export type { Details }
