export const readStoredState = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export const writeStoredState = (storageKey, value) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Ignore storage errors (private mode, quota, etc).
  }
}

