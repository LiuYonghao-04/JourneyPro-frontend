<template>
  <div class="map-page">
    <div class="parking-widget">
      <button class="parking-btn" :disabled="parkingLoading || !hasRouteAnchors" @click="requestParkingSearch">
        {{ parkingLoading ? 'Scanning parking...' : 'Arrived: Find Parking' }}
      </button>
    </div>
    <aside v-if="showParkingPanel" class="parking-card parking-card--route">
      <div class="parking-head">
        <div class="parking-head-copy">
          <strong>Nearby parking</strong>
          <span>Within {{ parkingResult.searched_radius_m }} m of {{ routeStore.endAddress || 'destination' }}</span>
        </div>
        <div class="parking-head-actions">
          <span class="parking-count">{{ parkingResult.items.length }}</span>
          <button class="parking-close" type="button" @click="clearParkingResults">Close</button>
        </div>
      </div>
      <div class="parking-list">
        <button
          v-for="(item, index) in parkingResult.items"
          :key="`${item.source}-${item.id || ''}-${item.lat}-${item.lng}`"
          :class="['parking-item', { active: parkingFocusKey === getParkingKey(item) }]"
          type="button"
          @click="focusParking(item)"
          @mouseenter="highlightParking(item)"
          @focus="highlightParking(item)"
        >
          <span class="parking-rank">{{ index + 1 }}</span>
          <div class="parking-copy">
            <strong>{{ item.name || 'Parking' }}</strong>
            <span>{{ item.address || item.source }}</span>
          </div>
          <div class="parking-meta">
            <span>{{ Math.round(item.distance_m || 0) }} m</span>
            <span>{{ item.source === 'local_poi' ? 'Local' : 'OSM' }}</span>
          </div>
        </button>
      </div>
      <div class="parking-foot">
        <span>Click a row to center it on the map.</span>
      </div>
    </aside>
    <div class="debug-widget">
      <button class="debug-btn" @click="toggleDebug">
        {{ recoDebugEnabled ? 'Debug On' : 'Debug Off' }}
      </button>
      <div v-if="recoDebugEnabled && debugSummary" class="debug-card">
        <div>Req {{ routeStore.recommendationRequestId || '-' }}</div>
        <div>Alg {{ routeStore.recommendationVersion || '-' }} | {{ routeStore.recommendationBucket || '-' }}</div>
        <div>Cand {{ debugSummary.candidates }} | P95 target 800ms</div>
        <div v-if="debugSummary.totalMs !== null">Latency {{ debugSummary.totalMs }}ms</div>
      </div>
    </div>
    <RoutePanel />
    <MapContainer />
    <RouteDirections v-if="!showParkingPanel" :compact="hasPoiDetails" />
    <PlaceDetailsPanel />
    <PoiShelfDrawer />
    <POIPanel />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue'
import RoutePanel from '../components/RoutePanel.vue'
import MapContainer from '../components/MapContainer.vue'
import RouteDirections from '../components/RouteDirections.vue'
import POIPanel from '../components/POIPanel.vue'
import PlaceDetailsPanel from '../components/PlaceDetailsPanel.vue'
import PoiShelfDrawer from '../components/PoiShelfDrawer.vue'
import { useRouteStore } from '../store/routeStore'
import { ElMessageBox } from 'element-plus'
import { apiUrl } from '../config/api'

const routeStore = useRouteStore()
const hasPoiDetails = computed(() => !!routeStore.selectedPoi)
const recoDebugEnabled = computed(() => !!routeStore.recoDebugEnabled)
const parkingLoading = ref(false)
const parkingResult = computed(() => routeStore.parkingSearchResult)
const parkingFocusKey = computed(() => routeStore.parkingFocusKey)
const showParkingPanel = computed(() => !!parkingResult.value?.items?.length)
const hasRouteAnchors = computed(
  () =>
    Number.isFinite(Number(routeStore.startLat)) &&
    Number.isFinite(Number(routeStore.startLng)) &&
    Number.isFinite(Number(routeStore.endLat)) &&
    Number.isFinite(Number(routeStore.endLng))
)
const debugSummary = computed(() => {
  const diagnostics = routeStore.recommendationDiagnostics
  if (!diagnostics) return null
  const candidates = Number(diagnostics?.recall_counts?.total_candidates)
  const totalMs = Number(diagnostics?.latency_ms?.total_ms)
  return {
    candidates: Number.isFinite(candidates) ? candidates : 0,
    totalMs: Number.isFinite(totalMs) ? Math.round(totalMs) : null,
  }
})

const getParkingKey = (item) => {
  if (!item) return null
  if (item.source && item.id !== undefined && item.id !== null && item.id !== '') {
    return `${item.source}:${item.id}`
  }
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    return `ll:${Number(item.lat).toFixed(6)},${Number(item.lng).toFixed(6)}`
  }
  return null
}

const toggleDebug = () => {
  routeStore.setRecoDebugEnabled(!routeStore.recoDebugEnabled)
  routeStore.fetchRecommendedPois()
}

const requestParkingSearch = () => {
  routeStore.requestParkingSearch()
}

