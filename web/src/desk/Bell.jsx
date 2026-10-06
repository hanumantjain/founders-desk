import { useD } from './context'
import { ideasEnabled } from '../lib/supabase'
import { firstName, tips } from '../lib/derived'
import { fmtTS } from '../lib/utils'

function Growth() {
  const { st, ui, act } = useD()
  return (
    <>
      <div className="ctitle" style={{ margin: '0 0 6px' }}><span>Growth ideas for {st.studio}</span>
        {ideasEnabled && <button className="btn-s" disabled={ui.ideasBusy} onClick={act.getIdeas}>{ui.ideasBusy ? 'Thinking…' : ui.ideas ? 'New ideas' : 'Get ideas'}</button>}</div>
      {ui.ideas && ui.ideas.length ? ui.ideas.map((t, i) => <p key={i}>• {t}</p>)
        : ui.ideasErr ? <p className="meta">{ui.ideasErr}</p>
        : <p className="meta">{ideasEnabled ? 'Claude reads your leads, meetings and projects and suggests three actions for more leads and a smoother studio.' : 'Growth ideas are turned off. The README explains how to switch them on.'}</p>}
    </>
  )
}

export default function Bell({ onClose }) {
  const { st } = useD()
  const notes = st.notifs.slice().sort((a, b) => (b.at || 0) - (a.at || 0))
  const r = st.reset; const live = r && r.state === 'open' && Date.now() < r.expires
  const codes = notes.filter(n => n.kind === 'code' && live && n.resetAt === r.at)
  const others = notes.filter(n => n.kind !== 'code').slice(0, 6)
  const log = st.seclog.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 4)
  return (
    <div className="panel" role="dialog" aria-label="Notifications">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>Notifications</b><button className="btn-s btn-g" aria-label="Close" onClick={onClose}>✕</button></div>
      {codes.length > 0 && <><h3>Password reset</h3>{codes.map(n => <div key={n.id} className="note code">{n.text}<br /><b>{n.code}</b></div>)}</>}
      {others.length > 0 && <><h3>For you</h3>{others.map(n => <div key={n.id} className="note">{n.text}<div className="meta">{fmtTS(n.at)}</div></div>)}</>}
      <h3>💡 Growth ideas</h3><div className="note"><Growth /></div>
      <h3>Tips to use your desk better</h3>{tips(st).map((t, i) => <div key={i} className="note">{t}</div>)}
      {log.length > 0 && <><h3>Password records</h3>{log.map(l => (
        <div key={l.id} className="note">{l.what === 'set' ? `Password created by ${firstName(st, l.by)}` : `Password reset by ${firstName(st, l.by)}${l.approver ? `, approved by ${firstName(st, l.approver)}` : ''}`}<div className="meta">{fmtTS(l.at)}</div></div>
      ))}</>}
    </div>
  )
}
