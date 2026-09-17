// 用法：
//   node run-eval.mjs --baseline          最初的关键词规则（修复前的 App.tsx，保留作对照）
//   node run-eval.mjs --rules             当前规则版 src/matching.ts（需要 Node 22.18 及以上，可直接运行 .ts）
//   大模型模式（--provider 默认 anthropic）：
//   ANTHROPIC_API_KEY=... node run-eval.mjs --llm
//   GEMINI_API_KEY=...    node run-eval.mjs --llm --provider gemini [--model gemini-2.5-flash]
//   GITHUB_TOKEN=...      node run-eval.mjs --llm --provider github [--model openai/gpt-4o-mini]
//                         node run-eval.mjs --llm --provider ollama [--model qwen3:8b]
//   可选 --rpm <每分钟请求数> 覆盖默认限速；--out <名称> 指定结果文件名
// 结果写入 results/<mode>.json，并在终端输出摘要。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const mode = args.includes('--llm') ? 'llm' : args.includes('--rules') ? 'rules' : 'baseline'
const opt = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const PROVIDERS = {
  anthropic: { keyEnv: 'ANTHROPIC_API_KEY', model: 'claude-haiku-4-5-20251001', rpm: 0 },
  gemini: { keyEnv: 'GEMINI_API_KEY', model: 'gemini-2.5-flash', rpm: 8, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  github: { keyEnv: 'GITHUB_TOKEN', model: 'openai/gpt-4o-mini', rpm: 12, baseUrl: 'https://models.github.ai/inference' },
  ollama: { keyEnv: null, model: 'qwen3:8b', rpm: 0, baseUrl: opt('--base-url', 'http://localhost:11434/v1') }
}
const providerName = opt('--provider', 'anthropic')
const provider = PROVIDERS[providerName]
if (mode === 'llm') {
  if (!provider) { console.error(`未知的 provider：${providerName}，可选 ${Object.keys(PROVIDERS).join(' / ')}`); process.exit(1) }
  if (provider.keyEnv && !process.env[provider.keyEnv]) { console.error(`缺少 ${provider.keyEnv}，大模型模式无法运行`); process.exit(1) }
}
const model = opt('--model', provider?.model)
const rpm = Number(opt('--rpm', provider?.rpm ?? 0))
const outName = opt('--out', mode === 'llm' ? `llm-${providerName}` : mode)
const data = JSON.parse(readFileSync(new URL('./dataset.json', import.meta.url)))
const schemas = JSON.parse(readFileSync(new URL('./schemas.json', import.meta.url)))
const fill = s => s.replaceAll('{{NOW}}', data.now).replaceAll('{{TZ}}', data.tz)
const draftPrompt = fill(readFileSync(new URL('./prompts/draft-intent.md', import.meta.url), 'utf8'))
const messagePrompt = fill(readFileSync(new URL('./prompts/message-classify.md', import.meta.url), 'utf8'))
const byId = Object.fromEntries(data.messages.map(m => [m.id, m]))
const NOW = +new Date(data.now)
const WINDOW = 72 * 60 * 60 * 1000

// ---------- 基线：修复前 src/App.tsx 的实现 ----------
function routeIntent(value) {
  const text = value.toLowerCase().trim()
  if (!text) return 'none'
  const task = /anyone|who can|looking for|need (a |an )?(ride|partner|help)|carpool|一起|有人|搭车|拼车|求助|组队|找人|需要帮/.test(text)
  const knowledge = /how|where|what|why|when|can i|怎么|如何|哪里|多少钱|流程|为什么|吗|？/.test(text)
  return task && knowledge ? 'mixed' : task ? 'task' : knowledge ? 'knowledge' : 'mixed'
}
const isTaskMessage = t => /anyone|looking for|need (a |an )?(ride|partner|help)|can someone|一起|有人|搭车|拼车|求助|组队|找人|需要帮|谁能/.test(t.toLowerCase())
const isClosed = t => /full|cancelled|canceled|completed|已满|满了|取消|结束|不用了/.test(t.toLowerCase())

function baselineDraft(d) { return { route: routeIntent(d.text) } }
function baselineMessage(m) {
  // 基线没有言语行为概念，只能粗略映射：任务词 → request，其余 → answer（即 findMatch 中的知识池）
  const act = isTaskMessage(m.text) ? 'request' : 'answer'
  return { speech_act: act, needs_counterpart: act === 'request', reusable: act === 'answer', answers_message_id: null, updates: null, closed_by_own_text: isClosed(m.text) }
}

// ---------- 大模型 ----------
const sleep = ms => new Promise(r => setTimeout(r, ms))
let nextSlot = 0
async function throttle() {
  if (!rpm) return
  const gap = Math.ceil(60000 / rpm)
  const wait = Math.max(0, nextSlot - Date.now())
  nextSlot = Math.max(nextSlot, Date.now()) + gap
  if (wait) await sleep(wait)
}
function parseJsonText(text) {
  const cleaned = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('模型没有返回 JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}
async function request(url, headers, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle()
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(retryAfter ? retryAfter * 1000 : Math.min(60000, 5000 * 2 ** attempt))
      continue
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`)
    return json
  }
  throw new Error('请求多次被限速或失败，请降低 --rpm 后重试')
}
// 部分 OpenAI 兼容接口（如 Gemini）不接受 type 数组，改写为单一类型加 nullable
function compatSchema(node) {
  if (Array.isArray(node)) return node.map(compatSchema)
  if (!node || typeof node !== 'object') return node
  const out = {}
  for (const [k, v] of Object.entries(node)) out[k] = compatSchema(v)
  if (Array.isArray(node.type)) { out.type = node.type.find(t => t !== 'null') ?? 'string'; if (node.type.includes('null')) out.nullable = true }
  return out
}
async function callTool(system, user, tool) {
  if (providerName === 'anthropic') {
    const body = await request('https://api.anthropic.com/v1/messages',
      { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: 800, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: user }] })
    const block = body.content?.find(b => b.type === 'tool_use')
    if (!block) throw new Error('模型未返回工具调用')
    return block.input
  }
  // OpenAI 兼容接口：Gemini、GitHub Models、Ollama
  const headers = provider.keyEnv ? { authorization: `Bearer ${process.env[provider.keyEnv]}` } : {}
  const schemaHint = `\n\n必须调用 ${tool.name} 函数输出结果；如果无法调用函数，只输出一个符合以下 JSON schema 的对象，不要输出其他文字：\n${JSON.stringify(tool.input_schema)}`
  const body = await request(`${provider.baseUrl}/chat/completions`, headers, {
    model, temperature: 0, max_tokens: 1500,
    messages: [{ role: 'system', content: system + schemaHint }, { role: 'user', content: user }],
    tools: [{ type: 'function', function: { name: tool.name, description: tool.description, parameters: compatSchema(tool.input_schema) } }],
    tool_choice: 'required'
  })
  const message = body.choices?.[0]?.message
  const call = message?.tool_calls?.[0]
  if (call) return typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments
  return parseJsonText(message?.content)
}
const fmt = m => `[${m.id}] ${m.sender} @ ${m.sentAt}${m.replyToId ? ` (回复 ${m.replyToId})` : ''}: ${m.text}`
function contextFor(m) {
  const ids = new Set()
  const parent = m.replyToId && byId[m.replyToId]
  if (parent) { ids.add(parent.id); if (parent.replyToId) ids.add(parent.replyToId) }
  for (const o of data.messages) {
    if (o.id === m.id) continue
    if (o.replyToId === m.id || (parent && o.replyToId === parent.id) || (parent && o.id === parent.replyToId)) ids.add(o.id)
    // 同一发送者在 target 回复对象之前的请求，用于识别"接受邀约"类消息实际关闭的是哪条请求
    if (parent && o.sender === m.sender && +new Date(o.sentAt) < +new Date(m.sentAt) && isTaskMessage(o.text) && NOW - +new Date(o.sentAt) <= WINDOW * 3) ids.add(o.id)
  }
  const ctx = [...ids].map(id => byId[id]).sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
  return `上下文：\n${ctx.length ? ctx.map(fmt).join('\n') : '（无）'}\n\ntarget：\n${fmt(m)}`
}
const llmDraft = d => callTool(draftPrompt, `草稿：${d.text}`, schemas.draft_intent)
const llmMessage = m => callTool(messagePrompt, contextFor(m), schemas.message_classify)

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: limit }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]) } catch (e) { out[k] = { error: String(e.message ?? e) } } } }))
  return out
}

// ---------- 事件状态推导 ----------
function deriveStates(preds) {
  const state = {}
  for (const m of data.messages) {
    const p = preds[m.id]
    if (p && ['request', 'offer'].includes(p.speech_act)) state[m.id] = p.closed_by_own_text ? 'closed' : 'open'
  }
  const ordered = [...data.messages].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
  for (const m of ordered) {
    const u = preds[m.id]?.updates
    if (u && u.target_message_id in state && u.new_state !== 'corrected') state[u.target_message_id] = u.new_state === 'rescheduled' ? 'open' : u.new_state
  }
  const actionable = Object.entries(state).filter(([id, s]) => s === 'open' && NOW - +new Date(byId[id].sentAt) <= WINDOW).map(([id]) => id).sort()
  return { state, actionable }
}

// ---------- 指标 ----------
const ROUTES = ['task', 'knowledge', 'mixed', 'none']
function draftMetrics(rows) {
  const confusion = Object.fromEntries(ROUTES.map(a => [a, Object.fromEntries(ROUTES.map(b => [b, 0]))]))
  let correct = 0
  for (const r of rows) { const p = r.pred?.route ?? 'error'; if (confusion[r.gold][p] !== undefined) confusion[r.gold][p]++; if (p === r.gold) correct++ }
  const perClass = Object.fromEntries(ROUTES.map(c => {
    const tp = confusion[c][c], fp = ROUTES.reduce((s, g) => s + (g !== c ? confusion[g][c] : 0), 0), fn = ROUTES.reduce((s, p) => s + (p !== c ? confusion[c][p] : 0), 0)
    return [c, { precision: tp + fp ? +(tp / (tp + fp)).toFixed(2) : null, recall: tp + fn ? +(tp / (tp + fn)).toFixed(2) : null }]
  }))
  const noneRows = rows.filter(r => r.gold === 'none')
  const falseTrigger = noneRows.filter(r => r.pred?.route && r.pred.route !== 'none').length
  return { accuracy: +(correct / rows.length).toFixed(2), correct, total: rows.length, false_trigger_rate: +(falseTrigger / noneRows.length).toFixed(2), false_triggers: `${falseTrigger}/${noneRows.length}`, perClass, confusion }
}
function messageMetrics(rows) {
  const tally = {}
  const add = (k, ok) => { tally[k] ??= [0, 0]; tally[k][1]++; if (ok) tally[k][0]++ }
  const sameUpdate = (a, b) => (a == null && b == null) || (a && b && a.target_message_id === b.target_message_id && a.new_state === b.new_state)
  for (const { gold, pred } of rows) {
    if (!pred || pred.error) continue
    add('speech_act', gold.speech_act.includes(pred.speech_act))
    if ('needs_counterpart' in gold) add('needs_counterpart', gold.needs_counterpart === pred.needs_counterpart)
    if ('reusable' in gold) add('reusable', gold.reusable === pred.reusable)
    if ('answers_message_id' in gold) add('answers_message_id', gold.answers_message_id === pred.answers_message_id)
    if ('updates' in gold) add('updates', sameUpdate(gold.updates, pred.updates))
  }
  return Object.fromEntries(Object.entries(tally).map(([k, [ok, n]]) => [k, `${ok}/${n}`]))
}

// ---------- 运行 ----------
let draftPreds, msgPredList
if (mode === 'llm') {
  const limit = rpm ? 1 : 4
  console.log(`provider=${providerName} model=${model} rpm=${rpm || '不限'}，共 ${data.drafts.length + data.messages.length} 次请求`)
  draftPreds = await mapLimit(data.drafts, limit, llmDraft)
  msgPredList = await mapLimit(data.messages, limit, llmMessage)
} else if (mode === 'rules') {
  const rules = await import('../src/matching.ts')
  const history = data.messages.map(m => ({ id: m.id, groupId: 'eval', senderId: m.sender, text: m.text, sentAt: m.sentAt, replyToId: m.replyToId }))
  const classes = rules.classifyMessages(history)
  draftPreds = data.drafts.map(d => ({ route: rules.routeIntent(d.text) }))
  msgPredList = data.messages.map(m => classes[m.id])
} else {
  draftPreds = data.drafts.map(baselineDraft)
  msgPredList = data.messages.map(baselineMessage)
}
const msgPreds = Object.fromEntries(data.messages.map((m, i) => [m.id, msgPredList[i]]))

const draftRows = data.drafts.map((d, i) => ({ id: d.id, text: d.text, gold: d.route, pred: draftPreds[i], note: d.note }))
const msgRows = data.messages.map(m => ({ id: m.id, gold: m.label, pred: msgPreds[m.id] }))
const events = deriveStates(msgPreds)
const eventRows = Object.entries(data.event_states.expected).map(([id, gold]) => ({ id, gold, pred: events.state[id] ?? 'not_detected' }))
const expectedActionable = [...data.event_states.actionable_within_72h].sort()

const report = {
  mode, provider: mode === 'llm' ? providerName : null, model: mode === 'llm' ? model : null, now: data.now,
  drafts: draftMetrics(draftRows),
  messages: messageMetrics(msgRows),
  events: {
    state_accuracy: `${eventRows.filter(r => r.gold === r.pred).length}/${eventRows.length}`,
    states: eventRows,
    actionable_pred: events.actionable, actionable_gold: expectedActionable,
    actionable_exact_match: JSON.stringify(events.actionable) === JSON.stringify(expectedActionable)
  },
  request_errors: [...draftRows, ...msgRows].filter(r => r.pred?.error).map(r => ({ id: r.id, error: r.pred.error })),
  errors: { drafts: draftRows.filter(r => r.pred?.route !== r.gold).map(r => ({ id: r.id, text: r.text, gold: r.gold, pred: r.pred?.route ?? r.pred?.error, note: r.note })) },
  raw: { drafts: draftRows, messages: msgRows }
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true })
writeFileSync(new URL(`./results/${outName}.json`, import.meta.url), JSON.stringify(report, null, 2))

console.log(`\n== ${mode}${report.model ? ` (${providerName} / ${report.model})` : ''} ==`)
console.log(`草稿路由 准确率 ${report.drafts.correct}/${report.drafts.total} (${report.drafts.accuracy})，误触发 ${report.drafts.false_triggers} (${report.drafts.false_trigger_rate})`)
console.table(report.drafts.perClass)
console.log('混淆矩阵（行=标注，列=预测）'); console.table(report.drafts.confusion)
console.log('消息级字段', report.messages)
console.log(`事件状态 ${report.events.state_accuracy}`); console.table(eventRows)
console.log(`72h 内可联系请求：预测 ${JSON.stringify(events.actionable)}，标注 ${JSON.stringify(expectedActionable)}`)
if (report.request_errors.length) { console.log(`\n请求失败 ${report.request_errors.length} 次（不计入准确率分母以外的字段，路由按错误计）：`); console.table(report.request_errors) }
console.log('\n草稿误判：'); console.table(report.errors.drafts)
