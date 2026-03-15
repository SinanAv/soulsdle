import { supabase } from '../services/supabase'

export const getStoragePublicUrlForExt = (bucket, name, ext) => {
  if (!bucket || !name) return ''
  const safeName = String(name).trim()
  const safeExt = String(ext || '').trim().replace(/^\./, '')
  if (!safeExt) return ''

  const filePath = `${safeName}.${safeExt}`
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  const rawUrl = data?.publicUrl || ''
  return rawUrl ? rawUrl.replace(/ /g, '%20') : ''
}

export default function getStoragePublicUrl(bucket, name) {
  return getStoragePublicUrlForExt(bucket, name, 'jpg')
}
