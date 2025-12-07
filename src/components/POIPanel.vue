<template>
  <div class="poi-panel">
    <h3 class="title">推荐途径点</h3>

    <div v-if="pois.length === 0" class="empty">
      暂无推荐，请先规划路线。
    </div>

    <ul v-else>
      <li v-for="poi in pois" :key="poi.id || poi.name" class="poi-item">
        <div class="poi-info">
          <div class="poi-name">{{ poi.name }}</div>
          <div class="poi-meta">
            <span>{{ poi.category }}</span>
            <span class="dot">·</span>
            <span>人气 {{ poi.popularity }}</span>
          </div>
        </div>
        <button class="add-btn" @click="addPoiToRoute(poi)">加入路线</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()

onMounted(() => {
  routeStore.fetchRecommendedPois()
})

// 推荐点列表来自 store
const pois = computed(() => routeStore.recommendedPOIs || [])

// 点击按钮后重新规划路线
const addPoiToRoute = async (poi) => {
  console.log('重新规划路线，添加途径点', poi.name)
  await routeStore.addViaPoint(poi)
}
</script>

<style scoped>
.poi-panel {
  position: absolute;
  top: 400px;
  left: 10px;
  width: 300px;
  z-index: 99999;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 0 16px 12px 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  backdrop-filter: blur(6px);
}
.title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}
.poi-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}
.poi-info {
  flex: 1;
  margin-right: 8px;
}
.poi-name {
  font-size: 15px;
  font-weight: 500;
  color: #222;
}
.poi-meta {
  font-size: 12px;
  color: #777;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dot {
  color: #bbb;
}
.add-btn {
  background: #228be6;
  border: none;
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.add-btn:hover {
  background: #1c7ed6;
}
.empty {
  font-size: 14px;
  color: #999;
  text-align: center;
  padding: 12px 0;
}
</style>
