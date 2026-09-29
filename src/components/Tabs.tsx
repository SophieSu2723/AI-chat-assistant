import type { Message } from '../fixtures'
import type { Copy, Lang } from '../i18n'
import { CARDS, cardStatus, publishedClaims, type CardState, type KnowledgeCardDef } from '../knowledge'
import type { MessageClass } from '../matching'
import { firstName, personFor, requestTitle, shortDay, shortTime, type Conversation } from '../ui'
import { Avatar } from './Avatar'

type ChatsProps = { conversations: Conversation[]; requestFor: (id: string) => Message | undefined; t: Copy; onOpen: (c: Conversation) => void }

export function ChatsTab({ conversations, requestFor, t, onOpen }: ChatsProps) {
  const sorted = [...conversations].sort((a, b) => +new Date(b.messages.at(-1)?.sentAt ?? b.createdAt) - +new Date(a.messages.at(-1)?.sentAt ?? a.createdAt))
  return (
    <div className="tab-body">
      {sorted.length === 0 && <div className="empty-frame"><h3>{t.chatsEmptyT}</h3><p>{t.chatsEmpty}</p></div>}
      {sorted.map(c => {
        const request = requestFor(c.sourceMessageId)
        if (!request) return null
        const person = personFor(request)
        const last = c.messages.at(-1)
        const who = last?.mine ? t.you : last?.simulated ? t.simName(firstName(person.name)) : firstName(person.name)
        return (
          <button className="frame chat-card" key={c.id} onClick={() => onOpen(c)}>
            <Avatar person={person} />
            <span className="chat-card-body">
              <span className="chat-card-top"><span className="chat-card-title">{requestTitle(request, t)}</span><span className="muted-sm">{last ? shortTime(last.sentAt).split(' ')[1] : ''}</span></span>
              <span className="muted-sm">{t.withName(person.name)}</span>
              {last && <span className="chat-card-last">{who}{t.sep}{last.text}</span>}
              <span className="tags"><span className="tag tag-accent">{t.open}</span>{c.unread > 0 && <span className="tag tag-neutral">{t.newSim(c.unread)}</span>}</span>
            </span>
          </button>
        )
      })}
      <p className="tab-note center">{t.chatsNote}</p>
    </div>
  )
}

type KnowProps = {
  t: Copy; lang: Lang; classes: Record<string, MessageClass>; cardState: (id: string) => CardState
  unanswered: { topic: Record<Lang, string>; messages: Message[] }[]; onOpen: (card: KnowledgeCardDef) => void
}

export function KnowledgeTab({ t, lang, classes, cardState, unanswered, onOpen }: KnowProps) {
  return (
    <div className="tab-body">
      <div className="kicker">{t.kGroup}</div>
      {CARDS.map(card => {
        const state = cardState(card.id)
        const review = cardStatus(card, state, classes) === 'needs-review'
        return (
          <button className="frame kc-row" key={card.id} onClick={() => onOpen(card)}>
            <span className="kc-row-top"><span className="kicker">{card.code} · v{state.version}</span>
              <span className={`tag ${review ? 'tag-review' : 'tag-accent'}`}>{review ? t.stReview : t.stPublished}</span></span>
            <span className="kc-row-q">{card.question[lang]}</span>
            <span className="muted-sm">{publishedClaims(card, state).length} {t.claimsWord} · {t.sources} {card.sourceRange}</span>
          </button>
        )
      })}
      {unanswered.length > 0 && <>
        <div className="kicker spaced">{t.kUnanswered}</div>
        {unanswered.map(u => (
          <div className="empty-frame unanswered" key={u.topic.en}>
            <b>{u.topic[lang]}</b>
            <p>{t.unansweredMeta(u.messages.length, u.messages.map(m => `${firstName(personFor(m).name)} ${shortDay(m.sentAt)}`).join(lang === 'zh' ? '、' : ', '))}</p>
            <p>{t.printNote}</p>
          </div>
        ))}
      </>}
      <p className="tab-note">{t.kNote}</p>
    </div>
  )
}
