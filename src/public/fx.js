// Efek visual: partikel ambient (tema dreamy), confetti, flash
const PASTEL = ['#ff9ec7', '#c084fc', '#7dd3fc', '#ffd6a5', '#fff1f5', '#fbbf24']

export class FX {
  constructor(canvas) {
    this.c = canvas
    this.ctx = canvas.getContext('2d')
    this.parts = []
    this.mode = 'off'
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  resize() {
    this.c.width = window.innerWidth
    this.c.height = window.innerHeight
  }

  setMode(mode) { this.mode = mode }

  // Ledakan confetti dari tengah layar
  burst(count = 130) {
    const cx = this.c.width / 2
    const cy = this.c.height / 2
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2
      const sp = 4 + Math.random() * 9
      this.parts.push({
        type: 'confetti',
        x: cx, y: cy,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 4,
        s: 4 + Math.random() * 6,
        c: PASTEL[(Math.random() * PASTEL.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * .3,
        life: 1, decay: 0.008 + Math.random() * 0.01
      })
    }
  }

  // Hujan hati kecil (untuk ending)
  hearts(count = 26) {
    for (let i = 0; i < count; i++) {
      this.parts.push({
        type: 'heart',
        x: Math.random() * this.c.width,
        y: this.c.height + 20 + Math.random() * 200,
        vx: (Math.random() - .5) * .8,
        vy: -(0.6 + Math.random() * 1.4),
        s: 8 + Math.random() * 12,
        c: PASTEL[(Math.random() * PASTEL.length) | 0],
        life: 1, decay: 0.002
      })
    }
  }

  spawnAmbient() {
    this.parts.push({
      type: 'ambient',
      x: Math.random() * this.c.width,
      y: this.c.height + 10,
      vx: (Math.random() - .5) * .4,
      vy: -(0.3 + Math.random() * 0.7),
      s: 2 + Math.random() * 5,
      c: PASTEL[(Math.random() * PASTEL.length) | 0],
      life: 0.5 + Math.random() * 0.3,
      decay: 0.0015
    })
  }

  loop() {
    const { ctx, c } = this
    ctx.clearRect(0, 0, c.width, c.height)
    if (this.mode === 'ambient' && this.parts.length < 70 && Math.random() < .4) this.spawnAmbient()
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      p.x += p.vx; p.y += p.vy
      if (p.type === 'confetti') {
        p.vy += 0.18; p.vx *= 0.99; p.rot += p.vr
        if (p.y > c.height + 30) p.life = 0
      }
      if (p.type === 'heart' && p.y < -30) p.life = 0
      if (p.type === 'ambient' && p.y < -20) p.life = 0
      p.life -= p.decay
      if (p.life <= 0) { this.parts.splice(i, 1); continue }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
      ctx.fillStyle = p.c
      if (p.type === 'heart') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.font = `${p.s}px sans-serif`
        ctx.fillText('♥', 0, 0)
        ctx.restore()
      } else if (p.type === 'confetti') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    requestAnimationFrame(this.loop)
  }
}

// Flash putih full-screen sebentar
export function flashWhite(ms = 350) {
  const d = document.createElement('div')
  d.className = 'fx-flash'
  document.body.appendChild(d)
  setTimeout(() => d.remove(), ms)
}

// Efek "scramble" teks glitch → berangsur jadi teks final
const CHARS = '!<>-_\\/[]{}—=+*^?#01ABCDEF'
export function scramble(el, finalText, duration = 1200) {
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const settled = Math.floor(t * finalText.length)
    let out = finalText.slice(0, settled)
    for (let i = settled; i < finalText.length; i++) {
      out += CHARS[(Math.random() * CHARS.length) | 0]
    }
    el.textContent = out
    if (t < 1) requestAnimationFrame(tick)
    else el.textContent = finalText
  }
  requestAnimationFrame(tick)
}
