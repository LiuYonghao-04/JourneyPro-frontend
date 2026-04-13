<template>
  <div class="trips-page">
    <aside class="trip-sidebar">
      <header class="sidebar-head">
        <div>
          <span class="sidebar-kicker">Workspace</span>
          <h1>Trips</h1>
          <p>Manage route-ready trip workspaces created from AI planning and map execution.</p>
        </div>
        <button class="btn ghost small" type="button" @click="fetchTrips" :disabled="tripListLoading || !auth.user?.id">
          {{ tripListLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <section v-if="auth.user?.id && tripList.length" class="sidebar-summary">
        <article class="sidebar-stat">
          <span>Total</span>
          <strong>{{ tripStats.total }}</strong>
        </article>
        <article class="sidebar-stat">
          <span>Active</span>
          <strong>{{ tripStats.active }}</strong>
        </article>
        <article class="sidebar-stat">
          <span>Completed</span>
          <strong>{{ tripStats.completed }}</strong>
        </article>
        <article class="sidebar-stat">
          <span>Starred</span>
          <strong>{{ tripStats.starred }}</strong>
        </article>
      </section>

      <div v-if="!auth.user?.id" class="sidebar-empty">
        Login to create and manage trip workspaces.
      </div>
      <div v-else-if="tripError" class="sidebar-error">{{ tripError }}</div>
      <div v-else-if="tripListLoading && !tripList.length" class="sidebar-empty">Loading workspaces...</div>
      <div v-else-if="!tripList.length" class="sidebar-empty">
        No trip workspaces yet. Create one from AI Planner after generating a route-aware plan.
      </div>
      <div v-else class="trip-list">
        <article
          v-for="trip in tripList"
          :key="trip.id"
          class="trip-list-item"
          :class="{ active: selectedTripId === trip.id, starred: trip.is_starred }"
          @click="selectTrip(trip.id)"
        >
          <div class="trip-list-top">
            <div>
              <h3>{{ trip.title }}</h3>
              <p>{{ trip.summary || trip.prompt_preview || 'Saved trip workspace' }}</p>
            </div>
            <span class="trip-status" :class="statusToneClass(trip.status)">{{ trip.status }}</span>
          </div>
          <div class="trip-list-meta">
            <span>{{ formatRelativeTime(trip.updated_at) }}</span>
            <span>{{ trip.stop_count }} stops</span>
            <span>{{ trip.via_count }} via</span>
            <span>{{ trip.saved_poi_count || 0 }} POIs</span>
            <span>{{ trip.linked_post_count || 0 }} stories</span>
          </div>
          <div class="trip-list-meta trip-list-meta-wrap">
            <span v-if="trip.source_plan_title">{{ trip.source_plan_title }}</span>
            <span v-if="trip.profile_snapshot?.archetype">{{ trip.profile_snapshot.archetype }}</span>
            <span v-if="trip.intent_snapshot?.preferred_categories?.[0]">{{ trip.intent_snapshot.preferred_categories[0] }}</span>
          </div>
          <div class="trip-list-actions">
            <button
              class="trip-inline-action"
              type="button"
              :disabled="isActionBusy"
              @click.stop="deleteTripFromList(trip)"
            >
              Delete
            </button>
          </div>
        </article>
      </div>
    </aside>

    <main class="trip-detail-panel">
      <section v-if="!auth.user?.id" class="detail-empty">
        <h2>Trip Workspace 2.0</h2>
        <p>Log in to turn AI trip outputs into reusable workspaces with notes, status tracking, and map execution handoff.</p>
      </section>

      <section v-else-if="detailLoading && !tripDetail" class="detail-empty">
        <h2>Loading workspace...</h2>
      </section>

      <section v-else-if="!tripDetail" class="detail-empty">
        <h2>No trip selected</h2>
        <p>Select a workspace on the left, or create one from the AI Planner after generating a plan.</p>
      </section>

      <section v-else class="detail-shell">
        <header class="detail-head">
          <div class="detail-copy">
            <div class="detail-topline">
              <span class="detail-kicker">Trip Workspace</span>
              <span class="detail-status" :class="statusToneClass(tripDetail.status)">{{ tripDetail.status }}</span>
            </div>
            <h2>{{ tripDetail.title }}</h2>
            <p>{{ tripDetail.summary || tripDetail.prompt_preview || 'Route-aware travel workspace grounded in JourneyPro recommendations.' }}</p>
            <div class="detail-pill-row">
              <span class="detail-pill">{{ formatRelativeTime(tripDetail.updated_at) }}</span>
              <span class="detail-pill">{{ tripDetail.stop_count }} stops</span>
              <span class="detail-pill">{{ tripDetail.via_count }} via points</span>
              <span class="detail-pill">{{ tripDetail.note_count }} notes</span>
              <span v-if="tripDetail.profile_snapshot?.archetype" class="detail-pill">{{ tripDetail.profile_snapshot.archetype }}</span>
            </div>
          </div>
          <div class="detail-hero-panel">
            <span class="hero-kicker">Execution Ready</span>
            <strong>{{ canContinueInMap ? 'Map handoff ready' : 'Waiting for route context' }}</strong>
            <small>{{ actionHintText }}</small>
          </div>
        </header>

        <section class="detail-toolbar">
          <div class="toolbar-copy">
            <span class="card-kicker">Actions</span>
            <h3>Workspace Controls</h3>
            <p>{{ actionHintText }}</p>
          </div>
          <div class="detail-actions">
            <button class="btn ghost small" type="button" :disabled="!canToggleTripStar" @click="toggleTripStar">
              {{ tripDetail.is_starred ? 'Unstar Workspace' : 'Mark Starred' }}
            </button>
            <button class="btn ghost small" type="button" :disabled="!canCreatePostDraft" @click="createPostDraft">
              Create Post Draft
            </button>
            <button class="btn ghost small" type="button" :disabled="!canOpenInPlanner" @click="openInPlanner">
              Resume in Planner
            </button>
            <button class="btn primary small" type="button" :disabled="!canContinueInMap" @click="continueInMap">
              Launch in Map
            </button>
          </div>
        </section>

        <section class="detail-summary-grid">
          <article class="summary-card">
            <span>Status</span>
            <strong>{{ tripDetail.status }}</strong>
            <small>{{ tripDetail.progress_state }}</small>
          </article>
          <article class="summary-card">
            <span>Stops</span>
            <strong>{{ tripDetail.stop_count }}</strong>
            <small>{{ tripDetail.saved_poi_count || 0 }} saved POIs · {{ tripDetail.via_count }} via points</small>
          </article>
          <article class="summary-card">
            <span>Prompt</span>
            <strong>{{ tripDetail.prompt_preview || 'No prompt preview' }}</strong>
            <small>{{ formatRelativeTime(tripDetail.updated_at) }}</small>
          </article>
          <article class="summary-card">
            <span>Source</span>
            <strong>{{ tripDetail.source_plan_title || (tripDetail.source_plan_id ? `AI Plan #${tripDetail.source_plan_id}` : 'Manual workspace') }}</strong>
            <small>{{ tripDetail.is_starred ? 'Starred workspace' : 'Standard workspace' }}</small>
          </article>
          <article class="summary-card">
            <span>Linked stories</span>
            <strong>{{ linkedPosts.length }}</strong>
            <small>{{ linkedPosts.length ? 'Community context attached to this trip.' : 'No linked community evidence stored.' }}</small>
          </article>
          <article class="summary-card">
            <span>Profile</span>
            <strong>{{ tripDetail.profile_snapshot?.archetype || 'No snapshot' }}</strong>
            <small>
              {{ tripDetail.intent_snapshot?.preferred_categories?.slice(0, 2).join(' · ') || tripDetail.intent_snapshot?.pace || 'No focus captured' }}
            </small>
          </article>
        </section>

        <section v-if="tripDetail.completion_summary || completionReport" class="workspace-card completion-card">
          <div class="card-head">
            <div>
              <span class="card-kicker">Archive</span>
              <h3>Completion Summary</h3>
            </div>
            <span class="completion-badge">{{ tripDetail.status === 'COMPLETED' ? 'Completed trip' : 'Saved summary' }}</span>
          </div>
          <div class="completion-shell">
            <div class="completion-copy">
              <h4>{{ completionReport?.headline || tripDetail.completion_summary }}</h4>
              <p>{{ completionReport?.overview || tripDetail.completion_summary }}</p>
              <div v-if="completionReport?.focus_categories?.length" class="completion-tags">
                <span v-for="tag in completionReport.focus_categories" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <div v-if="completionMetricCards.length" class="completion-metrics">
              <article v-for="metric in completionMetricCards" :key="metric.label" class="completion-metric-card">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </article>
            </div>
          </div>
          <div v-if="completionHighlights.length" class="completion-block">
            <span class="card-kicker">Highlights</span>
            <ul class="completion-list">
              <li v-for="line in completionHighlights" :key="line">{{ line }}</li>
            </ul>
          </div>
          <div v-if="completionTopStops.length" class="completion-block">
            <span class="card-kicker">Top Stops</span>
            <div class="completion-top-stops">
              <article v-for="stop in completionTopStops" :key="`${stop.order}_${stop.id || stop.name}`" class="completion-stop-card">
                <div class="completion-stop-rank">#{{ stop.order }}</div>
                <div class="completion-stop-copy">
                  <strong>{{ stop.name }}</strong>
                  <span>{{ stop.category || 'poi' }}</span>
                  <small>{{ formatKm(stop.distance_m) }} · {{ formatMin(stop.detour_duration_s) }}</small>
                </div>
              </article>
            </div>
          </div>
          <div v-if="completionReport?.note_excerpt" class="completion-note">
            <span class="card-kicker">Note Excerpt</span>
            <p>{{ completionReport.note_excerpt }}</p>
          </div>
          <div class="completion-actions">
            <button class="btn ghost small" type="button" :disabled="!canCreatePostDraft" @click="createPostDraft">
              Turn this trip into a post draft
            </button>
          </div>
        </section>

        <section class="detail-grid">
          <article class="workspace-card">
            <div class="card-head">
              <div>
                <span class="card-kicker">Execution</span>
                <h3>Trip Stage</h3>
              </div>
              <div class="status-actions">
                <button
                  v-for="status in ['DRAFT', 'ACTIVE', 'COMPLETED']"
                  :key="status"
                  class="status-btn"
                  :class="{ active: tripDetail.status === status }"
                  type="button"
                  :disabled="detailLoading || isActionBusy"
                  @click="setTripStatus(status)"
                >
                  {{ status }}
                </button>
              </div>
            </div>
            <p class="card-copy">Switch between planning, in-progress, and completed states as the trip moves from AI planning into real execution.</p>
            <div class="route-context-list">
              <div class="route-context-item">
                <span>Start</span>
                <strong>{{ formatPoint(routeContext?.start) }}</strong>
              </div>
              <div class="route-context-item">
                <span>End</span>
                <strong>{{ formatPoint(routeContext?.end) }}</strong>
              </div>
              <div class="route-context-item">
                <span>Via points</span>
                <strong>{{ routeContext?.via?.length || 0 }}</strong>
              </div>
              <div class="route-context-item">
                <span>Weights</span>
                <strong>I {{ formatPercent(routeContext?.interest_weight) }} · E {{ formatPercent(routeContext?.explore_weight) }}</strong>
              </div>
            </div>
          </article>

          <article class="workspace-card notes-card">
            <div class="card-head">
              <div>
                <span class="card-kicker">Notes</span>
                <h3>Trip Notes</h3>
              </div>
              <button class="btn ghost small" type="button" :disabled="detailLoading || isActionBusy || !tripDetail" @click="saveNotes">
                {{ actionBusy === 'notes' ? 'Saving...' : 'Save Notes' }}
              </button>
            </div>
            <textarea
              v-model="tripNotesDraft"
              class="notes-input"
              placeholder="Capture logistics, museum targets, timing constraints, or personal reminders."
            />
          </article>
        </section>

        <section class="workspace-card">
          <div class="card-head">
            <div>
              <span class="card-kicker">Planner</span>
              <h3>Segmented Itinerary</h3>
            </div>
          </div>
          <div v-if="!itinerarySegments.length" class="card-empty">No itinerary segments were stored for this workspace.</div>
          <div v-else class="segment-grid">
            <article v-for="segment in itinerarySegments" :key="segment.period" class="segment-card">
              <span class="segment-label">{{ segment.label }}</span>
              <h4>{{ segment.title }}</h4>
              <p>{{ segment.summary }}</p>
              <ul>
                <li v-for="stop in segment.stops" :key="`${segment.period}_${stop.order}_${stop.id || stop.name}`">
                  <span>#{{ stop.order }}</span>
                  <strong>{{ stop.name }}</strong>
                  <small>{{ formatMin(stop.detour_duration_s) }}</small>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section class="workspace-card">
          <div class="card-head">
            <div>
              <span class="card-kicker">POIs</span>
              <h3>Saved POIs</h3>
            </div>
          </div>
          <div v-if="!savedPois.length" class="card-empty">No POIs have been attached to this workspace yet.</div>
          <div v-else class="saved-stop-list">
            <article v-for="(stop, index) in savedPois" :key="`${stop.id || index}_${index}`" class="saved-stop-card">
              <div class="saved-stop-rank">#{{ index + 1 }}</div>
              <div class="saved-stop-copy">
                <h4>{{ stop.name || 'POI' }}</h4>
                <p>{{ stop.reason || (stop.source === 'via' ? 'Captured from the stored route context.' : 'Saved from AI route-aware recommendation output.') }}</p>
                <div class="saved-stop-meta">
                  <span>{{ stop.category || 'poi' }}</span>
                  <span>{{ stop.source === 'via' ? 'Route context' : 'AI pick' }}</span>
                  <span v-if="stop.distance_m !== null">{{ formatKm(stop.distance_m) }}</span>
                  <span v-if="stop.detour_duration_s !== null">{{ formatMin(stop.detour_duration_s) }}</span>
                </div>
                <div class="saved-stop-actions">
                  <button class="btn ghost small" type="button" @click="focusPoiInMap(stop)">Map</button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="workspace-card">
          <div class="card-head">
            <div>
              <span class="card-kicker">Community</span>
              <h3>Linked Stories</h3>
            </div>
          </div>
          <div v-if="!linkedPosts.length" class="card-empty">No linked posts were extracted into this workspace yet.</div>
          <div v-else class="story-list">
            <article v-for="story in linkedPosts" :key="`${story.post_id || story.title}_${story.source_type}`" class="story-card">
              <div class="story-card-copy">
                <div class="story-topline">
                  <span class="story-type">{{ story.source_type }}</span>
                  <span v-if="story.poi_name">{{ story.poi_name }}</span>
                </div>
                <h4>{{ story.title }}</h4>
                <p>{{ story.snippet || 'Community evidence linked to this trip.' }}</p>
                <div class="story-meta-row">
                  <span>{{ story.author || 'Traveler' }}</span>
                  <span>{{ formatLinkedStoryMetrics(story) }}</span>
                </div>
              </div>
              <div class="story-actions">
                <button v-if="story.post_id" class="btn ghost small" type="button" @click="openLinkedPost(story)">Open Post</button>
                <button v-if="story.poi_id" class="btn ghost small" type="button" @click="openStoriesForPoi(story)">POI Feed</button>
              </div>
            </article>
          </div>
        </section>

        <footer class="detail-footer">
          <button class="btn ghost small danger" type="button" :disabled="detailLoading || isActionBusy || !tripDetail" @click="deleteTrip">
            Delete Workspace
          </button>
          <span v-if="detailFlash" class="detail-flash">{{ detailFlash }}</span>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import { seedPostDetailPreview } from '../utils/postDetailBridge'
import { seedPostPublishDraftFromTrip } from '../utils/postPublishBridge'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const routeStore = useRouteStore()

const AI_PLANNER_CACHE_VERSION = 2
const AI_PLANNER_CACHE_PREFIX = `jp_ai_planner_v${AI_PLANNER_CACHE_VERSION}_`

const tripList = ref([])
const tripListLoading = ref(false)
const tripError = ref('')
const selectedTripId = ref(null)
const tripDetail = ref(null)
const detailLoading = ref(false)
const actionBusy = ref('')
const tripNotesDraft = ref('')
const detailFlash = ref('')
let detailFlashTimer = null

const plannerStorageKey = computed(() => `${AI_PLANNER_CACHE_PREFIX}${auth.user?.id || 'guest'}`)

const routeContext = computed(() => tripDetail.value?.route_context || null)
const plannerSnapshot = computed(() => tripDetail.value?.planner_snapshot || null)
const recommendationList = computed(() => {
  const list = plannerSnapshot.value?.recommendations
  return Array.isArray(list) ? list : []
})
const savedPois = computed(() => {
  const list = tripDetail.value?.saved_pois
  if (Array.isArray(list) && list.length) return list
  return recommendationList.value.slice(0, 8)
})
const linkedPosts = computed(() => {
  const list = tripDetail.value?.linked_posts
  return Array.isArray(list) ? list : []
})
const itinerarySegments = computed(() => {
  const segments = plannerSnapshot.value?.itinerary?.segments
  return Array.isArray(segments) ? segments : []
})
const completionReport = computed(() => {
  const report = tripDetail.value?.completion_report
  return report && typeof report === 'object' ? report : null
})
const completionHighlights = computed(() => {
  const list = completionReport.value?.highlights
  return Array.isArray(list) ? list.slice(0, 6) : []
})
const completionTopStops = computed(() => {
  const list = completionReport.value?.top_stops
  return Array.isArray(list) ? list.slice(0, 4) : []
})
const completionMetricCards = computed(() => {
  const metrics = completionReport.value?.metrics && typeof completionReport.value.metrics === 'object'
    ? completionReport.value.metrics
    : {}
  const cards = []
  if (Number(metrics.stop_count) > 0) cards.push({ label: 'Stops', value: formatNumber(metrics.stop_count) })
  if (Number(metrics.linked_story_count) > 0) cards.push({ label: 'Stories', value: formatNumber(metrics.linked_story_count) })
  if (Number(metrics.route_distance_km) > 0) cards.push({ label: 'Distance', value: `${Number(metrics.route_distance_km).toFixed(1)} km` })
  if (Number(metrics.route_duration_min) > 0) cards.push({ label: 'Duration', value: `${Math.round(Number(metrics.route_duration_min))} min` })
  return cards
})
const isActionBusy = computed(() => !!actionBusy.value)
const tripStats = computed(() => ({
  total: tripList.value.length,
  active: tripList.value.filter((item) => String(item?.status || '').toUpperCase() === 'ACTIVE').length,
  completed: tripList.value.filter((item) => String(item?.status || '').toUpperCase() === 'COMPLETED').length,
  starred: tripList.value.filter((item) => !!item?.is_starred).length,
}))
const hasValidPoint = (point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))
const hasPlannerSnapshot = computed(() => !!plannerSnapshot.value && typeof plannerSnapshot.value === 'object')
const hasRouteMaterial = computed(() => {
  const context = routeContext.value || {}
  const hasVia = Array.isArray(context?.via) && context.via.length > 0
  return hasValidPoint(context?.start) || hasValidPoint(context?.end) || hasVia || recommendationList.value.length > 0
})
const canToggleTripStar = computed(() => !!tripDetail.value && !detailLoading.value && !isActionBusy.value)
const canOpenInPlanner = computed(() => !!auth.user?.id && hasPlannerSnapshot.value && !detailLoading.value && !isActionBusy.value)
const canContinueInMap = computed(() => !!tripDetail.value && hasRouteMaterial.value && !detailLoading.value && !isActionBusy.value)
const canCreatePostDraft = computed(() => {
  if (!tripDetail.value || detailLoading.value || isActionBusy.value) return false
  const status = String(tripDetail.value.status || '').trim().toUpperCase()
  return status === 'COMPLETED' || !!completionReport.value || !!tripDetail.value.completion_summary
})
const actionHintText = computed(() => {
  if (detailLoading.value) return 'Loading workspace data.'
  if (isActionBusy.value) return 'Applying your latest workspace action.'
  if (!tripDetail.value) return 'Select a workspace to continue planning or route execution.'
  if (!hasPlannerSnapshot.value) return 'This workspace has no saved planner snapshot yet, so Planner resume is unavailable.'
  if (!hasRouteMaterial.value) return 'This workspace does not yet contain enough saved route context to launch into Map.'
  return 'Resume the saved AI plan or jump straight into map execution with the stored route context.'
})

const setDetailFlash = (value) => {
  detailFlash.value = String(value || '')
  if (detailFlashTimer) clearTimeout(detailFlashTimer)
  if (!detailFlash.value) return
  detailFlashTimer = setTimeout(() => {
    detailFlash.value = ''
    detailFlashTimer = null
  }, 2200)
}

const formatRelativeTime = (value) => {
  const ts = new Date(value || '').getTime()
  if (!Number.isFinite(ts) || ts <= 0) return 'Unknown'
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(ts).toLocaleDateString()
}

const formatNumber = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString() : '0'
}

