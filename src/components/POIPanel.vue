<template>
  <div class="poi-panel" :class="[theme, panelMode]" :style="panelStyle">
    <div class="panel-head">
      <h3 class="title">Recommended POIs</h3>
      <button class="collapse-btn" @click="togglePanelMode">
        {{ modeActionLabel }}
      </button>
    </div>

    <div v-if="!isCollapsed" class="panel-body">
      <div v-if="loading" class="empty">Loading recommendations...</div>
      <div v-else class="panel-content">
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

        <div v-if="categoryStats.length" class="category-filter">
          <div class="filter-head">
            <span class="filter-title">Categories</span>
            <button v-if="hasCategoryFilter" class="filter-clear" @click="clearCategories">
              Clear
            </button>
          </div>
          <div class="filter-chips">
            <button
              v-for="cat in categoryStats"
              :key="cat.name"
              class="filter-chip"
              :class="{ active: isCategoryActive(cat.name) }"
              :style="{ '--chip-color': cat.color }"
              type="button"
              :aria-pressed="isCategoryActive(cat.name)"
              @click="toggleCategory(cat.name)"
            >
              <span class="chip-dot" :style="{ background: cat.color }"></span>
              <span class="chip-label">{{ cat.name }}</span>
              <span v-if="isCategoryActive(cat.name)" class="chip-badge">Filtered</span>
              <span class="chip-count">{{ cat.count }}</span>
            </button>
          </div>
        </div>

        <div v-if="allPois.length === 0" class="empty">
          No recommendations yet. Plan a route first.
        </div>
        <div v-else-if="pois.length === 0" class="empty">
          No POIs match your filters.
        </div>

        <ul v-else class="poi-list">
          <li
            v-for="(poi, idx) in pois"
            :key="poi.id || poi.name"
            class="poi-item"
            :class="{ selected: isSelected(poi) }"
            :style="{ '--poi-color': routeStore.getPoiCategoryColor(poi.category) }"
            @mouseenter="previewPoi(poi)"
            @mouseleave="clearPreview"
          >
            <div class="poi-rank">{{ idx + 1 }}</div>
            <div class="poi-info" @click="focusPoi(poi)">
              <div class="poi-name">{{ poi.name }}</div>
              <div class="poi-meta">
                <span>{{ poi.category }}</span>
                <span class="dot">|</span>
                <span>Popularity {{ poi.popularity }}</span>
                <span v-if="poi.distance" class="dot">|</span>
                <span v-if="poi.distance">{{ formatDistance(poi.distance) }}</span>
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
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
let themeObserver = null
const panelMode = computed(() => routeStore.poiPanelMode || 'half')
const isCollapsed = computed(() => panelMode.value === 'collapsed')
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const EDGE_OFFSET = 10
const COLLAPSED_HEIGHT = 56

onMounted(() => {
  routeStore.fetchRecommendedPois()
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
  window.removeEventListener('resize', updateViewportHeight)
})

watch(
  () => panelMode.value,
  (mode) => {
    if (mode === 'collapsed') clearPreview()
  }
)

