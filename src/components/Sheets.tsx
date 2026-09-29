import { messages as fixtureMessages, type Message } from '../fixtures'
import type { Copy, Lang } from '../i18n'
import { AlertTriangle, ChevronLeft, Close } from '../icons'
import { cardForAnswer, cardStatus, cardSummary, type CardState, type KnowledgeCardDef } from '../knowledge'
import type { Match, MessageClass, ThreadRole } from '../matching'
import { detailTags, personFor, shortDay, shortTime, type Conversation } from '../ui'
import { Avatar } from './Avatar'

export type SourceView = { thread: Message[]; highlightId: string | null; roles: Record<string, ThreadRole> }

type ResultProps = {
  match: Match; t: Copy; lang: Lang; classes: Record<string, MessageClass>
  conversations: Conversation[]; cardState: (id: string) => CardState
  showClosed: boolean; onToggleClosed: () => void; onClose: () => void
  onTaskSource: (message: Message) => void; onAnswerSource: (answer: Message, card?: KnowledgeCardDef) => void
  onChat: (message: Message) => void; onOpenCard: (card: KnowledgeCardDef) => void
}

export function ResultSheet({ match, t, lang, classes, conversations, cardState, showClosed, onToggleClosed, onClose, onTaskSource, onAnswerSource, onChat, onOpenCard }: ResultProps) {
  const mixed = match.route === 'mixed'
  const title = mixed ? t.resMixed : match.task ? t.resTask : t.resKnow
  const answer = match.knowledge?.answer
  const card = answer ? cardForAnswer(answer.id) : undefined
  return (
    <div className="overlay" style={{ zIndex: 5 }}>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="handle" />
        <div className="sheet-head">
          <div><div className="kicker accent">{t.private}</div><h2 className="sheet-title">{title}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}><Close /></button>
        </div>

        {match.task && <>
          {mixed && <div className="kicker section-label">01 · {t.secTask}</div>}
          {match.task.actionable.slice(0, 3).map(message => {
            const person = personFor(message)
            const { details, day, place } = detailTags(message, t)
            const existing = conversations.some(c => c.sourceMessageId === message.id && c.participantId === message.senderId)
            return (
              <article className="frame result" key={message.id}>
                <div className="result-who"><Avatar person={person} size={28} /><span><b>{person.name}</b> · {shortTime(message.sentAt)}</span></div>
                <p className="result-text">{message.text}</p>
                <div className="tags">
                  {day && <span className="tag tag-accent">{day}</span>}
                  {place && <span className="tag tag-accent">{place}</span>}
                  {!details.hasTime && <span className="tag tag-neutral">{t.tagNoTime}</span>}
                </div>
                <p className="check-still">{t.checkStill}</p>
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={() => onTaskSource(message)}>{t.viewSource}</button>
                  <button className="btn btn-primary" onClick={() => onChat(message)}>{existing ? t.continueChat : t.chatAbout}</button>
                </div>
              </article>
            )
          })}
          {match.task.closed.length > 0 && <>
            <button className="link-btn" onClick={onToggleClosed} aria-expanded={showClosed}>{showClosed ? t.closedHide : t.closedShow(match.task.closed.length)}</button>
            {showClosed && match.task.closed.map(({ message, state }) => (
              <button className="closed-row" key={message.id} onClick={() => onTaskSource(message)}>
                <span className="closed-meta"><b>{personFor(message).name}</b> · {shortTime(message.sentAt)} · {t.closedState[state]}</span>
                <span className="closed-text">{message.text}</span>
              </button>
            ))}
          </>}
        </>}

        {answer && <>
          {mixed && <div className="kicker section-label">02 · {t.secKnow}</div>}
          {card ? <KnowledgeCompact card={card} state={cardState(card.id)} t={t} lang={lang} classes={classes}
            onSource={() => onAnswerSource(answer, card)} onOpen={() => onOpenCard(card)} /> : (
            <article className="frame result">
              <div className="result-who"><Avatar person={personFor(answer)} size={28} /><span><b>{personFor(answer).name}</b> · {shortTime(answer.sentAt)}</span></div>
              <p className="result-text">{answer.text}</p>
              <div className="btn-row"><button className="btn btn-secondary" onClick={() => onAnswerSource(answer)}>{t.viewSource}</button></div>
            </article>
          )}
        </>}
        <p className="sheet-note">{t.sheetNote}</p>
      </section>
    </div>
  )
}

