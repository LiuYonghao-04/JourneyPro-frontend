<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouteStore } from '../store/routeStore'
import { storeToRefs } from 'pinia'
import { geocode } from '../utils/geocode'
import axios from 'axios'
import logoLight from '../assets/logo.png'
import logoDark from '../assets/logo_dark.png'

const routeStore = useRouteStore()
const { startAddress, endAddress, startLat, startLng, endLat, endLng } = storeToRefs(routeStore)
const viaPoints = computed(() => routeStore.viaPoints || [])
const locating = ref(false)

const MAPBOX_TOKEN = '11111.ex'

let fetchTimer = null
let lastResults = []
let lockFetch = false

const currentTheme = ref(document.body.getAttribute('data-theme') || 'dark')
let themeObserver = null
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    currentTheme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})

const logoSrc = computed(() => (currentTheme.value === 'dark' ? logoDark : logoLight))

// Mapbox forward geocoding autocomplete (limited to London bbox)
const LONDON_BBOX = [-0.489, 51.28, 0.236, 51.686] // [minLng, minLat, maxLng, maxLat]
const LONDON_CENTER = [-0.1278, 51.5074]
const fetchSuggestions = (queryString, cb) => {
  if (lockFetch) return cb(lastResults)
  if (!queryString) {
    lastResults = []
    return cb([])
  }
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(async () => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        queryString
      )}.json?autocomplete=true&limit=5&language=en&proximity=${LONDON_CENTER[0]},${LONDON_CENTER[1]}&bbox=${LONDON_BBOX.join(
        ','
      )}&access_token=${MAPBOX_TOKEN}`
      const res = await axios.get(url)
      const features = res.data?.features || []
      const results = features.map((f) => ({
        value: f.place_name,
        center: f.center, // [lng, lat]
        id: f.id,
      }))
      lastResults = results
      cb(results)
    } catch (e) {
      cb(lastResults)
    }
  }, 250)
}

const handleSelectStart = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  startAddress.value = item.value
  const [lng, lat] = item.center || []
  routeStore.setStart(parseFloat(lat), parseFloat(lng))
}

const handleSelectEnd = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  endAddress.value = item.value
  const [lng, lat] = item.center || []
  routeStore.setEnd(parseFloat(lat), parseFloat(lng))
}

const updateFromAddress = async () => {
  try {
    const start = await geocode(startAddress.value)
    const end = await geocode(endAddress.value)
    routeStore.setStart(start.lat, start.lng)
    routeStore.setEnd(end.lat, end.lng)
  } catch (err) {
    alert('Unable to resolve address. Please check your input.')
  }
}

const locateMe = () => {
  if (!navigator.geolocation) return alert('Geolocation is not supported in this browser.')
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      routeStore.setStart(pos.coords.latitude, pos.coords.longitude)
      locating.value = false
    },
    () => {
      alert('Unable to get your location.')
      locating.value = false
    }
  )
}

const removeViaPoint = (poi) => {
  routeStore.removeViaPoint(poi)
}

const clearAllViaPoints = () => {
  routeStore.clearViaPoints()
}
</script>

<template>
  <div class="control-panel" :class="currentTheme">
    <div class="header">
      <img :src="logoSrc" class="logo" alt="JourneyPro Logo" />
      <h2 class="title">JourneyPro</h2>
    </div>

    <el-form label-position="top" label-width="60px" size="small">
      <el-form-item label="Starting point">
        <el-autocomplete
          v-model="startAddress"
          :fetch-suggestions="fetchSuggestions"
          placeholder="Enter a starting point"
          size="small"
          @select="handleSelectStart"
          :trigger-on-focus="true"
          :teleported="false"
          popper-class="jp-autocomplete"
        />
      </el-form-item>

      <el-form-item label="Ending point">
        <el-autocomplete
          v-model="endAddress"
          :fetch-suggestions="fetchSuggestions"
          placeholder="Enter a destination"
          size="small"
          @select="handleSelectEnd"
          :trigger-on-focus="true"
          :teleported="false"
          popper-class="jp-autocomplete"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" size="small" @click="updateFromAddress">Go</el-button>
        <el-button type="success" size="small" :loading="locating" @click="locateMe">Locate me</el-button>
      </el-form-item>
    </el-form>

    <div class="via-tags" v-if="viaPoints.length">
      <div class="via-header">
        <span class="via-label">Waypoints</span>
        <el-button text size="small" @click="clearAllViaPoints">Clear</el-button>
      </div>
      <div class="tag-list">
        <el-tag
          v-for="poi in viaPoints"
          :key="poi.id || poi.name || `${poi.lat}-${poi.lng}`"
          type="success"
          closable
          @close="removeViaPoint(poi)"
        >
          {{ poi.name || `${poi.lat.toFixed(3)}, ${poi.lng.toFixed(3)}` }}
        </el-tag>
      </div>
    </div>

    <div class="coords">
      <span>Start: {{ startLat.toFixed(4) }}, {{ startLng.toFixed(4) }}</span><br />
      <span>End: {{ endLat.toFixed(4) }}, {{ endLng.toFixed(4) }}</span>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 60px;
  left: 10px;
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  z-index: 1000;
  width: 280px;
  border: 1px solid var(--map-overlay-border);
  transition: background-color 1s ease, border-color 1s ease, color 1s ease;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--map-overlay-fg);
  margin: 0;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.coords {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.jp-autocomplete {
  z-index: 2000 !important;
}

.via-tags {
  margin: 8px 0 6px;
  padding: 8px;
  border: 1px solid var(--map-overlay-border);
  border-radius: 8px;
  background: var(--surface);
}

.via-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  color: var(--map-overlay-fg);
}

.via-label {
  font-weight: 600;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:global(body[data-theme='light']) .control-panel {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
:global(body[data-theme='light']) .control-panel .title,
:global(body[data-theme='light']) .control-panel .via-label {
  color: #0f172a;
}
:global(body[data-theme='light']) .control-panel .coords {
  color: #4b5563;
}
:global(body[data-theme='light']) .control-panel .collapse-btn,
:global(body[data-theme='light']) .control-panel .el-button {
  color: #0f172a;
}
:global(body[data-theme='light']) .control-panel .el-input__wrapper {
  background: #f8fafc;
  border-color: #dfe3ea;
}
:global(body[data-theme='light']) .control-panel .el-input__inner {
  color: #0f172a;
}

.control-panel.light {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.control-panel.light .title,
.control-panel.light .via-label {
  color: #0f172a;
}
.control-panel.light .coords {
  color: #4b5563;
}
.control-panel.light :deep(.el-form-item__label) {
  color: #0f172a;
}
.control-panel.light :deep(.el-input__wrapper) {
  background: #f8fafc;
  border-color: #dfe3ea;
  color: #0f172a;
}
.control-panel.light :deep(.el-input__inner) {
  color: #0f172a;
}
:global(body[data-theme='light']) .control-panel .title,
:global(body[data-theme='light']) .control-panel .via-label {
  color: #0f172a;
}
:global(body[data-theme='light']) .control-panel .coords {
  color: #4b5563;
}
:global(body[data-theme='light']) .control-panel .collapse-btn,
:global(body[data-theme='light']) .control-panel .el-button {
  color: #0f172a;
}
:global(body[data-theme='light']) .control-panel .el-input__wrapper {
  background: #f8fafc;
  border-color: #dfe3ea;
}
:global(body[data-theme='light']) .control-panel .el-input__inner {
  color: #0f172a;
}
:deep(.el-form-item__label) {
  color: var(--map-overlay-fg);
}
:deep(.el-input__wrapper) {
  background: var(--surface);
  color: var(--map-overlay-fg);
  border-color: var(--map-overlay-border);
}
:deep(.el-input__inner) {
  color: var(--map-overlay-fg);
}
:deep(.el-autocomplete-suggestion__wrap) {
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
}
:deep(.el-autocomplete-suggestion__wrap li:hover) {
  background: var(--surface);
}
</style>
