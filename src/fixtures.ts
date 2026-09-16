export type Author = { id: string; name: string; initials: string; color: string }
export type Message = { id: string; groupId: string; senderId: string; text: string; sentAt: string; replyToId?: string }

export const DEMO_NOW = '2026-09-17T18:30:00+08:00'
export const GROUP = { id: 'campus-fall-2026', name: 'Campus Circle · Fall 2026' }
export const authors: Author[] = [
  { id: 'me', name: 'You', initials: 'Y', color: '#7558d9' },
  { id: 'mia', name: 'Mia Chen', initials: 'MC', color: '#ee7662' },
  { id: 'leo', name: 'Leo Wang', initials: 'LW', color: '#4da7a0' },
  { id: 'ravi', name: 'Ravi Shah', initials: 'RS', color: '#e2a940' },
  { id: 'zoe', name: 'Zoe Liu', initials: 'ZL', color: '#5d8ed5' },
  { id: 'noah', name: 'Noah Kim', initials: 'NK', color: '#ba699b' }
]
const m = (id: string, senderId: string, text: string, sentAt: string, replyToId?: string): Message => ({ id, groupId: GROUP.id, senderId, text, sentAt, replyToId })

const keyMessages: Message[] = [
  m('m-101', 'mia', '周六上午有人想一起去 Costco 吗？我没有车，想买一大袋米和日用品。', '2026-09-16T10:20:00+08:00'),
  m('m-102', 'leo', 'I can drive to Costco Saturday around 10:30. Two seats available; pickup near North Gate.', '2026-09-16T11:05:00+08:00'),
  m('m-103', 'mia', '太好了！我在北门，10:30 可以。', '2026-09-16T11:12:00+08:00', 'm-102'),
  m('m-104', 'ravi', 'Anyone heading to the airport Friday evening? I have one suitcase and can share gas.', '2026-09-15T16:40:00+08:00'),
  m('m-105', 'zoe', 'Friday airport ride is full now, thanks everyone!', '2026-09-16T08:15:00+08:00', 'm-104'),
  m('m-106', 'noah', 'I went grocery shopping last weekend—the checkout line was long.', '2026-09-17T09:00:00+08:00'),
  m('m-107', 'ravi', '周日有人去 Trader Joe’s 吗？想搭车，时间还没定。', '2026-09-17T14:05:00+08:00'),
  m('m-108', 'leo', 'My Saturday Costco car is full now.', '2026-09-17T16:10:00+08:00', 'm-102'),
  m('m-201', 'zoe', 'How can I get to Costco without a car?', '2026-09-02T09:10:00+08:00'),
  m('m-202', 'mia', 'From campus, take bus 6 to Central Station, then the 118 toward Costco. It takes about 45–55 minutes; the transfer is indoors. Check the weekend timetable because service is every 30 minutes.', '2026-09-02T09:25:00+08:00', 'm-201'),
  m('m-203', 'ravi', 'The 118 stop is on the east side of Costco, near the pharmacy entrance.', '2026-09-02T09:29:00+08:00', 'm-201'),
  m('m-204', 'noah', 'Parking permit question: where do new students apply?', '2026-08-28T12:00:00+08:00'),
  m('m-205', 'leo', 'Use the Campus Mobility portal, choose “student resident,” upload your housing confirmation, then collect the permit from Building C. Fall applications open after Aug 20.', '2026-08-28T12:16:00+08:00', 'm-204'),
  m('m-206', 'mia', 'That solved it, thank you!', '2026-08-28T12:20:00+08:00', 'm-205'),
  m('m-207', 'zoe', 'Does anyone know where parking permits are applied for?', '2026-09-08T10:00:00+08:00'),
  m('m-208', 'ravi', 'What is the parking permit process?', '2026-09-12T15:20:00+08:00'),
  m('m-209', 'noah', 'This course is great!!!', '2026-09-10T17:00:00+08:00'),
  m('m-210', 'leo', 'The 118 route changed this semester: the Central Station transfer is now outdoors and buses run hourly on Sundays.', '2026-09-14T13:40:00+08:00', 'm-202'),
  m('m-211', 'zoe', 'Anyone know the library printer price?', '2026-09-11T10:00:00+08:00'),
  m('m-212', 'ravi', 'Printer cost?', '2026-09-13T11:00:00+08:00')
]

const filler = Array.from({ length: 62 }, (_, i) => {
  const senderId = authors[(i % (authors.length - 1)) + 1].id
  const day = 1 + (i % 15)
  const hour = 8 + (i % 10)
  const texts = ['Thanks for sharing!', '今天图书馆人好多。', 'Study room B is available after 4.', 'Anyone joining the club fair?', 'The weather looks nice today.', 'I found the syllabus in the course site.']
  return m(`m-${301 + i}`, senderId, texts[i % texts.length], `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00+08:00`)
})
export const messages = [...keyMessages, ...filler].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt))
export const expectedOutcomes = {
  task: { query: 'Anyone going grocery shopping this weekend?', sourceIds: ['m-107'], excludes: ['m-102', 'm-104'] },
  knowledge: { query: 'How do I get to Costco without a car?', sourceIds: ['m-201', 'm-202', 'm-203'], status: 'needs-review due to m-210' },
  insufficient: { query: 'What does printing cost?', sourceIds: ['m-211', 'm-212'] }
}
export const authorFor = (id: string) => authors.find(a => a.id === id)!
