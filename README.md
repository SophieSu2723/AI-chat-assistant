# AI Chat Assistant

Discover timely needs, start focused conversations, and preserve reusable answers from large group chats.

When someone is looking for a ride or a grocery-shopping companion, the assistant surfaces relevant messages from the past three days. Users can then chat directly about that specific request without adding each other as friends or filling the main group feed with coordination details.

> Status: Product definition; the application has not been implemented. The first version will use fictional data and simulated matching, followed by a real AI integration. The behaviors described here are development requirements, not existing features.

The product has two complementary card types: **Immediate Task Cards** help members find people to coordinate with; **Knowledge Cards** preserve source-backed answers for future questions.

## User Problems

- Useful answers are buried, causing members to repeat questions and explanations.
- Relevant requests quickly disappear in busy group chats, leading to repeated questions.
- One-time coordination does not always justify adding someone as a friend.
- Discussing logistics in the main group can interrupt other members.

## Core Experience

Express a need → See a private suggestion → Review relevant messages → Select a request → Start a temporary chat → Continue from “Ongoing chats.”

Example: A user types “Anyone going grocery shopping this weekend?” A prompt says “2 related requests from the past 3 days.” The user selects Mia’s Costco request, reviews the context, and edits and sends an opening message.

## MVP Scope

| Included | Not included yet |
| --- | --- |
| One fictional student group, with grocery trips as the primary scenario | Live QQ or WeChat integration |
| Ride requests, casual conversation, and expired messages as matching test cases | Multi-person coordination |
| A compact suggestion, results list, and original-message details | Friend lists, payments, and maps |
| One-to-one request conversations and an ongoing-chat list | Automatically sending messages on the user’s behalf |
| Local persistence and a demo reset | Real authentication and real-time multi-user messaging in version one |
| Knowledge candidates, source-linked answers, review, and correction flows | External web answers or a general-purpose knowledge base |

## Two Card Types

| Dimension | Immediate Task Card | Knowledge Card |
| --- | --- | --- |
| User question | Who recently expressed a relevant need? | Has this group already answered my question? |
| Example | Anyone going to Costco this weekend? | How can I get to Costco without a car? |
| Output | Separate original requests and relevant follow-ups | A focused answer with evidence for each claim |
| Time scope | Requests from the preceding 72 hours, checked for current relevance | Available group history beyond 72 hours, with context-specific freshness checks |
| Main action | Chat about this request | Inspect sources, save, ask a follow-up, or suggest a correction |
| Lifecycle | Open, unknown, full, canceled, completed, expired | Draft, published, needs review, archived |

Both card types are in scope. Build them incrementally using the same composer and source viewer.

## Recommendation Triggers and Screen Space

- Do not proactively suggest matches while the user is only browsing. A keyword such as “grocery” alone is not sufficient.
- Route clear coordination requests to task matching and informational questions to knowledge retrieval. Casual statements should not trigger either. For mixed or ambiguous intent, use one prompt opening labeled sections or let the user choose; do not stack prompts.
- Check for matches after a clear coordination or information-seeking intent and approximately 800ms of inactivity. This delay is a parameter to test.
- Show a single-line prompt above the composer only when matches exist. Do not automatically expand full cards.
- Suggestions are private and are not group messages. Dismissing a suggestion suppresses automatic prompts for the current draft.
- Invalidate old results when the request changes. Earlier responses must not overwrite newer results.
- Users can ignore the suggestion and send their original group message without an interception or extra popup.
- Stay quiet when automatic matching finds nothing. Show explicit feedback when a user initiates a search that returns no matches.
- Do not trigger during Chinese IME composition. Start the delay after composition ends.

Tapping the prompt opens a bottom sheet, dismisses the keyboard, and preserves the draft. Use a compact list rather than overlapping cards. Closing the sheet returns users to their previous editing state. Check focus handling, mobile keyboard behavior, and layout shifts during implementation.

