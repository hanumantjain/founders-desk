import { useD } from './context'
import { Err, useErr } from '../components/common'
import { firstName, partnerId } from '../lib/derived'
import { hash, rid } from '../lib/utils'

/** Shown on Projects and Commercial until someone enters the founders' password. */
export default function Gate() {
  const { st, ui, setUi, ops, act, toast } = useD()
  const [err, setErr, clear] = useErr()
  const r = st.reset, live = r && r.state === 'open' && Date.now() < r.expires
  const solo = st.members.length < 2, pid = partnerId(st)
  const myCodeReady = !!(r && st.notifs.some(n => n.kind === 'code' && n.resetAt === r.at))

  const savePassword = async (pw, what, approver) => {
    const salt = rid()
    await ops.set('sec', 'lock', { hash: await hash(salt + pw), salt, by: st.uid, at: Date.now() })
    await ops.add('seclog', { what, by: st.uid, ...(what === 'reset' ? { approver } : {}), at: Date.now() })
  }

  if (!st.lock || !st.lock.hash) {
    const setPw = async e => {
      e.preventDefault(); const E = e.currentTarget.elements
      if (E.p1.value.length < 4) return setErr('Use at least 4 characters')
      if (E.p1.value !== E.p2.value) return setErr("The two passwords don't match")
      await savePassword(E.p1.value, 'set'); act.unlocked(); toast('Password saved')
    }
    return (
      <div className="card gate"><div className="ic" aria-hidden="true">🔐</div>
        <h2 style={{ fontSize: 17 }}>Create the founders' password</h2>
        <p className="meta">One password protects Projects and Commercial for both founders. It is separate from your login password.</p>
        <form style={{ display: 'grid', gap: 8 }} onSubmit={setPw} onInput={clear}>
          <input name="p1" type="password" placeholder="New password" aria-label="New password" autoComplete="new-password" />
          <input name="p2" type="password" placeholder="Repeat password" aria-label="Repeat password" autoComplete="new-password" />
          <button className="btn-p">Save password</button>
        </form><Err msg={err} />
      </div>
    )
  }

  if (live && r.by === st.uid && ui.resetMode) {
    const got = Object.keys(r.codes || {}).length
    const doReset = async e => {
      e.preventDefault(); const E = e.currentTarget.elements
      if (!(r && r.state === 'open' && Date.now() < r.expires)) return setErr('This reset has expired. Start again with Forgot password.')
      if (E.p1.value.length < 4) return setErr('Use at least 4 characters for the new password')
      if (E.p1.value !== E.p2.value) return setErr("The two new passwords don't match")
      if (!solo && !(r.codes || {})[pid]) return setErr(`${firstName(st, pid)} hasn't opened the dashboard since you asked, so their code isn't ready yet.`)
      const ok1 = (r.codes || {})[st.uid] === await hash(E.c1.value.trim() + '|' + r.at)
      const ok2 = solo || (r.codes || {})[pid] === await hash(E.c2.value.trim() + '|' + r.at)
      if (!(ok1 && ok2)) {
        const n = (r.attempts || 0) + 1
        if (n >= 5) { await ops.upd('sec', 'reset', { attempts: n, state: 'cancelled' }); setUi({ resetMode: false }); toast('Too many wrong codes. Start the reset again.'); return }
        await ops.upd('sec', 'reset', { attempts: n }); return setErr(`One of the codes is wrong. ${5 - n} tries left.`)
      }
      await savePassword(E.p1.value, 'reset', solo ? null : pid)
      await ops.upd('sec', 'reset', { state: 'done' })
      setUi({ resetMode: false }); act.unlocked(); toast('Password reset')
    }
    return (
      <div className="card gate"><div className="ic" aria-hidden="true">🛡️</div>
        <h2 style={{ fontSize: 17 }}>Reset the password</h2>
        <div className={`note${myCodeReady ? ' code' : ''}`} style={{ textAlign: 'left' }}>{myCodeReady ? 'Your code is ready. Tap the bell 🔔 at the top right to see it.' : 'Preparing your code…'}</div>
        <p className="meta">{solo ? 'Your code is in the bell at the top right.' : `Your code is in your bell. ${firstName(st, pid)}'s code is in their bell. Ask them to send it to you if they agree.`}</p>
        <p className="meta">{solo ? '' : `Codes ready: ${got} of 2 · `}Tries left: {5 - (r.attempts || 0)} · Expires {new Date(r.expires).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
        <form style={{ display: 'grid', gap: 8 }} onSubmit={doReset} onInput={clear}>
          <input name="c1" inputMode="numeric" maxLength={2} placeholder="Your 2-digit code" aria-label="Your code" />
          {!solo && <input name="c2" inputMode="numeric" maxLength={2} placeholder={`${firstName(st, pid)}'s 2-digit code`} aria-label="Partner's code" />}
          <input name="p1" type="password" placeholder="New password" aria-label="New password" autoComplete="new-password" />
          <input name="p2" type="password" placeholder="Repeat new password" aria-label="Repeat new password" autoComplete="new-password" />
          <button className="btn-p">Reset password</button>
        </form><Err msg={err} />
        <button className="btn-g btn-s" onClick={act.cancelReset}>Cancel reset</button>
      </div>
    )
  }

  const unlock = async e => {
    e.preventDefault(); const pw = e.currentTarget.elements.pw.value
    if (!pw) return setErr('Enter the password first')
    if (await hash(st.lock.salt + pw) === st.lock.hash) act.unlocked()
    else setErr("That password doesn't match. Try again.")
  }
  return (
    <div className="card gate"><div className="ic" aria-hidden="true">🔒</div>
      <h2 style={{ fontSize: 17 }}>{ui.tab} is locked</h2>
      <p className="meta">Enter the founders' password. It opens Projects and Commercial until you press Lock or stay idle for 15 minutes.</p>
      {live && r.by !== st.uid && <div className="note code" style={{ textAlign: 'left' }}>{firstName(st, r.by)} asked to reset the password. Your 2-digit code is in the bell. Send it to them only if you agree.</div>}
      <form style={{ display: 'grid', gap: 8 }} onSubmit={unlock} onInput={clear}>
        <input name="pw" type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" />
        <button className="btn-p">Unlock</button>
      </form><Err msg={err} />
      <button className="btn-g btn-s" style={{ color: 'var(--accent)' }} onClick={act.forgot}>{live && r.by === st.uid ? 'Continue password reset' : 'Forgot password?'}</button>
    </div>
  )
}

export function LockBar() {
  const { setUi } = useD()
  return <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 0 10px' }}><button className="btn-s" onClick={() => setUi({ unlocked: false, sel: null })}>🔒 Lock</button></div>
}
