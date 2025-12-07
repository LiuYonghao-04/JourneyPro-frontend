import { defineStore } from 'pinia'
import L from 'leaflet'

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
    recommendedPOIs: [],
    isLoading: false,
    viaPoints: [],
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
      if (!window._osrmControl) {
        console.warn('OSRM control is not ready')
        return
      }

      window._osrmControl.setWaypoints(this.buildWaypoints())

      // Update distance/duration once for the latest route
      window._osrmControl.once('routesfound', (e) => {
        const route = e.routes[0]
        this.totalDistance = (route.summary.totalDistance / 1000).toFixed(2)
        this.totalDuration = (route.summary.totalTime / 60).toFixed(1)
        console.log('Route updated with via points:', this.totalDistance, 'km')
      })
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
        this.applyWaypointsToControl()
      }
    },

    clearViaPoints() {
      if (this.viaPoints.length === 0) return
      this.viaPoints = []
      this.applyWaypointsToControl()
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
  },
})
