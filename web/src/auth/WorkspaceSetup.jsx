import { useEffect, useState } from 'react'
import { supabase, errText } from '../lib/supabase'

/** First run after sign-in: join a studio you were invited to, or start your own. */
export default function WorkspaceSetup({ user, onReady }) {
  const [invites, setInvites] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('invites').select('id, workspace_id, workspaces(name)').eq('email', user.email.toLowerCase())
      .then(({ data }) => setInvites(data || []))
  }, [user.email])

  const create = async e => {
    e.preventDefault(); const name = e.currentTarget.elements.name.value.trim()
    if (!name) return setErr('Enter your studio’s name')
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('create_workspace', { p_name: name })
    setBusy(false)
    if (error) setErr(errText(error)); else onReady()
  }
  const accept = async id => {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('accept_invite', { p_invite: id })
    setBusy(false)
    if (error) setErr(errText(error)); else onReady()
  }
  const decline = async id => {
    await supabase.from('invites').delete().eq('id', id)
    setInvites(v => v.filter(i => i.id !== id))
  }

  return (
    <div className="auth">
      <div className="card">
        <h1><b>Founders</b> Desk</h1>
        {invites === null ? <p className="meta">Checking for invites…</p> : <>
          {invites.map(i => (
            <div key={i.id} className="note">
              You're invited to join <b>{i.workspaces ? i.workspaces.name : 'a studio'}</b> as a founder.
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-s btn-p" disabled={busy} onClick={() => accept(i.id)}>Join</button>
                <button className="btn-s" disabled={busy} onClick={() => decline(i.id)}>Decline</button>
              </div>
            </div>
          ))}
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{invites.length ? 'Or start your own studio' : 'Set up your studio'}</h2>
          <p className="meta" style={{ margin: 0 }}>Your studio is your workspace. You can invite one partner to share leads, projects, meetings and office costs. Your tasks and personal expenses stay private.</p>
          <form onSubmit={create}>
            <label><span className="lbl">Studio name</span><input name="name" placeholder="Triline Designs" /></label>
            <button className="btn-p" disabled={busy}>Create studio</button>
          </form>
        </>}
        <div className="err">{err}</div>
        <div className="center meta">Signed in as {user.email} · <button className="linkbtn" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      </div>
    </div>
  )
}