const searchParkingNearby = async () => {
  if (!hasRouteAnchors.value || parkingLoading.value) return
  parkingLoading.value = true
  try {
    const params = new URLSearchParams({
      lat: String(routeStore.endLat),
      lng: String(routeStore.endLng),
      limit: '6',
    })
    const res = await fetch(`${apiUrl('/api/poi/parking-nearby')}?${params.toString()}`)
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Parking query failed')
    }
    if (!data?.data?.found || !(data?.data?.items || []).length) {
      routeStore.clearParkingSearchResult()
      await ElMessageBox.alert('No parking found within 1 km of the destination.', 'Parking nearby', {
        confirmButtonText: 'OK',
      })
      return
    }
    routeStore.setParkingSearchResult(data.data)
    if (Array.isArray(data.data.items) && data.data.items.length) {
      focusParking(data.data.items[0], { zoom: 16 })
    }
  } catch (err) {
    await ElMessageBox.alert(err?.message || 'Parking query failed', 'Parking nearby', {
      confirmButtonText: 'OK',
    })
  } finally {
    parkingLoading.value = false
  }
}

const clearParkingResults = () => {
  routeStore.clearParkingSearchResult()
}

const highlightParking = (item) => {
  routeStore.setParkingFocus(item)
}

const focusParking = (item, options = {}) => {
  if (!item) return
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  routeStore.setParkingFocus(item)
  routeStore.requestFocusPoint(lat, lng, Number(options.zoom) || 17)
}

const isTypingTarget = (target) => {
  if (!target) return false
  const tag = (target.tagName || '').toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

const onKeyDown = (e) => {
  if (!e || e.defaultPrevented) return
  if (isTypingTarget(e.target)) return

  if (e.key === 'Escape') {
    routeStore.clearHoveredStep()
    routeStore.clearPinnedStep()
    routeStore.clearSelectedPoi()
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    routeStore.selectAdjacentPoi(1)
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    routeStore.selectAdjacentPoi(-1)
    return
  }

  if (e.key === 'f' || e.key === 'F') {
    routeStore.requestFitRoute()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

watch(
  () => routeStore.parkingSearchNonce,
  (nonce, prev) => {
    if (nonce === prev || !nonce) return
    searchParkingNearby()
  }
)
</script>

<style scoped>
.map-page {
  position: relative;
  height: calc(100vh - 56px);
  width: 100vw;
  overflow: hidden;
}
.parking-widget {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100002;
}
.parking-btn {
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--map-overlay-bg) 92%, #4f8cff 8%);
  color: var(--map-overlay-fg);
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
}
.parking-btn:disabled {
  opacity: 0.65;
  cursor: default;
}
.parking-card {
  width: min(340px, calc(100vw - 28px));
  border-radius: 18px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--map-overlay-bg) 94%, transparent);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(18px);
  padding: 12px 12px 10px;
  color: var(--map-overlay-fg);
}
.parking-card--route {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1100;
  width: 350px;
  max-height: 90vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: 14px 16px 16px;
}
.parking-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.parking-head-copy {
  display: grid;
  gap: 2px;
}
.parking-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.parking-head strong,
.parking-item strong {
  display: block;
}
.parking-head span,
.parking-item span {
  color: color-mix(in srgb, var(--map-overlay-fg) 72%, transparent);
  font-size: 12px;
}
.parking-close {
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 92%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 86%, transparent);
  color: var(--map-overlay-fg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 6px 10px;
}
.parking-count {
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #22d3ee 18%, var(--map-overlay-bg) 82%);
  border: 1px solid color-mix(in srgb, #22d3ee 38%, var(--map-overlay-border) 62%);
  color: var(--map-overlay-fg);
  font-weight: 800;
  font-size: 12px;
}
.parking-list {
  display: grid;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
}
.parking-item {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 90%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 82%, transparent);
  border-radius: 14px;
  padding: 10px 12px;
  color: var(--map-overlay-fg);
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.parking-item:hover,
.parking-item.active {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #22d3ee 42%, var(--map-overlay-border) 58%);
  background: color-mix(in srgb, #22d3ee 10%, var(--map-overlay-bg) 90%);
  box-shadow: 0 14px 26px rgba(8, 145, 178, 0.14);
}
.parking-rank {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  background: color-mix(in srgb, #0f172a 12%, var(--map-overlay-bg) 88%);
  border: 1px solid color-mix(in srgb, #22d3ee 28%, var(--map-overlay-border) 72%);
}
.parking-copy {
  min-width: 0;
}
.parking-copy strong,
.parking-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.parking-meta {
  display: grid;
  justify-items: end;
  gap: 2px;
}
.parking-foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--map-overlay-border) 80%, transparent);
  font-size: 12px;
  color: color-mix(in srgb, var(--map-overlay-fg) 70%, transparent);
}
.debug-widget {
  position: absolute;
  bottom: 1px;
  right: 1px;
  z-index: 100001;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.debug-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.debug-card {
  min-width: 220px;
  border-radius: 12px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--map-overlay-bg) 92%, transparent);
  color: var(--map-overlay-fg);
  font-size: 11px;
  line-height: 1.45;
  padding: 8px 10px;
}

@media (max-width: 900px) {
  .parking-card--route {
    top: auto;
    right: 12px;
    bottom: 84px;
    left: 12px;
    width: auto;
    max-height: min(42vh, 320px);
  }
}
</style>
