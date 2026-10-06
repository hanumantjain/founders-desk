import { useD } from './context'
import { Err, useErr } from '../components/common'
import { billStatus, firstName } from '../lib/derived'
import { R, fmtD, fmtTS, monthLabel, ordinal, toLocalDT, OFFICECAT, PCAT } from '../lib/utils'

const dueDayOf = v => Math.min(31, Math.max(1, Number(v) || 1))

/** Monthly payments: office (shared, k='bills') or personal (private, k='pbills'). */
export function BillsCard({ k, title, cats, ph, note }) {
  const { st, ui, setUi, ops, act, toast } = useD()
  const [err, setErr, clear] = useErr()
  const list = st[k].slice().sort((a, b) => (Number(a.dueDay) || 1) - (Number(b.dueDay) || 1))

  const add = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const n = E.name.value.trim(), a = Number(E.amount.value), d = dueDayOf(E.dueDay.value)
    if (!n || !(a > 0)) return setErr('Enter a name and an amount')
    setErr(''); await ops.add(k, { name: n, amount: a, category: E.category.value, dueDay: d, paid: {} }); f.reset()
    toast(`${n} added · due on the ${ordinal(d)} every month`)
  }
  const save = async (e, b) => {
    e.preventDefault(); const E = e.currentTarget.elements
    const n = E.name.value.trim(), a = Number(E.amount.value), d = dueDayOf(E.dueDay.value)
    if (!n || !(a > 0)) return toast('Enter a name and an amount')
    setUi({ edit: null }); await ops.upd(k, b.id, { name: n, amount: a, category: E.category.value, dueDay: d }); toast('Monthly payment updated')
  }

  return (
    <div className="card">
      <div className="ctitle">{title}</div>
      {list.length ? list.map(b => {
        if (ui.edit === 'bill:' + b.id) return (
          <div className="row" key={b.id}><form className="form" style={{ width: '100%' }} onSubmit={e => save(e, b)}>
            <label><span className="lbl">Name</span><input name="name" defaultValue={b.name} /></label>
            <label><span className="lbl">Usual amount ₹</span><input name="amount" type="number" min="1" defaultValue={b.amount} /></label>
            <label><span className="lbl">Category</span><select name="category" defaultValue={b.category}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
            <label><span className="lbl">Due day each month</span><input name="dueDay" type="number" min="1" max="31" defaultValue={Number(b.dueDay) || 1} /></label>
            <button className="btn-p">Save</button><button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
          </form></div>
        )
        const s = billStatus(b)
        const pill = s.state === 'paid' ? <span className="pill p-ok">Paid · {monthLabel(s.key).split(' ')[0]}</span>
          : s.state === 'overdue' ? <span className="pill p-bad">Overdue</span>
          : s.state === 'soon' ? <span className="pill p-warn">Due {fmtD(s.due)}</span>
          : <span className="pill p-n">Next: {s.due ? fmtD(s.due) : '—'}</span>
        return (
          <div className="row" key={b.id}>
            <div className="main"><div>{b.name}</div>
              <div className="meta">{b.category} · due on the {ordinal(Number(b.dueDay) || 1)} every month{s.state === 'paid' && s.paid ? ` · last paid ${new Date(s.paid.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${k === 'bills' ? ' by ' + firstName(st, s.paid.by) : ''}` : ''}</div>
            </div>
            <div className="side"><b className="num">{R(b.amount)}</b>{pill}
              {s.state !== 'paid' && s.key && <button className="btn-s" onClick={() => act.openPay(k, b.id, s.key)}>Mark paid</button>}
              <button className="btn-s btn-g" onClick={() => setUi({ edit: 'bill:' + b.id })}>Edit</button>
              <button className="btn-s btn-g" aria-label="Remove monthly payment" onClick={() => act.del(k, b.id)}>✕</button>
            </div>
          </div>
        )
      }) : <p className="empty">{note}</p>}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 12 }}>
        <span className="lbl">Add a monthly payment · reminder shows in Today 3 days before the due day</span>
        <form className="form" onSubmit={add} onInput={clear}>
          <input name="name" placeholder={ph} aria-label="Payment name" />
          <input name="amount" type="number" min="1" placeholder="Usual amount ₹" aria-label="Amount" />
          <select name="category" aria-label="Category">{cats.map(c => <option key={c}>{c}</option>)}</select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="meta" style={{ whiteSpace: 'nowrap' }}>Due day</span><input name="dueDay" type="number" min="1" max="31" defaultValue="1" aria-label="Due day of month" /></label>
          <button className="btn-p">Add payment</button>
        </form>
        <Err msg={err} />
      </div>
    </div>
  )
}

/** One expense line, personal (k='expenses') or office (k='office'), with inline edit. */
export function ExpRow({ e, k }) {
  const { st, ui, setUi, ops, act, toast } = useD()
  if (ui.edit === k + ':' + e.id) {
    const save = async ev => {
      ev.preventDefault(); const E = ev.currentTarget.elements
      const ts = new Date(E.ts.value).getTime(), a = Number(E.amount.value)
      if (!(a > 0) || !ts) return toast('Enter a valid amount and date')
      setUi({ edit: null }); await ops.upd(k, e.id, { ts, amount: a, category: E.category.value, note: E.note.value.trim() }); toast('Saved')
    }
    return (
      <div className="row"><form className="form" style={{ width: '100%' }} onSubmit={save}>
        <input name="ts" type="datetime-local" defaultValue={toLocalDT(e.ts || e.createdAt)} aria-label="Date and time" />
        <input name="amount" type="number" defaultValue={e.amount} aria-label="Amount" />
        <select name="category" defaultValue={e.category} aria-label="Category">{(k === 'office' ? OFFICECAT : PCAT).map(c => <option key={c}>{c}</option>)}</select>
        <input name="note" defaultValue={e.note || ''} aria-label="Note" />
        <button className="btn-p">Save</button>
        <button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
        <button type="button" className="btn-g" style={{ color: 'var(--bad)' }} onClick={() => act.del(k, e.id)}>Delete</button>
      </form></div>
    )
  }
  return (
    <div className="row">
      <div className="main"><div>{e.note || e.category}</div><div className="meta">{fmtTS(e.ts || e.createdAt)}{k === 'office' && e.by ? ' · ' + firstName(st, e.by) : ''}</div></div>
      <div className="side"><b className="num">{R(e.amount)}</b><span className="pill p-n">{e.category}</span><button className="btn-s btn-g" onClick={() => setUi({ edit: k + ':' + e.id })}>Edit</button></div>
    </div>
  )
}
