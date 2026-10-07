import { useState } from 'react'
import { useD } from './context'
import { Err, catPill, useErr } from '../components/common'
import { R, fmtDY, rid, todayISO, LCATS, STAGES } from '../lib/utils'

function ConvertForm({ l }) {
  const { st, ops, toast } = useD()
  const [ready, setReady] = useState(false)
  const check = e => { const E = e.currentTarget.elements; setReady(Number(E.quoted.value) > 0 && Number(E.adv.value) > 0) }
  const submit = async e => {
    e.preventDefault(); const E = e.currentTarget.elements
    const q = Number(E.quoted.value), a = Number(E.adv.value); if (!(q > 0 && a > 0)) return
    await ops.add('projects', { name: l.title, cat: l.cat, ref: l.ref || '', quoted: q, payments: [{ id: rid(), label: 'Advance', amount: a, date: todayISO() }], from: l.id, by: st.uid })
    await ops.del('leads', l.id); toast(st.canFinance ? `${l.title} moved to Projects` : `${l.title} is now a project. The owner and admins track it in Projects.`)
  }
  return (
    <form className="conv" onSubmit={submit} onInput={check}>
      <span style={{ color: 'var(--ok)', fontWeight: 500, fontSize: 13 }}>Convert to project</span>
      <input name="quoted" type="number" min="1" placeholder="Amount quoted ₹" defaultValue={l.quote || ''} aria-label="Amount quoted" />
      <input name="adv" type="number" min="1" placeholder="Advance received ₹" aria-label="Advance received" />
      <span className="meta">Date: {fmtDY(todayISO())} (editable later)</span>
      {ready && <button className="btn-p">Submit</button>}
    </form>
  )
}

function LeadRow({ l }) {
  const { ops, act } = useD()
  return (
    <div className={`lead${l.stage === 'Lost' ? ' lost' : ''}`}>
      <span><b style={{ fontWeight: 500 }}>{l.title}</b>
        <div className="meta">Added {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}{l.quote ? ' · quoted ' + R(l.quote) : ''}</div></span>
      <span className="meta" style={{ color: 'var(--ink)' }}>{l.ref || '—'}</span>
      <span>{catPill(l.cat)}</span>
      <select value={l.stage} aria-label={`Stage for ${l.title}`} onChange={e => ops.upd('leads', l.id, { stage: e.target.value, stageAt: Date.now() })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select>
      <button className="btn-s btn-g x" aria-label="Delete lead" onClick={() => act.del('leads', l.id)}>✕</button>
      {l.stage === 'Advance received' && <ConvertForm l={l} />}
    </div>
  )
}

export default function Leads() {
  const { st, ops, toast } = useD()
  const [err, setErr, clear] = useErr()
  const open = st.leads.filter(l => l.stage !== 'Lost').sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage) || (b.createdAt || 0) - (a.createdAt || 0))
  const lost = st.leads.filter(l => l.stage === 'Lost')
  const add = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const title = E.title.value.trim(); if (!title) return setErr('Enter a lead title first')
    setErr(''); await ops.add('leads', { title, ref: E.ref.value.trim(), cat: E.cat.value, stage: 'Enquiry', stageAt: Date.now(), by: st.uid }); f.reset(); toast('Lead added')
  }
  return (
    <>
      <div className="tiles">
        <div className="tile"><span className="lbl">Open leads</span><b>{open.length}</b><small>{open.filter(l => l.stage === 'Proposal sent' || l.stage === 'Negotiation').length} at proposal or negotiation</small></div>
        {st.canFinance && <div className="tile"><span className="lbl">Converted to projects</span><b>{st.projects.length}</b><small>All time</small></div>}
        <div className="tile"><span className="lbl">Lost</span><b>{lost.length}</b><small>Kept for your records</small></div>
      </div>
      <div className="card"><div className="ctitle">Add a lead · shared with your studio</div>
        <form className="form" onSubmit={add} onInput={clear}>
          <input name="title" placeholder="3BHK interior, Aundh" aria-label="Lead title" />
          <input name="ref" placeholder="Reference: Mr. Patil, Instagram…" aria-label="Reference" />
          <select name="cat" aria-label="Category">{LCATS.map(c => <option key={c}>{c}</option>)}</select>
          <button className="btn-p">Add lead</button>
        </form><Err msg={err} /></div>
      <div className="card"><div className="ctitle">All leads · {open.length}</div>
        <div className="lead head"><span>Lead</span><span>Reference</span><span>Category</span><span>Stage</span><span /></div>
        {open.length ? open.map(l => <LeadRow key={l.id} l={l} />) : <p className="empty">No open leads. Add the next enquiry above.</p>}
        {lost.length > 0 && <details><summary>Lost leads · {lost.length}</summary>{lost.map(l => <LeadRow key={l.id} l={l} />)}</details>}
      </div>
    </>
  )
}
