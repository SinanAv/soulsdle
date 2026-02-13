export default async function getCharacterOfDay(characters = []) {
  if (!Array.isArray(characters) || characters.length === 0) return null

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const dateKey = `${yyyy}-${mm}-${dd}`

  const encoded = new TextEncoder().encode(dateKey)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(digest)

  let hash = 0
  for (let i = 0; i < 4; i += 1) {
    hash = (hash << 8) | bytes[i]
  }

  const index = (hash >>> 0) % characters.length
  return characters[index] || null
}
