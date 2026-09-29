// 知识卡片演示数据与状态推导。卡片正文是模拟的 AI 草稿（接入模型后由服务端生成），
// 每条结论都引用 fixtures 中真实存在的消息 ID。卡片是否“待复核”不写死，而是由消息级分类中的更正推出。
import type { Message } from './fixtures'
import type { Lang } from './i18n'
import type { MessageClass } from './matching'

type Text = Record<Lang, string>
export type Claim = { n: number; text: Text; sourceIds: string[]; fix?: { text: Text; sourceIds: string[] } }
export type KnowledgeCardDef = {
  id: string; code: string; question: Text; claims: Claim[]
  applicability: Record<Lang, [string, string][]>; unknowns: Text; signals: Text
  threadIds: string[]; sourceRange: string; generatedAt: string
  summary: { v1: Text; v2?: Text }
  conflict?: { old: Text; new: Text }
  review: { v1: Text; history: string }
}
export type ReviewDecision = 'keep' | 'use'
export type CardState = { version: number; decisions: Record<number, ReviewDecision>; reviewedLabel?: Text; history?: string }
export type CardStatus = 'needs-review' | 'published'

export const CARDS: KnowledgeCardDef[] = [
  {
    id: 'kc14', code: 'KC-014',
    question: { en: 'How do I get to Costco without a car?', zh: '没有车怎么去 Costco？' },
    claims: [
      { n: 1, text: { en: 'Bus 6 from campus to Central Station, then the 118 toward Costco.', zh: '从校园乘 6 路到中央车站，再换乘 118 路前往 Costco。' }, sourceIds: ['m-202'] },
      { n: 2, text: { en: 'About 45–55 minutes; the transfer is indoors.', zh: '全程约 45–55 分钟；换乘在室内。' }, sourceIds: ['m-202'],
        fix: { text: { en: 'About 45–55 minutes; the Central Station transfer is now outdoors.', zh: '全程约 45–55 分钟；中央车站换乘现在在室外。' }, sourceIds: ['m-210'] } },
      { n: 3, text: { en: 'Weekend service every 30 minutes.', zh: '周末每 30 分钟一班。' }, sourceIds: ['m-202'],
        fix: { text: { en: 'Sunday buses run hourly. Saturday frequency not stated.', zh: '周日每小时一班；周六班次未提及。' }, sourceIds: ['m-210'] } },
      { n: 4, text: { en: 'The 118 stop is on the east side, near the pharmacy entrance.', zh: '118 路站点在 Costco 东侧，靠近药房入口。' }, sourceIds: ['m-203'] }
    ],
    applicability: { en: [['From', 'Campus'], ['Term', 'Fall 2026'], ['Days', 'Sun differs']], zh: [['出发地', '校园'], ['学期', '2026 秋季'], ['日期', '周日不同']] },
    unknowns: { en: 'Fare · Saturday frequency after the route change', zh: '票价 · 线路调整后的周六班次' },
    signals: { en: 'Asked once (Zoe) · answered by Mia and Ravi · corrected by Leo 9/14', zh: '提问 1 次（Zoe）· Mia、Ravi 回答 · Leo 9/14 更正' },
    threadIds: ['m-201', 'm-202', 'm-203', 'm-210'], sourceRange: '9/2 – 9/14', generatedAt: '9/9',
    summary: {
      v1: { en: 'Bus 6 to Central Station, then the 118. About 45–55 min.', zh: '6 路到中央车站，换乘 118 路，约 45–55 分钟。' },
      v2: { en: 'Bus 6 to Central Station, then the 118. About 45–55 min; the transfer is outdoors and Sunday buses are hourly.', zh: '6 路到中央车站，换乘 118 路，约 45–55 分钟；换乘在室外，周日每小时一班。' }
    },
    conflict: { old: { en: 'Transfer indoors; buses every 30 min', zh: '室内换乘；每 30 分钟一班' }, new: { en: 'Transfer now outdoors; Sundays hourly', zh: '现为室外换乘；周日每小时一班' } },
    review: { v1: { en: '9/10 · Leo (simulated)', zh: '9/10 · Leo（模拟）' }, history: 'v1 · 9/10' }
  },
  {
    id: 'kc09', code: 'KC-009',
    question: { en: 'Where do new students apply for a parking permit?', zh: '新生在哪里申请停车证？' },
    claims: [
      { n: 1, text: { en: 'Apply in the Campus Mobility portal and choose “student resident.”', zh: '在 Campus Mobility 平台申请，选择“student resident”。' }, sourceIds: ['m-205'] },
      { n: 2, text: { en: 'Upload your housing confirmation.', zh: '上传住宿证明。' }, sourceIds: ['m-205'] },
      { n: 3, text: { en: 'Collect the permit from Building C.', zh: '到 C 栋领取停车证。' }, sourceIds: ['m-205'] },
      { n: 4, text: { en: 'Fall applications open after Aug 20.', zh: '秋季申请 8 月 20 日后开放。' }, sourceIds: ['m-205'] }
    ],
    applicability: { en: [['Who', 'New students'], ['Term', 'Fall 2026'], ['Where', 'Campus']], zh: [['适用', '新生'], ['学期', '2026 秋季'], ['地点', '校园']] },
    unknowns: { en: 'Cost · processing time', zh: '费用 · 办理时长' },
    signals: { en: 'Asked 3 times (Noah, Zoe, Ravi) · one detailed answer · Mia: “That solved it”', zh: '被问 3 次（Noah、Zoe、Ravi）· 一条详细回答 · Mia：“That solved it”' },
    threadIds: ['m-204', 'm-205', 'm-206', 'm-207', 'm-208'], sourceRange: '8/28 – 9/12', generatedAt: '8/30',
    summary: { v1: { en: 'Campus Mobility portal → “student resident” → upload housing confirmation → collect at Building C.', zh: 'Campus Mobility 平台 → 选“student resident” → 上传住宿证明 → C 栋领取。' } },
    review: { v1: { en: '9/1 · Zoe (simulated)', zh: '9/1 · Zoe（模拟）' }, history: 'v1 · 9/1' }
  }
]

