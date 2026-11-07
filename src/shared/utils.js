// Util umum
export const $  = (sel, el = document) => el.querySelector(sel)
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)]

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

// Ubah error apa pun (PostgrestError, {error:'...'}, {message:''}, TypeError, dll)
// jadi teks manusiawi — bukan "[object Object]"
export function errMsg(err) {
  if (err == null) return 'Error tidak diketahui'
  if (typeof err === 'string') return err
  const msg = err.message || (typeof err.error === 'string' ? err.error : '') || err.error_description || ''
  const parts = []
  if (err.code) parts.push('[' + err.code + ']')
  if (msg) parts.push(msg)
  if (err.details && err.details !== msg) parts.push(err.details)
  if (err.hint && err.hint !== msg) parts.push('(' + err.hint + ')')
  let out = parts.join(' ').trim()
  // object tanpa info berguna → deskripsi ramah, bukan JSON kosong
  if (!out || !out.replace(/[^a-zA-Z0-9]/g, '')) out = 'Server Supabase tidak bisa dijangkau / respons error kosong (cek URL & anon key, project aktif, koneksi)'
  return out.slice(0, 400)
}

export const uid = () => (crypto?.randomUUID
  ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10))

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0))

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// '2008-11-15' → 'Sabtu, 15 November'
export function fmtTanggal(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`
  } catch { return iso }
}

export function fmtDateTimeNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function nowClock() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Kompres gambar di browser sebelum upload (hemat storage + load cepat)
export async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (file.size < 400_000) return file // kecil, biarkan apa adanya
  try {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Selfie verifikasi → dataURL kecil (maks 720px, JPEG).
// Disimpan di localStorage (ST.selfie) supaya survive refresh — TIDAK diupload
// ke mana pun (privasi). Dipakai buat Kartu Pilot Tester di layar akhir.
export async function makeSelfieDataURL(file, maxDim = 720, quality = 0.72) {
  try {
    if (!file || !file.type || !file.type.startsWith('image/')) return ''
    const img = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return '' // format gak didukung browser → kartu fallback ke inisial
  }
}
