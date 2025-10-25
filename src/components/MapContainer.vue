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

const blueIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -32],
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png'
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
  // 将控制器暴露给全局，供 RouteSummary.vue 读取
  window._osrmControl = control

  // 初始绘制路线
  control.setWaypoints([
    L.latLng(routeStore.startLat, routeStore.startLng),
    L.latLng(routeStore.endLat, routeStore.endLng),
  ])

  // 监听 store 变化 → 自动刷新路线和 marker
  watch(
      () => [routeStore.startLat, routeStore.startLng, routeStore.endLat, routeStore.endLng],
      async () => {
        // 更新 marker 位置
        startMarker.setLatLng([routeStore.startLat, routeStore.startLng])
        endMarker.setLatLng([routeStore.endLat, routeStore.endLng])

        // 刷新路线
        control.setWaypoints([
          L.latLng(routeStore.startLat, routeStore.startLng),
          L.latLng(routeStore.endLat, routeStore.endLng),
        ])
        // ✅ 新增：当路线更新后，获取推荐POI
        await routeStore.fetchRecommendedPois()
        console.log('✅ 已请求推荐点接口')
      }
  )

// ✅ 监听推荐POI变化：显示推荐点标记（带防抖延迟刷新）
  let poiLayer = L.layerGroup() // 提前定义空图层组
  let updateTimeout = null // 防抖计时器

  watch(
      () => routeStore.recommendedPOIs,
      (pois) => {
        if (!map.value) return

        // 🕒 防抖处理：清除上次的延迟任务
        clearTimeout(updateTimeout)
        updateTimeout = setTimeout(() => {
          // 清空旧图层（不销毁对象）
          poiLayer.clearLayers()

          // 如果没有推荐点就不继续
          if (!pois || pois.length === 0) return

          // ✅ 自定义蓝色图标（你的版本里缺少了定义）
          const blueIcon = L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [0, -32],
            shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
          })

          // 遍历推荐点生成标准 Marker
          pois.forEach((poi) => {
            const marker = L.marker([poi.lat, poi.lng], {
              icon: blueIcon,
              title: poi.name,
            }).bindPopup(`<b>${poi.name}</b><br>${poi.category || ''}`)

            // ✅ 点击 marker：居中并打开弹窗
            marker.on('click', () => {
              map.value.setView([poi.lat, poi.lng], 15, { animate: true })
              marker.openPopup()
            })

            poiLayer.addLayer(marker)
          })

          // ✅ 若图层未添加则添加一次（防止重复 attach）
          if (!map.value.hasLayer(poiLayer)) {
            poiLayer.addTo(map.value)
          }

          console.log('📍 推荐POI已更新:', pois.length)
        }, 300) // 延迟执行，避免动画中清除 marker
      },
      { deep: true }
  )


// ✅ 监听后端重规划路线（A→POI→B）
  watch(
      () => routeStore.routeGeojson,
      (geojson) => {
        if (!geojson || !map.value) return

        // 移除原来的路线控件（OSRM LRM）
        if (control) {
          map.value.removeControl(control)
          control = null
        }

        // 绘制新的路线（用 GeoJSON）
        const newRoute = L.geoJSON(geojson, {
          style: { color: '#228BE6', weight: 6, opacity: 0.85 },
        }).addTo(map.value)

        map.value.fitBounds(newRoute.getBounds())
        console.log('🚗 路线已更新为含POI路径')
      },
      { deep: true }
  )

})
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
