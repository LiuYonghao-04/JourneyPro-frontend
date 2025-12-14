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
let highlightSegmentLayer = null
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

let routeCoords = []
let routeCoordsVersion = 0
const stepRouteIdxCache = new Map()
let lastCenteredStepIndex = null

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

const setRouteCoordsFromGeometry = (geometry) => {
  const coords = []
  if (!geometry) {
    routeCoords = []
    routeCoordsVersion += 1
    stepRouteIdxCache.clear()
    return
  }

  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    coords.push(...geometry.coordinates)
  } else if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((line) => {
      if (Array.isArray(line)) coords.push(...line)
    })
  }

  routeCoords = coords
    .filter((c) => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number")
    .map((c) => ({ lng: c[0], lat: c[1] }))
  routeCoordsVersion += 1
  stepRouteIdxCache.clear()
}

const getNearestRouteIndexForStep = (idx) => {
  if (!routeCoords || routeCoords.length === 0) return null
  const step = routeStore.steps?.[idx]
  if (!step || !Array.isArray(step.location)) return null
  const [lng, lat] = step.location
  if (typeof lat !== "number" || typeof lng !== "number") return null

  const cached = stepRouteIdxCache.get(idx)
  if (cached && cached.v === routeCoordsVersion) return cached.i

  let bestIdx = 0
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < routeCoords.length; i += 1) {
    const p = routeCoords[i]
    const dLat = p.lat - lat
    const dLng = p.lng - lng
    const d = dLat * dLat + dLng * dLng
    if (d < best) {
      best = d
      bestIdx = i
    }
  }
  stepRouteIdxCache.set(idx, { v: routeCoordsVersion, i: bestIdx })
  return bestIdx
}

const getStepSegmentLatLngs = (idx) => {
  const step = routeStore.steps?.[idx]
  if (!step) return null

  // Prefer per-step geometry if OSRM provides it.
  if (step.geometry && step.geometry.type === "LineString" && Array.isArray(step.geometry.coordinates)) {
    const seg = step.geometry.coordinates
      .filter((c) => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number")
      .map((c) => [c[1], c[0]])
    if (seg.length >= 2) return seg
  }

  const nextIdx = idx + 1 < (routeStore.steps?.length || 0) ? idx + 1 : null
  const prevIdx = idx - 1 >= 0 ? idx - 1 : null

  const startRouteIdx = getNearestRouteIndexForStep(idx)
  const endRouteIdx = nextIdx !== null ? getNearestRouteIndexForStep(nextIdx) : null

  if (startRouteIdx !== null && endRouteIdx !== null && endRouteIdx >= startRouteIdx) {
    const seg = routeCoords.slice(startRouteIdx, endRouteIdx + 1).map((p) => [p.lat, p.lng])
    if (seg.length >= 2) return seg
  }

  // Fallback to a small line between maneuver locations.
  const a = step.location
  const bStep = nextIdx !== null ? routeStore.steps?.[nextIdx] : prevIdx !== null ? routeStore.steps?.[prevIdx] : null
  const b = bStep?.location
  if (Array.isArray(a) && Array.isArray(b)) {
    return [
      [a[1], a[0]],
      [b[1], b[0]],
    ]
  }
  return null
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
  interactive: false,
})

const updateHoverVisuals = () => {
  if (!map.value) return
  const idx = routeStore.hoveredStepIndex

  if (routeLayer) routeLayer.setStyle(getRouteBaseStyle())

  if (idx === null || idx === undefined) {
    if (highlightMarker) {
      map.value.removeLayer(highlightMarker)
      highlightMarker = null
    }
    if (highlightSegmentLayer) {
      map.value.removeLayer(highlightSegmentLayer)
      highlightSegmentLayer = null
    }
    lastCenteredStepIndex = null
    return
  }
  const step = routeStore.steps?.[idx]
  if (!step || !Array.isArray(step.location)) return
  const [lng, lat] = step.location
  if (typeof lat !== "number" || typeof lng !== "number") return

  const seg = getStepSegmentLatLngs(idx)
  if (seg && seg.length >= 2) {
    if (!highlightSegmentLayer) {
      highlightSegmentLayer = L.polyline(seg, getRouteHighlightStyle()).addTo(map.value)
    } else {
      highlightSegmentLayer.setLatLngs(seg)
      highlightSegmentLayer.setStyle(getRouteHighlightStyle())
    }
  } else if (highlightSegmentLayer) {
    map.value.removeLayer(highlightSegmentLayer)
    highlightSegmentLayer = null
  }

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

  if (routeStore.hoveredStepSource === "list" && lastCenteredStepIndex !== idx) {
    lastCenteredStepIndex = idx
    map.value.panTo([lat, lng], { animate: true, duration: 0.35 })
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
      setRouteCoordsFromGeometry(geojson.geometry)
      map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
      updateHoverVisuals()
    },
    { deep: true }
  )

  watch(
    () => [routeStore.hoveredStepIndex, routeStore.hoveredStepSource],
    () => updateHoverVisuals()
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
