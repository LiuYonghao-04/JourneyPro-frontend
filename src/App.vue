<template>
  <div id="app">
    <RoutePanel />
    <MapContainer />
    <RouteSummary />
  </div>
</template>

<script setup>
import RoutePanel from './components/RoutePanel.vue'
import MapContainer from './components/MapContainer.vue'
import RouteSummary from './components/RouteSummary.vue'
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
