import gsap from 'gsap'
import './style.css'
import { loadExperience, canPreviewDraft, isDemo, sendReply } from '../shared/store.js'
import { $, $$, esc, sleep, clamp, errMsg, makeSelfieDataURL } from '../shared/utils.js'
import { FX, flashWhite, scramble } from './fx.js'
import { sfx } from '../shared/sfx.js'
import { SCREENS, topbar } from './screens.js'

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
    revealed: false,
    selfie: '' // dataURL kecil — buat Kartu Pilot di layar akhir (lokal, gak diupload)
  }
}
function loadState() {
  try { return { ...defState(), ...(JSON.parse(localStorage.getItem(STATE_KEY)) || {}) } }
  catch { return defState() }
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(ST)) }
  catch { /* kuota localStorage penuh / mode privat → biarkan, fitur tetap jalan */ }
}

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
    sfx.key() // tick terminal tiap baris log
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
        sfx.err() // buzz kode salah
        err.textContent = 'Nama / kode akses tidak cocok dengan data pilot. Coba cek lagi.'
        err.classList.remove('hidden')
        gsap.fromTo('.gate-card', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' })
        return
      }
      sfx.click()
      ST.name = name
      saveState()
      unlock(2)
      show('dashboard')
    })
  },

  // 2. DASHBOARD
  dashboard() {
    $('#btn-start').addEventListener('click', () => {
      sfx.click()
      unlock(3)
      show('tests')
    })
  },

  // 3. TESTS
  tests() {
    const idx = ST.tests.filter(Boolean).length

    // Semua modul udah selesai tapi nyangkut di layar tests (mis. ?jump=tests
    // saat semua modul sudah lulus) → jangan render form kosong, antar langsung.
    if (idx >= 3) { unlock(4); show('report'); return }

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
        sfx.ding() // absensi sukses
        ST.tests[0] = true; saveState()
        $('#t1-next').addEventListener('click', () => show('tests'))
      })
    }

    if (idx === 1) {
      $('#t2-file').addEventListener('change', async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        const url = URL.createObjectURL(f)
        $('#t2-img').src = url
        $('#t2-preview').classList.remove('hidden')
        $('#t2-frame').classList.add('hidden')
        $('#t2-run').disabled = false
        sfx.click()
        // Simpan versi kecil foto verifikasi buat Kartu Pilot di layar akhir.
        // dataURL → localStorage (lokal di HP dia, TIDAK dikirim ke server).
        const dataUrl = await makeSelfieDataURL(f)
        if (dataUrl) { ST.selfie = dataUrl; saveState() }
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
        sfx.ding() // match ditemukan
        ST.tests[1] = true; saveState()
        $('#t2-next').addEventListener('click', () => show('tests'))
      })
    }

    if (idx === 2) {
      $('#t3-send').addEventListener('click', async () => {
        $('#t3-send').disabled = true
        sfx.click()
        const n = $('#t3-notif')
        n.classList.remove('hidden')
        n.classList.add('drop-in')
        sfx.ding() // notifikasi masuk
        await sleep(1200)
        await typeLines('#t3-log', [
          { t: 'notifikasi terkirim ke perangkat pilot… OK', c: 'ok-text' },
          { t: 'diterima & dibaca: ya', c: 'ok-text' }
        ], 350)
        $('#t3-done').classList.remove('hidden')
        $('#t3-next').classList.remove('hidden')
        ST.tests[2] = true; saveState()
        $('#t3-next').addEventListener('click', async () => {
          // layar "menyusun laporan" sebentar
          const app = document.getElementById('app')
          app.innerHTML = `
            <div class="compile-overlay">
              <div class="spinner"></div>
              <div class="mono">Menyusun laporan final…</div>
            </div>`
          await sleep(2000)
          // JADWAL "SERVER SIBUK": sebelum jam buka, laporan ditahan server.
          // Drama-nya: dia udah selesai semua modul, eh ditampik pas paling penasaran.
          const at = maintenanceAt()
          if (at && Date.now() < at.getTime() && !isBypass()) { showServerBusy(); return }
          unlock(4)
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

  // 5. REVEAL — neon menyala + kelopak jatuh + nama drop per huruf
  reveal() {
    fx.setMode('petals')
    fx.petals(30)
    sfx.chime()
    sfx.neon() // bztt — listrik neon mulai nyala
    setTimeout(() => fx.burst(140), 350)
    setTimeout(() => fx.burst(100), 1400)
    // Neon nyala dulu (CSS flicker ±1s), nama baru turun huruf demi huruf
    gsap.from('.rv-ch', {
      delay: 0.9, y: -80, opacity: 0, rotate: () => -14 + Math.random() * 28,
      duration: 0.85, stagger: 0.045, ease: 'back.out(1.7)'
    })
    // FIX: reveal index 4, memory index 5 → harus unlock(6) dulu, kalau gak
    // router memental balik ke reveal (bug "LIHAT GALERI KAMU" gak jalan).
    $('#rv-next').addEventListener('click', () => { sfx.click(); unlock(6); show('memory') })
  },

  // 6. MEMORY (slideshow)
  memory() {
    startSlideshow()
  },

  // 7. SURPRISE — kue + tiup lilin
  surprise() {
    $('#sp-btn').addEventListener('click', () => {
      $('#sp-btn').disabled = true
      sfx.click()
      $('#sp-intro').classList.add('hidden')
      const scene = $('#cake-scene')
      scene.classList.remove('hidden')
      gsap.from(scene, { opacity: 0, scale: 0.88, y: 30, duration: 0.8, ease: 'back.out(1.4)' })
      bindCandles()
    })
  },

  // 8. LETTER — amplop terbuka → surat diketik live
  letter() {
    fx.setMode('balloons')
    fx.balloons(8)
    $('#lt-open').addEventListener('click', () => {
      $('#lt-open').disabled = true
      sfx.paper() // suara kertas
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
          startTyping()
        })
      fx.hearts(20)
    })
    $('#lt-next').addEventListener('click', () => {
      sfx.click()
      unlock(9)
      show('end')
    })
  },

  // 9. ENDING — balon + kartu pilot + balas pesan
  end() {
    fx.setMode('balloons')
    fx.balloons(10)
    fx.hearts(24)
    sfx.chime()
    // Cap "LULUS ✓" di-STEMPEL telat ±1 detik setelah kartu muncul (duk!)
    const stamp = $('.pc-stamp')
    if (stamp) {
      gsap.timeline({ delay: 1.05 })
        .fromTo(stamp,
          { scale: 2.6, opacity: 0, rotate: 26 },
          { scale: 0.94, opacity: 0.85, rotate: 5, duration: 0.3, ease: 'power3.in' })
        .to(stamp, { scale: 1, rotate: 8, duration: 0.22, ease: 'back.out(3)' })
        .add(() => sfx.stamp(), 0.3)
    }
    // Kartu ngikutin jari/pointer (tilt 3D ala kartu hologram) + kilau glare
    const card = $('#pilot-card')
    if (card) {
      const glare = $('.pc-glare', card)
      const onMove = (e) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.transform = `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`
        if (glare) {
          glare.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%')
          glare.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%')
          glare.style.opacity = '1'
        }
      }
      const onLeave = () => {
        card.style.transform = ''
        if (glare) glare.style.opacity = '0'
      }
      card.addEventListener('pointermove', onMove)
      card.addEventListener('pointerleave', onLeave)
      card.addEventListener('pointercancel', onLeave)
    }
    $('#end-replay').addEventListener('click', () => { sfx.click(); show('memory') })
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
    // Balas pesan → tersimpan di tabel replies (dibaca admin di /admin)
    $('#rp-send')?.addEventListener('click', async () => {
      const btn = $('#rp-send')
      const body = $('#rp-body').value.trim()
      const errEl = $('#rp-err')
      if (!body) {
        errEl.textContent = 'Tulis dulu balasannya ya ♡'
        errEl.classList.remove('hidden')
        return
      }
      btn.disabled = true; btn.textContent = 'MENGIRIM…'
      try {
        const r = await sendReply(ST.name || 'Penerima', body)
        $('#rp-form').classList.add('hidden')
        const ok = $('#rp-ok')
        ok.textContent = r?.demo
          ? 'Terkirim ♡ (mode demo — balasan belum tersimpan di database)'
          : 'Terkirim ♡ — pesan lu udah sampe ke pengirim. Makasih ya!'
        ok.classList.remove('hidden')
        sfx.ding()
      } catch (e) {
        btn.disabled = false; btn.textContent = 'KIRIM BALASAN'
        errEl.textContent = 'Gagal mengirim: ' + errMsg(e)
        errEl.classList.remove('hidden')
      }
    })
  }
}

// ─────────────────────────────────────────────────────────────
// KUE — tiup lilin satu-satu
// ─────────────────────────────────────────────────────────────
function bindCandles() {
  const candles = $$('#cake-scene .candle')
  const cnt = $('#cake-count')
  let left = candles.length
  const upd = () => { cnt.textContent = left > 0 ? left + ' lilin tersisa…' : 'semua lilin mati ♡' }
  upd()
  candles.forEach((c) => {
    c.addEventListener('click', () => {
      if (c.classList.contains('out')) return
      c.classList.add('out')
      sfx.poof()
      left--
      upd()
      if (left === 0) {
        sfx.tada()
        flashWhite(420)
        fx.burst(220)
        setTimeout(() => fx.burst(120), 350)
        // Jangan langsung loncat ke surat — ada kado dulu:
        // alurnya jadi: tiup lilin → buka kado → surat.
        setTimeout(showGift, 1100)
      }
    })
  })
}

// Kado muncul menggantikan scene kue (abis semua lilin mati)
function showGift() {
  const cake = $('#cake-scene')
  const gift = $('#gift-scene')
  if (!cake || !gift) { unlock(8); show('letter'); return }
  gsap.to(cake, {
    opacity: 0, y: -24, duration: 0.5, ease: 'power2.in',
    onComplete: () => {
      cake.classList.add('hidden')
      gift.classList.remove('hidden')
      gsap.from(gift, { opacity: 0, y: 40, duration: 0.7, ease: 'power3.out' })
      gsap.from('#gift-box', { scale: 0.4, rotate: -8, duration: 0.9, ease: 'back.out(1.8)', delay: 0.15 })
      $('#gift-box').addEventListener('click', openGift, { once: true })
    }
  })
}

// Kado dibuka: tutup terbang + confetti → lanjut ke surat
function openGift() {
  const btn = $('#gift-box')
  if (!btn || btn.disabled) return
  btn.disabled = true
  sfx.pop()
  fx.burst(240)
  setTimeout(() => fx.burst(140), 300)
  fx.hearts(16)
  const lid = btn.querySelector('.gift-lid')
  const bow = btn.querySelector('.gift-bow')
  if (lid) gsap.to(lid, { y: -150, rotate: -24, opacity: 0, duration: 0.75, ease: 'power2.out' })
  if (bow) gsap.to(bow, { y: -150, rotate: 18, opacity: 0, duration: 0.75, ease: 'power2.out' })
  gsap.to(btn, { scale: 0.92, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  setTimeout(() => { flashWhite(380); unlock(8); show('letter') }, 1150)
}

// ─────────────────────────────────────────────────────────────
// SURAT — diketik live paragraf demi paragraf (tap = langsung selesai)
// ─────────────────────────────────────────────────────────────
function startTyping() {
  const ps = $$('#letter-card p.type-p')
  const sig = $('#letter-card .sign')
  const nextBtn = $('#lt-next')
  const hint = $('#letter-card .type-hint')
  const paras = ps.map((p) => p.getAttribute('data-txt') || '')
  let pi = 0, ci = 0, done = false, timer = null

  const cursor = document.createElement('span')
  cursor.className = 'type-cursor'

  const finish = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    cursor.remove()
    hint?.classList.add('hidden')
    ps.forEach((p, i) => { p.innerHTML = esc(paras[i]).replace(/\n/g, '<br>') })
    sig?.classList.remove('hidden')
    nextBtn?.classList.remove('hidden')
    if (sig && nextBtn) gsap.fromTo([sig, nextBtn], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
  }

  const tick = () => {
    if (done) return
    if (pi >= paras.length) { finish(); return }
    const p = ps[pi]
    const txt = paras[pi]
    if (ci < txt.length) {
      const ch = txt[ci]
      if (ch === '\n') p.appendChild(document.createElement('br'))
      else p.appendChild(document.createTextNode(ch))
      p.appendChild(cursor)
      if (ci % 3 === 0) sfx.key()
      ci++
      timer = setTimeout(tick, 26 + Math.random() * 34)
    } else {
      pi++; ci = 0
      timer = setTimeout(tick, 260)
    }
  }

  $('#letter-card').addEventListener('click', () => { if (!done) finish() })
  tick()
}

// ─────────────────────────────────────────────────────────────
// GLITCH ANOMALI → REVEAL
// ─────────────────────────────────────────────────────────────
function runAnomalyGlitch() {
  return new Promise((resolve) => {
    sfx.glitch() // dengung glitch
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
// JADWAL "SERVER SIBUK" (pemeliharaan terjadwal)
// D.site.maintenance_at = 'YYYY-MM-DDTHH:mm' — TANPA zona waktu, dan new Date()
// mem-parsing format itu sebagai waktu LOKAL device → "00:00" artinya 00:00
// jam HP penerima, otomatis ikut zona waktunya. Kosong = fitur mati.
// Bypass ?preview= / ?jump= (jalur admin) gak pernah kena blok ini.
// ─────────────────────────────────────────────────────────────
const isBypass = () => params.has('jump') || params.has('preview')

function maintenanceAt() {
  const v = String(D?.site?.maintenance_at || '').trim()
  if (!v) return null
  // Dukungan kecil buat tes (mode demo): '600s' = 600 detik dari sekarang.
  // (Dipake E2E; hindari '+' karena di URL query '+' ke-decode jadi spasi.)
  const rel = v.match(/^(?:\+)?(\d+(?:\.\d+)?)s?$/)
  const t = rel ? new Date(Date.now() + parseFloat(rel[1]) * 1000) : new Date(v)
  return isNaN(t.getTime()) ? null : t
}

function showServerBusy() {
  const s = D.site || {}
  const app = document.getElementById('app')
  const at = maintenanceAt()
  const p2 = (n) => String(n).padStart(2, '0')
  const whenTxt = at
    ? at.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ' · ' + p2(at.getHours()) + ':' + p2(at.getMinutes())
    : '—'

  app.innerHTML = `
  <section class="screen" data-screen="busy">
    ${topbar(s, '<span class="pill">MAINTENANCE</span>')}
    <div class="screen-body center">
      <div class="glass card wide busy-card" data-anim>
        <div class="card-kicker mono">STATUS SERVER · ${esc(s.system_name || 'SIAP')} ${esc(s.system_version || '')}</div>
        <div id="busy-wait">
          <div class="busy-head"><span class="busy-dot"></span><h1>503 — SERVER SIBUK</h1></div>
          <p class="muted">Server sedang menjalani <b>pemeliharaan terjadwal</b>. Semua modul uji lu
          udah <b class="ok-text">LULUS ✓</b>, tapi laporan final sementara ditahan sama server.</p>
          <div class="term mono busy-log">
            <div class="term-line">&gt; modul uji 3/3 ................ <b class="ok-text">LULUS ✓</b></div>
            <div class="term-line">&gt; pemeliharaan terjadwal ........ <b class="busy-amber">BERJALAN</b></div>
            <div class="term-line">&gt; laporan final ................. <b class="busy-amber">DITAHAN</b></div>
            <div class="term-line">&gt; kembali online ................ ${esc(whenTxt)}</div>
          </div>
        </div>
        <div id="busy-online" class="hidden">
          <div class="passline">✓ SERVER KEMBALI ONLINE — pemeliharaan selesai tepat waktu</div>
          <div class="term mono busy-log">
            <div class="term-line">&gt; verifikasi jadwal ............. <b class="ok-text">SELESAI</b></div>
            <div class="term-line">&gt; sesi ${esc(ST.session)} .. <b class="ok-text">DITEMUKAN</b></div>
            <div class="term-line">&gt; laporan final ................. <b class="ok-text">SIAP DIBUKA</b></div>
          </div>
          <button id="busy-open" class="btn btn-block">BUKA LAPORAN SEKARANG →</button>
        </div>
        <div class="busy-clockbox">
          <div class="busy-clock mono" id="busy-clock">--:--:--</div>
          <div class="mono tiny muted">jam server = jam perangkat lu · biarin halaman ini kebuka, dia ubah sendiri pas waktunya</div>
        </div>
      </div>
    </div>
  </section>`

  const clockEl = $('#busy-clock')
  const tickClock = () => {
    const d = new Date()
    clockEl.textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
  }
  tickClock()
  const clockTimer = setInterval(tickClock, 1000)

  const goOnline = () => {
    $('#busy-wait').classList.add('hidden')
    $('#busy-online').classList.remove('hidden')
    sfx.ding()
    gsap.from('#busy-online', { opacity: 0, y: 18, duration: 0.6, ease: 'power2.out' })
  }

  // Udah lewat jam buka sejak awal (buka ulang setelah jam 12) → langsung mode online
  if (at && Date.now() >= at.getTime()) goOnline()
  else sfx.err() // bztt — server nolak

  // Ngecek tiap detik → tepat jam buka layar berubah sendiri (tanpa refresh)
  const flip = setInterval(() => {
    if (!at || Date.now() < at.getTime()) return
    clearInterval(flip)
    goOnline()
  }, 1000)

  $('#busy-open').addEventListener('click', () => {
    sfx.click()
    clearInterval(clockTimer); clearInterval(flip)
    app.innerHTML = `
      <div class="compile-overlay">
        <div class="spinner"></div>
        <div class="mono">Memulihkan sesi… membuka laporan final…</div>
      </div>`
    setTimeout(() => { unlock(4); show('report') }, 1400)
  })
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
// BOOT SEQUENCE — layar boot ala BIOS sebelum Access Gate (±2 detik)
// Skipped kalau ?jump= / ?preview= (admin preview, biar gak nunggu terus)
// ─────────────────────────────────────────────────────────────
function showBootOverlay() {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    el.className = 'boot-overlay'
    el.innerHTML = `
      <div class="boot-box mono">
        <div class="boot-logo">SIAP <b>v2.4.1-pilot</b></div>
        <div class="boot-sub">Sistem Informasi Absensi Pelajar</div>
        <div class="boot-logs"></div>
        <div class="boot-bar"><div class="boot-fill"></div></div>
      </div>`
    document.body.appendChild(el)
    const logs = [
      'memuat modul absensi ......... OK',
      'verifikasi database .......... OK',
      'sinkronisasi jadwal .......... OK',
      'menyiapkan sesi tester ....... OK'
    ]
    const box = el.querySelector('.boot-logs')
    logs.forEach((l, i) => setTimeout(() => {
      const d = document.createElement('div')
      d.textContent = '> ' + l
      box.appendChild(d)
    }, 260 + i * 280))
    const fill = el.querySelector('.boot-fill')
    requestAnimationFrame(() => {
      fill.style.transition = 'width 1.7s cubic-bezier(.4,0,.2,1)'
      fill.style.width = '100%'
    })
    setTimeout(() => {
      el.classList.add('boot-out')
      setTimeout(() => { el.remove(); resolve() }, 500)
    }, 2050)
  })
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
async function boot() {
  primeAudio()
  const skipBoot = params.has('jump') || params.has('preview')
  const bootP = skipBoot ? null : showBootOverlay()
  try {
    let preview = false
    if (params.get('preview') === 'draft') preview = await canPreviewDraft()
    D = await loadExperience({ previewDraft: preview })
  } catch (e) {
    if (bootP) { bootP.then(() => {}) }
    document.getElementById('app').innerHTML = SCREENS.error({ msg: errMsg(e) })
    return
  }
  if (!D) {
    document.getElementById('app').innerHTML = SCREENS.nopublish()
    return
  }

  // ⚙️ MODE DEMO SAJA: ?maintenance=YYYY-MM-DDTHH:mm (atau '+8' = 8 detik dari sekarang)
  // buat ngetes layar SERVER SIBUK tanpa Supabase. Di produksi param ini diabaikan.
  if (isDemo && params.get('maintenance')) {
    D.site = { ...(D.site || {}), maintenance_at: params.get('maintenance') }
  }

  if (bootP) await bootP // boot selesai dulu, baru layar pertama muncul
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

  // Semua modul selesai tapi masih nanggung di depan "SERVER SIBUK"
  // (refresh / buka ulang sebelum jam buka) → antar ke layar status server.
  // Udah lewat jam buka (atau fiturnya dimatiin) → langsung lolos ke laporan.
  if (!jump && !params.has('preview') && start === 'tests' && ST.tests.every(Boolean)) {
    const at = maintenanceAt()
    if (at && Date.now() < at.getTime()) { showServerBusy(); return }
    unlock(4)
    show('report')
    return
  }
  show(start)
}

boot()
