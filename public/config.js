// ============================================================
// CONFIG RUNTIME SYSTEM-01
// ============================================================
// Cara A (paling gampang, tanpa build ulang):
//   Isi url & anonKey di bawah, deploy. Berlaku juga untuk
//   drag-drop folder `dist` ke Netlify.
//
// Cara B (lebih rapi):
//   Biarkan file ini kosong, dan isi .env / Environment Variables
//   (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) di Netlify/Vercel.
//
// Ambil kredensial di: Supabase Dashboard → Project Settings → API
// ------------------------------------------------------------
window.SIAP_CONFIG = {
  url: '',
  anonKey: ''
}
