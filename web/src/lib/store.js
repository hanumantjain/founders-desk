import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { KINDS, PRIV, deepMerge, rid } from './utils'

const emptyRecs = () => Object.fromEntries(KINDS.map(k => [k, {}]))

/**
 * Loads every record the signed-in user can see in their workspace, keeps it live with
 * Supabase Realtime, and exposes add / set / upd / del that write optimistically.
 *
 * Records are { workspace_id, scope, kind, id, data }. Private kinds use the user's id as scope,
 * so row-level security keeps them invisible to other partners.
 */
export function useWorkspaceData({ uid, workspaceId, onError, onRemoved }) {
  const [recs, setRecs] = useState(emptyRecs)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [ready, setReady] = useState(false)
  const errRef = useRef(onError); errRef.current = onError
  const removedRef = useRef(onRemoved); removedRef.current = onRemoved

  const scopeOf = useCallback(k => (PRIV.includes(k) ? uid : 'shared'), [uid])

  const put = useCallback((kind, id, row) => setRecs(p => ({ ...p, [kind]: { ...p[kind], [id]: { ...row, id } } })), [])
  const drop = useCallback((kind, id) => setRecs(p => {
    if (!p[kind] || !p[kind][id]) return p
    const next = { ...p[kind] }; delete next[id]; return { ...p, [kind]: next }
  }), [])

  const loadRecords = useCallback(async () => {
    const all = emptyRecs(); const size = 1000
    for (let from = 0; ; from += size) {
      const { data, error } = await supabase.from('records').select('kind,id,scope,data')
        .eq('workspace_id', workspaceId).order('kind').order('id').range(from, from + size - 1)
      if (error) throw error
      for (const r of data) if (all[r.kind]) all[r.kind][r.id] = { ...r.data, id: r.id }
      if (data.length < size) break
    }
    setRecs(all)
  }, [workspaceId])

  const loadMembers = useCallback(async () => {
    const { data: ms, error } = await supabase.from('workspace_members').select('user_id,role,joined_at').eq('workspace_id', workspaceId)
    if (error) throw error
    if (!ms.some(m => m.user_id === uid)) { removedRef.current && removedRef.current(); return }
    const { data: ps } = await supabase.from('profiles').select('id,name,email').in('id', ms.map(m => m.user_id))
    const byId = Object.fromEntries((ps || []).map(p => [p.id, p]))
    setMembers(ms.sort((a, b) => (a.role === 'owner' ? -1 : 1) - (b.role === 'owner' ? -1 : 1))
      .map(m => ({ id: m.user_id, role: m.role, name: byId[m.user_id]?.name || '', email: byId[m.user_id]?.email || '' })))
  }, [workspaceId, uid])

  const loadInvites = useCallback(async () => {
    const { data } = await supabase.from('invites').select('id,email,created_at').eq('workspace_id', workspaceId)
    setInvites(data || [])
  }, [workspaceId])

  const reload = useCallback(async () => {
    try { await Promise.all([loadRecords(), loadMembers(), loadInvites()]); setReady(true) }
    catch (e) { errRef.current && errRef.current(e) }
  }, [loadRecords, loadMembers, loadInvites])

  useEffect(() => {
    const ch = supabase.channel('ws-' + workspaceId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `workspace_id=eq.${workspaceId}` }, ev => {
        if (ev.eventType === 'DELETE') {
          const o = ev.old || {}
          if (o.workspace_id === workspaceId && (o.scope === 'shared' || o.scope === uid)) drop(o.kind, o.id)
          return
        }
        const r = ev.new
        if (r.scope === 'shared' || r.scope === uid) put(r.kind, r.id, r.data)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${workspaceId}` }, () => loadMembers().catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invites', filter: `workspace_id=eq.${workspaceId}` }, () => loadInvites())
      .subscribe(status => { if (status === 'SUBSCRIBED') reload() })
    // Catch up after the tab sleeps or the phone loses signal.
    const onVis = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); supabase.removeChannel(ch) }
  }, [workspaceId, uid, put, drop, reload, loadMembers, loadInvites])

  const fail = useCallback(e => { errRef.current && errRef.current(e); reload() }, [reload])
  const key = useCallback((kind, id) => ({ workspace_id: workspaceId, scope: scopeOf(kind), kind, id }), [workspaceId, scopeOf])
  const recsRef = useRef(recs); recsRef.current = recs

  const ops = useMemo(() => ({
    async add(kind, data) {
      const id = rid(); const row = { ...data, createdAt: data.createdAt || Date.now() }
      put(kind, id, row)
      const { error } = await supabase.from('records').insert({ ...key(kind, id), data: row })
      if (error) fail(error)
      return id
    },
    async set(kind, id, data) {
      put(kind, id, data)
      const { error } = await supabase.from('records').upsert({ ...key(kind, id), data })
      if (error) { fail(error); return false }
      return true
    },
    async upd(kind, id, patch) {
      const cur = recsRef.current[kind]?.[id]
      if (cur) put(kind, id, deepMerge(structuredClone(cur), patch))
      const k = key(kind, id)
      const { error } = await supabase.rpc('merge_record', { p_workspace: k.workspace_id, p_scope: k.scope, p_kind: kind, p_id: id, p_patch: patch })
      if (error) fail(error)
    },
    async del(kind, id) {
      drop(kind, id)
      const k = key(kind, id)
      const { error } = await supabase.from('records').delete().match(k)
      if (error) fail(error)
    },
  }), [put, drop, key, fail])

  const st = useMemo(() => {
    const s = { uid, members, invites }
    for (const k of KINDS) s[k] = Object.values(recs[k])
    s.lock = recs.sec.lock || null
    s.reset = recs.sec.reset || null
    return s
  }, [recs, members, invites, uid])

  return { st, ops, ready, reloadMembers: loadMembers, reloadInvites: loadInvites }
}
