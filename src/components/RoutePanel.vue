<script setup>
defineProps({ theme: String })
import { ref } from 'vue'
import { useRouteStore } from '../store/routeStore'
import { storeToRefs } from 'pinia'
import { geocode } from '../utils/geocode'
import axios from 'axios'

const routeStore = useRouteStore()
const { startAddress, endAddress, startLat, startLng, endLat, endLng } = storeToRefs(routeStore)
const locating = ref(false)

const AMAP_KEY = '7b3d51a4bac970421ba4ee69861bb326'

// ====== 关键：为自动补全加 防抖 + 结果缓存 + 选择锁 ======
let fetchTimer = null
let lastResults = []      // 缓存上一次非空结果，避免空数组导致收起
let lockFetch = false     // 选择时短暂锁定，避免立即再次触发 fetch

const fetchSuggestions = (queryString, cb) => {
  if (lockFetch) return cb(lastResults)             // 选择后的瞬间，用缓存结果顶住
  if (!queryString) { lastResults = []; return cb([]) }

  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(async () => {
    try {
      const url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(queryString)}&key=${AMAP_KEY}`
      const res = await axios.get(url)
      let results = []
      if (res.data && Array.isArray(res.data.tips) && res.data.tips.length > 0) {
        results = res.data.tips
            .filter(tip => tip.location && tip.name)
            .map(tip => ({
              value: tip.name,
              location: tip.location,   // "lng,lat"
              district: tip.district || ''
            }))
      }
      if (res.data && res.data.status !== '1') {
        console.warn('高德API请求异常：', res.data);
        cb(lastResults.length ? lastResults : [{ value: '未找到匹配地点', location: '' }])
        return
      }

      // 如果这次为空但 query 还在，继续用上次非空结果，避免弹层直接收起
      if (results.length === 0 && queryString.trim().length > 0) {
        cb(lastResults)
      } else {
        lastResults = results
        cb(results)
      }
    } catch (e) {
      // 出错也继续用缓存，保持弹层稳定
      cb(lastResults)
    }
  }, 280) // 防抖时间（可按需调 200~400ms）
}

// 选择一个起点
const handleSelectStart = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  startAddress.value = item.value
  const [lng, lat] = item.location.split(',')
  routeStore.setStart(parseFloat(lat), parseFloat(lng))
}

// 选择一个终点
const handleSelectEnd = (item) => {
  lockFetch = true
  setTimeout(() => (lockFetch = false), 500)
  endAddress.value = item.value
  const [lng, lat] = item.location.split(',')
  routeStore.setEnd(parseFloat(lat), parseFloat(lng))
}

// 手动解析按钮（保留）
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

// 定位
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
</script>

<template>
  <div class="control-panel">
    <div class="header">
      <img src="../assets/logo.png" class="logo" alt="JourneyPro Logo" />
      <h2 class="title">JourneyPro</h2>
    </div>

    <el-form label-position="top" label-width="60px" size="small">
      <el-form-item label="起点：">
        <el-autocomplete
            v-model="startAddress"
            :fetch-suggestions="fetchSuggestions"
            placeholder="请输入起点"
            size="small"
            @select="handleSelectStart"
            :trigger-on-focus="true"
            :teleported="false"
            popper-class="jp-autocomplete"
        />
      </el-form-item>

      <el-form-item label="终点：">
        <el-autocomplete
            v-model="endAddress"
            :fetch-suggestions="fetchSuggestions"
            placeholder="请输入终点"
            size="small"
            @select="handleSelectEnd"
            :trigger-on-focus="true"
            :teleported="false"
            popper-class="jp-autocomplete"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" size="small" @click="updateFromAddress">解析地址</el-button>
        <el-button type="success" size="small" :loading="locating" @click="locateMe">定位</el-button>
      </el-form-item>
    </el-form>

    <div class="coords">
      <span>起点: {{ startLat.toFixed(4) }}, {{ startLng.toFixed(4) }}</span><br/>
      <span>终点: {{ endLat.toFixed(4) }}, {{ endLng.toFixed(4) }}</span>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 10px;
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
</style>
