# Handoff: Campus Circle: refined AI flows

Target repo: `SophieSu2723/AI-chat-assistant` (branch `main`).

> Implementation status (2026-09-30): this design is implemented in `src/` (see the repo README's “Local demo” section). The React app derives results from `src/matching.ts` instead of the prototype's keyword stand-in, so the same six demo drafts produce the same screens. The prototype files remain the visual reference. Target app: React + TypeScript + Vite, mobile-first PWA (`src/App.tsx`, `src/styles.css`, `src/import.css`, `src/matching.ts`, `src/fixtures.ts`).

## Overview
This redesign covers the private-suggestion and knowledge surfaces described in the repo's README and `build-plan.md` steps 2–7:
- Private suggestion prompt → result sheet (task, knowledge, **mixed with labeled sections**)
- **Source viewer** (stacked sheet showing the original thread, with the cited message highlighted and corrections tagged)
- **Temporary chat**: an editable pre-send draft screen, then a thread with a pinned request and **labeled simulated replies**
- **Ongoing chats** list (new "Chats" tab)
- **Group knowledge** area (new "Knowledge" tab), **knowledge card anatomy**, **needs-review state**, **simulated reviewer mode** with claim-level decisions and **v2 publishing** that keeps v1 in history
- **中文 / EN** toggle that switches all UI copy. Message content (application data) is never translated.

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behavior, not production code to copy. Recreate them in the existing React app with its patterns: function components, `useState`/`useEffect`, localStorage persistence and plain CSS files. Keep the matching logic in `src/matching.ts`; the prototype uses a simplified keyword stand-in only to drive the demo.

- `Campus Circle Prototype.dc.html` is the clickable prototype and the source of truth for flows. Open it in a browser alongside `support.js` and `_ds/`.
- `Campus Circle Prototype (standalone).html` is the same prototype as one offline file.
- `Flows Board.dc.html` is the options board. The chosen options are 1a (source viewer), 2a (card), 3a+3b (needs review), 4b→4a (temporary chat) and 5a (chats list). Other options are kept for reference.

## Fidelity
**High fidelity.** Recreate the colors, type, spacing and copy exactly as specified below.

Two visual layers deliberately coexist:
1. **Chat chrome** (group header, feed bubbles, composer, blue send button, chat thread) stays exactly as it is in `src/styles.css`.
2. **AI surfaces** (suggestion line, sheets, source viewer, pinned request, knowledge area and cards, draft editor, chat list cards) use the **Industry** tokens (`_ds/.../styles.css`): steel accent, Barlow / Barlow Condensed, hairline borders.
   **Project override:** the user asked for **no corner registration marks** and a **7px radius on every framed element and button**, matching the chat input box. Sheets use `16px 16px 0 0`. Tags stay square.

---

## Design tokens

### Chat chrome (existing, unchanged, from `src/styles.css`)
| Token | Value |
|---|---|
| App ground | `#f5f5f5` |
| Header bg / border | `#fff` / `1px solid #ededed` |
| Header title | 18px / weight 650 / `#1f2024` |
| Header sub | 11px / `#8d8d91` |
| Bubble | `#fff`, radius `4px 15px 15px 15px`, padding `10px 13px`, 16px/1.45 |
| Sender name / time | 13px `#8d8d91` / 10px `#b0b0b4` |
| Avatar | 37px circle, 10px/700 white initials, author color |
| Composer wrap | `#eef0f3`, top border `1px solid #e4e5e7`, padding `8px 10px 14px` (the prototype uses 26px bottom for the iPhone home indicator; use `env(safe-area-inset-bottom)`) |
| Composer textarea | `#fff`, radius 7px, 15px/20px, min-height 38px, padding 9px |
| Send | `#1596e9`, disabled `#a9cce5`, radius 5px, height 38px, padding `0 12px` |
| Chat bubble (mine) | `#1596e9` / white, radius `14px 4px 14px 14px` |
| Chat bubble (theirs) | `#fff`, radius `4px 14px 14px 14px`, 15px/1.45 |
| Font | `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif` |
| Author colors | You `#7558d9`, Mia `#ee7662`, Leo `#4da7a0`, Ravi `#e2a940`, Zoe `#5d8ed5`, Noah `#ba699b` |

### AI surfaces (Industry)
| Token | Value |
|---|---|
| `--color-bg` (sheet/card ground) | `#f2f2f3` |
| `--color-text` | `#1d1f20` |
| `--color-accent` | `#5980a6` |
| `--color-divider` | `color-mix(in srgb, #1d1f20 16%, transparent)` |
| accent-100 / 300 / 700 / 800 / 900 | `#eef6ff` / `#b5d9fd` / `#416180` / `#2c455d` / `#1d2d3d` |
| neutral-300 / 400 / 600 / 700 / 800 / 900 | `#d4d4d7` / `#b7b7ba` / `#7a7a7d` / `#5d5d60` / `#424244` / `#2b2b2d` |
| Heading font | `"Barlow Condensed"` 600, letter-spacing −0.015em |
| Body font | `"Barlow"` 400/500 |
| Kicker | 10px, uppercase, letter-spacing .1em, `accent-700` (or `neutral-700 #5d5d60` for neutral kickers) |
| Radius | 7px for frames/buttons (project override), sheets `16px 16px 0 0`, tags 0 |
| Scrim | `#0005` |
| Shadow (toast) | `--shadow-md` `0 3px 10px rgba(43,43,45,.16)` |
| Icons | Lucide, stroke-width 1.5: chevron-left, x, sparkle, alert-triangle, lock |

Paragraph-size accent text must use `accent-700` or darker. The base accent fails contrast on `#f2f2f3`.

**Contrast rules (WCAG AA, 4.5:1 for text under 18px):**
- The primary button fill is **accent-700 `#416180`** with `#f2f2f3` text, and hover is **accent-800 `#2c455d`**. This overrides Industry's default `.btn-primary`, which uses accent `#5980a6`. The prototype panel's language toggle uses the same fill.
- All 10–12px secondary text and kickers that were neutral-600 now use **neutral-700 `#5d5d60`**. This includes claim numbers and struck-through v1 text.
- Tag colors and accent on large headings are unchanged.
- Accent-700 kickers (e.g. `仅你可见 · 模拟匹配`) stay accent-700.

Buttons (Industry classes): `.btn-secondary` has a hairline border, transparent fill, Barlow Condensed 600 14px, hover `rgba(text,.07)`. `.btn-primary` has an **accent-700 `#416180`** fill with `#f2f2f3` text and hover **accent-800 `#2c455d`** (see the contrast rules). Disabled is 45% opacity. Focus ring is `2px solid accent`, offset 2px.

Tags never wrap internally (`white-space: nowrap`); the row they sit in wraps instead. Tags: `.tag-accent` (accent-100 / accent-800), `.tag-neutral` (neutral-100 `#f5f5f8` / neutral-800), `.tag-outline` (1px accent border, accent text), "Needs review" (accent-900 fill, `#f2f2f3` text). All 11px, padding `3px 10px`.

---

## Screens / views
The frame is iPhone 390×844 with a 44px status bar. The app max-width stays 620px on desktop.

### A. Group (tab)
- Header (existing) with the sub line `24 人在线 · 演示时间 9/17 18:30` / `24 online · demo clock 9/17 18:30`. This covers build-plan step 1: show the demo clock.
- **New tab bar** under the header: 3 equal columns, white, bottom border `#ededed`, 14px, padding `10px 0`. Active: `#1f2024`, weight 600, `inset 0 -2px 0 #1596e9`. Inactive: `#8d8d91`. Labels `群聊 / 对话 / 知识` (`Group / Chats / Knowledge`). "Chats" shows ` · N` when conversations exist.
- The feed is unchanged, and it auto-scrolls to the bottom on send and on tab entry.
- **Suggestion line** (above the composer, only when a match exists): a `--color-bg` row, 1px divider border, 7px radius, margin `0 6px 8px`. Contents: sparkle icon (16px, accent), label (14px Barlow), `查看 › / View ›` (12px accent-700), and an × dismiss button.
  - Labels: task `过去 3 天有 1 条可联系的需求` / `1 open request from the past 3 days`. Knowledge `群里讨论过相关问题` / `This group has discussed a related question`. Knowledge needing review `相关讨论 · 卡片待复核` / `Related discussion · card needs review`. Mixed `1 条需求 · 1 条相关讨论` / `1 open request · 1 related discussion`.
- **Manual-search no-result box**: a 1px dashed neutral-400 border, 7px radius, 12px text, with the copy `未发现可用的相关需求或群内资料；你仍可直接发送。`.
- ⌕ shows `…` while loading (350ms).

### B. Result sheet (bottom sheet over a scrim)
- `--color-bg`, radius `16px 16px 0 0`, max-height 86%, padding `10px 16px 30px`, 12px gap. It has a 36×4 handle.
- Header: kicker `仅你可见 · 模拟匹配` / `Only you see this · simulated matching`. Title in Barlow Condensed 24px: `相关即时需求` / `来自群知识` / `需求与已有回答` (Related requests / From group knowledge / Requests and answers). Close is ×.
- **Mixed intent**: two labeled sections, `01 · 可以联系的人 / People to contact` and `02 · 群里已有的回答 / Answers already in this group`. Section labels are 10px uppercase neutral-700. Never stack two prompts.
- **Task result frame** (1px divider, 7px radius, padding 14px):
  - Avatar (28px) with name and time.
  - The original text at 15px/1.45.
  - Tags for dates and places extracted from the text only (`周日 / Sunday`, `Trader Joe’s`, and neutral `时间未定 / Time not set`).
  - The line `请先确认对方是否仍需要。` / `Check whether they’re still looking.` (12px accent-800).
  - Buttons: `查看原文 / View source` (secondary) and `就此发起对话 / Chat about this` (primary). The primary becomes `继续对话 / Continue chat` if a conversation already exists (dedupe).
- **Closed requests disclosure**: 12px neutral-700 text, `显示 2 条已关闭的需求（已满或已约好）▾`. Expanding it shows dashed rows for Leo (car full) and Mia (arranged). The rows can be tapped to open the source viewer. This makes the exclusion rule visible without offering those requests as actionable.
- **Knowledge compact card** (same frame):
  - An optional needs-review line with an alert icon: `待复核：后续消息更正了部分内容。`.
  - Question at 20px Barlow Condensed and summary at 14px.
  - Overlapping 18px source-author dots, then `N · sources range · status`.
  - Buttons: `View source` and `Open card` (primary).
- Footer note (12px neutral-700): `草稿已保留。发起对话不会通知对方。` / `Your draft is kept. Opening a chat does not notify anyone.`

### C. Source viewer (stacked sheet, option 1a)
- Opens over the result sheet or the card. A 40px `neutral-300` "peek" strip at top:84px suggests the sheet beneath. The sheet starts at top:100px with radius `16px 16px 0 0`.
- Header: back chevron, kicker `原始来源 · 仅你可见`, title `原始讨论 / Original discussion` (22px).
- Meta row: `Campus Circle` tag with `N messages · first – last date`, pluralized in English (`1 message`, `4 messages`).
- Messages in chronological order: 28px avatar, 10px gap, name (bold) with time, text at 14px/1.45. The **cited message** is framed with a 1px accent border, 7px radius and 12px padding, and tagged `被引用 / Cited`. Other messages get outline tags from the thread's role: `提问 Question`, `更正 Correction`, `反馈 Feedback`, `重复提问 Asked again`, `已满 Marked full`, `已约好 Arranged`.
- For a task with no follow-ups, the thread ends with `发布后群内没有后续消息，是否仍有效未知。`.
- Footer: full-width secondary `返回 / Back`. Closing returns to the previous surface without losing state.

### D. Opening draft (option 4b), before anything is sent
- Chat header: `私信 Ravi Shah` with sub `草稿 · 未发送`.
- "Replying to" block: 10px kicker, then the original text with a 1px accent left rule and 10px indent.
- Editable frame (`--color-bg`, divider border, 7px, padding 14px): kicker `开场白 · 可编辑` and a borderless textarea (16px/1.5, min-height 110px). Prefilled with a neutral opener that only restates the request and invents no plans for the user: `嗨 Ravi，在群里看到你周日想去 Trader Joe’s，还需要搭车吗？` / `Hi Ravi, I saw your Trader Joe’s request in Campus Circle. Are you still looking for a ride on Sunday?`
- Chip buttons (outline tag, 7px, nowrap) append text:
  - `+ 询问时间` / `+ Ask what time` appends `你几点方便？` / ` What time works for you?`
  - `+ 说明上车地点` / `+ Suggest a pickup spot` appends `你在哪里上车方便？` / ` Where would be easy to meet?`
- Lock icon with the note `Ravi 尚未收到任何通知。发送后才会创建对话，且不会出现在群聊中。`.
- Footer: `取消` (secondary, flex 1) and `发送给 Ravi` (flex 2, `#1596e9`, 7px, 44px high).
- **The conversation is created only on send** (README rule 2).

### E. Temporary chat (option 4a)
- Header `Ravi Shah` with sub `即时对话 · 演示模式`.
- **Pinned request** (tappable, opens the source viewer): `--color-bg` frame, 7px, margin `12px 13px 4px`, padding `11px 13px`. Kicker `关于这条需求 · Campus Circle` with the time, the original text at 14px, and tags (`周日`, `Trader Joe’s`, `时间未定`, outline `是否仍需要：未知`).
- Center label: `此对话不会出现在群聊中` (11px `#9d9da1`).
- Simulated replies arrive about 1.6s after the first send, preceded by `Ravi 正在输入…（模拟）`. The reply means the same in both languages: `还需要！下午 3 点左右我可以。` / `Yes, still looking! Around 3pm works for me.` Each simulated reply has a 10px uppercase neutral-700 caption `模拟回复 / Simulated reply` under it.

### F. Chats (tab, option 5a)
- Cards: `--color-bg`, divider border, 7px, padding `12px 14px`, 37px avatar column.
  - Title is the **request** in Barlow Condensed 17px (`Trader Joe’s · 周日`), with the time on the right.
  - `与 Ravi Shah` (12px), the last message on one line with ellipsis. A simulated sender is always labeled in the preview, even after it has been read: `Ravi（模拟）：还需要…` / `Ravi (simulated): Yes, still looking…`. Then and tags `进行中` plus `1 条新消息 · 模拟` when unread.
- Empty state: dashed frame, `还没有对话`, plus hint text.
- Footer note: `仅显示你从需求发起的对话，保存在本设备。`.

### G. Knowledge (tab)
- Section `群知识 / Group knowledge`: card rows with kicker `KC-014 · v1`, a status tag (accent-900 "待复核" or accent "已发布"), the question in 19px Barlow Condensed, and a meta line.
- Section `有人问、没人答 / Asked, not answered`: a dashed row, `图书馆打印价格 · 被问 2 次 … 暂无回答`, with the note that it isn't a card until answered. This is the README's "repeated questions with no answers → not a knowledge card" rule.
- Note: `卡片由群内回答生成草稿，经审核人发布（模拟）。`.

### H. Knowledge card (options 2a + 3a + 3b)
- Ground `--color-bg`. Header: back, `群知识 · KC-014`, and a **Reviewer switch** `审核模式（模拟）` (30×16 pill, accent when on, neutral-300 when off).
- Tags row: status, `vN`, and when under review `2 / 4 条结论受影响`.
- **Banner (needs review, reviewer off)**: accent-700 1px frame. The alert title `新消息与此卡片内容冲突`, then a 2-column comparison, `卡片 v1 · 9/2: 室内换乘；每 30 分钟一班` against `Leo · 9/14: 现为室外换乘；周日每小时一班`. The note explains the card is hidden from automatic suggestions until reviewed. Directly under the banner is an 11px neutral-700 line: `正式版中仅指定审核人可见此开关。` / `Only designated reviewers see this switch in the real app.`
- Question in Barlow Condensed 28px/1.05.
- **Claims**: grid `16px | 1fr | auto`, with the number in Barlow Condensed neutral-700, the text at 14px/1.45, and a source chip button (`Mia · 9/2`, accent tag, 7px radius) that opens the source viewer with that message highlighted. Flagged claims (reviewer off) are shown in neutral-700 `#5d5d60` with `已被后续消息更正` below.
- **Reviewer on**: flagged claims become accent-bordered frames. Each shows the old text struck through, the proposed text, a `来自 Leo · 9/14 ›` link to the source, and toggle buttons `保留 v1` / `采用更正` in a 2-column grid (each full cell width, 32px high, nowrap). The selected button gets an accent border, accent-100 fill and a ✓.
- Applicability: 3 equal cells with divider borders (`出发地 校园 · 学期 2026 秋季 · 日期 周日不同`).
- `群内未提及` (unknowns) and `依据` (signals: question episodes, answerers, corrections, "That solved it").
- **Three separate dates**: Sources / Generated / Reviewed. Then `版本: v2 · 9/17 · v1 · 9/10`.
- Footer:
  - Reviewer on: primary `发布 v2 · x/2 已决定`, disabled until every flagged claim is decided, with the note that v1 is kept and the review date changes only on publish.
  - Otherwise: `收藏 / 已收藏 ✓`, `纠错` (shows a toast, "sent to reviewers (simulated)"), and primary `追问`, which returns to Group with the draft `周六 118 路还是每 30 分钟一班吗？`.
- Publishing sets status Published v2 and reviewed `9/17 · 你（模拟）`, turns reviewer off, and shows the toast `v2 已发布 · v1 已保留`. After that, the knowledge suggestion no longer shows the review warning.

---

## Interactions & behavior
- **Auto-suggest**: ~800ms after typing stops. It is skipped during IME composition (it starts after `compositionend`), skipped if this exact draft was dismissed, and any stale timer is invalidated by a revision counter. It stays quiet when nothing matches.
- **Manual search (⌕)**: shows `…` for 350ms, then opens the sheet directly or shows the no-result box.
- **Send** is never blocked. It appends to the feed and clears the draft and suggestion.
- **Dismiss ×** suppresses auto prompts for the current draft text.
- **Overlays**: scrim tap closes. The source viewer stacks above the result sheet (z 6 over z 5). Back returns to the prior surface, and the draft is always preserved.
- **Dedupe**: one conversation per request and participant pair. "Chat about this" reopens it.
- **Toast**: centered at bottom:120px, neutral-900 background, 13px, 7px radius, 2.2s.
- **Language toggle**: all UI strings come from a `{ zh, en }` dictionary. Message texts, names and times stay as stored. Default is `zh` (matches `<html lang="zh-CN">`).
- No animations are specified beyond the existing app. Sheet slide-up at 200ms ease-out is acceptable.

## State management (suggested additions to `App.tsx`)
```ts
type Tab = 'group' | 'chats' | 'knowledge'
type Screen = 'main' | 'draft' | 'chat' | 'card'
lang: 'zh' | 'en'                      // persisted
tab: Tab; screen: Screen
suggestion: Match | null               // extend Match to { task?: TaskMatch; knowledge?: KnowledgeMatch } for mixed
sheetOpen: boolean; showClosed: boolean
source: { threadKey: string; highlightId: string | null } | null
conversations: Conversation[]           // keyed by sourceMessageId + participantId (dedupe)
conversationMessages: ConversationMessage[] // { simulated?: boolean }
cards: KnowledgeCard[]                  // status 'draft'|'published'|'needs-review'|'archived', version, claims[{text, sourceMessageIds}], applicability, unknowns, sourceDateRange, generatedAt, reviewedAt, reviewerId
cardVersions: KnowledgeCard[]           // previous versions preserved
reviewDecisions: Record<claimId, 'keep' | 'use'>
reviewerMode: boolean                  // explicitly simulated
saves: string[]; toast: string
```
- `findMatch` should return both the task and knowledge parts for `mixed` instead of falling back to one. *(Implemented as `findMatches` in `src/matching.ts`.)*
- Cards with `needs-review` are excluded from *authoritative* suggestions but still surfaced with the warning label. Archived cards are never suggested.
- Persist to localStorage under the existing `campus-circle:*` keys, and extend the Reset action to clear the new keys.

## Content / fixtures
All message text, authors and times come from `src/fixtures.ts` (m-101…m-108, m-201…m-212). Card KC-014 (Costco without a car) is built from m-201/202/203 and flagged by m-210. Card KC-009 (parking permit) is built from m-205, with feedback m-206 and repeats m-207/m-208. The only actionable task for grocery drafts is Ravi's m-107. Leo's m-102 (full, m-108) and Mia's m-101 (arranged via m-103) are shown only under the "closed" disclosure.

Demo drafts used for testing:
1. `Anyone going grocery shopping this weekend?` → task
2. `How do I get to Costco without a car?` → knowledge (needs review)
3. `周末有人一起去超市吗？没车的话怎么去 Costco？` → mixed
4. `Where do new students apply for a parking permit?` → knowledge (published)
5. `I went grocery shopping last weekend.` → quiet
6. `What does printing cost?` → quiet; manual search → no result

## Assets
- There are no images. Icons are Lucide (stroke 1.5): `chevron-left`, `x`, `sparkle`, `alert-triangle`, `lock`. Add `lucide-react` or inline the SVG paths from the prototype.
- Fonts: Barlow (400/500/700) and Barlow Condensed (400/600) from Google Fonts, already `@import`ed by the Industry stylesheet.
- Industry stylesheet: `_ds/industry-…/styles.css`. Port the needed tokens into `src/styles.css` as CSS variables rather than importing the whole sheet. Apply the 7px radius override and leave out the `.corner` marks.

## Files
- `Campus Circle Prototype.dc.html`: the prototype. The template holds the markup and inline styles; the logic class at the bottom holds the state, the copy dictionary `T`, and the fixtures `M`, `THREADS` and `KC`.
- `Campus Circle Prototype (standalone).html`: offline build of the same prototype.
- `Flows Board.dc.html`: the options board (1a–5b).
- `support.js` and `_ds/`: runtime and stylesheet needed to open the `.dc.html` files locally.
- `screenshots/`: 14 captures of the main flow, in order. 01–12 are in English: group, suggestion, task sheet, closed requests expanded, source viewer, opening draft, temporary chat, chats tab, knowledge tab, card needing review, reviewer mode, published v2. 13–14 are in Chinese: the mixed-intent suggestion and its sheet.