const formatPoint = (point) => {
  const lat = Number(point?.lat)
  const lng = Number(point?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Not set'
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

const formatKm = (meters) => {
  const value = Number(meters || 0)
  if (!Number.isFinite(value) || value <= 0) return '0.0 km'
  return `${(value / 1000).toFixed(1)} km`
}

const formatMin = (seconds) => {
  const value = Number(seconds || 0)
  if (!Number.isFinite(value) || value <= 0) return '0 min'
  return `${Math.max(1, Math.round(value / 60))} min`
}

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `${Math.round(num * 100)}%`
}

const formatLinkedStoryMetrics = (story) => {
  const metrics = story?.metrics && typeof story.metrics === 'object' ? story.metrics : {}
  if (story?.source_type === 'comment') {
    return `${Number(metrics.likes || 0)} likes · ${Number(metrics.replies || 0)} replies`
  }
  return `${Number(metrics.likes || 0)} likes · ${Number(metrics.favorites || 0)} saves`
}

const statusToneClass = (status) => {
  const normalized = String(status || '').trim().toUpperCase()
  if (normalized === 'ACTIVE') return 'tone-active'
  if (normalized === 'COMPLETED') return 'tone-completed'
  return 'tone-draft'
}

const sortTrips = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const starDiff = Number(!!b?.is_starred) - Number(!!a?.is_starred)
    if (starDiff) return starDiff
    const timeA = new Date(a?.updated_at || 0).getTime()
    const timeB = new Date(b?.updated_at || 0).getTime()
    return timeB - timeA
  })

