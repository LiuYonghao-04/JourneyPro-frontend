import { defineStore } from 'pinia'
import L from 'leaflet'
import { useAuthStore } from './authStore'
import { apiUrl } from '../config/api'

const STORAGE_KEY = 'jp_via_points'
const RECO_WEIGHT_KEY = 'jp_reco_interest_weight'
const RECO_EXPLORE_WEIGHT_KEY = 'jp_reco_explore_weight'
const RECO_MODE_KEY = 'jp_reco_mode'
const RECO_DEBUG_KEY = 'jp_reco_debug'
const RECO_SESSION_KEY = 'jp_reco_session_id'
const INTEREST_PROFILE_CACHE_PREFIX = 'jp_interest_profile_v1_'
const INTEREST_PROFILE_TTL_MS = 30 * 60 * 1000
const POI_API_BASE = apiUrl('/api/poi')
const SAVED_POI_KEY = 'jp_saved_pois'
const RECENT_POI_KEY = 'jp_recent_pois'
const MAX_RECENT_POIS = 12
const CATEGORY_COLORS = ['#2563eb', '#10b981', '#f97316', '#a855f7', '#f59e0b', '#06b6d4', '#22c55e', '#ef4444']
const PANEL_MODES = ['collapsed', 'half', 'full']
const RECO_MODES = ['driving']

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const normalizePanelMode = (mode) => (PANEL_MODES.includes(mode) ? mode : 'half')

let recoSettingsSaveTimer = null
let poiDetailRequestSeq = 0

function loadViaPoints() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveViaPoints(list) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    // ignore
  }
}

function loadRecoInterestWeight() {
  if (typeof window === 'undefined') return 0.5
  try {
    const raw = localStorage.getItem(RECO_WEIGHT_KEY)
    const num = Number(raw)
    if (!Number.isFinite(num)) return 0.5
    // Support storing as 0..1 or 0..100.
    const normalized = num > 1 ? num / 100 : num
    return clamp(normalized, 0, 1)
  } catch (e) {
    return 0.5
  }
}

function saveRecoInterestWeight(weight) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECO_WEIGHT_KEY, String(weight))
  } catch (e) {
    // ignore
  }
}

function loadRecoExploreWeight() {
  if (typeof window === 'undefined') return 0.15
  try {
    const raw = localStorage.getItem(RECO_EXPLORE_WEIGHT_KEY)
    const num = Number(raw)
    if (!Number.isFinite(num)) return 0.15
    const normalized = num > 1 ? num / 100 : num
    return clamp(normalized, 0, 1)
  } catch (e) {
    return 0.15
  }
}

function saveRecoExploreWeight(weight) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECO_EXPLORE_WEIGHT_KEY, String(weight))
  } catch (e) {
    // ignore
  }
}

function loadRecoMode() {
  return 'driving'
}

function saveRecoMode(mode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECO_MODE_KEY, mode)
  } catch (e) {
    // ignore
  }
}

function loadRecoDebugFlag() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(RECO_DEBUG_KEY) === '1'
  } catch (e) {
    return false
  }
}

function saveRecoDebugFlag(enabled) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECO_DEBUG_KEY, enabled ? '1' : '0')
  } catch (e) {
    // ignore
  }
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

function loadRecoSessionId() {
  if (typeof window === 'undefined') return createSessionId()
  try {
    const existing = localStorage.getItem(RECO_SESSION_KEY)
    if (existing) return existing
    const created = createSessionId()
    localStorage.setItem(RECO_SESSION_KEY, created)
    return created
  } catch (e) {
    return createSessionId()
  }
}

function loadSavedPois() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SAVED_POI_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveSavedPois(list) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SAVED_POI_KEY, JSON.stringify(list))
  } catch (e) {
    // ignore
  }
}

function loadRecentPois() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_POI_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveRecentPois(list) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECENT_POI_KEY, JSON.stringify(list))
  } catch (e) {
    // ignore
  }
}

function interestProfileCacheKey(userId) {
  return `${INTEREST_PROFILE_CACHE_PREFIX}${userId}`
}

