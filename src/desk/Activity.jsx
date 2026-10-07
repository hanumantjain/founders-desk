import { useEffect, useState } from 'react'
import { useD } from './context'
import { describeActivity } from '../lib/derived'
import { fmtTS } from '../lib/utils'

export function ActivityLine({ a }) {
  const { st } = useD()
  const { who, text } = describeActivity(st, a)
  return <div className="note"><b style={{ fontWeight: 500 }}>{who}</b> {text}<div className="meta">{fmtTS(a.at)}</div></div>
}

/** Every change to one record, newest first. Refreshes when the studio feed gets a new entry for it. */
export function History({ kind, id }) {
  const { activity } = useD()
  const [rows, setRows] = useState(null)
  const latest = activity.items.find(a => a.kind === kind && a.record_id === id)
  const latestId = latest ? latest.id : null
  useEffect(() => {
    let on = true
    activity.loadFor(kind, id).then(r => { if (on) setRows(r) })
    return () => { on = false }
  }, [activity, kind, id, latestId])
  return (
    <div className="card"><div className="ctitle">History</div>
      {rows === null ? <p className="empty">Loading…</p>
        : rows.length ? rows.map(a => <ActivityLine key={a.id} a={a} />)
        : <p className="empty">No changes recorded yet.</p>}
    </div>
  )
}
