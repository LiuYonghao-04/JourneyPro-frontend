
<template>
  <div v-if="poi" class="place-panel" :class="[theme, panelMode]" :style="panelStyle">
    <div class="panel-grabber" @pointerdown="onGrabberPointerDown">
      <span class="grabber-bar"></span>
    </div>

    <div class="panel-head" @dblclick="cyclePanelMode">
      <div class="title-wrap">
        <div class="title">{{ poi.name || 'Selected place' }}</div>
        <div class="subtitle">
          <span v-if="poi.category">{{ poi.category }}</span>
          <span v-if="poi.category && popularityText" class="dot">|</span>
          <span v-if="popularityText">{{ popularityText }}</span>
          <span v-if="priceText" class="dot">|</span>
          <span v-if="priceText">{{ priceText }}</span>
        </div>
      </div>
      <button class="close-btn" @click="clear">Close</button>
    </div>

    <div v-show="!isCollapsed" class="action-row">
      <button class="action-pill" :class="{ active: isSaved }" @click="toggleSave">
        {{ isSaved ? 'Saved' : 'Save' }}
      </button>
      <button class="action-pill" @click="sharePlace">Share</button>
      <button class="action-pill" @click="openPosts">Posts</button>
      <button class="action-pill" @click="navigateTo">Navigate</button>
      <button class="action-pill ghost" @click="focus">Center</button>
      <button class="action-pill" :class="{ danger: isViaPoint }" @click="toggleVia">
        {{ isViaPoint ? 'Remove' : 'Add' }}
      </button>
      <span v-if="detourHint" class="impact-hint">{{ detourHint }}</span>
      <span v-if="shareMessage" class="share-hint">{{ shareMessage }}</span>
    </div>

    <div v-show="!isCollapsed" class="tab-row">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div v-show="!isCollapsed" class="panel-body">
      <div v-if="activeTab === 'Overview'" class="overview">
        <div class="overview-left">
          <div class="media">
            <img v-if="imageUrl" :src="imageUrl" :alt="poi.name || 'Place image'" />
            <div v-else class="media-fallback">
              <div class="media-initials">{{ initials }}</div>
              <span>No photo</span>
            </div>
          </div>

          <div class="stat-strip">
            <div class="stat">
              <div class="stat-label">To route</div>
              <div class="stat-value">{{ formatDistance(distanceKm) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">To start</div>
              <div class="stat-value">{{ formatDistance(startKm) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">To end</div>
              <div class="stat-value">{{ formatDistance(endKm) }}</div>
            </div>
          </div>

          <div class="impact">
            <div class="impact-title">Detour impact</div>
            <div class="impact-row">
              <span>{{ impactExtraDistanceLabel }}</span>
              <span>{{ impactExtraDurationLabel }}</span>
            </div>
            <div class="impact-sub">{{ impactSummary }}</div>
            <div v-if="impactLoading" class="status">Updating impact...</div>
            <div v-else-if="impactError" class="status error">{{ impactError }}</div>
          </div>
        </div>

        <div class="overview-right">
          <div class="meta">
            <div class="meta-item">
              <span class="label">Address</span>
              <span class="value">{{ addressText }}</span>
            </div>
            <div class="meta-item" v-if="coordsText">
              <span class="label">Coords</span>
              <span class="value">{{ coordsText }}</span>
            </div>
          </div>

          <div v-if="hasScores" class="scores">
            <div class="score-row">
              <span>Interest match</span>
              <span>{{ interestLabel }}</span>
            </div>
            <div class="score-bar">
              <div class="score-fill interest" :style="{ width: interestPercent + '%' }"></div>
            </div>
            <div class="score-row">
              <span>Distance fit</span>
              <span>{{ distanceLabel }}</span>
            </div>
            <div class="score-bar">
              <div class="score-fill distance" :style="{ width: distancePercent + '%' }"></div>
            </div>
          </div>

          <div v-if="poi.reason" class="reason">
            <div class="section-title">Why this place</div>
            <div class="reason-text">{{ poi.reason }}</div>
          </div>

          <div v-if="explanationItems.length" class="explain">
            <div class="section-title">Score factors</div>
            <div class="explain-chips">
              <span v-for="item in explanationItems" :key="item.tag" class="explain-chip">
                {{ explanationLabel(item.tag) }} {{ Math.round(item.contribution || 0) }}%
              </span>
            </div>
          </div>

          <div v-if="tagList.length" class="tags">
            <span v-for="tag in tagList" :key="tag" class="tag">#{{ tag }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'Photos'" class="gallery">
        <div v-if="galleryImages.length" class="gallery-row">
          <div v-for="img in galleryImages" :key="img" class="gallery-item">
            <img :src="img" :alt="poi.name || 'Gallery photo'" />
          </div>
        </div>
        <div v-else class="empty">No photos yet.</div>
      </div>

      <div v-else-if="activeTab === 'Nearby'" class="nearby">
        <div v-if="nearbyLoading" class="status">Loading nearby places...</div>
        <div v-else-if="nearbyError" class="status error">{{ nearbyError }}</div>
        <div v-else-if="nearbyPlaces.length" class="nearby-row">
          <button
            v-for="place in nearbyPlaces"
            :key="place.id || place.name"
            class="nearby-card"
            @click="selectNearby(place)"
            @mouseenter="previewNearby(place)"
            @mouseleave="clearPreview"
          >
            <div class="nearby-name">{{ place.name }}</div>
            <div class="nearby-meta">{{ place.category || 'POI' }}</div>
            <div class="nearby-distance">{{ formatDistance(toKm(place.distance)) }}</div>
          </button>
        </div>
        <div v-else class="empty">No nearby places found.</div>
      </div>

      <div v-else-if="activeTab === 'Reviews'" class="reviews">
        <div class="rating-summary">
          <div class="rating-score">{{ ratingLabel }}</div>
          <div class="rating-bar">
            <div class="rating-fill" :style="{ width: ratingPercent + '%' }"></div>
          </div>
          <div class="rating-count">{{ ratingCountLabel }}</div>
        </div>

        <div v-if="reviewLoading" class="status">Loading reviews...</div>
        <div v-else-if="reviewError" class="status error">{{ reviewError }}</div>
        <div v-else-if="reviewPosts.length" class="review-list">
          <div v-for="post in reviewPosts" :key="post.id" class="review-item">
            <div class="review-main">
              <div class="review-title">{{ post.title }}</div>
              <div class="review-meta">
                <span v-if="post.rating">Rating {{ post.rating }}/5</span>
                <span v-if="post.like_count">Likes {{ post.like_count }}</span>
                <span v-if="post.view_count">Views {{ post.view_count }}</span>
              </div>
            </div>
            <button class="review-open" @click="openPost(post)">Open</button>
          </div>
        </div>
        <div v-else class="empty">No reviews yet.</div>
      </div>

      <div v-if="poiDetailLoading" class="status">Loading details...</div>
      <div v-else-if="poiDetailError" class="status error">{{ poiDetailError }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRouteStore } from '../store/routeStore'

const router = useRouter()
const routeStore = useRouteStore()
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
const tabs = ['Overview', 'Photos', 'Nearby', 'Reviews']
const activeTab = ref('Overview')
const panelMode = ref('compact')
const panelHeight = ref(0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const isCollapsed = computed(() => panelMode.value === 'collapsed')
const panelStyle = computed(() => ({
  height: panelHeight.value ? `${panelHeight.value}px` : undefined,
}))
let themeObserver = null

const POI_NEARBY_API = 'http://localhost:3001/api/poi/nearby'
const POSTS_API = 'http://localhost:3001/api/posts'
const ROUTE_WITH_POI_API = 'http://localhost:3001/api/route/with-poi'

const shareMessage = ref('')
let shareTimer = null

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})
onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
  if (shareTimer) clearTimeout(shareTimer)
  window.removeEventListener('resize', updateViewportHeight)
  window.removeEventListener('pointermove', onGrabberPointerMove)
  window.removeEventListener('pointerup', onGrabberPointerUp)
  if (addressAbort) {
    try {
      addressAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  if (nearbyAbort) {
    try {
      nearbyAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  if (reviewsAbort) {
    try {
      reviewsAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  if (impactAbort) {
    try {
      impactAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  if (impactTimer) clearTimeout(impactTimer)
})

const selectedPoi = computed(() => routeStore.selectedPoi)
const detail = computed(() => routeStore.selectedPoiDetail)
const poiDetailLoading = computed(() => routeStore.poiDetailLoading)
const poiDetailError = computed(() => routeStore.poiDetailError)

const poi = computed(() => {
  if (!selectedPoi.value) return null
  return { ...selectedPoi.value, ...(detail.value || {}) }
})

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getPanelHeights = () => {
  const height = viewportHeight.value || 800
  return {
    collapsed: 72,
    compact: clamp(Math.round(height * 0.3), 220, 320),
    expanded: clamp(Math.round(height * 0.6), 360, 560),
  }
}

const setPanelMode = (mode) => {
  const heights = getPanelHeights()
  const nextMode = ['collapsed', 'compact', 'expanded'].includes(mode) ? mode : 'compact'
  panelMode.value = nextMode
  panelHeight.value = heights[nextMode]
}

const cyclePanelMode = () => {
  if (panelMode.value === 'collapsed') setPanelMode('compact')
  else if (panelMode.value === 'compact') setPanelMode('expanded')
  else setPanelMode('collapsed')
}

const updateViewportHeight = () => {
  if (typeof window === 'undefined') return
  viewportHeight.value = window.innerHeight || 800
  const heights = getPanelHeights()
  panelHeight.value = heights[panelMode.value] || heights.compact
}

let dragActive = false
let dragMoved = false
let dragStartY = 0
let dragStartHeight = 0

const onGrabberPointerMove = (event) => {
  if (!dragActive) return
  const dy = dragStartY - event.clientY
  if (Math.abs(dy) > 4) dragMoved = true
  const heights = getPanelHeights()
  const next = clamp(dragStartHeight + dy, heights.collapsed, heights.expanded)
  panelHeight.value = next
}

const snapPanelMode = () => {
  const heights = getPanelHeights()
  const current = panelHeight.value
  const candidates = ['collapsed', 'compact', 'expanded']
  let best = 'compact'
  let bestDiff = Number.POSITIVE_INFINITY
  candidates.forEach((mode) => {
    const diff = Math.abs(current - heights[mode])
    if (diff < bestDiff) {
      bestDiff = diff
      best = mode
    }
  })
  setPanelMode(best)
}

const onGrabberPointerUp = () => {
  if (!dragActive) return
  dragActive = false
  window.removeEventListener('pointermove', onGrabberPointerMove)
  window.removeEventListener('pointerup', onGrabberPointerUp)
  if (!dragMoved) {
    cyclePanelMode()
    return
  }
  snapPanelMode()
}

const onGrabberPointerDown = (event) => {
  if (!event) return
  dragActive = true
  dragMoved = false
  dragStartY = event.clientY
  dragStartHeight = panelHeight.value || getPanelHeights().compact
  if (event.target?.setPointerCapture) {
    event.target.setPointerCapture(event.pointerId)
  }
  window.addEventListener('pointermove', onGrabberPointerMove)
  window.addEventListener('pointerup', onGrabberPointerUp)
  event.preventDefault()
}

const poiLat = computed(() => {
  const lat = Number(poi.value?.lat)
  return Number.isFinite(lat) ? lat : null
})
const poiLng = computed(() => {
  const lng = Number(poi.value?.lng)
  return Number.isFinite(lng) ? lng : null
})
const poiIdValue = computed(() => {
  const raw = poi.value?.id ?? poi.value?.poi_id
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
})

const imageUrl = computed(() => poi.value?.image_url || '')
const initials = computed(() => {
  const name = poi.value?.name || ''
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
})
const popularityText = computed(() => {
  const val = Number(poi.value?.popularity)
  if (!Number.isFinite(val)) return ''
  return `Popularity ${val.toFixed(1)}`
})
const priceText = computed(() => {
  const val = Number(poi.value?.price)
  if (!Number.isFinite(val) || val <= 0) return ''
  return '$'.repeat(Math.min(Math.round(val), 4))
})

const distanceKm = computed(() => toKm(poi.value?.distance))
const startKm = computed(() => toKm(poi.value?.distance_to_start))
const endKm = computed(() => toKm(poi.value?.distance_to_end))

const interestPercentRaw = computed(() => scorePercent(poi.value?.interest_score ?? poi.value?.personal_score))
const distancePercentRaw = computed(() => scorePercent(poi.value?.distance_score))
const interestPercent = computed(() => (interestPercentRaw.value === null ? 0 : interestPercentRaw.value))
const distancePercent = computed(() => (distancePercentRaw.value === null ? 0 : distancePercentRaw.value))
const interestLabel = computed(() =>
  interestPercentRaw.value === null ? 'N/A' : `${interestPercentRaw.value}%`
)
const distanceLabel = computed(() =>
  distancePercentRaw.value === null ? 'N/A' : `${distancePercentRaw.value}%`
)
const hasScores = computed(() => interestPercentRaw.value !== null || distancePercentRaw.value !== null)

const tagList = computed(() => {
  const matchTags = Array.isArray(poi.value?.match_tags) ? poi.value.match_tags : []
  const rawTags = typeof poi.value?.tags === 'string' ? poi.value.tags.split(/[,;|/]+/) : []
  const combined = [...matchTags, ...rawTags].map((t) => String(t).trim()).filter(Boolean)
  return [...new Set(combined)].slice(0, 6)
})

const explanationItems = computed(() => {
  const list = Array.isArray(poi.value?.explanations) ? poi.value.explanations : []
  return list
    .map((item) => ({
      tag: String(item?.tag || '').trim(),
      contribution: Number(item?.contribution) || 0,
    }))
    .filter((item) => item.tag)
    .slice(0, 4)
})

const explanationLabel = (tag) => {
  const key = String(tag || '').trim().toLowerCase()
  if (key === 'distance') return 'Distance'
  if (key === 'interest') return 'Interest'
  if (key === 'quality') return 'Quality'
  if (key === 'novelty') return 'Novelty'
  if (key === 'context') return 'Context'
  if (key === 'exploration') return 'Explore'
  return key || 'Factor'
}

const coordsText = computed(() => {
  if (!poi.value) return ''
  const lat = Number(poi.value.lat)
  const lng = Number(poi.value.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
})

const isViaPoint = computed(() => {
  if (!poi.value) return false
  return (routeStore.viaPoints || []).some((p) =>
    poi.value.id ? p.id === poi.value.id : p.lat === poi.value.lat && p.lng === poi.value.lng
  )
})

const focus = () => {
  const lat = Number(poi.value?.lat)
  const lng = Number(poi.value?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  routeStore.requestFocusPoint(lat, lng, 16)
}

const toggleVia = () => {
  if (!poi.value) return
  const payload = {
    id: poi.value.id,
    name: poi.value.name,
    lat: Number(poi.value.lat),
    lng: Number(poi.value.lng),
    category: poi.value.category,
  }
  if (isViaPoint.value) {
    routeStore.removeViaPoint(payload)
  } else {
    routeStore.addViaPoint(payload)
  }
}

const clear = () => {
  routeStore.clearSelectedPoi()
}

const toKm = (meters) => {
  const num = Number(meters)
  if (!Number.isFinite(num)) return null
  return num / 1000
}

const formatDistance = (km) => {
  if (!Number.isFinite(km)) return 'N/A'
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(2)} km`
}

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes)) return 'N/A'
  if (minutes < 60) return `${minutes.toFixed(0)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

const scorePercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.max(0, Math.min(100, Math.round(num * 100)))
}

const address = ref('')
const addressLoading = ref(false)
const addressCache = new Map()
let addressAbort = null

const addressText = computed(() => {
  if (addressLoading.value) return 'Loading address...'
  if (address.value) return address.value
  return 'Address unavailable'
})

const fetchAddress = async (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    address.value = ''
    return
  }
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (addressCache.has(key)) {
    address.value = addressCache.get(key)
    return
  }

  if (addressAbort) {
    try {
      addressAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  addressAbort = new AbortController()
  addressLoading.value = true
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
      { signal: addressAbort.signal }
    )
    const data = await res.json()
    const label = data?.display_name || ''
    if (label) {
      addressCache.set(key, label)
      address.value = label
    } else {
      address.value = ''
    }
  } catch (e) {
    address.value = ''
  } finally {
    addressLoading.value = false
  }
}

const galleryImages = computed(() => {
  const images = []
  if (poi.value?.image_url) images.push(poi.value.image_url)
  ;(reviewPosts.value || []).forEach((post) => {
    if (post.cover_image) images.push(post.cover_image)
    if (Array.isArray(post.images)) {
      post.images.forEach((img) => images.push(img))
    }
  })
  const unique = [...new Set(images)].filter(Boolean)
  return unique.slice(0, 8)
})

const nearbyPlaces = ref([])
const nearbyLoading = ref(false)
const nearbyError = ref('')
let nearbyAbort = null

const fetchNearby = async (lat, lng, category) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    nearbyPlaces.value = []
    return
  }
  if (nearbyAbort) {
    try {
      nearbyAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  nearbyAbort = new AbortController()
  nearbyLoading.value = true
  nearbyError.value = ''
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: '1800',
      limit: '8',
    })
    if (category) params.set('category', category)
    const res = await fetch(`${POI_NEARBY_API}?${params.toString()}`, { signal: nearbyAbort.signal })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      nearbyError.value = data?.message || 'Failed to load nearby places.'
      nearbyPlaces.value = []
      return
    }
    const list = (data?.data || []).filter((p) => {
      if (poiIdValue.value && p.id === poiIdValue.value) return false
      return true
    })
    nearbyPlaces.value = list
  } catch (e) {
    if (e?.name === 'AbortError') return
    nearbyError.value = 'Failed to load nearby places.'
    nearbyPlaces.value = []
  } finally {
    nearbyLoading.value = false
  }
}

const selectNearby = (place) => {
  if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') return
  routeStore.selectPoi(place)
  routeStore.requestFocusPoint(place.lat, place.lng, 16)
  activeTab.value = 'Overview'
}

const previewNearby = (place) => {
  if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') return
  routeStore.setPreviewPoi(place)
}

const clearPreview = () => {
  routeStore.clearPreviewPoi()
}

const reviewPosts = ref([])
const reviewLoading = ref(false)
const reviewError = ref('')
let reviewsAbort = null

const fetchReviews = async (poiId) => {
  if (!poiId) {
    reviewPosts.value = []
    return
  }
  if (reviewsAbort) {
    try {
      reviewsAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  reviewsAbort = new AbortController()
  reviewLoading.value = true
  reviewError.value = ''
  try {
    const params = new URLSearchParams({
      poi_id: String(poiId),
      limit: '8',
      sort: 'hot',
    })
    const res = await fetch(`${POSTS_API}?${params.toString()}`, { signal: reviewsAbort.signal })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      reviewError.value = data?.message || 'Failed to load reviews.'
      reviewPosts.value = []
      return
    }
    reviewPosts.value = data?.data || []
  } catch (e) {
    if (e?.name === 'AbortError') return
    reviewError.value = 'Failed to load reviews.'
    reviewPosts.value = []
  } finally {
    reviewLoading.value = false
  }
}

const ratingStats = computed(() => {
  const ratings = (reviewPosts.value || [])
    .map((p) => Number(p.rating))
    .filter((r) => Number.isFinite(r) && r > 0)
  if (ratings.length === 0) {
    return { avg: null, count: 0 }
  }
  const avg = ratings.reduce((sum, val) => sum + val, 0) / ratings.length
  return { avg, count: ratings.length }
})
const ratingLabel = computed(() => {
  const avg = ratingStats.value.avg
  return Number.isFinite(avg) ? `${avg.toFixed(1)}/5` : 'N/A'
})
const ratingPercent = computed(() => {
  const avg = ratingStats.value.avg
  if (!Number.isFinite(avg)) return 0
  return Math.max(0, Math.min(100, (avg / 5) * 100))
})
const ratingCountLabel = computed(() => {
  const count = ratingStats.value.count
  return count ? `${count} reviews` : 'No reviews'
})

const openPost = (post) => {
  if (!post?.id) return
  routeStore.logRecommendationEvent('open_posts', poi.value)
  router.push(`/posts/postsid=${post.id}`)
}

const openPosts = () => {
  if (!poi.value) return
  routeStore.logRecommendationEvent('open_posts', poi.value)
  const query = {}
  if (poiIdValue.value) query.poi_id = String(poiIdValue.value)
  if (poi.value?.name) query.poi_name = poi.value.name
  router.push({ path: '/posts', query })
}

const shareLink = computed(() => {
  if (!poi.value) return ''
  const origin = window.location?.origin || ''
  const params = new URLSearchParams()
  if (poiIdValue.value) params.set('poi_id', String(poiIdValue.value))
  if (Number.isFinite(poiLat.value) && Number.isFinite(poiLng.value)) {
    params.set('poi_lat', String(poiLat.value))
    params.set('poi_lng', String(poiLng.value))
  }
  if (poi.value?.name) params.set('poi_name', poi.value.name)
  return `${origin}/map?${params.toString()}`
})

const setShareMessage = (msg) => {
  shareMessage.value = msg
  if (shareTimer) clearTimeout(shareTimer)
  shareTimer = setTimeout(() => {
    shareMessage.value = ''
  }, 2000)
}

const sharePlace = async () => {
  if (!poi.value) return
  const link = shareLink.value
  if (!link) return
  try {
    if (navigator.share) {
      await navigator.share({ title: poi.value.name || 'Place', url: link })
      setShareMessage('Shared')
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(link)
      setShareMessage('Link copied')
    } else {
      window.prompt('Copy link', link)
    }
  } catch (e) {
    setShareMessage('Share canceled')
  }
}

const navigateTo = () => {
  if (!Number.isFinite(poiLat.value) || !Number.isFinite(poiLng.value)) return
  routeStore.logRecommendationEvent('navigate', poi.value)
  const url = `https://www.google.com/maps/dir/?api=1&destination=${poiLat.value},${poiLng.value}`
  window.open(url, '_blank')
}

const getPoiKey = (item) => {
  if (!item) return null
  const id = item.id ?? item.poi_id
  if (id !== undefined && id !== null && id !== '') return `id:${id}`
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    return `ll:${item.lat.toFixed(6)},${item.lng.toFixed(6)}`
  }
  return null
}
const poiKey = computed(() => getPoiKey(poi.value))
const isSaved = computed(() => routeStore.isPoiSaved(poi.value))
const toggleSave = () => {
  if (!poi.value) return
  routeStore.toggleSavedPoi(poi.value)
}

const baseDistanceKm = computed(() => {
  const num = Number(routeStore.totalDistance)
  return Number.isFinite(num) ? num : null
})
const baseDurationMin = computed(() => {
  const num = Number(routeStore.totalDuration)
  return Number.isFinite(num) ? num : null
})

const impact = ref({
  distanceKm: null,
  durationMin: null,
  extraDistanceKm: null,
  extraDurationMin: null,
})
const impactLoading = ref(false)
const impactError = ref('')
let impactAbort = null
let impactTimer = null

const responseDetourDistanceKm = computed(() => {
  const meters = Number(poi.value?.detour?.extra_distance_m)
  if (!Number.isFinite(meters)) return null
  return meters / 1000
})
const responseDetourDurationMin = computed(() => {
  const seconds = Number(poi.value?.detour?.extra_duration_s)
  if (!Number.isFinite(seconds)) return null
  return seconds / 60
})

const impactDistanceLabel = computed(() => formatDistance(impact.value.distanceKm))
const impactDurationLabel = computed(() => formatDuration(impact.value.durationMin))
const impactExtraDistanceLabel = computed(() => {
  const value = Number.isFinite(impact.value.extraDistanceKm)
    ? impact.value.extraDistanceKm
    : responseDetourDistanceKm.value
  if (!Number.isFinite(value)) return 'Extra N/A'
  return `+${formatDistance(value)}`
})
const impactExtraDurationLabel = computed(() => {
  const value = Number.isFinite(impact.value.extraDurationMin)
    ? impact.value.extraDurationMin
    : responseDetourDurationMin.value
  if (!Number.isFinite(value)) return 'Extra N/A'
  return `+${formatDuration(value)}`
})
const impactSummary = computed(() => {
  const dist = impactDistanceLabel.value
  const dur = impactDurationLabel.value
  if (dist === 'N/A' && dur === 'N/A') return 'Impact unavailable'
  return `${dist} / ${dur} with stop`
})
const detourHint = computed(() => {
  const parts = []
  if (impactExtraDistanceLabel.value !== 'Extra N/A') parts.push(impactExtraDistanceLabel.value)
  if (impactExtraDurationLabel.value !== 'Extra N/A') parts.push(impactExtraDurationLabel.value)
  if (!parts.length) return ''
  return `Detour ${parts.join(' / ')}`
})

const fetchImpact = async () => {
  if (!Number.isFinite(poiLat.value) || !Number.isFinite(poiLng.value)) {
    impact.value = { distanceKm: null, durationMin: null, extraDistanceKm: null, extraDurationMin: null }
    return
  }
  const startLat = Number(routeStore.startLat)
  const startLng = Number(routeStore.startLng)
  const endLat = Number(routeStore.endLat)
  const endLng = Number(routeStore.endLng)
  if (![startLat, startLng, endLat, endLng].every((v) => Number.isFinite(v))) {
    impact.value = { distanceKm: null, durationMin: null, extraDistanceKm: null, extraDurationMin: null }
    return
  }
  if (impactAbort) {
    try {
      impactAbort.abort()
    } catch (e) {
      // ignore
    }
  }
  impactAbort = new AbortController()
  impactLoading.value = true
  impactError.value = ''
  try {
    const params = new URLSearchParams({
      start: `${startLng},${startLat}`,
      poi: `${poiLng.value},${poiLat.value}`,
      end: `${endLng},${endLat}`,
      mode: routeStore.recoMode || 'driving',
    })
    const res = await fetch(`${ROUTE_WITH_POI_API}?${params.toString()}`, { signal: impactAbort.signal })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      impactError.value = data?.message || 'Failed to calculate impact.'
      return
    }
    const route = data?.optimized_route
    if (!route) return
    const distanceKm = Number(route.distance) / 1000
    const durationMin = Number(route.duration) / 60
    const baseDist = baseDistanceKm.value
    const baseDur = baseDurationMin.value
    const extraDistanceKm = Number.isFinite(baseDist) ? Math.max(0, distanceKm - baseDist) : null
    const extraDurationMin = Number.isFinite(baseDur) ? Math.max(0, durationMin - baseDur) : null
    impact.value = { distanceKm, durationMin, extraDistanceKm, extraDurationMin }
  } catch (e) {
    if (e?.name === 'AbortError') return
    impactError.value = 'Failed to calculate impact.'
  } finally {
    impactLoading.value = false
  }
}

const scheduleImpactFetch = () => {
  if (impactTimer) clearTimeout(impactTimer)
  impactTimer = setTimeout(() => {
    fetchImpact()
  }, 250)
}

watch(
  () => [poi.value?.lat, poi.value?.lng],
  ([lat, lng]) => {
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      address.value = ''
      return
    }
    fetchAddress(latNum, lngNum)
  },
  { immediate: true }
)

watch(
  () => [poiLat.value, poiLng.value, poi.value?.category],
  ([lat, lng, category]) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      nearbyPlaces.value = []
      return
    }
    fetchNearby(lat, lng, category)
  },
  { immediate: true }
)

watch(
  () => poiIdValue.value,
  (id) => {
    fetchReviews(id)
  },
  { immediate: true }
)

watch(
  () => [
    poiLat.value,
    poiLng.value,
    routeStore.startLat,
      routeStore.startLng,
      routeStore.endLat,
      routeStore.endLng,
      routeStore.recoMode,
      baseDistanceKm.value,
      baseDurationMin.value,
    ],
  () => {
    scheduleImpactFetch()
  },
  { immediate: true }
)

watch(
  () => poiKey.value,
  () => {
    activeTab.value = 'Overview'
    if (panelMode.value === 'collapsed') {
      setPanelMode('compact')
    }
  }
)
</script>

<style scoped>
.place-panel {
  position: absolute;
  left: 50%;
  bottom: 10px;
  width: clamp(520px, 72vw, 760px);
  max-height: 70vh;
  min-height: 72px;
  transform: translateX(-50%);
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  color: var(--map-overlay-fg);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background-color 0.4s ease, border-color 0.4s ease, color 0.4s ease;
}

.panel-grabber {
  height: 16px;
  display: grid;
  place-items: center;
  cursor: grab;
  touch-action: none;
}

.panel-grabber:active {
  cursor: grabbing;
}

.grabber-bar {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--map-overlay-fg) 25%, transparent);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 14px 4px;
}

