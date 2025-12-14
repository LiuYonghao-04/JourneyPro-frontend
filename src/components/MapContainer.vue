<script setup>
import axios from "axios"
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import { useRoute } from "vue-router"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useRouteStore } from "../store/routeStore"

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const map = ref(null)
const routeStore = useRouteStore()
let startMarker = null
let endMarker = null
let poiLayer = null
let routeLayer = null
let baseLayer = null
let highlightMarker = null
const route = useRoute()

const theme = ref(document.body.getAttribute("data-theme") || "dark")
let themeObserver = null
let currentAttribution = null
const BASE_LAYER_CONFIG = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "(c) OpenStreetMap contributors | Carto",
  },
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "(c) OpenStreetMap contributors",
  },
}

const buildWaypointList = () => [
  L.latLng(routeStore.startLat, routeStore.startLng),
  ...(routeStore.viaPoints || []).map((poi) => L.latLng(poi.lat, poi.lng)),
  L.latLng(routeStore.endLat, routeStore.endLng),
]

function createColoredMarker(color, position, onDrag) {
  const markerHtml = `<div style="background-color:${color};
    width:18px;height:18px;border-radius:50%;
    border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`

  const marker = L.marker(position, {
    draggable: true,
    icon: L.divIcon({
      className: "custom-marker",
      html: markerHtml,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  })

  if (onDrag) marker.on("dragend", onDrag)
  return marker
}

const applyBaseLayer = () => {
  if (!map.value || !baseLayer || !map.value._loaded) return
  const cfg = theme.value === "dark" ? BASE_LAYER_CONFIG.dark : BASE_LAYER_CONFIG.light
  if (baseLayer._url !== cfg.url) {
    const attributionControl = map.value.attributionControl
    if (attributionControl && currentAttribution) {
      attributionControl.removeAttribution(currentAttribution)
    }
    baseLayer.setUrl(cfg.url)
    baseLayer.options.attribution = cfg.attribution
    currentAttribution = cfg.attribution
    if (attributionControl) {
      attributionControl.addAttribution(currentAttribution)
    }
  }
  // Prevent tile/overlay drift after any layout changes.
  requestAnimationFrame(() => map.value && map.value.invalidateSize(false))
  setTimeout(() => map.value && map.value.invalidateSize(false), 120)
}

const fetchRoute = async () => {
  if (!map.value) return
  const waypoints = buildWaypointList()
  if (waypoints.length < 2) return
  const coordStr = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(";")
  try {
    const res = await axios.get(
      `/osrm/route/v1/driving/${coordStr}?alternatives=false&overview=full&geometries=geojson&steps=true&annotations=true`
    )
    const routeData = res.data?.routes?.[0]
    if (!routeData) return

    routeStore.totalDistance = (routeData.distance / 1000).toFixed(2)
    routeStore.totalDuration = (routeData.duration / 60).toFixed(1)
    routeStore.routeGeojson = { type: "Feature", geometry: routeData.geometry }
    const viaList = routeStore.viaPoints || []
    const steps = []
    ;(routeData.legs || []).forEach((leg, legIndex) => {
      ;(leg.steps || []).forEach((s, stepIndex) => {
        const maneuver = s.maneuver || {}
        const type = (maneuver.type || "go").toString().toLowerCase()
        const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : ""
        const road = s.name ? ` onto ${s.name}` : ""
        const instruction =
          maneuver.instruction || `${maneuver.type || "Go"}${modifier}${road}`.trim()

        const location = Array.isArray(maneuver.location) ? maneuver.location : null // [lng, lat]

        const item = {
          instruction,
          road: s.name || "",
          distance: (s.distance / 1000).toFixed(2),
          duration: Math.round(s.duration / 60),
          maneuverType: type,
          legIndex,
          stepIndex,
          location,
        }

        if (type === "arrive") {
          if (legIndex < viaList.length) {
            item.arrivalKind = "waypoint"
            item.arrivalName = viaList[legIndex]?.name || `Waypoint ${legIndex + 1}`
          } else {
            item.arrivalKind = "destination"
            item.arrivalName = "Destination"
          }
        }

        steps.push(item)
      })
    })
    routeStore.steps = steps
  } catch (e) {
    console.warn("Route fetch failed", e)
  }
}

const getRouteBaseStyle = () => ({
  color: theme.value === "dark" ? "#3b82f6" : "#2563eb",
  weight: 6,
  opacity: 0.9,
  interactive: true,
})

const getRouteHighlightStyle = () => ({
  color: "#f97316",
  weight: 7,
  opacity: 0.95,
  interactive: true,
})

const updateHoverVisuals = () => {
  if (!map.value) return
  const idx = routeStore.hoveredStepIndex

  if (routeLayer) {
    routeLayer.setStyle(idx === null ? getRouteBaseStyle() : getRouteHighlightStyle())
  }

  if (idx === null || idx === undefined) {
    if (highlightMarker) {
      map.value.removeLayer(highlightMarker)
      highlightMarker = null
    }
    return
  }
  const step = routeStore.steps?.[idx]
  if (!step || !Array.isArray(step.location)) return
  const [lng, lat] = step.location
  if (typeof lat !== "number" || typeof lng !== "number") return

  if (!highlightMarker) {
    highlightMarker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#f97316",
      weight: 3,
      fillColor: "#f97316",
      fillOpacity: 0.6,
    }).addTo(map.value)
  } else {
    highlightMarker.setLatLng([lat, lng])
  }
}

