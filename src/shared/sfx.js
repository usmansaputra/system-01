// ============================================================
// SFX — efek suara UI via WebAudio API (tanpa file audio).
// Semua suara disintesis on-the-fly; volume sengaja pelan biar
// jadi bumbu, bukan gangguan. Kalau browser belum kasih izin
// audio (belum ada gesture), ensure() gagal → suara di-skip diam.
// ============================================================

let ctx = null

function ensure() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

// Nada tunggal (opsional glide f→f2)
function tone({ f = 880, f2 = null, t = 0.08, type = 'sine', g = 0.04, when = 0 }) {
  const c = ensure(); if (!c) return
  const o = c.createOscillator()
  const gn = c.createGain()
  const t0 = c.currentTime + when
  o.type = type
  o.frequency.setValueAtTime(Math.max(20, f), t0)
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t)
  gn.gain.setValueAtTime(g, t0)
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t)
  o.connect(gn).connect(c.destination)
  o.start(t0)
  o.stop(t0 + t + 0.03)
}

// Derau pendek ter-filter (whoosh / poof / kertas)
function noise({ t = 0.15, g = 0.05, freq = 1200, when = 0 }) {
  const c = ensure(); if (!c) return
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * t)), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const n = c.createBufferSource()
  n.buffer = buf
  const fl = c.createBiquadFilter()
  fl.type = 'lowpass'; fl.frequency.value = freq
  const gn = c.createGain()
  const t0 = c.currentTime + when
  gn.gain.setValueAtTime(g, t0)
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t)
  n.connect(fl).connect(gn).connect(c.destination)
  n.start(t0)
}

export const sfx = {
  // tick terminal / ketikan surat
  key: () => tone({ f: 1050 + Math.random() * 500, t: 0.03, type: 'square', g: 0.012 }),
  // klik tombol umum
  click: () => tone({ f: 620, f2: 940, t: 0.055, type: 'triangle', g: 0.03 }),
  // notifikasi masuk / sukses modul
  ding: () => { tone({ f: 880, t: 0.16, g: 0.05 }); tone({ f: 1318, t: 0.26, g: 0.04, when: 0.09 }) },
  // kode akses salah
  err: () => tone({ f: 230, f2: 150, t: 0.28, type: 'sawtooth', g: 0.05 }),
  // glitch anomali
  glitch: () => { noise({ t: 0.28, g: 0.06, freq: 850 }); tone({ f: 95, f2: 52, t: 0.32, type: 'square', g: 0.05 }) },
  // lilin mati (poof + pitch turun)
  poof: () => { noise({ t: 0.13, g: 0.06, freq: 750 }); tone({ f: 520, f2: 170, t: 0.12, g: 0.035 }) },
  // reveal
  chime: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: 0.38, g: 0.038, when: i * 0.09 })),
  // amplop dibuka (kertas)
  paper: () => noise({ t: 0.32, g: 0.045, freq: 2600 }),
  // fanfare kecil (lilin habis / momen final)
  tada: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: 0.3, g: 0.05, when: i * 0.11 }))
    tone({ f: 1568, t: 0.55, g: 0.04, when: 0.46 })
  }
}
