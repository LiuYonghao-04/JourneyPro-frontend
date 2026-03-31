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
let parkingLayer = null
let routeLayer = null
let baseLayer = null
let highlightMarker = null
let highlightSegmentLayer = null
let pinnedMarker = null
let pinnedSegmentLayer = null
let selectedPoiMarker = null
let previewPoiMarker = null
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
  refreshLayerPositions(parkingLayer)
  refreshLayerPositions(selectedPoiMarker)
  refreshLayerPositions(previewPoiMarker)
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

const createWaypointIcon = (label, status = "pending") =>
  L.divIcon({
    className: `jp-waypoint-icon jp-waypoint-${status}`,
    html: `<div class="jp-waypoint-badge">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

const getExecutionStatusCopy = (status) => {
  if (status === "current") return "Next stop"
  if (status === "visited") return "Reached"
  if (status === "skipped") return "Skipped"
  return "Upcoming"
}

const updateAnchorTooltips = () => {
  if (!startMarker || !endMarker) return
  const current = routeStore.executionCurrentTarget
  const destinationTarget = (routeStore.executionTargets || []).find((target) => target.kind === "destination")
  const destinationStatus = destinationTarget?.status
  const destinationLabel =
    destinationStatus === "current"
      ? "End · Next stop"
      : destinationStatus === "visited"
      ? "End · Reached"
      : destinationStatus === "skipped"
      ? "End · Skipped"
      : "End"

  if (typeof startMarker.setTooltipContent === "function") {
    startMarker.setTooltipContent(routeStore.executionMode ? "Start · Active" : "Start")
  }
  if (typeof endMarker.setTooltipContent === "function") {
    endMarker.setTooltipContent(
      routeStore.executionMode && current?.kind === "destination" ? "End · Next stop" : destinationLabel
    )
  }
}

const updateViaMarkers = () => {
  if (!map.value || !viaMarkerLayer) return
  viaMarkerLayer.clearLayers()
  const list = routeStore.viaPoints || []
  const executionMap = new Map(
    (routeStore.executionTargets || [])
      .filter((target) => target.kind === "waypoint")
      .map((target) => [target.sourceIndex, target])
  )
  list.forEach((poi, idx) => {
    if (!poi || typeof poi.lat !== "number" || typeof poi.lng !== "number") return
    const title = poi.name || `Waypoint ${idx + 1}`
    const executionTarget = executionMap.get(idx)
    const status = executionTarget?.status || "pending"
    const marker = L.marker([poi.lat, poi.lng], {
      icon: createWaypointIcon(idx + 1, status),
      title,
      keyboard: false,
    })
    if (status === "current") {
      marker.setZIndexOffset(1200)
    }
    marker.bindTooltip(`${title} · ${getExecutionStatusCopy(status)}`, {
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
  updateAnchorTooltips()
}

const getPoiKey = (poi) => {
  if (!poi) return null
  const id = poi.id ?? poi.poi_id
  if (id !== undefined && id !== null && id !== '') return `id:${id}`
  if (typeof poi.lat === "number" && typeof poi.lng === "number") {
    return `ll:${poi.lat.toFixed(6)},${poi.lng.toFixed(6)}`
  }
  return null
}

const getParkingKey = (item) => {
  if (!item) return null
  if (item.source && item.id !== undefined && item.id !== null && item.id !== "") {
    return `${item.source}:${item.id}`
  }
  if (typeof item.lat === "number" && typeof item.lng === "number") {
    return `ll:${item.lat.toFixed(6)},${item.lng.toFixed(6)}`
  }
  return null
}

const createPoiIcon = (rank, selected, color) =>
  L.divIcon({
    className: `jp-poi-marker${selected ? " selected" : ""}`,
    html: `<div class="jp-poi-pin" style="--poi-color:${color || "#2563eb"};">${
      rank ? `<span>${rank}</span>` : ""
    }</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

const createParkingIcon = (rank, active = false) =>
  L.divIcon({
    className: `jp-parking-marker${active ? " active" : ""}`,
    html: `
      <div class="jp-parking-shell">
        <span class="jp-parking-pulse"></span>
        <div class="jp-parking-pin">P</div>
        <span class="jp-parking-rank">${rank}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })

const updateParkingMarkers = (parkingResult, focusedKey) => {
  if (!map.value || !parkingLayer) return
  parkingLayer.clearLayers()

  const items = Array.isArray(parkingResult?.items) ? parkingResult.items : []
  if (!items.length) return

  items.forEach((item, index) => {
    const lat = Number(item?.lat)
    const lng = Number(item?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const key = getParkingKey(item)
    const active = !!focusedKey && key === focusedKey
    const marker = L.marker([lat, lng], {
      icon: createParkingIcon(index + 1, active),
      title: item?.name || "Parking",
      keyboard: false,
    })
    marker.setZIndexOffset(active ? 1800 : 1300)
    marker.bindTooltip(`${item?.name || "Parking"} · ${Math.round(Number(item?.distance_m) || 0)} m`, {
      direction: "top",
      offset: [0, -18],
      opacity: 0.96,
      className: "jp-map-tooltip",
    })
    marker.on("click", () => {
      routeStore.setParkingFocus(key)
      routeStore.requestFocusPoint(lat, lng, 17)
    })
    parkingLayer.addLayer(marker)
    if (active && typeof marker.openTooltip === "function") {
      marker.openTooltip()
    }
  })

  if (map.value && !map.value.hasLayer(parkingLayer)) {
    parkingLayer.addTo(map.value)
  }
}

const updateSelectedPoiMarker = (selectedKey, selectedPoi, inList) => {
  if (!map.value) return
  if (!selectedPoi || inList) {
    if (selectedPoiMarker) {
      map.value.removeLayer(selectedPoiMarker)
      selectedPoiMarker = null
    }
    return
  }
  if (typeof selectedPoi.lat !== "number" || typeof selectedPoi.lng !== "number") return
  const color = routeStore.getPoiCategoryColor(selectedPoi.category)
  const marker = L.marker([selectedPoi.lat, selectedPoi.lng], {
    icon: createPoiIcon(null, true, color),
    title: selectedPoi.name || "Selected place",
    keyboard: false,
  })
  marker.setZIndexOffset(1200)
  marker.on("click", () => {
    routeStore.selectPoi(selectedPoi)
    map.value.setView([selectedPoi.lat, selectedPoi.lng], Math.max(map.value.getZoom(), 15), {
      animate: true,
    })
  })
  if (selectedPoiMarker) {
    map.value.removeLayer(selectedPoiMarker)
  }
  selectedPoiMarker = marker.addTo(map.value)
}

const updatePreviewPoiMarker = (previewPoi) => {
  if (!map.value) return
  if (!previewPoi || typeof previewPoi.lat !== "number" || typeof previewPoi.lng !== "number") {
    if (previewPoiMarker) {
      map.value.removeLayer(previewPoiMarker)
      previewPoiMarker = null
    }
    return
  }

  const previewKey = getPoiKey(previewPoi)
  const selectedKey = getPoiKey(routeStore.selectedPoi)
  if (previewKey && selectedKey && previewKey === selectedKey) {
    if (previewPoiMarker) {
      map.value.removeLayer(previewPoiMarker)
      previewPoiMarker = null
    }
    return
  }

  const color = routeStore.getPoiCategoryColor(previewPoi.category)
  if (!previewPoiMarker) {
    previewPoiMarker = L.circleMarker([previewPoi.lat, previewPoi.lng], {
      radius: 16,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map.value)
  } else {
    previewPoiMarker.setLatLng([previewPoi.lat, previewPoi.lng])
    previewPoiMarker.setStyle({ color, fillColor: color })
  }
  if (typeof previewPoiMarker.bringToFront === "function") {
    previewPoiMarker.bringToFront()
  }
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
    const mode = routeStore.recoMode || "driving"
    let routeData = null
    let usedMode = mode
    try {
      const res = await axios.get(
        `/osrm/route/v1/${mode}/${coordStr}?alternatives=false&overview=full&geometries=geojson&steps=true&annotations=true`,
        { signal: routeAbortController.signal }
      )
      routeData = res.data?.routes?.[0]
    } catch (modeErr) {
      if (mode !== "driving") {
        const fallbackRes = await axios.get(
          `/osrm/route/v1/driving/${coordStr}?alternatives=false&overview=full&geometries=geojson&steps=true&annotations=true`,
          { signal: routeAbortController.signal }
        )
        routeData = fallbackRes.data?.routes?.[0]
        usedMode = "driving"
      } else {
        throw modeErr
      }
    }
    if (!routeData) return

    if (usedMode !== mode) {
      console.warn(`Route mode ${mode} unavailable, fallback to driving`)
    }

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
  parkingLayer = L.layerGroup().addTo(map.value)
  updateViaMarkers()
  updateAnchorTooltips()

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
    () => routeStore.recoMode,
    async () => {
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
    () => [routeStore.mapOverlayPOIs, routeStore.selectedPoi, routeStore.poiCategoryColors],
    ([pois]) => {
      if (!map.value) return
      clearTimeout(updateTimeout)

      updateTimeout = setTimeout(() => {
        if (!map.value) return
        poiLayer.clearLayers()

        const selectedKey = getPoiKey(routeStore.selectedPoi)
        let selectedInList = false

        if (pois && pois.length > 0) {
          pois.forEach((poi, idx) => {
            if (typeof poi.lat !== "number" || typeof poi.lng !== "number") return
            const key = getPoiKey(poi)
            const isSelected = !!selectedKey && key === selectedKey
            if (isSelected) selectedInList = true
            const color = routeStore.getPoiCategoryColor(poi.category)

            const marker = L.marker([poi.lat, poi.lng], {
              icon: createPoiIcon(idx + 1, isSelected, color),
              title: poi.name,
              keyboard: false,
            })
            if (isSelected) marker.setZIndexOffset(1000)

            marker.on("click", () => {
              if (!map.value) return
              routeStore.selectPoi(poi)
              map.value.setView([poi.lat, poi.lng], Math.max(map.value.getZoom(), 15), { animate: true })
            })

            marker.on("mouseover", () => {
              routeStore.setPreviewPoi(poi)
              if (marker.getTooltip()) return
              marker.bindTooltip(poi.name || "Place", {
                direction: "top",
                offset: [0, -14],
                opacity: 0.95,
                className: "jp-map-tooltip",
              }).openTooltip()
            })
            marker.on("mouseout", () => {
              routeStore.clearPreviewPoi()
            })

            poiLayer.addLayer(marker)
          })
        }

        if (map.value && !map.value.hasLayer(poiLayer)) {
          poiLayer.addTo(map.value)
        }
        updateSelectedPoiMarker(selectedKey, routeStore.selectedPoi, selectedInList)
        updatePreviewPoiMarker(routeStore.previewPoi)
      }, 300)
    },
    { deep: true }
  )

  watch(
    () => routeStore.previewPoi,
    (preview) => {
      updatePreviewPoiMarker(preview)
    },
    { deep: true }
  )

  watch(
    () => [routeStore.executionMode, routeStore.executionCompleted, routeStore.executionTargets],
    () => {
      updateViaMarkers()
      updateAnchorTooltips()
    },
    { deep: true }
  )

  watch(
    () => [routeStore.parkingSearchResult, routeStore.parkingFocusKey],
    ([parkingResult, focusedKey]) => {
      updateParkingMarkers(parkingResult, focusedKey)
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
        routeStore.selectPoi({
          id: route.query.poi_id ? Number(route.query.poi_id) || route.query.poi_id : undefined,
          name: route.query.poi_name || "Selected POI",
          lat,
          lng,
        })
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
:global(.jp-poi-marker) {
  background: transparent;
  border: none;
}
:global(.jp-poi-pin) {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--poi-color, #2563eb);
  border: 2px solid #ffffff;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
:global(body[data-theme='dark'] .jp-poi-pin) {
  border-color: #0f1624;
}
:global(body[data-theme='light'] .jp-poi-pin) {
  border-color: #ffffff;
}
:global(.jp-poi-marker.selected .jp-poi-pin) {
  background: #f97316;
  transform: scale(1.08);
  box-shadow: 0 14px 26px rgba(249, 115, 22, 0.4);
}
:global(.jp-parking-marker) {
  background: transparent;
  border: none;
}
:global(.jp-parking-shell) {
  position: relative;
  width: 40px;
  height: 40px;
}
:global(.jp-parking-pulse) {
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.18);
  border: 1px solid rgba(34, 211, 238, 0.34);
  transform: scale(0.94);
}
:global(.jp-parking-pin) {
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, #22d3ee 0%, #0891b2 100%);
  border: 2px solid #ffffff;
  display: grid;
  place-items: center;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 14px 28px rgba(8, 145, 178, 0.36);
}
:global(body[data-theme='dark'] .jp-parking-pin) {
  border-color: #0f1624;
}
:global(body[data-theme='light'] .jp-parking-pin) {
  border-color: #ffffff;
}
:global(.jp-parking-rank) {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(34, 211, 238, 0.48);
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.3);
}
:global(.jp-parking-marker.active .jp-parking-pulse) {
  animation: jpParkingPulse 1.5s ease-out infinite;
  background: rgba(34, 211, 238, 0.26);
  border-color: rgba(34, 211, 238, 0.7);
}
:global(.jp-parking-marker.active .jp-parking-pin) {
  transform: scale(1.08);
  box-shadow: 0 18px 30px rgba(8, 145, 178, 0.5);
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
:global(.jp-waypoint-icon.jp-waypoint-current .jp-waypoint-badge) {
  background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%);
  color: #eff6ff;
  border-color: rgba(147, 197, 253, 0.95);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.36);
  transform: scale(1.06);
}
:global(.jp-waypoint-icon.jp-waypoint-visited .jp-waypoint-badge) {
  background: linear-gradient(180deg, #34d399 0%, #16a34a 100%);
  color: #ecfdf5;
  border-color: rgba(134, 239, 172, 0.9);
}
:global(.jp-waypoint-icon.jp-waypoint-skipped .jp-waypoint-badge) {
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.52);
}
:global(body[data-theme='light'] .jp-waypoint-icon.jp-waypoint-skipped .jp-waypoint-badge) {
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
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

@keyframes jpParkingPulse {
  0% {
    opacity: 0.95;
    transform: scale(0.86);
  }
  100% {
    opacity: 0;
    transform: scale(1.46);
  }
}
</style>
