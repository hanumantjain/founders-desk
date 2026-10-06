import { useD } from './context'
import { Err, useErr } from '../components/common'
import { PersonPhone } from '../components/inputs'
import { billsOn, firstName, isPaid } from '../lib/derived'
import { R, fmtD, fmtDY, fmtT, pad, todayISO, waLink } from '../lib/utils'

function EditMeetForm({ m }) {
  const { st, setUi, ops, act, toast } = useD()
  const save = async e => {
    e.preventDefault(); const E = e.currentTarget.elements
    const title = E.title.value.trim(); if (!title || !E.date.value) return toast('Enter a title and a date')
    const patch = { title, person: E.person.value.trim(), phone: E.phone.value.trim(), place: E.place.value.trim(), date: E.date.value, time: E.time.value, type: E.type.value, editedBy: st.uid, editedAt: Date.now() }
    const moved = patch.date !== m.date || patch.time !== (m.time || '')
    if (moved) { patch.confirmedAt = null; patch.waOpenedAt = null }
    setUi({ edit: null, calDay: patch.date })
    await act.saveContact(patch.person, patch.phone); await ops.upd('meetings', m.id, patch)
    toast(moved && (m.confirmedAt || m.waOpenedAt) ? 'Meeting updated. Date or time changed, so send a new confirmation.' : 'Meeting updated')
  }
  return (
    <div className="row"><form className="form" style={{ width: '100%' }} onSubmit={save}>
      <label><span className="lbl">Title</span><input name="title" defaultValue={m.title} /></label>
      <PersonPhone person={m.person || ''} phone={m.phone || ''} labels />
      <label><span className="lbl">Place</span><input name="place" defaultValue={m.place || ''} /></label>
      <label><span className="lbl">Date</span><input name="date" type="date" defaultValue={m.date} /></label>
      <label><span className="lbl">Time</span><input name="time" type="time" defaultValue={m.time || ''} /></label>
      <label><span className="lbl">Type</span><select name="type" defaultValue={m.type === 'Personal' ? 'Personal' : 'Business'}><option>Business</option><option>Personal</option></select></label>
      <button className="btn-p">Save changes</button><button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
    </form></div>
  )
}

