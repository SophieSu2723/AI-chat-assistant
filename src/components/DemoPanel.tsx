import { useState, type ReactNode } from 'react'
import { GROUP } from '../fixtures'
import type { Copy, Lang } from '../i18n'
import { Close } from '../icons'
import type { ImportedMessage } from '../ui'

export const TRY_DRAFTS = [
  'Anyone going grocery shopping this weekend?',
  'How do I get to Costco without a car?',
  '周末有人一起去超市吗？没车的话怎么去 Costco？',
  'Where do new students apply for a parking permit?',
  'I went grocery shopping last weekend.',
  'What does printing cost?'
]
export type Outcome = 'task' | 'knowledge' | 'mixed' | 'none'

type PanelProps = { t: Copy; lang: Lang; outcomes: Outcome[]; onLang: (lang: Lang) => void; onTry: (text: string) => void; onImport: () => void; onReset: () => void }

// 演示控制：宽屏时固定在右侧，窄屏从 ☰ 打开
export function DemoPanel({ t, lang, outcomes, onLang, onTry, onImport, onReset }: PanelProps) {
  return (
    <div className="demo-panel">
      <div><h2 className="panel-title">{t.panelTitle}</h2><p className="panel-sub">{t.panelSub}</p></div>
      <div className="panel-group">
        <div className="kicker">{t.langLabel}</div>
        <div className="segmented" role="group" aria-label={t.langLabel}>
          <button aria-pressed={lang === 'zh'} onClick={() => onLang('zh')}>中文</button>
          <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
        </div>
      </div>
      <div className="panel-group">
        <div className="kicker">{t.tryLabel}</div>
        {TRY_DRAFTS.map((text, i) => (
          <button className="btn btn-secondary try" key={text} onClick={() => onTry(text)}>
            <span>{text}</span><span className="tag tag-neutral">{t.outcome[outcomes[i]]}</span>
          </button>
        ))}
        <p className="panel-note">{t.typedNote}</p>
      </div>
      <div className="panel-group">
        <button className="btn btn-secondary" onClick={onImport}>{t.importLabel}</button>
        <button className="btn btn-secondary" onClick={onReset}>{t.reset}</button>
      </div>
    </div>
  )
}

export function MenuSheet({ t, onClose, children }: { t: Copy; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" style={{ zIndex: 7 }}>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={t.menu}>
        <div className="handle" />
        <div className="sheet-head"><span className="kicker">{t.menu}</span><button className="icon-btn" onClick={onClose} aria-label={t.close}><Close /></button></div>
        {children}
      </section>
    </div>
  )
}

function parseWechatText(value: string): ImportedMessage[] {
  const lines = value.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean)
  const stamp = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})$/
  const parsed: ImportedMessage[] = []
  for (let index = 0; index < lines.length - 1;) {
    const name = lines[index]
    const match = lines[index + 1].match(stamp)
    if (!match) { index += 1; continue }
    index += 2
    const content: string[] = []
    while (index < lines.length && !(index + 1 < lines.length && stamp.test(lines[index + 1]))) content.push(lines[index++])
    const text = content.join('\n')
    if (!text || /^\[(Photo|图片|Sticker|表情|Video|视频|File|文件)\]/i.test(text)) continue
    const [, year, month, day, hour, minute] = match
    const senderId = `import-${encodeURIComponent(name).replace(/%/g, '')}`
    parsed.push({ id: `import-${Date.now()}-${parsed.length}`, groupId: GROUP.id, senderId, senderName: name, text, sentAt: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+08:00` })
  }
  return parsed
}

export function ImportSheet({ t, onClose, onImport }: { t: Copy; onClose: () => void; onImport: (items: ImportedMessage[]) => void }) {
  const [value, setValue] = useState('')
  const [notice, setNotice] = useState('')
  const submit = () => { const items = parseWechatText(value); if (!items.length) { setNotice(t.importNone); return } onImport(items) }
  return (
    <div className="overlay" style={{ zIndex: 7 }}>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={t.importTitle}>
        <div className="handle" />
        <div className="sheet-head">
          <div><div className="kicker accent">{t.importKicker}</div><h2 className="sheet-title">{t.importTitle}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}><Close /></button>
        </div>
        <p className="import-hint">{t.importHint}</p>
        <textarea id="import-text" className="import-textarea" aria-label={t.importTitle} value={value} onChange={e => { setValue(e.target.value); setNotice('') }} placeholder={'用户A\n2026/09/11 7:13\n测试内容'} />
        <p className="import-notice">{notice || t.importNotice}</p>
        <button className="btn btn-primary btn-block btn-tall" onClick={submit}>{t.importButton}</button>
      </section>
    </div>
  )
}
