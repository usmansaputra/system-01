import { adminApi } from '../shared/store.js'
import { esc, errMsg } from '../shared/utils.js'

// ─────────────────────────────────────────────────────────────
// Helper UI admin
// ─────────────────────────────────────────────────────────────
export function toast(msg, type = '') {
  let root = document.getElementById('toast-root')
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root) }
  const t = document.createElement('div')
  t.className = 'toast ' + type
  t.textContent = msg
  root.appendChild(t)
  setTimeout(() => t.remove(), type === 'err' ? 5200 : 3200)
  return t
}

export function askConfirm(title, text, danger = true) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root')
    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <h3>${esc(title)}</h3>
          <p>${esc(text)}</p>
          <div class="m-actions">
            <button class="btn btn-ghost" data-a="no">Batal</button>
            <button class="btn ${danger ? 'btn-danger' : ''}" data-a="yes">Ya, lanjut</button>
          </div>
        </div>
      </div>`
    root.querySelector('[data-a="no"]').onclick = () => { root.innerHTML = ''; resolve(false) }
    root.querySelector('[data-a="yes"]').onclick = () => { root.innerHTML = ''; resolve(true) }
    root.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) { root.innerHTML = ''; resolve(false) }
    })
  })
}

const input = (label, id, val, { type = 'text', hint = '', ph = '' } = {}) => `
  <div class="field"><label>${label}</label>
    <input id="${id}" type="${type}" value="${esc(val ?? '')}" ${ph ? `placeholder="${esc(ph)}"` : ''}>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`

const textarea = (label, id, val, hint = '') => `
  <div class="field"><label>${label}</label>
    <textarea id="${id}">${esc(val ?? '')}</textarea>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`

// ─────────────────────────────────────────────────────────────
export const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'gallery', label: 'Memory Gallery', icon: '▣' },
  { id: 'builder', label: 'Video Builder', icon: '▤' },
  { id: 'music', label: 'Music Settings', icon: '♪' },
  { id: 'letter', label: 'Birthday Letter', icon: '✉' },
  { id: 'appearance', label: 'Appearance', icon: '◐' },
  { id: 'preview', label: 'Preview', icon: '▷' },
  { id: 'publish', label: 'Publish', icon: '⏏' }
]

// ─────────────────────────────────────────────────────────────
export const PANELS = {
  // ── DASHBOARD ──
  async dashboard(root) {
    const [memCount, versions] = await Promise.all([
      adminApi.count('memories'),
      adminApi.listVersions()
    ])
    const [music, letter, site] = await Promise.all([
      adminApi.getOne('music_settings'),
      adminApi.getOne('birthday_letter'),
      adminApi.getOne('site_settings')
    ])
    const active = versions.find((v) => v.is_active)
    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><div class="v">${memCount}</div><div class="k">Foto / Video kenangan</div></div>
        <div class="stat"><div class="v ${music.music_url ? 'ok' : ''}">${music.music_url ? '✓' : '—'}</div><div class="k">Musik laporan final</div></div>
        <div class="stat"><div class="v ${letter.body?.length > 10 ? 'ok' : ''}">${letter.body?.length > 10 ? '✓' : '—'}</div><div class="k">Surat ulang tahun</div></div>
        <div class="stat"><div class="v ${active ? 'ok' : ''}">${active ? 'v' + active.version : '—'}</div><div class="k">Versi live</div></div>
      </div>
      <div class="adm-card">
        <h3>Data personal</h3>
        <table class="tbl">
          <tr><td>Penerima</td><td class="right"><b>${esc(site.recipient_name || '— belum diisi —')}</b></td></tr>
          <tr><td>Tanggal ultah</td><td class="right mono">${esc(site.birthday_date || '— belum diisi —')}</td></tr>
          <tr><td>Kode akses tester</td><td class="right mono">${esc(site.access_code)}</td></tr>
          <tr><td>Pengirim</td><td class="right"><b>${esc(site.sender_name || '— belum diisi —')}</b></td></tr>
        </table>
        <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap">
          <a href="#/appearance" class="btn btn-sm">Edit Data Personal</a>
          <a href="#/gallery" class="btn btn-ghost btn-sm">Upload Kenangan</a>
          <a href="#/publish" class="btn btn-ghost btn-sm">Publish</a>
        </div>
      </div>
      ${active ? `<div class="adm-card"><h3>Status publikasi</h3>
        <p class="muted" style="font-size:13.5px">Versi <b>v${active.version}</b> live sejak
        ${new Date(active.published_at).toLocaleString('id-ID')}.
        Situs publik membaca snapshot versi ini — editan draft aman & tidak bocor.</p></div>`
      : `<div class="adm-card"><h3>Status publikasi</h3>
        <p class="muted" style="font-size:13.5px">Belum pernah publish. Situs publik masih kosong —
        isi konten dulu, lalu buka menu <b>Publish</b>.</p></div>`}`
  },

  // ── MEMORY GALLERY ──
  async gallery(root) {
    const items = await adminApi.listMemories()
    root.innerHTML = `
      <div class="adm-card">
        <h3>Upload foto / video</h3>
        <p class="muted" style="font-size:13px; margin-bottom:14px">Foto otomatis dikompres di browser (maks 1600px, JPEG).
        Video dipas apa adanya (disarankan ≤ 50MB). Semua file tersimpan di Supabase Storage dengan nama acak.</p>
        <button id="up-btn" class="btn">＋ Upload Media</button>
        <input id="up-input" type="file" accept="image/*,video/*" multiple hidden>
        <div id="up-progress" class="muted" style="font-size:13px; margin-top:10px"></div>
      </div>
      <div class="gal-grid" id="gal-grid">
        ${items.length ? items.map((m) => `
          <div class="gal-item" data-id="${m.id}">
            <div class="gal-thumb">
              ${m.media_type === 'video'
                ? `<video src="${esc(m.media_url)}" muted preload="metadata"></video>`
                : `<img src="${esc(m.media_url)}" loading="lazy" alt="">`}
              <span class="tag">${m.media_type === 'video' ? 'VIDEO' : 'FOTO'}</span>
            </div>
            <div class="gal-meta"><b>${esc(m.title || 'Tanpa judul')}</b><span>${esc(m.caption || '')}</span></div>
            <div class="gal-actions">
              <button class="btn btn-ghost btn-sm" data-edit="${m.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-del="${m.id}" data-url="${esc(m.media_url)}">Hapus</button>
            </div>
          </div>`).join('')
        : '<p class="muted">Belum ada media. Upload dulu ya.</p>'}
      </div>`

    $('#up-btn', root).onclick = () => $('#up-input', root).click()
    $('#up-input', root).onchange = async (e) => {
      const files = [...e.target.files]
      if (!files.length) return
      const prog = $('#up-progress', root)
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        prog.textContent = `Mengunggah ${i + 1}/${files.length}: ${f.name}…`
        try {
          const isImage = f.type.startsWith('image/')
          const url = await adminApi.uploadFile(f, { isImage })
          await adminApi.addMemory({
            title: f.name.replace(/\.[^.]+$/, ''),
            caption: '',
            media_type: isImage ? 'image' : 'video',
            media_url: url
          })
        } catch (err) { toast('Gagal upload ' + f.name + ': ' + errMsg(err), 'err') }
      }
      prog.textContent = ''
      toast('Upload selesai ✓', 'ok')
      renderPanel('gallery')
    }

    $$('[data-edit]', root).forEach((b) => {
      b.onclick = async () => {
        const m = items.find((x) => x.id === b.dataset.edit)
        const rootM = document.getElementById('modal-root')
        rootM.innerHTML = `
          <div class="modal-overlay"><div class="modal">
            <h3>Edit media</h3>
            <div class="field"><label>Judul</label><input id="m-title" value="${esc(m.title)}"></div>
            <div class="field"><label>Caption</label><textarea id="m-caption">${esc(m.caption)}</textarea></div>
            <div class="m-actions">
              <button class="btn btn-ghost" data-x>Batal</button>
              <button class="btn" data-s>Simpan</button>
            </div>
          </div></div>`
        rootM.querySelector('[data-x]').onclick = () => (rootM.innerHTML = '')
        rootM.querySelector('[data-s]').onclick = async () => {
          await adminApi.updateMemory(m.id, {
            title: $('#m-title', rootM).value.trim(),
            caption: $('#m-caption', rootM).value.trim()
          })
          rootM.innerHTML = ''
          toast('Tersimpan ✓', 'ok')
          renderPanel('gallery')
        }
      }
    })

    $$('[data-del]', root).forEach((b) => {
      b.onclick = async () => {
        if (!await askConfirm('Hapus media ini?', 'Media akan dihapus dari daftar dan storage. Tidak bisa dibatalkan.')) return
        await adminApi.deleteMemory(b.dataset.del, b.dataset.url)
        toast('Terhapus ✓', 'ok')
        renderPanel('gallery')
      }
    })
  },

  // ── VIDEO BUILDER ──
  async builder(root) {
    const items = await adminApi.listMemories()
    root.innerHTML = `
      <div class="adm-card">
        <h3>Urutan slideshow</h3>
        <p class="muted" style="font-size:13px">Tarik ikon ⋮⋮ untuk mengubah urutan. Durasi per foto diatur di kolom detik;
        video diputar penuh sampai habis lalu lanjut otomatis. Perubahan tersimpan otomatis.</p>
        <div id="b-list" style="margin-top:16px">
          ${items.length ? items.map((m, i) => `
            <div class="b-row" data-id="${m.id}">
              <span class="b-handle">⋮⋮</span>
              <span class="b-num">${i + 1}</span>
              ${m.media_type === 'video'
                ? `<video class="b-thumb" src="${esc(m.media_url)}" muted preload="metadata"></video>`
                : `<img class="b-thumb" src="${esc(m.media_url)}" loading="lazy" alt="">`}
              <div class="b-fields">
                <input data-f="title" value="${esc(m.title)}" placeholder="Judul">
                <input data-f="caption" value="${esc(m.caption)}" placeholder="Caption">
                <input data-f="duration_sec" type="number" min="2" max="60" value="${m.duration_sec || 5}" ${m.media_type === 'video' ? 'disabled title="Video ikuti durasi video"' : ''}>
                <select data-f="transition">
                  ${['fade', 'slide', 'zoom'].map((t) => `<option value="${t}" ${m.transition === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
              <button class="btn btn-danger btn-sm" data-del="${m.id}" data-url="${esc(m.media_url)}">✕</button>
            </div>`).join('')
          : '<p class="muted">Belum ada media — upload dulu di Memory Gallery.</p>'}
        </div>
        <div class="b-est">
          <span class="muted" style="font-size:13.5px">Estimasi durasi: <b id="b-total">…</b></span>
          <a href="/?preview=draft&jump=memory" target="_blank" class="btn btn-ghost btn-sm">▷ Preview Slideshow</a>
        </div>
      </div>`

    const calcTotal = () => {
      const imgs = items.filter((m) => m.media_type === 'image')
      const total = imgs.reduce((a, m) => a + (m.duration_sec || 5), 0)
      const vids = items.length - imgs.length
      $('#b-total', root).textContent = `≈ ${total} detik${vids ? ` + ${vids} video` : ''}`
    }
    calcTotal()

    // Drag & drop urutan
    if (items.length > 1) {
      const { default: Sortable } = await import('sortablejs')
      Sortable.create($('#b-list', root), {
        handle: '.b-handle', animation: 180, ghostClass: 'dragging',
        onEnd: async () => {
          const ids = $$('#b-list .b-row', root).map((el) => el.dataset.id)
          $$('#b-list .b-num', root).forEach((el, i) => (el.textContent = i + 1))
          await adminApi.reorderMemories(ids)
          toast('Urutan tersimpan ✓', 'ok')
        }
      })
    }

    // Simpan otomatis saat field berubah
    $$('#b-list .b-row', root).forEach((row) => {
      const id = row.dataset.id
      const m = items.find((x) => x.id === id)
      $$('[data-f]', row).forEach((inp) => {
        inp.onchange = async () => {
          const f = inp.dataset.f
          const patch = f === 'duration_sec' ? { [f]: Math.max(2, Math.min(60, Number(inp.value) || 5)) } : { [f]: inp.value.trim() }
          if (f === 'duration_sec') inp.value = patch[f]
          m[f] = patch[f]
          await adminApi.updateMemory(id, patch)
          calcTotal()
          toast('Tersimpan ✓', 'ok')
        }
      })
      const del = row.querySelector('[data-del]')
      del.onclick = async () => {
        if (!await askConfirm('Hapus media ini?', 'Media akan dihapus dari slideshow.')) return
        await adminApi.deleteMemory(del.dataset.del, del.dataset.url)
        renderPanel('builder')
      }
    })
  },

  // ── MUSIC SETTINGS ──
  async music(root) {
    const m = await adminApi.getOne('music_settings')
    root.innerHTML = `
      <div class="adm-card">
        <h3>Musik latar (mulai otomatis setelah glitch di Laporan Final)</h3>
        <div class="music-now">
          <span class="ico">♪</span>
          <div style="flex:1">
            <b>${esc(m.title || 'Belum ada musik')}</b>
            <div class="muted" style="font-size:12px">${esc(m.music_url ? 'File terpasang ✓' : 'Belum upload file musik')}</div>
          </div>
          <button id="m-play" class="btn btn-ghost btn-sm" ${m.music_url ? '' : 'disabled'}>▷ Dengarkan</button>
        </div>
        <button id="m-up" class="btn">＋ Upload MP3 / Audio</button>
        <input id="m-file" type="file" accept="audio/*" hidden>
        <div class="hint" style="font-size:12px; color:var(--ad-muted); margin-top:8px">
          Upload ke Supabase Storage, atau tempel URL langsung di bawah.</div>
        ${input('URL Musik (opsional, kalau tidak upload)', 'm-url', m.music_url, { ph: 'https://…/lagu.mp3' })}
        <div class="split" style="margin-top:8px">
          ${input('Judul lagu', 'm-title', m.title)}
          ${input('Artis', 'm-artist', m.artist)}
        </div>
        ${input('Volume (0–1)', 'm-vol', m.volume, { type: 'number', hint: '0.2 pelan · 0.8 standar · 1 keras' })}
        <button id="m-save" class="btn" style="margin-top:12px">Simpan Music Settings</button>
      </div>`

    let previewAudio = null
    $('#m-play', root).onclick = () => {
      if (previewAudio && !previewAudio.paused) { previewAudio.pause(); return }
      previewAudio = new Audio(m.music_url)
      previewAudio.volume = 0.8
      previewAudio.play().catch(() => toast('Tidak bisa memutar audio', 'err'))
    }
    $('#m-up', root).onclick = () => $('#m-file', root).click()
    $('#m-file', root).onchange = async (e) => {
      const f = e.target.files?.[0]
      if (!f) return
      const t = toast('Mengunggah musik…')
      try {
        const url = await adminApi.uploadFile(f, { isImage: false })
        $('#m-url', root).value = url
        t.textContent = 'Musik terupload ✓ — klik Simpan'
        t.className = 'toast ok'
        setTimeout(() => t.remove(), 3200)
      } catch (err) { toast('Gagal: ' + errMsg(err), 'err') }
    }
    $('#m-save', root).onclick = async () => {
      try {
        await adminApi.saveOne('music_settings', {
          music_url: $('#m-url', root).value.trim(),
          title: $('#m-title', root).value.trim(),
          artist: $('#m-artist', root).value.trim(),
          volume: Math.min(1, Math.max(0, Number($('#m-vol', root).value) || 0.8))
        })
        toast('Music settings tersimpan ✓', 'ok')
        renderPanel('music')
      } catch (err) { toast('Gagal: ' + errMsg(err), 'err') }
    }
  },

  // ── BIRTHDAY LETTER ──
  async letter(root) {
    const L = await adminApi.getOne('birthday_letter')
    root.innerHTML = `
      <div class="split">
        <div class="adm-card">
          <h3>Isi surat</h3>
          ${input('Judul surat', 'lt-title', L.title)}
          ${textarea('Isi surat (pisahkan paragraf dengan baris kosong)', 'lt-body', L.body)}
          ${input('Tanda tangan (nama pengirim)', 'lt-sign', L.signature)}
          <button id="lt-save" class="btn">Simpan Surat</button>
        </div>
        <div>
          <h3 style="font-size:15px; margin-bottom:10px">Live preview</h3>
          <div class="lt-preview" id="lt-prev">
            <h2>${esc(L.title)}</h2>
            ${String(L.body || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}
            <div class="sig">With love,<br><b>${esc(L.signature)}</b> ♡</div>
          </div>
        </div>
      </div>`

    const refresh = () => {
      const title = $('#lt-title', root).value
      const body = $('#lt-body', root).value
      const sign = $('#lt-sign', root).value
      $('#lt-prev', root).innerHTML =
        `<h2>${esc(title)}</h2>` +
        String(body).split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') +
        `<div class="sig">With love,<br><b>${esc(sign)}</b> ♡</div>`
    }
    $$('input,textarea', root).forEach((el) => (el.oninput = refresh))
    $('#lt-save', root).onclick = async () => {
      try {
        await adminApi.saveOne('birthday_letter', {
          title: $('#lt-title', root).value.trim(),
          body: $('#lt-body', root).value,
          signature: $('#lt-sign', root).value.trim()
        })
        toast('Surat tersimpan ✓', 'ok')
      } catch (err) { toast('Gagal: ' + errMsg(err), 'err') }
    }
  },

  // ── APPEARANCE & DATA PERSONAL ──
  async appearance(root) {
    const s = await adminApi.getOne('site_settings')
    const a = await adminApi.getOne('appearance_settings')
    root.innerHTML = `
      <div class="adm-card">
        <h3>Identitas sistem (fiksi yang dilihat penerima)</h3>
        <div class="split">
          ${input('Nama sistem', 'ap-sys', s.system_name)}
          ${input('Versi', 'ap-ver', s.system_version)}
        </div>
        <div class="split">
          ${input('Tagline', 'ap-tag', s.tagline)}
          ${input('Nama sekolah', 'ap-school', s.school_name)}
        </div>
        <div class="split">
          ${input('Nama tes 1', 'ap-t1', s.test1_name)}
          ${input('Nama tes 2', 'ap-t2', s.test2_name)}
        </div>
        <div class="split">
          ${input('Nama tes 3', 'ap-t3', s.test3_name)}
          ${input('Kode akses tester', 'ap-code', s.access_code, { hint: 'Kode yang diketik penerima di Access Gate (bagikan ke dia sebelum hari-H)' })}
        </div>
        ${textarea('Teks anomali di Laporan Final', 'ap-anom', s.anomaly_text, 'Gunakan {date} untuk tanggal ultah otomatis')}
        ${textarea('Subjudul layar reveal', 'ap-reveal', s.reveal_subtitle)}
      </div>
      <div class="adm-card">
        <h3>Data personal</h3>
        <div class="split">
          ${input('Nama penerima', 'ap-rec', s.recipient_name, { hint: 'Harus diketik sama persis (tidak case-sensitive)' })}
          ${input('Nama pengirim', 'ap-sender', s.sender_name)}
        </div>
        ${input('Tanggal ulang tahun', 'ap-bday', s.birthday_date, { type: 'date', hint: 'Dipakai di anomali & layar reveal' })}
      </div>
      <div class="adm-card">
        <h3>Warna</h3>
        <div class="split">
          ${input('Aksen sebelum reveal', 'ap-c1', a.accent_before, { type: 'color' })}
          ${input('Aksen sesudah reveal', 'ap-c2', a.accent_after, { type: 'color' })}
        </div>
        ${input('Background sesudah reveal', 'ap-c3', a.bg_after, { type: 'color' })}
      </div>
      <button id="ap-save" class="btn">Simpan Semua</button>`

    $('#ap-save', root).onclick = async () => {
      const g = (id) => $(id, root).value.trim()
      try {
        await adminApi.saveOne('site_settings', {
          system_name: g('#ap-sys'), system_version: g('#ap-ver'),
          tagline: g('#ap-tag'), school_name: g('#ap-school'),
          test1_name: g('#ap-t1'), test2_name: g('#ap-t2'), test3_name: g('#ap-t3'),
          access_code: g('#ap-code'),
          anomaly_text: $('#ap-anom', root).value,
          reveal_subtitle: $('#ap-reveal', root).value,
          recipient_name: g('#ap-rec'), sender_name: g('#ap-sender'),
          birthday_date: g('#ap-bday')
        })
        await adminApi.saveOne('appearance_settings', {
          accent_before: g('#ap-c1'), accent_after: g('#ap-c2'), bg_after: g('#ap-c3')
        })
        toast('Tersimpan ✓ — jangan lupa Publish biar live', 'ok')
      } catch (err) { toast('Gagal: ' + errMsg(err), 'err') }
    }
  },

  // ── PREVIEW ──
  async preview(root) {
    const jumps = [
      ['gate', 'Access Gate'], ['dashboard', 'Dashboard'], ['tests', 'Modul Uji'],
      ['report', 'Laporan Final + musik'], ['reveal', 'Cinematic Reveal'],
      ['memory', 'Slideshow Kenangan'], ['surprise', 'One Last Surprise'],
      ['letter', 'Surat Ultah'], ['end', 'Final Ending']
    ]
    root.innerHTML = `
      <div class="adm-card">
        <h3>Preview DRAFT (belum publish)</h3>
        <p class="muted" style="font-size:13.5px; margin-bottom:14px">Buka situs publik dengan konten draft terbaru.
        Lu harus tetap login admin di tab ini supaya preview draft boleh dibaca.</p>
        <div style="display:flex; flex-wrap:wrap; gap:9px">
          ${jumps.map(([j, l]) => `<a class="btn btn-ghost btn-sm" target="_blank" href="/?preview=draft&jump=${j}">▷ ${l}</a>`).join('')}
        </div>
      </div>
      <div class="adm-card">
        <h3>Situs LIVE (versi publish aktif)</h3>
        <a class="btn btn-sm" target="_blank" href="/">Buka Situs Live ↗</a>
      </div>`
  },

  // ── PUBLISH ──
  async publish(root) {
    const versions = await adminApi.listVersions()
    const [memCount, site] = await Promise.all([
      adminApi.count('memories'),
      adminApi.getOne('site_settings')
    ])
    root.innerHTML = `
      <div class="adm-card">
        <h3>Publish sekarang</h3>
        <p class="muted" style="font-size:13.5px; margin-bottom:14px">
          Publish = snapshot semua editan (identitas sistem, ${memCount} media, musik, surat, warna)
          jadi versi baru yang langsung dibaca situs publik. Editan berikutnya tetap aman di draft.</p>
        <div class="ok-box" style="margin:0 0 16px">
          Penerima: <b>${esc(site.recipient_name || '—')}</b> ·
          Kode akses: <b>${esc(site.access_code)}</b> ·
          Media: <b>${memCount}</b>
        </div>
        <button id="pb-go" class="btn">⏏ PUBLISH SEKARANG</button>
      </div>
      <div class="adm-card">
        <h3>Riwayat versi & rollback</h3>
        ${versions.length ? `
          <table class="tbl">
            <tr><th>Versi</th><th>Waktu publish</th><th>Status</th><th class="right">Aksi</th></tr>
            ${versions.map((v) => `
              <tr>
                <td class="mono"><b>v${v.version}</b></td>
                <td>${new Date(v.published_at).toLocaleString('id-ID')}</td>
                <td><span class="badge ${v.is_active ? 'on' : 'off'}">${v.is_active ? 'LIVE' : 'ARSIP'}</span></td>
                <td class="right">
                  ${v.is_active ? '' : `<button class="btn btn-ghost btn-sm" data-rb="${v.id}">Aktifkan</button>`}
                </td>
              </tr>`).join('')}
          </table>`
        : '<p class="muted">Belum ada versi yang pernah dipublish.</p>'}
      </div>`

    $('#pb-go', root).onclick = async () => {
      if (!await askConfirm('Publish sekarang?', 'Snapshot konten terbaru akan langsung live ke situs publik.', false)) return
      const b = $('#pb-go', root); b.disabled = true; b.textContent = 'Mempublish…'
      try {
        const v = await adminApi.publish()
        toast('Publish v' + v.version + ' sukses ✓ Situs publik sudah update.', 'ok')
        renderPanel('publish')
      } catch (err) { toast('Gagal publish: ' + errMsg(err), 'err'); b.disabled = false; b.textContent = '⏏ PUBLISH SEKARANG' }
    }
    $$('[data-rb]', root).forEach((b) => {
      b.onclick = async () => {
        if (!await askConfirm('Rollback ke versi ini?', 'Versi ini akan langsung jadi versi live di situs publik.', false)) return
        try {
          await adminApi.rollback(b.dataset.rb)
          toast('Rollback sukses ✓', 'ok')
          renderPanel('publish')
        } catch (err) { toast('Gagal: ' + errMsg(err), 'err') }
      }
    })
  }
}

// renderPanel dipanggil dari app.js; simpan referensi panel aktif
let activeRender = null
export function setActiveRenderer(fn) { activeRender = fn }
export function renderPanel(id) {
  if (activeRender) activeRender(id)
}

// helper kecil di dalam panels
function $(sel, el = document) { return el.querySelector(sel) }
function $$(sel, el = document) { return [...el.querySelectorAll(sel)] }
