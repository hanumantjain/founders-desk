import { useD } from './context'
import { CatTitle, Donut, Err, HBars, useErr } from '../components/common'
import { CatInput } from '../components/inputs'
import { firstName, isDone, partners, periodStart, toOf } from '../lib/derived'
import { fmtD, fmtTS, parseISO, todayISO, LCATS, STAGES, TTYPES } from '../lib/utils'

const SUBS = ['Daily', 'Weekly', 'Monthly', 'Yearly goals', 'Progress']
const PH = { Daily: 'Send BOQ to Mr. Kulkarni', Weekly: 'Submit Gridline working drawings', Monthly: 'Close café Kothrud proposal' }

function EditTaskForm({ x, k }) {
  const { st, setUi, ops, act, toast } = useD()
  const save = async e => {
    e.preventDefault(); const E = e.currentTarget.elements
    const title = E.title.value.trim(); if (!title) return toast('Enter a task first')
    const patch = { title, type: E.type.value, cat: E.cat.value.trim(), due: E.due.value || '' }
    await act.saveCat(patch.cat)
    if (k === 'tasks') patch.horizon = E.horizon.value; else { patch.editedBy = st.uid; patch.editedAt = Date.now() }
    setUi({ edit: null }); await ops.upd(k, x.id, patch); toast('Task updated')
  }
  return (
    <div className="row"><form className="form" style={{ width: '100%' }} onSubmit={save}>
      <CatInput defaultValue={x.cat || ''} />
      <input name="title" defaultValue={x.title} aria-label="Task" />
      <select name="type" aria-label="Type" defaultValue={x.type || (k === 'assigned' ? 'Studio' : 'Personal')}>{TTYPES.map(t => <option key={t}>{t}</option>)}</select>
      {k === 'tasks' && <select name="horizon" aria-label="List" defaultValue={x.horizon}>{['Daily', 'Weekly', 'Monthly'].map(h => <option key={h}>{h}</option>)}</select>}
      <input name="due" type="date" defaultValue={x.due || ''} aria-label="Due date" />
      <button className="btn-p">Save</button><button type="button" onClick={() => setUi({ edit: null })}>Cancel</button>
    </form></div>
  )
}

function TaskRow({ x }) {
  const { ui, setUi, ops, act } = useD()
  if (ui.edit === 'tasks:' + x.id) return <EditTaskForm x={x} k="tasks" />
  const t = todayISO(); const late = !x.done && x.due && x.due < t
  return (
    <div className="row">
      <label className="chk"><input type="checkbox" checked={!!x.done} onChange={e => ops.upd('tasks', x.id, { done: e.target.checked, doneAt: e.target.checked ? Date.now() : null })} />
        <span className={x.done ? 'done' : ''}><CatTitle x={x} />
          {x.due && <div className="meta" style={late ? { color: 'var(--bad)' } : undefined}>{x.due === t ? 'Today' : late ? 'Overdue · ' + fmtD(x.due) : fmtD(x.due)}</div>}</span></label>
      <div className="side"><span className="pill p-n">{x.type || 'Personal'}</span>
        <button className="btn-s btn-g" onClick={() => setUi({ edit: 'tasks:' + x.id })}>Edit</button>
        <button className="btn-s btn-g" aria-label="Delete task" onClick={() => act.del('tasks', x.id)}>✕</button></div>
    </div>
  )
}

