const CROP_KEY = 'jp_crop'

const clamp01 = (n) => {
  const x = Number(n)
  if (Number.isNaN(x)) return 0
  return Math.min(1, Math.max(0, x))
}

const round6 = (n) => Math.round(n * 1e6) / 1e6

export const parseUrlWithCrop = (rawUrl) => {
  const raw = String(rawUrl || '').trim()
  if (!raw) return { baseUrl: '', crop: null }

  const hashIndex = raw.indexOf('#')
  if (hashIndex === -1) return { baseUrl: raw, crop: null }

  const baseUrl = raw.slice(0, hashIndex)
  const hash = raw.slice(hashIndex + 1)
  const params = new URLSearchParams(hash)
  const val = params.get(CROP_KEY)
  if (!val) return { baseUrl, crop: null }

  const parts = val.split(',').map((s) => s.trim())
  if (parts.length !== 4) return { baseUrl, crop: null }

  const [x, y, w, h] = parts.map((p) => clamp01(p))
  if (w <= 0 || h <= 0) return { baseUrl, crop: null }

  return {
    baseUrl,
    crop: { x, y, w, h },
  }
}

export const buildUrlWithCrop = (rawUrl, crop) => {
  const raw = String(rawUrl || '').trim()
  if (!raw) return ''

  const parsed = parseUrlWithCrop(raw)
  const baseUrl = parsed.baseUrl || raw.split('#')[0] || raw

  const existingHash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : ''
  const params = new URLSearchParams(existingHash)
  params.delete(CROP_KEY)

  if (crop && typeof crop === 'object') {
    const x = round6(clamp01(crop.x))
    const y = round6(clamp01(crop.y))
    const w = round6(Math.max(0.000001, clamp01(crop.w)))
    const h = round6(Math.max(0.000001, clamp01(crop.h)))
    params.set(CROP_KEY, `${x},${y},${w},${h}`)
  }

  const hash = params.toString()
  return hash ? `${baseUrl}#${hash}` : baseUrl
}

