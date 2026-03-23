export default async function getDailyItem(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null

  const today = new Date()
  const yyyy = today.getUTCFullYear()
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(today.getUTCDate()).padStart(2, '0')
  const dateKey = `${yyyy}-${mm}-${dd}`

  const encoded = new TextEncoder().encode(dateKey)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(digest)

  let hash = 0
  for (let index = 0; index < 4; index += 1) {
    hash = (hash << 8) | bytes[index]
  }

  const selectedIndex = (hash >>> 0) % items.length
  return items[selectedIndex] || null
}
