# Step-by-Step Build Plan

Read [README.md](README.md) first. Both Immediate Task Cards and Knowledge Cards are required for the MVP. Build in small increments; after each step, report changes, checks, and remaining limitations. Checked items are implemented in the current demo; unchecked items are planned. Notes in parentheses describe partial work. Status last synced on 2026-09-17.

## 1. Project Setup and Shared Fixtures

- [x] Initialize React + TypeScript; document install, run, and build commands.
- [x] Create approximately 70–100 fictional bilingual group messages with IDs, authors, timestamps, group IDs, and reply links.
- [ ] Fix and display a demo clock and time zone. *(Partial: the clock is fixed at 2026-09-17 18:30 UTC+8 but is not shown in the UI.)*
- [ ] Include task requests, offers, different dates, cancellations, full-capacity updates, expired requests, and irrelevant conversation. *(Partial: requests, offers, full-capacity updates, and irrelevant conversation exist; no cancellation or clearly expired task request yet.)*
- [ ] Include repeated questions with substantive answers; a single excellent answer; repeated unanswered questions; vague popular comments; conflicting experiences; outdated advice; and a later correction. *(Partial: conflicting experiences are still missing.)*
- [x] Include knowledge sources older than 72 hours to verify that task expiry rules do not remove reusable knowledge.
- [ ] Write expected outcomes and source IDs for both card types, reserving some cases for later evaluation. *(Partial: `eval/dataset.json` labels 27 drafts, 24 messages, and 4 final event states; no held-out split yet.)*

Acceptance: Every fixture has an explainable expected result. Demo examples remain repeatable as real time advances.

## 2. Shared Chat Interface and Intent Routing

- [x] Build group feed, composer, message sending, and manual search.
- [x] Simulate routing to coordination, knowledge, mixed/unclear, or no action.
- [x] Wait approximately 800ms after typing stops; support Chinese IME composition.
- [ ] Show one private compact prompt; open labeled sections for mixed results instead of stacking prompts. *(Partial: one prompt is shown; mixed intent shows task results, falling back to knowledge when no task matches, without labeled sections.)*
- [x] Preserve drafts, respect dismissal, invalidate stale results, and keep the composer stable.
- [ ] Add loading, manual no-results, and retry states. Automatic no-results stays quiet. *(Partial: loading, manual no-results, and quiet automatic no-results exist; no retry state.)*

Acceptance: “Anyone going shopping?” routes to tasks; “How do I get there without a car?” routes to knowledge; a past shopping anecdote triggers neither. Sending is never blocked.

## 3. Immediate Task Cards and Source Viewer

- [ ] Render compact results in a bottom sheet with author, original excerpt, date, location, and availability uncertainty. *(Partial: the sheet shows author, message, time, related messages, and an availability-uncertain badge; location is not extracted.)*
- [x] Enforce the 72-hour request window plus event relevance; include corrections and cancellations.
- [ ] Build a reusable source viewer that opens and highlights specific messages and surrounding replies.
- [ ] Preserve focus and drafts, support keyboard navigation, and check mobile keyboard behavior.

Acceptance: Results do not invent availability; canceled/full requests are not suggested as actionable; sources and follow-ups are inspectable.

## 4. Temporary Conversations

- [ ] “Chat about this” opens an editable draft with the original request attached. *(Partial: the opening message quotes the request and is editable; the request is not pinned above the conversation.)*
- [x] Create a conversation only when the first message is sent.
- [ ] Deduplicate by request ID and participant pair. *(Partial: the demo keeps one shared conversation for all requests.)*
- [ ] Add explicitly simulated replies and an “Ongoing chats” list.
- [x] Keep these messages outside the main group and out of knowledge-generation sources.

Acceptance: Opening does not notify or send. Users can return to the same conversation without duplicates.

## 5. Knowledge Eligibility and Draft Creation

- [ ] Implement mock eligibility decisions for reusable, substantive, source-backed content. *(Partial: knowledge matching uses only substantive answers, not questions, acknowledgements, or task messages; no eligibility decision is recorded.)*
- [ ] Record reasons and source message IDs. Repetition affects priority, never eligibility by itself.
- [ ] Count distinct question episodes; avoid counting copied replies as independent evidence.
- [ ] Add private AI-discovered candidates and a member-initiated “Save as knowledge” action. *(Partial: the result sheet can save a local knowledge draft; there are no AI-discovered candidates.)*
- [ ] Reuse an existing candidate for the same question and compatible context; preserve genuinely different conditions.
- [ ] Return an explicit insufficient-answer outcome for unanswered or vague discussions. *(Partial: automatic prompts stay quiet when a question has no answers; there is no explicit insufficient-answer message.)*

Acceptance: One detailed answer can qualify; ten unanswered repetitions or a highly liked vague opinion cannot. Manual creation cannot bypass the evidence requirement.

