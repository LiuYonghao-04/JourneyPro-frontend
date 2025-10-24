<template>
  <div id="app">
    <!-- 只负责组合，不直接操作地图 -->
    <RoutePanel />
    <MapContainer />
  </div>
</template>

<script setup>
import RoutePanel from './components/RoutePanel.vue'
import MapContainer from './components/MapContainer.vue'
</script>

<style>
body, html, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
