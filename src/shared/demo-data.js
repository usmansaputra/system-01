// Konten contoh saat config Supabase belum diisi (DEMO MODE).
// Semua bisa diganti asli lewat /admin setelah Supabase terhubung.

const svgPh = (c1, c2, emoji, label) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">` +
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
  `</linearGradient></defs>` +
  `<rect width="1200" height="800" fill="url(#g)"/>` +
  `<text x="600" y="400" font-size="150" text-anchor="middle">${emoji}</text>` +
  `<text x="600" y="510" font-size="40" text-anchor="middle" fill="rgba(255,255,255,.9)" font-family="sans-serif">${label}</text>` +
  `</svg>`)

export const DEMO_DATA = {
  site: {
    system_name: 'SIAP',
    system_version: 'v2.4.1-pilot',
    tagline: 'Sistem Informasi Absensi Pelajar',
    school_name: 'SMP Nusantara Cendekia',
    recipient_name: 'Salsa',
    access_code: 'SPECIAL-001',
    birthday_date: '',
    sender_name: 'Raka',
    test1_name: 'Simulasi Absen Masuk',
    test2_name: 'Verifikasi Wajah',
    test3_name: 'Uji Notifikasi',
    anomaly_text: 'Clock-in terakhir pada {date} pukul 07:15 tercatat TIDAK VALID oleh sistem. Status: PENDING MANUAL REVIEW.',
    reveal_subtitle: 'Sistem absensinya cuma dalih biar lu nggak curiga. Semua ini gua siapin khusus buat lu.',
    card_quote: 'Pilot #001 — favoritnya sistem, selamanya ♡',
    maintenance_at: '' // 'YYYY-MM-DDTHH:mm' → aktifin layar SERVER SIBUK sampai jam itu
  },
  memories: [
    { id: 'm1', media_type: 'image', media_url: svgPh('#ff9ec7', '#c084fc', '📸', 'Slide contoh 1 — ganti foto asli di /admin'), title: 'Kenangan Pertama', caption: 'Awal semua cerita. Ganti slide ini dengan foto asli lu ya :)', duration_sec: 5, transition: 'fade', sort_order: 1 },
    { id: 'm2', media_type: 'image', media_url: svgPh('#b48cf2', '#7dd3fc', '🎞️', 'Slide contoh 2 — bisa juga video'), title: 'Momen Kocak', caption: 'Bisa foto, bisa video. Urutan & durasinya diatur di Video Builder.', duration_sec: 5, transition: 'slide', sort_order: 2 },
    { id: 'm3', media_type: 'image', media_url: svgPh('#7dd3fc', '#ff9ec7', '💫', 'Slide contoh 3'), title: 'Petualangan', caption: 'Caption muncul satu-satu, animasi halus, auto jalan sendiri.', duration_sec: 5, transition: 'zoom', sort_order: 3 },
    { id: 'm4', media_type: 'image', media_url: svgPh('#fbbf24', '#ff9ec7', '🎂', 'Slide contoh 4 — slide terakhir'), title: 'Hari Ini', caption: 'Setelah slide terakhir, ada satu kejutan lagi…', duration_sec: 5, transition: 'fade', sort_order: 4 }
  ],
  music: {
    music_url: '',
    title: 'Lagu ulang tahun (contoh)',
    artist: '—',
    start_delay_sec: 4,
    volume: 0.8
  },
  letter: {
    title: 'Buat Kamu,',
    body: 'Selamat ulang tahun!\n\nBeberapa hari ini lu sempat dipusingin sama "sistem absensi baru" sekolah — isi form, foto selfie, notifikasi segala. Ternyata... sistem itu cuma dalih. Semua ini gua bikin khusus buat lu, dari jauh-jauh hari.\n\nTerima kasih udah selalu jadi bagian favorit gua di hari-hari biasa. Semoga di umur yang baru ini, semua hal baik absennya tepat waktu buat nyusul lu.\n\nNitip salam buat versi lu yang paling bahagia hari ini.',
    signature: 'Raka'
  },
  appearance: {
    accent_before: '#4f8cff',
    accent_after: '#ff8fb8',
    bg_after: '#f6eaff'
  }
}
