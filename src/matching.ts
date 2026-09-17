// 规则版识别与匹配。接入模型前的模拟实现，也是 eval/run-eval.mjs --rules 的评估对象。
// 本文件不依赖 React 和 fixtures 运行时，便于在 Node 中直接导入评估。
import type { Message } from './fixtures'

export type Route = 'task' | 'knowledge' | 'mixed' | 'none'
export type SpeechAct = 'request' | 'offer' | 'question' | 'answer' | 'experience' | 'status_update' | 'acknowledgement' | 'chitchat'
export type EventState = 'open' | 'full' | 'cancelled' | 'fulfilled'
export type Update = { target_message_id: string; new_state: EventState | 'corrected' }
export type MessageClass = { speech_act: SpeechAct; needs_counterpart: boolean; reusable: boolean; answers_message_id: string | null; updates: Update | null }
export type Match = { route: Exclude<Route, 'none'>; label: string; query: string; source: Message; related: Message[] }

const HOUR = 60 * 60 * 1000
export const TASK_WINDOW_MS = 72 * HOUR

const lower = (text: string) => text.toLowerCase().trim()

// ---------- 信号词 ----------
// "有人知道""anyone know" 是信息问题的句式，先剥离，避免被当成找人
const KNOW_PHRASE = /有人知道|谁知道|有没有人知道|does anyone know|anyone know|anybody know|do you know/
const stripKnow = (t: string) => t.replace(new RegExp(KNOW_PHRASE.source, 'g'), ' ')
const KNOWLEDGE = /怎么|如何|哪里|哪儿|在哪|多少钱|几点|几路|多久|流程|步骤|为什么|是什么|\bhow\b|\bwhere\b|\bwhat\b|what's|\bwhich\b|\bwhen\b|\bwhy\b|process|price|cost\b|开门|关门|营业|\b(is|are)\b[^?]{0,30}\b(open|closed)\b/
const REQUEST = /有人[^，。,.!?？！]{0,12}(去|一起|拼|搭|要|想)|一起去|拼车|搭车|拼单|组队|找人|找个人|带我|谁去|求带|\banyone (going|heading|want|wants|need|needs|joining|interested)\b|looking for|split (an? )?(uber|lyft|cab|taxi)|carpool|need a ride|who('s| is) (going|heading)|有人能|谁能|谁有.{0,8}借|借我|\b(can|could) (someone|anyone) (help|give|lend|drive)\b/
const OFFER = /我可以(开车|带)|能带|有空位|有.{0,2}个?座位|顺路|\bi can (drive|give|take)\b|seats? (available|left|open)|can give .{0,12}ride/
const PAST = /上次|上周|昨天|前几天|之前去|去过|\blast (week|weekend|time|night|month)\b|\byesterday\b|\bwent\b/
const STATUS_FULL = /满了|已满|坐满|\bfull\b/
const STATUS_CANCELLED = /取消|不去了|\bcancel(l?ed)?\b|no longer/
const STATUS_FULFILLED = /解决了|搞定了|不用了|找到(人|车)了|已经约好|\bsorted\b|\bfound (a|my) ride\b|\bcompleted\b/
const ACCEPT = /太好了|可以|好的|算我一个|我也去|\bsounds good\b|\bcount me in\b|\bi'?m in\b|\bworks for me\b/
const ACK = /^(谢谢|感谢|好的|收到|明白|哈哈|thanks|thank you|thx|got it|that solved|that works|ok\b|okay)/
const CORRECTION = /changed|no longer|now\b|更正|变了|改了|已经不/
const QUESTION_END = /[?？]\s*$/

const isStatusText = (t: string) => STATUS_FULL.test(t) || STATUS_CANCELLED.test(t) || STATUS_FULFILLED.test(t)
const statusOf = (t: string): EventState | null => STATUS_FULL.test(t) ? 'full' : STATUS_CANCELLED.test(t) ? 'cancelled' : STATUS_FULFILLED.test(t) ? 'fulfilled' : null

// ---------- 草稿路由 ----------
export function routeIntent(value: string): Route {
  const text = lower(value)
  if (!text) return 'none'
  if (isStatusText(text)) return 'none'
  const withoutKnow = stripKnow(text)
  const asksInfo = KNOW_PHRASE.test(text) || KNOWLEDGE.test(withoutKnow)
  const coordination = REQUEST.test(withoutKnow) || OFFER.test(withoutKnow)
  if (PAST.test(text) && !asksInfo) return 'none'
  if (coordination && asksInfo) return 'mixed'
  if (coordination) return 'task'
  if (asksInfo) return 'knowledge'
  return 'none'
}

// ---------- 主题与相关度 ----------
const CONCEPTS: Record<string, RegExp> = {
  grocery: /grocery|groceries|shopping|costco|trader joe|target|walmart|超市|买菜|购物|日用品/,
  weekend: /weekend|saturday|sunday|周末|周六|周日|星期六|星期天|礼拜/,
  airport: /airport|机场/,
  ride: /\bride\b|\bdrive\b|\bcar\b|uber|lyft|carpool|搭车|拼车|开车|顺风车|没车|没有车/,
  parking: /parking|permit|停车/,
  printing: /print|打印/,
  transit: /\bbus\b|route|transit|公交|巴士|路线|地铁/,
  library: /library|图书馆/
}
const STOPWORDS = new Set(['anyone', 'going', 'where', 'what', 'how', 'with', 'about', 'the', 'and', 'for', 'this', 'that', 'can', 'get', 'does', 'know', 'there', 'without', 'need'])
const conceptsOf = (text: string) => new Set(Object.entries(CONCEPTS).filter(([, re]) => re.test(text)).map(([k]) => k))
function queryTerms(value: string) {
  const normalized = lower(value).replace(/[^\p{L}\p{N}']+/gu, ' ')
  const words = normalized.split(/\s+/).filter(w => /^[a-z0-9']+$/.test(w) && w.length > 2 && !STOPWORDS.has(w))
  const chinese = [...normalized.replace(/[a-z0-9'\s]/g, '')]
  const bigrams: string[] = []
  for (let i = 0; i < chinese.length - 1; i += 1) bigrams.push(chinese[i] + chinese[i + 1])
  return { words: [...new Set(words)], bigrams: [...new Set(bigrams)] }
}
export function relevance(value: string, message: Message) {
  const text = lower(message.text)
  const { words, bigrams } = queryTerms(value)
  const wordScore = words.filter(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)).length * 2
  const bigramScore = bigrams.filter(b => text.includes(b)).length * 2
  const shared = [...conceptsOf(lower(value))].filter(c => conceptsOf(text).has(c)).length * 3
  return wordScore + bigramScore + shared
}

// ---------- 消息级分类 ----------
function latestOpenTaskBy(senderId: string, before: Message, history: Message[], taskIds: Set<string>) {
  return history
    .filter(m => m.senderId === senderId && taskIds.has(m.id) && +new Date(m.sentAt) < +new Date(before.sentAt))
    .sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt))[0]
}

function baseAct(text: string, parent: Message | undefined): SpeechAct {
  if (ACK.test(text) && text.length < 40) return 'acknowledgement'
  const asksInfo = KNOW_PHRASE.test(text)
  const withoutKnow = stripKnow(text)
  if (OFFER.test(withoutKnow)) return 'offer'
  if (REQUEST.test(withoutKnow) && !asksInfo) return 'request'
  if (QUESTION_END.test(text) || asksInfo) return 'question'
  if (PAST.test(text)) return 'experience'
  if (parent || text.length >= 40) return 'answer'
  return 'chitchat'
}

export function classifyMessages(history: Message[]): Record<string, MessageClass> {
  const byId = new Map(history.map(m => [m.id, m]))
  const ordered = [...history].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
  const result: Record<string, MessageClass> = {}
  const taskIds = new Set<string>()
  for (const m of ordered) {
    const text = lower(m.text)
    const parent = m.replyToId ? byId.get(m.replyToId) : undefined
    const parentClass = parent ? result[parent.id] : undefined
    const parentIsTask = !!parentClass && ['request', 'offer'].includes(parentClass.speech_act)
    let act = baseAct(text, parent)
    let updates: Update | null = null

    const state = statusOf(text)
    if (state && (parentIsTask || !['request', 'offer'].includes(act))) {
      const target = parentIsTask ? parent : latestOpenTaskBy(m.senderId, m, ordered, taskIds)
      if (target) { act = 'status_update'; updates = { target_message_id: target.id, new_state: state } }
    } else if (parentIsTask && parentClass!.speech_act === 'offer' && parent!.senderId !== m.senderId && ACCEPT.test(text)) {
      // 接受他人的提供：关闭接受者自己此前的同主题请求
      const offerTopics = conceptsOf(lower(parent!.text))
      const own = latestOpenTaskBy(m.senderId, m, ordered, taskIds)
      if (own && [...conceptsOf(lower(own.text))].some(c => offerTopics.has(c))) {
        act = 'status_update'
        updates = { target_message_id: own.id, new_state: 'fulfilled' }
      }
    } else if (parentClass?.speech_act === 'answer' && CORRECTION.test(text)) {
      act = 'answer'
      updates = { target_message_id: parent!.id, new_state: 'corrected' }
    }

    if (act === 'request' || act === 'offer') taskIds.add(m.id)
    const answersQuestion = act === 'answer' && parentClass?.speech_act === 'question' ? parent!.id : null
    result[m.id] = {
      speech_act: act,
      needs_counterpart: act === 'request' || act === 'offer',
      reusable: act === 'answer' && text.length >= 40,
      answers_message_id: answersQuestion,
      updates
    }
  }
  return result
}

// ---------- 事件最终状态 ----------
export function deriveEventStates(history: Message[], classes = classifyMessages(history)) {
  const states: Record<string, EventState> = {}
  const ordered = [...history].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
  for (const m of ordered) {
    const c = classes[m.id]
    if (c.speech_act === 'request' || c.speech_act === 'offer') states[m.id] = 'open'
    const u = c.updates
    if (u && u.new_state !== 'corrected' && u.target_message_id in states) states[u.target_message_id] = u.new_state
  }
  return states
}

export function actionableTasks(history: Message[], nowIso: string, classes = classifyMessages(history)) {
  const now = +new Date(nowIso)
  const states = deriveEventStates(history, classes)
  return history.filter(m => states[m.id] === 'open' && now - +new Date(m.sentAt) <= TASK_WINDOW_MS && now >= +new Date(m.sentAt))
}

// ---------- 匹配 ----------
export function findMatch(route: Route, value: string, history: Message[], nowIso: string): Match | null {
  if (route === 'none') return null
  const classes = classifyMessages(history)
  const rank = (pool: Message[]) => pool
    .map(message => ({ message, score: relevance(value, message) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.message.sentAt) - +new Date(a.message.sentAt))
  // 同分时优先内容更完整的回答
  const rankAnswers = (pool: Message[]) => rank(pool).sort((a, b) => b.score - a.score || b.message.text.length - a.message.text.length)

  const tasks = rank(actionableTasks(history, nowIso, classes))
  // 知识候选只取实质回答；不受 72 小时窗口限制
  const answers = rankAnswers(history.filter(m => classes[m.id].speech_act === 'answer' && classes[m.id].reusable))

  const useTasks = route === 'task' || (route === 'mixed' && tasks.length > 0)
  const pool = useTasks ? tasks : route === 'knowledge' || route === 'mixed' ? answers : []
  const best = pool[0]?.message
  if (!best) return null

  if (useTasks) {
    return { route: 'task', label: `发现 ${pool.length} 条可联系的近期需求`, query: value.trim(), source: best, related: pool.slice(1, 3).map(item => item.message) }
  }
  // 同一讨论串中的提问、其他回答，以及针对其中任一回答的更正，一起作为来源
  const root = classes[best.id].answers_message_id ?? best.replyToId ?? best.id
  const thread = new Set([root, ...history.filter(m => m.replyToId === root).map(m => m.id)])
  const related = history
    .filter(m => m.id !== best.id && (thread.has(m.id) || (m.replyToId !== undefined && thread.has(m.replyToId))))
    .filter(m => classes[m.id].speech_act !== 'acknowledgement')
    .sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
    .slice(0, 3)
  return { route: 'knowledge', label: '群内找到相关讨论', query: value.trim(), source: best, related }
}
