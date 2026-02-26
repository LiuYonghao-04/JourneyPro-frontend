const fallbackOrigin = 'http://localhost:3001'

const normalizeOrigin = (raw) => String(raw || '').trim().replace(/\/+$/, '')

const envOrigin = normalizeOrigin(import.meta?.env?.VITE_API_BASE)

export const API_ORIGIN = envOrigin || fallbackOrigin
export const API_BASE = `${API_ORIGIN}/api`

export const apiUrl = (path = '') => {
  const raw = String(path || '').trim()
  if (!raw) return API_ORIGIN
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`
  return `${API_ORIGIN}/${raw}`
}
