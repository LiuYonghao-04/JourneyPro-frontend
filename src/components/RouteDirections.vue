<script setup>
import { storeToRefs } from "pinia"
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import { useRouteStore } from "../store/routeStore"

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})

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
  executionMode,
  executionTargets,
  executionCurrentTarget,
  executionProgress,
} = storeToRefs(routeStore)
const collapsed = ref(false)
const hasRoute = computed(() => steps.value && steps.value.length > 0)
const hasExecutionTargets = computed(() => Array.isArray(executionTargets.value) && executionTargets.value.length > 0)
const theme = ref(document.body.getAttribute("data-theme") || "dark")
const stepsEl = ref(null)
let themeObserver = null
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute("data-theme") || "dark"
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] })
  routeStore.syncExecutionTargets()
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

const executionTargetMap = computed(() => {
  const map = new Map()
  ;(executionTargets.value || []).forEach((target) => {
    if (target.kind === "destination") {
      map.set("destination", target)
      return
    }
    map.set(`waypoint:${target.sourceIndex}`, target)
  })
  return map
})

const getStepExecutionTarget = (step) => {
  if (!step?.arrivalKind) return null
  if (step.arrivalKind === "destination") {
    return executionTargetMap.value.get("destination") || null
  }
  if (step.arrivalKind === "waypoint") {
    return executionTargetMap.value.get(`waypoint:${step.legIndex}`) || null
  }
  return null
}

const getStepExecutionStatus = (step) => getStepExecutionTarget(step)?.status || null

const getStepExecutionLabel = (step) => {
  const status = getStepExecutionStatus(step)
  if (status === "current") return "Next stop"
  if (status === "visited") return "Reached"
  if (status === "skipped") return "Skipped"
  if (status === "pending") return "Upcoming"
  return ""
}

const progressPercent = computed(() => Number(executionProgress.value?.percent) || 0)
const currentStopLabel = computed(() => {
  if (executionCurrentTarget.value?.label) return executionCurrentTarget.value.label
  if (executionProgress.value?.isCompleted) return "Trip completed"
  return "Execution not started"
})
const executionModeLabel = computed(() => {
  if (executionProgress.value?.isCompleted) return "Completed"
  return executionMode.value ? "Live" : "Ready"
})
const executionSummary = computed(() => {
  if (!hasExecutionTargets.value) return "Add waypoints or keep the destination to start execution."
  if (executionProgress.value?.isCompleted) {
    return `Visited ${executionProgress.value.visited} stops, skipped ${executionProgress.value.skipped}.`
  }
  if (executionMode.value && executionCurrentTarget.value) {
    return `${executionProgress.value.remaining} stops left. Current target: ${executionCurrentTarget.value.label}.`
  }
  return `${executionProgress.value.total} tracked stops ready for this route.`
})
const canStartExecution = computed(() => hasRoute.value && hasExecutionTargets.value && !executionMode.value)
const canAdvanceExecution = computed(
  () => !!executionMode.value && !!executionCurrentTarget.value && !executionProgress.value?.isCompleted
)

const startExecution = () => {
  routeStore.startExecution()
}

const markReached = () => {
  routeStore.markExecutionReached()
}

const skipStop = () => {
  routeStore.skipExecutionTarget()
}

const focusCurrentTarget = () => {
  routeStore.focusExecutionTarget()
}

const endExecution = () => {
  routeStore.endExecution()
  routeStore.requestParkingSearch()
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
  <div class="directions-panel" :class="[{ collapsed, compact }, theme]">
    <div class="header" @click="toggle">
      <div class="title">Directions</div>
      <button class="collapse-btn collapse-inline" @click.stop="toggle">
        {{ collapsed ? 'Expand' : 'Collapse' }}
      </button>
<!--      <div class="meta">{{ startAddress }} -> {{ endAddress }}</div>-->
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
      <div v-if="hasRoute && hasExecutionTargets" class="execution-shell">
        <div
          class="execution-hero"
          :class="{
            live: executionMode,
            done: executionProgress?.isCompleted,
          }"
        >
          <div class="execution-topline">
            <span class="execution-kicker">Trip progress</span>
            <span class="execution-mode">{{ executionModeLabel }}</span>
          </div>
          <div class="execution-main">
            <div>
              <div class="execution-title">{{ currentStopLabel }}</div>
              <div class="execution-copy">{{ executionSummary }}</div>
            </div>
            <div class="execution-metrics">
              <div class="metric-card">
                <span class="metric-value">{{ executionProgress?.visited || 0 }}</span>
                <span class="metric-label">Reached</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">{{ executionProgress?.remaining || 0 }}</span>
                <span class="metric-label">Remaining</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">{{ executionProgress?.skipped || 0 }}</span>
                <span class="metric-label">Skipped</span>
              </div>
            </div>
          </div>
          <div class="progress-bar">
            <span class="progress-fill" :style="{ width: `${progressPercent}%` }"></span>
          </div>
          <div class="execution-actions">
            <button v-if="canStartExecution" class="exec-btn primary" @click="startExecution">Start Trip</button>
            <template v-else>
              <button class="exec-btn primary" :disabled="!canAdvanceExecution" @click="markReached">
                Mark Reached
              </button>
              <button class="exec-btn ghost" :disabled="!canAdvanceExecution" @click="skipStop">Skip Stop</button>
              <button class="exec-btn ghost" :disabled="!executionCurrentTarget" @click="focusCurrentTarget">
                Focus Next
              </button>
              <button class="exec-btn subtle" @click="endExecution">End Trip</button>
            </template>
          </div>
        </div>
      </div>

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
              current: getStepExecutionStatus(s) === 'current',
              visited: getStepExecutionStatus(s) === 'visited',
              skipped: getStepExecutionStatus(s) === 'skipped',
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
              <div
                v-if="getStepExecutionTarget(s)"
                class="exec-step-badge"
                :class="`is-${getStepExecutionStatus(s)}`"
              >
                {{ getStepExecutionLabel(s) }}
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
  width: 350px;
  max-height: 90vh;
  overflow: hidden;
  background: var(--map-overlay-bg);
  border: 1px solid var(--map-overlay-border);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border-radius: 18px;
  padding: 14px 16px 20px 16px;
  color: var(--map-overlay-fg);
  z-index: 1100;
  transition: background-color 1s ease, border-color 1s ease, color 1s ease;
}