function loadInterestProfileCache(userId) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(interestProfileCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null
    const updatedAt = Number(parsed.updated_at || 0)
    const ageMs = Date.now() - updatedAt
    return {
      data: parsed.data,
      stale: !Number.isFinite(updatedAt) || ageMs > INTEREST_PROFILE_TTL_MS,
      ageMs: Number.isFinite(ageMs) ? ageMs : Number.MAX_SAFE_INTEGER,
    }
  } catch (e) {
    return null
  }
}

function saveInterestProfileCache(userId, data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      interestProfileCacheKey(userId),
      JSON.stringify({
        updated_at: Date.now(),
        data,
      })
    )
  } catch (e) {
    // ignore
  }
}

function normalizeCategory(value) {
  return String(value || '').trim()
}

function getPoiKey(poi) {
  if (!poi) return null
  const id = poi.id ?? poi.poi_id
  if (id !== undefined && id !== null && id !== '') return `id:${id}`
  if (typeof poi.lat === 'number' && typeof poi.lng === 'number') {
    return `ll:${poi.lat.toFixed(6)},${poi.lng.toFixed(6)}`
  }
  return null
}

function buildPoiSummary(poi) {
  if (!poi) return null
  const key = getPoiKey(poi)
  if (!key) return null
  return {
    key,
    id: poi.id ?? poi.poi_id ?? null,
    name: poi.name || 'POI',
    lat: typeof poi.lat === 'number' ? poi.lat : null,
    lng: typeof poi.lng === 'number' ? poi.lng : null,
    category: poi.category || '',
    image_url: poi.image_url || '',
  }
}

function normalizeRecoMode(mode) {
  const value = String(mode || '').trim().toLowerCase()
  return RECO_MODES.includes(value) ? value : 'driving'
}

function buildRouteHash({ startLat, startLng, endLat, endLng, viaPoints, mode }) {
  const via = (viaPoints || [])
    .filter((poi) => typeof poi?.lat === 'number' && typeof poi?.lng === 'number')
    .map((poi) => `${poi.lat.toFixed(5)},${poi.lng.toFixed(5)}`)
    .join('|')
  return `${mode || 'driving'}::${Number(startLat).toFixed(5)},${Number(startLng).toFixed(5)}::${Number(
    endLat
  ).toFixed(5)},${Number(endLng).toFixed(5)}::${via}`
}

