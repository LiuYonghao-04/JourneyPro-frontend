<template>
  <div class="planner-page">
    <section class="planner-panel chat-panel">
      <header class="panel-head">
        <div>
          <h1>AI Trip Planner</h1>
          <p>Describe your trip and get a streaming, route-aware itinerary that maps directly to waypoints.</p>
        </div>
        <div class="head-meta">
          <span class="meta-badge">{{ latestStageLabel }}</span>
          <span class="meta-sub">Req {{ requestIdShort }}</span>
          <button class="btn ghost small clear-chat-btn" type="button" :disabled="isStreaming" @click="clearPlannerHistory">
            Clear History
          </button>
        </div>
      </header>

      <div class="tuning-card">
        <div class="tuning-row">
          <span>Distance {{ distancePct }}%</span>
          <span>Interest {{ interestPct }}%</span>
        </div>
        <input
          v-model.number="interestWeightPct"
          class="pref-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          :disabled="isStreaming"
        />

        <div class="tuning-row second">
          <span>Safe {{ safePct }}%</span>
          <span>Explore {{ explorePct }}%</span>
        </div>
        <input
          v-model.number="exploreWeightPct"
          class="pref-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          :disabled="isStreaming"
        />

        <div class="tuning-hint">
          Sliders only reorder the same recommendation pool; categories are not hidden.
        </div>
      </div>

      <div v-if="intentChips.length" class="intent-card">
        <div class="intent-title">Detected Intent</div>
        <div class="chip-wrap">
          <span v-for="chip in intentChips" :key="chip" class="intent-chip">{{ chip }}</span>
        </div>
      </div>

      <div ref="messageListEl" class="message-list">
        <article v-for="msg in messages" :key="msg.id" class="msg" :class="msg.role === 'user' ? 'user' : 'assistant'">
          <div class="msg-role">{{ msg.role === 'user' ? 'You' : 'AI Planner' }}</div>
          <div class="msg-content">{{ msg.content }}</div>
        </article>
        <article v-if="isStreaming && typingHint" class="msg assistant typing">
          <div class="msg-role">AI Planner</div>
          <div class="msg-content">{{ typingHint }}</div>
        </article>
      </div>

      <div v-if="streamError" class="stream-error">{{ streamError }}</div>

      <form class="composer" @submit.prevent="submitPrompt">
        <textarea
          v-model="promptInput"
          placeholder="Example: 1-day London route, good coffee + museums, avoid long detours, some hidden gems."
          rows="4"
          :disabled="isStreaming"
        />
        <div class="composer-actions">
          <button type="submit" class="btn primary" :disabled="isStreaming || !promptInput.trim()">
            {{ isStreaming ? 'Planning...' : 'Plan Trip' }}
          </button>
          <button v-if="isStreaming" type="button" class="btn ghost" @click="stopStreaming">Stop</button>
        </div>
      </form>
    </section>

    <section class="planner-panel result-panel">
      <header class="panel-head compact">
        <div>
          <h2>Recommended Stops</h2>
          <p class="result-sub">{{ intentSummaryText }}</p>
        </div>
        <div class="result-head-actions">
          <div class="head-meta right">
            <span class="meta-badge">{{ recommendationList.length }} items</span>
            <span class="meta-sub">Drive mode</span>
          </div>
          <button class="btn ghost small map-sync-btn" type="button" :disabled="!mapSyncStops.length" @click="applyItineraryToMap">
            Write to Map
          </button>
        </div>
      </header>

      <div class="result-topline">
        <span class="mini-stat">Route {{ formatKm(routeMeta?.distance_m) }}</span>
        <span class="mini-stat">Duration {{ formatMin(routeMeta?.duration_s) }}</span>
        <span class="mini-stat">Explore {{ explorePct }}%</span>
      </div>

      <section v-if="itinerarySegments.length" class="itinerary-board">
        <article v-for="segment in itinerarySegments" :key="segment.period" class="segment-card">
          <div class="segment-head">
            <span class="segment-label">{{ segment.label }}</span>
            <h4>{{ segment.title }}</h4>
          </div>
          <p class="segment-summary">{{ segment.summary }}</p>
          <ul class="segment-stops">
            <li v-for="stop in segment.stops" :key="`${segment.period}_${stop.order}_${stop.id || stop.name}`">
              <button type="button" class="segment-stop-btn" @click="openOnMap(stop, false)">
                <span class="order">#{{ stop.order }}</span>
                <span class="name">{{ stop.name }}</span>
                <span class="meta">{{ formatMin(stop.detour_duration_s) }}</span>
              </button>
            </li>
          </ul>
        </article>
      </section>

      <div v-if="!recommendationList.length" class="empty">
        Send your travel request to generate recommendation cards and map-ready waypoints.
      </div>

      <div v-else class="reco-grid">
        <article
          v-for="(poi, idx) in recommendationList"
          :key="poiCardKey(poi, idx)"
          class="reco-card"
          role="button"
          tabindex="0"
          :aria-label="`Open details for ${poi.name || 'POI'}`"
          @click="openPoiDetail(poi)"
          @keydown.enter.prevent="openPoiDetail(poi)"
          @keydown.space.prevent="openPoiDetail(poi)"
        >
          <div class="reco-cover" :class="{ empty: !poi.image_url }">
            <CroppedImage v-if="poi.image_url" :src="poi.image_url" :alt="poi.name || 'POI cover'" class="cover-img" />
            <div v-else class="cover-empty">No image</div>
            <div class="rank-badge">#{{ idx + 1 }}</div>
          </div>

          <div class="reco-body">
            <div class="title-row">
              <h3>{{ poi.name || 'POI' }}</h3>
              <span class="category">{{ poi.category || 'poi' }}</span>
            </div>
            <div class="reason">{{ poi.reason || 'Matched by route, profile and realtime intent parsing.' }}</div>

            <div v-if="poi.explanations?.length" class="exp-chips">
              <span v-for="(exp, expIdx) in poi.explanations.slice(0, 3)" :key="`${poi.id || idx}_exp_${expIdx}`" class="exp-chip">
                {{ formatExplanation(exp) }}
              </span>
            </div>

            <div class="metrics">
              <span>Route {{ formatKm(poi.distance_m) }}</span>
              <span>Detour {{ formatMin(poi.detour_duration_s) }}</span>
            </div>

            <div class="score-bars">
              <div class="bar-row">
                <span>Distance</span>
                <div class="bar-track"><span class="bar-fill distance" :style="{ width: pct(poi.scores?.distance) }" /></div>
              </div>
              <div class="bar-row">
                <span>Interest</span>
                <div class="bar-track"><span class="bar-fill interest" :style="{ width: pct(poi.scores?.interest) }" /></div>
              </div>
              <div class="bar-row">
                <span>Quality</span>
                <div class="bar-track"><span class="bar-fill quality" :style="{ width: pct(poi.scores?.quality) }" /></div>
              </div>
              <div class="bar-row">
                <span>Novelty</span>
                <div class="bar-track"><span class="bar-fill novelty" :style="{ width: pct(poi.scores?.novelty) }" /></div>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn ghost small" type="button" @click.stop="openOnMap(poi, false)">Preview on Map</button>
              <button class="btn primary small" type="button" @click.stop="openOnMap(poi, true)">Add as Waypoint</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="detailOpen" class="poi-detail-backdrop" @click.self="closePoiDetail">
      <article class="poi-detail-modal">
        <header class="poi-detail-head">
          <div>
            <h3>{{ detailPoi?.name || 'POI Details' }}</h3>
            <p>{{ detailPoi?.category || 'poi' }}<span v-if="detailPoi?.city"> · {{ detailPoi.city }}</span></p>
          </div>
          <button class="btn ghost small" type="button" @click="closePoiDetail">Close</button>
        </header>

        <div v-if="detailLoading" class="poi-detail-loading">Loading details...</div>
        <div v-else-if="detailError" class="poi-detail-error">{{ detailError }}</div>
        <div v-else class="poi-detail-body">
          <div v-if="detailPhotos.length" class="poi-photo-grid">
            <CroppedImage v-for="(photo, pidx) in detailPhotos" :key="`${photo}_${pidx}`" :src="photo" :alt="detailPoi?.name || 'POI photo'" class="detail-photo" />
          </div>

          <p v-if="detailPoi?.description" class="detail-description">{{ detailPoi.description }}</p>

          <div class="detail-meta-grid">
            <div class="meta-row"><span>Address</span><strong>{{ detailPoi?.address || 'N/A' }}</strong></div>
            <div class="meta-row"><span>Opening</span><strong>{{ detailPoi?.opening_hours || 'N/A' }}</strong></div>
            <div class="meta-row"><span>Stay</span><strong>{{ detailPoi?.stay_minutes ? `${detailPoi.stay_minutes} min` : 'N/A' }}</strong></div>
            <div class="meta-row"><span>Reviews</span><strong>{{ detailPoi?.review_count || 0 }}</strong></div>
            <div class="meta-row"><span>Best Time</span><strong>{{ detailPoi?.best_visit_time || 'N/A' }}</strong></div>
            <div class="meta-row"><span>Website</span><strong>{{ detailPoi?.website || 'N/A' }}</strong></div>
          </div>

          <div class="detail-actions">
            <button class="btn ghost small" type="button" @click="openOnMap(detailPoi, false)">Preview on Map</button>
            <button class="btn primary small" type="button" @click="openOnMap(detailPoi, true)">Add as Waypoint</button>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CroppedImage from '../components/CroppedImage.vue'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'

