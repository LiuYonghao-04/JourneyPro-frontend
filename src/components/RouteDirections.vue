<script setup>
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'
import { useRouteStore } from '../store/routeStore'

const routeStore = useRouteStore()
const { totalDistance, totalDuration, steps} = storeToRefs(routeStore)
const collapsed = ref(false)
const hasRoute = computed(() => steps.value && steps.value.length > 0)
const toggle = () => { collapsed.value = !collapsed.value }
</script>

<template>
  <div class="directions-panel" :class="{ collapsed }">
    <div class="header" @click="toggle">
      <div class="title">Directions</div>
<!--      <div class="meta">{{ startAddress }} → {{ endAddress }}</div>-->
      <div class="summary">
        <span>{{ totalDistance ? totalDistance + ' km' : '—' }}</span>
        <span>·</span>
        <span>{{ totalDuration ? totalDuration + ' min' : '—' }}</span>
      </div>
      <div></div>
      <button class="collapse-btn">{{ collapsed ? 'Expand' : 'Collapse' }}</button>
    </div>

    <div v-if="!collapsed">
      <div class="steps" v-if="hasRoute">
        <div class="step" v-for="(s, idx) in steps" :key="idx">
          <div class="step-num">{{ idx + 1 }}</div>
          <div class="step-body">
            <div class="instruction">{{ s.instruction }}</div>
            <div class="detail">
              <span v-if="s.road">{{ s.road }} · </span>{{ s.distance }} km · {{ s.duration }} min
            </div>
          </div>
        </div>
      </div>
      <div class="empty" v-else>Route not ready yet.</div>
    </div>
  </div>
</template>

<style scoped>
.directions-panel {
  position: absolute;
  top: 60px;
  right: 20px;
  width: 320px;
  max-height: 70vh;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border-radius: 16px;
  padding: 12px 14px;
  color: var(--fg);
  z-index: 1100;
}
.directions-panel.collapsed {
  max-height: 70px;
  cursor: pointer;
}
.header {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 4px;
  column-gap: 8px;
  align-items: center;
}
.title {
  font-weight: 700;
  font-size: 16px;
}
.meta {
  grid-column: 1 / span 2;
  color: var(--muted);
  font-size: 12px;
}
.summary {
  display: flex;
  gap: 6px;
  align-items: center;
  font-weight: 600;
}
.collapse-btn {
  justify-self: end;
  border: 1px solid var(--panel-border);
  background: var(--badge);
  color: var(--fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.steps {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: calc(70vh - 100px);
}
.step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--badge);
  border: 1px solid var(--badge-border);
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--btn-primary);
  color: var(--btn-text);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}
.instruction {
  font-weight: 600;
}
.detail {
  color: var(--muted);
  font-size: 12px;
}
.empty {
  margin-top: 12px;
  color: var(--muted);
}
</style>
