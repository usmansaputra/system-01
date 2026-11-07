import './style.css'
import { supabase } from '../shared/supabase.js'
import { IS_DEMO, SUPABASE_URL } from '../shared/env.js'
import { MENU, PANELS, toast, setActiveRenderer } from './panels.js'
import { $, $$, esc, errMsg } from '../shared/utils.js'

const app = document.getElementById('admin-app')

// Terjemahkan error teknis → petunjuk perbaikan yang bisa langsung dipraktekkan
function hintFor(msg) {
  const m = String(msg || '')
  if (/JWS|signature|jwt/i.test(m))
    return '<b>Anon key &amp; URL bukan dari project yang sama</b> (atau session lama masih nyangkut di browser). ' +
      'Salin ulang URL + anon key dari Supabase Dashboard → Project Settings → API — dua-duanya HARUS dari project yang sama — ' +
      'lalu klik tombol <i>Keluar &amp; Login Ulang</i> di bawah.'
  if (/Invalid API key|Invalid key/i.test(m))
    return 'Anon key salah / typo / terpotong. Salin ulang dari Project Settings → API → <i>anon public</i>.'
  if (/PGRST205|PGRST204|schema cache|does not exist|relation|column/i.test(m))
    return 'Tabel/kolom belum ada di Supabase → buka SQL Editor, paste ulang isi <b>schema.sql</b> (aman, data gak hilang), klik Run, lalu refresh halaman ini.'
  if (/PGRST116|no rows|multiple \(or no\)/i.test(m))
    return 'Baris data id=1 tidak terbaca → jalankan schema.sql (dia mengisi baris awal) atau cek RLS policy untuk user <i>authenticated</i>.'
  if (/42501|row-level security|violates/i.test(m))
    return 'Ditolak RLS → pastikan schema.sql sudah di-run penuh (termasuk blok POLICY), dan lu login dengan akun admin yang dibuat di Authentication → Users.'
  if (/fetch failed|Failed to fetch|networkerror|NetworkError|tidak bisa dijangkau|respons error kosong/i.test(m))
    return 'Tidak bisa terhubung ke Supabase → cek VITE_SUPABASE_URL / config.js (harus https://xxxx.supabase.co), koneksi internet, dan pastikan project Supabase tidak sedang paused.'
  return ''
}

// ─────────────────────────────────────────────────────────────
// MODE DEMO (config Supabase belum diisi)
// ─────────────────────────────────────────────────────────────
function renderSetup() {
  app.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="mono" style="font-size:10px; letter-spacing:.2em; color:var(--ad-accent); font-weight:700; margin-bottom:10px">SYSTEM-01 · ADMIN CONSOLE</div>
      <h1>Hubungkan Supabase dulu</h1>
      <p class="sub">Situs publik masih bisa dibuka dalam <b>mode demo</b> (konten contoh).
      Admin butuh database Supabase. Ikuti langkah ini (lengkap di README.md):</p>
      <ol class="steps-ol">
        <li>Buat project di <b>supabase.com</b> (gratis)</li>
        <li>SQL Editor → paste isi <code>schema.sql</code> → <b>Run</b></li>
        <li>Authentication → Users → <b>Add user</b> (buat email + password admin)</li>
        <li>Isi <code>.env</code> (salin dari <code>.env.example</code>) <b>atau</b> isi <code>public/config.js</code></li>
        <li>Restart <code>npm run dev</code> → buka <code>/admin</code> lagi</li>
      </ol>
      <a href="/" target="_blank" class="btn btn-ghost btn-block" style="margin-top:16px">Lihat situs publik (mode demo) ↗</a>
      ${SUPABASE_URL ? '<div class="err" style="margin-top:14px">URL terbaca tapi anon key belum valid — cek lagi .env / config.js.</div>' : ''}
    </div>
  </div>`
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
function renderLogin() {
  app.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="mono" style="font-size:10px; letter-spacing:.2em; color:var(--ad-accent); font-weight:700; margin-bottom:10px">SYSTEM-01 · ADMIN CONSOLE</div>
      <h1>Masuk Admin</h1>
      <p class="sub">Gunakan akun yang lu buat di Supabase Authentication → Users.</p>
      <form id="login-form" autocomplete="off">
        <div class="field"><label>Email</label><input id="l-email" type="email" placeholder="admin@email.com"></div>
        <div class="field"><label>Password</label><input id="l-pass" type="password" placeholder="••••••••"></div>
        <div id="l-err" class="err hidden"></div>
        <button class="btn btn-block" type="submit">MASUK</button>
      </form>
    </div>
  </div>`
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = $('#login-form .btn')
    btn.disabled = true; btn.textContent = 'Memeriksa…'
    const { error } = await supabase.auth.signInWithPassword({
      email: $('#l-email').value.trim(),
      password: $('#l-pass').value
    })
    if (error) {
      $('#l-err').textContent = 'Gagal masuk: ' + errMsg(error)
      $('#l-err').classList.remove('hidden')
      btn.disabled = false; btn.textContent = 'MASUK'
    }
  })
}

