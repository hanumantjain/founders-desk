import { useCallback, useEffect, useState } from 'react'
import { configured, supabase } from './lib/supabase'
import AuthScreen from './auth/AuthScreen'
import WorkspaceSetup from './auth/WorkspaceSetup'
import Desk from './desk/Desk'

const Loading = ({ text = 'Loading…' }) => <div className="auth"><p className="meta">{text}</p></div>

function NotConfigured() {
  return (
    <div className="auth"><div className="card">
      <h1><b>Founders</b> Desk</h1>
      <p>Supabase isn't connected yet.</p>
      <p className="meta">Copy <code>web/.env.example</code> to <code>web/.env</code>, fill in your project URL and anon key, then restart <code>npm run dev</code>. The README has the full setup.</p>
    </div></div>
  )
}

/** Signed in: find the user's workspace, or send them to set one up. */
function SignedIn({ user }) {
  const [ws, setWs] = useState(undefined)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('workspace_members').select('workspaces(id, name)').eq('user_id', user.id).maybeSingle()
    setWs(error ? null : (data && data.workspaces) || null)
  }, [user.id])
  useEffect(() => { load() }, [load])

  if (ws === undefined) return <Loading text="Opening your desk…" />
  if (!ws) return <WorkspaceSetup user={user} onReady={load} />
  return <Desk key={ws.id} user={user} workspace={ws} onWorkspaceChange={load} />
}

function AuthGate() {
  const [session, setSession] = useState(undefined)
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Loading />
  if (recovery) return <AuthScreen initialMode="newPassword" onPasswordSet={() => setRecovery(false)} />
  if (!session) return <AuthScreen />
  return <SignedIn key={session.user.id} user={session.user} />
}

export default function App() {
  return configured ? <AuthGate /> : <NotConfigured />
}
