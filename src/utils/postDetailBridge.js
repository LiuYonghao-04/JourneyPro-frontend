const PREVIEW_PREFIX = 'journeypro:post-preview:'

const safeNumber = (value) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

const normalizePreview = (post) => {
  if (!post || typeof post !== 'object') return null
  const id = safeNumber(post.id)
  if (!id) return null
  const user = post.user && typeof post.user === 'object'
    ? {
        id: safeNumber(post.user.id),
        nickname: String(post.user.nickname || '').trim() || 'Traveler',
        avatar_url: String(post.user.avatar_url || '').trim() || null,
      }
    : null
  const poi = post.poi && typeof post.poi === 'object'
    ? {
        id: safeNumber(post.poi.id),
        name: String(post.poi.name || '').trim() || null,
        category: String(post.poi.category || '').trim() || null,
        lat: safeNumber(post.poi.lat),
        lng: safeNumber(post.poi.lng),
        image_url: String(post.poi.image_url || '').trim() || null,
        address: String(post.poi.address || '').trim() || null,
        city: String(post.poi.city || '').trim() || null,
      }
    : null
  return {
    id,
    poi_id: safeNumber(post.poi_id) || poi?.id || null,
    title: String(post.title || '').trim(),
    content: String(post.content || '').trim(),
    cover_image: String(post.cover_image || '').trim() || null,
    images: Array.isArray(post.images) ? post.images.filter(Boolean).slice(0, 6) : [],
    like_count: safeNumber(post.like_count) || 0,
    favorite_count: safeNumber(post.favorite_count) || 0,
    view_count: safeNumber(post.view_count) || 0,
    created_at: post.created_at || null,
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean).slice(0, 6) : [],
    user,
    poi,
    trip_meta: post.trip_meta && typeof post.trip_meta === 'object' ? post.trip_meta : null,
    _preview: true,
    _liked: !!post._liked,
    _fav: !!post._fav,
  }
}

export const buildPostPreviewKey = (postId) => `${PREVIEW_PREFIX}${safeNumber(postId) || 0}`

export const seedPostDetailPreview = (post) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  const normalized = normalizePreview(post)
  if (!normalized) return
  try {
    window.sessionStorage.setItem(buildPostPreviewKey(normalized.id), JSON.stringify(normalized))
  } catch {
    // ignore storage failures
  }
}

export const readPostDetailPreview = (postId) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  const id = safeNumber(postId)
  if (!id) return null
  try {
    const raw = window.sessionStorage.getItem(buildPostPreviewKey(id))
    if (!raw) return null
    return normalizePreview(JSON.parse(raw))
  } catch {
    return null
  }
}
