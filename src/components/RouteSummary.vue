<script setup>
import { storeToRefs } from "pinia"
import { useRouteStore } from "../store/routeStore"

const routeStore = useRouteStore()
const { totalDistance, totalDuration } = storeToRefs(routeStore)
</script>

<template>
  <div class="route-summary">
    <h3>Route info</h3>
    <p><strong>Distance:</strong> {{ totalDistance ? totalDistance + ' km' : '—' }}</p>
    <p><strong>ETA:</strong> {{ totalDuration ? totalDuration + ' min' : '—' }}</p>
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
  background: var(--panel);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid var(--panel-border);
  color: var(--fg);
  z-index: 1000;
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
  border-top: 1px solid var(--panel-border);
  margin: 8px 0;
}

.tip {
  color: var(--fg);
  opacity: 0.9;
  font-size: 13px;
}
</style>