const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()
const AI_PLANNER_CACHE_VERSION = 1
const AI_PLANNER_CACHE_PREFIX = `jp_ai_planner_v${AI_PLANNER_CACHE_VERSION}_`
const HISTORY_LIMIT = 120
const DETAIL_PHOTO_LIMIT = 6
const assistantSeedContent = 'Share your route goal and I will stream a ranked, map-ready itinerary.'
const buildSeedMessage = () => ({
  id: `m_${Date.now().toString(36)}_seed`,
  role: 'assistant',
  content: assistantSeedContent,
})

const promptInput = ref('')
const isStreaming = ref(false)
const streamError = ref('')
const requestId = ref('')
const latestStage = ref('idle')
const typingHint = ref('')
const routeMeta = ref(null)
const plannerMeta = ref(null)
const plannerIntent = ref(null)
const itineraryData = ref(null)
const rawRecommendations = ref([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailPoi = ref(null)
const messageListEl = ref(null)
const messages = ref([buildSeedMessage()])

const interestWeightPct = ref(Math.round((Number(routeStore.recoInterestWeight || 0.5) * 100)))
const exploreWeightPct = ref(Math.round((Number(routeStore.recoExploreWeight || 0.15) * 100)))

let streamController = null
let scrollRaf = 0
let persistTimer = null
let latestDetailRequestSeq = 0
const poiDetailCache = new Map()

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

const interestWeight = computed(() => clamp(Number(interestWeightPct.value || 0) / 100, 0, 1))
const exploreWeight = computed(() => clamp(Number(exploreWeightPct.value || 0) / 100, 0, 1))
const interestPct = computed(() => Math.round(interestWeight.value * 100))
const distancePct = computed(() => 100 - interestPct.value)
const explorePct = computed(() => Math.round(exploreWeight.value * 100))
const safePct = computed(() => 100 - explorePct.value)
const plannerStorageKey = computed(() => `${AI_PLANNER_CACHE_PREFIX}${auth.user?.id || 'guest'}`)

const detailPhotos = computed(() => {
  const photos = Array.isArray(detailPoi.value?.photos) ? detailPoi.value.photos : []
  if (photos.length) return photos.slice(0, DETAIL_PHOTO_LIMIT)
  if (detailPoi.value?.image_url) return [detailPoi.value.image_url]
  return []
})

const latestStageLabel = computed(() => {
  const stage = String(latestStage.value || '').toLowerCase()
  if (!stage || stage === 'idle') return 'Ready'
  if (stage === 'analyzing') return 'Analyzing'
  if (stage === 'streaming') return 'Streaming'
  return stage
})

const sanitizeMessages = (list) => {
  const rows = Array.isArray(list) ? list : []
  const safe = rows
    .map((item, index) => ({
      id: typeof item?.id === 'string' && item.id ? item.id : `m_restore_${Date.now().toString(36)}_${index}`,
      role: item?.role === 'user' ? 'user' : 'assistant',
      content: String(item?.content || '').slice(0, 4000),
    }))
    .filter((item) => item.content.trim().length > 0)
    .slice(-HISTORY_LIMIT)
  if (!safe.length) return [buildSeedMessage()]
  return safe
}

const buildPersistPayload = () => ({
  v: AI_PLANNER_CACHE_VERSION,
  saved_at: Date.now(),
  request_id: requestId.value || '',
  stream_error: streamError.value || '',
  route_meta: routeMeta.value || null,
  planner_meta: plannerMeta.value || null,
  planner_intent: plannerIntent.value || null,
  itinerary: itineraryData.value || null,
  recommendations: Array.isArray(rawRecommendations.value) ? rawRecommendations.value : [],
  messages: sanitizeMessages(messages.value),
})

const savePlannerStateNow = () => {
  if (typeof window === 'undefined') return
  try {
    const payload = buildPersistPayload()
    localStorage.setItem(plannerStorageKey.value, JSON.stringify(payload))
  } catch (err) {
    // ignore storage errors
  }
}

const schedulePersistPlannerState = (delay = 150) => {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    savePlannerStateNow()
  }, Math.max(120, Number(delay) || 150))
}

