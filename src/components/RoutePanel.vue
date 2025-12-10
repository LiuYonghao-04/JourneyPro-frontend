<script setup>
defineProps({ theme: String })
import { ref, computed } from 'vue'
import { useRouteStore } from '../store/routeStore'
import { storeToRefs } from 'pinia'
import { geocode } from '../utils/geocode'
import axios from 'axios'

const routeStore = useRouteStore()
const { startAddress, endAddress, startLat, startLng, endLat, endLng } = storeToRefs(routeStore)
const viaPoints = computed(() => routeStore.viaPoints || [])
const locating = ref(false)

const AMAP_KEY = '7b3d51a4bac970421ba4ee69861bb326'

// 自动补全防抖 + 结果缓存 + 选择锁
let fetchTimer = null
let lastResults = []
let lockFetch = false

// Disabled Gaode autocomplete; returning empty suggestions
const fetchSuggestions = (_queryString, cb) => {
  lastResults = []
  cb([])
}

const handleSelectStart = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  startAddress.value = item.value
  const [lng, lat] = item.location.split(',')
  routeStore.setStart(parseFloat(lat), parseFloat(lng))
}

const handleSelectEnd = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  endAddress.value = item.value
  const [lng, lat] = item.location.split(',')
  routeStore.setEnd(parseFloat(lat), parseFloat(lng))
}

const updateFromAddress = async () => {
  try {
    const start = await geocode(startAddress.value)
    const end = await geocode(endAddress.value)
    routeStore.setStart(start.lat, start.lng)
    routeStore.setEnd(end.lat, end.lng)
  } catch (err) {
    alert('无法解析地址，请检查输入')
  }
}

const locateMe = () => {
  if (!navigator.geolocation) return alert('浏览器不支持定位')
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      routeStore.setStart(pos.coords.latitude, pos.coords.longitude)
      locating.value = false
    },
    () => {
      alert('无法定位')
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
  <div class="control-panel">
    <div class="header">
      <img src="../assets/logo.png" class="logo" alt="JourneyPro Logo" />
      <h2 class="title">JourneyPro</h2>
    </div>

    <el-form label-position="top" label-width="60px" size="small">
      <el-form-item label="Starting point">
        <el-autocomplete
          v-model="startAddress"
          :fetch-suggestions="fetchSuggestions"
          placeholder="Please enter starting point"
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
          placeholder="Please enter end point"
          size="small"
          @select="handleSelectEnd"
          :trigger-on-focus="true"
          :teleported="false"
          popper-class="jp-autocomplete"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" size="small" @click="updateFromAddress">GO</el-button>
<!--        <el-button type="success" size="small" :loading="locating" @click="locateMe">Positioning</el-button>-->
      </el-form-item>
    </el-form>

    <div class="via-tags" v-if="viaPoints.length">
      <div class="via-header">
        <span class="via-label">Waypoint</span>
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
      <span>Starting point: {{ startLat.toFixed(4) }}, {{ startLng.toFixed(4) }}</span><br />
      <span>Ending point: {{ endLat.toFixed(4) }}, {{ endLng.toFixed(4) }}</span>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 60px;
  left: 10px;
  background: rgba(255, 255, 255, 0.96);
  padding: 12px 14px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  width: 280px;
  backdrop-filter: blur(4px);
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
  color: #333;
  margin: 0;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.coords {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}

.jp-autocomplete {
  z-index: 2000 !important;
}

.via-tags {
  margin: 8px 0 6px;
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #f8fafc;
}

.via-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.via-label {
  font-weight: 600;
  color: #222;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
