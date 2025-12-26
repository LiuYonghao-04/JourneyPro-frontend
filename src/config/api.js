const normalizeBase = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/\/+$/, '')
}

export const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE) || 'http://localhost:3001/api'
export const API_ORIGIN = API_BASE.replace(/\/api$/, '')
export const OSRM_BASE = normalizeBase(import.meta.env.VITE_OSRM_BASE) || '/osrm'

export const API_AUTH = `${API_BASE}/auth`
export const API_POSTS = `${API_BASE}/posts`
export const API_POST_TAGS = `${API_POSTS}/tags/list`
export const API_POI = `${API_BASE}/poi`
export const API_POI_SEARCH = `${API_POI}/search`
export const API_FOLLOW = `${API_BASE}/follow`
export const API_NOTIFICATIONS = `${API_BASE}/notifications`
export const API_CHAT = `${API_BASE}/chat`
export const API_ROUTE_RECOMMEND = `${API_BASE}/route/recommend`
export const API_RECO_SETTINGS = `${API_BASE}/recommendation/settings`
export const API_RECO_PROFILE = `${API_BASE}/recommendation/profile`
export const API_UPLOAD_PROXY = `${API_BASE}/upload/proxy`
