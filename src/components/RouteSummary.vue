<script setup>
defineProps({ theme: String })
import { ref, onMounted } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const distance = ref(0)
const duration = ref(0)
let control = null

function updateRouteSummary(route) {
  if (!route) return
  distance.value = (route.summary.totalDistance / 1000).toFixed(2)
  duration.value = (route.summary.totalTime / 60).toFixed(1)
}

onMounted(() => {
  // 轮询等待 OSRM 控制器初始化
  const waitForControl = setInterval(() => {
    if (window._osrmControl) {
      control = window._osrmControl

      // ✅ 情况1：默认加载时就有路线
      const routes = control.getRoutes?.() || control._routes || []
      if (routes.length > 0 && routes[0].summary) {
        updateRouteSummary(routes[0])
      }

      // ✅ 情况2：后续路径更新（用户拖动或输入）
      control.on('routesfound', (e) => {
        const route = e.routes[0]
        updateRouteSummary(route)
      })

      clearInterval(waitForControl)
    }
  }, 500)
})
</script>

<template>
  <div class="route-summary">
    <h3>路线信息</h3>
    <p><strong>总距离：</strong>{{ distance > 0 ? distance + ' km' : '—' }}</p>
    <p><strong>预计时间：</strong>{{ duration > 0 ? duration + ' 分钟' : '—' }}</p>

    <div class="divider"></div>
    <p class="tip">🚗 推荐路线：沿途将显示推荐景点与餐厅</p>
  </div>
</template>

<style scoped>
.route-summary {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 260px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  font-family: 'Segoe UI', sans-serif;
  color: #333;
  z-index: 1000;
}

h3 {
  margin-bottom: 8px;
  font-size: 18px;
}

p {
  margin: 6px 0;
  font-size: 14px;
}

.divider {
  border-top: 1px solid #ddd;
  margin: 8px 0;
}

.tip {
  color: #0078ff;
  font-size: 13px;
}
</style>
