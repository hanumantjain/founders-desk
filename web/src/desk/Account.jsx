import { useState } from 'react'
import { useD } from './context'
import { Err, SureButton, useErr } from '../components/common'
import { supabase, errText } from '../lib/supabase'

/** Account and workspace: your name, studio name, partners and invites, sign out. */
export default function Account() {
  const { st, setUi, user, workspace, toast, onWorkspaceChange, reloadMembers, reloadInvites } = useD()
  const [err, setErr, clear] = useErr()
  const [busy, setBusy] = useState(false)
  const me = st.members.find(m => m.id === user.id)
  const isOwner = me && me.role === 'owner'

  const run = async (fn, ok) => {
    setBusy(true); setErr('')
    const { error } = await fn()
    setBusy(false)
    if (error) { setErr(errText(error)); return false }
    if (ok) toast(ok)
    return true
  }
  const rename = async e => {
    e.preventDefault(); const name = e.currentTarget.elements.name.value.trim()
    if (!name || name === workspace.name) return
    if (await run(() => supabase.from('workspaces').update({ name }).eq('id', workspace.id), 'Studio name saved')) onWorkspaceChange()
  }
  const saveMyName = async e => {
    e.preventDefault(); const name = e.currentTarget.elements.myname.value.trim()
    if (!name) return
    if (await run(() => supabase.from('profiles').update({ name }).eq('id', user.id), 'Your name is saved')) reloadMembers()
  }
  const invite = async e => {
    e.preventDefault(); const f = e.currentTarget; const email = f.elements.email.value.trim()
    if (!email) return setErr('Enter your partner’s email')
    if (await run(() => supabase.rpc('invite_partner', { p_email: email }), 'Invite saved')) { f.reset(); reloadInvites() }
  }
  const cancelInvite = async id => { if (await run(() => supabase.from('invites').delete().eq('id', id))) reloadInvites() }
  const removeMember = async id => {
    if (await run(() => supabase.rpc('remove_member', { p_user: id }), id === user.id ? 'You left the workspace' : 'Partner removed')) {
      if (id === user.id) onWorkspaceChange(); else reloadMembers()
    }
  }

  return (
    <div className="panel" role="dialog" aria-label="Account and workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>Account</b><button className="btn-s btn-g" aria-label="Close" onClick={() => setUi({ account: false })}>✕</button></div>

      <h3>You</h3>
      <div className="note">
        <form className="form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onSubmit={saveMyName}>
          <input name="myname" defaultValue={me ? me.name : ''} aria-label="Your name" placeholder="Your name" />
          <button className="btn-s" disabled={busy}>Save</button>
        </form>
        <div className="meta" style={{ marginTop: 6 }}>{user.email} · {isOwner ? 'Owner' : 'Partner'}</div>
      </div>

      <h3>Studio</h3>
      <div className="note">
        <form className="form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onSubmit={rename}>
          <input name="name" defaultValue={workspace.name} aria-label="Studio name" />
          <button className="btn-s" disabled={busy}>Rename</button>
        </form>
      </div>

      <h3>Partners · {st.members.length}</h3>
      {st.members.map(m => (
        <div key={m.id} className="note" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span>{m.name || m.email}{m.id === user.id ? ' (you)' : ''}<div className="meta">{m.email} · {m.role === 'owner' ? 'Owner' : 'Partner'}</div></span>
          {isOwner && m.id !== user.id && <SureButton className="btn-s btn-g" style={{ color: 'var(--bad)' }} sureText="Press again" onConfirm={() => removeMember(m.id)}>Remove</SureButton>}
        </div>
      ))}
      {st.invites.length > 0 && <>
        <h3>Pending invites · {st.invites.length}</h3>
        {st.invites.map(i => (
          <div key={i.id} className="note" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span>{i.email}<div className="meta">Waiting for them to sign up with this email</div></span>
            {isOwner && <button className="btn-s btn-g" disabled={busy} onClick={() => cancelInvite(i.id)}>Cancel</button>}
          </div>
        ))}
      </>}
      {isOwner ? (
        <div className="note">
          <div style={{ marginBottom: 8 }}>Invite a partner. They open this site, sign up with this email, confirm it, and join your studio.</div>
          <form className="form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onSubmit={invite} onInput={clear}>
            <input name="email" type="email" placeholder="partner@studio.com" aria-label="Partner's email" />
            <button className="btn-s btn-p" disabled={busy}>Invite</button>
          </form>
        </div>
      ) : <p className="meta">Only the studio owner can invite or remove partners.</p>}
      <Err msg={err} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn-s" onClick={() => supabase.auth.signOut()}>Sign out</button>
        {!isOwner && me && <SureButton className="btn-s btn-g" style={{ color: 'var(--bad)' }} sureText="Press again to leave. Your private data here is deleted." onConfirm={() => removeMember(user.id)}>Leave studio</SureButton>}
      </div>
    </div>
  )
}
