<template>
  <div class="poi-shelf" :class="[theme, { open }]">
    <button class="toggle-btn" type="button" @click="toggleOpen">
      {{ open ? 'Close' : 'Saved' }}
    </button>

    <div v-show="open" class="drawer">
      <div class="drawer-head">
        <div class="title">Quick Shelf</div>
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            class="tab-btn"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <div class="drawer-body">
        <div v-if="activeTab === 'Saved'" class="list">
          <div v-if="savedList.length === 0" class="empty">No saved places yet.</div>
          <div
            v-for="item in savedList"
            :key="item.key"
            class="item"
            @mouseenter="previewItem(item)"
            @mouseleave="clearPreview"
          >
            <div class="item-main" @click="selectItem(item)">
              <div class="item-title">{{ item.name }}</div>
              <div class="item-meta">{{ item.category || 'POI' }}</div>
            </div>
            <button class="item-action" @click="removeSaved(item.key)">Remove</button>
          </div>
        </div>

        <div v-else class="list">
          <div class="list-head">
            <span>Recent</span>
            <button class="clear-btn" @click="clearRecent">Clear</button>
          </div>
          <div v-if="recentList.length === 0" class="empty">No recent places yet.</div>
          <div
            v-for="item in recentList"
            :key="item.key"
            class="item"
            @mouseenter="previewItem(item)"
            @mouseleave="clearPreview"
          >
            <div class="item-main" @click="selectItem(item)">
              <div class="item-title">{{ item.name }}</div>
              <div class="item-meta">{{ item.category || 'POI' }}</div>
            </div>
            <button class="item-action" @click="selectItem(item)">Open</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const open = ref(false)
const tabs = ['Saved', 'Recent']
const activeTab = ref('Saved')
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
let themeObserver = null

const savedList = computed(() => routeStore.savedPois || [])
const recentList = computed(() => routeStore.recentPois || [])

const toggleOpen = () => {
  open.value = !open.value
}

const selectItem = (item) => {
  if (!item) return
  const payload = {
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    category: item.category,
    image_url: item.image_url,
  }
  routeStore.selectPoi(payload)
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    routeStore.requestFocusPoint(item.lat, item.lng, 16)
  }
}

const previewItem = (item) => {
  if (!item) return
  routeStore.setPreviewPoi(item)
}

const clearPreview = () => {
  routeStore.clearPreviewPoi()
}

const removeSaved = (key) => {
  routeStore.removeSavedPoi(key)
}

const clearRecent = () => {
  routeStore.clearRecentPois()
}

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})
</script>

<style scoped>
.poi-shelf {
  position: absolute;
  top: 15px;
  right: 370px;
  z-index: 1150;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.toggle-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
}

.drawer {
  width: 260px;
  max-height: calc(100vh - 220px);
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-head {
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--map-overlay-border);
}

.title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11px;
}

.tab-btn.active {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}

.drawer-body {
  padding: 8px 10px 12px;
  overflow-y: auto;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--muted);
  font-size: 12px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.item-main {
  flex: 1;
  cursor: pointer;
}

.item-title {
  font-weight: 700;
  font-size: 12px;
}

.item-meta {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.item-action,
.clear-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 11px;
}

.empty {
  font-size: 12px;
  color: var(--muted);
  padding: 8px 0;
}

.drawer-body::-webkit-scrollbar {
  width: 8px;
}
.drawer-body::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(80, 90, 110, 0.6);
}
.drawer-body::-webkit-scrollbar-track {
  background: var(--map-overlay-bg);
}

@media (max-width: 960px) {
  .poi-shelf {
    right: 10px;
    top: 70px;
  }
  .drawer {
    width: 220px;
  }
}
</style>
