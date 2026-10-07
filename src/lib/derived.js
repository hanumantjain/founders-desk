import { iso, pad, parseISO, todayISO, addDays, firstWord } from './utils'

/* ---------- people ---------- */
export const partners = st => st.members.filter(m => m.id !== st.uid)
export const nameOf = (st, id) => {
  if (id === '__partner__') return 'Partner'
  const m = st.members.find(x => x.id === id)
  if (m && m.name) return m.name
  return id === st.uid ? 'You' : 'Former partner'
}
export const firstName = (st, id) => firstWord(nameOf(st, id))
// Assignments from the two-founder version may be addressed to '__partner__' (whoever wasn't the sender).
export const toOf = (st, a) => a.to === '__partner__' ? (a.from === st.uid ? '__partner__' : st.uid) : a.to

/* ---------- bills ---------- */
export const dueDateFor = (b, y, m) => { const dim = new Date(y, m + 1, 0).getDate(); return `${y}-${pad(m + 1)}-${pad(Math.min(Number(b.dueDay) || 1, dim))}` }
export const billStart = b => iso(new Date(b.createdAt || Date.now()))
export function billCycles(b, to) {
  const from = billStart(b); const s0 = parseISO(from), e = parseISO(to); const out = []
  for (let y = s0.getFullYear(), m = s0.getMonth(); y < e.getFullYear() || (y === e.getFullYear() && m <= e.getMonth()); m++, (m > 11 && (m = 0, y++))) {
    const d = dueDateFor(b, y, m); if (d >= from && d <= to) out.push({ key: d.slice(0, 7), due: d })
  }
  return out
}
export const isPaid = (b, key) => !!(b.paid && b.paid[key])
export function dueBills(st) {
  const t = todayISO(), lim = iso(addDays(new Date(), 3)); const res = []
  ;[['bills', st.bills], ['pbills', st.pbills]].forEach(([k, list]) => list.forEach(b =>
    billCycles(b, lim).filter(c => !isPaid(b, c.key)).forEach(c => res.push({ k, b, ...c, overdue: c.due < t }))))
  return res.sort((a, b) => a.due.localeCompare(b.due))
}
export function billStatus(b) {
  const t = todayISO(); const cyc = billCycles(b, iso(addDays(new Date(), 45))); const un = cyc.find(c => !isPaid(b, c.key))
  if (un) return { ...un, state: un.due < t ? 'overdue' : un.due <= iso(addDays(new Date(), 3)) ? 'soon' : 'upcoming' }
  const last = [...cyc].reverse().find(c => isPaid(b, c.key))
  return last ? { ...last, state: 'paid', paid: b.paid[last.key] } : { state: 'upcoming', due: cyc[0] && cyc[0].due }
}
export function billsOn(st, d) {
  const res = []; const dd = parseISO(d)
  ;[['bills', st.bills], ['pbills', st.pbills]].forEach(([k, list]) => list.forEach(b => {
    const due = dueDateFor(b, dd.getFullYear(), dd.getMonth()); if (due === d && d >= billStart(b)) res.push({ k, b, key: d.slice(0, 7), due: d })
  }))
  return res
}

/* ---------- projects ---------- */
export const received = p => (p.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
export const isDone = p => (Number(p.quoted) || 0) > 0 && received(p) >= Number(p.quoted)

export function periodStart(period) {
  const d = new Date()
  if (period === 'week') return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -6).getTime()
  if (period === 'year') return new Date(d.getFullYear(), 0, 1).getTime()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/* ---------- autocomplete sources ---------- */
export function contactBook(st) {
  const m = new Map()
  const put = (n, p, t) => {
    n = (n || '').trim(); if (!n) return; const k = n.toLowerCase(); const o = m.get(k)
    if (!o || t > (o.t || 0) || (!o.phone && p)) m.set(k, { name: n, phone: (p || '').trim() || (o && o.phone) || '', t: Math.max(t || 0, o ? o.t || 0 : 0) })
  }
  st.contacts.forEach(c => put(c.name, c.phone, c.lastUsed)); st.meetings.forEach(x => put(x.person, x.phone, x.createdAt))
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
}
export function taskCats(st) {
  const m = new Map(); const put = n => { n = (n || '').trim(); if (n && !m.has(n.toLowerCase())) m.set(n.toLowerCase(), n) }
  st.tcats.slice().sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).forEach(c => put(c.name))
  st.tasks.forEach(t => put(t.cat)); st.assigned.forEach(a => put(a.cat)); st.projects.forEach(p => put(p.name))
  return [...m.values()]
}

