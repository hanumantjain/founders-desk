/* ---------- dates, money and small helpers (unchanged from the original single-file app) ---------- */
export const pad = n => String(n).padStart(2, '0')
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const mkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
export const todayISO = () => iso(new Date())
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const fmtD = s => s ? parseISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
export const fmtDY = s => s ? parseISO(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const fmtTS = t => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const fmtT = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) }
export const monthLabel = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
export const R = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
export const toLocalDT = t => { const d = new Date(t); return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const rid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
export const ordinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th')
export const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'c'
export const firstWord = s => String(s || '').split(' ')[0]

export function deepMerge(t, p) {
  for (const k in p) {
    if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) t[k] = deepMerge(t[k] && typeof t[k] === 'object' ? { ...t[k] } : {}, p[k])
    else t[k] = p[k]
  }
  return t
}

export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.length === 10) d = '91' + d
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null
}

/* ---------- constants ---------- */
export const PCAT = ['Food', 'Fuel', 'Travel', 'Site', 'Printing', 'Bills', 'Other']
export const BILLCAT = ['Rent', 'Bills', 'Salary', 'Other']
export const OFFICECAT = [...new Set([...PCAT, ...BILLCAT])]
export const PBILLCAT = ['Rent', 'EMI', 'Bills', 'Phone', 'Insurance', 'Investment', 'Other']
export const STAGES = ['Enquiry', 'Site visit', 'Proposal sent', 'Negotiation', 'Advance received', 'Lost']
export const LCATS = ['Architecture', 'Interiors', 'Liaisoning']
// "Studio" is work for the business itself (the original app called it after the studio's name).
export const TTYPES = ['Personal', 'Professional', 'Studio']
export const PAY_LABELS = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Extra work', 'Other']

// Private lists live under the user's own scope; everything else is shared with the whole studio.
export const PRIV = ['tasks', 'goals', 'expenses', 'notifs', 'tcats', 'pbills']
export const SHARED = ['contacts', 'meetings', 'assigned', 'leads']
// Money lists: only the owner and admins can read them (scope 'finance'); members can still add to them.
export const FIN = ['projects', 'office', 'bills']
export const KINDS = [...PRIV, ...SHARED, ...FIN]