const restorePlannerState = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(plannerStorageKey.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    messages.value = sanitizeMessages(parsed.messages)
    requestId.value = String(parsed.request_id || '')
    streamError.value = String(parsed.stream_error || '')
    routeMeta.value = parsed.route_meta || null
    plannerMeta.value = parsed.planner_meta || null
    plannerIntent.value = parsed.planner_intent || null
    itineraryData.value = parsed.itinerary || null
    rawRecommendations.value = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    latestStage.value = 'idle'
    typingHint.value = ''
  } catch (err) {
    // ignore broken cache
  }
}

watch(
  () => interestWeight.value,
  (value) => {
    routeStore.setRecoInterestWeight(value)
  }
)

watch(
  () => exploreWeight.value,
  (value) => {
    routeStore.setRecoExploreWeight(value)
  }
)

watch(
  () => [
    messages.value,
    requestId.value,
    streamError.value,
    routeMeta.value,
    plannerMeta.value,
    plannerIntent.value,
    itineraryData.value,
    rawRecommendations.value,
  ],
  () => {
    schedulePersistPlannerState(isStreaming.value ? 900 : 180)
  },
  { deep: true }
)

watch(
  () => auth.user?.id,
  () => {
    if (persistTimer) clearTimeout(persistTimer)
    poiDetailCache.clear()
    restorePlannerState()
    nextTick(() => scheduleScrollToBottom())
  }
)

