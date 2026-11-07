import { supabase } from './supabase.js'
import { IS_DEMO } from './env.js'
import { DEMO_DATA } from './demo-data.js'
import { uid } from './utils.js'

export const isDemo = IS_DEMO

const clone = (o) => JSON.parse(JSON.stringify(o))

// ------------------------------------------------------------
// PUBLIC (pengunjung)
// ------------------------------------------------------------
export async function canPreviewDraft() {
  if (!supabase) return false
  const { data } = await supabase.auth.getSession()
  return !!(data?.session)
}

// loadExperience: sumber data publik.
//  - demo            → konten contoh
//  - previewDraft    → admin lagi preview editan yang belum publish
//  - normal          → snapshot published_versions yang aktif
export async function loadExperience({ previewDraft = false } = {}) {
  if (IS_DEMO) return clone(DEMO_DATA)
  if (previewDraft) return assembleDraft()
  const { data, error } = await supabase
    .from('published_versions')
    .select('data')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.data || null
}

// Gabungkan semua tabel draft jadi satu objek (bentuknya = snapshot publish)
export async function assembleDraft() {
  const q = (t) => supabase.from(t).select('*')
  const [site, memories, music, letter, appearance] = await Promise.all([
    q('site_settings'), q('memories'), q('music_settings'), q('birthday_letter'), q('appearance_settings')
  ])
  for (const r of [site, memories, music, letter, appearance]) if (r.error) throw r.error
  return {
    site: site.data?.[0] || {},
    memories: (memories.data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    music: music.data?.[0] || {},
    letter: letter.data?.[0] || {},
    appearance: appearance.data?.[0] || {}
  }
}

// ------------------------------------------------------------
// BALASAN PENERIMA (tabel replies — anon boleh insert, admin baca)
// ------------------------------------------------------------
export async function sendReply(senderName, body) {
  if (!supabase) return { demo: true } // mode demo → simulasi sukses
  const { error } = await supabase.from('replies').insert({ sender_name: senderName, body })
  if (error) throw error
  return { demo: false }
}

// ------------------------------------------------------------
// ADMIN (CMS)
// ------------------------------------------------------------
export const adminApi = {
  async getOne(table) {
    const { data, error } = await supabase.from(table).select('*').eq('id', 1).single()
    if (error) throw error
    return data
  },

  async saveOne(table, patch) {
    const { error } = await supabase.from(table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) throw error
  },

  async listMemories() {
    const { data, error } = await supabase.from('memories').select('*').order('sort_order')
    if (error) throw error
    return data
  },

  async addMemory(row) {
    const { data: mx } = await supabase.from('memories')
      .select('sort_order').order('sort_order', { ascending: false }).limit(1)
    const next = ((mx?.[0]?.sort_order) || 0) + 1
    const { data, error } = await supabase.from('memories')
      .insert({ ...row, sort_order: next }).select().single()
    if (error) throw error
    return data
  },

  async updateMemory(id, patch) {
    const { error } = await supabase.from('memories').update(patch).eq('id', id)
    if (error) throw error
  },

  async deleteMemory(id, mediaUrl) {
    const { error } = await supabase.from('memories').delete().eq('id', id)
    if (error) throw error
    if (mediaUrl && mediaUrl.includes('/media/')) {
      try {
        const path = decodeURIComponent(mediaUrl.split('/media/')[1])
        if (path) await supabase.storage.from('media').remove([path])
      } catch { /* biarkan; row sudah terhapus */ }
    }
  },

  async reorderMemories(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('memories').update({ sort_order: i + 1 }).eq('id', orderedIds[i])
    }
  },

  async uploadFile(file, { isImage = true } = {}) {
    let blob = file
    if (isImage) {
      const { compressImage } = await import('./utils.js')
      blob = await compressImage(file)
    }
    const ext = (blob.name || file.name).split('.').pop().toLowerCase() || 'bin'
    const path = `m/${uid()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, blob, {
      contentType: blob.type || file.type, upsert: false
    })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  },

  // PUBLISH: snapshot semua draft → published_versions aktif baru
  async publish() {
    const data = await assembleDraft()
    const { data: last } = await supabase.from('published_versions')
      .select('version').order('version', { ascending: false }).limit(1)
    const version = ((last?.[0]?.version) || 0) + 1
    const { data: ins, error } = await supabase.from('published_versions')
      .insert({ version, data, is_active: true }).select().single()
    if (error) throw error
    await supabase.from('published_versions')
      .update({ is_active: false }).neq('id', ins.id)
    return ins
  },

  async listVersions() {
    const { data, error } = await supabase.from('published_versions')
      .select('id, version, is_active, published_at')
      .order('version', { ascending: false }).limit(20)
    if (error) throw error
    return data
  },

  async rollback(id) {
    await supabase.from('published_versions').update({ is_active: false }).neq('id', id)
    await supabase.from('published_versions').update({ is_active: true }).eq('id', id)
  },

  async count(table) {
    const { count, error } = await supabase.from(table)
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  },

  async listReplies() {
    const { data, error } = await supabase.from('replies')
      .select('*').order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    return data
  },

  async deleteReply(id) {
    const { error } = await supabase.from('replies').delete().eq('id', id)
    if (error) throw error
  }
}
