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
let viaMarkerLayer = null
let routeLayer = null
let baseLayer = null
let highlightMarker = null
let highlightSegmentLayer = null
let pinnedMarker = null
let pinnedSegmentLayer = null
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
let stepRouteIndices = []
let stepRouteIndicesMonotonic = true
let lastCenteredStepIndex = null
let routeAbortController = null
let routeRequestSeq = 0
let routeFetchTimer = null

const refreshLayerPositions = (layer) => {
  if (!layer) return

  try {
    if (typeof layer.getLatLng === "function" && typeof layer.setLatLng === "function") {
      layer.setLatLng(layer.getLatLng())
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof layer.redraw === "function") layer.redraw()
  } catch (e) {
    // ignore
  }

  try {
    if (typeof layer.eachLayer === "function") {
      layer.eachLayer((child) => refreshLayerPositions(child))
    }
  } catch (e) {
    // ignore
  }
}

const refreshOverlayLayers = () => {
  refreshLayerPositions(routeLayer)
  refreshLayerPositions(startMarker)
  refreshLayerPositions(endMarker)
  refreshLayerPositions(viaMarkerLayer)
  refreshLayerPositions(poiLayer)
  refreshLayerPositions(highlightMarker)
  refreshLayerPositions(highlightSegmentLayer)
  refreshLayerPositions(pinnedMarker)
  refreshLayerPositions(pinnedSegmentLayer)
}

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