// 反复被问但没有实质回答的问题：不生成卡片，只列在“有人问、没人答”
export const UNANSWERED = [{ ids: ['m-211', 'm-212'], topic: { en: 'Library printer price', zh: '图书馆打印价格' } }]

export const initialCardState = (): CardState => ({ version: 1, decisions: {} })

// 当前版本已采纳的来源；之后出现的、针对这些来源的更正会让卡片进入待复核
function incorporated(card: KnowledgeCardDef, state: CardState) {
  const ids = new Set(card.claims.flatMap(c => c.sourceIds))
  if (state.version > 1) card.claims.forEach(c => c.fix?.sourceIds.forEach(id => ids.add(id)))
  return ids
}
export function pendingCorrections(card: KnowledgeCardDef, state: CardState, classes: Record<string, MessageClass>) {
  const used = incorporated(card, state)
  return Object.entries(classes)
    .filter(([id, c]) => c.updates?.new_state === 'corrected' && used.has(c.updates.target_message_id) && !used.has(id))
    .map(([id]) => id)
}
export function cardStatus(card: KnowledgeCardDef, state: CardState, classes: Record<string, MessageClass>): CardStatus {
  return pendingCorrections(card, state, classes).length ? 'needs-review' : 'published'
}

// 发布后显示的结论：采用更正的换成新文本和新来源，保留 v1 的维持原样
export function publishedClaims(card: KnowledgeCardDef, state: CardState) {
  return card.claims.map(c => state.version > 1 && c.fix && state.decisions[c.n] === 'use' ? { ...c, text: c.fix.text, sourceIds: c.fix.sourceIds, fix: undefined } : c)
}

export function cardSummary(card: KnowledgeCardDef, state: CardState, lang: Lang) {
  const usedFix = state.version > 1 && Object.values(state.decisions).includes('use')
  return (usedFix && card.summary.v2 ? card.summary.v2 : card.summary.v1)[lang]
}

export const cardForAnswer = (id: string) => CARDS.find(card => card.claims.some(c => c.sourceIds.includes(id)))

export function unansweredTopics(history: Message[], classes: Record<string, MessageClass>) {
  const answered = new Set(Object.values(classes).map(c => c.answers_message_id).filter(Boolean))
  return UNANSWERED
    .map(topic => ({ ...topic, messages: history.filter(m => topic.ids.includes(m.id)) }))
    .filter(topic => topic.messages.length && topic.messages.every(m => !answered.has(m.id)))
}