const calcExploreSignal = (poi) => {
  const novelty = clamp(Number(poi?.scores?.novelty || 0), 0, 1)
  const quality = clamp(Number(poi?.scores?.quality || 0), 0, 1)
  const context = clamp(Number(poi?.scores?.context || 0), 0, 1)
  const bonus = Number(poi?.scores?.bandit_bonus || 0)
  const bonusNorm = clamp((bonus + 1) / 2, 0, 1)
  return clamp(novelty * 0.52 + quality * 0.18 + context * 0.15 + bonusNorm * 0.15, 0, 1)
}

const rankScore = (poi) => {
  const iw = interestWeight.value
  const dw = 1 - iw
  const ew = exploreWeight.value

  const distance = Number(poi?.scores?.distance ?? poi?.distance_score ?? 0)
  const interest = Number(poi?.scores?.interest ?? poi?.interest_score ?? 0)
  const sliderBase = distance * dw + interest * iw
  const exploreSignal = calcExploreSignal(poi)

  const baseFinal = Number(poi?.scores?.final ?? poi?.final_score ?? 0)
  const aiFinal = Number(poi?.ai_meta?.ai_final)
  const smartCore = Number.isFinite(aiFinal) ? clamp(aiFinal, 0, 1) : clamp(baseFinal, 0, 1)

  return sliderBase * (1 - ew) + exploreSignal * ew + smartCore * 0.14
}

const recommendationList = computed(() =>
  [...(rawRecommendations.value || [])].sort((a, b) => rankScore(b) - rankScore(a))
)

const requestIdShort = computed(() => {
  const raw = String(requestId.value || '')
  if (!raw) return '-'
  return raw.slice(0, 8)
})

const intentSummaryText = computed(() => {
  const fromRecommendation = String(plannerIntent.value?.summary || '').trim()
  const fromMeta = String(plannerMeta.value?.prompt_summary || '').trim()
  return fromRecommendation || fromMeta || 'Adaptive ranking from route distance, interests, quality and novelty.'
})

const itinerarySegments = computed(() => {
  const segments = itineraryData.value?.segments
  return Array.isArray(segments) ? segments : []
})

const mapSyncStops = computed(() => {
  const fromSegments = itinerarySegments.value
    .flatMap((segment) => (Array.isArray(segment?.stops) ? segment.stops : []))
    .filter((stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lng)))
  if (fromSegments.length) return fromSegments.slice(0, 8)
  return recommendationList.value
    .filter((poi) => Number.isFinite(Number(poi?.lat)) && Number.isFinite(Number(poi?.lng)))
    .slice(0, 8)
})

