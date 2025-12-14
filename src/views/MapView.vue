<template>
  <div class="map-page">
    <RoutePanel />
    <MapContainer />
    <RouteDirections />
    <POIPanel />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import RoutePanel from '../components/RoutePanel.vue'
import MapContainer from '../components/MapContainer.vue'
import RouteDirections from '../components/RouteDirections.vue'
import POIPanel from '../components/POIPanel.vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()

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
</style>