## 6. Knowledge Cards, Review, and Retrieval

- [ ] Build question-centered cards with claim-level sources, applicability, disagreements, unknowns, and separate source/generated/review dates.
- [ ] Add private drafts and a “Group knowledge” area for published cards.
- [ ] Provide clearly labeled simulated reviewer mode to edit and publish; record reviewer and review time only after that action.
- [ ] Distinguish personal save from shared publication.
- [ ] Retrieve published, applicable cards when a related question is typed; do not apply the task-only 72-hour cutoff.
- [ ] Open claims in the shared source viewer.
- [ ] Handle follow-ups using existing evidence; show gaps and offer an editable group question, never automatic posting.

Acceptance: Users can distinguish a private AI draft, a reviewed group card, and an unanswered question. Sources older than three days remain usable when contextually appropriate.

## 7. Feedback and Knowledge Updates

- [ ] Add personal saves, helpful feedback, and correction reports with version references.
- [ ] Prevent duplicate helpful votes from one user on one version; votes do not imply factual verification.
- [ ] Add a demo control that inserts a correction or changed condition.
- [ ] Mark affected cards “Needs review,” show why, and remove them from default answer suggestions.
- [ ] Allow simulated reviewers to publish a new version with changed sources and preserved version history.
- [ ] Support archiving and flag unavailable source evidence.

Acceptance: A new correction is visible, disagreement is not silently erased, and regeneration alone does not advance the last-review date.

## 8. Persistence and Complete Mock Demo

- [ ] Persist drafts, task conversations, knowledge candidates/cards/versions, saves, and feedback in localStorage.
- [x] Handle missing or corrupt stored data; reset only this app’s data.
- [ ] Clearly label synthetic content, mock matching, simulated review, and simulated replies.
- [ ] Verify both full flows after refresh.

Acceptance: Both card types work end to end in a single browser. Local persistence is not presented as actual multi-user synchronization.

## 9. Connect Real AI

Begin after the mock interaction flows work. Model credentials are required only here.

- [ ] Add server-side intent routing and task matching with structured TaskMatch output.
- [ ] Add knowledge eligibility assessment and claim-grounded draft synthesis; generation never auto-publishes.
- [ ] Add knowledge retrieval over available authorized history and applicable published cards.
- [ ] Use bounded context initially; supply surrounding replies, not disconnected message fragments.
- [ ] Validate schemas, existing source IDs, and group scope. Treat messages as data, not instructions.
- [ ] Keep keys server-side; explain draft processing, add an automatic-matching toggle, and limit requests.
- [ ] Distinguish API failure from no evidence; label mock/live modes explicitly.

Acceptance: Unseen query wording changes results appropriately. Claims remain attributable, unsupported questions return gaps, and structural validity is not treated as proof of factual accuracy.

## 10. Evaluation and User Testing

| Area | Cases to check |
| --- | --- |
| Routing | Task, knowledge, mixed intent, casual conversation |
| Task matching | False matches, missed matches, dates, cancellations, complementary needs |
| Knowledge eligibility | One good answer, repeated unanswered questions, vague popular replies |
| Grounding | Every claim supported by its linked messages; no invented consensus |
| Freshness | Old advice, updated conditions, separate review and generation dates |
| Recovery | No answer, partial answer, request failure, unavailable sources |
| Boundaries | No private-chat leakage; no cross-group retrieval; no automatic sending/publication |

- [ ] Evaluate held-out fixtures and document failures and limitations. *(Partial: `eval/` compares the original keyword rules, the current rules, and an optional model run on a labeled set that is not yet held out.)*
- [ ] Invite a few students to find a companion and answer a recurring practical question.
- [ ] Compare manual search and automatic prompts without guiding users to the entry point.
- [ ] Observe task completion, source inspection, interruption, and misunderstanding of draft/review status.
- [ ] Improve the largest problems before polishing or integrating a live platform.

## 11. Optional Live Integration and Hosting

- [ ] Verify platform access to ordinary messages, authors, replies, and historical data before promising integration.
- [ ] Add authentication, identity mapping, participant/group access controls, database storage, and real-time messaging.
- [ ] Implement real reviewer permissions and contact/block controls before multi-user release.
- [ ] Restrict knowledge to authorized group sources; never silently publish temporary private conversations.
- [ ] Deploy the app only after implementation and build verification, with demo limitations visible.

Publishing these Markdown files to GitHub does not deploy a functioning website. Native QQ/WeChat composer customization is not assumed.

## First Coding Task

> Read README.md and build-plan.md. Implement steps 1–2 only, while preparing fixtures for both card types. Inspect and preserve existing work. Use simulated behavior, with no model or live group connection. Run the build and verify intent routing, Chinese IME handling, dismissal, stale-result prevention, and no-results feedback. Report how to run the project and what remains unimplemented.
