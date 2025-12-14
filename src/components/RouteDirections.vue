<script setup>
import { storeToRefs } from "pinia"
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import { useRouteStore } from "../store/routeStore"

const routeStore = useRouteStore()
const {
  totalDistance,
  totalDuration,
  steps,
  legs,
  startAddress,
  endAddress,
  hoveredStepIndex,
  hoveredStepSource,
  pinnedStepIndex,
  pinnedStepSource,
  followRoute,
  isRouting,
  routeError,
} = storeToRefs(routeStore)
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
const fitRoute = () => {
  routeStore.requestFitRoute()
}

const toggleFollow = () => {
  followRoute.value = !followRoute.value
  if (followRoute.value) routeStore.requestFitRoute()
}

const onStepEnter = (idx) => {
  routeStore.setHoveredStep(idx, "list")
}
const onStepLeave = () => {
  routeStore.clearHoveredStep("list")
}

const onStepClick = (idx) => {
  routeStore.togglePinnedStep(idx, "list")
  const step = steps.value?.[idx]
  if (!step || !Array.isArray(step.location)) return
  const [lng, lat] = step.location
  if (typeof lat !== "number" || typeof lng !== "number") return
  routeStore.requestFocusPoint(lat, lng, 16)
}

const legMetaByIndex = computed(() => {
  const map = new Map()
  ;(legs.value || []).forEach((l) => map.set(l.index, l))
  return map
})
const isLegStart = (idx) => {
  if (!steps.value || idx < 0 || idx >= steps.value.length) return false
  if (idx === 0) return true
  return steps.value[idx].legIndex !== steps.value[idx - 1].legIndex
}
const legLabel = (legIndex) => {
  const meta = legMetaByIndex.value.get(legIndex)
  if (!meta) return `Leg ${legIndex + 1}`
  return `${meta.from} -> ${meta.to}`
}
const legSummary = (legIndex) => {
  const meta = legMetaByIndex.value.get(legIndex)
  if (!meta) return ""
  return `${meta.distance} km | ${meta.duration} min`
}

const maneuverIconHtml = (s) => {
  const type = (s?.maneuverType || "").toString().toLowerCase()
  const modifier = (s?.modifier || "").toString().toLowerCase()

  if (type === "depart") return "&#9654;"
  if (type === "arrive") return "&#9679;"
  if (type === "roundabout") return "&#8635;"
  if (type === "uturn") return "&#8634;"

  if (modifier.includes("left")) return "&#8592;"
  if (modifier.includes("right")) return "&#8594;"
  if (modifier.includes("straight")) return "&#8593;"
  return "&#8593;"
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
    if (isCollapsed) return
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      scrollToStep(idx)
    }, 120)
  }
)

watch(
  () => [pinnedStepIndex.value, pinnedStepSource.value, collapsed.value],
  ([idx, source, isCollapsed]) => {
    if (source !== "map") return
    if (typeof idx !== "number") return
    if (isCollapsed) return
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      scrollToStep(idx)
    }, 80)
  }
)
</script>

<template>
  <div class="directions-panel" :class="[{ collapsed }, theme]">
    <div class="header" @click="toggle">
      <div class="title">Directions</div>
      <button class="collapse-btn collapse-inline" @click.stop="toggle">
        {{ collapsed ? 'Expand' : 'Collapse' }}
      </button>
      <div class="meta">{{ startAddress }} -> {{ endAddress }}</div>
      <div class="summary">
        <template v-if="routeError">
          <span class="error">{{ routeError }}</span>
        </template>
        <template v-else>
          <span>{{ totalDistance ? totalDistance + ' km' : 'N/A' }}</span>
          <span>|</span>
          <span>{{ totalDuration ? totalDuration + ' min' : 'N/A' }}</span>
          <span v-if="isRouting" class="loading">Updating...</span>
        </template>
      </div>
      <div class="actions" @click.stop>
        <button class="action-btn" @click="fitRoute">Fit</button>
        <button class="action-btn follow-btn" :class="{ on: followRoute }" @click="toggleFollow">
          {{ followRoute ? 'Auto-fit On' : 'Auto-fit Off' }}
        </button>
      </div>
    </div>

    <div v-if="!collapsed">
      <div class="steps" v-if="hasRoute" ref="stepsEl">
        <template v-for="(s, idx) in steps" :key="idx">
          <div v-if="isLegStart(idx)" class="leg-header">
            <div class="leg-title">{{ legLabel(s.legIndex) }}</div>
            <div class="leg-meta">{{ legSummary(s.legIndex) }}</div>
          </div>

          <div
            class="step"
            :class="{
              active: hoveredStepIndex === idx,
              pinned: pinnedStepIndex === idx,
              waypoint: s.arrivalKind === 'waypoint',
              destination: s.arrivalKind === 'destination',
            }"
            :data-step-index="idx"
            @mouseenter="onStepEnter(idx)"
            @mouseleave="onStepLeave"
            @click="onStepClick(idx)"
          >
            <div class="step-num">{{ idx + 1 }}</div>
            <div class="step-body">
              <div v-if="s.arrivalKind === 'waypoint'" class="badge">
                Waypoint: {{ s.arrivalName }}
              </div>
              <div v-else-if="s.arrivalKind === 'destination'" class="badge destination-badge">
                Destination
              </div>

              <div class="instruction">
                <span class="icon" v-html="maneuverIconHtml(s)"></span>
                <span>{{ s.instruction }}</span>
              </div>
              <div class="detail">
                <span v-if="s.road">{{ s.road }} | </span>{{ s.distance }} km | {{ s.duration }} min
              </div>
            </div>
          </div>
        </template>
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
.collapse-inline {
  padding: 3px 10px;
  font-size: 12px;
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
.loading {
  font-weight: 700;
  font-size: 12px;
  color: var(--muted);
}
.error {
  font-weight: 800;
  font-size: 12px;
  color: #ef4444;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
}
.action-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.follow-btn.on {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}
.collapse-btn {
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
  max-height: calc(80vh - 100px);
  padding-right: 8px;
}
.leg-header {
  padding: 6px 10px 0;
  margin-top: 6px;
}
.leg-title {
  font-weight: 800;
  font-size: 12px;
  color: var(--map-overlay-fg);
  opacity: 0.9;
}
.leg-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
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
  cursor: pointer;
}
.step.pinned {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.16);
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
.destination-badge {
  background: rgba(59, 130, 246, 0.18);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.35);
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 0.5);
  color: var(--map-overlay-fg);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}
.instruction {
  font-weight: 600;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.icon {
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--map-overlay-fg);
  flex: 0 0 20px;
  font-weight: 900;
  line-height: 1;
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
.directions-panel.light .action-btn {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #dfe3ea;
}
.directions-panel.light .follow-btn.on {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}
.directions-panel.light .loading {
  color: #4b5563;
}
.directions-panel.light .step {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}
.directions-panel.light .step.pinned {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.16);
}
.directions-panel.light .leg-title {
  color: #0f172a;
}
.directions-panel.light .leg-meta {
  color: #4b5563;
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
.directions-panel.light .destination-badge {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border: 1px solid rgba(29, 78, 216, 0.2);
}
.directions-panel.light .step-num {
  background: #eef2f7;
  color: #0f172a;
}
.directions-panel.light .icon {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
}
</style>
