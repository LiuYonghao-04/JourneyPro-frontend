import { defineStore } from 'pinia'
import L from 'leaflet'
import { useAuthStore } from './authStore'

const STORAGE_KEY = 'jp_via_points'
const RECO_WEIGHT_KEY = 'jp_reco_interest_weight'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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
    recommendationProfile: null,
    recoInterestWeight: loadRecoInterestWeight(),
    userInterestProfile: null,
    interestProfileLoading: false,
    isLoading: false,
    isRouting: false,
    routeError: null,
    viaPoints: loadViaPoints(),
    followRoute: true,
    hoveredStepIndex: null,
    hoveredStepSource: null,
    pinnedStepIndex: null,
    pinnedStepSource: null,
    fitRouteNonce: 0,
    focusPoint: null,
    focusPointNonce: 0,
  }),

  actions: {
    setStart(lat, lng) {
      this.startLat = lat
      this.startLng = lng
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
