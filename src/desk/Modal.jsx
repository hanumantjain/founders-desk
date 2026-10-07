import { useD } from './context'
import { Err, useErr } from '../components/common'
import { dueDateFor } from '../lib/derived'
import { R, fmtD, fmtTS, monthLabel, OFFICECAT, PCAT } from '../lib/utils'

function Shell({ label, title, children }) {
  const { setUi } = useD()
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setUi({ modal: null }) }}>
      <div className="modal" role="dialog" aria-label={label}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 16 }}>{title}</b>
          <button className="btn-s btn-g" aria-label="Close" onClick={() => setUi({ modal: null })}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PayModal({ m }) {
  const { st, act } = useD()
  const [err, setErr, clear] = useErr()
  const b = st[m.k].find(x => x.id === m.id); if (!b) return null
  const [y, mo] = m.key.split('-').map(Number)
  const submit = e => {
    e.preventDefault(); const a = Number(e.currentTarget.elements.amount.value)
    if (!(a > 0)) return setErr('Enter the amount paid')
    act.payBill(m, a)
  }
  return (
    <Shell label="Mark paid" title={`Pay ${b.name}`}>
      <p className="meta" style={{ margin: 0 }}>{monthLabel(m.key)} · due {fmtD(dueDateFor(b, y, mo - 1))}</p>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={submit} onInput={clear}>
        <div><label className="lbl" htmlFor="m-amt">Amount actually paid (₹)</label><input id="m-amt" name="amount" type="number" min="1" defaultValue={b.amount} autoFocus /></div>
        <p className="meta" style={{ margin: 0 }}>🕒 Recorded now: {fmtTS(Date.now())}. It is added to {m.k === 'bills' ? 'Commercial · office expenses' : 'your personal expenses'} as {b.category}.</p>
        <Err msg={err} /><button className="btn-p">Mark paid</button>
      </form>
    </Shell>
  )
}

function ExpenseModal({ m }) {
  const { st, setUi, ops, toast } = useD()
  const [err, setErr, clear] = useErr()
  const office = m.tag === 'Office'
  const submit = async e => {
    e.preventDefault(); const E = e.currentTarget.elements; const a = Number(E.amount.value)
    if (!(a > 0)) return setErr('Enter an amount first')
    const d = { amount: a, category: E.category.value, note: E.note.value.trim(), ts: Date.now() }
    if (office) { await ops.add('office', { ...d, by: st.uid }); toast(`Saved ${R(a)} · added to Commercial${st.canFinance ? '' : ' for the owner and admins'}`) }
    else { await ops.add('expenses', d); toast(`Saved ${R(a)} · added to Expenses`) }
    setUi({ modal: null })
  }
  const setTag = tag => setUi(u => ({ modal: { ...u.modal, tag } }))
  return (
    <Shell label="Add expense" title="Add expense">
      <form style={{ display: 'grid', gap: 12 }} onSubmit={submit} onInput={clear}>
        <div><label className="lbl" htmlFor="m-amt">Amount (₹)</label><input id="m-amt" name="amount" type="number" inputMode="decimal" min="1" placeholder="1200" autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div><span className="lbl">Tag</span><div className="seg">
            <button type="button" className={!office ? 'on' : ''} onClick={() => setTag('Personal')}>Personal</button>
            <button type="button" className={office ? 'on' : ''} onClick={() => setTag('Office')}>Office</button>
          </div></div>
          <div><label className="lbl" htmlFor="m-cat">Category</label><select id="m-cat" name="category" key={m.tag}>{(office ? OFFICECAT : PCAT).map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="lbl" htmlFor="m-note">Note</label><input id="m-note" name="note" placeholder="Cab to Baner site" /></div>
        <p className="meta" style={{ margin: 0 }}>🕒 Recorded automatically: {fmtTS(Date.now())}. {office && !st.canFinance ? 'The owner or an admin can change it later in Commercial.' : `You can change the date and time later in ${office ? 'Commercial' : 'Expenses'}.`}</p>
        <p className="meta" style={{ margin: 0 }}>{office ? 'Office entries go to Commercial, which the owner and admins can see.' : 'Personal entries are private to you.'}</p>
        <Err msg={err} /><button className="btn-p">Save expense</button>
      </form>
    </Shell>
  )
}

export default function Modal() {
  const { ui } = useD()
  const m = ui.modal
  if (!m) return null
  return m.kind === 'pay' ? <PayModal m={m} /> : <ExpenseModal m={m} />
}