export const useRouteStore = defineStore('route', {
  state: () => ({
    startAddress: 'London_center',
    endAddress: 'Grosvenor Square',
    startLat: 51.5074,
    startLng: -0.1278,
    endLat: 51.5113,
    endLng: -0.1502,
    routeGeojson: null,
    steps: [],
    totalDistance: null,
    totalDuration: null,
    legs: [],
    recommendedPOIs: [],
    poiCategoryFilter: [],
    poiCategoryColors: {},
    selectedPoi: null,
    selectedPoiDetail: null,
    poiDetailsById: {},
    poiDetailLoading: false,
    poiDetailError: null,
    previewPoi: null,
    savedPois: loadSavedPois(),
    recentPois: loadRecentPois(),
    recommendationProfile: null,
    recoInterestWeight: loadRecoInterestWeight(),
    recoExploreWeight: loadRecoExploreWeight(),
    recoMode: loadRecoMode(),
    recoDebugEnabled: loadRecoDebugFlag(),
    recoSessionId: loadRecoSessionId(),
    recommendationRequestId: null,
    recommendationBucket: null,
    recommendationVersion: null,
    recommendationDiagnostics: null,
    userInterestProfile: null,
    interestProfileLoading: false,
    isLoading: false,
    isRouting: false,
    routeError: null,
    viaPoints: loadViaPoints(),
    followRoute: true,
    routePanelMode: 'half',
    poiPanelMode: 'half',
    hoveredStepIndex: null,
    hoveredStepSource: null,
    pinnedStepIndex: null,
    pinnedStepSource: null,
    fitRouteNonce: 0,
    focusPoint: null,
    focusPointNonce: 0,
  }),

  getters: {
    filteredRecommendedPOIs(state) {
      const list = Array.isArray(state.recommendedPOIs) ? state.recommendedPOIs : []
      const filter = Array.isArray(state.poiCategoryFilter) ? state.poiCategoryFilter : []
      if (filter.length === 0) return list
      return list.filter((poi) => filter.includes(normalizeCategory(poi?.category)))
    },
  },

  actions: {
    setStart(lat, lng) {
      this.startLat = lat
      this.startLng = lng
    },

    setRoutePanelMode(mode) {
      const next = normalizePanelMode(mode)
      if (this.poiPanelMode === 'full' && next !== 'collapsed') {
        this.poiPanelMode = 'collapsed'
      }
      if (next === 'full') {
        this.poiPanelMode = 'collapsed'
      }
      this.routePanelMode = next
    },

    setPoiPanelMode(mode) {
      const next = normalizePanelMode(mode)
      if (this.routePanelMode === 'full' && next !== 'collapsed') {
        this.routePanelMode = 'collapsed'
      }
      if (next === 'full') {
        this.routePanelMode = 'collapsed'
      }
      this.poiPanelMode = next
    },

    setEnd(lat, lng) {
      this.endLat = lat
      this.endLng = lng
    },

    buildWaypoints() {
      return [
        L.latLng(this.startLat, this.startLng),
        ...this.viaPoints.map((poi) => L.latLng(poi.lat, poi.lng)),
        L.latLng(this.endLat, this.endLng),
      ]
    },

    applyWaypointsToControl() {
      // no-op: routing is handled in MapContainer fetchRoute
    },

    addViaPoint(poi) {
      try {
        if (!poi || typeof poi.lat !== 'number' || typeof poi.lng !== 'number') {
          console.warn('Invalid via point data', poi)
          return
        }

        const exists = this.viaPoints.some((p) =>
          poi.id ? p.id === poi.id : p.lat === poi.lat && p.lng === poi.lng
        )
        if (!exists) {
          this.viaPoints.push(poi)
          saveViaPoints(this.viaPoints)
          this.logRecommendationEvent('add_via', poi)
        }

        this.applyWaypointsToControl()
      } catch (err) {
        console.error('addViaPoint error:', err)
      } finally {
        this.isLoading = false
      }
    },

    removeViaPoint(poi) {
      if (!poi) return

      const before = this.viaPoints.length
      this.viaPoints = this.viaPoints.filter((p) =>
        poi.id ? p.id !== poi.id : p.lat !== poi.lat || p.lng !== poi.lng
      )
      if (before !== this.viaPoints.length) {
        saveViaPoints(this.viaPoints)
        this.logRecommendationEvent('remove_via', poi)
      }
    },

    clearViaPoints() {
      if (this.viaPoints.length === 0) return
      this.viaPoints = []
      saveViaPoints(this.viaPoints)
    },

    setRecoInterestWeight(weight) {
      const num = Number(weight)
      if (!Number.isFinite(num)) return
      this.recoInterestWeight = clamp(num, 0, 1)
      saveRecoInterestWeight(this.recoInterestWeight)

      this.reorderRecommendedPois()

      const auth = useAuthStore()
      if (!auth.user?.id) return
      if (recoSettingsSaveTimer) clearTimeout(recoSettingsSaveTimer)
      recoSettingsSaveTimer = setTimeout(() => {
        recoSettingsSaveTimer = null
        this.saveRecoSettingsToServer(auth.user.id)
      }, 500)
    },

    setRecoExploreWeight(weight) {
      const num = Number(weight)
      if (!Number.isFinite(num)) return
      this.recoExploreWeight = clamp(num, 0, 1)
      saveRecoExploreWeight(this.recoExploreWeight)

      this.reorderRecommendedPois()

      const auth = useAuthStore()
      if (!auth.user?.id) return
      if (recoSettingsSaveTimer) clearTimeout(recoSettingsSaveTimer)
      recoSettingsSaveTimer = setTimeout(() => {
        recoSettingsSaveTimer = null
        this.saveRecoSettingsToServer(auth.user.id)
      }, 500)
    },

    setRecoMode(mode) {
      const next = normalizeRecoMode(mode)
      if (next === this.recoMode) return
      this.recoMode = next
      saveRecoMode(next)
    },

    setRecoDebugEnabled(enabled) {
      this.recoDebugEnabled = !!enabled
      saveRecoDebugFlag(this.recoDebugEnabled)
    },

    async fetchRecoSettingsFromServer(userId) {
      const uid = Number(userId)
      if (!Number.isFinite(uid) || !uid) return

      try {
        const url = `${apiUrl('/api/recommendation/settings')}?user_id=${uid}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data?.success) return

        const raw = Number(data.interest_weight)
        if (!Number.isFinite(raw)) return
        const normalized = raw > 1 ? raw / 100 : raw
        const rawExplore = Number(data.explore_weight)
        const normalizedExplore = Number.isFinite(rawExplore)
          ? clamp(rawExplore > 1 ? rawExplore / 100 : rawExplore, 0, 1)
          : this.recoExploreWeight
        // Apply server value without scheduling a save back.
        this.recoInterestWeight = clamp(normalized, 0, 1)
        this.recoExploreWeight = normalizedExplore
        saveRecoInterestWeight(this.recoInterestWeight)
        saveRecoExploreWeight(this.recoExploreWeight)
        this.reorderRecommendedPois()
      } catch (e) {
        // ignore
      }
    },

    async saveRecoSettingsToServer(userId) {
      const uid = Number(userId)
      if (!Number.isFinite(uid) || !uid) return

      const auth = useAuthStore()
      if (!auth.user?.id || Number(auth.user.id) !== uid) return

      try {
        await fetch(apiUrl('/api/recommendation/settings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            interest_weight: this.recoInterestWeight ?? 0.5,
            explore_weight: this.recoExploreWeight ?? 0.15,
          }),
        })
      } catch (e) {
        // ignore
      }
    },

    reorderRecommendedPois() {
      if (!Array.isArray(this.recommendedPOIs) || this.recommendedPOIs.length === 0) return
      const iw = clamp(Number(this.recoInterestWeight ?? 0.5), 0, 1)
      const dw = 1 - iw
      const ew = clamp(Number(this.recoExploreWeight ?? 0.15), 0, 1)
      const computeBase = (p) =>
        (Number(p?.distance_score ?? p?.scores?.distance) || 0) * dw +
        (Number(p?.interest_score ?? p?.scores?.interest) || 0) * iw
      const computeExploreSignal = (p) => {
        const novelty = Number(p?.scores?.novelty) || 0
        const quality = Number(p?.scores?.quality) || 0
        const context = Number(p?.scores?.context) || 0
        const bonus = Number(p?.scores?.bandit_bonus) || 0
        const bonusNorm = clamp((bonus + 1) / 2, 0, 1)
        return clamp(novelty * 0.5 + quality * 0.2 + context * 0.15 + bonusNorm * 0.15, 0, 1)
      }

      this.recommendedPOIs = [...this.recommendedPOIs].sort((a, b) => {
        const sa = computeBase(a) * (1 - ew) + computeExploreSignal(a) * ew
        const sb = computeBase(b) * (1 - ew) + computeExploreSignal(b) * ew
        if (sb !== sa) return sb - sa
        const fa = Number(a?.scores?.final) || 0
        const fb = Number(b?.scores?.final) || 0
        if (fb !== fa) return fb - fa
        const ba = Number(a?.base_score) || 0
        const bb = Number(b?.base_score) || 0
        if (bb !== ba) return bb - ba
        const pa = Number(a?.popularity) || 0
        const pb = Number(b?.popularity) || 0
        if (pb !== pa) return pb - pa
        const da = Number(a?.distance) || 0
        const db = Number(b?.distance) || 0
        if (da !== db) return da - db
        return (Number(a?.id) || 0) - (Number(b?.id) || 0)
      })
    },

    refreshPoiCategoryColors() {
      const colors = { ...(this.poiCategoryColors || {}) }
      const seen = new Set()
      const categories = (this.recommendedPOIs || [])
        .map((poi) => normalizeCategory(poi?.category))
        .filter(Boolean)
      categories.forEach((cat) => seen.add(cat))
      const ordered = [...seen].sort()
      let idx = Object.keys(colors).length
      ordered.forEach((cat) => {
        if (!colors[cat]) {
          colors[cat] = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
          idx += 1
        }
      })
      this.poiCategoryColors = colors
      if (Array.isArray(this.poiCategoryFilter) && this.poiCategoryFilter.length) {
        this.poiCategoryFilter = this.poiCategoryFilter.filter((cat) => seen.has(cat))
      }
    },

    setPoiCategoryFilter(list) {
      const next = Array.isArray(list) ? list.map((c) => normalizeCategory(c)).filter(Boolean) : []
      this.poiCategoryFilter = [...new Set(next)]
    },

    togglePoiCategoryFilter(category) {
      const cat = normalizeCategory(category)
      if (!cat) return
      const set = new Set(this.poiCategoryFilter || [])
      if (set.has(cat)) {
        set.delete(cat)
      } else {
        set.add(cat)
      }
      this.poiCategoryFilter = [...set]
    },

    clearPoiCategoryFilter() {
      this.poiCategoryFilter = []
    },

    getPoiCategoryColor(category) {
      const cat = normalizeCategory(category)
      if (!cat) return CATEGORY_COLORS[0]
      return this.poiCategoryColors?.[cat] || CATEGORY_COLORS[0]
    },

    buildRecoEventPayload(eventType, poi = null, extras = {}) {
      const auth = useAuthStore()
      const poiId = poi?.id ?? poi?.poi_id ?? extras.poi_id ?? null
      const base = {
        user_id: auth.user?.id ? Number(auth.user.id) : null,
        session_id: this.recoSessionId,
        request_id: this.recommendationRequestId || '',
        algorithm_version: this.recommendationVersion || null,
        bucket: this.recommendationBucket || null,
        route_hash: buildRouteHash({
          startLat: this.startLat,
          startLng: this.startLng,
          endLat: this.endLat,
          endLng: this.endLng,
          viaPoints: this.viaPoints,
          mode: this.recoMode,
        }),
        poi_id: poiId,
        event_type: eventType,
        mode: this.recoMode || 'driving',
        rank_position: Number.isFinite(Number(extras.rank_position))
          ? Number(extras.rank_position)
          : null,
        ts: extras.ts || new Date().toISOString(),
      }
      return { ...base, ...extras }
    },

    async logRecommendationEvent(eventType, poi = null, extras = {}) {
      const payload = this.buildRecoEventPayload(eventType, poi, extras)
      if (!payload.poi_id) return
      try {
        await fetch(apiUrl('/api/recommendation/events'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (e) {
        // ignore
      }
    },

    async logRecommendationImpressions(list) {
      const pois = Array.isArray(list) ? list : []
      if (!pois.length || !this.recommendationRequestId) return
      const events = pois
        .map((poi, index) =>
          this.buildRecoEventPayload('impression', poi, {
            rank_position: index + 1,
          })
        )
        .filter((event) => !!event.poi_id)
      if (!events.length) return
      try {
        await fetch(apiUrl('/api/recommendation/events'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: events[0].user_id,
            session_id: this.recoSessionId,
            events,
          }),
        })
      } catch (e) {
        // ignore
      }
    },

    async fetchUserInterestProfile(userId) {
      const uid = Number(userId)
      if (!Number.isFinite(uid) || !uid) {
        this.userInterestProfile = null
        return
      }

      const cached = loadInterestProfileCache(uid)
      if (cached?.data) {
        this.userInterestProfile = cached.data
      }
      if (cached?.data && !cached.stale) {
        return
      }

      this.interestProfileLoading = true
      try {
        const url = `${apiUrl('/api/recommendation/profile')}?user_id=${uid}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data?.success) {
          if (!cached?.data) this.userInterestProfile = null
          return
        }
        this.userInterestProfile = data
        saveInterestProfileCache(uid, data)
      } catch (e) {
        if (!cached?.data) this.userInterestProfile = null
      } finally {
        this.interestProfileLoading = false
      }
    },

    async fetchRecommendedPois() {
      this.isLoading = true
      try {
        const auth = useAuthStore()
        const start = `${this.startLng},${this.startLat}`
        const end = `${this.endLng},${this.endLat}`
        const via = (this.viaPoints || [])
          .filter((poi) => typeof poi?.lat === 'number' && typeof poi?.lng === 'number')
          .map((poi) => `${poi.lng},${poi.lat}`)
          .join(';')
        const params = new URLSearchParams({ start, end })
        if (via) params.set('via', via)
        if (auth.user?.id) params.set('user_id', auth.user.id)
        params.set('interest_weight', String(this.recoInterestWeight ?? 0.5))
        params.set('explore_weight', String(this.recoExploreWeight ?? 0.15))
        params.set('mode', String(this.recoMode || 'driving'))
        params.set('candidate_limit', '180')
        params.set('debug', this.recoDebugEnabled ? '1' : '0')
        params.set('session_id', this.recoSessionId)
        params.set('force_v2', '1')
        const url = `${apiUrl('/api/route/recommend')}?${params.toString()}`

        const res = await fetch(url)
        const data = await res.json()

        if (data.recommended_pois || data.recommendations) {
          this.recommendedPOIs = data.recommended_pois || data.recommendations
          this.recommendationProfile = data.profile || null
          this.recommendationRequestId = data.request_id || null
          this.recommendationBucket = data.bucket || null
          this.recommendationVersion = data.algorithm_version || null
          this.recommendationDiagnostics = data.diagnostics || null
          this.reorderRecommendedPois()
          this.refreshPoiCategoryColors()
          if (this.selectedPoi?.id !== undefined && this.selectedPoi?.id !== null) {
            const currentId = String(this.selectedPoi.id)
            const next = (this.recommendedPOIs || []).find((p) => String(p?.id) === currentId)
            if (next) {
              this.selectedPoi = { ...this.selectedPoi, ...next }
            }
          }
          this.logRecommendationImpressions(this.recommendedPOIs)
          console.log('Recommended via points loaded', this.recommendedPOIs.length)
        } else {
          console.warn('No recommendation data returned', data)
          this.recommendedPOIs = []
          this.recommendationProfile = null
          this.recommendationRequestId = null
          this.recommendationBucket = null
          this.recommendationVersion = null
          this.recommendationDiagnostics = null
        }
      } catch (err) {
        console.error('fetchRecommendedPois error:', err)
        this.recommendedPOIs = []
        this.recommendationProfile = null
        this.recommendationRequestId = null
        this.recommendationBucket = null
        this.recommendationVersion = null
        this.recommendationDiagnostics = null
      } finally {
        this.isLoading = false
      }
    },

    selectPoi(poi) {
      if (!poi) {
        this.clearSelectedPoi()
        return
      }
      this.poiDetailError = null
      this.poiDetailLoading = false
      this.selectedPoi = poi
      this.clearPreviewPoi()
      this.recordRecentPoi(poi)
      const idx = (this.recommendedPOIs || []).findIndex((item) => String(item?.id) === String(poi?.id))
      this.logRecommendationEvent('detail_view', poi, {
        rank_position: idx >= 0 ? idx + 1 : null,
      })
      const id = poi.id ?? poi.poi_id
      if (id !== undefined && id !== null && id !== '') {
        const key = String(id)
        const cached = this.poiDetailsById?.[key]
        this.selectedPoiDetail = cached || null
        this.fetchPoiDetail(id)
      } else {
        this.selectedPoiDetail = null
      }
    },

    clearSelectedPoi() {
      this.selectedPoi = null
      this.selectedPoiDetail = null
      this.poiDetailLoading = false
      this.poiDetailError = null
      this.clearPreviewPoi()
    },

    setPreviewPoi(poi) {
      if (!poi) {
        this.previewPoi = null
        return
      }
      this.previewPoi = poi
    },

    clearPreviewPoi() {
      this.previewPoi = null
    },

    recordRecentPoi(poi) {
      const item = buildPoiSummary(poi)
      if (!item) return
      const list = [...(this.recentPois || [])]
      const existing = list.findIndex((p) => p.key === item.key)
      if (existing >= 0) list.splice(existing, 1)
      list.unshift(item)
      const trimmed = list.slice(0, MAX_RECENT_POIS)
      this.recentPois = trimmed
      saveRecentPois(trimmed)
    },

    clearRecentPois() {
      this.recentPois = []
      saveRecentPois([])
    },

    toggleSavedPoi(poi) {
      const item = buildPoiSummary(poi)
      if (!item) return
      const list = [...(this.savedPois || [])]
      const existing = list.findIndex((p) => p.key === item.key)
      if (existing >= 0) {
        list.splice(existing, 1)
        this.logRecommendationEvent('dismiss', poi)
      } else {
        list.unshift(item)
        this.logRecommendationEvent('save', poi)
      }
      this.savedPois = list
      saveSavedPois(list)
    },

    removeSavedPoi(key) {
      if (!key) return
      this.savedPois = (this.savedPois || []).filter((p) => p.key !== key)
      saveSavedPois(this.savedPois)
    },

    isPoiSaved(poi) {
      const key = getPoiKey(poi)
      if (!key) return false
      return (this.savedPois || []).some((item) => item.key === key)
    },

    selectAdjacentPoi(step = 1) {
      const list = this.filteredRecommendedPOIs || this.recommendedPOIs || []
      if (!Array.isArray(list) || list.length === 0) return
      const currentKey = getPoiKey(this.selectedPoi)
      let idx = currentKey
        ? list.findIndex((p) => getPoiKey(p) === currentKey)
        : -1
      if (idx < 0) idx = 0
      else idx = (idx + step + list.length) % list.length
      const next = list[idx]
      if (next) {
        this.selectPoi(next)
        if (typeof next.lat === 'number' && typeof next.lng === 'number') {
          this.requestFocusPoint(next.lat, next.lng, 16)
        }
      }
    },

    async fetchPoiDetail(poiId) {
      const key = poiId !== undefined && poiId !== null ? String(poiId) : ''
      if (!key) return
      if (this.poiDetailsById?.[key]) {
        this.selectedPoiDetail = this.poiDetailsById[key]
        return
      }

      const seq = (poiDetailRequestSeq += 1)
      this.poiDetailLoading = true
      this.poiDetailError = null
      try {
        const res = await fetch(`${POI_API_BASE}/${encodeURIComponent(key)}`)
        const data = await res.json()
        if (!res.ok || !data?.success) {
          this.poiDetailError = data?.message || 'Failed to load place details.'
          return
        }
        if (!data?.data) return
        this.poiDetailsById = { ...(this.poiDetailsById || {}), [key]: data.data }
        if (this.selectedPoi?.id !== undefined && this.selectedPoi?.id !== null) {
          const currentId = String(this.selectedPoi.id)
          if (currentId === key) {
            this.selectedPoiDetail = data.data
          }
        }
      } catch (e) {
        this.poiDetailError = 'Failed to load place details.'
      } finally {
        if (seq === poiDetailRequestSeq) {
          this.poiDetailLoading = false
        }
      }
    },

    setHoveredStep(index, source = null) {
      this.hoveredStepIndex = typeof index === 'number' ? index : null
      this.hoveredStepSource = source
    },

    clearHoveredStep(source = null) {
      if (!source || this.hoveredStepSource === source) {
        this.hoveredStepIndex = null
        this.hoveredStepSource = null
      }
    },

    setPinnedStep(index, source = null) {
      this.pinnedStepIndex = typeof index === 'number' ? index : null
      this.pinnedStepSource = source
    },

    clearPinnedStep(source = null) {
      if (!source || this.pinnedStepSource === source) {
        this.pinnedStepIndex = null
        this.pinnedStepSource = null
      }
    },

    togglePinnedStep(index, source = null) {
      if (typeof index !== 'number') return
      if (this.pinnedStepIndex === index) {
        this.clearPinnedStep()
      } else {
        this.setPinnedStep(index, source)
      }
    },

    requestFitRoute() {
      this.fitRouteNonce += 1
    },

    requestFocusPoint(lat, lng, zoom = 15) {
      if (typeof lat !== 'number' || typeof lng !== 'number') return
      this.focusPoint = { lat, lng, zoom }
      this.focusPointNonce += 1
    },
  },
})
