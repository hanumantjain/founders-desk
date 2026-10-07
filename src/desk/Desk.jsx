import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeskContext } from './context'
import { useActivity, useWorkspaceData } from '../lib/store'
import { supabase, ideasEnabled } from '../lib/supabase'
import { mkey, rid, slug, todayISO, fmtD, fmtT, monthLabel } from '../lib/utils'
import { isPaid, tips } from '../lib/derived'
import Today from './Today'
import Tasks from './Tasks'
import Calendar from './Calendar'
import Expenses from './Expenses'
import Leads from './Leads'
import Projects from './Projects'
import Commercial from './Commercial'
import Bell from './Bell'
import Account from './Account'
import Modal from './Modal'
import ThemeToggle from '../components/ThemeToggle'

// The third field marks tabs only the owner and admins see.
const TABS = [['Today', 'g1'], ['Tasks', 'g1'], ['Calendar', 'g1'], ['Expenses', 'g1'], ['|'], ['Leads', 'leads'], ['Projects', 'proj', 1], ['Commercial', 'comm', 1]]
const VIEWS = { Today, Tasks, Calendar, Expenses, Leads, Projects, Commercial }

const initialUi = () => ({
  tab: 'Today', sub: 'Daily', period: 'month', sel: null, edit: null,
  calM: new Date(new Date().getFullYear(), new Date().getMonth(), 1), calDay: todayISO(),
  expM: mkey(new Date()), comM: mkey(new Date()),
  bell: false, account: false, modal: null,
  ideas: null, ideasBusy: false, ideasErr: null,
})

function saveError(e) {
  if (e && e.code === '42501') return "You don't have access to change this."
  if (e && /fetch|network/i.test(e.message || '')) return "Couldn't save that. Check your connection and try again."
  return (e && e.message) || "Couldn't save that. Check your connection and try again."
}

