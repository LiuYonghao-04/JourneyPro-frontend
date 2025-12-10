<template>
  <div class="poi-panel" :class="{ collapsed }">
    <div class="panel-head" @click="toggle">
      <h3 class="title">Recommended POIs</h3>
      <button class="collapse-btn">{{ collapsed ? 'Expand' : 'Collapse' }}</button>
    </div>

    <div v-if="!collapsed">
      <div v-if="pois.length === 0" class="empty">
        No recommendations yet. Plan a route first.
      </div>

      <ul v-else class="poi-list">
        <li v-for="poi in pois" :key="poi.id || poi.name" class="poi-item">
          <div class="poi-info">
            <div class="poi-name">{{ poi.name }}</div>
            <div class="poi-meta">
              <span>{{ poi.category }}</span>
              <span class="dot">·</span>
              <span>人气 {{ poi.popularity }}</span>
            </div>
          </div>
          <button class="add-btn" @click="addPoiToRoute(poi)">Add</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const collapsed = ref(false)

onMounted(() => {
  routeStore.fetchRecommendedPois()
})

const pois = computed(() => routeStore.recommendedPOIs || [])

const addPoiToRoute = async (poi) => {
  await routeStore.addViaPoint(poi)
}

const toggle = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped>
.poi-panel {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 320px;
  z-index: 99999;
  background: var(--panel);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--panel-border);
  max-height: 40vh;
  overflow: hidden;
  backdrop-filter: none;
}
.poi-panel.collapsed {
  height: 52px;
  max-height: 52px;
  padding: 10px 14px;
  cursor: pointer;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
  margin: 0;
}
.collapse-btn {
  border: 1px solid var(--panel-border);
  background: var(--badge);
  color: var(--fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.poi-list {
  overflow-y: auto;
  max-height: calc(50vh - 70px);
  margin-top: 10px;
}
.poi-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--panel-border);
}
.poi-info {
  flex: 1;
  margin-right: 8px;
}
.poi-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--fg);
}
.poi-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.dot {
  color: var(--muted);
}
.add-btn {
  background: var(--btn-primary);
  border: none;
  color: var(--btn-text);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.add-btn:hover {
  filter: brightness(1.05);
}
.empty {
  font-size: 14px;
  color: var(--muted);
  text-align: center;
  padding: 12px 0;
}
</style>
