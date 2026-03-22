
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
      <button class="action-pill" @click="openPosts">Stories</button>
      <button class="action-pill" @click="planWithAi">AI Plan</button>
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
            <img
              v-if="imageUrl"
              :src="imageUrl"
              :alt="poi.name || 'Place image'"
              class="media-image"
              @click="openPhotoViewerByUrl(imageUrl)"
            />
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
            <div class="meta-item" v-if="openingHoursText">
              <span class="label">Opening</span>
              <span class="value">{{ openingHoursText }}</span>
            </div>
            <div class="meta-item" v-if="phoneText">
              <span class="label">Phone</span>
              <span class="value">{{ phoneText }}</span>
            </div>
            <div class="meta-item" v-if="websiteText">
              <span class="label">Website</span>
              <a class="value link" :href="websiteText" target="_blank" rel="noopener noreferrer">
                {{ websiteLabel }}
              </a>
            </div>
            <div class="meta-item" v-if="stayMinutesText">
              <span class="label">Suggested stay</span>
              <span class="value">{{ stayMinutesText }}</span>
            </div>
            <div class="meta-item" v-if="bestVisitTimeText">
              <span class="label">Best visit</span>
              <span class="value">{{ bestVisitTimeText }}</span>
            </div>
            <div class="meta-item" v-if="ratingSummaryText">
              <span class="label">Rating signals</span>
              <span class="value">{{ ratingSummaryText }}</span>
            </div>
          </div>

          <div v-if="detailDescription" class="reason">
            <div class="section-title">About this place</div>
            <div class="reason-text">{{ detailDescription }}</div>
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
            <div class="score-row">
              <span>Quality signal</span>
              <span>{{ qualityLabel }}</span>
            </div>
            <div class="score-bar">
              <div class="score-fill quality" :style="{ width: qualityPercent + '%' }"></div>
            </div>
            <div class="score-row">
              <span>Novelty boost</span>
              <span>{{ noveltyLabel }}</span>
            </div>
            <div class="score-bar">
              <div class="score-fill novelty" :style="{ width: noveltyPercent + '%' }"></div>
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

          <div v-if="communitySummary" class="hub-block pulse-block">
            <div class="section-title">Community pulse</div>
            <div class="hub-metrics">
              <div class="hub-metric">
                <span class="hub-label">Stories</span>
                <strong>{{ communityPostCountLabel }}</strong>
              </div>
              <div class="hub-metric">
                <span class="hub-label">Avg rating</span>
                <strong>{{ communityRatingLabel }}</strong>
              </div>
              <div class="hub-metric">
                <span class="hub-label">Saves</span>
                <strong>{{ communityFavoritesLabel }}</strong>
              </div>
              <div class="hub-metric">
                <span class="hub-label">Views</span>
                <strong>{{ communityViewsLabel }}</strong>
              </div>
            </div>
            <div v-if="communityHighlights.length" class="hub-bullet-list">
              <div v-for="line in communityHighlights" :key="line" class="hub-bullet">{{ line }}</div>
            </div>
            <div v-if="communityTopTags.length" class="hub-chip-row">
              <span v-for="tag in communityTopTags" :key="`community-${tag}`" class="hub-chip">
                {{ tag }}
              </span>
            </div>
          </div>

          <div v-if="bestForList.length || watchOutList.length" class="hub-dual">
            <div v-if="bestForList.length" class="hub-block">
              <div class="section-title">Best for</div>
              <div class="hub-chip-row">
                <span v-for="item in bestForList" :key="`best-${item}`" class="hub-chip positive">
                  {{ item }}
                </span>
              </div>
            </div>
            <div v-if="watchOutList.length" class="hub-block">
              <div class="section-title">Watch out</div>
              <div class="hub-chip-row">
                <span v-for="item in watchOutList" :key="`watch-${item}`" class="hub-chip caution">
                  {{ item }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="pairedPlaces.length" class="hub-block">
            <div class="section-title">Works well with nearby</div>
            <div class="hub-place-row">
              <button
                v-for="place in pairedPlaces"
                :key="`paired-${place.id || place.name}`"
                class="hub-place-card"
                @click="selectHubPlace(place)"
                @mouseenter="previewNearby(place)"
                @mouseleave="clearPreview"
              >
                <img v-if="place.image_url" :src="place.image_url" :alt="place.name || 'Place'" />
                <div v-else class="hub-place-fallback">{{ place.name?.charAt(0) || 'P' }}</div>
                <div class="hub-place-copy">
                  <strong>{{ place.name }}</strong>
                  <span>{{ place.category || 'POI' }}</span>
                </div>
                <div class="hub-place-distance">{{ formatDistance(toKm(place.distance_m)) }}</div>
              </button>
            </div>
          </div>

          <div v-if="similarPlaces.length" class="hub-block">
            <div class="section-title">Similar picks nearby</div>
            <div class="hub-place-row">
              <button
                v-for="place in similarPlaces"
                :key="`similar-${place.id || place.name}`"
                class="hub-place-card subtle"
                @click="selectHubPlace(place)"
                @mouseenter="previewNearby(place)"
                @mouseleave="clearPreview"
              >
                <img v-if="place.image_url" :src="place.image_url" :alt="place.name || 'Place'" />
                <div v-else class="hub-place-fallback">{{ place.name?.charAt(0) || 'P' }}</div>
                <div class="hub-place-copy">
                  <strong>{{ place.name }}</strong>
                  <span>{{ place.category || 'POI' }}</span>
                </div>
                <div class="hub-place-distance">{{ formatDistance(toKm(place.distance_m)) }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'Photos'" class="gallery">
        <div v-if="galleryImages.length" class="gallery-grid">
          <div
            v-for="(img, idx) in galleryImages"
            :key="`${img}-${idx}`"
            class="gallery-item"
            role="button"
            tabindex="0"
            @click="openPhotoViewer(idx)"
            @keydown.enter.prevent="openPhotoViewer(idx)"
            @keydown.space.prevent="openPhotoViewer(idx)"
          >
            <img :src="img" :alt="poi.name || 'Gallery photo'" />
            <span class="gallery-zoom">View</span>
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

      <div v-else-if="activeTab === 'Stories'" class="reviews stories">
        <div class="rating-summary">
          <div class="rating-score">{{ ratingLabel }}</div>
          <div class="rating-bar">
            <div class="rating-fill" :style="{ width: ratingPercent + '%' }"></div>
          </div>
          <div class="rating-count">{{ ratingCountLabel }}</div>
        </div>

        <div v-if="communityHighlights.length" class="story-intro">
          <div class="section-title">What travelers keep repeating</div>
          <div class="hub-bullet-list">
            <div v-for="line in communityHighlights" :key="`story-${line}`" class="hub-bullet">
              {{ line }}
            </div>
          </div>
        </div>

        <div v-if="storyPosts.length" class="review-list story-list">
          <div v-for="post in storyPosts" :key="post.id" class="review-item story-item">
            <div class="review-main">
              <div class="review-title">{{ post.title }}</div>
              <div class="review-meta">
                <span v-if="post.author_name">{{ post.author_name }}</span>
                <span v-if="post.rating">Rating {{ post.rating }}/5</span>
                <span v-if="post.like_count">Likes {{ post.like_count }}</span>
                <span v-if="post.view_count">Views {{ post.view_count }}</span>
              </div>
              <div v-if="storyExcerpt(post)" class="story-excerpt">{{ storyExcerpt(post) }}</div>
              <div v-if="storyTags(post).length" class="hub-chip-row compact">
                <span v-for="tag in storyTags(post)" :key="`${post.id}-${tag}`" class="hub-chip">
                  {{ tag }}
                </span>
              </div>
            </div>
            <button class="review-open" @click="openPost(post)">Open</button>
          </div>
        </div>
        <div v-else-if="reviewLoading" class="status">Loading reviews...</div>
        <div v-else-if="reviewError" class="status error">{{ reviewError }}</div>
        <div v-else class="empty">No community stories yet.</div>
      </div>

      <div v-if="poiDetailLoading" class="status">Loading details...</div>
      <div v-else-if="poiDetailError" class="status error">{{ poiDetailError }}</div>
    </div>

    <teleport to="body">
      <div v-if="photoViewerOpen && activePhotoUrl" class="photo-viewer" @click.self="closePhotoViewer">
        <button class="viewer-close" aria-label="Close photo viewer" @click="closePhotoViewer">x</button>
        <button
          v-if="galleryImages.length > 1"
          class="viewer-nav prev"
          aria-label="Previous photo"
          @click.stop="showPrevPhoto"
        >
          <
        </button>
        <img class="viewer-image" :src="activePhotoUrl" :alt="poi?.name || 'Photo preview'" />
        <button
          v-if="galleryImages.length > 1"
          class="viewer-nav next"
          aria-label="Next photo"
          @click.stop="showNextPhoto"
        >
          >
        </button>
        <div class="viewer-count">{{ photoViewerIndex + 1 }} / {{ galleryImages.length }}</div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import { apiUrl } from '../config/api'
import { buildPoiPlannerPrompt, seedAiPlannerFromContext } from '../utils/aiPlannerBridge'

const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
const tabs = ['Overview', 'Photos', 'Nearby', 'Stories']
const activeTab = ref('Overview')
const panelMode = ref('compact')
const panelHeight = ref(0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const isCollapsed = computed(() => panelMode.value === 'collapsed')
const panelStyle = computed(() => ({
  height: panelHeight.value ? `${panelHeight.value}px` : undefined,
}))
let themeObserver = null

const POI_NEARBY_API = apiUrl('/api/poi/nearby')
const POSTS_API = apiUrl('/api/posts')
const ROUTE_WITH_POI_API = apiUrl('/api/route/with-poi')

const shareMessage = ref('')
let shareTimer = null

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
  window.addEventListener('keydown', onPhotoViewerKeydown)
})
onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
  if (shareTimer) clearTimeout(shareTimer)
  window.removeEventListener('resize', updateViewportHeight)
  window.removeEventListener('pointermove', onGrabberPointerMove)
  window.removeEventListener('pointerup', onGrabberPointerUp)
  window.removeEventListener('keydown', onPhotoViewerKeydown)
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
const qualityPercentRaw = computed(() =>
  scorePercent(poi.value?.scores?.quality ?? poi.value?.quality_score)
)
const noveltyPercentRaw = computed(() =>
  scorePercent(poi.value?.scores?.novelty ?? poi.value?.novelty_score)
)
const interestPercent = computed(() => (interestPercentRaw.value === null ? 0 : interestPercentRaw.value))
const distancePercent = computed(() => (distancePercentRaw.value === null ? 0 : distancePercentRaw.value))
const qualityPercent = computed(() => (qualityPercentRaw.value === null ? 0 : qualityPercentRaw.value))
const noveltyPercent = computed(() => (noveltyPercentRaw.value === null ? 0 : noveltyPercentRaw.value))
const interestLabel = computed(() =>
  interestPercentRaw.value === null ? 'N/A' : `${interestPercentRaw.value}%`
)
const distanceLabel = computed(() =>
  distancePercentRaw.value === null ? 'N/A' : `${distancePercentRaw.value}%`
)
const qualityLabel = computed(() =>
  qualityPercentRaw.value === null ? 'N/A' : `${qualityPercentRaw.value}%`
)
const noveltyLabel = computed(() =>
  noveltyPercentRaw.value === null ? 'N/A' : `${noveltyPercentRaw.value}%`
)
const hasScores = computed(
  () =>
    interestPercentRaw.value !== null ||
    distancePercentRaw.value !== null ||
    qualityPercentRaw.value !== null ||
    noveltyPercentRaw.value !== null
)

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

const detailDescription = computed(() => {
  const text = String(poi.value?.description || '').trim()
  return text || ''
})

const openingHoursText = computed(() => {
  const text = String(poi.value?.opening_hours || '').trim()
  return text || ''
})

const phoneText = computed(() => {
  const text = String(poi.value?.phone || '').trim()
  return text || ''
})

const websiteText = computed(() => {
  const text = String(poi.value?.website || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  return `https://${text}`
})

const websiteLabel = computed(() => {
  const url = websiteText.value
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.host || url
  } catch {
    return url
  }
})

const stayMinutesText = computed(() => {
  const minutes = Number(poi.value?.stay_minutes)
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!mins) return `${hours}h`
  return `${hours}h ${mins}m`
})

