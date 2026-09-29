import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_NOW, GROUP, messages, type Message } from './fixtures'
import { COPY, type Lang } from './i18n'
import { classifyMessages, findMatches, routeIntent, sourceThread, threadRoles, type Match } from './matching'
import { CARDS, cardForAnswer, cardStatus, initialCardState, unansweredTopics, type CardState, type KnowledgeCardDef, type ReviewDecision } from './knowledge'
import { openingFor, personFor, shortTime, simulatedReply, type Conversation, type ImportedMessage } from './ui'
import { Close, Sparkle } from './icons'
import { Avatar } from './components/Avatar'
import { ResultSheet, SourceSheet, type SourceView } from './components/Sheets'
import { ChatScreen, DraftScreen } from './components/Conversation'
import { ChatsTab, KnowledgeTab } from './components/Tabs'
import { CardScreen } from './components/CardScreen'
import { DemoPanel, ImportSheet, MenuSheet, TRY_DRAFTS, type Outcome } from './components/DemoPanel'

const KEY = {
  lang: 'campus-circle:lang', draft: 'campus-circle:draft', dismissed: 'campus-circle:dismissed-draft',
  imported: 'campus-circle:imported-messages', sent: 'campus-circle:sent', conversations: 'campus-circle:conversations',
  cards: 'campus-circle:cards', saves: 'campus-circle:saves'
}
// 早期版本使用过的键，重置时一并清除
const LEGACY_KEYS = ['campus-circle:ravi-chat', 'campus-circle:knowledge-drafts']
const FEED_SINCE = +new Date('2026-09-14T18:30:00+08:00')

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T } catch { return fallback }
}
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial))
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 存储不可用时仅保留内存状态 */ } }, [key, value])
  return [value, setValue] as const
}

type Tab = 'group' | 'chats' | 'knowledge'
type Screen = 'main' | 'draft' | 'chat' | 'card'