.title {
  font-weight: 700;
  font-size: 16px;
}

.subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.dot {
  opacity: 0.6;
}

.close-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}

.action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 6px;
}

.action-pill {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11px;
}

.action-pill.active {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}

.action-pill.ghost {
  background: transparent;
}

.action-pill.danger {
  background: #f43f5e;
  border-color: transparent;
  color: #fff;
}

.share-hint {
  font-size: 11px;
  color: var(--muted);
  margin-left: 4px;
}

.impact-hint {
  font-size: 11px;
  color: var(--muted);
  padding-left: 4px;
}

.tab-row {
  display: flex;
  gap: 8px;
  padding: 4px 14px 6px;
  border-top: 1px solid var(--map-overlay-border);
  border-bottom: 1px solid var(--map-overlay-border);
}

.tab-btn {
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11px;
}

.tab-btn.active {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}

.panel-body {
  padding: 6px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
}

.overview {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px;
}

.overview-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media {
  height: 110px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--badge);
  border: 1px solid var(--map-overlay-border);
  display: grid;
  place-items: center;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-fallback {
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.media-initials {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 0.2);
  color: var(--map-overlay-fg);
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 14px;
}

.stat-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.stat {
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.stat-label {
  font-size: 10px;
  color: var(--muted);
}

.stat-value {
  font-size: 12px;
  font-weight: 700;
  margin-top: 3px;
}

.impact {
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.impact-title {
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
}

.impact-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
}

.impact-sub {
  font-size: 11px;
  color: var(--muted);
}

.overview-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.meta-item .label {
  color: var(--muted);
  font-weight: 600;
}

.meta-item .value {
  color: var(--map-overlay-fg);
  word-break: break-word;
}

.scores {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
}

.score-bar {
  height: 6px;
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--map-overlay-border);
}