const bestVisitTimeText = computed(() => {
  const text = String(poi.value?.best_visit_time || '').trim()
  return text || ''
})

const ratingSummaryText = computed(() => {
  const ratingCount = Number(poi.value?.rating_count)
  const reviewCount = Number(poi.value?.review_count)
  if (!Number.isFinite(ratingCount) && !Number.isFinite(reviewCount)) return ''
  const parts = []
  if (Number.isFinite(ratingCount) && ratingCount > 0) parts.push(`${Math.round(ratingCount)} ratings`)
  if (Number.isFinite(reviewCount) && reviewCount > 0) parts.push(`${Math.round(reviewCount)} reviews`)
  return parts.join(' / ')
})

const communitySummary = computed(() => {
  const value = poi.value?.community_summary
  return value && typeof value === 'object' ? value : null
})

const communityMetrics = computed(() => {
  const value = communitySummary.value?.metrics
  return value && typeof value === 'object' ? value : {}
})

const compactNumber = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '0'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
}

const communityPostCountLabel = computed(() => compactNumber(communityMetrics.value?.post_count))
const communityRatingLabel = computed(() => {
  const value = Number(communityMetrics.value?.avg_rating)
  return Number.isFinite(value) && value > 0 ? `${value.toFixed(1)}/5` : 'N/A'
})
const communityFavoritesLabel = computed(() => compactNumber(communityMetrics.value?.total_favorites))
const communityViewsLabel = computed(() => compactNumber(communityMetrics.value?.total_views))
const communityTopTags = computed(() => {
  const list = Array.isArray(communitySummary.value?.top_tags) ? communitySummary.value.top_tags : []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
})
const communityHighlights = computed(() => {
  const list = Array.isArray(communitySummary.value?.highlights) ? communitySummary.value.highlights : []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
})
const bestForList = computed(() => {
  const list = Array.isArray(communitySummary.value?.best_for) ? communitySummary.value.best_for : []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
})
const watchOutList = computed(() => {
  const list = Array.isArray(communitySummary.value?.watch_out_for) ? communitySummary.value.watch_out_for : []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
})
const pairedPlaces = computed(() => {
  const list = Array.isArray(poi.value?.paired_places) ? poi.value.paired_places : []
  return list.filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng))).slice(0, 4)
})
const similarPlaces = computed(() => {
  const list = Array.isArray(poi.value?.similar_places) ? poi.value.similar_places : []
  return list.filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng))).slice(0, 4)
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
  const dbAddress = String(poi.value?.address || '').trim()
  if (dbAddress) return dbAddress
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
  if (Array.isArray(poi.value?.photos)) {
    poi.value.photos.forEach((img) => images.push(img))
  }
  if (poi.value?.image_url) images.push(poi.value.image_url)
  ;(reviewPosts.value || []).forEach((post) => {
    if (post.cover_image) images.push(post.cover_image)
    if (Array.isArray(post.images)) {
      post.images.forEach((img) => images.push(img))
    }
  })
  const merged = [...new Set(images.map((img) => String(img || '').trim()).filter(Boolean))]
  return merged.slice(0, 12)
})

