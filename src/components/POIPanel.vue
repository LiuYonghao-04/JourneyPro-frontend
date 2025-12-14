<template>
  <div class="poi-panel" :class="[{ collapsed }, theme]">
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
              <span class="dot">|</span>
              <span>Popularity {{ poi.popularity }}</span>
            </div>
          </div>
          <button
            class="add-btn"
            :class="{ danger: isViaPoint(poi) }"
            @click="togglePoi(poi)"
          >
            {{ isViaPoint(poi) ? 'Delete' : 'Add' }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const collapsed = ref(false)
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
let themeObserver = null

onMounted(() => {
  routeStore.fetchRecommendedPois()
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})

const pois = computed(() => routeStore.recommendedPOIs || [])
const isViaPoint = (poi) => {
  return (routeStore.viaPoints || []).some((p) =>
    poi.id ? p.id === poi.id : p.lat === poi.lat && p.lng === poi.lng
  )
}

const togglePoi = async (poi) => {
  if (isViaPoint(poi)) {
    routeStore.removeViaPoint(poi)
  } else {
    await routeStore.addViaPoint(poi)
  }
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
  width: 300px;
  z-index: 99999;
  background: var(--map-overlay-bg);
  border-radius: 16px;
  padding: 12px 8px 12px 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--map-overlay-border);
  max-height: 40vh;
  overflow: hidden;
  backdrop-filter: none;
  color: var(--map-overlay-fg);
  transition: background-color 1s ease, border-color 1s ease, color 1s ease;
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
  color: var(--map-overlay-fg);
  margin: 0;
}
.collapse-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.poi-list {
  overflow-y: auto;
  max-height: calc(50vh - 70px);
  margin-top: 10px;
  padding:0 8px 0 20px;

}
.poi-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--map-overlay-border);
}
.poi-info {
  flex: 1;
  margin-right: 8px;
}
.poi-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--map-overlay-fg);
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
.add-btn.danger {
  background: #f43f5e;
  color: #fff;
}
.empty {
  font-size: 14px;
  color: var(--muted);
  text-align: center;
  padding: 12px 0;
}

.poi-panel ::-webkit-scrollbar {
  width: 8px;
}
.poi-panel ::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(80, 90, 110, 0.6);
}
.poi-panel ::-webkit-scrollbar-track {
  background: var(--map-overlay-bg);
}
.poi-panel.light ::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.7);
}
.poi-panel.light ::-webkit-scrollbar-track {
  background: #ffffff;
}

.poi-panel.light {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.poi-panel.light .title,
.poi-panel.light .poi-name {
  color: #0f172a;
}
.poi-panel.light .collapse-btn {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.poi-panel.light .poi-item {
  border-bottom: 1px solid #e5e7eb;
}
</style>
