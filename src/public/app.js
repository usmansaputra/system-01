import gsap from 'gsap'
import './style.css'
import { loadExperience, canPreviewDraft, isDemo } from '../shared/store.js'
import { $, $$, esc, sleep, clamp, errMsg } from '../shared/utils.js'
import { FX, flashWhite, scramble } from './fx.js'
import { SCREENS } from './screens.js'

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
const STATE_KEY = 'siap01_state_v1'
const params = new URLSearchParams(location.search)
const ORDER = ['gate', 'dashboard', 'tests', 'report', 'reveal', 'memory', 'surprise', 'letter', 'end']

function defState() {
  const y = new Date().getFullYear()
  return {
    unlocked: 1,
    name: '', className: '',
    session: 'SSN-' + y + '-' + Math.floor(1000 + Math.random() * 9000),
    absId: 'ABS-' + Math.floor(2000 + Math.random() * 900),
    tests: [false, false, false],
    revealed: false
  }
}
function loadState() {
  try { return { ...defState(), ...(JSON.parse(localStorage.getItem(STATE_KEY)) || {}) } }
  catch { return defState() }
}
function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify(ST)) }

let D = null            // data (published / draft / demo)
let ST = loadState()    // state penerima
let glitchDone = false  // biar glitch anomali cuma sekali per sesi
let currentScreen = null

const fx = new FX(document.getElementById('fx-canvas'))
const audioEl = document.getElementById('bg-music')

// ─────────────────────────────────────────────────────────────
// AUDIO ENGINE
// Hening total dari Gate sampai Final Report.
// Audio di-unlock sejak klik pertama, baru DIPUTAR saat report kebuka.
// ─────────────────────────────────────────────────────────────
let wantMusic = false

function primeAudio() {
  document.addEventListener('pointerdown', () => {
    if (!audioEl.src) return
    audioEl.play().then(() => audioEl.pause()).catch(() => {})
  }, { once: true, capture: true })
}

function startMusic() {
  if (!audioEl.src) return
  wantMusic = true
  audioEl.volume = clamp(D?.music?.volume ?? 0.8, 0, 1)
  audioEl.play().catch(() => {
    const chip = $('#audio-chip')
    if (chip) chip.classList.remove('hidden')
  })
}

// Kalau browser blokir, klik apa pun akan mencoba lagi
document.addEventListener('pointerdown', () => {
  if (wantMusic && audioEl.paused) audioEl.play().catch(() => {})
}, { capture: true })

// ─────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────
function show(name, { force = false } = {}) {
  const target = ORDER.indexOf(name)
  if (!force && target > ST.unlocked - 1) return show(ORDER[ST.unlocked - 1])
  currentScreen = name
  const app = document.getElementById('app')
  app.innerHTML = SCREENS[name]({ D, ST })
  window.scrollTo(0, 0) // layar baru selalu mulai dari atas (scroll lama gak dibawa)
  const anims = app.querySelectorAll('[data-anim]')
  if (anims.length) {
    gsap.from(anims, { opacity: 0, y: 26, duration: 0.7, stagger: 0.12, ease: 'power3.out' })
  }
  BINDERS[name]?.()
}

function unlock(index) {
  ST.unlocked = Math.max(ST.unlocked, index)
  saveState()
}

function applyAppearance() {
  const a = D.appearance || {}
  const root = document.documentElement
  root.style.setProperty('--accent', a.accent_before || '#4f8cff')
}

function goDreamy() {
  const a = D.appearance || {}
  const root = document.documentElement
  document.body.classList.remove('theme-tech')
  document.body.classList.add('theme-dreamy')
  root.style.setProperty('--accent', a.accent_after || '#ff8fb8')
  root.style.setProperty('--bg-after', a.bg_after || '#f6eaff')
  document.title = '🎂 Selamat Ulang Tahun, ' + (ST.name || 'Kamu') + '!'
  fx.setMode('ambient')
}

