import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_NOW, GROUP, authorFor, messages, type Message } from './fixtures'
import { findMatch, routeIntent, type Match } from './matching'

type ConversationMessage = { id: string; sender: 'me' | 'ravi'; text: string; sentAt: string }
type KnowledgeCard = { id: string; question: string; answer: string; sourceIds: string[]; createdAt: string; status: 'draft' }
const DRAFT_KEY = 'campus-circle:draft'
const DISMISS_KEY = 'campus-circle:dismissed-draft'
const CHAT_KEY = 'campus-circle:ravi-chat'
const IMPORT_KEY = 'campus-circle:imported-messages'
const KNOWLEDGE_KEY = 'campus-circle:knowledge-drafts'
const palette = ['#5d8ed5', '#ee7662', '#4da7a0', '#ba699b', '#e2a940', '#7558d9']

type ImportedMessage = Message & { senderName: string }
function loadImportedMessages(): ImportedMessage[] { try { return JSON.parse(localStorage.getItem(IMPORT_KEY) ?? '[]') } catch { return [] } }
function loadKnowledgeCards(): KnowledgeCard[] { try { return JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) ?? '[]') } catch { return [] } }
function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() || '群友' }
function importColor(name: string) { return palette[[...name].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % palette.length] }
function parseWechatText(value: string): ImportedMessage[] {
  const lines = value.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean)
  const parsed: ImportedMessage[] = []
  for (let index = 0; index < lines.length - 1;) {
    const name = lines[index]
    const match = lines[index + 1].match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})$/)
    if (!match) { index += 1; continue }
    index += 2
    const content: string[] = []
    while (index < lines.length && !(index + 1 < lines.length && /^\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}$/.test(lines[index + 1]))) content.push(lines[index++])
    const text = content.join('\n')
    if (!text || /^\[(Photo|图片|Sticker|表情|Video|视频|File|文件)\]/i.test(text)) continue
    const [, year, month, day, hour, minute] = match
    const senderId = `import-${encodeURIComponent(name).replace(/%/g, '')}`
    parsed.push({ id: `import-${Date.now()}-${parsed.length}`, groupId: GROUP.id, senderId, senderName: name, text, sentAt: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00` })
  }
  return parsed
}

function displayName(message: Message) { const imported = message as ImportedMessage; return imported.senderName || authorFor(message.senderId).name }
function dateLabel(iso: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(iso)) }
function loadChat(): ConversationMessage[] { try { return JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]') } catch { return [] } }

export function App() {
  const [draft, setDraft] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '')
  const [suggestion, setSuggestion] = useState<Match | null>(null)
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'empty'>('idle')
  const [composing, setComposing] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [screen, setScreen] = useState<'group' | 'chat'>('group')
  const [chatSource, setChatSource] = useState<Message | null>(null)
  const [sent, setSent] = useState<Message[]>([])
  const [imported, setImported] = useState<ImportedMessage[]>(loadImportedMessages)
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>(loadKnowledgeCards)
  const [importOpen, setImportOpen] = useState(false)
  const revision = useRef(0)
  const dismissed = useRef(localStorage.getItem(DISMISS_KEY) ?? '')
  // 匹配使用完整群历史：任务卡在 matching.ts 中按 72 小时过滤，知识卡不受时间窗口限制
  const history = useMemo(() => [...messages, ...imported, ...sent], [imported, sent])
  const feed = useMemo(() => [...messages.filter(x => new Date(x.sentAt) >= new Date('2026-09-14T18:30:00+08:00')), ...imported, ...sent].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt)), [imported, sent])
  useEffect(() => { localStorage.setItem(DRAFT_KEY, draft) }, [draft])
  useEffect(() => { localStorage.setItem(IMPORT_KEY, JSON.stringify(imported)) }, [imported])
  useEffect(() => { localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(knowledgeCards)) }, [knowledgeCards])
  useEffect(() => { const current = ++revision.current; setSuggestion(null); setSearchState('idle'); if (composing || !draft.trim() || dismissed.current === draft) return; const timer = window.setTimeout(() => { if (current === revision.current) { const result = findMatch(routeIntent(draft), draft, history, DEMO_NOW); if (result) setSuggestion(result) } }, 800); return () => window.clearTimeout(timer) }, [draft, composing, history])
  const manualSearch = () => { const current = ++revision.current; setSuggestion(null); setSearchState('loading'); window.setTimeout(() => { if (current !== revision.current) return; const result = findMatch(routeIntent(draft), draft, history, DEMO_NOW); if (result) { setSuggestion(result); setSheet(true); setSearchState('idle') } else setSearchState('empty') }, 350) }
  const send = () => { if (!draft.trim()) return; setSent(s => [...s, { id: `local-${Date.now()}`, groupId: GROUP.id, senderId: 'me', text: draft.trim(), sentAt: DEMO_NOW }]); setDraft(''); setSuggestion(null) }
  const saveKnowledge = (result: Match) => { const sourceIds = [result.source, ...result.related].map(message => message.id); setKnowledgeCards(cards => cards.some(card => card.question === result.query && card.sourceIds[0] === result.source.id) ? cards : [{ id: `knowledge-${Date.now()}`, question: result.query, answer: result.source.text, sourceIds, createdAt: new Date().toISOString(), status: 'draft' }, ...cards]) }
  const reset = () => { [DRAFT_KEY, DISMISS_KEY, CHAT_KEY, IMPORT_KEY, KNOWLEDGE_KEY].forEach(key => localStorage.removeItem(key)); dismissed.current = ''; setDraft(''); setSuggestion(null); setSent([]); setImported([]); setKnowledgeCards([]); setSearchState('idle') }
  if (screen === 'chat' && chatSource) return <InstantChat source={chatSource} onBack={() => setScreen('group')} />
  return <main className="app group-page"><header className="chat-header"><button className="back muted" aria-label="返回">‹</button><div><h1>{GROUP.name}</h1><p>⌄ 24 人在线 · 知识草稿 {knowledgeCards.length}</p></div><button className="menu" aria-label="更多">☰</button></header><section className="feed" aria-label="群消息">{feed.map(message => <MessageRow key={message.id} message={message} />)}</section><section className="composer-wrap">{suggestion && <div className="suggestion"><button className="suggestion-main" onClick={() => setSheet(true)}><span className="spark">✦</span>{suggestion.label}<span>查看 ›</span></button><button className="dismiss" aria-label="关闭建议" onClick={() => { dismissed.current = draft; localStorage.setItem(DISMISS_KEY, draft); setSuggestion(null) }}>×</button></div>}{searchState === 'empty' && <div className="empty">未发现可用的相关需求或群内资料；你仍可直接发送。</div>}<div className="composer"><button className="plus" aria-label="导入群消息" onClick={() => setImportOpen(true)}>＋</button><textarea aria-label="消息内容" value={draft} placeholder="发消息…" onChange={e => { dismissed.current = ''; localStorage.removeItem(DISMISS_KEY); setDraft(e.target.value) }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} /><button className="search" onClick={manualSearch} disabled={!draft.trim() || searchState === 'loading'}>{searchState === 'loading' ? '…' : '⌕'}</button><button className="send" onClick={send} disabled={!draft.trim()}>发送</button></div></section>{sheet && suggestion && <ResultSheet result={suggestion} onClose={() => setSheet(false)} onSaveKnowledge={() => saveKnowledge(suggestion)} onChat={() => { setChatSource(suggestion.source); setSheet(false); setScreen('chat') }} />}{importOpen && <ImportSheet onClose={() => setImportOpen(false)} onImport={items => { setImported(items); setImportOpen(false) }} />}<button className="reset reset-float" onClick={reset}>重置演示</button></main>
}
function MessageRow({ message }: { message: Message }) { const imported = message as ImportedMessage; const author = imported.senderName ? { name: imported.senderName, initials: initials(imported.senderName), color: importColor(imported.senderName) } : authorFor(message.senderId); return <article className="message"><div className="avatar" style={{ background: author.color }}>{author.initials}</div><div><div className="meta"><strong>{author.name}</strong><time>{dateLabel(message.sentAt)}</time></div><p>{message.text}</p></div></article> }
function ResultSheet({ result, onClose, onChat, onSaveKnowledge }: { result: Match; onClose: () => void; onChat: () => void; onSaveKnowledge: () => void }) { const task = result.route === 'task'; const [saved, setSaved] = useState(false); return <div className="scrim"><section className="sheet" role="dialog" aria-modal="true" aria-label="私密建议"><div className="handle" /><div className="sheet-head"><div><span className="eyebrow">仅你可见 · 本地来源匹配</span><h2>{task ? '相关即时需求' : '知识草稿候选'}</h2></div><button onClick={onClose} aria-label="关闭">×</button></div><article className={`result ${task ? 'clickable' : ''}`} onClick={task ? onChat : undefined}><span className="badge">{task ? '仍需确认' : '草稿 · 需复核'}</span>{!task && <small>问题：{result.query}</small>}<h3>{result.source.text}</h3><small>{displayName(result.source)} · {dateLabel(result.source.sentAt)}</small><p>{task ? '这是一条近期、未标记为已满或取消的协调请求。' : '卡片仅引用这条原始消息作为候选答案，发布前请人工核对适用条件与时效。'}</p>{task && <footer>就此需求发起即时对话 <b>›</b></footer>}</article>{!task && <button className="knowledge-save" disabled={saved} onClick={() => { onSaveKnowledge(); setSaved(true) }}>{saved ? '已保存为本地知识草稿' : '保存为知识草稿'}</button>}{result.related.length > 0 && <div className="source-list"><b>相关原消息</b>{result.related.map(message => <p key={message.id}>{displayName(message)} · {dateLabel(message.sentAt)}<br />{message.text}</p>)}</div>}<p className="sheet-note">每个结论均显示原始发送人、时间和内容；打开即时对话不会通知对方。</p></section></div> }
function ImportSheet({ onClose, onImport }: { onClose: () => void; onImport: (items: ImportedMessage[]) => void }) { const [value, setValue] = useState(''); const [notice, setNotice] = useState(''); const submit = () => { const items = parseWechatText(value); if (!items.length) { setNotice('没有识别到文字消息。请确认每条记录依次是昵称、日期时间、内容。'); return } onImport(items) }; return <div className="scrim"><section className="sheet import-sheet" role="dialog" aria-modal="true" aria-label="导入群消息"><div className="handle" /><div className="sheet-head"><div><span className="eyebrow">仅保存在这台设备的浏览器中</span><h2>粘贴群消息</h2></div><button onClick={onClose} aria-label="关闭">×</button></div><p className="import-hint">从微信复制文字后直接粘贴。格式为：昵称、日期时间、内容；图片和表情占位符会自动略过。</p><textarea className="import-textarea" value={value} onChange={event => { setValue(event.target.value); setNotice('') }} placeholder={'用户A\n2026/09/11 7:13\n测试内容'} /><p className="import-notice">{notice || '请先取得相关群成员同意，并避免导入联系方式等敏感信息。'}</p><button className="import-button" onClick={submit}>导入文字消息</button></section></div> }
function InstantChat({ source, onBack }: { source: Message; onBack: () => void }) { const [chat, setChat] = useState<ConversationMessage[]>(loadChat); const name = displayName(source); const [text, setText] = useState(`嗨！我想确认一下：${source.text}`); useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(chat)) }, [chat]); const send = () => { if (!text.trim()) return; const entry = { id: String(Date.now()), sender: 'me' as const, text: text.trim(), sentAt: DEMO_NOW }; setChat(items => [...items, entry]); setText('') }; return <main className="app instant-page"><header className="chat-header"><button className="back" onClick={onBack} aria-label="返回">‹</button><div><h1>{name}</h1><p>即时对话 · 演示模式</p></div><button className="menu" aria-label="更多">•••</button></header><section className="request-pin"><span>来自 {GROUP.name} · 原始群消息</span><strong>{source.text}</strong><small>{name} · {dateLabel(source.sentAt)}</small></section><section className="chat-thread"><p className="private-label">此对话不会出现在群聊中</p>{chat.length === 0 && <div className="chat-empty"><b>准备好开始对话</b><span>编辑下方开场白后发送。演示不会向微信或真实用户发送消息。</span></div>}{chat.map(item => <ChatBubble key={item.id} item={item} />)}</section><section className="instant-composer"><button aria-label="更多">＋</button><textarea value={text} aria-label="即时对话消息" onChange={e => setText(e.target.value)} /><button className="send" onClick={send} disabled={!text.trim()}>发送</button></section></main> }
function ChatBubble({ item }: { item: ConversationMessage }) { const mine = item.sender === 'me'; return <div className={`bubble-row ${mine ? 'mine' : ''}`}><div className="chat-avatar" style={{ background: mine ? '#1595e9' : '#e0a13e' }}>{mine ? '你' : 'RS'}</div><div className="bubble">{item.text}</div></div> }
