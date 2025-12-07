<script setup>
import axios from 'axios'
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'
import { useRouteStore } from '../store/routeStore'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const map = ref(null)
let control = null
const routeStore = useRouteStore()
let startMarker = null
let endMarker = null
let poiLayer = null

const buildWaypointList = () => [
  L.latLng(routeStore.startLat, routeStore.startLng),
  ...(routeStore.viaPoints || []).map((poi) => L.latLng(poi.lat, poi.lng)),
  L.latLng(routeStore.endLat, routeStore.endLng),
]

// 自定义圆点 marker 样式
function createColoredMarker(color, position, onDrag) {
  const markerHtml = `<div style="background-color:${color};
    width:18px;height:18px;border-radius:50%;
    border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`

  const marker = L.marker(position, {
    draggable: true,
    icon: L.divIcon({
      className: 'custom-marker',
      html: markerHtml,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  })

  if (onDrag) marker.on('dragend', onDrag)
  return marker
}

onMounted(() => {
  map.value = L.map('map', { zoomControl: false }).setView(
    [routeStore.startLat, routeStore.startLng],
    13
  )

  L.control.zoom({ position: 'bottomleft' }).addTo(map.value)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value)

  // 反向地理编码函数
  async function reverseGeocode(lat, lng) {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      return res.data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (e) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  startMarker = createColoredMarker('green', [routeStore.startLat, routeStore.startLng], async () => {
    const pos = startMarker.getLatLng()
    routeStore.setStart(pos.lat, pos.lng)
    const addr = await reverseGeocode(pos.lat, pos.lng)
    routeStore.startAddress = addr
  })

  endMarker = createColoredMarker('red', [routeStore.endLat, routeStore.endLng], async () => {
    const pos = endMarker.getLatLng()
    routeStore.setEnd(pos.lat, pos.lng)
    const addr = await reverseGeocode(pos.lat, pos.lng)
    routeStore.endAddress = addr
  })

  startMarker.addTo(map.value)
  endMarker.addTo(map.value)

  control = L.Routing.control({
    waypoints: buildWaypointList(),
    router: L.Routing.osrmv1({ serviceUrl: '/osrm/route/v1' }),
    routeWhileDragging: true,
    addWaypoints: false,
    draggableWaypoints: false,
    show: true,
    collapsible: true,
    createMarker: () => null,
  }).addTo(map.value)

  window._osrmControl = control
  control.setWaypoints(buildWaypointList())

  // 监听起终点变化
  watch(
    () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
    async () => {
      startMarker.setLatLng([routeStore.startLat, routeStore.startLng])
      endMarker.setLatLng([routeStore.endLat, routeStore.endLng])

      if (control) {
        control.setWaypoints(buildWaypointList())
      }
      await routeStore.fetchRecommendedPois()
      console.log('已请求推荐点接口')
    }
  )

  // 监听途径点变化
  watch(
    () => routeStore.viaPoints.map((poi) => `${poi.lat},${poi.lng}`),
    () => {
      if (!control) return
      control.setWaypoints(buildWaypointList())
    },
    { deep: true }
  )

  // 推荐 POI 的 marker
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
          iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [0, -32],
          shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        pois.forEach((poi) => {
          if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return

          const marker = L.marker([poi.lat, poi.lng], {
            icon: poiIcon,
            title: poi.name,
          }).bindPopup(`<b>${poi.name}</b><br>${poi.category || ''}`)

          marker.on('click', () => {
            if (!map.value) return
            map.value.setView([poi.lat, poi.lng], 15, { animate: true })
            marker.openPopup()
          })

          poiLayer.addLayer(marker)
        })

        if (map.value && !map.value.hasLayer(poiLayer)) {
          poiLayer.addTo(map.value)
        }

        console.log('推荐 POI 已刷新', pois.length)
      }, 300)
    },
    { deep: true }
  )

  // 监听后端重规划的 GeoJSON 路线
  watch(
    () => routeStore.routeGeojson,
    (geojson) => {
      if (!geojson || !map.value) return

      if (control) {
        map.value.removeControl(control)
        control = null
      }

      const newRoute = L.geoJSON(geojson, {
        style: { color: '#228BE6', weight: 6, opacity: 0.85 },
      }).addTo(map.value)

      map.value.fitBounds(newRoute.getBounds())
      console.log('路线已更新为含 POI 路径')
    },
    { deep: true }
  )
})
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