/* ---------- tips in the bell ---------- */
export function tips(st) {
  const t = []; const now = Date.now()
  const stale = st.leads.filter(l => l.stage !== 'Lost' && l.stage !== 'Advance received' && now - (l.stageAt || l.createdAt || now) > 10 * 864e5)
  if (stale.length) t.push(`${stale.length} lead${stale.length > 1 ? 's have' : ' has'} stayed at the same stage for over 10 days. Call them this week or mark them Lost.`)
  const due = dueBills(st)
  if (due.length) t.push(`Monthly payments ${due.some(x => x.overdue) ? 'overdue or ' : ''}due soon: ${due.map(x => x.b.name).join(', ')}. Tick them in Today once paid.`)
  const tm = iso(addDays(new Date(), 1))
  const np = st.meetings.filter(m => m.date === tm && !m.phone && m.type === 'Business')
  if (np.length) t.push(`Add a phone number to tomorrow's meeting${np.length > 1 ? 's' : ''} so the WhatsApp confirmation opens straight to the person.`)
  const unc = st.meetings.filter(m => m.date === tm && m.status !== 'Cancelled' && !m.confirmedAt)
  if (unc.length) t.push(`${unc.length} meeting${unc.length > 1 ? 's' : ''} tomorrow ${unc.length > 1 ? 'are' : 'is'} not confirmed yet. Send the WhatsApp confirmation from Today.`)
  if (!st.goals.length) t.push('Add 2–3 yearly goals in Tasks → Yearly goals. Progress tracks them for you.')
  const past = st.meetings.filter(m => m.date < todayISO() && (!m.status || m.status === 'Scheduled') && m.owner === st.uid)
  if (past.length) t.push(`Mark ${past.length} past meeting${past.length > 1 ? 's' : ''} as Attended or Cancelled in Calendar so Progress stays accurate.`)
  if (st.leads.some(l => !l.ref)) t.push('Fill in the reference for every lead. It shows which source brings you the most work.')
  const generic = [
    'Tag office spends as Office in the + window. They go straight to Commercial and stay out of your personal totals.',
    'Use Assign in Tasks for anything a partner should do. Everyone in the studio sees its status.',
    'Log every lead the day it comes in, even small ones. Conversion numbers in Progress depend on it.',
    'Check Progress every Monday morning. It takes two minutes and shows where last week went.',
  ]
  t.push(generic[new Date().getDate() % generic.length])
  return t
}

/* ---------- activity log ---------- */
const NOUN = { leads: 'lead', projects: 'project', meetings: 'meeting', assigned: 'task', office: 'office expense', bills: 'office payment' }
const FIELD = { stage: 'stage', quoted: 'amount quoted', payments: 'payments', status: 'status', date: 'date', time: 'time', place: 'place',
  phone: 'phone', note: 'note', notes: 'notes', amount: 'amount', category: 'category', title: 'title', name: 'name', done: 'status',
  confirmedAt: 'confirmation', paid: 'payment', dueDay: 'due day', ref: 'reference', cat: 'category', person: 'person' }

/** One line for an activity row: { who, text }. */
export function describeActivity(st, a) {
  const who = a.actor ? firstName(st, a.actor) : 'Someone'
  const noun = NOUN[a.kind] || 'item', what = a.label ? `“${a.label}”` : `a ${noun}`
  if (a.action === 'insert') {
    if (a.kind === 'projects') return { who, text: `turned ${what} into a project` }
    return { who, text: `added ${noun} ${what}` }
  }
  if (a.action === 'delete') return { who, text: `deleted ${noun} ${what}` }
  const ch = a.changes || {}, keys = Object.keys(ch).filter(k => k !== 'stageAt' && k !== 'confirmedBy')
  const to = k => ch[k] && ch[k].to
  if (keys.includes('stage') && to('stage')) return { who, text: `moved ${what} to ${to('stage')}` }
  if (keys.includes('status') && to('status')) return { who, text: `marked ${what} ${String(to('status')).toLowerCase()}` }
  if (keys.includes('done')) return { who, text: `marked ${what} ${to('done') ? 'done' : 'not done'}` }
  if (keys.includes('payments')) return { who, text: `updated payments on ${what}` }
  if (keys.includes('paid')) return { who, text: `recorded a payment for ${what}` }
  if (keys.includes('confirmedAt')) return { who, text: `${to('confirmedAt') ? 'confirmed' : 'unconfirmed'} ${what}` }
  if (keys.includes('quoted')) return { who, text: `changed the quote on ${what} to ₹${Math.round(Number(to('quoted')) || 0).toLocaleString('en-IN')}` }
  const names = [...new Set(keys.map(k => FIELD[k]).filter(Boolean))]
  return { who, text: `updated ${what}${names.length ? ` (${names.slice(0, 3).join(', ')})` : ''}` }
}