Knowledge suggestions use the same compact pattern: “This group has discussed a related question.” Opening a card never blocks asking the group again. Do not notify the whole group whenever a card is generated.

## Immediate Task Card Content and Matching Boundaries

Each result shows the author, posting time, an excerpt from the original message, and explicitly stated dates and locations. Users can open the full message and relevant replies before choosing “Chat about this.”

- Keep different people’s requests separate; do not merge them into an invented shared plan.
- Include follow-up messages that reschedule or cancel the same request.
- Define the past three days as the preceding 72 hours, using an explicit current time and time zone.
- A recent posting time does not guarantee that an opportunity is still available.
- Distinguish requests for help, offers of help, and past experiences. Complementary needs can also match.
- Do not invent available seats, vehicles, times, or locations.
- When availability is unknown, show “Check whether they’re still looking.”
- Exclude explicitly canceled, full, or completed requests from default actionable recommendations.
- Read original text, avatars, and identities from application data; do not generate them with the model.

## Temporary Conversation Rules

1. Viewing a card or opening a conversation draft does not notify the other person.
2. The opening message is editable. Create the conversation only when the user sends the first message.
3. Keep the original request and shared group visible at the top of the conversation.
4. Reopen the existing conversation when the same two users connect about the same request again.
5. Conversation messages stay outside the main group feed. Started conversations remain accessible in “Ongoing chats.”
6. Clearly label demo data, simulated matching, and simulated replies.
7. Local storage supports a single-browser demo; it does not provide real multi-user messaging.

## Knowledge Card Eligibility

A candidate must satisfy all three gates:

1. **Reusable:** useful beyond one person’s immediate arrangement.
2. **Substantive:** the conversation contains actionable advice, explanation, or contextualized experience.
3. **Traceable and scoped:** claims link to original messages and preserve the relevant people, place, date, and conditions. Missing context must be explicit; if it makes the answer unusable, do not publish it.

A single detailed answer can qualify. A frequently asked question without an answer cannot. Do not use a fixed answer count, like count, or model confidence score as an automatic publishing threshold.

| Signal | Meaning | Use |
| --- | --- | --- |
| Similar questions across distinct discussions and people | Recurring demand | Prioritize eligible candidates |
| Repeated substantive answers | Repeated answering effort | Consolidate duplicates, retaining sources |
| One complete explanation | Reusable content | Allow a candidate even with no repetition |
| “That solved it” from the asker | Helpfulness in that context | Supporting feedback, not universal verification |
| Saves or “Helpful” feedback | Perceived usefulness | Inform ranking, not factual truth |
| Many likes or replies | Attention, possibly controversy | Never sufficient for eligibility |
| Contradiction or correction | Possible error or change | Trigger review and preserve disagreement |

Count distinct question episodes, not every reply as a new occurrence. Repeated copies of one answer are not independent corroboration. Keep prioritization qualitative in the MVP and record the reason for each candidate.

### Examples

- “Anyone going Saturday?” → task card, not reusable knowledge.
- A detailed explanation of transport options → knowledge candidate, even if shared once.
- Repeated parking-permit questions with a sourced step-by-step answer → knowledge candidate.
- Repeated questions with no substantive answers → unanswered topic, not a knowledge card.
- “This course is great” → insufficient detail by itself.
- Conflicting accounts of course workload → an experience card retaining each context, not a manufactured consensus.

## Knowledge Creation, Retrieval, and Updates

### Two creation paths

- **AI-assisted discovery:** identify eligible discussions and generate private drafts with source-linked claims. Repetition prioritizes discovery but is not required.
- **Member initiated:** select a message or discussion and choose “Save as knowledge.” Apply the same eligibility gates; explain if the selection lacks an answer.

A private draft or personal save is not a group publication. A designated reviewer can edit and publish a candidate to “Group knowledge.” In the single-browser demo, reviewer mode is explicitly simulated; actual authorization is required for a multi-user version. “Reviewed” appears only after a recorded review action and does not certify objective truth.