const upsertTrip = (item) => {
  if (!item?.id) return
  const next = [...tripList.value]
  const index = next.findIndex((row) => Number(row?.id) === Number(item.id))
  if (index >= 0) next.splice(index, 1, item)
  else next.unshift(item)
  tripList.value = sortTrips(next)
}

const removeTrip = (tripId) => {
  tripList.value = tripList.value.filter((row) => Number(row?.id) !== Number(tripId))
}

const fetchTrips = async () => {
  if (!auth.user?.id) {
    tripList.value = []
    tripDetail.value = null
    selectedTripId.value = null
    return
  }

  tripListLoading.value = true
  tripError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/trips?user_id=${encodeURIComponent(String(auth.user.id))}&limit=40`))
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load trip workspaces.')
    }
    tripList.value = sortTrips(Array.isArray(data.items) ? data.items : [])
    const requestedId = Number(route.query.tripId || selectedTripId.value || 0)
    const nextId = requestedId && tripList.value.some((item) => Number(item.id) === requestedId)
      ? requestedId
      : Number(tripList.value[0]?.id || 0)
    if (nextId) {
      await selectTrip(nextId, { syncRoute: false })
    } else {
      selectedTripId.value = null
      tripDetail.value = null
    }
  } catch (err) {
    tripError.value = String(err?.message || 'Failed to load trip workspaces.')
  } finally {
    tripListLoading.value = false
  }
}

const selectTrip = async (tripId, { syncRoute = true } = {}) => {
  const normalizedId = Number(tripId)
  if (!auth.user?.id || !normalizedId) return
  selectedTripId.value = normalizedId
  detailLoading.value = true
  tripError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/trips/${encodeURIComponent(String(normalizedId))}?user_id=${encodeURIComponent(String(auth.user.id))}`))
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to load workspace detail.')
    }
    tripDetail.value = data.item
    tripNotesDraft.value = String(data.item.notes_text || '')
    if (syncRoute) {
      router.replace({ path: '/trips', query: { tripId: String(normalizedId) } })
    }
  } catch (err) {
    tripError.value = String(err?.message || 'Failed to load workspace detail.')
  } finally {
    detailLoading.value = false
  }
}

