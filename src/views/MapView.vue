<template>
  <div class="map-page">
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
import { onMounted, onBeforeUnmount, computed } from 'vue'
import RoutePanel from '../components/RoutePanel.vue'
import MapContainer from '../components/MapContainer.vue'
import RouteDirections from '../components/RouteDirections.vue'
import POIPanel from '../components/POIPanel.vue'
import PlaceDetailsPanel from '../components/PlaceDetailsPanel.vue'
import PoiShelfDrawer from '../components/PoiShelfDrawer.vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const hasPoiDetails = computed(() => !!routeStore.selectedPoi)
const recoDebugEnabled = computed(() => !!routeStore.recoDebugEnabled)
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
