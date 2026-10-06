import { useD } from './context'
import { CatTitle } from '../components/common'
import { CatInput, PhoneInput } from '../components/inputs'
import { dueBills, firstName, toOf } from '../lib/derived'
import { R, addDays, fmtD, fmtT, iso, todayISO, waLink, TTYPES } from '../lib/utils'

export function AddExpenseTile() {
  const { setUi } = useD()
  return <button className="addtile" onClick={() => setUi({ modal: { tag: 'Personal' } })}><span className="plus" aria-hidden="true">+</span>Add expense</button>
}

function ConfirmRow({ m }) {
  const { st, ops, act, toast } = useD()
  const link = waLink(m.phone, act.confirmMsg(m)); const conf = !!m.confirmedAt
  const state = conf ? <span className="pill p-ok">Confirmed ✓</span>
    : m.waOpenedAt ? <span className="pill p-warn">WhatsApp opened {new Date(m.waOpenedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · not confirmed yet</span>
    : <span className="pill p-bad">Not sent yet</span>
  const addPhone = async e => {
    e.preventDefault(); const ph = e.currentTarget.elements.phone.value.trim()
    if (!ph) return toast('Enter a phone number first')
    await ops.upd('meetings', m.id, { phone: ph }); if (m.person) await act.saveContact(m.person, ph); toast('Phone saved')
  }
  return (
    <div className="row">
      <div className="main">
        <div>{m.title}</div>
        <div className="meta">{fmtT(m.time) || 'Time not set'}{m.person ? ' · ' + m.person : ''}{m.place ? ' · ' + m.place : ''} · {m.type === 'Personal' ? 'Personal' : 'Business'}{m.owner && m.owner !== st.uid ? ' · ' + firstName(st, m.owner) + "'s" : ''}</div>
        <div style={{ marginTop: 4 }}>{state}</div>
      </div>
      <div className="side">
        {link
          ? <a className="btn-s" href={link} target="_blank" rel="noopener noreferrer" onClick={() => act.waOpened(m.id)} style={{ textDecoration: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', color: 'var(--ok)', fontWeight: 500 }}>{m.waOpenedAt ? 'Send on WhatsApp again' : 'WhatsApp confirmation'}</a>
          : <form className="form" style={{ gridTemplateColumns: 'minmax(0,150px) auto' }} onSubmit={addPhone}><PhoneInput placeholder="Add phone number" aria-label="Phone number" /><button className="btn-s">Save</button></form>}
        <button className="btn-s" onClick={() => act.copyMsg(m)}>Copy message</button>
        <button className="btn-s" onClick={() => act.confirmMeeting(m)}>{conf ? 'Undo confirmed' : 'Mark confirmed'}</button>
      </div>
    </div>
  )
}

export default function Today() {
  const { st, setUi, ops, act } = useD()
  const t = todayISO(), tm = iso(addDays(new Date(), 1))
  const daily = st.tasks.filter(x => x.horizon === 'Daily' && (!x.due || x.due <= t) && (!x.done || (x.doneAt && iso(new Date(x.doneAt)) === t)))
  const mine = st.assigned.filter(a => toOf(st, a) === st.uid && a.status !== 'Done')
  const bills = dueBills(st)
  const byTime = (a, b) => (a.time || '').localeCompare(b.time || '')
  const tmr = st.meetings.filter(m => m.date === tm && m.status !== 'Cancelled').sort(byTime)
  const todays = st.meetings.filter(m => m.date === t && m.status !== 'Cancelled').sort(byTime)
  const spend = st.expenses.filter(e => iso(new Date(e.ts)) === t).reduce((s, e) => s + (+e.amount || 0), 0)
  const openCount = daily.filter(x => !x.done).length + mine.length + bills.length

  const quickTask = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const title = E.title.value.trim(); if (!title) return
    const cat = E.cat.value.trim(); await act.saveCat(cat)
    await ops.add('tasks', { title, cat, type: E.type.value, horizon: 'Daily', due: todayISO(), done: false })
    E.title.value = ''; E.cat.value = ''
  }

  return (
    <>
      <div className="tiles">
        <div className="tile"><span className="lbl">To-dos today</span><b>{openCount}</b><small>{daily.filter(x => x.done).length} done</small></div>
        <div className="tile"><span className="lbl">Meetings tomorrow</span><b>{tmr.length}</b><small>{todays.length} today</small></div>
        <div className="tile"><span className="lbl">My spend today</span><b>{R(spend)}</b><small>Personal only</small></div>
        <AddExpenseTile />
      </div>

      <div className="card">
        <div className="ctitle">Tomorrow's meetings · confirm today{tmr.length ? <span className={`pill ${tmr.every(m => m.confirmedAt) ? 'p-ok' : 'p-warn'}`}>{tmr.filter(m => m.confirmedAt).length} of {tmr.length} confirmed</span> : null}</div>
        {tmr.length ? tmr.map(m => <ConfirmRow key={m.id} m={m} />) : <p className="empty">No meetings tomorrow. Add one in Calendar and its WhatsApp confirmation will show up here the day before.</p>}
      </div>

      {todays.length > 0 && (
        <div className="card"><div className="ctitle">Today's meetings</div>
          {todays.map(m => (
            <div className="row" key={m.id}><div className="main">{m.title}<div className="meta">{fmtT(m.time)}{m.person ? ' · ' + m.person : ''}{m.place ? ' · ' + m.place : ''}</div></div>
              <span className={`pill ${m.type === 'Personal' ? 'p-acc' : 'p-ok'}`}>{m.type === 'Personal' ? 'Personal' : 'Business'}</span></div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="ctitle">My to-dos today <button className="btn-s" onClick={() => setUi({ tab: 'Tasks' })}>Open tasks</button></div>
        {bills.map(x => (
          <div className="row" key={x.k + x.b.id + x.key}>
            <label className="chk"><input type="checkbox" checked={false} onChange={() => act.openPay(x.k, x.b.id, x.key)} />
              <span>Pay {x.b.name} · {R(x.b.amount)}<div className="meta" style={x.overdue ? { color: 'var(--bad)' } : undefined}>{x.overdue ? 'Overdue since ' : 'Due '}{fmtD(x.due)} · {x.k === 'bills' ? 'Office · shared' : 'Personal'}</div></span></label>
            <span className={`pill ${x.overdue ? 'p-bad' : 'p-warn'}`}>{x.overdue ? 'Overdue' : x.k === 'bills' ? 'Office bill' : 'My bill'}</span>
          </div>
        ))}
        {mine.map(a => (
          <div className="row" key={a.id}>
            <label className="chk"><input type="checkbox" checked={false} onChange={() => ops.upd('assigned', a.id, { status: 'Done', doneAt: Date.now() })} />
              <span>{a.title}<div className="meta">From {firstName(st, a.from)}{a.due ? ' · due ' + fmtD(a.due) : ''}</div></span></label>
            <span className="pill p-acc">Assigned to you</span>
          </div>
        ))}
        {daily.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map(x => (
          <div className="row" key={x.id}>
            <label className="chk"><input type="checkbox" checked={!!x.done} onChange={e => ops.upd('tasks', x.id, { done: e.target.checked, doneAt: e.target.checked ? Date.now() : null })} />
              <span className={x.done ? 'done' : ''}><CatTitle x={x} /></span></label>
            <span className="side"><span className="pill p-n">{x.type || 'Personal'}</span></span>
          </div>
        ))}
        {!bills.length && !mine.length && !daily.length && <p className="empty">Nothing on your list for today. Add daily to-dos in Tasks.</p>}
        <form className="form" style={{ marginTop: 10 }} onSubmit={quickTask}>
          <CatInput />
          <input name="title" placeholder="Add a to-do for today" aria-label="New to-do" />
          <select name="type" aria-label="Type">{TTYPES.map(x => <option key={x}>{x}</option>)}</select>
          <button className="btn-p">Add</button>
        </form>
      </div>
    </>
  )
}
