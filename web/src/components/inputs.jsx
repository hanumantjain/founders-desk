import { useD } from '../desk/context'
import { contactBook, taskCats } from '../lib/derived'
import { AcInput } from './common'

export function CatInput(props) {
  const { st } = useD()
  return <AcInput name="cat" options={taskCats(st)} placeholder="Category: Gridline, Home, Gym…" aria-label="Category" {...props} />
}

/** Person + phone pair: picking a known person fills their phone, and the other way round. */
export function PersonPhone({ person = '', phone = '', labels = false }) {
  const { st } = useD()
  const book = contactBook(st)
  const fill = e => {
    const el = e.target, f = el.form; if (!f) return
    const v = el.value.trim()
    if (el.name === 'person') { const c = book.find(c => c.name.toLowerCase() === v.toLowerCase()); if (c && c.phone && !f.elements.phone.value) f.elements.phone.value = c.phone }
    else { const d = v.replace(/\D/g, ''); const c = d && book.find(c => c.phone && c.phone.replace(/\D/g, '') === d); if (c && !f.elements.person.value) f.elements.person.value = c.name }
  }
  const people = book.map(c => c.name), phones = book.filter(c => c.phone).map(c => c.phone)
  const pHints = Object.fromEntries(book.map(c => [c.name, c.phone])), phHints = Object.fromEntries(book.filter(c => c.phone).map(c => [c.phone, c.name]))
  const P = <AcInput name="person" options={people} hints={pHints} defaultValue={person} placeholder="Mr. Kulkarni" aria-label="Person" onInput={fill} />
  const Ph = <AcInput name="phone" options={phones} hints={phHints} defaultValue={phone} inputMode="tel" placeholder="98XXXXXXXX" aria-label="Phone" onInput={fill} />
  if (!labels) return <>{P}{Ph}</>
  return <><label><span className="lbl">Person</span>{P}</label><label><span className="lbl">Phone</span>{Ph}</label></>
}

export function PhoneInput(props) {
  const { st } = useD()
  const book = contactBook(st).filter(c => c.phone)
  return <AcInput name="phone" options={book.map(c => c.phone)} hints={Object.fromEntries(book.map(c => [c.phone, c.name]))} inputMode="tel" {...props} />
}
