<template>
  <div class="poi-panel" :class="[{ collapsed }, theme]">
    <div class="panel-head" @click="toggle">
      <h3 class="title">Recommended POIs</h3>
      <button class="collapse-btn">{{ collapsed ? 'Expand' : 'Collapse' }}</button>
    </div>

    <div v-if="!collapsed">
      <div v-if="loading" class="empty">Loading recommendations...</div>
      <div v-else>
        <div v-if="profileHint" class="profile-hint">
          <span class="hint-label">For you</span>
          <span class="hint-tags">{{ profileHint }}</span>
        </div>

        <div class="tuning">
          <div class="tuning-row">
            <span class="tuning-side">Distance {{ distancePercent }}%</span>
            <span class="tuning-side">Interest {{ interestPercent }}%</span>
          </div>
          <el-slider v-model="tuningValue" :min="0" :max="100" :show-tooltip="false" @change="applyTuning" />
        </div>

        <div v-if="pois.length === 0" class="empty">
          No recommendations yet. Plan a route first.
        </div>

        <ul v-else class="poi-list">
          <li v-for="poi in pois" :key="poi.id || poi.name" class="poi-item">
            <div class="poi-info" @click="focusPoi(poi)">
              <div class="poi-name">{{ poi.name }}</div>
              <div class="poi-meta">
                <span>{{ poi.category }}</span>
                <span class="dot">|</span>
                <span>Popularity {{ poi.popularity }}</span>
              </div>
              <div v-if="poi.reason" class="poi-reason">{{ poi.reason }}</div>
              <div v-if="poi.match_tags?.length" class="poi-tags">
                <span v-for="tag in poi.match_tags.slice(0, 3)" :key="tag" class="poi-tag">#{{ tag }}</span>
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
const loading = computed(() => routeStore.isLoading)
const profile = computed(() => routeStore.recommendationProfile || null)
const profileHint = computed(() => {
  if (!profile.value?.personalized) return ''
  const tags = Array.isArray(profile.value.tags) ? profile.value.tags : []
  const categories = Array.isArray(profile.value.categories) ? profile.value.categories : []
  const combined = [...tags, ...categories].filter(Boolean)
  const unique = [...new Set(combined)].slice(0, 4)
  return unique.join(', ')
})
const tuningValue = computed({
  get() {
    return Math.round(((routeStore.recoInterestWeight ?? 0.5) * 100))
  },
  set(val) {
    const num = Number(val)
    const normalized = Number.isFinite(num) ? num / 100 : 0.5
    routeStore.setRecoInterestWeight(normalized)
  },
})
const interestPercent = computed(() => tuningValue.value)
const distancePercent = computed(() => 100 - tuningValue.value)
const applyTuning = () => {
  routeStore.fetchRecommendedPois()
}
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

const focusPoi = (poi) => {
  if (!poi || typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return
  routeStore.requestFocusPoint(poi.lat, poi.lng, 16)
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
  cursor: pointer;
}
.poi-item:hover .poi-info {
  opacity: 0.95;
}
.poi-item:hover .poi-name {
  text-decoration: underline;
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
.poi-reason {
  font-size: 12px;
  color: var(--map-overlay-fg);
  opacity: 0.85;
  margin-top: 4px;
}
.poi-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.poi-tag {
  font-size: 11px;
  color: var(--muted);
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border: 1px solid var(--map-overlay-border);
  padding: 2px 6px;
  border-radius: 999px;
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
.profile-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-top: 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  border: 1px solid var(--map-overlay-border);
  font-size: 12px;
  color: var(--muted);
}
.hint-label {
  font-weight: 600;
  color: var(--map-overlay-fg);
}
.tuning {
  margin-top: 10px;
  padding: 8px 10px 2px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border: 1px solid var(--map-overlay-border);
}
.tuning-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 2px;
}
.tuning-side {
  color: var(--muted);
  opacity: 0.8;
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
