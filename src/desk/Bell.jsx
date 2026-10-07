import { useD } from './context'
import { ideasEnabled } from '../lib/supabase'
import { tips } from '../lib/derived'
import { ActivityLine } from './Activity'
import { fmtTS } from '../lib/utils'

function Growth() {
  const { st, ui, act } = useD()
  return (
    <>
      <div className="ctitle" style={{ margin: '0 0 6px' }}><span>Growth ideas for {st.studio}</span>
        <button className="btn-s" disabled={ui.ideasBusy} onClick={act.getIdeas}>{ui.ideasBusy ? 'Thinking…' : ui.ideas ? 'New ideas' : 'Get ideas'}</button></div>
      {ui.ideas && ui.ideas.length ? ui.ideas.map((t, i) => <p key={i}>• {t}</p>)
        : ui.ideasErr ? <p className="meta">{ui.ideasErr}</p>
        : <p className="meta">Claude reads your leads, meetings and projects and suggests three actions for more leads and a smoother studio.</p>}
    </>
  )
}

export default function Bell({ onClose }) {
  const { st, activity } = useD()
  const notes = st.notifs.filter(n => n.kind !== 'code').sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 6)
  const feed = activity.items.slice(0, 15)
  return (
    <div className="panel" role="dialog" aria-label="Notifications">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>Notifications</b><button className="btn-s btn-g" aria-label="Close" onClick={onClose}>✕</button></div>
      {notes.length > 0 && <><h3>For you</h3>{notes.map(n => <div key={n.id} className="note">{n.text}<div className="meta">{fmtTS(n.at)}</div></div>)}</>}
      {ideasEnabled && <><h3>💡 Growth ideas</h3><div className="note"><Growth /></div></>}
      <h3>Studio activity</h3>
      {feed.length ? feed.map(a => <ActivityLine key={a.id} a={a} />) : <p className="meta">Changes to leads, meetings, assigned tasks{st.canFinance ? ', projects and office costs' : ''} show up here.</p>}
      <h3>Tips to use your desk better</h3>{tips(st).map((t, i) => <div key={i} className="note">{t}</div>)}
    </div>
  )
}
