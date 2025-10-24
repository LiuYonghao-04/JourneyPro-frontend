<script setup>
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'

// 修复 Leaflet 图标路径问题（Vite 环境）
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Vue 数据
const startLat = ref(30.5728)
const startLng = ref(104.0668)
const endLat = ref(30.6598)
const endLng = ref(104.0633)

let map, control

onMounted(() => {
  // 初始化地图
  map = L.map('map').setView([startLat.value, startLng.value], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // 初始化路线控件
  control = L.Routing.control({
    waypoints: [
      L.latLng(startLat.value, startLng.value),
      L.latLng(endLat.value, endLng.value)
    ],
    router: L.Routing.osrmv1({
      serviceUrl: '/osrm/route/v1',
    }),
    routeWhileDragging: true,
    addWaypoints: true,
    draggableWaypoints: true,
    show: true,
    collapsible: true,
    createMarker: function(i, wp, nWps) {
      // 自定义起点/终点颜色
      const markerHtml = `
        <div style="background-color:${i === 0 ? 'green' : i === nWps - 1 ? 'red' : 'blue'};
                    width:16px;height:16px;border-radius:50%;
                    border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`
      return L.marker(wp.latLng, {
        draggable: true,
        icon: L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
      })
    }
  }).addTo(map)
})

// 更新路线函数
const updateRoute = () => {
  const start = L.latLng(startLat.value, startLng.value)
  const end = L.latLng(endLat.value, endLng.value)
  control.setWaypoints([start, end])
}
</script>

<template>
  <div>
    <!-- 左上角控制面板 -->
    <div class="control-panel">
      <el-input v-model="startLat" placeholder="起点纬度" size="small" style="width: 120px" />
      <el-input v-model="startLng" placeholder="起点经度" size="small" style="width: 120px; margin-left: 5px" />
      <br />
      <el-input v-model="endLat" placeholder="终点纬度" size="small" style="width: 120px; margin-top: 5px" />
      <el-input v-model="endLng" placeholder="终点经度" size="small" style="width: 120px; margin-left: 5px; margin-top: 5px" />
      <br />
      <el-button type="primary" size="small" style="margin-top: 5px" @click="updateRoute">
        生成路线
      </el-button>
    </div>

    <!-- 地图容器 -->
    <div id="map" style="height: 100vh; width: 100vw;"></div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
