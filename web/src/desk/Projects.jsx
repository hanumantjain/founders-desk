import { useD } from './context'
import { Err, SureButton, catPill, useErr } from '../components/common'
import Gate, { LockBar } from './Gate'
import { isDone, received } from '../lib/derived'
import { R, fmtDY, rid, todayISO, PAY_LABELS } from '../lib/utils'

const flatTile = { background: 'var(--surface2)', border: 'none' }

function ProjectDetail({ p }) {
  const { ui, setUi, ops, toast } = useD()
  const [err, setErr, clear] = useErr()
  const r = received(p), q = Number(p.quoted) || 0; const pct = q ? Math.min(100, Math.round(r / q * 100)) : 0
  const pays = (p.payments || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const saveQuote = async e => {
    e.preventDefault(); const v = Number(e.currentTarget.elements.q.value); if (!(v > 0)) return
    setUi({ edit: null }); await ops.upd('projects', p.id, { quoted: v }); toast('Saved')
  }
  const addPay = async e => {
    e.preventDefault(); const f = e.currentTarget, a = Number(f.elements.amount.value)
    if (!(a > 0)) return setErr('Enter an amount first')
    setErr(''); await ops.upd('projects', p.id, { payments: [...(p.payments || []), { id: rid(), label: f.elements.label.value, amount: a, date: todayISO() }] })
    f.reset(); toast(`Entry added · ${R(a)}`)
  }
  const savePay = async (e, x) => {
    e.preventDefault(); const E = e.currentTarget.elements; const a = Number(E.amount.value)
    if (!(a > 0) || !E.date.value) return toast('Enter a valid amount and date')
    setUi({ edit: null })
    await ops.upd('projects', p.id, { payments: (p.payments || []).map(y => y.id === x.id ? { ...y, label: E.label.value.trim() || y.label, amount: a, date: E.date.value } : y) })
    toast('Saved')
  }
  const delPay = async x => { setUi({ edit: null }); await ops.upd('projects', p.id, { payments: (p.payments || []).filter(y => y.id !== x.id) }); toast('Entry deleted') }

  return (
    <>
      <LockBar />
      <button className="btn-s" style={{ marginBottom: 10 }} onClick={() => setUi({ sel: null, edit: null })}>← All projects</button>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div><h2 style={{ font: '600 18px var(--body)' }}>{p.name}</h2>
            <div className="meta">{catPill(p.cat)} Reference: {p.ref || '—'} · started {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div></div>
          {isDone(p) ? <span className="pill p-ok">Completed</span> : <span className="pill p-warn">Active</span>}
        </div>
        <div className="tiles" style={{ margin: '12px 0 8px' }}>
          <div className="tile" style={flatTile}><span className="lbl">Amount quoted</span><b>{R(q)}</b><button className="btn-s btn-g" style={{ padding: 0, color: 'var(--accent)' }} onClick={() => setUi({ edit: 'quote' })}>Change</button></div>
          <div className="tile" style={flatTile}><span className="lbl">Received</span><b style={{ color: 'var(--ok)' }}>{R(r)}</b><small>{pct}% collected</small></div>
          <div className="tile" style={flatTile}><span className="lbl">To be received</span><b style={{ color: q - r > 0 ? 'var(--bad)' : 'var(--ok)' }}>{R(Math.max(0, q - r))}</b></div>
        </div>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        {ui.edit === 'quote' && (
          <form className="form" style={{ marginTop: 10 }} onSubmit={saveQuote}>
            <input name="q" type="number" defaultValue={q} aria-label="Amount quoted" /><button className="btn-p">Save</button><button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
          </form>
        )}
      </div>
      <div className="card"><div className="ctitle">Payments received</div>
        {pays.length ? pays.map(x => ui.edit === 'pay:' + x.id ? (
          <div className="row" key={x.id}><form className="form" style={{ width: '100%' }} onSubmit={e => savePay(e, x)}>
            <input name="label" defaultValue={x.label} aria-label="Label" />
            <input name="amount" type="number" defaultValue={x.amount} aria-label="Amount" />
            <input name="date" type="date" defaultValue={x.date} aria-label="Date" />
            <button className="btn-p">Save</button><button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
            <button type="button" className="btn-g" style={{ color: 'var(--bad)' }} onClick={() => delPay(x)}>Delete</button>
          </form></div>
        ) : (
          <div className="row" key={x.id}><div className="main">{x.label}<div className="meta">{fmtDY(x.date)}</div></div>
            <div className="side"><b className="num">{R(x.amount)}</b><button className="btn-s btn-g" onClick={() => setUi({ edit: 'pay:' + x.id })}>Edit</button></div></div>
        )) : <p className="empty">No payments yet.</p>}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 12 }}>
          <span className="lbl">Add new entry · date is recorded today and can be edited later</span>
          <form className="form" onSubmit={addPay} onInput={clear}>
            <select name="label" aria-label="Entry">{PAY_LABELS.map(s => <option key={s}>{s}</option>)}</select>
            <input name="amount" type="number" min="1" placeholder="Amount ₹" aria-label="Amount" />
            <button className="btn-p">Add entry</button>
          </form><Err msg={err} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <SureButton className="btn-s btn-g" style={{ color: 'var(--bad)' }} sureText="Press again to delete this project for everyone"
          onConfirm={async () => { setUi({ sel: null }); await ops.del('projects', p.id); toast('Project deleted') }}>Delete this project</SureButton>
      </div>
    </>
  )
}

export default function Projects() {
  const { st, ui, setUi } = useD()
  if (!ui.unlocked) return <Gate />
  if (ui.sel) {
    const p = st.projects.find(x => x.id === ui.sel)
    if (p) return <ProjectDetail p={p} />
  }
  const act = st.projects.filter(p => !isDone(p)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), done = st.projects.filter(isDone)
  const row = p => {
    const r = received(p), q = Number(p.quoted) || 0
    return (
      <button key={p.id} className="prow" onClick={() => { setUi({ sel: p.id, edit: null }); window.scrollTo({ top: 0 }) }}>
        <span style={{ minWidth: 0 }}><b style={{ fontWeight: 500 }}>{p.name}</b><span className="meta" style={{ display: 'block' }}>{p.cat} · quoted {R(q)} · {q ? Math.round(r / q * 100) : 0}% collected</span></span>
        <span className={`pill ${q - r > 0 ? 'p-warn' : 'p-ok'}`}>{q - r > 0 ? R(q - r) + ' due' : 'Fully paid'}</span>
      </button>
    )
  }
  const tq = act.reduce((s, p) => s + (+p.quoted || 0), 0), tr = act.reduce((s, p) => s + received(p), 0)
  return (
    <>
      <LockBar />
      <div className="tiles">
        <div className="tile"><span className="lbl">Active projects</span><b>{act.length}</b><small>{done.length} completed</small></div>
        <div className="tile"><span className="lbl">Quoted · active</span><b>{R(tq)}</b></div>
        <div className="tile"><span className="lbl">Received · active</span><b>{R(tr)}</b></div>
        <div className="tile"><span className="lbl">To be received</span><b style={{ color: 'var(--bad)' }}>{R(tq - tr)}</b></div>
      </div>
      <div className="card"><div className="ctitle">Active projects · tap one to open</div>{act.length ? act.map(row) : <p className="empty">No active projects. A lead becomes a project when you submit its advance in Leads.</p>}</div>
      <div className="card"><div className="ctitle">Completed · fully paid</div>{done.length ? done.map(row) : <p className="empty">Projects move here once the full quoted amount is received.</p>}</div>
    </>
  )
}