let routeHoverRAF = null
let lastRouteHoverLatLng = null
const findNearestStepIndex = (latlng) => {
  if (!map.value || !routeStore.steps || routeStore.steps.length === 0) return null
  let bestIdx = null
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < routeStore.steps.length; i += 1) {
    const s = routeStore.steps[i]
    if (!s || !Array.isArray(s.location)) continue
    const [lng, lat] = s.location
    if (typeof lat !== "number" || typeof lng !== "number") continue
    const d = map.value.distance(latlng, L.latLng(lat, lng))
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

const handleRouteMouseMove = (evt) => {
  if (!evt?.latlng) return
  lastRouteHoverLatLng = evt.latlng
  if (routeHoverRAF) return
  routeHoverRAF = requestAnimationFrame(() => {
    routeHoverRAF = null
    if (!lastRouteHoverLatLng) return
    const idx = findNearestStepIndex(lastRouteHoverLatLng)
    if (typeof idx === "number") {
      routeStore.setHoveredStep(idx, "map")
    }
  })
}

const handleRouteMouseOut = () => {
  lastRouteHoverLatLng = null
  routeStore.clearHoveredStep("map")
}

onMounted(() => {
  map.value = L.map("map", { zoomControl: false }).setView(
    [routeStore.startLat, routeStore.startLng],
    13
  )

  const initialCfg = theme.value === "dark" ? BASE_LAYER_CONFIG.dark : BASE_LAYER_CONFIG.light
  baseLayer = L.tileLayer(initialCfg.url, {
    maxZoom: 19,
    attribution: initialCfg.attribution,
  })
  currentAttribution = initialCfg.attribution
  baseLayer.addTo(map.value)

  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute("data-theme") || "dark"
    applyBaseLayer()
    updateHoverVisuals()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] })

  async function reverseGeocode(lat, lng) {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
      )
      return res.data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (e) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  startMarker = createColoredMarker("green", [routeStore.startLat, routeStore.startLng], async () => {
    const pos = startMarker.getLatLng()
    routeStore.setStart(pos.lat, pos.lng)
    const addr = await reverseGeocode(pos.lat, pos.lng)
    routeStore.startAddress = addr
    fetchRoute()
  })

  endMarker = createColoredMarker("red", [routeStore.endLat, routeStore.endLng], async () => {
    const pos = endMarker.getLatLng()
    routeStore.setEnd(pos.lat, pos.lng)
    const addr = await reverseGeocode(pos.lat, pos.lng)
    routeStore.endAddress = addr
    fetchRoute()
  })

  startMarker.addTo(map.value)
  endMarker.addTo(map.value)

  fetchRoute()

  watch(
    () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
    async () => {
      startMarker.setLatLng([routeStore.startLat, routeStore.startLng])
      endMarker.setLatLng([routeStore.endLat, routeStore.endLng])
      fetchRoute()
      await routeStore.fetchRecommendedPois()
    }
  )

  watch(
    () => routeStore.viaPoints.map((poi) => `${poi.lat},${poi.lng}`),
    () => {
      fetchRoute()
    },
    { deep: true }
  )

  poiLayer = L.layerGroup()
  let updateTimeout = null
  watch(
    () => routeStore.recommendedPOIs,
    (pois) => {
      if (!map.value) return
      clearTimeout(updateTimeout)

      updateTimeout = setTimeout(() => {
        if (!map.value) return
        poiLayer.clearLayers()

        if (!pois || pois.length === 0) return

        const poiIcon = L.icon({
          iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [0, -32],
          shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
        })

        pois.forEach((poi) => {
          if (typeof poi.lat !== "number" || typeof poi.lng !== "number") return

          const marker = L.marker([poi.lat, poi.lng], {
            icon: poiIcon,
            title: poi.name,
          }).bindPopup(`<b>${poi.name}</b><br>${poi.category || ""}`)

          marker.on("click", () => {
            if (!map.value) return
            map.value.setView([poi.lat, poi.lng], 15, { animate: true })
            marker.openPopup()
          })

          poiLayer.addLayer(marker)
        })

        if (map.value && !map.value.hasLayer(poiLayer)) {
          poiLayer.addTo(map.value)
        }
      }, 300)
    },
    { deep: true }
  )

  watch(
    () => routeStore.routeGeojson,
    (geojson) => {
      if (!geojson || !map.value || !geojson.geometry) return
      if (routeLayer) map.value.removeLayer(routeLayer)
      routeLayer = L.geoJSON(geojson.geometry, { style: getRouteBaseStyle() }).addTo(map.value)
      routeLayer.on("mousemove", handleRouteMouseMove)
      routeLayer.on("mouseout", handleRouteMouseOut)
      map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
      updateHoverVisuals()
    },
    { deep: true }
  )

  watch(
    () => routeStore.hoveredStepIndex,
    () => {
      updateHoverVisuals()
    }
  )

  watch(
    () => route.query,
    () => {
      const lat = route.query.poi_lat ? Number(route.query.poi_lat) : null
      const lng = route.query.poi_lng ? Number(route.query.poi_lng) : null
      if (map.value && typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        map.value.setView([lat, lng], 15)
        const marker = L.marker([lat, lng]).addTo(map.value)
        marker.bindPopup(route.query.poi_name || "Selected POI").openPopup()
      }
      if (route.query.poi_lat && route.query.poi_lng && route.query.poi_id) {
        routeStore.addViaPoint({
          id: Number(route.query.poi_id) || route.query.poi_id,
          name: route.query.poi_name || "POI",
          lat: Number(route.query.poi_lat),
          lng: Number(route.query.poi_lng),
        })
      }
    },
    { immediate: true }
  )
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})
</script>

<template>
  <div id="map" class="map-canvas"></div>
</template>

<style scoped>
.map-canvas {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
