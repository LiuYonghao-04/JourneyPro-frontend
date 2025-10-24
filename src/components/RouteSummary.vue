<script setup>
import { ref, onMounted } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const distance = ref(0)
const duration = ref(0)
let control = null

onMounted(() => {
  // 监听全局 leaflet 控制器
  // 在 window 上注册控制器（MapContainer 中会赋值）
  const waitForControl = setInterval(() => {
    if (window._osrmControl) {
      control = window._osrmControl
      control.on('routesfound', (e) => {
        const route = e.routes[0]
        distance.value = (route.summary.totalDistance / 1000).toFixed(2)
        duration.value = (route.summary.totalTime / 60).toFixed(1)
      })
      clearInterval(waitForControl)
    }
  }, 500)
})
</script>

<template>
  <div class="route-summary">
    <div v-if="distance > 0">
      <strong>全程：</strong>{{ distance }} km<br />
      <strong>预计：</strong>{{ duration }} 分钟
    </div>
  </div>
</template>

<style scoped>
.route-summary {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  font-size: 13px;
  line-height: 1.4;
  z-index: 1000;
}
</style>