const createWaypointIcon = (label) =>
  L.divIcon({
    className: "jp-waypoint-icon",
    html: `<div class="jp-waypoint-badge">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

const updateViaMarkers = () => {
  if (!map.value || !viaMarkerLayer) return
  viaMarkerLayer.clearLayers()
  const list = routeStore.viaPoints || []
  list.forEach((poi, idx) => {
    if (!poi || typeof poi.lat !== "number" || typeof poi.lng !== "number") return
    const title = poi.name || `Waypoint ${idx + 1}`
    const marker = L.marker([poi.lat, poi.lng], {
      icon: createWaypointIcon(idx + 1),
      title,
      keyboard: false,
    })
    marker.bindTooltip(title, {
      direction: "top",
      offset: [0, -10],
      opacity: 0.95,
      className: "jp-map-tooltip",
    })
    marker.on("click", () => {
      if (!map.value) return
      map.value.setView([poi.lat, poi.lng], Math.max(map.value.getZoom(), 15), { animate: true })
    })
    viaMarkerLayer.addLayer(marker)
  })
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

    baseLayer.once("load", () => {
      if (!map.value) return
      requestAnimationFrame(() => {
        if (!map.value) return
        map.value.invalidateSize(false)
        refreshOverlayLayers()
      })
    })
  }
  // Prevent tile/overlay drift after any layout changes.
  requestAnimationFrame(() => {
    if (!map.value) return
    map.value.invalidateSize(false)
    refreshOverlayLayers()
  })
  setTimeout(() => {
    if (!map.value) return
    map.value.invalidateSize(false)
    refreshOverlayLayers()
  }, 120)
}

const fetchRoute = async () => {
  if (!map.value) return
  const waypoints = buildWaypointList()
  if (waypoints.length < 2) return
  const coordStr = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(";")
  const seq = (routeRequestSeq += 1)
  if (routeAbortController) {
    try {
      routeAbortController.abort()
    } catch (e) {
      // ignore
    }
  }
  routeAbortController = new AbortController()
  routeStore.isRouting = true
  routeStore.routeError = null
  try {
    const res = await axios.get(
      `/osrm/route/v1/driving/${coordStr}?alternatives=false&overview=full&geometries=geojson&steps=true&annotations=true`,
      { signal: routeAbortController.signal }
    )
    const routeData = res.data?.routes?.[0]
    if (!routeData) return

    routeStore.totalDistance = (routeData.distance / 1000).toFixed(2)
    routeStore.totalDuration = (routeData.duration / 60).toFixed(1)
    routeStore.routeGeojson = { type: "Feature", geometry: routeData.geometry }
    const viaList = routeStore.viaPoints || []
    routeStore.legs = (routeData.legs || []).map((leg, idx) => {
      const from = idx === 0 ? "Start" : viaList[idx - 1]?.name || `Waypoint ${idx}`
      const to = idx < viaList.length ? viaList[idx]?.name || `Waypoint ${idx + 1}` : "Destination"
      return {
        index: idx,
        from,
        to,
        distance: (leg.distance / 1000).toFixed(2),
        duration: Math.round(leg.duration / 60),
      }
    })
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
          modifier: maneuver.modifier || "",
          legIndex,
          stepIndex,
          location,
          geometry: s.geometry || null,
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
    routeStore.clearHoveredStep()
    routeStore.clearPinnedStep()
    routeStore.steps = steps
  } catch (e) {
    if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return
    console.warn("Route fetch failed", e)
    routeStore.routeError = "Route request failed."
  } finally {
    if (seq === routeRequestSeq) {
      routeStore.isRouting = false
    }
  }
}

const scheduleFetchRoute = (delayMs = 120) => {
  if (routeFetchTimer) clearTimeout(routeFetchTimer)
  routeFetchTimer = setTimeout(() => {
    routeFetchTimer = null
    fetchRoute()
  }, delayMs)
}

const setRouteCoordsFromGeometry = (geometry) => {
  const coords = []
  if (!geometry) {
    routeCoords = []
    routeCoordsVersion += 1
    stepRouteIdxCache.clear()
    stepRouteIndices = []
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
  stepRouteIndices = []
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

const rebuildStepRouteIndices = () => {
  if (!routeCoords || routeCoords.length === 0) {
    stepRouteIndices = []
    return
  }
  if (!routeStore.steps || routeStore.steps.length === 0) {
    stepRouteIndices = []
    return
  }

  const indices = []
  for (let i = 0; i < routeStore.steps.length; i += 1) {
    const ri = getNearestRouteIndexForStep(i)
    if (typeof ri !== "number") {
      stepRouteIndices = []
      return
    }
    indices.push(ri)
  }

  let mono = true
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] < indices[i - 1]) {
      mono = false
      break
    }
  }
  stepRouteIndices = indices
  stepRouteIndicesMonotonic = mono
}

const findNearestRouteIndex = (latlng) => {
  if (!routeCoords || routeCoords.length === 0 || !latlng) return null
  let bestIdx = 0
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < routeCoords.length; i += 1) {
    const p = routeCoords[i]
    const dLat = p.lat - latlng.lat
    const dLng = p.lng - latlng.lng
    const d = dLat * dLat + dLng * dLng
    if (d < best) {
      best = d
      bestIdx = i
    }
  }
  return bestIdx
}

const findStepIndexByRouteIndex = (routeIdx) => {
  if (!stepRouteIndices || stepRouteIndices.length === 0) return null
  if (typeof routeIdx !== "number") return null

  if (stepRouteIndicesMonotonic) {
    let lo = 0
    let hi = stepRouteIndices.length - 1
    let best = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (stepRouteIndices[mid] <= routeIdx) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return best
  }

  let best = 0
  let bestDiff = Number.POSITIVE_INFINITY
  for (let i = 0; i < stepRouteIndices.length; i += 1) {
    const diff = Math.abs(stepRouteIndices[i] - routeIdx)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
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

const getRoutePinnedStyle = () => ({
  color: "#a855f7",
  weight: 7,
  opacity: 0.85,
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
      interactive: false,
    }).addTo(map.value)
  } else {
    highlightMarker.setLatLng([lat, lng])
  }

  if (routeStore.hoveredStepSource === "list" && lastCenteredStepIndex !== idx) {
    lastCenteredStepIndex = idx
    map.value.panTo([lat, lng], { animate: true, duration: 0.35 })
  }
}

const updatePinnedVisuals = () => {
  if (!map.value) return
  const idx = routeStore.pinnedStepIndex

  if (idx === null || idx === undefined) {
    if (pinnedMarker) {
      map.value.removeLayer(pinnedMarker)
      pinnedMarker = null
    }
    if (pinnedSegmentLayer) {
      map.value.removeLayer(pinnedSegmentLayer)
      pinnedSegmentLayer = null
    }
    return
  }

  const step = routeStore.steps?.[idx]
  if (!step || !Array.isArray(step.location)) return
  const [lng, lat] = step.location
  if (typeof lat !== "number" || typeof lng !== "number") return

  const seg = getStepSegmentLatLngs(idx)
  if (seg && seg.length >= 2) {
    if (!pinnedSegmentLayer) {
      pinnedSegmentLayer = L.polyline(seg, getRoutePinnedStyle()).addTo(map.value)
    } else {
      pinnedSegmentLayer.setLatLngs(seg)
      pinnedSegmentLayer.setStyle(getRoutePinnedStyle())
    }
  } else if (pinnedSegmentLayer) {
    map.value.removeLayer(pinnedSegmentLayer)
    pinnedSegmentLayer = null
  }

  if (!pinnedMarker) {
    pinnedMarker = L.circleMarker([lat, lng], {
      radius: 6,
      color: "#a855f7",
      weight: 3,
      fillColor: "#a855f7",
      fillOpacity: 0.45,
      interactive: false,
    }).addTo(map.value)
  } else {
    pinnedMarker.setLatLng([lat, lng])
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
    const routeIdx = findNearestRouteIndex(lastRouteHoverLatLng)
    const idx =
      typeof routeIdx === "number"
        ? findStepIndexByRouteIndex(routeIdx)
        : findNearestStepIndex(lastRouteHoverLatLng)
    if (typeof idx === "number") {
      routeStore.setHoveredStep(idx, "map")
    }
  })
}

const handleRouteMouseOut = () => {
  lastRouteHoverLatLng = null
  routeStore.clearHoveredStep("map")
}

const handleRouteClick = (evt) => {
  if (!evt?.latlng) return
  const routeIdx = findNearestRouteIndex(evt.latlng)
  const idx =
    typeof routeIdx === "number"
      ? findStepIndexByRouteIndex(routeIdx)
      : findNearestStepIndex(evt.latlng)
  if (typeof idx === "number") {
    routeStore.togglePinnedStep(idx, "map")
  }
}

onMounted(() => {
  map.value = L.map("map", { zoomControl: false }).setView(
    [routeStore.startLat, routeStore.startLng],
    13
  )

  map.value.on("dragstart", (e) => {
    if (e?.originalEvent) routeStore.followRoute = false
  })
  map.value.on("zoomstart", (e) => {
    if (e?.originalEvent) routeStore.followRoute = false
  })
  map.value.on("zoomend", () => {
    refreshOverlayLayers()
  })
  map.value.on("resize", () => {
    refreshOverlayLayers()
  })

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
    updatePinnedVisuals()
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
  })

  endMarker = createColoredMarker("red", [routeStore.endLat, routeStore.endLng], async () => {
    const pos = endMarker.getLatLng()
    routeStore.setEnd(pos.lat, pos.lng)
    const addr = await reverseGeocode(pos.lat, pos.lng)
    routeStore.endAddress = addr
  })

  startMarker.bindTooltip("Start", {
    direction: "top",
    offset: [0, -10],
    opacity: 0.95,
    className: "jp-map-tooltip",
  })
  endMarker.bindTooltip("End", {
    direction: "top",
    offset: [0, -10],
    opacity: 0.95,
    className: "jp-map-tooltip",
  })

  startMarker.addTo(map.value)
  endMarker.addTo(map.value)

  viaMarkerLayer = L.layerGroup().addTo(map.value)
  updateViaMarkers()

  scheduleFetchRoute(0)

  watch(
    () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
    async () => {
      startMarker.setLatLng([routeStore.startLat, routeStore.startLng])
      endMarker.setLatLng([routeStore.endLat, routeStore.endLng])
      scheduleFetchRoute()
      await routeStore.fetchRecommendedPois()
    }
  )

  watch(
    () => routeStore.viaPoints.map((poi) => `${poi.lat},${poi.lng}`),
    () => {
      updateViaMarkers()
      scheduleFetchRoute()
      routeStore.fetchRecommendedPois()
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
      routeLayer.on("click", handleRouteClick)
      setRouteCoordsFromGeometry(geojson.geometry)
      rebuildStepRouteIndices()
      if (routeStore.followRoute) {
        map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
      }
      updateHoverVisuals()
      updatePinnedVisuals()
      refreshOverlayLayers()
    },
    { deep: true }
  )

  watch(
    () => routeStore.steps,
    () => {
      rebuildStepRouteIndices()
    }
  )

  watch(
    () => [routeStore.hoveredStepIndex, routeStore.hoveredStepSource],
    () => updateHoverVisuals()
  )

  watch(
    () => [routeStore.pinnedStepIndex, routeStore.pinnedStepSource],
    () => updatePinnedVisuals()
  )

  watch(
    () => routeStore.fitRouteNonce,
    () => {
      if (!map.value || !routeLayer) return
      try {
        map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30], animate: true })
      } catch (e) {
        // ignore
      }
    }
  )

  watch(
    () => routeStore.focusPointNonce,
    () => {
      if (!map.value || !routeStore.focusPoint) return
      const { lat, lng, zoom } = routeStore.focusPoint
      if (typeof lat !== "number" || typeof lng !== "number") return
      map.value.setView([lat, lng], zoom || map.value.getZoom(), { animate: true })
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
  if (routeFetchTimer) clearTimeout(routeFetchTimer)
  if (routeAbortController) {
    try {
      routeAbortController.abort()
    } catch (e) {
      // ignore
    }
  }
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

:global(.jp-waypoint-icon) {
  background: transparent;
  border: none;
}
:global(.jp-waypoint-badge) {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-weight: 900;
  font-size: 12px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.25);
}
:global(body[data-theme='dark'] .jp-waypoint-badge) {
  background: #0f1624;
  color: #e5e7eb;
  border: 1px solid rgba(96, 165, 250, 0.85);
}
:global(body[data-theme='light'] .jp-waypoint-badge) {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid rgba(37, 99, 235, 0.85);
}

:global(.jp-map-tooltip.leaflet-tooltip) {
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border: 1px solid var(--map-overlay-border);
  border-radius: 10px;
  padding: 4px 8px;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.28);
}
:global(.jp-map-tooltip.leaflet-tooltip::before) {
  border-top-color: var(--map-overlay-bg);
}

:global(body[data-theme='dark'] .leaflet-popup-content-wrapper),
:global(body[data-theme='dark'] .leaflet-popup-tip) {
  background: rgba(15, 22, 36, 0.95);
  color: #e5e7eb;
  border: 1px solid #243047;
}
:global(body[data-theme='light'] .leaflet-popup-content-wrapper),
:global(body[data-theme='light'] .leaflet-popup-tip) {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
:global(.leaflet-popup-content-wrapper) {
  border-radius: 14px;
}
</style>
