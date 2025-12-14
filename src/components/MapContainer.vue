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
const route = useRoute()

const theme = ref(document.body.getAttribute("data-theme") || "dark")
let themeObserver = null

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

const createBaseLayer = () => {
  if (theme.value === "dark") {
    return L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "(c) OpenStreetMap contributors | Carto",
    })
  }
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "(c) OpenStreetMap contributors",
  })
}

const applyBaseLayer = () => {
  if (!map.value) return
  if (baseLayer) {
    map.value.removeLayer(baseLayer)
  }
  baseLayer = createBaseLayer()
  baseLayer.addTo(map.value)
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
    const steps =
      routeData.legs?.flatMap((leg) =>
        (leg.steps || []).map((s) => {
          const maneuver = s.maneuver || {}
          const type = maneuver.type || "Go"
          const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : ""
          const road = s.name ? ` onto ${s.name}` : ""
          const instruction =
            maneuver.instruction || `${type}${modifier}${road}`.trim()
          return {
            instruction,
            road: s.name || "",
            distance: (s.distance / 1000).toFixed(2),
            duration: Math.round(s.duration / 60),
          }
        })
      ) || []
    routeStore.steps = steps

    if (routeLayer) map.value.removeLayer(routeLayer)
    routeLayer = L.geoJSON(routeData.geometry, {
      style: { color: "#228BE6", weight: 6, opacity: 0.9 },
    }).addTo(map.value)
    map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
  } catch (e) {
    console.warn("Route fetch failed", e)
  }
}

onMounted(() => {
  map.value = L.map("map", { zoomControl: false }).setView(
    [routeStore.startLat, routeStore.startLng],
    13
  )

  applyBaseLayer()

  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute("data-theme") || "dark"
    applyBaseLayer()
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
      routeLayer = L.geoJSON(geojson.geometry, {
        style: { color: "#228BE6", weight: 6, opacity: 0.9 },
      }).addTo(map.value)
      map.value.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
    },
    { deep: true }
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
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