export default function Desk({ user, workspace, onWorkspaceChange }) {
  const [ui, setUiState] = useState(initialUi)
  const setUi = useCallback(p => setUiState(u => ({ ...u, ...(typeof p === 'function' ? p(u) : p) })), [])
  const [toasts, setToasts] = useState([])
  const toast = useCallback(msg => {
    const id = rid(); setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  const data = useWorkspaceData({ uid: user.id, workspaceId: workspace.id, onError: e => toast(saveError(e)), onRemoved: onWorkspaceChange })
  const { ops, ready } = data
  const me = data.st.members.find(m => m.id === user.id)
  const st = useMemo(() => ({ ...data.st, myName: (me && me.name) || user.email.split('@')[0], studio: workspace.name }), [data.st, me, user.email, workspace.name])
  const stRef = useRef(st); stRef.current = st

  const activity = useActivity(workspace.id)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setUi(u => (u.modal || u.bell || u.account ? { modal: null, bell: false, account: false } : {})) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setUi])

  // Someone whose role drops to member while on Projects or Commercial goes back to Today.
  useEffect(() => {
    if (ready && !st.canFinance && (ui.tab === 'Projects' || ui.tab === 'Commercial')) setUi({ tab: 'Today', sel: null, edit: null })
  }, [ready, st.canFinance, ui.tab, setUi])

  /* ---------- actions shared across tabs ---------- */
  const act = useMemo(() => {
    const S = () => stRef.current
    const confirmMsg = m => `Hello ${m.person || ''}, this is ${S().myName || 'the team'} from ${S().studio}. Just confirming our meeting tomorrow, ${fmtD(m.date)}${m.time ? ` at ${fmtT(m.time)}` : ''}${m.place ? `, at ${m.place}` : ''}. Please let me know if this time still works for you. Thank you.`.replace('Hello ,', 'Hello,')
    return {
      confirmMsg,
      async saveCat(n) {
        n = (n || '').trim(); if (!n) return; const id = slug(n)
        if (S().tcats.find(c => c.id === id)) return ops.upd('tcats', id, { lastUsed: Date.now() })
        await ops.set('tcats', id, { name: n, lastUsed: Date.now() })
      },
      async saveContact(name, phone) {
        name = (name || '').trim(); phone = (phone || '').trim(); if (!name) return
        const id = slug(name); const old = S().contacts.find(c => c.id === id)
        if (old && old.name === name && (old.phone || '') === (phone || old.phone || '')) return ops.upd('contacts', id, { lastUsed: Date.now() })
        await ops.set('contacts', id, { name, phone: phone || (old && old.phone) || '', lastUsed: Date.now() })
      },
      async del(k, id) { setUi({ edit: null }); await ops.del(k, id); toast('Deleted') },
      openPay(k, id, key) { setUi({ modal: { kind: 'pay', k, id, key } }) },
      async payBill(m, amount) {
        const b = S()[m.k].find(x => x.id === m.id); if (!b) return
        if (isPaid(b, m.key)) { setUi({ modal: null }); return }
        await ops.upd(m.k, b.id, { paid: { [m.key]: { by: S().uid, at: Date.now(), amount } } })
        const rec = { amount, category: b.category, note: `${b.name} · ${monthLabel(m.key)}`, ts: Date.now(), billId: b.id }
        if (m.k === 'bills') await ops.add('office', { ...rec, by: S().uid }); else await ops.add('expenses', rec)
        setUi({ modal: null }); toast(`${b.name} paid · added to ${m.k === 'bills' ? 'Commercial' : 'Expenses'}`)
      },
      async copyMsg(m) {
        const t = confirmMsg(m)
        try { await navigator.clipboard.writeText(t); toast('Message copied. Paste it in WhatsApp.') } catch { toast(t) }
      },
      confirmMeeting(m) {
        const on = !m.confirmedAt
        ops.upd('meetings', m.id, on ? { confirmedAt: Date.now(), confirmedBy: S().uid } : { confirmedAt: null })
        toast(on ? 'Marked confirmed' : 'Marked not confirmed')
      },
      waOpened(id) { ops.upd('meetings', id, { waOpenedAt: Date.now() }) },
      async getIdeas() {
        if (!ideasEnabled) return
        setUi({ ideasBusy: true, ideasErr: null })
        const { data: out, error } = await supabase.functions.invoke('growth-ideas', { body: { workspaceId: workspace.id } })
        if (error || !out || !Array.isArray(out.ideas)) {
          let msg = "Couldn't get ideas right now. Try again."
          try { const b = error && error.context && await error.context.json(); if (b && b.error) msg = b.error } catch { /* keep generic */ }
          setUi({ ideasBusy: false, ideas: null, ideasErr: msg }); return
        }
        const ideas = out.ideas.map(String).slice(0, 3)
        setUi({ ideasBusy: false, ideas, ideasErr: ideas.length ? null : 'No ideas came back. Try again.' })
      },
    }
  }, [ops, setUi, toast, workspace.id])

  const toggleBell = async () => {
    const open = !ui.bell; setUi({ bell: open, account: false })
    if (open) for (const n of st.notifs.filter(n => !n.read)) await ops.upd('notifs', n.id, { read: true })
  }
  const unread = st.notifs.filter(n => !n.read).length + tips(st).length
  const View = VIEWS[ui.tab]
  const ctx = { st, ui, setUi, ops, act, toast, activity, workspace, user, onWorkspaceChange, reloadMembers: data.reloadMembers, reloadInvites: data.reloadInvites }

  return (
    <DeskContext.Provider value={ctx}>
      <div className="wrap">
        <header className="hdr">
          <div>
            <h1><b>Founders Desk:</b> <span>{st.myName}</span></h1>
            <div className="sub">{st.studio} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="hdr-actions">
            <ThemeToggle />
            <button className="bell" aria-label="Notifications" onClick={toggleBell}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <button className="acct" aria-label="Account and workspace" onClick={() => setUi(u => ({ account: !u.account, bell: false }))}>{(st.myName[0] || '?').toUpperCase()}</button>
          </div>
        </header>
        {!ready && <div className="banner">Connecting…</div>}
        {ready && st.members.length < 2 && !st.invites.length && (
          <div className="banner">You're the only one here. <button className="linkbtn" onClick={() => setUi({ account: true })}>Invite your partners</button> to share leads, projects, meetings and office costs.</div>
        )}
        <nav className="rails" aria-label="Sections">
          {TABS.filter(t => !t[2] || st.canFinance).map((t, i) => t[0] === '|' ? <span key={i} className="divider" aria-hidden="true" /> : (
            <button key={t[0]} className={`tab ${t[1]}${ui.tab === t[0] ? ' on' : ''}`} aria-current={ui.tab === t[0] ? 'page' : 'false'}
              onClick={() => { setUi({ tab: t[0], sel: null, edit: null }); window.scrollTo({ top: 0 }) }}>
              {t[0]}
            </button>
          ))}
        </nav>
        <main>{ready ? <View /> : <div className="card"><p className="empty">Opening your desk. Your tasks, meetings, leads and projects will appear here.</p></div>}</main>
      </div>
      <Modal />
      {ui.bell && <Bell onClose={toggleBell} />}
      {ui.account && <Account />}
      {toasts.map((t, i) => <div key={t.id} className="toast" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${18 + i * 52}px)` }}>{t.msg}</div>)}
    </DeskContext.Provider>
  )
}