// ─────────────────────────────────────────────────────────────
// HELPER: log terminal berurutan
// ─────────────────────────────────────────────────────────────
async function typeLines(sel, lines, baseDelay = 420) {
  const el = $(sel)
  el.classList.remove('hidden')
  for (const l of lines) {
    const d = document.createElement('div')
    d.className = 'term-line ' + (l.c || '')
    d.textContent = '> ' + l.t
    el.appendChild(d)
    el.scrollTop = el.scrollHeight
    await sleep(l.d || baseDelay)
  }
}

// ─────────────────────────────────────────────────────────────
// BINDERS (logika tiap layar)
// ─────────────────────────────────────────────────────────────
const BINDERS = {
  // 1. GATE
  gate() {
    $('#gate-form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = $('#g-name').value.trim()
      const code = $('#g-code').value.trim()
      const wantName = (D.site.recipient_name || '').trim()
      const wantCode = (D.site.access_code || '').trim()
      const okName = !wantName || name.toLowerCase() === wantName.toLowerCase()
      const okCode = !wantCode || code.toLowerCase() === wantCode.toLowerCase()
      const err = $('#g-err')
      if (!name) {
        err.textContent = 'Isi nama dulu ya.'
        err.classList.remove('hidden'); return
      }
      if (!okName || !okCode) {
        err.textContent = 'Nama / kode akses tidak cocok dengan data pilot. Coba cek lagi.'
        err.classList.remove('hidden')
        gsap.fromTo('.gate-card', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' })
        return
      }
      ST.name = name
      saveState()
      unlock(2)
      show('dashboard')
    })
  },

  // 2. DASHBOARD
  dashboard() {
    $('#btn-start').addEventListener('click', () => {
      unlock(3)
      show('tests')
    })
  },

  // 3. TESTS
  tests() {
    const idx = ST.tests.filter(Boolean).length

    if (idx === 0) {
      $('#t1-form').addEventListener('submit', async (e) => {
        e.preventDefault()
        ST.className = $('#t1-class').value.trim()
        saveState()
        const btn = $('#t1-form .btn'); btn.disabled = true; btn.textContent = 'MEMPROSES…'
        await typeLines('#t1-log', [
          { t: 'menghubungkan server absensi… OK (218ms)', c: 'ok-text' },
          { t: 'memvalidasi format data… OK', c: 'ok-text' },
          { t: 'menyimpan record ' + ST.absId + '… OK', c: 'ok-text' },
          { t: 'status kehadiran: TEPAT WAKTU', c: 'ok-text' }
        ])
        $('#t1-done').classList.remove('hidden')
        $('#t1-next').classList.remove('hidden')
        ST.tests[0] = true; saveState()
        $('#t1-next').addEventListener('click', () => show('tests'))
      })
    }

    if (idx === 1) {
      $('#t2-file').addEventListener('change', (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        const url = URL.createObjectURL(f)
        $('#t2-img').src = url
        $('#t2-preview').classList.remove('hidden')
        $('#t2-frame').classList.add('hidden')
        $('#t2-run').disabled = false
      })
      $('#t2-run').addEventListener('click', async () => {
        $('#t2-run').disabled = true
        $('#t2-pwrap').classList.remove('hidden')
        const fill = $('#t2-pfill') || $('.pfill', $('#t2-pwrap'))
        gsap.fromTo(fill, { width: '0%' }, { width: '100%', duration: 2.2, ease: 'power1.inOut' })
        await typeLines('#t2-log', [
          { t: 'memuat model face-match v3.2… OK', c: 'ok-text', d: 600 },
          { t: 'memindai 12.482 titik referensi…', d: 800 },
          { t: 'membandingkan dengan database uji…', d: 600 },
          { t: 'skor kecocokan: 98.7% — LULUS', c: 'ok-text', d: 400 }
        ], 300)
        $('#t2-done').classList.remove('hidden')
        $('#t2-next').classList.remove('hidden')
        ST.tests[1] = true; saveState()
        $('#t2-next').addEventListener('click', () => show('tests'))
      })
    }

    if (idx === 2) {
      $('#t3-send').addEventListener('click', async () => {
        $('#t3-send').disabled = true
        const n = $('#t3-notif')
        n.classList.remove('hidden')
        n.classList.add('drop-in')
        await sleep(1200)
        await typeLines('#t3-log', [
          { t: 'notifikasi terkirim ke perangkat pilot… OK', c: 'ok-text' },
          { t: 'diterima & dibaca: ya', c: 'ok-text' }
        ], 350)
        $('#t3-done').classList.remove('hidden')
        $('#t3-next').classList.remove('hidden')
        ST.tests[2] = true; saveState()
        $('#t3-next').addEventListener('click', async () => {
          unlock(4)
          // layar "menyusun laporan" sebentar
          const app = document.getElementById('app')
          app.innerHTML = `
            <div class="compile-overlay">
              <div class="spinner"></div>
              <div class="mono">Menyusun laporan final…</div>
            </div>`
          await sleep(2000)
          show('report')
        })
      })
    }
  },

  // 4. REPORT — glitch jalan pas tombol anomali DIKLIK; musik mulai setelah glitch selesai
  report() {
    $('#anomaly-btn').addEventListener('click', () => {
      // Sudah reveal / glitch pernah jalan → tombol sekarang "BUKA SEKARANG ♡" → langsung buka
      if (ST.revealed || glitchDone) { openReveal(); return }
      glitchDone = true
      const btn = $('#anomaly-btn')
      btn.disabled = true // kunci tombol selama scene glitch (cegah dobel-klik)
      runAnomalyGlitch().then(() => {
        btn.disabled = false
        startMusic() // 🎵 musik baru keluar SETELAH scene layar geter selesai
      })
    })
    $('#audio-chip')?.addEventListener('click', () => audioEl.play().catch(() => {}))
  },

  // 5. REVEAL
  reveal() {
    fx.setMode('ambient')
    setTimeout(() => fx.burst(140), 300)
    setTimeout(() => fx.burst(100), 1100)
    setTimeout(() => fx.burst(100), 2000)
    // FIX: reveal index 4, memory index 5 → harus unlock(6) dulu, kalau gak
    // router memental balik ke reveal (bug "LIHAT GALERI KAMU" gak jalan).
    $('#rv-next').addEventListener('click', () => { unlock(6); show('memory') })
  },

  // 6. MEMORY (slideshow)
  memory() {
    startSlideshow()
  },

  // 7. SURPRISE
  surprise() {
    $('#sp-btn').addEventListener('click', async () => {
      $('#sp-btn').disabled = true
      const c = $('#sp-count')
      c.classList.remove('hidden')
      for (const n of ['3', '2', '1']) {
        c.textContent = n
        gsap.fromTo(c, { scale: 0.4, opacity: 0 }, { scale: 1.6, opacity: 1, duration: 0.5, ease: 'back.out(2)' })
        await sleep(900)
      }
      flashWhite(420)
      fx.burst(220)
      setTimeout(() => fx.burst(120), 350)
      unlock(8)
      await sleep(650)
      show('letter')
    })
  },

  // 8. LETTER (amplop terbuka)
  letter() {
    $('#lt-open').addEventListener('click', () => {
      $('#lt-open').disabled = true
      const tl = gsap.timeline()
      tl.to('.env-seal', { opacity: 0, scale: 0.5, duration: 0.3 })
        .to('.env-flap', { rotateX: 180, duration: 0.9, ease: 'power2.inOut', transformOrigin: 'top center' })
        .to('#envelope', { y: -26, duration: 0.4 })
        .to('.envelope, #lt-open', { opacity: 0, scale: 0.9, duration: 0.5 })
        .add(() => {
          // Amplop & tombol diangkat dari layout (display:none) — kalau cuma di-fade out,
          // bayangannya masih nempatin ruang → surat muncul kebawah & harus scroll dulu.
          $('#envelope').classList.add('hidden')
          $('#lt-open').classList.add('hidden')
          const card = $('#letter-card')
          card.classList.remove('hidden')
          gsap.from(card, { opacity: 0, y: 60, scale: 0.95, duration: 0.8, ease: 'power3.out' })
        })
      fx.hearts(20)
    })
    $('#lt-next').addEventListener('click', () => {
      unlock(9)
      show('end')
    })
  },

  // 9. ENDING
  end() {
    fx.setMode('ambient')
    fx.hearts(30)
    $('#end-replay').addEventListener('click', () => show('memory'))
    $('#end-reset').addEventListener('click', () => {
      if (!confirm('Balik ke layar awal? (Semua progress pengujian direset)')) return
      ST = defState()
      saveState()
      document.body.classList.remove('theme-dreamy')
      document.body.classList.add('theme-tech')
      applyAppearance()
      document.title = 'SIAP — Portal Pilot Tester'
      show('gate', { force: true })
    })
  }
}

