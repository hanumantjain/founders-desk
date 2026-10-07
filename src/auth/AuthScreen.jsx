import { useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import About from './About'

const redirect = () => window.location.origin + window.location.pathname

/**
 * mode: 'signin' | 'signup' | 'forgot' | 'newPassword'
 * 'newPassword' is shown after the user follows a password-reset email link.
 */
export default function AuthScreen({ initialMode = 'signin', onPasswordSet }) {
  const [mode, setMode] = useState(initialMode)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [about, setAbout] = useState(false)
  const go = m => { setMode(m); setErr(''); setMsg('') }

  const submit = async e => {
    e.preventDefault(); const E = e.currentTarget.elements
    setErr(''); setMsg('')
    const email = E.email ? E.email.value.trim().toLowerCase() : ''
    const password = E.password ? E.password.value : ''
    if (mode !== 'newPassword' && !email) return setErr('Enter your email')
    if ((mode === 'signup' || mode === 'newPassword') && password.length < 8) return setErr('Use at least 8 characters for your password')
    if ((mode === 'signup' || mode === 'newPassword') && password !== E.password2.value) return setErr("The two passwords don't match")
    if (mode === 'signup' && !E.name.value.trim()) return setErr('Enter your name')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setErr(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : errText(error))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: E.name.value.trim() }, emailRedirectTo: redirect() } })
        if (error) setErr(errText(error))
        else if (!data.session) setMsg(`We sent a confirmation link to ${email}. Open it to finish creating your account, then sign in.`)
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })
        if (error) setErr(errText(error)); else setMsg(`If ${email} has an account, a reset link is on its way.`)
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) setErr(errText(error)); else onPasswordSet && onPasswordSet()
      }
    } finally { setBusy(false) }
  }

  if (about) return <About onBack={() => setAbout(false)} onSignup={() => { setAbout(false); go('signup') }} />

  const titles = { signin: 'Sign in', signup: 'Create your account', forgot: 'Reset your password', newPassword: 'Choose a new password' }
  return (
    <div className="auth">
      <div className="card">
        <h1><b>Founders</b> Desk</h1>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{titles[mode]}</h2>
        <form onSubmit={submit} onInput={() => err && setErr('')} key={mode}>
          {mode === 'signup' && <label><span className="lbl">Your name</span><input name="name" autoComplete="name" placeholder="Vijay Sharma" /></label>}
          {mode !== 'newPassword' && <label><span className="lbl">Email</span><input name="email" type="email" autoComplete="email" placeholder="you@studio.com" /></label>}
          {mode !== 'forgot' && <label><span className="lbl">{mode === 'newPassword' ? 'New password' : 'Password'}</span><input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>}
          {(mode === 'signup' || mode === 'newPassword') && <label><span className="lbl">Repeat password</span><input name="password2" type="password" autoComplete="new-password" /></label>}
          <div className="err">{err}</div>
          {msg && <div className="ok">{msg}</div>}
          <button className="btn-p" disabled={busy}>{busy ? 'Please wait…' : { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', newPassword: 'Save password' }[mode]}</button>
        </form>
        <div className="center meta" style={{ display: 'grid', gap: 6 }}>
          {mode === 'signin' && <>
            <span>New here? <button className="linkbtn" onClick={() => go('signup')}>Create an account</button></span>
            <button className="linkbtn" onClick={() => go('forgot')}>Forgot password?</button>
          </>}
          {mode !== 'newPassword' && <button className="linkbtn" onClick={() => { setAbout(true); window.scrollTo({ top: 0 }) }}>What is Founders Desk?</button>}
          {(mode === 'signup' || mode === 'forgot') && <span>Already have an account? <button className="linkbtn" onClick={() => go('signin')}>Sign in</button></span>}
        </div>
      </div>
    </div>
  )
}