const intentChips = computed(() => {
  const chips = []
  const intent = plannerIntent.value || plannerMeta.value?.intent || null
  if (!intent) return chips

  if (intent.pace) chips.push(`Pace: ${intent.pace}`)
  if (intent.exploration) chips.push(intent.exploration === 'explore' ? 'Explore mode' : intent.exploration === 'safe' ? 'Safe mode' : 'Balanced mode')

  const categories = Array.isArray(intent.preferred_categories) ? intent.preferred_categories.slice(0, 2) : []
  categories.forEach((category) => chips.push(`Focus ${category}`))

  const avoids = Array.isArray(intent.avoid_categories) ? intent.avoid_categories.slice(0, 1) : []
  avoids.forEach((category) => chips.push(`Avoid ${category}`))

  const tags = Array.isArray(intent.tags) ? intent.tags.slice(0, 2) : []
  tags.forEach((tag) => chips.push(`#${tag}`))

  return [...new Set(chips)].slice(0, 6)
})

const scheduleScrollToBottom = () => {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    const el = messageListEl.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

const appendMessage = (role, content = '') => {
  const msg = {
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
  }
  messages.value.push(msg)
  scheduleScrollToBottom()
  return msg
}

const parseSseBlock = (block) => {
  const lines = String(block || '').split('\n')
  let event = 'message'
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || event
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (!dataLines.length) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return { event, data: { raw: dataLines.join('\n') } }
  }
}

const consumeSseBuffer = (rawBuffer, onEvent) => {
  let normalized = String(rawBuffer || '').replace(/\r\n/g, '\n')
  let sepIndex = normalized.indexOf('\n\n')
  while (sepIndex >= 0) {
    const chunk = normalized.slice(0, sepIndex).trim()
    normalized = normalized.slice(sepIndex + 2)
    if (chunk) {
      const parsed = parseSseBlock(chunk)
      if (parsed) onEvent(parsed)
    }
    sepIndex = normalized.indexOf('\n\n')
  }
  return normalized
}

const onWindowBeforeUnload = () => {
  savePlannerStateNow()
}

const onWindowKeydown = (event) => {
  if (!event) return
  if (event.key === 'Escape' && detailOpen.value) {
    closePoiDetail()
  }
}

const stopStreaming = () => {
  if (streamController) {
    streamController.abort()
    streamController = null
  }
  isStreaming.value = false
  latestStage.value = 'idle'
  typingHint.value = ''
}

const submitPrompt = async () => {
  const prompt = String(promptInput.value || '').trim()
  if (!prompt || isStreaming.value) return

  stopStreaming()
  streamError.value = ''
  latestStage.value = 'analyzing'
  typingHint.value = 'Analyzing your request...'

  appendMessage('user', prompt)
  const assistantMsg = appendMessage('assistant', '')
  promptInput.value = ''
  rawRecommendations.value = []
  routeMeta.value = null
  plannerIntent.value = null
  plannerMeta.value = null
  itineraryData.value = null
  closePoiDetail()

  isStreaming.value = true
  streamController = new AbortController()

  try {
    const res = await fetch(apiUrl('/api/ai/planner/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: streamController.signal,
      body: JSON.stringify({
        prompt,
        user_id: auth.user?.id || null,
        interest_weight: interestWeight.value,
        explore_weight: exploreWeight.value,
        limit: 8,
        start: { lng: routeStore.startLng, lat: routeStore.startLat },
        end: { lng: routeStore.endLng, lat: routeStore.endLat },
        via: (routeStore.viaPoints || []).map((p) => ({ lng: p.lng, lat: p.lat })),
      }),
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed: ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = consumeSseBuffer(buffer, ({ event, data }) => {
        if (event === 'delta') {
          assistantMsg.content += String(data?.text || '')
          typingHint.value = 'Generating itinerary...'
          scheduleScrollToBottom()
          return
        }
        if (event === 'status') {
          latestStage.value = String(data?.stage || latestStage.value)
          typingHint.value = String(data?.message || '')
          return
        }
        if (event === 'meta') {
          requestId.value = String(data?.request_id || '')
          plannerMeta.value = data || null
          if (data?.intent) plannerIntent.value = { ...(plannerIntent.value || {}), ...data.intent }
          return
        }
        if (event === 'itinerary') {
          itineraryData.value = data?.itinerary || null
          return
        }
        if (event === 'recommendations') {
          routeMeta.value = data?.route || null
          rawRecommendations.value = Array.isArray(data?.items) ? data.items : []
          if (data?.intent) plannerIntent.value = data.intent
          if (data?.itinerary) itineraryData.value = data.itinerary
          latestStage.value = 'ready'
          typingHint.value = ''
          return
        }
        if (event === 'error') {
          streamError.value = String(data?.message || 'Failed to generate plan.')
          if (!assistantMsg.content) assistantMsg.content = streamError.value
          latestStage.value = 'error'
          typingHint.value = ''
          return
        }
        if (event === 'done') {
          latestStage.value = 'ready'
          typingHint.value = ''
          if (!assistantMsg.content.trim()) {
            assistantMsg.content = 'Plan generated. Check the recommendation cards on the right.'
          }
          savePlannerStateNow()
        }
      })
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      streamError.value = err?.message || 'Streaming failed.'
      latestStage.value = 'error'
      typingHint.value = ''
      if (messages.value.length) {
        const last = messages.value[messages.value.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          last.content = streamError.value
        }
      }
    }
  } finally {
    isStreaming.value = false
    streamController = null
    await nextTick()
    scheduleScrollToBottom()
  }
}

const poiCardKey = (poi, idx) => `${poi?.id || 'x'}_${idx}`

const pct = (value) => `${Math.round(clamp(Number(value || 0), 0, 1) * 100)}%`

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

const formatExplanation = (exp) => {
  if (!exp || typeof exp !== 'object') return ''
  const tag = String(exp.tag || '').trim()
  const contribution = Number(exp.contribution)
  if (Number.isFinite(contribution)) return `${tag} ${Math.round(contribution)}%`
  return tag
}

const applyItineraryToMap = () => {
  const stops = mapSyncStops.value
    .map((item) => ({
      id: item?.id ?? null,
      name: item?.name || 'POI',
      lat: Number(item?.lat),
      lng: Number(item?.lng),
      category: item?.category || '',
      image_url: item?.image_url || '',
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))

  if (!stops.length) return
  routeStore.replaceViaPoints(stops)
  routeStore.selectPoi(stops[0])
  routeStore.requestFocusPoint(stops[0].lat, stops[0].lng, 15)
  savePlannerStateNow()
  router.push({ path: '/map' })
}

const clearPlannerHistory = () => {
  if (isStreaming.value) return
  messages.value = [buildSeedMessage()]
  promptInput.value = ''
  streamError.value = ''
  requestId.value = ''
  latestStage.value = 'idle'
  typingHint.value = ''
  routeMeta.value = null
  plannerMeta.value = null
  plannerIntent.value = null
  itineraryData.value = null
  rawRecommendations.value = []
  closePoiDetail()
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(plannerStorageKey.value)
    } catch (err) {
      // ignore
    }
  }
}

const closePoiDetail = () => {
  detailOpen.value = false
  detailLoading.value = false
  detailError.value = ''
  detailPoi.value = null
}

const openPoiDetail = async (poi) => {
  if (!poi) return
  const normalized = {
    id: poi?.id ?? null,
    name: poi?.name || 'POI',
    category: poi?.category || '',
    lat: Number(poi?.lat),
    lng: Number(poi?.lng),
    image_url: poi?.image_url || '',
    reason: poi?.reason || '',
  }
  detailPoi.value = normalized
  detailError.value = ''
  detailLoading.value = true
  detailOpen.value = true

  const poiId = normalized.id
  if (poiId === null || poiId === undefined || poiId === '') {
    detailLoading.value = false
    return
  }

  const cacheKey = String(poiId)
  if (poiDetailCache.has(cacheKey)) {
    detailPoi.value = {
      ...normalized,
      ...poiDetailCache.get(cacheKey),
    }
    detailLoading.value = false
    return
  }

  const seq = (latestDetailRequestSeq += 1)
  try {
    const res = await fetch(apiUrl(`/api/poi/${encodeURIComponent(String(poiId))}?photo_limit=6`))
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.data) {
      throw new Error(data?.message || 'Failed to load POI details.')
    }
    if (seq !== latestDetailRequestSeq) return
    poiDetailCache.set(cacheKey, data.data)
    detailPoi.value = {
      ...normalized,
      ...data.data,
      photos: Array.isArray(data.data.photos) ? data.data.photos : [],
    }
  } catch (err) {
    if (seq !== latestDetailRequestSeq) return
    detailError.value = String(err?.message || 'Failed to load POI details.')
  } finally {
    if (seq === latestDetailRequestSeq) detailLoading.value = false
  }
}