const applyTripRouteToStore = () => {
  const context = routeContext.value || {}
  const startLat = Number(context?.start?.lat)
  const startLng = Number(context?.start?.lng)
  if (Number.isFinite(startLat) && Number.isFinite(startLng)) {
    routeStore.setStart(startLat, startLng)
    const startName = String(context?.start?.name || context?.start?.address || '').trim()
    if (startName) routeStore.startAddress = startName
  }
  const endLat = Number(context?.end?.lat)
  const endLng = Number(context?.end?.lng)
  if (Number.isFinite(endLat) && Number.isFinite(endLng)) {
    routeStore.setEnd(endLat, endLng)
    const endName = String(context?.end?.name || context?.end?.address || '').trim()
    if (endName) routeStore.endAddress = endName
  }

  const via = Array.isArray(context?.via) ? context.via : []
  const fallbackVia = recommendationList.value
    .filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng)))
    .slice(0, 8)
    .map((item) => ({
      id: item?.id ?? null,
      name: item?.name || 'POI',
      lat: Number(item?.lat),
      lng: Number(item?.lng),
      category: item?.category || '',
      image_url: item?.image_url || '',
    }))

  const nextVia = (via.length ? via : fallbackVia)
    .map((point) => ({
      id: point?.id ?? null,
      name: point?.name || 'POI',
      lat: Number(point?.lat),
      lng: Number(point?.lng),
      category: point?.category || '',
      image_url: point?.image_url || '',
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

  routeStore.replaceViaPoints(nextVia)
  if (nextVia.length) {
    routeStore.selectPoi(nextVia[0])
    routeStore.requestFocusPoint(nextVia[0].lat, nextVia[0].lng, 15)
  }
}

const continueInMap = () => {
  if (!tripDetail.value) return
  applyTripRouteToStore()
  router.push({ path: '/map' })
}

const focusPoiInMap = (poi) => {
  if (!poi) return
  applyTripRouteToStore()
  const query = {}
  if (poi?.name) query.poi_name = String(poi.name)
  if (Number.isFinite(Number(poi?.lat))) query.poi_lat = String(Number(poi.lat))
  if (Number.isFinite(Number(poi?.lng))) query.poi_lng = String(Number(poi.lng))
  if (poi?.id !== null && poi?.id !== undefined && poi?.id !== '') query.poi_id = String(poi.id)
  router.push({ path: '/map', query })
}

const openInPlanner = () => {
  if (!tripDetail.value?.planner_snapshot || !auth.user?.id) return
  const payload = {
    ...tripDetail.value.planner_snapshot,
    saved_plan_id: tripDetail.value.source_plan_id || null,
  }
  if (tripDetail.value.route_context) {
    payload.route_context = tripDetail.value.route_context
  }
  try {
    localStorage.setItem(plannerStorageKey.value, JSON.stringify(payload))
  } catch {
    // ignore storage failures
  }
  router.push({ path: '/ai-planner' })
}

const openLinkedPost = (story) => {
  const postId = Number(story?.post_id || 0)
  if (!postId) return
  seedPostDetailPreview({
    id: postId,
    title: story?.title || '',
    content: story?.excerpt || '',
    cover_image: story?.cover_image || '',
    like_count: Number(story?.like_count || 0),
    favorite_count: Number(story?.favorite_count || 0),
    view_count: Number(story?.view_count || 0),
    created_at: story?.created_at || null,
    user: {
      nickname: story?.author_name || 'Traveler',
      avatar_url: story?.author_avatar || null,
    },
    poi_id: Number(story?.poi_id || 0) || null,
    poi: story?.poi_id
      ? {
          id: Number(story.poi_id),
          name: story?.poi_name || null,
        }
      : null,
  })
  router.push(`/posts/postsid=${postId}`)
}

const openStoriesForPoi = (story) => {
  const poiId = Number(story?.poi_id || 0)
  if (!poiId) return
  router.push({
    path: '/posts',
    query: {
      poi_id: String(poiId),
      poi_name: story?.poi_name || '',
    },
  })
}

const createPostDraft = () => {
  if (!canCreatePostDraft.value || !tripDetail.value) return
  seedPostPublishDraftFromTrip(tripDetail.value)
  setDetailFlash('Post draft created from completed trip.')
  router.push('/posts/publish')
}

const patchTrip = async (body, busyKey, successText) => {
  if (!tripDetail.value?.id || !auth.user?.id || actionBusy.value) return
  actionBusy.value = busyKey
  tripError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/trips/${encodeURIComponent(String(tripDetail.value.id))}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        ...body,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to update trip workspace.')
    }
    tripDetail.value = {
      ...tripDetail.value,
      ...data.item,
      notes_text: body.notes_text !== undefined ? String(body.notes_text || '') : tripDetail.value.notes_text,
    }
    upsertTrip(data.item)
    if (successText) setDetailFlash(successText)
  } catch (err) {
    tripError.value = String(err?.message || 'Failed to update trip workspace.')
  } finally {
    actionBusy.value = ''
  }
}

