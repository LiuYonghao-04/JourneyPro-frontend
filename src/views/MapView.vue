<template>
  <div class="map-page">
    <RoutePanel />
    <MapContainer />
    <RouteDirections />
    <POIPanel />
  </div>
</template>

<script setup>
import RoutePanel from '../components/RoutePanel.vue'
import MapContainer from '../components/MapContainer.vue'
import RouteDirections from '../components/RouteDirections.vue'
import POIPanel from '../components/POIPanel.vue'
</script>

<style scoped>
.map-page {
  position: relative;
  height: calc(100vh - 56px);
  width: 100vw;
  overflow: hidden;
}
</style>
