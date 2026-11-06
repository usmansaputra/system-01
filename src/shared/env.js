// Sumber konfigurasi: env Vite (prioritas) → config.js runtime → kosong (demo mode)
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const cfg = (typeof window !== 'undefined' && window.SIAP_CONFIG) || {}

const envUrl = env.VITE_SUPABASE_URL || ''
const envKey = env.VITE_SUPABASE_ANON_KEY || ''

export const SUPABASE_URL = (envUrl && !envUrl.includes('YOUR-')) ? envUrl : (cfg.url || '')
export const SUPABASE_ANON_KEY = (envKey && !envKey.includes('YOUR-')) ? envKey : (cfg.anonKey || '')

// Demo mode = config belum diisi → site jalan dengan konten contoh
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY
