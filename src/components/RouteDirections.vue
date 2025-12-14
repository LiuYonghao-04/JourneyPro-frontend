<script setup>
import { storeToRefs } from "pinia"
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import { useRouteStore } from "../store/routeStore"

const routeStore = useRouteStore()
const { totalDistance, totalDuration, steps, startAddress, endAddress, hoveredStepIndex, hoveredStepSource } = storeToRefs(routeStore)
const collapsed = ref(false)
const hasRoute = computed(() => steps.value && steps.value.length > 0)
const theme = ref(document.body.getAttribute("data-theme") || "dark")
const stepsEl = ref(null)
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
const toggle = () => {
  collapsed.value = !collapsed.value
}

const onStepEnter = (idx) => {
  routeStore.setHoveredStep(idx, "list")
}
const onStepLeave = () => {
  routeStore.clearHoveredStep("list")
}

let scrollTimer = null
const scrollToStep = async (idx) => {
  if (!stepsEl.value) return
  await nextTick()
  const target = stepsEl.value.querySelector(`[data-step-index="${idx}"]`)
  if (!target) return
  const top = target.offsetTop - stepsEl.value.clientHeight / 2 + target.clientHeight / 2
  stepsEl.value.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}

watch(
  () => [hoveredStepIndex.value, hoveredStepSource.value, collapsed.value],
  ([idx, source, isCollapsed]) => {
    if (source !== "map") return
    if (typeof idx !== "number") return
    if (isCollapsed) collapsed.value = false
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      scrollToStep(idx)
    }, 120)
  }
)
</script>

<template>
  <div class="directions-panel" :class="[{ collapsed }, theme]">
    <div class="header" @click="toggle">
      <div class="title">Directions</div>
      <div class="meta">{{ startAddress }} -> {{ endAddress }}</div>
      <div class="summary">
        <span>{{ totalDistance ? totalDistance + ' km' : 'N/A' }}</span>
        <span>|</span>
        <span>{{ totalDuration ? totalDuration + ' min' : 'N/A' }}</span>
      </div>
      <button class="collapse-btn">{{ collapsed ? 'Expand' : 'Collapse' }}</button>
    </div>

    <div v-if="!collapsed">
      <div class="steps" v-if="hasRoute" ref="stepsEl">
        <div
          class="step"
          v-for="(s, idx) in steps"
          :key="idx"
          :class="{
            active: hoveredStepIndex === idx,
            waypoint: s.arrivalKind === 'waypoint',
            destination: s.arrivalKind === 'destination',
          }"
          :data-step-index="idx"
          @mouseenter="onStepEnter(idx)"
          @mouseleave="onStepLeave"
        >
          <div class="step-num">{{ idx + 1 }}</div>
          <div class="step-body">
            <div v-if="s.arrivalKind === 'waypoint'" class="badge">
              Waypoint: {{ s.arrivalName }}
            </div>
            <div class="instruction">{{ s.instruction }}</div>
            <div class="detail">
              <span v-if="s.road">{{ s.road }} | </span>{{ s.distance }} km | {{ s.duration }} min
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
  top: 10px;
  right: 10px;
  width: 320px;
  max-height: 80vh;
  overflow: hidden;
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border-radius: 16px;
  padding: 12px 14px 24px 14px;
  color: var(--map-overlay-fg);
  z-index: 1100;
  transition: background-color 1s ease, border-color 1s ease, color 1s ease;
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
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
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
  max-height: calc(100vh - 100px);
  padding-right: 8px;
}
.step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.step.active {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
  transform: translateY(-1px);
}
.step.waypoint {
  border-left: 4px solid #22c55e;
}
.badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
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

.directions-panel ::-webkit-scrollbar {
  width: 8px;
}
.directions-panel ::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(80, 90, 110, 0.6);
}
.directions-panel ::-webkit-scrollbar-track {
  background: var(--map-overlay-bg);
}
.directions-panel.light ::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.7);
}
.directions-panel.light ::-webkit-scrollbar-track {
  background: #ffffff;
}

.directions-panel.light {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.directions-panel.light .meta {
  color: #4b5563;
}
.directions-panel.light .collapse-btn {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.directions-panel.light .step {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}
.directions-panel.light .step.active {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
}
.directions-panel.light .step.waypoint {
  border-left: 4px solid #22c55e;
}
.directions-panel.light .badge {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.directions-panel.light .step-num {
  background: #eef2f7;
  color: #0f172a;
}
</style>
