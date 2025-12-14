<script setup>
import { storeToRefs } from "pinia"
import { useRouteStore } from "../store/routeStore"
import { onMounted, onBeforeUnmount, ref } from "vue"

const routeStore = useRouteStore()
const { totalDistance, totalDuration } = storeToRefs(routeStore)
const theme = ref(document.body.getAttribute("data-theme") || "dark")
let themeObserver = null
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute("data-theme") || "dark"
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] })
})
onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})
</script>

<template>
  <div class="route-summary" :class="theme">
    <h3>Route info</h3>
    <p><strong>Distance:</strong> {{ totalDistance ? totalDistance + ' km' : 'N/A' }}</p>
    <p><strong>ETA:</strong> {{ totalDuration ? totalDuration + ' min' : 'N/A' }}</p>
    <div class="divider"></div>
    <p class="tip">Suggested POIs will show along the path.</p>
  </div>
</template>

<style scoped>
.route-summary {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 260px;
  background: var(--map-overlay-bg);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--map-overlay-border);
  color: var(--map-overlay-fg);
  z-index: 1000;
  transition: background-color 1s ease, border-color 1s ease, color 1s ease;
}

h3 {
  margin-bottom: 8px;
  font-size: 18px;
}

p {
  margin: 6px 0;
  font-size: 14px;
}

.divider {
  border-top: 1px solid var(--map-overlay-border);
  margin: 8px 0;
}

.tip {
  color: var(--map-overlay-fg);
  opacity: 0.9;
  font-size: 13px;
}

.route-summary.light {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.route-summary.light .divider {
  border-top: 1px solid #e5e7eb;
}
</style>