// ─────────────────────────────────────────────────────────────
// GLITCH ANOMALI → REVEAL
// ─────────────────────────────────────────────────────────────
function runAnomalyGlitch() {
  return new Promise((resolve) => {
    const box = $('#anomaly-box')
    const txt = $('#anomaly-text')
    box.classList.add('glitching')
    document.body.classList.add('glitch-hard')
    scramble(txt, '❤ PENYEBAB TERDETEKSI: seseorang berulang tahun HARI INI ❤', 1400)
    setTimeout(() => {
      document.body.classList.remove('glitch-hard')
      box.classList.remove('glitching')
      box.classList.add('anomaly-love')
      const btn = $('#anomaly-btn')
      btn.textContent = 'BUKA SEKARANG ♡'
      btn.classList.add('btn-love')
      resolve()
    }, 1700)
  })
}

function openReveal() {
  ST.revealed = true
  unlock(5)
  saveState()
  flashWhite(520)
  document.body.classList.add('glitch-hard')
  setTimeout(() => {
    document.body.classList.remove('glitch-hard')
    goDreamy()
    show('reveal', { force: true })
  }, 700)
}

// ─────────────────────────────────────────────────────────────
// SLIDESHOW KENANGAN
// ─────────────────────────────────────────────────────────────
function startSlideshow() {
  const items = (D.memories || [])
  const stage = $('#slide-stage')
  const progEl = $('#slide-progress')
  const capEl = $('#slide-caption')
  const scrimEl = $('.slide-scrim')
  let idx = 0
  let timer = null
  let alive = true

  if (!items.length) {
    stage.innerHTML = `<div class="slide active"><div class="slide-empty">
      <h2>Belum ada kenangan</h2><p class="muted">Admin belum upload foto/video.<br>Buka /admin → Memory Gallery.</p></div></div>`
    $('#slide-end').classList.remove('hidden')
    $('#s-end-btn').addEventListener('click', () => { unlock(7); show('surprise') })
    return
  }

  // Progress bar tipis di atas ala story: 1 segmen per slide
  progEl.innerHTML = items.map(() => '<span class="pb-seg"><span class="pb-fill"></span></span>').join('')
  const fills = $$('.pb-fill', progEl)

  function setProgress(i, durSec, instant = false) {
    fills.forEach((f, fi) => {
      f.style.transition = 'none'
      f.style.width = fi < i ? '100%' : '0%'
    })
    const cur = fills[i]
    if (cur) requestAnimationFrame(() => {
      cur.style.transition = instant ? 'none' : 'width ' + Math.max(2, durSec || 5) + 's linear'
      cur.style.width = '100%'
    })
  }

  function render(i, dir = 1) {
    idx = (i + items.length) % items.length
    const it = items[idx]
    // Foto: 2 lapis — latar blur (ngisi layar penuh) + foto utama utuh di tengah.
    // Video: contain biar utuh & center (gak kepotong).
    const media = it.media_type === 'video'
      ? `<video src="${esc(it.media_url)}" muted playsinline></video>`
      : `<img class="slide-bg" src="${esc(it.media_url)}" alt="" aria-hidden="true">` +
        `<img class="slide-img" src="${esc(it.media_url)}" alt="${esc(it.title || '')}" loading="eager">`
    const el = document.createElement('div')
    el.className = 'slide t-' + (it.transition || 'fade') + (dir > 0 ? ' from-right' : ' from-left')
    el.innerHTML = media
    stage.appendChild(el)
    const old = [...stage.querySelectorAll('.slide')].slice(0, -1)
    old.forEach((o) => { o.classList.add('leaving'); setTimeout(() => o.remove(), 900) })
    requestAnimationFrame(() => el.classList.add('active'))

    // Caption sinematik: tanpa kotak — keterbacaan dari scrim gradient + text-shadow
    const hasCap = !!(it.title || it.caption)
    capEl.innerHTML = hasCap
      ? `<b>${esc(it.title || '')}</b>${it.caption ? '<span>' + esc(it.caption) + '</span>' : ''}`
      : ''
    capEl.classList.toggle('show', hasCap)
    if (scrimEl) scrimEl.classList.toggle('show', hasCap)
    setProgress(idx, it.duration_sec || 5)
    schedule(it)
  }

  function schedule(it) {
    clearTimeout(timer)
    if (it.media_type === 'video') {
      // Durasi video gak bisa ditebak → segmen progress langsung penuh
      setProgress(idx, 0, true)
      const v = stage.querySelector('video:last-of-type')
      if (v) {
        v.muted = true
        v.play().catch(() => { timer = setTimeout(next, (it.duration_sec || 5) * 1000) })
        v.onended = () => next()
        return
      }
    }
    timer = setTimeout(next, Math.max(2, it.duration_sec || 5) * 1000)
  }

  function next(dir = 1) {
    if (idx === items.length - 1 && dir > 0) {
      clearTimeout(timer)
      alive = false
      fills.forEach((f) => { f.style.transition = 'none'; f.style.width = '100%' })
      $('#slide-end').classList.remove('hidden')
      $('#s-end-btn').addEventListener('click', () => { unlock(7); show('surprise') })
      capEl.classList.remove('show')
      if (scrimEl) scrimEl.classList.remove('show')
      return
    }
    render(idx + dir, dir)
  }

  // Kontrol tanpa tombol: tap kiri/kanan layar + swipe di HP + panah keyboard.
  // Listener swipe nempel ke section (di-render ulang tiap show → gak numpuk).
  const sec = $('[data-screen="memory"]')
  $('.tz-left', sec).addEventListener('click', () => { if (alive) render(idx - 1, -1) })
  $('.tz-right', sec).addEventListener('click', () => { if (alive) next(1) })
  let touchX = null
  sec.addEventListener('touchstart', (e) => { if (alive) touchX = e.touches[0].clientX }, { passive: true })
  sec.addEventListener('touchend', (e) => {
    if (!alive || touchX == null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 60) (dx < 0 ? next(1) : render(idx - 1, -1))
    touchX = null
  }, { passive: true })
  const onKey = (e) => {
    if (!alive) { document.removeEventListener('keydown', onKey); return }
    if (e.key === 'ArrowRight') next(1)
    else if (e.key === 'ArrowLeft') render(idx - 1, -1)
  }
  document.addEventListener('keydown', onKey)

  render(0)
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
async function boot() {
  primeAudio()
  try {
    let preview = false
    if (params.get('preview') === 'draft') preview = await canPreviewDraft()
    D = await loadExperience({ previewDraft: preview })
  } catch (e) {
    document.getElementById('app').innerHTML = SCREENS.error({ msg: errMsg(e) })
    return
  }
  if (!D) {
    document.getElementById('app').innerHTML = SCREENS.nopublish()
    return
  }
  applyAppearance()

  // Preload musik SEJAK AWAL, tapi tidak diputar
  if (D.music?.music_url) {
    audioEl.src = D.music.music_url
    audioEl.volume = clamp(D.music.volume ?? 0.8, 0, 1)
    audioEl.preload = 'auto'
    audioEl.load()
  }

  // Admin preview: ?jump=report dll (butuh login admin utk preview=draft)
  const jump = params.get('jump')
  if (jump && ORDER.includes(jump)) {
    ST.unlocked = Math.max(ST.unlocked, ORDER.indexOf(jump) + 1)
    saveState()
    if (['reveal', 'memory', 'surprise', 'letter', 'end'].includes(jump)) {
      ST.revealed = true
      goDreamy()
    }
  }

  const start = jump && ORDER.includes(jump) ? jump : ORDER[ST.unlocked - 1]
  show(start)
}

boot()
