import { useD } from './context'
import { DonutMoney } from '../components/common'
import Gate, { LockBar } from './Gate'
import { BillsCard, ExpRow } from './Bills'
import { received } from '../lib/derived'
import { R, mkey, monthLabel, BILLCAT } from '../lib/utils'

const CC = ['var(--c3)', 'var(--c1)', 'var(--c2)', 'var(--c4)', 'var(--c5)', 'var(--c6)']

export default function Commercial() {
  const { st, ui, setUi } = useD()
  if (!ui.unlocked) return <Gate />
  const ents = st.office.filter(e => mkey(new Date(e.ts || e.createdAt)) === ui.comM).sort((a, b) => (b.ts || 0) - (a.ts || 0))
  const cost = ents.reduce((s, e) => s + (+e.amount || 0), 0)
  const recv = st.projects.reduce((s, p) => s + (p.payments || []).filter(x => (x.date || '').startsWith(ui.comM)).reduce((a, x) => a + (+x.amount || 0), 0), 0)
  const pend = st.projects.reduce((s, p) => s + Math.max(0, (+p.quoted || 0) - received(p)), 0)
  const cats = [...new Set(ents.map(e => e.category))]
  const label = monthLabel(ui.comM)
  return (
    <>
      <LockBar />
      <div className="tiles">
        <div className="tile"><span className="lbl">Office cost · {label}</span><b>{R(cost)}</b><small>{ents.length} entries</small></div>
        <div className="tile"><span className="lbl">Received from projects</span><b style={{ color: 'var(--ok)' }}>{R(recv)}</b><small>{label}</small></div>
        <div className="tile"><span className="lbl">Profit · {label.split(' ')[0]}</span><b style={{ color: recv - cost >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{R(recv - cost)}</b><small>Received minus office cost</small></div>
        <div className="tile"><span className="lbl">Still to receive</span><b>{R(pend)}</b><small>All projects</small></div>
      </div>
      <div className="grid2">
        <BillsCard k="bills" title="Office monthly payments · shared" cats={BILLCAT} ph="Office rent" note="Add rent, electricity and salaries. Each one reminds both founders in Today 3 days before it is due." />
        <div className="card"><div className="ctitle">Office cost by category</div>
          {cats.length ? <DonutMoney label="Office cost by category" parts={cats.map((c, i) => [c, ents.filter(e => e.category === c).reduce((s, e) => s + (+e.amount || 0), 0), CC[i % CC.length]])} /> : <p className="empty">No office costs this month yet.</p>}
        </div>
      </div>
      <div className="card">
        <div className="ctitle"><span>Office expenses · rent, bills, salaries and office entries</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <input type="month" value={ui.comM} style={{ width: 'auto' }} aria-label="Month" onChange={e => e.target.value && setUi({ comM: e.target.value })} />
            <button className="btn-s btn-p" onClick={() => setUi({ modal: { tag: 'Office' } })}>+ Office expense</button>
          </span></div>
        {ents.length ? ents.map(e => <ExpRow key={e.id} e={e} k="office" />) : <p className="empty">No office expenses this month. Entries tagged Office in the + window land here.</p>}
      </div>
    </>
  )
}
