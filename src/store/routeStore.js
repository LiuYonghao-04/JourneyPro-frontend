import { defineStore } from 'pinia'
import L from 'leaflet'

const STORAGE_KEY = 'jp_via_points'

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

    async fetchRecommendedPois() {
      this.isLoading = true
      try {
        const start = `${this.startLng},${this.startLat}`
        const end = `${this.endLng},${this.endLat}`
        const url = `http://localhost:3001/api/route/recommend?start=${start}&end=${end}`

        const res = await fetch(url)
        const data = await res.json()

        if (data.recommended_pois || data.recommendations) {
          this.recommendedPOIs = data.recommended_pois || data.recommendations
          console.log('Recommended via points loaded', this.recommendedPOIs.length)
        } else {
          console.warn('No recommendation data returned', data)
        }
      } catch (err) {
        console.error('fetchRecommendedPois error:', err)
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
