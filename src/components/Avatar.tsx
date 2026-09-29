import type { Person } from '../ui'

export function Avatar({ person, size = 37 }: { person: Pick<Person, 'initials' | 'color'>; size?: number }) {
  return <div className="avatar" aria-hidden="true" style={{ background: person.color, width: size, height: size, flexBasis: size, fontSize: size < 32 ? 9 : 10 }}>{person.initials}</div>
}