type CompactProps = { card: KnowledgeCardDef; state: CardState; t: Copy; lang: Lang; classes: Record<string, MessageClass>; onSource: () => void; onOpen: () => void }
function KnowledgeCompact({ card, state, t, lang, classes, onSource, onOpen }: CompactProps) {
  const review = cardStatus(card, state, classes) === 'needs-review'
  const dots = [...new Set(card.claims.flatMap(c => [...c.sourceIds, ...(c.fix?.sourceIds ?? [])]))]
  return (
    <article className="frame result">
      {review && <div className="review-line"><AlertTriangle size={14} />{t.needsReviewLine}</div>}
      <h3 className="kc-q">{card.question[lang]}</h3>
      <p className="kc-summary">{cardSummary(card, state, lang)}</p>
      <div className="kc-meta">
        <SourceDots ids={dots} />
        <span>{dots.length} · {card.sourceRange} · {review ? t.stReview : `${t.stPublished} v${state.version}`}</span>
      </div>
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onSource}>{t.viewSource}</button>
        <button className="btn btn-primary" onClick={onOpen}>{t.openCard}</button>
      </div>
    </article>
  )
}

// 来源作者的小圆点，颜色来自应用数据中的作者
function SourceDots({ ids }: { ids: string[] }) {
  const people = [...new Map(ids.map(id => fixtureMessages.find(m => m.id === id)).filter((m): m is Message => !!m).map(m => [m.senderId, personFor(m)])).values()]
  return <span className="dots" aria-hidden="true">{people.map(p => <span key={p.name} style={{ background: p.color }} />)}</span>
}

type SourceProps = { view: SourceView; t: Copy; onClose: () => void }
export function SourceSheet({ view, t, onClose }: SourceProps) {
  const { thread, highlightId, roles } = view
  const range = thread.length ? `${shortDay(thread[0].sentAt)} – ${shortDay(thread[thread.length - 1].sentAt)}` : ''
  return (
    <div className="overlay" style={{ zIndex: 6 }}>
      <div className="scrim" onClick={onClose} />
      <div className="peek" />
      <section className="source-sheet" role="dialog" aria-modal="true" aria-label={t.srcTitle}>
        <div className="source-head">
          <button className="icon-btn" onClick={onClose} aria-label={t.back}><ChevronLeft size={20} /></button>
          <div><div className="kicker accent">{t.srcKicker}</div><h2 className="source-title">{t.srcTitle}</h2></div>
        </div>
        <div className="source-meta"><span className="tag tag-neutral">Campus Circle</span><span>{t.msgCount(thread.length)} · {range}</span></div>
        <div className="source-body">
          {thread.map(message => {
            const person = personFor(message)
            const cited = message.id === highlightId
            const tag = cited ? t.role.cited : roles[message.id] ? t.role[roles[message.id]] : ''
            return (
              <div className={`source-msg${cited ? ' cited' : ''}`} key={message.id}>
                <Avatar person={person} size={28} />
                <div>
                  <div className="source-who"><b>{person.name}</b><span>{shortTime(message.sentAt)}</span>{tag && <span className="tag tag-outline tag-sm">{tag}</span>}</div>
                  <p>{message.text}</p>
                </div>
              </div>
            )
          })}
          {thread.length === 1 && <p className="no-follow">{t.noFollow}</p>}
        </div>
        <div className="sheet-foot"><button className="btn btn-secondary btn-block" onClick={onClose}>{t.back}</button></div>
      </section>
    </div>
  )
}
