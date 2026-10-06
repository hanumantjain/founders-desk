import { useState } from 'react'

const KEY = 'fd-theme'
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Current theme: the saved choice on this device, else the system setting. index.html applies it before first paint. */
const current = () => document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light')

export default function ThemeToggle() {
  const [theme, setTheme] = useState(current)
  const next = theme === 'dark' ? 'light' : 'dark'
  const flip = () => {
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts until reload */ }
    setTheme(next)
  }
  return (
    <button className="bell" aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} onClick={flip}>
      {theme === 'dark'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
    </button>
  )
}
