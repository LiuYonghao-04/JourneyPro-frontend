import { defineStore } from 'pinia'
import L from 'leaflet'
import { useAuthStore } from './authStore'

const STORAGE_KEY = 'jp_via_points'
const RECO_WEIGHT_KEY = 'jp_reco_interest_weight'
const POI_API_BASE = 'http://localhost:3001/api/poi'
const SAVED_POI_KEY = 'jp_saved_pois'
const RECENT_POI_KEY = 'jp_recent_pois'
const MAX_RECENT_POIS = 12
const CATEGORY_COLORS = ['#2563eb', '#10b981', '#f97316', '#a855f7', '#f59e0b', '#06b6d4', '#22c55e', '#ef4444']
const PANEL_MODES = ['collapsed', 'half', 'full']

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

    async fetchRecoSettingsFromServer(userId) {
      const uid = Number(userId)
      if (!Number.isFinite(uid) || !uid) return

      try {
        const url = `http://localhost:3001/api/recommendation/settings?user_id=${uid}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data?.success) return

        const raw = Number(data.interest_weight)
        if (!Number.isFinite(raw)) return
        const normalized = raw > 1 ? raw / 100 : raw
        // Apply server value without scheduling a save back.
        this.recoInterestWeight = clamp(normalized, 0, 1)
        saveRecoInterestWeight(this.recoInterestWeight)
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
        await fetch('http://localhost:3001/api/recommendation/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            interest_weight: this.recoInterestWeight ?? 0.5,
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
      const compute = (p) =>
        (Number(p?.distance_score) || 0) * dw + (Number(p?.interest_score) || 0) * iw

      this.recommendedPOIs = [...this.recommendedPOIs].sort((a, b) => {
        const sa = compute(a)
        const sb = compute(b)
        if (sb !== sa) return sb - sa
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

    async fetchUserInterestProfile(userId) {
      const uid = Number(userId)
      if (!Number.isFinite(uid) || !uid) {
        this.userInterestProfile = null
        return
      }

      this.interestProfileLoading = true
      try {
        const url = `http://localhost:3001/api/recommendation/profile?user_id=${uid}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok || !data?.success) {
          this.userInterestProfile = null
          return
        }
        this.userInterestProfile = data
      } catch (e) {
        this.userInterestProfile = null
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
        const url = `http://localhost:3001/api/route/recommend?${params.toString()}`

        const res = await fetch(url)
        const data = await res.json()

        if (data.recommended_pois || data.recommendations) {
          this.recommendedPOIs = data.recommended_pois || data.recommendations
          this.recommendationProfile = data.profile || null
          this.reorderRecommendedPois()
          this.refreshPoiCategoryColors()
          if (this.selectedPoi?.id !== undefined && this.selectedPoi?.id !== null) {
            const currentId = String(this.selectedPoi.id)
            const next = (this.recommendedPOIs || []).find((p) => String(p?.id) === currentId)
            if (next) {
              this.selectedPoi = { ...this.selectedPoi, ...next }
            }
          }
          console.log('Recommended via points loaded', this.recommendedPOIs.length)
        } else {
          console.warn('No recommendation data returned', data)
          this.recommendedPOIs = []
          this.recommendationProfile = null
        }
      } catch (err) {
        console.error('fetchRecommendedPois error:', err)
        this.recommendedPOIs = []
        this.recommendationProfile = null
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
      } else {
        list.unshift(item)
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
