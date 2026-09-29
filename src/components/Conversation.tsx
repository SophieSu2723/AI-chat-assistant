import { useEffect, useRef, useState } from 'react'
import type { Message } from '../fixtures'
import type { Copy } from '../i18n'
import { Lock } from '../icons'
import { detailTags, firstName, personFor, shortTime, type Conversation } from '../ui'
import { Avatar } from './Avatar'

type DraftProps = { request: Message; t: Copy; opening: string; onOpening: (value: string) => void; onCancel: () => void; onSend: () => void }

// 发送前的开场白草稿：此时不创建对话，也不通知对方
export function DraftScreen({ request, t, opening, onOpening, onCancel, onSend }: DraftProps) {
  const person = personFor(request)
  const name = firstName(person.name)
  const { details } = detailTags(request, t)
  return (
    <main className="screen">
      <header className="chat-header">
        <button className="back" onClick={onCancel} aria-label={t.back}>‹</button>
        <div><h1>{t.draftTitle(person.name)}</h1><p>{t.draftSub}</p></div>
      </header>
      <div className="draft-body">
        <div className="replying">
          <div className="kicker">{t.replyingTo} · {shortTime(request.sentAt)} · Campus Circle</div>
          <p>{request.text}</p>
        </div>
        <div className="frame opening">
          <label className="kicker accent" htmlFor="opening-message">{t.opening}</label>
          <textarea id="opening-message" value={opening} onChange={e => onOpening(e.target.value)} />
          <div className="chips">
            {!details.hasTime && <button className="tag tag-outline chip" onClick={() => onOpening(opening + t.chipTimeText)}>{t.chipTime}</button>}
            {details.ride && <button className="tag tag-outline chip" onClick={() => onOpening(opening + t.chipPickupText)}>{t.chipPickup}</button>}
          </div>
        </div>
        <div className="lock-note"><Lock /><p>{t.lockNote(name)}</p></div>
      </div>
      <footer className="draft-foot">
        <button className="btn btn-secondary" onClick={onCancel}>{t.cancel}</button>
        <button className="send-wide" onClick={onSend} disabled={!opening.trim()}>{t.sendTo(name)}</button>
      </footer>
    </main>
  )
}

type ChatProps = { conversation: Conversation; request: Message; t: Copy; typing: boolean; onBack: () => void; onSource: () => void; onSend: (text: string) => void }

export function ChatScreen({ conversation, request, t, typing, onBack, onSource, onSend }: ChatProps) {
  const [text, setText] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const person = personFor(request)
  const { details, day, place } = detailTags(request, t)
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }) }, [conversation.messages.length, typing])
  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText('') }
  return (
    <main className="screen">
      <header className="chat-header">
        <button className="back" onClick={onBack} aria-label={t.back}>‹</button>
        <div><h1>{person.name}</h1><p>{t.tempChat}</p></div>
        <span className="menu" aria-hidden="true">•••</span>
      </header>
      <button className="request-pin" onClick={onSource}>
        <span className="kicker pin-kicker"><span>{t.aboutReq} · Campus Circle</span><span>{shortTime(request.sentAt)}</span></span>
        <span className="pin-text">{request.text}</span>
        <span className="tags">
          {day && <span className="tag tag-accent">{day}</span>}
          {place && <span className="tag tag-accent">{place}</span>}
          {!details.hasTime && <span className="tag tag-neutral">{t.tagNoTime}</span>}
          <span className="tag tag-outline">{t.tagUnknown}</span>
        </span>
      </button>
      <div className="chat-thread" ref={threadRef}>
        <p className="private-label">{t.notInGroup}</p>
        {conversation.messages.map(m => m.mine ? (
          <div className="bubble-row mine" key={m.id}><Avatar person={{ initials: t.meIni, color: '#7558d9' }} /><div className="bubble">{m.text}</div></div>
        ) : (
          <div className="bubble-row" key={m.id}>
            <Avatar person={person} />
            <div className="bubble-col"><div className="bubble">{m.text}</div>{m.simulated && <div className="sim-label">{t.simulated}</div>}</div>
          </div>
        ))}
        {typing && <p className="typing">{t.typing(firstName(person.name))}</p>}
      </div>
      <footer className="composer-wrap">
        <div className="composer">
          <span className="plus" aria-hidden="true">＋</span>
          <textarea aria-label={t.placeholder} placeholder={t.placeholder} value={text} onChange={e => setText(e.target.value)} />
          <button className="send" onClick={send} disabled={!text.trim()}>{t.send}</button>
        </div>
      </footer>
    </main>
  )
}