function TaskLists() {
  const { st, ui, setUi, ops, act, toast } = useD()
  const [err, setErr, clear] = useErr()
  const list = st.tasks.filter(x => x.horizon === ui.sub)
  const open = list.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))
  const done = list.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
  const others = partners(st)
  const asg = st.assigned.slice().sort((a, b) => (a.status === 'Done') - (b.status === 'Done') || (a.due || '').localeCompare(b.due || ''))

  const add = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const title = E.title.value.trim(); if (!title) return setErr('Enter a task first')
    setErr(''); const cat = E.cat.value.trim(); await act.saveCat(cat)
    if (E.for.value !== 'me') {
      await ops.add('assigned', { title, cat, type: E.type.value, from: st.uid, to: E.for.value, due: E.due.value || '', status: 'To do' })
      toast(`Assigned to ${firstName(st, E.for.value)}`)
    } else await ops.add('tasks', { title, cat, type: E.type.value, horizon: ui.sub, due: E.due.value || '', done: false })
    f.reset()
  }

  return (
    <>
      <div className="card">
        <div className="ctitle">My {ui.sub.toLowerCase()} tasks · private</div>
        {open.length ? open.map(x => <TaskRow key={x.id} x={x} />) : <p className="empty">No open tasks here.</p>}
        {done.length > 0 && <details><summary>Done · {done.length}</summary>{done.slice(0, 30).map(x => <TaskRow key={x.id} x={x} />)}</details>}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 12 }}>
          <span className="lbl">Add a {ui.sub.toLowerCase()} task</span>
          <form className="form" key={ui.sub} onSubmit={add} onInput={clear}>
            <CatInput />
            <input name="title" placeholder={PH[ui.sub]} aria-label="Task" />
            <select name="type" aria-label="Type">{TTYPES.map(x => <option key={x}>{x}</option>)}</select>
            <select name="for" aria-label="For"><option value="me">For me (private)</option>{others.map(m => <option key={m.id} value={m.id}>Assign to {firstName(st, m.id)}</option>)}</select>
            <input name="due" type="date" aria-label="Due date" defaultValue={ui.sub === 'Daily' ? todayISO() : ''} />
            <button className="btn-p">Add task</button>
          </form>
          <Err msg={err} />
          {!others.length && <p className="meta" style={{ margin: '6px 0 0' }}>Invite partners from the account menu (top right) to assign them tasks.</p>}
        </div>
      </div>
      <div className="card">
        <div className="ctitle">Assigned within the studio · everyone sees this</div>
        {asg.length ? asg.map(a => ui.edit === 'assigned:' + a.id ? <EditTaskForm key={a.id} x={a} k="assigned" /> : (
          <div className="row" key={a.id}>
            <div className="main"><div className={a.status === 'Done' ? 'done' : ''}><CatTitle x={a} /></div>
              <div className="meta">{firstName(st, a.from)} → {firstName(st, toOf(st, a))}{a.due ? ' · due ' + fmtD(a.due) : ''} · {a.type || 'Studio'}{a.editedBy ? ` · edited by ${firstName(st, a.editedBy)} ${fmtTS(a.editedAt)}` : ''}</div></div>
            <div className="side">
              <select className="btn-s" style={{ width: 'auto' }} aria-label="Status" value={a.status} onChange={e => ops.upd('assigned', a.id, { status: e.target.value, doneAt: e.target.value === 'Done' ? Date.now() : null })}>{['To do', 'In progress', 'Done'].map(s => <option key={s}>{s}</option>)}</select>
              <button className="btn-s btn-g" onClick={() => setUi({ edit: 'assigned:' + a.id })}>Edit</button>
              {a.from === st.uid && <button className="btn-s btn-g" aria-label="Delete" onClick={() => act.del('assigned', a.id)}>✕</button>}
            </div>
          </div>
        )) : <p className="empty">Nothing assigned yet. Pick a partner under "For" when adding a task.</p>}
      </div>
    </>
  )
}

const pct = g => Math.min(100, Math.round((g.current || 0) / (g.target || 1) * 100))

function Goals() {
  const { st, ops, act } = useD()
  const [err, setErr, clear] = useErr()
  const add = async e => {
    e.preventDefault(); const f = e.currentTarget, E = f.elements
    const title = E.title.value.trim(), n = Number(E.target.value)
    if (!title || !(n > 0)) return setErr('Enter a goal and a target number')
    setErr(''); await ops.add('goals', { title, type: E.type.value, target: n, current: 0, year: new Date().getFullYear() }); f.reset()
  }
  return (
    <>
      <div className="card"><div className="ctitle">Add a {new Date().getFullYear()} goal</div>
        <form className="form" onSubmit={add} onInput={clear}>
          <input name="title" placeholder="Complete 12 projects" aria-label="Goal" />
          <select name="type" aria-label="Type">{TTYPES.map(x => <option key={x}>{x}</option>)}</select>
          <input name="target" type="number" min="1" placeholder="Target: 12" aria-label="Target number" />
          <button className="btn-p">Add goal</button>
        </form><Err msg={err} /></div>
      <div className="card"><div className="ctitle">My yearly goals · private</div>
        {st.goals.length ? st.goals.map(g => (
          <div className="row" key={g.id}>
            <div className="main"><div>{g.title} <span className="pill p-n">{g.type}</span></div>
              <div className="bar" style={{ marginTop: 6 }}><i style={{ width: pct(g) + '%' }} /></div>
              <div className="meta num">{g.current || 0} of {g.target} · {pct(g)}%</div></div>
            <div className="side">
              <button className="btn-s" aria-label="Decrease" onClick={() => ops.upd('goals', g.id, { current: Math.max(0, (g.current || 0) - 1) })}>−</button>
              <button className="btn-s" aria-label="Increase" onClick={() => ops.upd('goals', g.id, { current: (g.current || 0) + 1 })}>+</button>
              <button className="btn-s btn-g" aria-label="Delete goal" onClick={() => act.del('goals', g.id)}>✕</button>
            </div>
          </div>
        )) : <p className="empty">No goals yet. Add a few for yourself and for {st.studio}.</p>}
      </div>
    </>
  )
}

