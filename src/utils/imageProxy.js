import { API_BASE, API_ORIGIN, API_UPLOAD_PROXY } from '../config/api'

const UPLOAD_HOST = API_ORIGIN || ''
const PROXY_ENDPOINT = API_UPLOAD_PROXY || `${API_BASE}/upload/proxy`

export const proxiedImageSrc = (rawUrl) => {
  const raw = String(rawUrl || '').trim()
  if (!raw) return ''
  if (raw.startsWith(PROXY_ENDPOINT)) return raw

  if (raw.startsWith('/uploads/')) return `${UPLOAD_HOST}${raw}`
  if (raw.startsWith(`${UPLOAD_HOST}/uploads/`)) return raw
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  const qs = new URLSearchParams({ url: raw }).toString()
  return `${PROXY_ENDPOINT}?${qs}`
}
