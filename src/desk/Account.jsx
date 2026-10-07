import { useState } from 'react'
import { useD } from './context'
import { Err, SureButton, useErr } from '../components/common'
import { supabase, errText } from '../lib/supabase'

const ROLE = { owner: 'Owner', admin: 'Admin', member: 'Member' }

/** Account and workspace: your name, studio name, people, roles and invites, sign out. */
export default function Account() {
  const { st, setUi, user, workspace, toast, onWorkspaceChange, reloadMembers, reloadInvites } = useD()
  const [err, setErr, clear] = useErr()
  const [busy, setBusy] = useState(false)
  const me = st.members.find(m => m.id === user.id)
  const isOwner = me && me.role === 'owner'
  const canManage = isOwner || (me && me.role === 'admin')
  const canRemove = m => m.id !== user.id && (isOwner || (canManage && m.role === 'member'))

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
    e.preventDefault(); const f = e.currentTarget; const email = f.elements.email.value.trim(), role = f.elements.role ? f.elements.role.value : 'member'
    if (!email) return setErr('Enter their email')
    if (await run(() => supabase.rpc('invite_partner', { p_email: email, p_role: role }), 'Invite saved')) { f.reset(); reloadInvites() }
  }
  const cancelInvite = async id => { if (await run(() => supabase.from('invites').delete().eq('id', id))) reloadInvites() }
  const removeMember = async id => {
    if (await run(() => supabase.rpc('remove_member', { p_user: id }), id === user.id ? 'You left the workspace' : 'Partner removed')) {
      if (id === user.id) onWorkspaceChange(); else reloadMembers()
    }
  }
  const setRole = async (id, role) => { if (await run(() => supabase.rpc('set_member_role', { p_user: id, p_role: role }), 'Role saved')) reloadMembers() }
  const makeOwner = async id => { if (await run(() => supabase.rpc('transfer_ownership', { p_user: id }), 'Ownership handed over')) reloadMembers() }

  return (
    <div className="panel" role="dialog" aria-label="Account and workspace">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>Account</b><button className="btn-s btn-g" aria-label="Close" onClick={() => setUi({ account: false })}>✕</button></div>

      <h3>You</h3>
      <div className="note">
        <form className="form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onSubmit={saveMyName}>
          <input name="myname" defaultValue={me ? me.name : ''} aria-label="Your name" placeholder="Your name" />
          <button className="btn-s" disabled={busy}>Save</button>
        </form>
        <div className="meta" style={{ marginTop: 6 }}>{user.email} · {ROLE[me && me.role] || 'Member'}</div>
      </div>

      <h3>Studio</h3>
      <div className="note">
        <form className="form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onSubmit={rename}>
          <input name="name" defaultValue={workspace.name} aria-label="Studio name" />
          <button className="btn-s" disabled={busy}>Rename</button>
        </form>
      </div>

      <h3>People · {st.members.length}</h3>
      <p className="meta">Owner and admins see Projects and Commercial. Members see everything else, and can still log office spends and convert leads.</p>
      {st.members.map(m => (
        <div key={m.id} className="note" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{m.name || m.email}{m.id === user.id ? ' (you)' : ''}<div className="meta">{m.email}{isOwner && m.role !== 'owner' ? '' : ` · ${ROLE[m.role] || 'Member'}`}</div></span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isOwner && m.role !== 'owner' && <>
              <select className="btn-s" style={{ width: 'auto' }} aria-label={`Role for ${m.name || m.email}`} value={m.role} disabled={busy} onChange={e => setRole(m.id, e.target.value)}>
                <option value="admin">Admin</option><option value="member">Member</option>
              </select>
              <SureButton className="btn-s btn-g" sureText="Press again to hand over" onConfirm={() => makeOwner(m.id)}>Make owner</SureButton>
            </>}
            {canRemove(m) && <SureButton className="btn-s btn-g" style={{ color: 'var(--bad)' }} sureText="Press again" onConfirm={() => removeMember(m.id)}>Remove</SureButton>}
          </span>
        </div>
      ))}
      {st.invites.length > 0 && <>
        <h3>Pending invites · {st.invites.length}</h3>
        {st.invites.map(i => (
          <div key={i.id} className="note" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span>{i.email}<div className="meta">{ROLE[i.role] || 'Member'} · waiting for them to sign up with this email</div></span>
            {canManage && <button className="btn-s btn-g" disabled={busy} onClick={() => cancelInvite(i.id)}>Cancel</button>}
          </div>
        ))}
      </>}
      {canManage ? (
        <div className="note">
          <div style={{ marginBottom: 8 }}>Invite someone. They open this site, sign up with this email, confirm it, and join your studio.{isOwner ? '' : ' Admins can invite members.'}</div>
          <form className="form" style={{ gridTemplateColumns: isOwner ? 'minmax(0,1fr) auto auto' : 'minmax(0,1fr) auto' }} onSubmit={invite} onInput={clear}>
            <input name="email" type="email" placeholder="partner@studio.com" aria-label="Their email" />
            {isOwner && <select name="role" aria-label="Role" defaultValue="member"><option value="member">Member</option><option value="admin">Admin</option></select>}
            <button className="btn-s btn-p" disabled={busy}>Invite</button>
          </form>
        </div>
      ) : <p className="meta">Only the owner and admins can invite or remove people.</p>}
      <Err msg={err} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn-s" onClick={() => supabase.auth.signOut()}>Sign out</button>
        {!isOwner && me && <SureButton className="btn-s btn-g" style={{ color: 'var(--bad)' }} sureText="Press again to leave. Your private data here is deleted." onConfirm={() => removeMember(user.id)}>Leave studio</SureButton>}
      </div>
    </div>
  )
}