const photoViewerOpen = ref(false)
const photoViewerIndex = ref(0)
const activePhotoUrl = computed(() => galleryImages.value[photoViewerIndex.value] || '')

const openPhotoViewer = (index = 0) => {
  if (!galleryImages.value.length) return
  if (panelMode.value !== 'expanded') {
    setPanelMode('expanded')
  }
  const safe = Math.max(0, Math.min(Number(index) || 0, galleryImages.value.length - 1))
  photoViewerIndex.value = safe
  photoViewerOpen.value = true
}

const openPhotoViewerByUrl = (url) => {
  const idx = galleryImages.value.indexOf(url)
  openPhotoViewer(idx >= 0 ? idx : 0)
}

const closePhotoViewer = () => {
  photoViewerOpen.value = false
}

const showPrevPhoto = () => {
  if (!galleryImages.value.length) return
  photoViewerIndex.value =
    (photoViewerIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length
}

const showNextPhoto = () => {
  if (!galleryImages.value.length) return
  photoViewerIndex.value = (photoViewerIndex.value + 1) % galleryImages.value.length
}

const onPhotoViewerKeydown = (event) => {
  if (!photoViewerOpen.value) return
  if (event.key === 'Escape') {
    closePhotoViewer()
    return
  }
  if (event.key === 'ArrowLeft') {
    showPrevPhoto()
    return
  }
  if (event.key === 'ArrowRight') {
    showNextPhoto()
  }
}

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

const selectHubPlace = (place) => {
  selectNearby(place)
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
  const ratings = (storyPosts.value || reviewPosts.value || [])
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

const storyPosts = computed(() => {
  const hubList = Array.isArray(poi.value?.related_posts) ? poi.value.related_posts : []
  if (hubList.length) return hubList.slice(0, 6)
  return (reviewPosts.value || []).slice(0, 6)
})

const storyTags = (post) => {
  const list = Array.isArray(post?.tags) ? post.tags : []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
}

const storyExcerpt = (post) => {
  const excerpt = String(post?.excerpt || post?.content || '').trim()
  return excerpt || ''
}

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

const planWithAi = () => {
  if (!poi.value) return
  const prompt =
    String(poi.value?.planner_bridge?.suggested_prompt || '').trim() ||
    buildPoiPlannerPrompt(poi.value, {
      bestFor: bestForList.value,
      watchOut: watchOutList.value,
      topTags: communityTopTags.value,
    })

  seedAiPlannerFromContext({
    userId: auth.user?.id || null,
    routeStore,
    prompt,
    anchorPoi: poi.value,
    profileSnapshot: routeStore.userInterestProfile?.profile_story
      ? {
          archetype: routeStore.userInterestProfile.profile_story.archetype,
          confidence: Number(routeStore.userInterestProfile.profile_story.confidence || 0),
          dominant_category: String(routeStore.userInterestProfile.profile_story.dominant_category?.name || ''),
          dominant_tag: String(routeStore.userInterestProfile.profile_story.dominant_tag?.name || ''),
          source: String(routeStore.userInterestProfile.source || ''),
          interest_weight: Number(routeStore.recoInterestWeight || 0.5),
          explore_weight: Number(routeStore.recoExploreWeight || 0.15),
        }
      : null,
    source: 'map-place-panel',
  })
  router.push('/ai-planner')
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
  () => galleryImages.value,
  (images) => {
    if (!Array.isArray(images) || images.length === 0) {
      closePhotoViewer()
      photoViewerIndex.value = 0
      return
    }
    if (photoViewerIndex.value > images.length - 1) {
      photoViewerIndex.value = images.length - 1
    }
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
  bottom: 12px;
  width: clamp(560px, 74vw, 860px);
  max-height: 70vh;
  min-height: 72px;
  transform: translateX(-50%);
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  border-radius: 18px;
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
  gap: 12px;
  padding: 8px 18px 6px;
}

.title {
  font-weight: 700;
  font-size: 17px;
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
  padding: 5px 11px;
  cursor: pointer;
}

.action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 8px;
}

.action-pill {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 5px 11px;
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
  gap: 10px;
  padding: 6px 18px 8px;
  border-top: 1px solid var(--map-overlay-border);
  border-bottom: 1px solid var(--map-overlay-border);
}

.tab-btn {
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 5px 11px;
  cursor: pointer;
  font-size: 11px;
}

.tab-btn.active {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}

.panel-body {
  padding: 10px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.overview {
  display: grid;
  grid-template-columns: 230px 1fr;
  gap: 16px;
}

.overview-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.media {
  height: 128px;
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

.media-image {
  cursor: zoom-in;
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
  gap: 8px;
}

.stat {
  padding: 8px;
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
  padding: 8px 10px;
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
  gap: 10px;
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

.meta-item .value.link {
  color: color-mix(in srgb, var(--map-overlay-fg) 85%, #60a5fa);
  text-decoration: underline;
}

.scores {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.score-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
}

.score-bar {
  height: 7px;
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
.score-fill.quality {
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}
.score-fill.novelty {
  background: linear-gradient(90deg, #f472b6, #a78bfa);
}

.reason {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.section-title {
  font-size: 12px;
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
  padding: 10px;
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
  gap: 8px;
}

.tag {
  font-size: 11px;
  color: var(--muted);
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border: 1px solid var(--map-overlay-border);
  padding: 2px 6px;
  border-radius: 999px;
}

.hub-block {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.pulse-block {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #60a5fa 16%, transparent), transparent 46%),
    color-mix(in srgb, var(--badge) 80%, transparent);
}

.hub-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.hub-metric {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 88%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 82%, transparent);
  padding: 8px;
  display: grid;
  gap: 4px;
}

.hub-label {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hub-metric strong {
  font-size: 14px;
}

.hub-bullet-list {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.hub-bullet {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.55;
  padding-left: 12px;
  position: relative;
}

.hub-bullet::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #60a5fa;
}

.hub-dual {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hub-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.hub-chip-row.compact {
  margin-top: 8px;
}

.hub-chip {
  font-size: 11px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 88%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 84%, transparent);
  color: var(--map-overlay-fg);
}

.hub-chip.positive {
  border-color: color-mix(in srgb, #22c55e 36%, var(--map-overlay-border) 64%);
  background: color-mix(in srgb, #22c55e 10%, var(--map-overlay-bg) 90%);
}

.hub-chip.caution {
  border-color: color-mix(in srgb, #f59e0b 36%, var(--map-overlay-border) 64%);
  background: color-mix(in srgb, #f59e0b 10%, var(--map-overlay-bg) 90%);
}

.hub-place-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.hub-place-card {
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 90%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 82%, transparent);
  border-radius: 12px;
  overflow: hidden;
  color: var(--map-overlay-fg);
  text-align: left;
  cursor: pointer;
  padding: 0;
  display: grid;
  grid-template-rows: 92px auto auto;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.hub-place-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #60a5fa 36%, var(--map-overlay-border) 64%);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}

.hub-place-card img,
.hub-place-fallback {
  width: 100%;
  height: 92px;
  object-fit: cover;
}

.hub-place-fallback {
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 800;
  background: color-mix(in srgb, #4d8cff 18%, var(--badge) 82%);
}

.hub-place-copy {
  display: grid;
  gap: 4px;
  padding: 10px 10px 0;
}

.hub-place-copy strong {
  font-size: 12px;
  line-height: 1.35;
}

.hub-place-copy span {
  font-size: 11px;
  color: var(--muted);
}

.hub-place-distance {
  padding: 10px;
  font-size: 11px;
  color: var(--muted);
}

.hub-place-card.subtle {
  opacity: 0.95;
}

.nearby-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
  gap: 10px;
}

.gallery-item {
  position: relative;
  width: 100%;
  height: 112px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--map-overlay-border);
  background: var(--badge);
  cursor: zoom-in;
}

.gallery-item:nth-child(5n + 2),
.gallery-item:nth-child(5n + 4) {
  height: 128px;
}

.gallery-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--btn-primary) 75%, #fff);
  outline-offset: 2px;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-zoom {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 80%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 86%, transparent);
  color: var(--map-overlay-fg);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.gallery-item:hover .gallery-zoom,
.gallery-item:focus-visible .gallery-zoom {
  opacity: 1;
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

.stories {
  gap: 10px;
}

.story-intro {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
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

.story-item {
  align-items: flex-start;
}

.review-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
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

.story-excerpt {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.55;
  margin-top: 4px;
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

.photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.viewer-image {
  max-width: min(92vw, 1360px);
  max-height: 82vh;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  object-fit: contain;
  background: #0f172a;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

.viewer-close,
.viewer-nav {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.viewer-close {
  top: 18px;
  right: 18px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 24px;
}

.viewer-nav {
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 68px;
  border-radius: 12px;
  font-size: 38px;
  line-height: 1;
}

.viewer-nav.prev {
  left: 18px;
}

.viewer-nav.next {
  right: 18px;
}

.viewer-count {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  color: #e2e8f0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(15, 23, 42, 0.7);
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
    width: clamp(460px, 80vw, 740px);
  }
  .overview {
    grid-template-columns: 200px 1fr;
  }
  .hub-metrics,
  .hub-place-row,
  .hub-dual {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .hub-metrics,
  .hub-place-row,
  .hub-dual {
    grid-template-columns: 1fr;
  }
}
</style>
