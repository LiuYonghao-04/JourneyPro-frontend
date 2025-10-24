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

  // 拖动后回填坐标到 store
  if (onDrag) marker.on('dragend', onDrag)
  return marker
}

onMounted(() => {
  // 初始化地图
  map.value = L.map('map', { zoomControl: false })
      .setView([routeStore.startLat, routeStore.startLng], 13)

  // 移动缩放按钮到底部左侧
  L.control.zoom({ position: 'bottomleft' }).addTo(map.value)

  // 底图
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value)

// 反向地理编码函数
  async function reverseGeocode(lat, lng) {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
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

  // 初始化路线控件（隐藏默认箭头 marker）
  control = L.Routing.control({
    waypoints: [
      L.latLng(routeStore.startLat, routeStore.startLng),
      L.latLng(routeStore.endLat, routeStore.endLng),
    ],
    router: L.Routing.osrmv1({ serviceUrl: '/osrm/route/v1' }),
    routeWhileDragging: true,
    addWaypoints: false,
    draggableWaypoints: false,
    show: true,
    collapsible: true,
    createMarker: () => null, // ✅ 不生成默认箭头 marker
  }).addTo(map.value)

  // 初始绘制路线
  control.setWaypoints([
    L.latLng(routeStore.startLat, routeStore.startLng),
    L.latLng(routeStore.endLat, routeStore.endLng),
  ])

  // 监听 store 变化 → 自动刷新路线和 marker
  watch(
      () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
      () => {
        // 更新 marker 位置
        startMarker.setLatLng([routeStore.startLat, routeStore.startLng])
        endMarker.setLatLng([routeStore.endLat, routeStore.endLng])

        // 刷新路线
        control.setWaypoints([
          L.latLng(routeStore.startLat, routeStore.startLng),
          L.latLng(routeStore.endLat, routeStore.endLng),
        ])
      }
  )
})
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