### Card anatomy

- Specific question as the title, rather than a broad topic.
- Concise answer with each substantive claim linked to source message IDs.
- Applicability: location, audience, semester/date, and other relevant conditions.
- Attributed experiences, disagreements, caveats, and unknowns.
- Source dates, generation/update time, and last review time shown separately. A newly generated card does not make old advice current.
- Actions: view discussion, save privately, mark helpful, suggest a correction, and ask a follow-up.

### Lifecycle

Eligible discussion → private draft → reviewer publication → related-question retrieval → feedback or new evidence → review/update or archive.

- Similar questions and compatible conditions should retrieve an existing card rather than create duplicates. Do not merge answers for different institutions or semesters indiscriminately.
- New corrections or conflicting evidence mark the card “Needs review.” Show the warning prominently and exclude it from default authoritative answer suggestions until reviewed; it may remain accessible in the knowledge area with its warning.
- Preserve the prior version and source references when publishing an update. Do not silently overwrite disagreement.
- Archived cards are excluded from default recommendations.
- If sources are unavailable, do not present affected claims as verified; flag for review.
- Follow-ups are answered only from available group evidence. If the new condition is not covered, state the gap and offer an editable group question. Send only after the user confirms.
- Do not include private temporary chats in group knowledge. Restrict retrieval to the current group and the user’s authorized source content.

## Minimal Data Contracts

| Entity | Core fields |
| --- | --- |
| Message | id, groupId, senderId, text, sentAt, replyToId |
| TaskMatch | sourceMessageId, relatedMessageIds, matchType, reason, status, missingDetails |
| Conversation | id, groupId, sourceMessageId, participantIds, createdAt, status |
| ConversationMessage | id, conversationId, senderId, text, sentAt |
| KnowledgeCard | id, groupId, question, claims[{text, sourceMessageIds}], applicability, disagreements, unknowns, status, version, sourceDateRange, generatedAt, reviewedAt, reviewerId |
| KnowledgeCandidate | discussionMessageIds, eligibilityReasons, distinctQuestionEpisodes, creationMethod |
| KnowledgeFeedback | cardId, version, userId, type, note, createdAt |

Keep saves and helpful votes distinct from publication and review. Count at most one active helpful vote per user per card version. Keep previous card versions for update inspection.

## Technical Direction

- React + TypeScript, with a mobile-first interface.
- Build the interaction flow with fixture data and preset rules before connecting a server-side AI matching endpoint.
- Use localStorage for drafts, conversations, conversation messages, knowledge cards, versions, saves, and feedback in version one. Provide a reset action.
- Keep AI API keys in server-side environment variables, never in frontend code or the Git repository.
- Before introducing AI, explain how unsent drafts are processed and provide an option to disable automatic matching.
- Live group integration requires separate verification of message permissions, identity mapping, and historical-message access.

## Implementation and Acceptance

Follow the [step-by-step build plan](build-plan.md). The first milestone is a complete task flow: type → view suggestions → inspect sources → deliberately send a message → return and continue chatting, with records preserved after refresh. The second milestone is a knowledge flow: eligible discussion → draft → simulated review/publication → related question → source inspection → correction and reviewed update. Both are required for the full MVP.

## Product Hypotheses to Validate

- Is an automatic single-line prompt more discoverable than manual search without interrupting typing?
- Do original messages and date information help users decide whether to reach out?
- Do users understand that opening a conversation does not send a message?
- Does a temporary conversation reduce hesitation around one-time contact?
- Can users distinguish reusable answers from popular but unanswered discussions?
- Can users verify claims, notice outdated advice, and understand disagreement?
- Do knowledge cards reduce repeated searching without discouraging legitimate follow-up questions?

Use small task-based studies to record discovery, completion, misunderstandings, and perceived interruption. Do not claim efficiency or conversion improvements before measuring them.