.directions-panel.collapsed {
  max-height: 80px;
  cursor: pointer;
}
.header {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 6px;
  column-gap: 10px;
  align-items: center;
}
.title {
  font-weight: 700;
  font-size: 17px;
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
  gap: 10px;
  align-items: center;
  justify-self: end;
}
.action-btn {
  border: 1px solid var(--map-overlay-border);
  background: var(--map-overlay-bg);
  color: var(--map-overlay-fg);
  border-radius: 10px;
  padding: 5px 11px;
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
  padding: 5px 11px;
  cursor: pointer;
}
.steps {
  margin-top: 12px;

  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: calc(80vh - 100px);
  padding-right: 10px;
}
.execution-shell {
  margin-top: 14px;
  margin-bottom: 10px;
}
.execution-hero {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.24);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.14), rgba(15, 23, 42, 0.06));
}
.execution-hero.live {
  border-color: rgba(34, 197, 94, 0.28);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.14), rgba(15, 23, 42, 0.06));
}
.execution-hero.done {
  border-color: rgba(14, 165, 233, 0.28);
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.14), rgba(15, 23, 42, 0.06));
}
.execution-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.execution-kicker {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.execution-mode {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.2);
}
.execution-main {
  display: grid;
  gap: 12px;
}
.execution-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}
.execution-copy {
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.execution-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.metric-card {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.1);
}
.metric-value {
  font-size: 18px;
  font-weight: 800;
}
.metric-label {
  color: var(--muted);
  font-size: 12px;
}
.progress-bar {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}
.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa 0%, #34d399 100%);
}
.execution-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.exec-btn {
  border-radius: 11px;
  padding: 8px 12px;
  border: 1px solid var(--map-overlay-border);
  background: transparent;
  color: var(--map-overlay-fg);
  font-weight: 700;
  cursor: pointer;
}
.exec-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.exec-btn.primary {
  background: var(--btn-primary);
  color: var(--btn-text);
  border-color: transparent;
}
.exec-btn.ghost {
  background: rgba(15, 23, 42, 0.12);
}
.exec-btn.subtle {
  background: rgba(148, 163, 184, 0.08);
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
  gap: 10px;
  padding: 10px;
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
.step.current {
  border-color: rgba(96, 165, 250, 0.64);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.14);
}
.step.visited {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.08);
}
.step.skipped {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(100, 116, 139, 0.08);
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
.exec-step-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 6px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--map-overlay-fg);
}
.exec-step-badge.is-current {
  background: rgba(96, 165, 250, 0.18);
  color: #60a5fa;
}
.exec-step-badge.is-visited {
  background: rgba(34, 197, 94, 0.18);
  color: #22c55e;
}
.exec-step-badge.is-skipped {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
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
.directions-panel.light .execution-hero {
  border-color: rgba(37, 99, 235, 0.16);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(148, 163, 184, 0.04));
}
.directions-panel.light .execution-hero.live {
  border-color: rgba(34, 197, 94, 0.2);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.08), rgba(148, 163, 184, 0.04));
}
.directions-panel.light .execution-hero.done {
  border-color: rgba(14, 165, 233, 0.2);
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(148, 163, 184, 0.04));
}
.directions-panel.light .metric-card {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(148, 163, 184, 0.18);
}
.directions-panel.light .execution-mode {
  background: rgba(255, 255, 255, 0.84);
  border-color: rgba(148, 163, 184, 0.2);
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
.directions-panel.light .step.current {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.directions-panel.light .step.visited {
  border-color: rgba(34, 197, 94, 0.34);
  background: rgba(34, 197, 94, 0.06);
}
.directions-panel.light .step.skipped {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
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
.directions-panel.light .exec-step-badge.is-current {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}
.directions-panel.light .exec-step-badge.is-visited {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}
.directions-panel.light .exec-step-badge.is-skipped {
  background: rgba(148, 163, 184, 0.14);
  color: #475569;
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
