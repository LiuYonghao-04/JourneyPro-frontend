<template>
  <div class="map-page">
    <div class="parking-widget">
      <button class="parking-btn" :disabled="parkingLoading || !hasRouteAnchors" @click="searchParkingNearby">
        {{ parkingLoading ? 'Scanning parking...' : 'Arrived: Find Parking' }}
      </button>
      <div v-if="parkingResult?.items?.length" class="parking-card">
        <div class="parking-head">
          <div>
            <strong>Nearby parking</strong>
            <span>Within {{ parkingResult.searched_radius_m }} m of {{ routeStore.endAddress || 'destination' }}</span>
          </div>
          <button class="parking-close" type="button" @click="parkingResult = null">x</button>
        </div>
        <div class="parking-list">
          <button
            v-for="item in parkingResult.items"
            :key="`${item.source}-${item.id || ''}-${item.lat}-${item.lng}`"
            class="parking-item"
            type="button"
            @click="focusParking(item)"
          >
            <div>
              <strong>{{ item.name || 'Parking' }}</strong>
              <span>{{ item.address || item.source }}</span>
            </div>
            <div class="parking-meta">
              <span>{{ Math.round(item.distance_m || 0) }} m</span>
              <span>{{ item.source === 'local_poi' ? 'Local' : 'OSM' }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
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
    <RouteDirections :compact="hasPoiDetails" />
    <PlaceDetailsPanel />
    <PoiShelfDrawer />
    <POIPanel />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
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
const parkingResult = ref(null)
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

const toggleDebug = () => {
  routeStore.setRecoDebugEnabled(!routeStore.recoDebugEnabled)
  routeStore.fetchRecommendedPois()
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
      parkingResult.value = null
      await ElMessageBox.alert('No parking found within 1 km of the destination.', 'Parking nearby', {
        confirmButtonText: 'OK',
      })
      return
    }
    parkingResult.value = data.data
  } catch (err) {
    await ElMessageBox.alert(err?.message || 'Parking query failed', 'Parking nearby', {
      confirmButtonText: 'OK',
    })
  } finally {
    parkingLoading.value = false
  }
}

const focusParking = (item) => {
  if (!item) return
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  routeStore.requestFocusPoint(lat, lng, 17)
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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
  width: min(420px, calc(100vw - 32px));
  border-radius: 18px;
  border: 1px solid var(--map-overlay-border);
  background: color-mix(in srgb, var(--map-overlay-bg) 94%, transparent);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.2);
  padding: 12px;
  color: var(--map-overlay-fg);
}
.parking-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
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
  border: none;
  background: transparent;
  color: var(--map-overlay-fg);
  cursor: pointer;
  font-size: 16px;
}
.parking-list {
  display: grid;
  gap: 8px;
}
.parking-item {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--map-overlay-border) 90%, transparent);
  background: color-mix(in srgb, var(--map-overlay-bg) 82%, transparent);
  border-radius: 14px;
  padding: 10px 12px;
  color: var(--map-overlay-fg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;
}
.parking-meta {
  display: grid;
  justify-items: end;
  gap: 2px;
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
</style>
