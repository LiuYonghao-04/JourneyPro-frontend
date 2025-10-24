<script setup>
import { onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'

const map = ref(null)

// 起点终点坐标（可以改成输入）
const start = [30.5728, 104.0668] // 成都
const end = [30.6598, 104.0633]   // 成都北一点

onMounted(async () => {
  // 初始化地图
  map.value = L.map('map').setView(start, 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map.value)

  // 调用 OSRM 后端接口
  const url = `http://127.0.0.1:5000/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
  try {
    const res = await axios.get(url)
    const route = res.data.routes[0].geometry

    // 绘制路线
    const routeLine = L.geoJSON(route, {
      style: { color: 'blue', weight: 5 },
    }).addTo(map.value)
    map.value.fitBounds(routeLine.getBounds())

    // 添加起点终点标记
    L.marker(start).addTo(map.value).bindPopup('Start').openPopup()
    L.marker(end).addTo(map.value).bindPopup('End')
  } catch (err) {
    console.error('OSRM 请求失败:', err)
    alert('无法连接 OSRM 后端，请检查端口或路径')
  }
})
</script>

<template>
  <div id="map" style="height: 100vh; width: 100vw;"></div>
</template>

<style scoped>
#map {
  height: 100vh;
  width: 100vw;
}
</style>