const saveNotes = async () => {
  await patchTrip({ notes_text: tripNotesDraft.value }, 'notes', 'Trip notes saved.')
}

const setTripStatus = async (status) => {
  if (!tripDetail.value || String(tripDetail.value.status) === String(status)) return
  await patchTrip({ status }, `status:${status}`, `Trip marked as ${status.toLowerCase()}.`)
}

const toggleTripStar = async () => {
  if (!tripDetail.value) return
  await patchTrip({ is_starred: !tripDetail.value.is_starred }, 'star', tripDetail.value.is_starred ? 'Trip unstarred.' : 'Trip starred.')
}

const performDeleteTrip = async (tripId, title) => {
  const normalizedId = Number(tripId)
  if (!normalizedId || !auth.user?.id || actionBusy.value) return false
  if (typeof window !== 'undefined' && !window.confirm(`Delete "${title || 'this workspace'}"?`)) return false
  actionBusy.value = 'delete'
  tripError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/trips/${encodeURIComponent(String(normalizedId))}?user_id=${encodeURIComponent(String(auth.user.id))}`), {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to delete trip workspace.')
    }
    removeTrip(normalizedId)
    const nextId = Number(tripList.value[0]?.id || 0)
    if (Number(selectedTripId.value) === normalizedId) {
      tripDetail.value = null
      tripNotesDraft.value = ''
      if (nextId) {
        await selectTrip(nextId)
      } else {
        selectedTripId.value = null
        router.replace({ path: '/trips' })
      }
    }
    setDetailFlash('Trip workspace deleted.')
    return true
  } catch (err) {
    tripError.value = String(err?.message || 'Failed to delete trip workspace.')
    return false
  } finally {
    actionBusy.value = ''
  }
}

const deleteTripFromList = async (trip) => {
  await performDeleteTrip(trip?.id, trip?.title)
}

const deleteTrip = async () => {
  if (!tripDetail.value?.id) return
  await performDeleteTrip(tripDetail.value.id, tripDetail.value.title)
}

watch(
  () => auth.user?.id,
  () => {
    fetchTrips()
  }
)

watch(
  () => route.query.tripId,
  (value) => {
    const tripId = Number(value || 0)
    if (tripId && tripId !== selectedTripId.value && auth.user?.id) {
      selectTrip(tripId, { syncRoute: false })
    }
  }
)

onMounted(() => {
  fetchTrips()
})
</script>

<style scoped>
.trips-page {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(330px, 400px) minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  background: var(--bg-pattern);
}

.trip-sidebar,
.trip-detail-panel {
  min-height: 0;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.trip-sidebar {
  padding: 18px;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 14px;
}

.sidebar-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sidebar-kicker,
.detail-kicker,
.card-kicker {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d8cff;
}

.sidebar-head h1,
.detail-head h2 {
  margin: 6px 0 0;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.sidebar-head p,
.detail-head p {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.sidebar-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sidebar-stat {
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, #4d8cff 12%, transparent) 0%, color-mix(in srgb, var(--surface) 90%, transparent) 100%);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.sidebar-stat span {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar-stat strong {
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.trip-list {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding-right: 4px;
}

.trip-list-item,
.sidebar-empty,
.sidebar-error,
.workspace-card,
.detail-empty,
.detail-toolbar,
.detail-head {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
}

.trip-list-item,
.sidebar-empty,
.workspace-card,
.detail-empty,
.detail-toolbar {
  background: color-mix(in srgb, var(--surface) 84%, transparent);
}

.trip-list-item {
  padding: 14px;
  display: grid;
  gap: 10px;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
  position: relative;
  overflow: hidden;
}

.trip-list-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, #4d8cff 38%, transparent);
}

.trip-list-item.active {
  border-color: color-mix(in srgb, #4d8cff 55%, transparent);
  box-shadow: 0 14px 32px rgba(77, 140, 255, 0.14);
  background:
    linear-gradient(135deg, color-mix(in srgb, #4d8cff 12%, transparent) 0%, color-mix(in srgb, var(--surface) 94%, transparent) 42%),
    color-mix(in srgb, var(--surface) 88%, transparent);
}

.trip-list-item.active::before {
  content: '';
  position: absolute;
  inset: 10px auto 10px 8px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4d8cff 0%, #78a7ff 100%);
}

.trip-list-item.starred {
  background: linear-gradient(180deg, color-mix(in srgb, #f59e0b 10%, var(--surface)) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%);
}

.trip-list-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.trip-list-top h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
}

.trip-list-top p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}

.trip-status,
.detail-status {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid transparent;
}

.tone-draft {
  color: #4d8cff;
  background: color-mix(in srgb, #4d8cff 14%, transparent);
  border-color: color-mix(in srgb, #4d8cff 38%, transparent);
}

.tone-active {
  color: #0f9f74;
  background: color-mix(in srgb, #10b981 16%, transparent);
  border-color: color-mix(in srgb, #10b981 42%, transparent);
}

.tone-completed {
  color: #7c3aed;
  background: color-mix(in srgb, #8b5cf6 16%, transparent);
  border-color: color-mix(in srgb, #8b5cf6 38%, transparent);
}

.trip-list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trip-list-meta span {
  font-size: 11px;
  color: var(--muted);
}

.trip-list-actions {
  display: flex;
  justify-content: flex-end;
}

.trip-inline-action {
  border: 0;
  background: transparent;
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  padding: 0;
  opacity: 0.86;
}

.trip-inline-action:hover:not(:disabled) {
  opacity: 1;
  text-decoration: underline;
}

.trip-inline-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sidebar-empty,
.sidebar-error,
.detail-empty {
  padding: 20px;
  color: var(--muted);
  line-height: 1.6;
}

.sidebar-error {
  color: #dc2626;
  border-color: color-mix(in srgb, #ef4444 35%, transparent);
  background: color-mix(in srgb, #ef4444 8%, transparent);
}

.trip-detail-panel {
  padding: 18px;
  min-height: 0;
  overflow: auto;
}

.detail-shell {
  display: grid;
  gap: 16px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, #4d8cff 16%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, transparent) 0%, color-mix(in srgb, var(--panel) 92%, transparent) 100%);
}

.detail-copy {
  min-width: 0;
  flex: 1;
}

.detail-topline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-pill-row {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  color: color-mix(in srgb, var(--fg) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
}

.detail-hero-panel {
  min-width: 240px;
  max-width: 290px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, #4d8cff 24%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, #4d8cff 13%, transparent) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 100%);
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 6px;
}

.hero-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d8cff;
}

.detail-hero-panel strong {
  font-size: 19px;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.detail-hero-panel small {
  color: var(--muted);
  line-height: 1.55;
}

.detail-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
}

.toolbar-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.toolbar-copy h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.toolbar-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.detail-summary-grid,
.detail-grid {
  display: grid;
  gap: 12px;
}

.detail-summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.detail-grid {
  grid-template-columns: 1.08fr 0.92fr;
}

.summary-card,
.workspace-card {
  padding: 16px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, transparent) 0%, color-mix(in srgb, var(--panel) 88%, transparent) 100%);
}

.summary-card {
  display: grid;
  gap: 6px;
}

.summary-card span {
  font-size: 12px;
  color: var(--muted);
}

.summary-card strong {
  font-size: 16px;
  line-height: 1.35;
}

.summary-card small {
  font-size: 12px;
  color: var(--muted);
}

.btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn.small {
  padding: 8px 12px;
  font-size: 12px;
}

.btn.primary {
  background: linear-gradient(135deg, #1677ff 0%, #4d8cff 100%);
  border-color: #1677ff;
  color: #fff;
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.16);
}

.btn.ghost {
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  border-color: color-mix(in srgb, #4d8cff 34%, transparent);
  color: #2563eb;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.card-head h3 {
  margin: 6px 0 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.card-copy {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.status-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-btn {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: color-mix(in srgb, var(--fg) 86%, transparent);
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.status-btn.active {
  border-color: color-mix(in srgb, #4d8cff 52%, transparent);
  color: #356fe0;
  background: color-mix(in srgb, #4d8cff 12%, transparent);
}

.route-context-list {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.route-context-item {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 10px;
  display: grid;
  gap: 6px;
}

.route-context-item span {
  font-size: 11px;
  color: var(--muted);
}

.route-context-item strong {
  font-size: 13px;
  line-height: 1.45;
}

.notes-input {
  width: 100%;
  min-height: 196px;
  margin-top: 12px;
  resize: vertical;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: var(--fg);
  padding: 12px 14px;
  box-sizing: border-box;
  font: inherit;
  line-height: 1.6;
}

.completion-card {
  display: grid;
  gap: 14px;
}

.completion-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 14px;
  align-items: start;
}

.completion-copy h4 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.completion-copy p {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--muted);
}

.completion-badge {
  font-size: 12px;
  font-weight: 700;
  color: #356fe0;
  border-radius: 999px;
  padding: 7px 10px;
  background: color-mix(in srgb, #4d8cff 12%, transparent);
  border: 1px solid color-mix(in srgb, #4d8cff 32%, transparent);
}

.completion-tags {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.completion-tags span,
.completion-note {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  padding: 6px 10px;
  font-size: 12px;
  color: var(--muted);
}

.completion-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.completion-metric-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.completion-metric-card span {
  font-size: 11px;
  color: var(--muted);
}

.completion-metric-card strong {
  font-size: 20px;
}

.completion-block {
  display: grid;
  gap: 10px;
}

.completion-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--muted);
  line-height: 1.55;
}

.completion-top-stops {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.completion-stop-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 12px;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
}

.completion-stop-rank {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #4d8cff 14%, transparent);
  color: #356fe0;
  font-weight: 800;
}

.completion-stop-copy {
  display: grid;
  gap: 4px;
}

.completion-stop-copy span,
.completion-stop-copy small {
  color: var(--muted);
}

.completion-note {
  border-radius: 16px;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.completion-note p {
  margin: 0;
  line-height: 1.6;
}

.completion-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.segment-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.segment-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 12px;
}

.segment-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4d8cff;
}

.segment-card h4 {
  margin: 8px 0 0;
  font-size: 18px;
}

.segment-card p {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.segment-card ul {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.segment-card li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.segment-card small {
  color: var(--muted);
}

.saved-stop-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.saved-stop-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 12px;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
}

.saved-stop-rank {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #356fe0;
  background: color-mix(in srgb, #4d8cff 15%, transparent);
}

.saved-stop-copy h4 {
  margin: 0;
  font-size: 16px;
}

.saved-stop-copy p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}

.saved-stop-meta {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.saved-stop-meta span {
  font-size: 11px;
  border-radius: 999px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 78%, transparent);
  color: var(--muted);
}

.saved-stop-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

.story-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.story-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.story-card-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.story-topline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 11px;
  color: var(--muted);
}

.story-type {
  border-radius: 999px;
  padding: 4px 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #356fe0;
  background: color-mix(in srgb, #4d8cff 14%, transparent);
}

.story-card h4 {
  margin: 0;
  font-size: 16px;
}

.story-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}

.story-meta-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--muted);
}

.story-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.card-empty {
  margin-top: 12px;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding-bottom: 4px;
}

.detail-flash {
  font-size: 12px;
  color: #0f766e;
}

.danger {
  color: #dc2626 !important;
  border-color: color-mix(in srgb, #ef4444 44%, transparent) !important;
}

.btn:focus-visible,
.status-btn:focus-visible,
.notes-input:focus-visible {
  outline: 2px solid color-mix(in srgb, #4d8cff 72%, transparent);
  outline-offset: 2px;
}

@media (max-width: 1180px) {
  .trips-page {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 56px);
  }

  .detail-head,
  .detail-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-grid,
  .detail-summary-grid,
  .segment-grid,
  .completion-shell {
    grid-template-columns: 1fr;
  }

  .route-context-list {
    grid-template-columns: 1fr;
  }

  .detail-hero-panel {
    max-width: none;
    width: 100%;
  }

  .story-card {
    flex-direction: column;
  }

  .story-actions {
    width: 100%;
    flex-direction: row;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
