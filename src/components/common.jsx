import { useId, useRef, useState } from 'react'
import { R } from '../lib/utils'

/**
 * Inline type-ahead: typing "Tri" fills "Triline" with the rest selected; Enter, Tab or → keeps it,
 * Esc drops the suggestion. Uncontrolled, so forms read values with FormData / form.elements.
 * `hints` optionally maps an option to the secondary text shown in the dropdown.
 */
export function AcInput({ options, hints, onInput, ...props }) {
  const ref = useRef(null)
  const pending = useRef(false)
  const listId = useId()
  const accept = () => {
    if (!pending.current) return
    pending.current = false
    const el = ref.current; const n = el.value.length
    try { el.setSelectionRange(n, n) } catch { /* not all input types support selection */ }
    onInput && onInput({ target: el })
  }
  return (
    <>
      <input
        ref={ref} list={listId} autoComplete="off" {...props}
        onInput={e => {
          pending.current = false
          const el = e.target, type = e.nativeEvent && e.nativeEvent.inputType
          const v = el.value
          if (type && type.startsWith('insert') && v && el.selectionStart === v.length) {
            const lv = v.toLowerCase()
            const hit = options.find(o => o.length > v.length && o.toLowerCase().startsWith(lv))
            if (hit) { el.value = hit; try { el.setSelectionRange(v.length, hit.length) } catch { /* ignore */ } pending.current = true; return }
          }
          onInput && onInput(e)
        }}
        onKeyDown={e => {
          if (!pending.current) return
          if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowRight') { if (e.key === 'Enter') e.preventDefault(); accept() }
          else if (e.key === 'Escape') { const el = ref.current; el.value = el.value.slice(0, el.selectionStart); pending.current = false; e.stopPropagation() }
        }}
        onBlur={accept}
      />
      <datalist id={listId}>{options.map(o => <option key={o} value={o}>{hints && hints[o] ? hints[o] : null}</option>)}</datalist>
    </>
  )
}

/** Error line for a form. Returns [message, setMessage, clearOnInput]. */
export function useErr() {
  const [err, setErr] = useState('')
  return [err, setErr, () => err && setErr('')]
}
export const Err = ({ msg }) => <div className="err">{msg}</div>

export const catPill = c => <span className={`pill ${c === 'Architecture' ? 'p-arch' : c === 'Interiors' ? 'p-int' : 'p-lia'}`}>{c}</span>

export const CatTitle = ({ x }) => <>{x.cat ? <><b style={{ fontWeight: 600 }}>{x.cat}</b> · </> : null}{x.title}</>

/** Confirms a destructive button with a second press. */
export function SureButton({ children, sureText, onConfirm, ...props }) {
  const [sure, setSure] = useState(false)
  return <button {...props} onClick={() => (sure ? onConfirm() : setSure(true))}>{sure ? sureText : children}</button>
}

/* ---------- charts ---------- */
function arcs(parts, tot) {
  let o = 0; const r = 46, L = 2 * Math.PI * r
  return parts.filter(p => p[1] > 0).map((p, i) => {
    const len = p[1] / tot * L
    const el = <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={p[2]} strokeWidth="18" strokeDasharray={`${len} ${L - len}`} strokeDashoffset={-o} transform="rotate(-90 60 60)" />
    o += len; return el
  })
}

export function Donut({ parts, label }) {
  const tot = parts.reduce((s, p) => s + p[1], 0)
  if (!tot) return <p className="empty">No data for this period yet.</p>
  return (
    <div className="donut">
      <svg width="120" height="120" viewBox="0 0 120 120" role="img"><title>{label}</title>
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface2)" strokeWidth="18" />
        {arcs(parts, tot)}
        <text x="60" y="66" textAnchor="middle" style={{ font: '500 18px var(--display)', fill: 'var(--ink)' }}>{tot}</text>
      </svg>
      <div className="legend">{parts.map(p => <span key={p[0]}><i style={{ background: p[2] }} />{p[0]} · <b className="num">{p[1]}</b></span>)}</div>
    </div>
  )
}

export function DonutMoney({ parts, label = 'Spending by category' }) {
  const tot = parts.reduce((s, p) => s + p[1], 0)
  return (
    <div className="donut">
      <svg width="120" height="120" viewBox="0 0 120 120" role="img"><title>{label}</title>
        {arcs(parts, tot)}
        <text x="60" y="65" textAnchor="middle" style={{ font: '500 13px var(--display)', fill: 'var(--ink)' }}>{R(tot)}</text>
      </svg>
      <div className="legend">{parts.map(p => <span key={p[0]}><i style={{ background: p[2] }} />{p[0]} · <b className="num">{R(p[1])}</b></span>)}</div>
    </div>
  )
}

export function HBars({ items }) {
  const max = Math.max(1, ...items.map(i => i[1]))
  return (
    <div className="hbar">
      {items.map(i => <div key={i[0]}><span>{i[0]}</span><span className="t"><i style={{ width: `${Math.round(i[1] / max * 100)}%`, background: i[2] || 'var(--c1)' }} /></span><span className="num">{i[1]}</span></div>)}
    </div>
  )
}
