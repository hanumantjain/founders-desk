import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key && !url.includes('YOUR-PROJECT'))
export const ideasEnabled = import.meta.env.VITE_ENABLE_IDEAS === 'true'

export const supabase = configured ? createClient(url, key) : null

// Supabase errors are objects with a message; turn anything into a sentence for the UI.
export const errText = e => (e && (e.message || e.error_description)) || 'Something went wrong. Try again.'
