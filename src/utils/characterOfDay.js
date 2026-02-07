export default function getCharacterOfDay(characters = []) {
  if (!Array.isArray(characters) || characters.length === 0) return null

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const dateKey = `${yyyy}-${mm}-${dd}`

  let hash = 0
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  }

  const index = hash % characters.length
  return characters[index] || null
}
