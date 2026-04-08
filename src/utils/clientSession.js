const STORAGE_KEY = 'jp_client_session_key'

const generateSessionKey = () => {
  const random = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `jp_${time}_${random}`
}

export const getClientSessionKey = () => {
  try {
    const existing = String(localStorage.getItem(STORAGE_KEY) || '').trim()
    if (existing) return existing
    const created = generateSessionKey()
    localStorage.setItem(STORAGE_KEY, created)
    return created
  } catch {
    return 'jp_fallback_session'
  }
}

