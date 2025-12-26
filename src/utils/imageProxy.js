const UPLOAD_HOST = 'http://localhost:3001'
const PROXY_ENDPOINT = `${UPLOAD_HOST}/api/upload/proxy`

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