export default function Calendar() {
  const { st, ui, setUi, ops, act, toast } = useD()
  const [err, setErr, clear] = useErr()
  const m0 = ui.calM, y = m0.getFullYear(), mo = m0.getMonth()
  const first = new Date(y, mo, 1); const lead = (first.getDay() + 6) % 7; const days = new Date(y, mo + 1, 0).getDate()
  const evs = d => st.meetings.filter(m => m.date === d)
  const t = todayISO()
  const dayBills = billsOn(st, ui.calDay)
  const list = evs(ui.calDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const nav = d => {
    if (d === 0) { const n = new Date(); setUi({ calM: new Date(n.getFullYear(), n.getMonth(), 1), calDay: todayISO() }) }
    else setUi({ calM: new Date(y, mo + d, 1) })
  }
  const add = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const title = E.title.value.trim(); if (!title || !E.date.value) return setErr('Enter a title and a date')
    setErr(''); await act.saveContact(E.person.value, E.phone.value)
    await ops.add('meetings', { title, person: E.person.value.trim(), phone: E.phone.value.trim(), place: E.place.value.trim(), date: E.date.value, time: E.time.value, type: E.type.value, status: 'Scheduled', owner: st.uid })
    setUi({ calDay: E.date.value }); f.reset(); toast('Meeting added')
  }

  const cells = []
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(mo + 1)}-${pad(d)}`; const e = evs(k); const bd = billsOn(st, k)
    cells.push(
      <button key={k} className={`${k === t ? 'today ' : ''}${k === ui.calDay ? 'sel' : ''}`} aria-label={`${fmtDY(k)}, ${e.length} meetings`} onClick={() => setUi({ calDay: k })}>
        <span>{d}</span>
        <span className="dots">
          {e.slice(0, 3).map(m => <i key={m.id} style={{ background: m.type === 'Personal' ? 'var(--c4)' : 'var(--c2)' }} />)}
          {bd.some(x => x.k === 'bills') && <i style={{ background: 'var(--c3)' }} />}
          {bd.some(x => x.k === 'pbills') && <i style={{ background: 'var(--c5)' }} />}
        </span>
      </button>
    )
  }

  return (
    <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <div className="card">
          <div className="ctitle"><span>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · shared calendar</span>
            <span><button className="btn-s" aria-label="Previous month" onClick={() => nav(-1)}>‹</button> <button className="btn-s" onClick={() => nav(0)}>Today</button> <button className="btn-s" aria-label="Next month" onClick={() => nav(1)}>›</button></span></div>
          <div className="cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="dh">{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={'b' + i} />)}
            {cells}
          </div>
          <div className="legend" style={{ gridAutoFlow: 'column', justifyContent: 'start', gap: 14, marginTop: 10 }}>
            <span><i style={{ background: 'var(--c2)' }} />Business</span><span><i style={{ background: 'var(--c4)' }} />Personal</span>
            <span><i style={{ background: 'var(--c3)' }} />Office payments</span><span><i style={{ background: 'var(--c5)' }} />My payments</span>
          </div>
        </div>
        <div className="card"><div className="ctitle">Add a meeting</div>
          <form className="form" key={ui.calDay} onSubmit={add} onInput={clear}>
            <input name="title" placeholder="Site visit, Baner" aria-label="Title" />
            <PersonPhone />
            <input name="place" placeholder="Studio, Aundh" aria-label="Place" />
            <input name="date" type="date" defaultValue={ui.calDay} aria-label="Date" />
            <input name="time" type="time" aria-label="Time" />
            <select name="type" aria-label="Type"><option>Business</option><option>Personal</option></select>
            <button className="btn-p">Add meeting</button>
          </form><Err msg={err} />
        </div>
      </div>

      <div className="card">
        <div className="ctitle">{fmtD(ui.calDay)}</div>
        {dayBills.map(x => {
          const pd = isPaid(x.b, x.key); const od = !pd && x.due < t
          return (
            <div className="row" key={x.k + x.b.id}>
              <div className="main"><div>Pay {x.b.name}</div><div className="meta">{x.k === 'bills' ? 'Office payment · shared' : 'My payment · private'} · {R(x.b.amount)}{pd ? ` · paid ${R(x.b.paid[x.key].amount || x.b.amount)}` : ''}</div></div>
              <div className="side"><span className={`pill ${pd ? 'p-ok' : od ? 'p-bad' : 'p-warn'}`}>{pd ? 'Paid' : od ? 'Overdue' : 'Due'}</span>
                {!pd && <button className="btn-s" onClick={() => act.openPay(x.k, x.b.id, x.key)}>Mark paid</button>}</div>
            </div>
          )
        })}
        {list.map(m => {
          if (ui.edit === 'meet:' + m.id) return <EditMeetForm key={m.id} m={m} />
          const link = waLink(m.phone, act.confirmMsg(m))
          return (
            <div className="row" key={m.id}>
              <div className="main"><div>{m.title}</div>
                <div className="meta">{fmtT(m.time) || 'Any time'}{m.person ? ' · ' + m.person : ''}{m.phone ? ' · ' + m.phone : ''}{m.place ? ' · ' + m.place : ''} · added by {firstName(st, m.owner)}{m.editedBy ? ` · edited by ${firstName(st, m.editedBy)}` : ''}</div></div>
              <div className="side">
                <span className={`pill ${m.type === 'Personal' ? 'p-acc' : 'p-ok'}`}>{m.type === 'Personal' ? 'Personal' : 'Business'}</span>
                {m.date <= t && <select className="btn-s" style={{ width: 'auto' }} aria-label="Status" value={m.status || 'Scheduled'} onChange={e => ops.upd('meetings', m.id, { status: e.target.value })}>{['Scheduled', 'Attended', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select>}
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="btn-s" style={{ textDecoration: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', color: 'var(--ok)' }}>WhatsApp</a>}
                <button className="btn-s btn-g" onClick={() => setUi({ edit: 'meet:' + m.id })}>Edit</button>
                <button className="btn-s btn-g" aria-label="Delete meeting" onClick={() => act.del('meetings', m.id)}>✕</button>
              </div>
            </div>
          )
        })}
        {!list.length && !dayBills.length && <p className="empty">Nothing on this day.</p>}
      </div>
    </div>
  )
}
