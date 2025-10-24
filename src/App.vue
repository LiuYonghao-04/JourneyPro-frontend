<script setup>
import { onMounted } from 'vue'
import L from 'leaflet'

// 样式（地图与路由控件）
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine' // 挂载 L.Routing

// 解决 Leaflet 在 Vite 下默认 marker 图标不显示的问题
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

onMounted(() => {
  // 1) 初始化地图
  const map = L.map('map').setView([30.5728, 104.0668], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // 2) 使用你自己的 OSRM（通过 Vite 代理）
  // 这里 serviceUrl 指向 /osrm 前缀，Vite 会转发到 127.0.0.1:5000
  const control = L.Routing.control({
    waypoints: [
      L.latLng(30.5728, 104.0668), // 起点（示例：成都天府广场）
      L.latLng(30.6598, 104.0633), // 终点（示例：成都北一点）
    ],
    router: L.Routing.osrmv1({
      serviceUrl: '/osrm/route/v1', // ⭐ 关键：通过代理走本地 OSRM
      // language: 'zh-CN', // 需要可打开
      // profile: 'driving', // 默认 driving
    }),
    routeWhileDragging: true,   // 拖动 waypoint 时实时刷新路径
    addWaypoints: true,         // 允许点击+拖拽增加途经点
    draggableWaypoints: true,   // waypoints 可拖拽
    show: true,                 // 显示输入控件
    collapsible: true,          // 控件可折叠
  }).addTo(map)

  // 可选：监听路由结果（以后可在这里接“沿途推荐”）
  control.on('routesfound', (e) => {
    const route = e.routes[0]
    console.log('Route summary:', route.summary)
  })
})
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>