// ─────────────────────────────────────────────────────────────
// LAYOUT + ROUTER
// ─────────────────────────────────────────────────────────────
function renderLayout() {
  const hash = location.hash.replace('#/', '') || 'dashboard'
  const active = MENU.find((m) => m.id === hash) ? hash : 'dashboard'
  app.innerHTML = `
  <div class="adm-layout">
    <aside class="adm-side">
      <div class="adm-logo">SYSTEM-<b>01</b></div>
      <nav class="adm-nav">
        ${MENU.map((m) => `<a href="#/${m.id}" class="${m.id === active ? 'active' : ''}">
          <span>${m.icon}</span> ${m.label}</a>`).join('')}
        <a href="#" class="logout" id="btn-logout"><span>⎋</span> Logout</a>
      </nav>
    </aside>
    <main class="adm-main" id="adm-main">
      <div id="panel-root"></div>
    </main>
  </div>`

  $('#btn-logout').addEventListener('click', async (e) => {
    e.preventDefault()
    await supabase.auth.signOut()
    location.hash = ''
    renderLogin()
  })

  $$('.adm-nav a').forEach((a) => {
    a.addEventListener('click', () => {
      if (a.classList.contains('logout')) return
      setTimeout(() => {
        $$('.adm-nav a').forEach((x) => x.classList.toggle('active', x.getAttribute('href') === location.hash))
      }, 0)
    })
  })

  renderPanel(active)

  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#/', '') || 'dashboard'
    if (MENU.some((m) => m.id === h)) {
      $$('.adm-nav a').forEach((x) => x.classList.toggle('active', x.getAttribute('href') === '#/' + h))
      renderPanel(h)
    }
  })
}

// supaya panels.js bisa re-render panel aktif (setelah simpan/upload)
setActiveRenderer(renderPanel)

async function renderPanel(id) {
  const meta = MENU.find((m) => m.id === id)
  const root = document.getElementById('panel-root')
  if (!root || !meta) return
  root.innerHTML = `<div class="adm-h">${meta.label}</div><div class="adm-sub">Memuat…</div>`
  try {
    root.innerHTML = `<div class="adm-h">${meta.label}</div><div id="panel-body"></div>`
    await PANELS[id](document.getElementById('panel-body'))
  } catch (err) {
    const msg = errMsg(err)
    const hint = hintFor(msg)
    root.innerHTML = `
      <div class="adm-h">${meta.label}</div>
      <div class="err">
        <b>Gagal memuat panel.</b><br>${esc(msg)}
        ${hint ? `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,120,120,.35)">💡 ${hint}</div>` : ''}
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn-sm" id="err-retry">↻ Coba Lagi</button>
          <button class="btn btn-ghost btn-sm" id="err-logout">⎋ Keluar &amp; Login Ulang</button>
        </div>
      </div>`
    $('#err-retry', root)?.addEventListener('click', () => renderPanel(id))
    $('#err-logout', root)?.addEventListener('click', async () => {
      try { await supabase.auth.signOut() } catch { /* abaikan */ }
      // bersihkan sisa session lama yang mungkin sudah tidak valid
      try { localStorage.clear() } catch { /* abaikan */ }
      location.hash = ''
      renderLogin()
    })
  }
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
async function boot() {
  if (IS_DEMO) { renderSetup(); return }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) renderLayout()
  else renderLogin()

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') renderLayout()
    if (event === 'SIGNED_OUT') renderLogin()
  })
}

boot()
