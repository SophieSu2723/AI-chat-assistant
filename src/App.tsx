import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_NOW, GROUP, authorFor, messages, type Message } from './fixtures'

type Route = 'task' | 'knowledge' | 'mixed' | 'none'
type Match = { route: Exclude<Route, 'none'>; label: string }
type ConversationMessage = { id: string; sender: 'me' | 'ravi'; text: string; sentAt: string }
const DRAFT_KEY = 'campus-circle:draft'
const DISMISS_KEY = 'campus-circle:dismissed-draft'
const CHAT_KEY = 'campus-circle:ravi-chat'

function routeIntent(value: string): Route {
  const text = value.toLowerCase().trim()
  if (!text) return 'none'
  const task = /anyone|going|ride|carpool|一起|有人.*(去|想)|搭车|拼车|shopping|costco|trader joe/.test(text) && /anyone|going|ride|一起|有人|搭车|拼车|shopping|costco|trader joe/.test(text)
  const knowledge = /how|where|what|can i|怎么|如何|哪里|多少钱|流程|without a car|permit|printer/.test(text)
  return task && knowledge ? 'mixed' : task ? 'task' : knowledge ? 'knowledge' : 'none'
}
function findMatch(route: Route, value: string): Match | null {
  const text = value.toLowerCase()
  if ((route === 'task' || route === 'mixed') && /grocery|shopping|costco|trader|买菜|购物/.test(text)) return { route: route === 'mixed' ? 'mixed' : 'task', label: '发现 1 条相关的近期需求' }
  if ((route === 'knowledge' || route === 'mixed') && /costco|car|公交|bus|parking|permit|停车/.test(text)) return { route: route === 'mixed' ? 'mixed' : 'knowledge', label: '群内讨论过相关问题' }
  return null
}
function dateLabel(iso: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(iso)) }
function loadChat(): ConversationMessage[] { try { return JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]') } catch { return [] } }

export function App() {
  const [draft, setDraft] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '')
  const [suggestion, setSuggestion] = useState<Match | null>(null)
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty'>('idle')
  const [composing, setComposing] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [screen, setScreen] = useState<'group' | 'chat'>('group')
  const [sent, setSent] = useState<Message[]>([])
  const revision = useRef(0)
  const dismissed = useRef(localStorage.getItem(DISMISS_KEY) ?? '')
  const feed = useMemo(() => [...messages.filter(x => new Date(x.sentAt) >= new Date('2026-09-14T18:30:00+08:00')), ...sent], [sent])
  useEffect(() => { localStorage.setItem(DRAFT_KEY, draft) }, [draft])
  useEffect(() => { const current = ++revision.current; setSuggestion(null); setSearchState('idle'); if (composing || !draft.trim() || dismissed.current === draft) return; const timer = window.setTimeout(() => { if (current === revision.current) { const result = findMatch(routeIntent(draft), draft); if (result) setSuggestion(result) } }, 800); return () => window.clearTimeout(timer) }, [draft, composing])
  const manualSearch = () => { const current = ++revision.current; setSuggestion(null); setSearchState('loading'); window.setTimeout(() => { if (current !== revision.current) return; const result = findMatch(routeIntent(draft), draft); if (result) { setSuggestion(result); setSheet(true); setSearchState('idle') } else setSearchState('empty') }, 350) }
  const send = () => { if (!draft.trim()) return; setSent(s => [...s, { id: `local-${Date.now()}`, groupId: GROUP.id, senderId: 'me', text: draft.trim(), sentAt: DEMO_NOW }]); setDraft(''); setSuggestion(null) }
  const reset = () => { [DRAFT_KEY, DISMISS_KEY, CHAT_KEY].forEach(key => localStorage.removeItem(key)); dismissed.current = ''; setDraft(''); setSuggestion(null); setSent([]); setSearchState('idle') }
  if (screen === 'chat') return <InstantChat onBack={() => setScreen('group')} />
  return <main className="app group-page"><header className="chat-header"><button className="back muted" aria-label="返回">‹</button><div><h1>{GROUP.name}</h1><p>⌄ 24 人在线</p></div><button className="menu" aria-label="更多">☰</button></header><section className="feed" aria-label="群消息">{feed.map(message => <MessageRow key={message.id} message={message} />)}</section><section className="composer-wrap">{suggestion && <div className="suggestion"><button className="suggestion-main" onClick={() => setSheet(true)}><span className="spark">✦</span>{suggestion.label}<span>查看 ›</span></button><button className="dismiss" aria-label="关闭建议" onClick={() => { dismissed.current = draft; localStorage.setItem(DISMISS_KEY, draft); setSuggestion(null) }}>×</button></div>}{searchState === 'empty' && <div className="empty">未发现可用的相关需求或群内资料；你仍可直接发送。</div>}<div className="composer"><button className="plus" aria-label="更多功能">＋</button><textarea aria-label="消息内容" value={draft} placeholder="发消息…" onChange={e => { dismissed.current = ''; localStorage.removeItem(DISMISS_KEY); setDraft(e.target.value) }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} /><button className="search" onClick={manualSearch} disabled={!draft.trim() || searchState === 'loading'}>{searchState === 'loading' ? '…' : '⌕'}</button><button className="send" onClick={send} disabled={!draft.trim()}>发送</button></div></section>{sheet && suggestion && <ResultSheet result={suggestion} onClose={() => setSheet(false)} onChat={() => { setSheet(false); setScreen('chat') }} />}<button className="reset reset-float" onClick={reset}>重置演示</button></main>
}
function MessageRow({ message }: { message: Message }) { const author = authorFor(message.senderId); return <article className="message"><div className="avatar" style={{ background: author.color }}>{author.initials}</div><div><div className="meta"><strong>{author.name}</strong><time>{dateLabel(message.sentAt)}</time></div><p>{message.text}</p></div></article> }
function ResultSheet({ result, onClose, onChat }: { result: Match; onClose: () => void; onChat: () => void }) { const task = result.route === 'task'; return <div className="scrim"><section className="sheet" role="dialog" aria-modal="true" aria-label="私密建议"><div className="handle" /><div className="sheet-head"><div><span className="eyebrow">仅你可见 · 模拟匹配</span><h2>{task ? '相关需求' : '相关群知识'}</h2></div><button onClick={onClose} aria-label="关闭">×</button></div>{task || result.route === 'mixed' ? <button className="result clickable" onClick={onChat}><span className="badge">仍需确认</span><h3>有人想周末去 Trader Joe’s 吗？</h3><small>Ravi · 今天 · 时间未定</small><p>周日有人去 Trader Joe’s 吗？想搭车，时间还没定。</p><footer>点击进入即时对话 <b>›</b></footer></button> : null}{!task && <article className="result"><span className="badge">有来源的草稿</span><h3>没有车怎么去 Costco？</h3><small>来源：9 月 2 日 · 需要复核</small><p>公交 6 路 → Central Station → 118 路，之后有路线变更说明。</p></article>}<p className="sheet-note">打开即时对话不会通知对方；发送第一条消息后才会创建会话。</p></section></div> }
function InstantChat({ onBack }: { onBack: () => void }) { const [chat, setChat] = useState<ConversationMessage[]>(loadChat); const [text, setText] = useState('嗨！我也想去 Trader Joe’s，想确认一下你还需要搭车吗？'); useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(chat)) }, [chat]); const send = () => { if (!text.trim()) return; const entry = { id: String(Date.now()), sender: 'me' as const, text: text.trim(), sentAt: DEMO_NOW }; setChat(items => [...items, entry]); setText(''); window.setTimeout(() => setChat(items => [...items, { id: `reply-${Date.now()}`, sender: 'ravi', text: '好的，我还在找车。谢谢你联系我！', sentAt: DEMO_NOW }]), 550) }; return <main className="app instant-page"><header className="chat-header"><button className="back" onClick={onBack} aria-label="返回">‹</button><div><h1>Ravi Shah</h1><p>即时对话 · 模拟回复</p></div><button className="menu" aria-label="更多">•••</button></header><section className="request-pin"><span>来自 {GROUP.name}</span><strong>周日有人去 Trader Joe’s 吗？</strong><small>Ravi 正在找车 · 时间未定</small></section><section className="chat-thread"><p className="private-label">此对话不会出现在群聊中</p>{chat.length === 0 && <div className="chat-empty"><b>准备好开始对话</b><span>编辑下方开场白后发送。发送前，对方不会收到任何通知。</span></div>}{chat.map(item => <ChatBubble key={item.id} item={item} />)}</section><section className="instant-composer"><button aria-label="更多">＋</button><textarea value={text} aria-label="即时对话消息" onChange={e => setText(e.target.value)} /><button className="send" onClick={send} disabled={!text.trim()}>发送</button></section></main> }
function ChatBubble({ item }: { item: ConversationMessage }) { const mine = item.sender === 'me'; return <div className={`bubble-row ${mine ? 'mine' : ''}`}><div className="chat-avatar" style={{ background: mine ? '#1595e9' : '#e0a13e' }}>{mine ? '你' : 'RS'}</div><div className="bubble">{item.text}</div></div> }