export function App() {
  const [lang, setLang] = usePersisted<Lang>(KEY.lang, 'zh')
  const [draft, setDraft] = usePersisted(KEY.draft, '')
  const [dismissed, setDismissed] = usePersisted(KEY.dismissed, '')
  const [imported, setImported] = usePersisted<ImportedMessage[]>(KEY.imported, [])
  const [sent, setSent] = usePersisted<Message[]>(KEY.sent, [])
  const [conversations, setConversations] = usePersisted<Conversation[]>(KEY.conversations, [])
  const [cardStates, setCardStates] = usePersisted<Record<string, CardState>>(KEY.cards, {})
  const [saves, setSaves] = usePersisted<string[]>(KEY.saves, [])

  const [tab, setTab] = useState<Tab>('group')
  const [screen, setScreen] = useState<Screen>('main')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<Match | null>(null)
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty'>('idle')
  const [composing, setComposing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [source, setSource] = useState<SourceView | null>(null)
  const [opening, setOpening] = useState('')
  const [reviewer, setReviewer] = useState(false)
  const [typingIn, setTypingIn] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const t = COPY[lang]
  const revision = useRef(0)
  const feedRef = useRef<HTMLElement>(null)
  const timers = useRef<number[]>([])
  const view = useRef({ screen, conversationId })
  view.current = { screen, conversationId }

  // 匹配使用完整群历史：任务在 matching.ts 中按 72 小时过滤，知识不受时间窗口限制
  const history = useMemo(() => [...messages, ...imported, ...sent], [imported, sent])
  const classes = useMemo(() => classifyMessages(history), [history])
  const feed = useMemo(() => history.filter(m => +new Date(m.sentAt) >= FEED_SINCE || m.id.startsWith('import-') || m.senderId === 'me')
    .sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt)), [history])
  const messageFor = (id: string) => history.find(m => m.id === id)
  const cardState = (id: string) => cardStates[id] ?? initialCardState()
  const match = (text: string) => findMatches(routeIntent(text), text, history, DEMO_NOW, classes)
  const outcomes = useMemo<Outcome[]>(() => TRY_DRAFTS.map(d => findMatches(routeIntent(d), d, history, DEMO_NOW, classes)?.route ?? 'none'), [history, classes])

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en' }, [lang])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => { if (tab === 'group' && screen === 'main') feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [feed.length, tab, screen, suggestion, searchState])

  // 自动建议：停止输入约 800ms 后检查；输入法组合期间不触发；已关闭的草稿不再提示；旧结果不会覆盖新结果
  useEffect(() => {
    const current = ++revision.current
    setSuggestion(null); setSearchState('idle')
    if (composing || !draft.trim() || dismissed === draft) return
    const timer = window.setTimeout(() => { if (current === revision.current) { const result = match(draft); if (result) setSuggestion(result) } }, 800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, composing, dismissed, history])

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const showToast = (message: string) => { setToast(message); later(() => setToast(current => current === message ? '' : current), 2200) }
  const closeOverlays = () => { setSheetOpen(false); setSource(null); setMenuOpen(false); setImportOpen(false) }

  const manualSearch = () => {
    const current = ++revision.current
    setSuggestion(null); setSearchState('loading')
    later(() => {
      if (current !== revision.current) return
      const result = match(draft)
      if (result) { setSuggestion(result); setShowClosed(false); setSheetOpen(true); setSearchState('idle') } else setSearchState('empty')
    }, 350)
  }
  // 发送永远不被拦截
  const send = () => {
    if (!draft.trim()) return
    setSent(list => [...list, { id: `local-${Date.now()}`, groupId: GROUP.id, senderId: 'me', text: draft.trim(), sentAt: DEMO_NOW }])
    setDraft(''); setSuggestion(null); setSearchState('idle')
  }
  const startDraft = (text: string) => { closeOverlays(); setScreen('main'); setTab('group'); setDismissed(''); setDraft(text) }

  // ---------- 来源 ----------
  const showThread = (thread: Message[], highlightId: string | null) => setSource({ thread, highlightId, roles: threadRoles(thread, classes) })
  const openTaskSource = (message: Message) => showThread(sourceThread(message.id, history, classes), message.id)
  const cardThread = (card: KnowledgeCardDef) => card.threadIds.map(messageFor).filter((m): m is Message => !!m)
  const openAnswerSource = (answer: Message, card?: KnowledgeCardDef) => {
    if (card) return showThread(cardThread(card), answer.id)
    const root = classes[answer.id]?.answers_message_id ?? answer.replyToId ?? answer.id
    showThread(sourceThread(root, history, classes), answer.id)
  }

  // ---------- 临时对话 ----------
  const findConversation = (message: Message) => conversations.find(c => c.sourceMessageId === message.id && c.participantId === message.senderId)
  const openConversation = (c: Conversation) => {
    setConversations(list => list.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
    setConversationId(c.id); setRequestId(c.sourceMessageId); setScreen('chat')
  }
  const chatAbout = (message: Message) => {
    closeOverlays()
    const existing = findConversation(message)
    if (existing) return openConversation(existing)
    setRequestId(message.id); setOpening(openingFor(message, lang, t)); setScreen('draft')
  }
  // 只有发送第一条消息时才创建对话
  const sendOpening = () => {
    const request = requestId ? messageFor(requestId) : undefined
    if (!request || !opening.trim()) return
    const id = `conv-${request.id}-${request.senderId}`
    const conversation: Conversation = {
      id, groupId: GROUP.id, sourceMessageId: request.id, participantId: request.senderId, participantName: personFor(request).name,
      createdAt: DEMO_NOW, unread: 0, messages: [{ id: `${id}-0`, mine: true, text: opening.trim(), sentAt: DEMO_NOW }]
    }
    setConversations(list => [...list.filter(c => c.id !== id), conversation])
    setConversationId(id); setScreen('chat'); setTypingIn(id)
    const reply = simulatedReply(request, lang)
    later(() => {
      setTypingIn(current => current === id ? null : current)
      const viewing = view.current.screen === 'chat' && view.current.conversationId === id
      setConversations(list => list.map(c => c.id === id ? { ...c, unread: viewing ? 0 : c.unread + 1, messages: [...c.messages, { id: `${id}-sim`, mine: false, text: reply, sentAt: DEMO_NOW, simulated: true }] } : c))
    }, 1600)
  }
  const sendChat = (text: string) => setConversations(list => list.map(c => c.id === conversationId ? { ...c, messages: [...c.messages, { id: `${c.id}-${Date.now()}`, mine: true, text, sentAt: DEMO_NOW }] } : c))

  // ---------- 知识卡片 ----------
  const openCard = (card: KnowledgeCardDef) => { closeOverlays(); setCardId(card.id); setReviewer(false); setScreen('card') }
  const decide = (id: string, n: number, d: ReviewDecision) => setCardStates(all => { const s = all[id] ?? initialCardState(); return { ...all, [id]: { ...s, decisions: { ...s.decisions, [n]: d } } } })
  // 发布新版本：保留 v1 历史，只有此时才更新复核日期
  const publish = (card: KnowledgeCardDef) => {
    setCardStates(all => {
      const s = all[card.id] ?? initialCardState()
      return { ...all, [card.id]: { ...s, version: s.version + 1, reviewedLabel: { zh: '9/17 · 你（模拟）', en: '9/17 · You (simulated)' }, history: `v${s.version + 1} · 9/17 · ${s.history ?? card.review.history}` } }
    })
    setReviewer(false); showToast(t.toastPublished)
  }

  const reset = () => {
    [...Object.values(KEY), ...LEGACY_KEYS].forEach(key => { try { localStorage.removeItem(key) } catch { /* ignore */ } })
    timers.current.forEach(clearTimeout); timers.current = []; revision.current++
    setDraft(''); setDismissed(''); setImported([]); setSent([]); setConversations([]); setCardStates({}); setSaves([])
    setSuggestion(null); setSearchState('idle'); closeOverlays(); setScreen('main'); setTab('group'); setTypingIn(null); setReviewer(false)
  }

  const suggestionLabel = (() => {
    if (!suggestion) return ''
    const n = suggestion.task?.actionable.length ?? 0
    if (suggestion.route === 'mixed') return t.promptMixed(n)
    if (suggestion.route === 'task') return t.promptTask(n)
    const card = suggestion.knowledge ? cardForAnswer(suggestion.knowledge.answer.id) : undefined
    return card && cardStatus(card, cardState(card.id), classes) === 'needs-review' ? t.promptKnowReview : t.promptKnow
  })()

  const panel = <DemoPanel t={t} lang={lang} outcomes={outcomes} onLang={setLang} onTry={startDraft} onImport={() => { setMenuOpen(false); setImportOpen(true) }} onReset={reset} />
  const request = requestId ? messageFor(requestId) : undefined
  const conversation = conversations.find(c => c.id === conversationId)
  const card = CARDS.find(c => c.id === cardId)

  return (
    <div className="stage">
      <div className="app">
        {screen === 'main' && (
          <main className="screen">
            <header className="chat-header">
              <span className="back muted" aria-hidden="true">‹</span>
              <div><h1>{t.group}</h1><p>{t.online}</p></div>
              <button className="menu" onClick={() => setMenuOpen(true)} aria-label={t.menu}>☰</button>
            </header>
            <nav className="tabs" role="tablist">
              {([['group', t.tabGroup], ['chats', conversations.length ? `${t.tabChats} · ${conversations.length}` : t.tabChats], ['knowledge', t.tabKnow]] as [Tab, string][]).map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
              ))}
            </nav>

            {tab === 'group' && <>
              <section className="feed" aria-label={t.tabGroup} ref={feedRef}>
                {feed.map(message => { const person = personFor(message); return (
                  <article className="message" key={message.id}>
                    <Avatar person={message.senderId === 'me' ? { initials: t.meIni, color: '#7558d9' } : person} />
                    <div><div className="meta"><strong>{message.senderId === 'me' ? t.you : person.name}</strong><time>{shortTime(message.sentAt)}</time></div><p>{message.text}</p></div>
                  </article>
                ) })}
              </section>
              <footer className="composer-wrap">
                {suggestion && !sheetOpen && (
                  <div className="suggestion">
                    <button className="suggestion-main" onClick={() => { setShowClosed(false); setSheetOpen(true) }}>
                      <Sparkle color="var(--accent)" /><span className="suggestion-label">{suggestionLabel}</span><span className="suggestion-view">{t.view} ›</span>
                    </button>
                    <button className="icon-btn dismiss" aria-label={t.dismiss} onClick={() => { setDismissed(draft); setSuggestion(null) }}><Close size={16} /></button>
                  </div>
                )}
                {searchState === 'empty' && <div className="empty">{t.empty}</div>}
                <div className="composer">
                  <button className="plus" aria-label={t.importLabel} onClick={() => setImportOpen(true)}>＋</button>
                  <textarea aria-label={t.placeholder} placeholder={t.placeholder} value={draft}
                    onChange={e => { setDismissed(''); setDraft(e.target.value) }}
                    onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
                  <button className="search" aria-label={t.searchGroup} onClick={manualSearch} disabled={!draft.trim() || searchState === 'loading'}>{searchState === 'loading' ? '…' : '⌕'}</button>
                  <button className="send" onClick={send} disabled={!draft.trim()}>{t.send}</button>
                </div>
              </footer>
            </>}
            {tab === 'chats' && <ChatsTab conversations={conversations} requestFor={messageFor} t={t} onOpen={openConversation} />}
            {tab === 'knowledge' && <KnowledgeTab t={t} lang={lang} classes={classes} cardState={cardState} unanswered={unansweredTopics(history, classes)} onOpen={openCard} />}
          </main>
        )}

        {screen === 'draft' && request && <DraftScreen request={request} t={t} opening={opening} onOpening={setOpening} onCancel={() => setScreen('main')} onSend={sendOpening} />}
        {screen === 'chat' && request && conversation && (
          <ChatScreen conversation={conversation} request={request} t={t} typing={typingIn === conversation.id}
            onBack={() => setScreen('main')} onSource={() => openTaskSource(request)} onSend={sendChat} />
        )}
        {screen === 'card' && card && (
          <CardScreen card={card} state={cardState(card.id)} t={t} lang={lang} classes={classes} messageFor={messageFor}
            reviewer={reviewer} saved={saves.includes(card.id)}
            onBack={() => { setSource(null); setScreen('main') }} onToggleReviewer={() => setReviewer(on => !on)}
            onDecide={(n, d) => decide(card.id, n, d)} onPublish={() => publish(card)}
            onSource={id => showThread(cardThread(card), id)}
            onSave={() => setSaves(list => list.includes(card.id) ? list.filter(x => x !== card.id) : [...list, card.id])}
            onCorrect={() => showToast(t.toastCorrect)} onAsk={() => startDraft(t.followDraft)} />
        )}

        {sheetOpen && suggestion && screen === 'main' && (
          <ResultSheet match={suggestion} t={t} lang={lang} classes={classes} conversations={conversations} cardState={cardState}
            showClosed={showClosed} onToggleClosed={() => setShowClosed(v => !v)} onClose={() => setSheetOpen(false)}
            onTaskSource={openTaskSource} onAnswerSource={openAnswerSource} onChat={chatAbout} onOpenCard={openCard} />
        )}
        {source && <SourceSheet view={source} t={t} onClose={() => setSource(null)} />}
        {menuOpen && <MenuSheet t={t} onClose={() => setMenuOpen(false)}>{panel}</MenuSheet>}
        {importOpen && <ImportSheet t={t} onClose={() => setImportOpen(false)} onImport={items => { setImported(list => [...list, ...items]); setImportOpen(false); setTab('group') }} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
      <aside className="demo-aside" aria-label={t.menu}>{panel}</aside>
    </div>
  )
}
