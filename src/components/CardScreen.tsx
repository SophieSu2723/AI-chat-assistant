import type { Copy, Lang } from '../i18n'
import { AlertTriangle, ChevronLeft } from '../icons'
import { cardStatus, publishedClaims, type CardState, type KnowledgeCardDef, type ReviewDecision } from '../knowledge'
import type { MessageClass } from '../matching'
import { firstName, personFor, shortDay } from '../ui'
import type { Message } from '../fixtures'

type Props = {
  card: KnowledgeCardDef; state: CardState; t: Copy; lang: Lang; classes: Record<string, MessageClass>
  messageFor: (id: string) => Message | undefined
  reviewer: boolean; saved: boolean
  onBack: () => void; onToggleReviewer: () => void; onDecide: (n: number, d: ReviewDecision) => void; onPublish: () => void
  onSource: (highlightId: string) => void; onSave: () => void; onCorrect: () => void; onAsk: () => void
}

export function CardScreen({ card, state, t, lang, classes, messageFor, reviewer, saved, onBack, onToggleReviewer, onDecide, onPublish, onSource, onSave, onCorrect, onAsk }: Props) {
  const review = cardStatus(card, state, classes) === 'needs-review'
  const reviewing = review && reviewer
  const claims = review ? card.claims : publishedClaims(card, state)
  const flagged = card.claims.filter(c => c.fix)
  const decided = flagged.filter(c => state.decisions[c.n]).length
  // 来源标签：作者名 · 日期，均来自原始消息
  const chip = (id: string) => { const m = messageFor(id); return m ? `${firstName(personFor(m).name)} · ${shortDay(m.sentAt)}` : id }
  const fixFrom = (ids: string[]) => `${t.from} ${chip(ids[0])}`
  const v1Date = shortDay(messageFor(card.claims[0].sourceIds[0])?.sentAt ?? '')
  const reviewed = state.reviewedLabel?.[lang] ?? card.review.v1[lang]
  const history = state.history ?? card.review.history

  return (
    <main className="screen ai-screen">
      <header className="card-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}><ChevronLeft /></button>
        <span className="card-code">{t.kGroup} · {card.code}</span>
        <button className="reviewer-toggle" role="switch" aria-checked={reviewer} onClick={onToggleReviewer}>
          {t.reviewer} <span className="muted-xs">{t.simulatedP}</span><span className={`switch${reviewer ? ' on' : ''}`} />
        </button>
      </header>
      <div className="card-body">
        <div className="tags">
          <span className={`tag ${review ? 'tag-review' : 'tag-accent'}`}>{review ? t.stReview : t.stPublished}</span>
          <span className="tag tag-neutral">v{state.version}</span>
          {review && <span className="tag tag-neutral">{flagged.length} / {card.claims.length} {t.affected}</span>}
        </div>

        {review && !reviewer && <>
          <div className="banner">
            <div className="banner-title"><AlertTriangle /><b>{t.bannerT}</b></div>
            <div className="compare">
              <div><div className="kicker">{t.cardV1} · {v1Date}</div><p>{card.conflict?.old[lang] ?? flagged.map(c => c.text[lang]).join(' ')}</p></div>
              <div><div className="kicker accent">{flagged[0]?.fix && chip(flagged[0].fix.sourceIds[0])}</div><p>{card.conflict?.new[lang] ?? flagged.map(c => c.fix!.text[lang]).join(' ')}</p></div>
            </div>
            <p className="banner-note">{t.bannerNote}</p>
          </div>
          <p className="reviewer-note">{t.reviewerNote}</p>
        </>}

        <h1 className="card-q">{card.question[lang]}</h1>
        <ol className="claims">
          {claims.map(c => {
            const isFlagged = !!c.fix && review
            if (reviewing && isFlagged) {
              const d = state.decisions[c.n]
              return (
                <li className="claim-review" key={c.n}>
                  <div className="claim-grid"><span className="claim-n accent">{c.n}</span>
                    <div>
                      <s className="claim-old">{c.text[lang]}</s>
                      <p>{c.fix!.text[lang]}</p>
                      <button className="link-btn accent" onClick={() => onSource(c.fix!.sourceIds[0])}>{fixFrom(c.fix!.sourceIds)} ›</button>
                    </div>
                  </div>
                  <div className="decide">
                    <button className={`btn btn-secondary btn-sm${d === 'keep' ? ' chosen' : ''}`} aria-pressed={d === 'keep'} onClick={() => onDecide(c.n, 'keep')}>{d === 'keep' && '✓ '}{t.keepV1}</button>
                    <button className={`btn btn-secondary btn-sm${d === 'use' ? ' chosen' : ''}`} aria-pressed={d === 'use'} onClick={() => onDecide(c.n, 'use')}>{d === 'use' && '✓ '}{t.useFix}</button>
                  </div>
                </li>
              )
            }
            return (
              <li className="claim" key={c.n}>
                <span className="claim-n">{c.n}</span>
                <span className={isFlagged ? 'claim-stale' : ''}>{c.text[lang]}{isFlagged && <span className="stale-note">{t.staleNote}</span>}</span>
                <button className="tag tag-accent src-chip" onClick={() => onSource(c.sourceIds[0])}>{chip(c.sourceIds[0])}</button>
              </li>
            )
          })}
        </ol>

        <div className="applicability">
          {card.applicability[lang].map(([k, v]) => <div key={k}><div className="kicker">{k}</div><div className="app-v">{v}</div></div>)}
        </div>
        <div><div className="kicker">{t.notCovered}</div><p className="card-p">{card.unknowns[lang]}</p></div>
        <div><div className="kicker">{t.signals}</div><p className="card-p">{card.signals[lang]}</p></div>
        <div className="dates">
          <div><div className="kicker">{t.sources}</div><div>{card.sourceRange}</div></div>
          <div><div className="kicker">{t.generated}</div><div>{card.generatedAt}</div></div>
          <div><div className="kicker">{t.reviewed}</div><div>{reviewed}</div></div>
        </div>
        <p className="muted-sm">{t.history}: {history}</p>
      </div>

      {reviewing ? (
        <footer className="card-foot">
          <button className="btn btn-primary btn-block btn-tall" disabled={decided < flagged.length} onClick={onPublish}>{t.publish(decided, flagged.length)}</button>
          <p className="foot-note">{t.publishNote}</p>
        </footer>
      ) : (
        <footer className="card-foot three">
          <button className="btn btn-secondary" onClick={onSave} aria-pressed={saved}>{saved ? t.saved : t.save}</button>
          <button className="btn btn-secondary" onClick={onCorrect}>{t.correct}</button>
          <button className="btn btn-primary" onClick={onAsk}>{t.ask}</button>
        </footer>
      )}
    </main>
  )
}