.score-fill {
  height: 100%;
  border-radius: 999px;
}

.score-fill.interest {
  background: linear-gradient(90deg, #38bdf8, #22c55e);
}

.score-fill.distance {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.reason {
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--map-overlay-fg);
  margin-bottom: 4px;
}

.reason-text {
  font-size: 12px;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.explain {
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.explain-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.explain-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  color: var(--muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 11px;
  color: var(--muted);
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border: 1px solid var(--map-overlay-border);
  padding: 2px 6px;
  border-radius: 999px;
}

.gallery-row,
.nearby-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gallery-item {
  min-width: 150px;
  height: 92px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--map-overlay-border);
  background: var(--badge);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nearby-card {
  min-width: 150px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--map-overlay-fg);
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.nearby-name {
  font-weight: 700;
  font-size: 12px;
}

.nearby-meta,
.nearby-distance {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
}

.reviews {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.rating-score {
  font-weight: 700;
  font-size: 14px;
}

.rating-bar {
  height: 6px;
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--map-overlay-border);
}

.rating-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #38bdf8);
}

.rating-count {
  font-size: 11px;
  color: var(--muted);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.review-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-title {
  font-weight: 700;
  font-size: 12px;
}

.review-meta {
  font-size: 11px;
  color: var(--muted);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.review-open {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11px;
}

.empty {
  font-size: 12px;
  color: var(--muted);
  padding: 8px 0;
}

.status {
  font-size: 12px;
  color: var(--muted);
}

.status.error {
  color: #f87171;
}

.place-panel ::-webkit-scrollbar {
  width: 8px;
}
.place-panel ::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(80, 90, 110, 0.6);
}
.place-panel ::-webkit-scrollbar-track {
  background: var(--map-overlay-bg);
}
.place-panel.light ::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.7);
}
.place-panel.light ::-webkit-scrollbar-track {
  background: #ffffff;
}

@media (max-width: 1200px) {
  .place-panel {
    width: clamp(420px, 78vw, 680px);
  }
  .overview {
    grid-template-columns: 180px 1fr;
  }
}

@media (max-width: 960px) {
  .place-panel {
    left: 10px;
    right: 10px;
    width: auto;
    transform: none;
    max-height: 55vh;
  }
  .overview {
    grid-template-columns: 1fr;
  }
}
</style>
