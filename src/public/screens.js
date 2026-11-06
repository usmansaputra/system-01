import { esc, fmtTanggal, fmtDateTimeNow, nowClock } from '../shared/utils.js'

// Template HTML 9 layar publik. ctx = { D: data, ST: state }
export function topbar(site, extra = '') {
  return `
  <div class="topbar">
    <div class="brand"><span class="dot"></span>${esc(site.system_name || 'SIAP')} <b class="ver mono">${esc(site.system_version || 'v2.4.1-pilot')}</b></div>
    ${extra}
  </div>`
}

export function statusbar(ST, site) {
  const done = ST.tests.filter(Boolean).length
  return `
  <div class="statusbar mono">
    <span class="ok-text">● SYSTEM ONLINE</span>
    <span>SESI ${esc(ST.session)}</span>
    <span>MODUL ${done}/3</span>
    <span class="hide-sm">${esc(site.school_name || '')}</span>
  </div>`
}

const SCREENS = {
  // ── 1. ACCESS GATE ──────────────────────────────────────────
  gate({ D, ST }) {
    const s = D.site
    return `
    <section class="screen" data-screen="gate">
      ${topbar(s, '<span class="pill">PILOT PROGRAM</span>')}
      <div class="screen-body center">
        <div class="glass card gate-card" data-anim>
          <div class="card-kicker mono">AKSES TESTER · ${esc(s.access_code || 'SPECIAL-001')}</div>
          <h1>${esc(s.tagline || 'Sistem Informasi Absensi Pelajar')}</h1>
          <p class="muted">${esc(s.school_name || 'Sekolah')} sedang beralih ke sistem absensi baru.
          Kamu terpilih sebagai <b>pilot tester</b> untuk menguji alur absensi sebelum diterapkan ke semua siswa.</p>
          <form id="gate-form" autocomplete="off">
            <div class="field"><label>Nama Lengkap</label>
              <input id="g-name" placeholder="Tulis nama lengkapmu" value="${esc(ST.name || '')}"></div>
            <div class="field"><label>Kode Akses Tester</label>
              <input id="g-code" placeholder="Contoh: SPECIAL-001" value=""></div>
            <div id="g-err" class="err hidden"></div>
            <button class="btn btn-block" type="submit">MASUK SISTEM</button>
          </form>
        </div>
      </div>
      ${statusbar(ST, s)}
    </section>`
  },

  // ── 2. MAIN DASHBOARD ───────────────────────────────────────
  dashboard({ D, ST }) {
    const s = D.site
    const done = ST.tests.filter(Boolean).length
    const names = [s.test1_name, s.test2_name, s.test3_name]
    const rows = names.map((n, i) => `
      <li>
        <span class="tnum mono">0${i + 1}</span>
        <span class="tname">${esc(n)}</span>
        <span class="tstat ${ST.tests[i] ? 'ok-text' : ''}">${ST.tests[i] ? 'LULUS ✓' : 'MENUNGGU'}</span>
      </li>`).join('')
    return `
    <section class="screen" data-screen="dashboard">
      ${topbar(s)}
      <div class="screen-body center">
        <div class="glass card wide" data-anim>
          <div class="card-kicker mono">DASHBOARD PILOT TESTER</div>
          <h1>Halo, ${esc(ST.name)}</h1>
          <p class="muted">Sesi pengujian <span class="mono">${esc(ST.session)}</span> · Status akses: <b class="ok-text">GRANTED</b></p>
          <div class="pwrap">
            <div class="pbar"><div class="pfill" style="width:${(done / 3) * 100}%"></div></div>
            <span class="mono pnum">${done}/3</span>
          </div>
          <ul class="testlist">${rows}</ul>
          <button id="btn-start" class="btn btn-block">${done > 0 ? 'LANJUTKAN PENGUJIAN' : 'MULAI PENGUJIAN'}</button>
        </div>
      </div>
      ${statusbar(ST, s)}
    </section>`
  },

  // ── 3. TESTING MODULE (3 tes) ───────────────────────────────
  tests({ D, ST }) {
    const s = D.site
    const idx = Math.min(3, ST.tests.filter(Boolean).length)
    const dots = [0, 1, 2].map((i) => `<span class="sdot ${i < idx ? 'on' : i === idx ? 'now' : ''}"></span>`).join('')
    let body = ''
    if (idx === 0) {
      body = `
        <p class="muted">Simulasikan absen masuk seperti biasa. Sistem akan mencatat ke database uji.</p>
        <form id="t1-form" autocomplete="off">
          <div class="field"><label>Nama</label><input value="${esc(ST.name)}" readonly class="ro"></div>
          <div class="field"><label>Kelas</label><input id="t1-class" placeholder="mis. 8B" value="${esc(ST.className)}"></div>
          <div class="field"><label>Jam Absen</label><input value="${nowClock()}" readonly class="ro"></div>
          <button class="btn btn-block" type="submit">ABSEN SEKARANG</button>
        </form>
        <div id="t1-log" class="term mono hidden"></div>
        <div id="t1-done" class="passline hidden">✓ Absensi tercatat — <b>TEPAT WAKTU</b> · record ${esc(ST.absId)}</div>
        <button id="t1-next" class="btn btn-ghost hidden">LANJUT KE MODUL 02 →</button>`
    } else if (idx === 1) {
      body = `
        <p class="muted">Sistem baru memakai verifikasi wajah. Ambil satu foto selfie untuk menguji matching.</p>
        <div class="faceframe" id="t2-frame"><div class="facebox"><span>◡</span></div><div class="mono tiny">KAMERA VERIFIKASI</div></div>
        <label class="btn btn-ghost filebtn">AMBIL FOTO VERIFIKASI<input id="t2-file" type="file" accept="image/*" capture="user" hidden></label>
        <div id="t2-preview" class="hidden"><img id="t2-img" alt="foto verifikasi"></div>
        <button id="t2-run" class="btn btn-block" disabled>JALANKAN ANALISIS</button>
        <div class="pwrap hidden" id="t2-pwrap"><div class="pbar"><div class="pfill"></div></div></div>
        <div id="t2-log" class="term mono hidden"></div>
        <div id="t2-done" class="passline hidden">✓ Verifikasi berhasil — MATCH <b>98.7%</b></div>
        <button id="t2-next" class="btn btn-ghost hidden">LANJUT KE MODUL 03 →</button>`
    } else {
      body = `
        <p class="muted">Kirim satu notifikasi tes ke perangkat ini, pastikan sampai.</p>
        <button id="t3-send" class="btn btn-block">KIRIM NOTIFIKASI TES</button>
        <div id="t3-notif" class="notif hidden">
          <div class="notif-head"><b>SIAP</b><span class="mono tiny">sekarang</span></div>
          <span>Absensi kamu hari ini sudah tercatat ✓</span>
        </div>
        <div id="t3-log" class="term mono hidden"></div>
        <div id="t3-done" class="passline hidden">✓ Notifikasi diterima</div>
        <button id="t3-next" class="btn btn-ghost hidden">SELESAIKAN PENGUJIAN →</button>`
    }
    return `
    <section class="screen" data-screen="tests">
      ${topbar(s)}
      <div class="screen-body center">
        <div class="glass card wide" data-anim>
          <div class="card-kicker mono">MODUL 0${idx + 1} — ${esc([s.test1_name, s.test2_name, s.test3_name][idx])}</div>
          <div class="steps">${dots}</div>
          ${body}
        </div>
      </div>
      ${statusbar(ST, s)}
    </section>`
  },

  // ── 4. FINAL TEST REPORT (MUSIK MULAI DI SINI) ──────────────
  report({ D, ST }) {
    const s = D.site
    const anomaly = (s.anomaly_text || '').replace('{date}', fmtTanggal(s.birthday_date) || 'hari ini')
    const revealed = ST.revealed
    return `
    <section class="screen" data-screen="report">
      ${topbar(s)}
      <div class="screen-body center">
        <div class="glass card wide mono-card" data-anim>
          <div class="card-kicker mono">LAPORAN HASIL PENGUJIAN · PILOT ${esc(s.access_code || 'SPECIAL-001')}</div>
          <div class="mono tiny muted">${esc(fmtDateTimeNow())}</div>
          <table class="rtable mono">
            <tr><td>MODUL 01 · ${esc(s.test1_name)}</td><td class="ok-text">LULUS ✓</td></tr>
            <tr><td>MODUL 02 · ${esc(s.test2_name)}</td><td class="ok-text">LULUS ✓ · 98.7%</td></tr>
            <tr><td>MODUL 03 · ${esc(s.test3_name)}</td><td class="ok-text">LULUS ✓</td></tr>
          </table>
          <p class="mono small">KESIMPULAN: semua modul berfungsi normal.</p>
          <div id="anomaly-box" class="anomaly ${revealed ? 'anomaly-love' : ''}">
            <div class="an-head">⚠ ANOMALI TERDETEKSI (1)</div>
            <div id="anomaly-text" class="mono">${revealed ? '❤ PENYEBAB TERDETEKSI: seseorang berulang tahun HARI INI ❤' : esc(anomaly)}</div>
            <div class="mono tiny">Subjek: ${esc(ST.name)} · Status: ${revealed ? 'CONFIRMED' : 'PENDING MANUAL REVIEW'}</div>
            <button id="anomaly-btn" class="btn ${revealed ? 'btn-love' : ''}">${revealed ? 'BUKA SEKARANG ♡' : 'BUKA LAPORAN ANOMALI #001'}</button>
          </div>
          <button id="audio-chip" class="audio-chip hidden">🔊 putar musik laporan</button>
        </div>
      </div>
      ${statusbar(ST, s)}
    </section>`
  },

  // ── 5. CINEMATIC REVEAL ─────────────────────────────────────
  reveal({ D, ST }) {
    const s = D.site
    return `
    <section class="screen reveal-screen" data-screen="reveal">
      <div class="reveal-body">
        <div class="reveal-kicker mono" data-anim>HARI INI · ${esc(fmtTanggal(s.birthday_date) || 'HARI SPESIAL')}</div>
        <h1 class="reveal-title" data-anim>SELAMAT ULANG TAHUN,<br>${esc(ST.name).toUpperCase()}! 🎂</h1>
        <p class="reveal-sub" data-anim>${esc(s.reveal_subtitle || '')}</p>
        <button id="rv-next" class="btn btn-love btn-big" data-anim>LIHAT KENANGAN KITA →</button>
      </div>
    </section>`
  },

  // ── 6. MEMORY EXPERIENCE (slideshow) ────────────────────────
  memory({ D, ST }) {
    return `
    <section class="screen" data-screen="memory">
      <div class="slide-stage" id="slide-stage"></div>
      <div class="slide-top mono">UNTUK ${esc(ST.name).toUpperCase()} ♡ · <span id="slide-count">1/${Math.max(1, D.memories.length)}</span></div>
      <div class="slide-caption" id="slide-caption"></div>
      <div class="dots" id="slide-dots"></div>
      <button class="snav prev" id="s-prev" aria-label="sebelumnya">‹</button>
      <button class="snav next" id="s-next" aria-label="berikutnya">›</button>
      <div id="slide-end" class="slide-end hidden">
        <button id="s-end-btn" class="btn btn-love btn-big">SATU KEJUTAN TERAKHIR →</button>
      </div>
    </section>`
  },

  // ── 7. SURPRISE BUTTON ──────────────────────────────────────
  surprise() {
    return `
    <section class="screen" data-screen="surprise">
      <div class="screen-body center">
        <div class="sp-wrap" data-anim>
          <h1 class="soft-title">Masih ada satu hal terakhir…</h1>
          <button id="sp-btn" class="btn btn-love btn-huge pulse">ONE LAST SURPRISE</button>
          <div id="sp-count" class="count hidden"></div>
        </div>
      </div>
    </section>`
  },

  // ── 8. BIRTHDAY LETTER (amplop) ─────────────────────────────
  letter({ D }) {
    const L = D.letter || {}
    const paras = String(L.body || '').split(/\n\s*\n/).filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
    return `
    <section class="screen" data-screen="letter">
      <div class="letter-scene">
        <div id="envelope" class="envelope" data-anim>
          <div class="env-body"></div>
          <div class="env-flap"></div>
          <div class="env-seal">♡</div>
        </div>
        <button id="lt-open" class="btn btn-love" data-anim>BUKA AMPLOP</button>
        <div id="letter-card" class="letter-card hidden">
          <h2>${esc(L.title || 'Buat Kamu,')}</h2>
          ${paras || '<p>…</p>'}
          <div class="sign">With love,<br><span class="hand">${esc(L.signature || '')}</span> ♡</div>
          <button id="lt-next" class="btn btn-ghost">SELANJUTNYA →</button>
        </div>
      </div>
    </section>`
  },

  // ── 9. FINAL ENDING ─────────────────────────────────────────
  end({ D, ST }) {
    const s = D.site
    return `
    <section class="screen" data-screen="end">
      <div class="screen-body center">
        <div class="end-wrap" data-anim>
          <div class="end-heart">♡</div>
          <h1 class="soft-title">THE END</h1>
          <p class="muted">With love, <b>${esc(s.sender_name || 'seseorang yang sayang kamu')}</b></p>
          <div class="end-btns">
            <button id="end-replay" class="btn btn-love">ULANGI KENANGAN ↺</button>
            <button id="end-reset" class="btn btn-ghost">KEMBALI KE AWAL</button>
          </div>
          <div class="mono tiny muted">${esc(s.system_name)} ${esc(s.system_version)} · sesi ${esc(ST.session)}</div>
        </div>
      </div>
    </section>`
  },

  // ── EXTRA: layar error / belum publish ──────────────────────
  nopublish() {
    return `
    <section class="screen" data-screen="nopublish">
      <div class="screen-body center">
        <div class="glass card wide" data-anim>
          <div class="card-kicker mono">SISTEM BELUM SIAP</div>
          <h1>Konten belum di-publish</h1>
          <p class="muted">Sistem terhubung, tapi belum ada versi konten yang aktif.
          Buka <b>/admin</b> → menu <b>Publish</b> → klik <b>PUBLISH SEKARANG</b>.</p>
        </div>
      </div>
    </section>`
  },

  error({ msg }) {
    return `
    <section class="screen" data-screen="error">
      <div class="screen-body center">
        <div class="glass card wide" data-anim>
          <div class="card-kicker mono">GAGAL MEMUAT</div>
          <h1>Ada masalah koneksi data</h1>
          <p class="muted">Cek konfigurasi Supabase (env atau <span class="mono">config.js</span>) dan pastikan <span class="mono">schema.sql</span> sudah dijalankan.</p>
          <div class="term mono">${esc(String(msg || '')).slice(0, 400)}</div>
        </div>
      </div>
    </section>`
  }
}

export { SCREENS }