function Progress() {
  const { st, ui, setUi } = useD()
  const ps = periodStart(ui.period); const inP = t => t && t >= ps
  const createdP = st.tasks.filter(x => inP(x.createdAt))
  const doneT = st.tasks.filter(x => x.done && inP(x.doneAt))
  const asgDone = st.assigned.filter(a => toOf(st, a) === st.uid && a.status === 'Done' && inP(a.doneAt))
  const byType = t => doneT.filter(x => (x.type || 'Personal') === t).length + (t === 'Studio' ? asgDone.length : 0)
  const rate = createdP.length ? Math.round(createdP.filter(x => x.done).length / createdP.length * 100) : 0
  const mt = st.meetings.filter(m => parseISO(m.date).getTime() >= ps && m.date <= todayISO())
  const att = mt.filter(m => m.status === 'Attended').length, can = mt.filter(m => m.status === 'Cancelled').length
  const leadsP = st.leads.filter(l => inP(l.createdAt)), wonP = st.projects.filter(p => inP(p.createdAt))
  const conv = (leadsP.length + wonP.length) ? Math.round(wonP.length / (leadsP.length + wonP.length) * 100) : 0
  const allLeads = [...st.leads.map(l => l.cat), ...st.projects.map(p => p.cat)]
  const cats = LCATS.map((c, i) => [c, allLeads.filter(x => x === c).length, ['var(--c4)', 'var(--c1)', 'var(--c3)'][i]])
  const stages = STAGES.map(s => [s, st.leads.filter(l => l.stage === s).length, s === 'Lost' ? 'var(--c6)' : 'var(--c2)'])
  const active = st.projects.filter(p => !isDone(p)).length, comp = st.projects.length - active
  const refs = {}; st.leads.concat(st.projects).forEach(l => { const k = (l.ref || 'Not given').trim(); refs[k] = (refs[k] || 0) + 1 })
  const topRefs = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(r => [r[0], r[1], 'var(--c5)'])
  const h2 = { font: '600 15px var(--body)', margin: '4px 0 10px' }
  return (
    <>
      <div className="subtabs" style={{ marginTop: -6 }}>
        {[['week', 'Last 7 days'], ['month', 'This month'], ['year', 'This year']].map(p => <button key={p[0]} className={ui.period === p[0] ? 'on' : ''} onClick={() => setUi({ period: p[0] })}>{p[1]}</button>)}
      </div>
      <div className="tiles">
        <div className="tile"><span className="lbl">Tasks completed</span><b>{doneT.length + asgDone.length}</b><small>{rate}% of tasks added in this period are done</small></div>
        <div className="tile"><span className="lbl">Meetings attended</span><b>{att}</b><small>{can} cancelled · {mt.length} in total</small></div>
        <div className="tile"><span className="lbl">New leads</span><b>{leadsP.length + wonP.length}</b><small>{wonP.length} became projects</small></div>
        <div className="tile"><span className="lbl">Lead conversion</span><b>{conv}%</b><small>Leads that reached advance</small></div>
      </div>
      <h2 style={h2}>Personal and professional</h2>
      <div className="grid2">
        <div className="card"><div className="ctitle">Where my work went · tasks done</div><Donut label="Tasks done by type" parts={[['Personal', byType('Personal'), 'var(--c4)'], ['Professional', byType('Professional'), 'var(--c1)'], ['Studio', byType('Studio'), 'var(--c3)']]} /></div>
        <div className="card"><div className="ctitle">Meetings by type</div><Donut label="Meetings by type" parts={[['Business', mt.filter(m => m.type !== 'Personal').length, 'var(--c2)'], ['Personal', mt.filter(m => m.type === 'Personal').length, 'var(--c4)']]} /></div>
        <div className="card"><div className="ctitle">My yearly goals</div>
          {st.goals.length ? st.goals.map(g => (
            <div key={g.id} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}><span>{g.title}</span><span className="num meta">{pct(g)}%</span></div><div className="bar"><i style={{ width: pct(g) + '%' }} /></div></div>
          )) : <p className="empty">Add goals in Yearly goals to track them here.</p>}
        </div>
      </div>
      <h2 style={h2}>{st.studio}</h2>
      <div className="grid2">
        <div className="card"><div className="ctitle">Leads and projects by category</div><Donut parts={cats} label="By category" /></div>
        <div className="card"><div className="ctitle">Open leads by stage</div><HBars items={stages} /></div>
        <div className="card"><div className="ctitle">Where work comes from · top references</div>{topRefs.length ? <HBars items={topRefs} /> : <p className="empty">No leads yet.</p>}</div>
        <div className="card"><div className="ctitle">Projects</div><Donut parts={[['Active', active, 'var(--c1)'], ['Completed', comp, 'var(--c2)']]} label="Projects" /></div>
      </div>
    </>
  )
}

export default function Tasks() {
  const { ui, setUi } = useD()
  return (
    <>
      <div className="subtabs">{SUBS.map(s => <button key={s} className={ui.sub === s ? 'on' : ''} onClick={() => setUi({ sub: s })}>{s}</button>)}</div>
      {ui.sub === 'Yearly goals' ? <Goals /> : ui.sub === 'Progress' ? <Progress /> : <TaskLists />}
    </>
  )
}
