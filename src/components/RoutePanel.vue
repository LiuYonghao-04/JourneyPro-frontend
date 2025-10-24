<script setup>
import { ref } from 'vue'
import { useRouteStore } from '../store/routeStore'
import { storeToRefs } from 'pinia'
import { geocode } from '../utils/geocode'

const routeStore = useRouteStore()
const { startAddress, endAddress, startLat, startLng, endLat, endLng } = storeToRefs(routeStore)
const locating = ref(false)

// 地址输入更新路线
const updateFromAddress = async () => {
  try {
    const start = await geocode(startAddress.value)
    const end = await geocode(endAddress.value)
    routeStore.setStart(start.lat, start.lng)
    routeStore.setEnd(end.lat, end.lng)
  } catch (err) {
    alert('无法解析地址，请检查输入')
  }
}

// 定位到我
const locateMe = () => {
  if (!navigator.geolocation) return alert('浏览器不支持定位')
  locating.value = true
  navigator.geolocation.getCurrentPosition(
      (pos) => {
        routeStore.setStart(pos.coords.latitude, pos.coords.longitude)
        locating.value = false
      },
      () => {
        alert('无法定位')
        locating.value = false
      }
  )
}
</script>

<template>
  <div class="control-panel">
    <el-input v-model="startAddress" placeholder="起点地址" size="small" style="width: 250px" />
    <el-input v-model="endAddress" placeholder="终点地址" size="small" style="width: 250px; margin-top: 5px" />

    <div style="margin-top: 5px">
      <el-button type="primary" size="small" @click="updateFromAddress">解析地址</el-button>
      <el-button type="success" size="small" :loading="locating" @click="locateMe">定位</el-button>
    </div>

    <div style="margin-top:5px;font-size:12px;color:#666;">
      起点: {{ startLat.toFixed(4) }}, {{ startLng.toFixed(4) }}<br/>
      终点: {{ endLat.toFixed(4) }}, {{ endLng.toFixed(4) }}
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}
</style>
