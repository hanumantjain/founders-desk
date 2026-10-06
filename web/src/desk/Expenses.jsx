import { useD } from './context'
import { DonutMoney } from '../components/common'
import { BillsCard, ExpRow } from './Bills'
import { AddExpenseTile } from './Today'
import { R, mkey, monthLabel, PBILLCAT } from '../lib/utils'

const COLS = ['var(--c5)', 'var(--c3)', 'var(--c1)', 'var(--c2)', 'var(--c4)', 'var(--c6)', 'var(--c6)']
const sum = a => a.reduce((s, e) => s + (+e.amount || 0), 0)

export default function Expenses() {
  const { st, ui, setUi } = useD()
  const [y, mNum] = ui.expM.split('-').map(Number)
  const mon = st.expenses.filter(e => mkey(new Date(e.ts)) === ui.expM).sort((a, b) => b.ts - a.ts)
  const yr = st.expenses.filter(e => new Date(e.ts).getFullYear() === y)
  const parts = [...new Set(mon.map(e => e.category))].map((c, i) => [c, sum(mon.filter(e => e.category === c)), COLS[i % COLS.length]]).filter(p => p[1] > 0)
  const months = [...Array(12)].map((_, i) => sum(yr.filter(e => new Date(e.ts).getMonth() === i))); const mx = Math.max(1, ...months)
  const monthsSoFar = new Date().getFullYear() === y ? new Date().getMonth() + 1 : 12

  return (
    <>
      <div className="tiles">
        <div className="tile"><span className="lbl">My spend · {monthLabel(ui.expM)}</span><b>{R(sum(mon))}</b><small>{mon.length} entries</small></div>
        <div className="tile"><span className="lbl">My spend · {y}</span><b>{R(sum(yr))}</b><small>Average {R(sum(yr) / Math.max(1, monthsSoFar))} a month</small></div>
        <AddExpenseTile />
      </div>
      <div className="grid2">
        <div className="card"><div className="ctitle">By category · {monthLabel(ui.expM)}</div>{parts.length ? <DonutMoney parts={parts} /> : <p className="empty">No spending recorded this month.</p>}</div>
        <div className="card"><div className="ctitle">Month by month · {y}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130 }}>
            {months.map((v, i) => (
              <div key={i} title={R(v)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: 22, height: Math.round(v / mx * 100), background: i === mNum - 1 ? 'var(--c1)' : 'var(--g1b)', borderRadius: '4px 4px 0 0', minHeight: v ? 2 : 0 }} />
                <span className="meta" style={{ fontSize: 10.5 }}>{'JFMAMJJASOND'[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="ctitle"><span>Personal expenses · only you see these</span><input type="month" value={ui.expM} style={{ width: 'auto' }} aria-label="Month" onChange={e => e.target.value && setUi({ expM: e.target.value })} /></div>
        {mon.length ? mon.map(e => <ExpRow key={e.id} e={e} k="expenses" />) : <p className="empty">No entries this month. Press + to add one. Office spends go to Commercial.</p>}
      </div>
      <BillsCard k="pbills" title="My monthly payments · only you see these" cats={PBILLCAT} ph="Home loan EMI" note="Add home rent, EMI, phone bill, SIP or insurance. Each reminds you in Today 3 days before it is due." />
    </>
  )
}
