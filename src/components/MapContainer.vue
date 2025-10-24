<script setup>
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

onMounted(() => {
  map.value = L.map('map').setView([routeStore.startLat, routeStore.startLng], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value)

  control = L.Routing.control({
    waypoints: [
      L.latLng(routeStore.startLat, routeStore.startLng),
      L.latLng(routeStore.endLat, routeStore.endLng)
    ],
    router: L.Routing.osrmv1({
      serviceUrl: '/osrm/route/v1',
    }),
    routeWhileDragging: true,
    addWaypoints: true,
    draggableWaypoints: true,
    show: true,
    collapsible: true,
    createMarker: (i, wp, nWps) => {
      const color = i === 0 ? 'green' : i === nWps - 1 ? 'red' : 'blue'
      const markerHtml = `<div style="background-color:${color};
        width:16px;height:16px;border-radius:50%;
        border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`
      const marker = L.marker(wp.latLng, {
        draggable: true,
        icon: L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      })
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        if (i === 0) routeStore.setStart(pos.lat, pos.lng)
        else routeStore.setEnd(pos.lat, pos.lng)
      })
      return marker
    }
  }).addTo(map.value)
})

// 监听状态变化自动刷新路线
watch(
    () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
    () => {
      if (control) {
        control.setWaypoints([
          L.latLng(routeStore.startLat, routeStore.startLng),
          L.latLng(routeStore.endLat, routeStore.endLng),
        ])
      }
    }
)
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