const openOnMap = (poi, addVia) => {
  if (!poi || typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return
  const query = {
    poi_name: poi.name || 'POI',
    poi_lat: String(poi.lat),
    poi_lng: String(poi.lng),
  }
  if (addVia && poi.id !== null && poi.id !== undefined && poi.id !== '') {
    query.poi_id = String(poi.id)
  }
  savePlannerStateNow()
  router.push({ path: '/map', query })
}

onMounted(() => {
  restorePlannerState()
  window.addEventListener('beforeunload', onWindowBeforeUnload)
  window.addEventListener('keydown', onWindowKeydown)
  nextTick(() => scheduleScrollToBottom())
})

onBeforeUnmount(() => {
  stopStreaming()
  savePlannerStateNow()
  window.removeEventListener('beforeunload', onWindowBeforeUnload)
  window.removeEventListener('keydown', onWindowKeydown)
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
})
</script>

<style scoped>
.planner-page {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(380px, 0.92fr) minmax(560px, 1.08fr);
  gap: 14px;
  padding: 14px;
  box-sizing: border-box;
  background: var(--bg-pattern);
}

.planner-panel {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 84%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  box-shadow: var(--shadow);
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-panel {
  padding: 14px;
  gap: 10px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h1,
.panel-head h2 {
  margin: 0;
  font-size: 34px;
  letter-spacing: -0.03em;
  line-height: 1.02;
}

.panel-head p {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.panel-head.compact {
  padding: 14px 14px 0;
}

.result-sub {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.head-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.clear-chat-btn {
  min-width: 112px;
}

.head-meta.right {
  margin-top: 3px;
}

.result-head-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.meta-badge {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #4d8cff 55%, transparent);
  background: color-mix(in srgb, #4d8cff 15%, transparent);
  color: color-mix(in srgb, var(--fg) 92%, transparent);
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta-sub {
  font-size: 12px;
  color: var(--muted);
}

.tuning-card,
.intent-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  padding: 10px 12px;
}

.tuning-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 12px;
  color: color-mix(in srgb, var(--fg) 86%, transparent);
}

.tuning-row.second {
  margin-top: 10px;
}

.pref-slider {
  width: 100%;
  margin-top: 7px;
}

.tuning-hint {
  margin-top: 7px;
  font-size: 11px;
  color: var(--muted);
}

.intent-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--fg);
}

.chip-wrap {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.intent-chip {
  border-radius: 999px;
  padding: 3px 9px;
  border: 1px solid color-mix(in srgb, #5a8cff 34%, transparent);
  background: color-mix(in srgb, #5a8cff 14%, transparent);
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--fg) 90%, transparent);
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-right: 2px;
}

.msg {
  border-radius: 13px;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
}

.msg.user {
  background: color-mix(in srgb, #3b82f6 18%, transparent);
  border-color: color-mix(in srgb, #3b82f6 46%, transparent);
}

.msg.assistant {
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.msg.typing {
  position: relative;
  overflow: hidden;
}

.msg.typing::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.07) 45%, transparent 70%);
  transform: translateX(-100%);
  animation: shimmer 1.6s linear infinite;
  pointer-events: none;
}

@keyframes shimmer {
  to {
    transform: translateX(100%);
  }
}

.msg-role {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.msg-content {
  margin-top: 6px;
  white-space: pre-wrap;
  line-height: 1.55;
}

.stream-error {
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
}

.composer {
  display: grid;
  gap: 9px;
}

.composer textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 96px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  color: var(--fg);
  padding: 10px 12px;
  font-family: inherit;
}

.composer-actions {
  display: flex;
  gap: 8px;
}

.btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.btn.small {
  padding: 6px 11px;
  font-size: 12px;
}

.btn.primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.btn.ghost {
  background: transparent;
  border-color: #1677ff;
  color: #1677ff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-topline {
  margin: 10px 14px 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.map-sync-btn {
  min-width: 112px;
}

.mini-stat {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--muted);
  font-size: 11px;
  padding: 3px 9px;
}

.itinerary-board {
  margin: 8px 14px 4px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.segment-card {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  padding: 9px 10px;
}

.segment-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.segment-head h4 {
  margin: 0;
  font-size: 14px;
  letter-spacing: -0.01em;
}

.segment-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a8cff;
}

.segment-summary {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.45;
}

.segment-stops {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.segment-stop-btn {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  color: var(--fg);
  border-radius: 9px;
  padding: 4px 7px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  text-align: left;
}

.segment-stop-btn:hover {
  border-color: color-mix(in srgb, #4d8cff 58%, transparent);
  background: color-mix(in srgb, #4d8cff 11%, transparent);
}

.segment-stop-btn .order {
  font-size: 10px;
  color: #5a8cff;
  font-weight: 700;
}

.segment-stop-btn .name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.segment-stop-btn .meta {
  font-size: 10px;
  color: var(--muted);
}

.empty {
  margin: 18px 14px;
  color: var(--muted);
  font-size: 14px;
}

.reco-grid {
  margin: 8px 14px 14px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  display: grid;
  gap: 10px;
  padding-right: 2px;
}

.reco-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  display: grid;
  grid-template-columns: 170px 1fr;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.reco-card:hover {
  border-color: color-mix(in srgb, #4d8cff 55%, transparent);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
  transform: translateY(-1px);
}

.reco-card:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, #4d8cff 70%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, #4d8cff 26%, transparent);
}

.reco-cover {
  position: relative;
  height: 100%;
  min-height: 160px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 12px;
}

.rank-badge {
  position: absolute;
  left: 9px;
  top: 9px;
  border-radius: 999px;
  background: rgba(8, 14, 24, 0.82);
  color: #fff;
  font-weight: 800;
  font-size: 11px;
  padding: 4px 8px;
}

.reco-body {
  padding: 10px 12px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
}

.title-row h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
  line-height: 1.12;
}

.category {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.reason {
  margin-top: 6px;
  color: var(--muted);
  line-height: 1.45;
  font-size: 13px;
}

.exp-chips {
  margin-top: 7px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.exp-chip {
  font-size: 10px;
  color: color-mix(in srgb, var(--fg) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  border-radius: 999px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--surface) 84%, transparent);
}

.metrics {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
  flex-wrap: wrap;
}

.score-bars {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.bar-row {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 8px;
  align-items: center;
}

.bar-row span {
  font-size: 11px;
  font-weight: 700;
}

.bar-track {
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel-border) 55%, transparent);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.bar-fill.distance {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.bar-fill.interest {
  background: linear-gradient(90deg, #22c55e, #14b8a6);
}

.bar-fill.quality {
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.bar-fill.novelty {
  background: linear-gradient(90deg, #f472b6, #a78bfa);
}

.card-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.poi-detail-backdrop {
  position: fixed;
  inset: 56px 0 0 0;
  z-index: 3200;
  background: color-mix(in srgb, #04070f 50%, transparent);
  display: grid;
  place-items: center;
  padding: 18px;
  box-sizing: border-box;
}

.poi-detail-modal {
  width: min(980px, 96vw);
  max-height: calc(100vh - 92px);
  overflow: auto;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background: color-mix(in srgb, var(--panel) 96%, transparent);
  box-shadow: 0 26px 56px rgba(0, 0, 0, 0.32);
  padding: 14px;
  box-sizing: border-box;
}

.poi-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.poi-detail-head h3 {
  margin: 0;
  font-size: 27px;
  letter-spacing: -0.03em;
}

.poi-detail-head p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.poi-detail-loading,
.poi-detail-error {
  margin-top: 12px;
  color: var(--muted);
}

.poi-detail-error {
  color: #ef4444;
}

.poi-detail-body {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.poi-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.detail-photo {
  width: 100%;
  height: 170px;
  border-radius: 10px;
}

.detail-description {
  margin: 0;
  color: color-mix(in srgb, var(--fg) 84%, transparent);
  line-height: 1.55;
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.meta-row {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  padding: 7px 9px;
  display: grid;
  gap: 4px;
}

.meta-row span {
  font-size: 11px;
  color: var(--muted);
}

.meta-row strong {
  font-size: 13px;
  color: color-mix(in srgb, var(--fg) 92%, transparent);
  font-weight: 600;
  line-height: 1.35;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1260px) {
  .planner-page {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 56px);
  }

  .planner-panel {
    min-height: 520px;
  }

  .result-head-actions {
    align-items: flex-start;
  }

  .itinerary-board {
    grid-template-columns: 1fr;
  }

  .reco-card {
    grid-template-columns: 1fr;
  }

  .reco-cover {
    min-height: 190px;
  }

  .poi-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