const allPois = computed(() => routeStore.recommendedPOIs || [])
const pois = computed(() => routeStore.filteredRecommendedPOIs || [])
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
const selectedPoiId = computed(() => {
  const id = routeStore.selectedPoi?.id
  return id !== undefined && id !== null ? String(id) : null
})
const activeCategories = computed(() => routeStore.poiCategoryFilter || [])
const hasCategoryFilter = computed(() => activeCategories.value.length > 0)
const categoryStats = computed(() => {
  const counts = new Map()
  ;(allPois.value || []).forEach((poi) => {
    const raw = String(poi?.category || '').trim()
    if (!raw) return
    const current = counts.get(raw) || 0
    counts.set(raw, current + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      color: routeStore.getPoiCategoryColor(name),
    }))
    .sort((a, b) => b.count - a.count)
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
  routeStore.reorderRecommendedPois()
}
const isViaPoint = (poi) => {
  return (routeStore.viaPoints || []).some((p) =>
    poi.id ? p.id === poi.id : p.lat === poi.lat && p.lng === poi.lng
  )
}

const isSelected = (poi) => {
  if (!poi) return false
  const pid = poi.id !== undefined && poi.id !== null ? String(poi.id) : null
  if (pid && selectedPoiId.value) return pid === selectedPoiId.value
  if (typeof poi.lat === 'number' && typeof poi.lng === 'number' && routeStore.selectedPoi) {
    return poi.lat === routeStore.selectedPoi.lat && poi.lng === routeStore.selectedPoi.lng
  }
  return false
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
  routeStore.selectPoi(poi)
  routeStore.requestFocusPoint(poi.lat, poi.lng, 16)
}

const toggleCategory = (category) => {
  routeStore.togglePoiCategoryFilter(category)
}

const clearCategories = () => {
  routeStore.clearPoiCategoryFilter()
}

const isCategoryActive = (category) => {
  return (routeStore.poiCategoryFilter || []).includes(String(category || '').trim())
}

const previewPoi = (poi) => {
  if (!poi || typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return
  routeStore.setPreviewPoi(poi)
}

const clearPreview = () => {
  routeStore.clearPreviewPoi()
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getPanelHeights = () => {
  const height = viewportHeight.value || 800
  const reserved = COLLAPSED_HEIGHT + EDGE_OFFSET * 13
  const full = Math.max(260, height - reserved )
  const halfMax = Math.min(400, full - 40)
  const halfMin = Math.min(220, halfMax)
  const half = clamp(Math.round(height * 0.45), halfMin, halfMax)
  return {
    collapsed: COLLAPSED_HEIGHT,
    half,
    full,
  }
}

const panelStyle = computed(() => {
  const heights = getPanelHeights()
  const next = heights[panelMode.value] || heights.half
  return { height: `${next}px` }
})

const modeActionLabel = computed(() => {
  if (panelMode.value === 'collapsed') return 'Expand'
  if (panelMode.value === 'half') return 'Full'
  return 'Collapse'
})

const togglePanelMode = () => {
  const next =
    panelMode.value === 'collapsed' ? 'half' : panelMode.value === 'half' ? 'full' : 'collapsed'
  routeStore.setPoiPanelMode(next)
  if (next === 'collapsed') clearPreview()
}

const updateViewportHeight = () => {
  if (typeof window === 'undefined') return
  viewportHeight.value = window.innerHeight || 800
}

const formatDistance = (meters) => {
  const num = Number(meters)
  if (!Number.isFinite(num)) return ''
  const km = num / 1000
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(2)} km`
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
  overflow: hidden;
  backdrop-filter: none;
  color: var(--map-overlay-fg);
  transition: background-color 1s ease, border-color 1s ease, color 1s ease, height 0.25s ease;
  display: flex;
  flex-direction: column;
}
.poi-panel.collapsed {
  height: 56px;
  padding: 10px 14px;
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
.panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.poi-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  margin-top: 10px;
  padding:0 8px 0 20px;
}
.poi-item {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--map-overlay-border);
  border-left: 3px solid color-mix(in srgb, var(--poi-color, transparent) 70%, transparent);
}
.poi-item.selected {
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border-radius: 10px;
  padding: 8px 8px;
}
.poi-rank {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: color-mix(in srgb, var(--poi-color, var(--badge)) 30%, transparent);
  border: 1px solid color-mix(in srgb, var(--poi-color, var(--map-overlay-border)) 40%, var(--map-overlay-border));
  color: var(--map-overlay-fg);
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
  font-size: 11px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.poi-reason {
  font-size: 10px;
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

.category-filter {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 70%, transparent);
  border: 1px solid var(--map-overlay-border);
}
.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.filter-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--map-overlay-fg);
}
.filter-clear {
  border: 1px solid var(--map-overlay-border);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}
.filter-clear:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--map-overlay-fg) 20%, transparent),
    0 0 0 4px color-mix(in srgb, var(--map-overlay-bg) 90%, transparent);
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--map-overlay-border);
  background: transparent;
  color: var(--map-overlay-fg);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.filter-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-color) 45%, transparent),
    0 0 0 4px color-mix(in srgb, var(--map-overlay-bg) 90%, transparent);
}
.filter-chip.active {
  background: color-mix(in srgb, var(--chip-color) 18%, transparent);
  border-color: color-mix(in srgb, var(--chip-color) 70%, var(--map-overlay-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--chip-color) 60%, transparent),
    0 10px 18px rgba(0, 0, 0, 0.18);
}
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #94a3b8;
}
.filter-chip.active .chip-dot {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-color) 40%, transparent);
}
.filter-chip.active .chip-label {
  font-weight: 600;
}
.chip-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: color-mix(in srgb, var(--chip-color) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-color) 45%, transparent);
}
.chip-label {
  white-space: nowrap;
}
.chip-count {
  font-size: 10px;
  color: var(--muted);
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.filter-chip.active .chip-count {
  color: var(--map-overlay-fg);
  border-color: color-mix(in srgb, var(--chip-color) 45%, transparent);
  background: color-mix(in srgb, var(--chip-color) 14%, transparent);
  font-weight: 600;
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
