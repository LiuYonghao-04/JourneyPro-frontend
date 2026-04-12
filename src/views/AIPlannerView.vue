<template>
  <div class="planner-page">
    <section class="planner-panel chat-panel">
      <header class="panel-head">
        <div>
          <h1>AI Trip Planner</h1>
          <p>Describe your trip and get a streaming, route-aware itinerary that maps directly to waypoints.</p>
          <div class="scope-pill">London-only beta · community-grounded answers</div>
        </div>
        <div class="head-meta">
          <button class="btn ghost small clear-chat-btn" type="button" :disabled="!canSavePlan" @click="createTripWorkspace">
            {{ planActionBusy === 'trip' ? 'Creating...' : 'Create Trip' }}
          </button>
          <button class="btn ghost small clear-chat-btn" type="button" :disabled="!canSavePlan" @click="saveCurrentPlan">
            {{ planActionBusy === 'save' ? 'Saving...' : 'Save Plan' }}
          </button>
          <span class="meta-badge">{{ latestStageLabel }}</span>
          <button class="btn ghost small clear-chat-btn" type="button" :disabled="isStreaming" @click="clearPlannerHistory">
            Clear History
          </button>
        </div>
      </header>

      <section class="engine-card" :class="`engine-${engineTone}`">
        <div class="engine-top">
          <div class="engine-main">
            <span class="engine-dot" :class="`engine-${engineTone}`" />
            <div>
              <div class="engine-title">{{ engineTitle }}</div>
              <div class="engine-sub">{{ engineSubline }}</div>
            </div>
          </div>
          <span class="engine-badge" :class="`engine-${engineTone}`">{{ engineBadge }}</span>
        </div>
        <p v-if="engineHintText" class="engine-hint">{{ engineHintText }}</p>
      </section>

      <section class="quota-card">
        <div class="quota-top">
          <div>
            <div class="quota-title">AI access</div>
            <div class="quota-sub">{{ quotaSubline }}</div>
          </div>
          <span class="quota-badge" :class="`role-${quotaRoleClass}`">{{ quotaRoleLabel }}</span>
        </div>
        <div class="quota-metrics">
          <span>{{ quotaPrimaryText }}</span>
          <span v-if="quotaSecondaryText">{{ quotaSecondaryText }}</span>
        </div>
        <div v-if="quotaProgressValue !== null" class="quota-track">
          <span class="quota-fill" :style="{ width: `${quotaProgressValue}%` }" />
        </div>
      </section>

      <section class="plan-library-card fold-card">
        <button class="fold-head" type="button" @click="togglePanel('library')">
          <div class="fold-copy">
            <span class="fold-kicker">Workspace</span>
            <span class="fold-title">Saved Plans</span>
          </div>
          <span class="fold-meta">{{ planLibraryMetaText }} · {{ panelOpen.library ? 'Hide' : 'Show' }}</span>
        </button>
        <div v-if="panelOpen.library" class="fold-body">
          <div class="library-toolbar">
            <button class="btn ghost small" type="button" :disabled="!canSavePlan" @click="createTripWorkspace">
              {{ planActionBusy === 'trip' ? 'Creating...' : 'Create Trip Workspace' }}
            </button>
            <button class="btn primary small" type="button" :disabled="!canSavePlan" @click="saveCurrentPlan">
              {{ planActionBusy === 'save' ? 'Saving...' : 'Save Current Plan' }}
            </button>
            <span class="library-toolbar-copy">{{ auth.user?.id ? 'Plans sync to your account and can be restored later.' : 'Login to save plans across sessions and devices.' }}</span>
          </div>

          <div v-if="planLibraryError" class="library-error">{{ planLibraryError }}</div>
          <div v-else-if="planFlash" class="library-flash">{{ planFlash }}</div>
          <div v-else-if="planLibraryLoading" class="library-empty">Loading your saved plans...</div>
          <div v-else-if="!auth.user?.id" class="library-empty">Login to unlock a synced plan library. Your current planner draft still stays in local storage.</div>
          <div v-else-if="!planLibrary.length" class="library-empty">No saved AI plans yet. Save the current result to build your trip workspace.</div>
          <div v-else class="plan-list">
            <article
              v-for="plan in planLibrary"
              :key="plan.id"
              class="plan-item"
              :class="{ active: activeSavedPlanId === plan.id, starred: plan.is_starred }"
            >
              <div class="plan-item-top">
                <div>
                  <h4>{{ plan.title }}</h4>
                  <p>{{ plan.summary || plan.prompt_preview || 'Saved route-aware AI plan.' }}</p>
                </div>
                <button
                  class="plan-star-btn"
                  type="button"
                  :disabled="!!planActionBusy"
                  @click="togglePlanStar(plan)"
                >
                  {{ plan.is_starred ? 'Starred' : 'Star' }}
                </button>
              </div>
              <div class="plan-item-meta">
                <span>{{ formatRelativePlanTime(plan.updated_at) }}</span>
                <span>{{ plan.stop_count }} stops</span>
                <span>{{ plan.via_count }} via</span>
                <span>{{ plan.engine_mode || 'fallback' }}</span>
              </div>
              <div class="plan-item-actions">
                <button class="btn ghost small" type="button" :disabled="!!planActionBusy" @click="loadSavedPlan(plan)">
                  Load
                </button>
                <button class="btn ghost small" type="button" :disabled="!!planActionBusy" @click="deleteSavedPlan(plan)">
                  Delete
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="tuning-card fold-card">
        <button class="fold-head" type="button" @click="togglePanel('controls')">
          <div class="fold-copy">
            <span class="fold-kicker">Controls</span>
            <span class="fold-title">Ranking Controls</span>
          </div>
          <span class="fold-meta">I {{ interestPct }} / D {{ distancePct }} · E {{ explorePct }} · {{ panelOpen.controls ? 'Hide' : 'Show' }}</span>
        </button>
        <div v-if="panelOpen.controls" class="fold-body">
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
      </section>

      <section v-if="intentChips.length" class="intent-card fold-card">
        <button class="fold-head" type="button" @click="togglePanel('intent')">
          <div class="fold-copy">
            <span class="fold-kicker">Signals</span>
            <span class="fold-title">Detected Intent</span>
          </div>
          <span class="fold-meta">{{ intentChips.length }} chips · {{ panelOpen.intent ? 'Hide' : 'Show' }}</span>
        </button>
        <div v-if="panelOpen.intent" class="fold-body">
          <div class="chip-wrap">
            <span v-for="chip in intentChips" :key="chip" class="intent-chip">{{ chip }}</span>
          </div>
        </div>
      </section>

      <div ref="messageListEl" class="message-list">
        <article v-for="msg in visibleMessages" :key="msg.id" class="msg" :class="msg.role === 'user' ? 'user' : 'assistant'">
          <div class="msg-role">{{ msg.role === 'user' ? 'You' : 'AI Planner' }}</div>
          <div class="msg-content rich" v-html="formatMessageHtml(msg)" />
        </article>
        <article v-if="isStreaming && typingHint" class="msg assistant typing">
          <div class="msg-role">AI Planner</div>
          <div class="msg-content rich" v-html="formatTypingHintHtml(typingHint)" />
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
          <button class="btn ghost small map-sync-btn" type="button" :disabled="!canSavePlan" @click="createTripWorkspace">
            {{ planActionBusy === 'trip' ? 'Creating...' : 'Create Trip' }}
          </button>
          <button class="btn ghost small map-sync-btn" type="button" :disabled="!canSavePlan" @click="saveCurrentPlan">
            {{ planActionBusy === 'save' ? 'Saving...' : 'Save Plan' }}
          </button>
          <button class="btn ghost small map-sync-btn" type="button" :disabled="!mapSyncStops.length" @click="applyItineraryToMap">
            Write to Map
          </button>
        </div>
      </header>

      <div class="result-scroll">
        <div class="result-topline">
          <span class="mini-stat">Route {{ formatKm(routeMeta?.distance_m) }}</span>
          <span class="mini-stat">Duration {{ formatMin(routeMeta?.duration_s) }}</span>
          <span class="mini-stat">Explore {{ explorePct }}%</span>
          <span class="mini-stat">{{ llmBadgeText }}</span>
          <span v-if="retrievalBadgeText" class="mini-stat">{{ retrievalBadgeText }}</span>
        </div>

        <section v-if="!scopeSupported" class="scope-warning-card">
          <div class="scope-warning-title">London-only planner boundary</div>
          <p>{{ scopeNoticeText }}</p>
        </section>

        <section v-if="scopeSupported && itinerarySegments.length" class="itinerary-card fold-block">
          <button class="fold-head" type="button" @click="togglePanel('itinerary')">
            <div class="fold-copy">
              <span class="fold-kicker">Planner</span>
              <span class="fold-title">Segmented Itinerary</span>
            </div>
            <span class="fold-meta">{{ itinerarySegments.length }} blocks · {{ panelOpen.itinerary ? 'Hide' : 'Show' }}</span>
          </button>
          <div v-if="panelOpen.itinerary" class="fold-body">
            <div class="itinerary-board">
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
            </div>
          </div>
        </section>

        <section v-if="plannerInsights.length" class="insight-card fold-block">
          <button class="fold-head" type="button" @click="togglePanel('insights')">
            <div class="fold-copy">
              <span class="fold-kicker">Evidence</span>
              <span class="fold-title">Community Signals</span>
            </div>
            <span class="fold-meta">{{ plannerInsights.length }} lines · {{ panelOpen.insights ? 'Hide' : 'Show' }}</span>
          </button>
          <div v-if="panelOpen.insights" class="fold-body">
            <ul class="insight-list">
              <li v-for="(line, idx) in plannerInsights" :key="`insight_${idx}`">{{ line }}</li>
            </ul>
          </div>
        </section>

        <section v-if="sourceCards.length" class="sources-card fold-block">
          <button class="fold-head" type="button" @click="togglePanel('sources')">
            <div class="fold-copy">
              <span class="fold-kicker">Evidence</span>
              <span class="fold-title">Source Cards</span>
            </div>
            <span class="fold-meta">{{ sourceCards.length }} sources · {{ panelOpen.sources ? 'Hide' : 'Show' }}</span>
          </button>
          <div v-if="panelOpen.sources" class="fold-body">
            <div class="sources-head">
              <p>Posts, comments and POI evidence retrieved from your own JourneyPro content.</p>
            </div>
            <div v-if="citationReferences.length" class="citation-strip">
              <button
                v-for="source in citationReferences"
                :key="`citation_${source.source_id || source.citation_label}`"
                class="citation-pill"
                type="button"
                @click="openSourceCard(source)"
              >
                <span class="citation-label">{{ formatCitationLabel(source) }}</span>
                <span class="citation-copy">{{ source.title }}</span>
              </button>
            </div>
            <div class="sources-grid">
              <article
                v-for="source in sourceCards"
                :key="source.source_id || `${source.type}_${source.rank}`"
                class="source-item"
                :class="`source-${source.type}`"
                role="button"
                tabindex="0"
                @click="openSourceCard(source)"
                @keydown.enter.prevent="openSourceCard(source)"
                @keydown.space.prevent="openSourceCard(source)"
              >
                <div class="source-topline">
                  <span class="source-type">{{ source.type }}</span>
                  <span class="source-rank">{{ formatCitationLabel(source) }}</span>
                </div>
                <h4>{{ source.title }}</h4>
                <p>{{ source.snippet }}</p>
                <div class="source-foot">
                  <div class="source-foot-copy">
                    <span>{{ source.author || source.poi_name || 'JourneyPro' }}</span>
                    <span>{{ formatSourceMetrics(source) }}</span>
                  </div>
                  <button class="source-plan-btn" type="button" @click.stop="focusPlannerOnSource(source)">
                    Use in Planner
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <div v-if="scopeSupported && !recommendationList.length" class="empty">
          Send your travel request to generate recommendation cards and map-ready waypoints.
        </div>

        <div v-else-if="scopeSupported" class="reco-grid">
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

          <div v-if="detailCommunity" class="detail-community-card">
            <div class="detail-section-head">
              <span class="detail-section-kicker">Community</span>
              <strong>{{ detailCommunity.metrics?.post_count || 0 }} stories linked</strong>
            </div>
            <div class="detail-community-metrics">
              <span>{{ detailCommunity.metrics?.avg_rating || 'N/A' }} avg rating</span>
              <span>{{ detailCommunity.metrics?.total_favorites || 0 }} saves</span>
              <span>{{ detailCommunity.metrics?.total_views || 0 }} views</span>
            </div>
            <div v-if="detailCommunity.highlights?.length" class="detail-community-copy">
              <p v-for="line in detailCommunity.highlights.slice(0, 3)" :key="line">{{ line }}</p>
            </div>
            <div v-if="detailStoryTags.length || detailBestFor.length || detailWatchOut.length" class="detail-chip-row">
              <span v-for="tag in detailStoryTags" :key="`tag-${tag}`" class="detail-chip">#{{ tag }}</span>
              <span v-for="item in detailBestFor" :key="`best-${item}`" class="detail-chip positive">{{ item }}</span>
              <span v-for="item in detailWatchOut" :key="`watch-${item}`" class="detail-chip caution">{{ item }}</span>
            </div>
          </div>

          <div v-if="detailStoryPosts.length" class="detail-story-block">
            <div class="detail-section-head">
              <span class="detail-section-kicker">Stories</span>
              <strong>Community examples</strong>
            </div>
            <div class="detail-story-list">
              <button
                v-for="post in detailStoryPosts"
                :key="post.id"
                class="detail-story-card"
                type="button"
                @click="openSourceCard({ type: 'post', post_id: post.id })"
              >
                <div class="detail-story-title">{{ post.title }}</div>
                <div class="detail-story-meta">
                  <span>{{ post.author_name || 'Traveler' }}</span>
                  <span>{{ post.like_count || 0 }} likes</span>
                </div>
              </button>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn ghost small" type="button" @click="openDetailStories">Open Stories</button>
            <button class="btn ghost small" type="button" @click="focusPlannerOnPoi">Use as Focus</button>
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
import { buildPoiPlannerPrompt } from '../utils/aiPlannerBridge'
import { getClientSessionKey } from '../utils/clientSession'

const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()
const AI_PLANNER_CACHE_VERSION = 2
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
const plannerSources = ref([])
const plannerInsights = ref([])
const plannerLlm = ref(null)
const plannerRetrieval = ref(null)
const plannerScope = ref({ supported: true, supported_city: 'London' })
const plannerQuota = ref(null)
const planLibrary = ref([])
const planLibraryLoading = ref(false)
const planLibraryError = ref('')
const planActionBusy = ref('')
const activeSavedPlanId = ref(null)
const planFlash = ref('')
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailPoi = ref(null)
const messageListEl = ref(null)
const messages = ref([buildSeedMessage()])
const panelOpen = ref({
  controls: false,
  library: true,
  intent: false,
  itinerary: false,
  insights: false,
  sources: false,
})

const interestWeightPct = ref(Math.round((Number(routeStore.recoInterestWeight || 0.5) * 100)))
const exploreWeightPct = ref(Math.round((Number(routeStore.recoExploreWeight || 0.15) * 100)))

let streamController = null
let scrollRaf = 0
let persistTimer = null
let latestDetailRequestSeq = 0
let planFlashTimer = null
const poiDetailCache = new Map()

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

const interestWeight = computed(() => clamp(Number(interestWeightPct.value || 0) / 100, 0, 1))
const exploreWeight = computed(() => clamp(Number(exploreWeightPct.value || 0) / 100, 0, 1))
const interestPct = computed(() => Math.round(interestWeight.value * 100))
const distancePct = computed(() => 100 - interestPct.value)
const explorePct = computed(() => Math.round(exploreWeight.value * 100))
const safePct = computed(() => 100 - explorePct.value)
const plannerStorageKey = computed(() => `${AI_PLANNER_CACHE_PREFIX}${auth.user?.id || 'guest'}`)
const clientSessionKey = getClientSessionKey()

const detailPhotos = computed(() => {
  const photos = Array.isArray(detailPoi.value?.photos) ? detailPoi.value.photos : []
  if (photos.length) return photos.slice(0, DETAIL_PHOTO_LIMIT)
  if (detailPoi.value?.image_url) return [detailPoi.value.image_url]
  return []
})
const detailCommunity = computed(() => detailPoi.value?.community_summary || null)
const detailStoryPosts = computed(() => (Array.isArray(detailPoi.value?.related_posts) ? detailPoi.value.related_posts.slice(0, 3) : []))
const detailStoryTags = computed(() => (Array.isArray(detailCommunity.value?.top_tags) ? detailCommunity.value.top_tags.slice(0, 4) : []))
const detailBestFor = computed(() => (Array.isArray(detailCommunity.value?.best_for) ? detailCommunity.value.best_for.slice(0, 3) : []))
const detailWatchOut = computed(() => (Array.isArray(detailCommunity.value?.watch_out_for) ? detailCommunity.value.watch_out_for.slice(0, 3) : []))

const quotaRoleLabel = computed(() => String(plannerQuota.value?.role_label || auth.roleLabel || 'Guest'))
const quotaRoleClass = computed(() => String(plannerQuota.value?.role || auth.user?.role || 'user').toLowerCase())
const quotaSubline = computed(() => {
  if (!plannerQuota.value) return 'Checking your monthly planner quota...'
  if (plannerQuota.value.ai_unlimited) return 'Unlimited planner runs for your current role.'
  return `Monthly planner limit resets each calendar month.`
})
const quotaPrimaryText = computed(() => {
  const quota = plannerQuota.value
  if (!quota) return 'Quota status unavailable'
  if (quota.ai_unlimited) return 'Unlimited AI planner access'
  return `${quota.remaining ?? 0} of ${quota.ai_monthly_limit ?? 0} runs remaining`
})
const quotaSecondaryText = computed(() => {
  const quota = plannerQuota.value
  if (!quota || quota.ai_unlimited) return ''
  return `${quota.used ?? 0} used this month`
})
const quotaProgressValue = computed(() => {
  const quota = plannerQuota.value
  const limit = Number(quota?.ai_monthly_limit)
  const used = Number(quota?.used)
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used)) return null
  return clamp((used / limit) * 100, 0, 100)
})

const visibleMessages = computed(() =>
  (messages.value || []).filter((msg) => msg?.role === 'user' || String(msg?.content || '').trim().length > 0)
)

const latestStageLabel = computed(() => {
  const stage = String(latestStage.value || '').toLowerCase()
  if (!stage || stage === 'idle') return 'Ready'
  if (stage === 'analyzing') return 'Analyzing'
  if (stage === 'retrieval') return 'Retrieving'
  if (stage === 'streaming') return 'Streaming'
  if (stage === 'scope_guard') return 'London Only'
  if (stage === 'fallback') return 'Fallback'
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

const buildRouteContextSnapshot = () => ({
  start: {
    lng: routeStore.startLng,
    lat: routeStore.startLat,
    name: String(routeStore.startAddress || '').trim(),
    address: String(routeStore.startAddress || '').trim(),
  },
  end: {
    lng: routeStore.endLng,
    lat: routeStore.endLat,
    name: String(routeStore.endAddress || '').trim(),
    address: String(routeStore.endAddress || '').trim(),
  },
  via: (routeStore.viaPoints || []).map((point) => ({
    id: point?.id ?? null,
    name: point?.name || 'POI',
    lat: Number(point?.lat),
    lng: Number(point?.lng),
    category: point?.category || '',
    image_url: point?.image_url || '',
  })),
  interest_weight: interestWeight.value,
  explore_weight: exploreWeight.value,
  detour_tolerance: routeStore.recoDetourTolerance ?? 0.5,
})

const buildProfileSnapshot = () => {
  const profile = routeStore.userInterestProfile || null
  const story = profile?.profile_story || null
  return {
    archetype: String(story?.archetype || ''),
    confidence: Number(story?.confidence || 0),
    dominant_category: String(story?.dominant_category?.name || ''),
    dominant_tag: String(story?.dominant_tag?.name || ''),
    source: String(profile?.source || ''),
    interest_weight: interestWeight.value,
    explore_weight: exploreWeight.value,
    detour_tolerance: routeStore.recoDetourTolerance ?? 0.5,
  }
}

const buildPersistPayload = () => ({
  v: AI_PLANNER_CACHE_VERSION,
  saved_at: Date.now(),
  saved_plan_id: activeSavedPlanId.value || null,
  draft_prompt: String(promptInput.value || ''),
  request_id: requestId.value || '',
  stream_error: streamError.value || '',
  route_meta: routeMeta.value || null,
  planner_meta: plannerMeta.value || null,
  planner_intent: plannerIntent.value || null,
  itinerary: itineraryData.value || null,
  recommendations: Array.isArray(rawRecommendations.value) ? rawRecommendations.value : [],
  sources: Array.isArray(plannerSources.value) ? plannerSources.value : [],
  insights: Array.isArray(plannerInsights.value) ? plannerInsights.value : [],
  llm: plannerLlm.value || null,
  retrieval: plannerRetrieval.value || null,
  scope: plannerScope.value || null,
  profile_snapshot: buildProfileSnapshot(),
  route_context: buildRouteContextSnapshot(),
  messages: sanitizeMessages(messages.value),
})

const applyRouteContextSnapshot = (context) => {
  if (!context || typeof context !== 'object') return
  if (Number.isFinite(Number(context?.interest_weight))) {
    interestWeightPct.value = Math.round(clamp(Number(context.interest_weight), 0, 1) * 100)
  }
  if (Number.isFinite(Number(context?.explore_weight))) {
    exploreWeightPct.value = Math.round(clamp(Number(context.explore_weight), 0, 1) * 100)
  }
  if (Number.isFinite(Number(context?.detour_tolerance))) {
    routeStore.setRecoDetourTolerance(Number(context.detour_tolerance))
  }

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
  routeStore.replaceViaPoints(
    via
      .map((point) => ({
        id: point?.id ?? null,
        name: point?.name || 'POI',
        lat: Number(point?.lat),
        lng: Number(point?.lng),
        category: point?.category || '',
        image_url: point?.image_url || '',
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
  )
}

const applyPlannerSnapshot = (parsed, { syncRouteContext = true } = {}) => {
  if (!parsed || typeof parsed !== 'object') return
  promptInput.value = String(parsed.draft_prompt || '')
  messages.value = sanitizeMessages(parsed.messages)
  requestId.value = String(parsed.request_id || '')
  streamError.value = String(parsed.stream_error || '')
  routeMeta.value = parsed.route_meta || null
  plannerMeta.value = parsed.planner_meta || null
  plannerIntent.value = parsed.planner_intent || null
  itineraryData.value = parsed.itinerary || null
  rawRecommendations.value = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  plannerSources.value = Array.isArray(parsed.sources) ? parsed.sources : []
  plannerInsights.value = Array.isArray(parsed.insights) ? parsed.insights : []
  plannerLlm.value = parsed.llm || null
  plannerRetrieval.value = parsed.retrieval || null
  plannerScope.value = parsed.scope || { supported: true, supported_city: 'London' }
  activeSavedPlanId.value = parsed.saved_plan_id ? Number(parsed.saved_plan_id) : null
  latestStage.value = 'idle'
  typingHint.value = ''
  if (syncRouteContext && parsed.route_context) {
    applyRouteContextSnapshot(parsed.route_context)
  }
}

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
    applyPlannerSnapshot(parsed, { syncRouteContext: true })
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
    promptInput.value,
    messages.value,
    requestId.value,
    streamError.value,
    routeMeta.value,
    plannerMeta.value,
    plannerIntent.value,
    itineraryData.value,
    rawRecommendations.value,
    plannerSources.value,
    plannerInsights.value,
    plannerLlm.value,
    plannerRetrieval.value,
    plannerScope.value,
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
    fetchSavedPlans()
    fetchPlannerQuota()
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

const sourceCards = computed(() => (Array.isArray(plannerSources.value) ? plannerSources.value : []))
const citationReferences = computed(() => sourceCards.value.slice(0, 6))

const scopeSupported = computed(() => plannerScope.value?.supported !== false)

const scopeNoticeText = computed(() => {
  if (scopeSupported.value) return ''
  const requested = String(plannerScope.value?.resolved_location || plannerScope.value?.requested_location || 'that city').trim()
  return `JourneyPro AI currently supports London only. Your request points to ${requested}, so the planner will not fabricate non-London routes or POIs.`
})

const engineTone = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'idle'
  if (cfg.mode === 'external') return 'live'
  return 'fallback'
})

const engineTitle = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'Planner engine waiting for first run'
  if (cfg.mode === 'external') return 'Live external AI is generating the narrative'
  return 'Local fallback planner is generating the narrative'
})

const engineSubline = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'Send a prompt to inspect the active planner engine.'
  if (cfg.mode === 'external') {
    const provider = String(cfg.provider || 'external').trim()
    const model = String(cfg.model || '').trim()
    return model ? `${provider} · ${model}` : provider
  }
  return 'Route ranking + JourneyPro retrieval are active. No external model is currently being used.'
})

const engineBadge = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'Idle'
  if (cfg.mode === 'external') return 'Live AI'
  return 'Fallback'
})

const engineHintText = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'The first completed request will show whether the narrative came from an external model or from the built-in fallback.'
  if (cfg.mode === 'external') {
    return 'Narrative text is coming from the external LLM. Ranking, route constraints, and retrieved JourneyPro evidence still stay in control.'
  }
  if (cfg.reason === 'missing_llm_config') {
    return 'No external LLM configuration is loaded in JourneyPro-api, so the planner is using the local fallback narrative.'
  }
  return 'The planner fell back to the local narrative path for this request.'
})

const llmBadgeText = computed(() => {
  const cfg = plannerLlm.value || null
  if (!cfg) return 'Route Engine'
  if (cfg.mode === 'external') return `External LLM${cfg.model ? ` · ${cfg.model}` : ''}`
  return 'Route Engine Fallback'
})

const retrievalBadgeText = computed(() => {
  const stats = plannerRetrieval.value || null
  if (!stats) return ''
  const cards = Number(stats.card_count || 0)
  const posts = Number(stats.selected_post_count || 0)
  const comments = Number(stats.selected_comment_count || 0)
  return `Evidence ${cards} · Posts ${posts} · Comments ${comments}`
})

const requestIdShort = computed(() => {
  const raw = String(requestId.value || '')
  if (!raw) return '-'
  return raw.slice(0, 8)
})

const plannerHasContent = computed(
  () =>
    recommendationList.value.length > 0 ||
    itinerarySegments.value.length > 0 ||
    sanitizeMessages(messages.value).length > 1
)

const canSavePlan = computed(() => !!auth.user?.id && plannerHasContent.value && !isStreaming.value)

const planLibraryMetaText = computed(() => {
  if (!auth.user?.id) return 'Login to sync'
  if (planLibraryLoading.value) return 'Syncing'
  return `${planLibrary.value.length} saved`
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

const togglePanel = (key) => {
  if (!key || typeof key !== 'string') return
  panelOpen.value = {
    ...panelOpen.value,
    [key]: !panelOpen.value[key],
  }
}

const fetchPlannerQuota = async () => {
  try {
    const query = new URLSearchParams()
    if (auth.user?.id) query.set('user_id', String(auth.user.id))
    else query.set('session_key', clientSessionKey)
    const res = await fetch(apiUrl(`/api/ai/planner/quota?${query.toString()}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load planner quota')
    plannerQuota.value = data.quota || null
  } catch (err) {
    console.error('fetch planner quota error', err)
  }
}

const sortPlans = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const starDiff = Number(!!b?.is_starred) - Number(!!a?.is_starred)
    if (starDiff) return starDiff
    const timeA = new Date(a?.updated_at || 0).getTime()
    const timeB = new Date(b?.updated_at || 0).getTime()
    return timeB - timeA
  })

const upsertPlanItem = (item) => {
  if (!item || !item.id) return
  const next = [...planLibrary.value]
  const index = next.findIndex((row) => Number(row?.id) === Number(item.id))
  if (index >= 0) next.splice(index, 1, item)
  else next.unshift(item)
  planLibrary.value = sortPlans(next)
}

const removePlanItem = (planId) => {
  planLibrary.value = planLibrary.value.filter((item) => Number(item?.id) !== Number(planId))
}

const setPlanFlash = (text) => {
  planFlash.value = String(text || '')
  if (planFlashTimer) clearTimeout(planFlashTimer)
  if (!planFlash.value) return
  planFlashTimer = setTimeout(() => {
    planFlash.value = ''
    planFlashTimer = null
  }, 2200)
}

const getLatestUserPrompt = () =>
  [...sanitizeMessages(messages.value)]
    .reverse()
    .find((msg) => msg.role === 'user' && String(msg.content || '').trim())?.content || ''

const formatRelativePlanTime = (value) => {
  const ts = new Date(value || '').getTime()
  if (!Number.isFinite(ts) || ts <= 0) return 'Unknown time'
  const diffMs = Date.now() - ts
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(ts).toLocaleDateString()
}

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const highlightInline = (text) =>
  String(text || '')
    .replace(/\b(\d+(?:\.\d+)?%)\b/g, '<span class="msg-token msg-token-pct">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?\s?(?:km|min|mins|stops?))\b/gi, '<span class="msg-token msg-token-metric">$1</span>')
    .replace(/\b(London|coffee|museum|museums|hidden gems|route|detour|explore|safe)\b/gi, '<span class="msg-token msg-token-key">$1</span>')

const renderMessageLine = (line) => {
  const raw = String(line || '').trimEnd()
  if (!raw) return '<div class="msg-gap"></div>'

  if (/^(Morning|Afternoon|Evening)\b/i.test(raw)) {
    return `<div class="msg-line msg-line-strong">${highlightInline(escapeHtml(raw))}</div>`
  }

  if (/^-\s*/.test(raw)) {
    const text = raw.replace(/^-\s*/, '')
    return `<div class="msg-line msg-line-bullet"><span class="msg-bullet-dot"></span><span>${highlightInline(escapeHtml(text))}</span></div>`
  }

  const labelMatch = raw.match(/^([^:]{3,42}:)\s*(.*)$/)
  if (labelMatch) {
    return `<div class="msg-line"><span class="msg-label">${escapeHtml(labelMatch[1])}</span>${labelMatch[2] ? ` <span>${highlightInline(escapeHtml(labelMatch[2]))}</span>` : ''}</div>`
  }

  return `<div class="msg-line">${highlightInline(escapeHtml(raw))}</div>`
}

const formatMessageHtml = (msg) => {
  const content = String(msg?.content || '')
  if (!content.trim()) return ''
  const lines = content.split(/\r?\n/)
  return lines.map(renderMessageLine).join('')
}

const formatTypingHintHtml = (value) => `<div class="msg-line">${highlightInline(escapeHtml(value || ''))}</div>`

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

const patchMessage = (messageId, updater) => {
  const id = String(messageId || '')
  if (!id) return
  const index = messages.value.findIndex((msg) => String(msg?.id || '') === id)
  if (index < 0) return
  const current = messages.value[index] || {}
  const nextPatch = typeof updater === 'function' ? updater(current) : updater
  if (!nextPatch || typeof nextPatch !== 'object') return
  messages.value.splice(index, 1, {
    ...current,
    ...nextPatch,
  })
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
  const assistantMessageId = assistantMsg.id
  promptInput.value = ''
  rawRecommendations.value = []
  routeMeta.value = null
  plannerIntent.value = null
  plannerMeta.value = null
  itineraryData.value = null
  plannerSources.value = []
  plannerInsights.value = []
  plannerLlm.value = null
  plannerRetrieval.value = null
  plannerScope.value = { supported: true, supported_city: 'London' }
  activeSavedPlanId.value = null
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
        session_key: clientSessionKey,
        interest_weight: interestWeight.value,
        explore_weight: exploreWeight.value,
        detour_tolerance: routeStore.recoDetourTolerance ?? 0.5,
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
          const token = String(data?.text || '')
          patchMessage(assistantMessageId, (current) => ({
            content: `${String(current?.content || '')}${token}`,
          }))
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
          if (data?.scope) plannerScope.value = data.scope
          if (data?.quota) plannerQuota.value = data.quota
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
          plannerSources.value = Array.isArray(data?.sources) ? data.sources : []
          plannerInsights.value = Array.isArray(data?.insights) ? data.insights : []
          plannerLlm.value = data?.llm || null
          plannerRetrieval.value = data?.retrieval || null
          if (data?.scope) plannerScope.value = data.scope
          if (data?.quota) plannerQuota.value = data.quota
          latestStage.value = 'ready'
          typingHint.value = ''
          return
        }
        if (event === 'error') {
          streamError.value = String(data?.message || 'Failed to generate plan.')
          if (data?.quota) plannerQuota.value = data.quota
          patchMessage(assistantMessageId, (current) => ({
            content: String(current?.content || '').trim() ? String(current?.content || '') : streamError.value,
          }))
          latestStage.value = 'error'
          typingHint.value = ''
          return
        }
        if (event === 'done') {
          latestStage.value = 'ready'
          typingHint.value = ''
          patchMessage(assistantMessageId, (current) => ({
            content: String(current?.content || '').trim() ? String(current?.content || '') : 'Plan generated. Check the recommendation cards on the right.',
          }))
          savePlannerStateNow()
        }
      })
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      streamError.value = err?.message || 'Streaming failed.'
      latestStage.value = 'error'
      typingHint.value = ''
      patchMessage(assistantMessageId, (current) => ({
        content: String(current?.content || '').trim() ? String(current?.content || '') : streamError.value,
      }))
    }
  } finally {
    isStreaming.value = false
    streamController = null
    fetchPlannerQuota()
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
  routeStore.enterAiMapMode(stops)
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
  plannerSources.value = []
  plannerInsights.value = []
  plannerLlm.value = null
  plannerRetrieval.value = null
  plannerScope.value = { supported: true, supported_city: 'London' }
  activeSavedPlanId.value = null
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

const openDetailStories = () => {
  if (!detailPoi.value?.id) return
  savePlannerStateNow()
  router.push({
    path: '/posts',
    query: {
      poi_id: String(detailPoi.value.id),
      poi_name: detailPoi.value.name || '',
    },
  })
}

const focusPlannerOnPoi = () => {
  if (!detailPoi.value) return
  const bridgePrompt =
    String(detailPoi.value?.planner_bridge?.suggested_prompt || '').trim() ||
    buildPoiPlannerPrompt(detailPoi.value, {
      bestFor: detailBestFor.value,
      watchOut: detailWatchOut.value,
      topTags: detailStoryTags.value,
    })
  promptInput.value = bridgePrompt
  panelOpen.value.controls = true
  closePoiDetail()
  nextTick(() => scheduleScrollToBottom())
}

const buildSourcePlannerPrompt = (source) => {
  const matchedPoi = source?.poi_id
    ? recommendationList.value.find((poi) => Number(poi?.id) === Number(source.poi_id))
    : null

  if (matchedPoi) {
    return buildPoiPlannerPrompt(matchedPoi, {
      focusText: source?.poi_category || source?.title || matchedPoi.category || '',
      routeHint: source?.snippet || '',
    })
  }

  const placeName = String(source?.poi_name || source?.title || 'this place').trim() || 'this place'
  const sourceTitle = String(source?.title || '').trim()
  const snippet = String(source?.snippet || '').replace(/\s+/g, ' ').trim()
  const sourceLead =
    source?.type === 'comment'
      ? `community comment${sourceTitle ? ` from "${sourceTitle}"` : ''}`
      : source?.type === 'post'
        ? `community story${sourceTitle ? ` "${sourceTitle}"` : ''}`
        : 'place evidence'
  const snippetPart = snippet ? ` Use this signal: ${snippet.slice(0, 140)}.` : ''
  return `Plan a London route around ${placeName}. Prioritize culturally rich stops, keep detours practical, and avoid collapsing the plan into only food. Use ${sourceLead} to guide the stop order.${snippetPart}`
}

const focusPlannerOnSource = (source) => {
  if (!source || typeof source !== 'object') return
  promptInput.value = buildSourcePlannerPrompt(source)
  panelOpen.value.sources = true
  panelOpen.value.controls = true
  savePlannerStateNow()
  nextTick(() => scheduleScrollToBottom())
}

const openSourceCard = (source) => {
  if (!source || typeof source !== 'object') return
  if ((source.type === 'post' || source.type === 'comment') && source.post_id) {
    savePlannerStateNow()
    router.push({ path: `/posts/postsid=${source.post_id}` })
    return
  }
  if (source.type === 'poi' && source.poi_id) {
    const matched = recommendationList.value.find((poi) => Number(poi?.id) === Number(source.poi_id))
    if (matched) {
      openPoiDetail(matched)
    }
  }
}

const formatCitationLabel = (source) => {
  const explicit = String(source?.citation_label || '').trim()
  if (explicit) return explicit.toUpperCase()
  const prefix = source?.type === 'post' ? 'P' : source?.type === 'comment' ? 'C' : source?.type === 'poi' ? 'R' : 'S'
  return `${prefix}${Number(source?.rank || 0) || 1}`
}

const formatSourceMetrics = (source) => {
  if (!source || typeof source !== 'object') return ''
  if (source.type === 'post') {
    const likes = Number(source.metrics?.likes || 0)
    const favorites = Number(source.metrics?.favorites || 0)
    return `${likes} likes · ${favorites} saves`
  }
  if (source.type === 'comment') {
    const likes = Number(source.metrics?.likes || 0)
    const replies = Number(source.metrics?.replies || 0)
    return `${likes} likes · ${replies} replies`
  }
  if (source.type === 'poi') {
    const reviews = Number(source.metrics?.reviews || 0)
    const stay = Number(source.metrics?.stay_minutes || 0)
    return `${reviews} reviews${stay ? ` · ${stay} min stay` : ''}`
  }
  return ''
}

const fetchSavedPlans = async () => {
  if (!auth.user?.id) {
    planLibrary.value = []
    activeSavedPlanId.value = null
    planLibraryError.value = ''
    return
  }

  planLibraryLoading.value = true
  planLibraryError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/ai/plans?user_id=${encodeURIComponent(String(auth.user.id))}&limit=24`))
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load saved plans.')
    }
    planLibrary.value = sortPlans(Array.isArray(data.items) ? data.items : [])
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to load saved plans.')
  } finally {
    planLibraryLoading.value = false
  }
}

const saveCurrentPlan = async () => {
  if (!canSavePlan.value || planActionBusy.value) return
  planActionBusy.value = 'save'
  planLibraryError.value = ''
  try {
    const payload = buildPersistPayload()
    const res = await fetch(apiUrl('/api/ai/plans'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        prompt: getLatestUserPrompt(),
        payload,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to save plan.')
    }
    upsertPlanItem(data.item)
    activeSavedPlanId.value = Number(data.item.id)
    savePlannerStateNow()
    setPlanFlash('Plan saved to your AI workspace.')
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to save plan.')
  } finally {
    planActionBusy.value = ''
  }
}

const createTripWorkspace = async () => {
  if (!canSavePlan.value || planActionBusy.value) return
  planActionBusy.value = 'trip'
  planLibraryError.value = ''
  try {
    const snapshot = buildPersistPayload()
    const sourcePlanId = Number(activeSavedPlanId.value) || null
    const res = await fetch(apiUrl('/api/trips'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        source_plan_id: sourcePlanId,
        title: getLatestUserPrompt(),
        planner_snapshot: snapshot,
        route_context: snapshot.route_context || null,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item?.id) {
      throw new Error(data?.message || 'Failed to create trip workspace.')
    }
    savePlannerStateNow()
    setPlanFlash('Trip workspace created.')
    router.push({ path: '/trips', query: { tripId: String(data.item.id) } })
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to create trip workspace.')
  } finally {
    planActionBusy.value = ''
  }
}

const loadSavedPlan = async (plan) => {
  const planId = Number(plan?.id)
  if (!auth.user?.id || !planId || planActionBusy.value) return
  planActionBusy.value = `load:${planId}`
  planLibraryError.value = ''
  try {
    stopStreaming()
    const res = await fetch(apiUrl(`/api/ai/plans/${encodeURIComponent(String(planId))}?user_id=${encodeURIComponent(String(auth.user.id))}`))
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item?.payload) {
      throw new Error(data?.message || 'Failed to load saved plan.')
    }
    applyPlannerSnapshot(
      {
        ...data.item.payload,
        saved_plan_id: planId,
      },
      { syncRouteContext: true }
    )
    closePoiDetail()
    savePlannerStateNow()
    activeSavedPlanId.value = planId
    await nextTick()
    scheduleScrollToBottom()
    setPlanFlash('Saved plan restored into the planner.')
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to load saved plan.')
  } finally {
    planActionBusy.value = ''
  }
}

const togglePlanStar = async (plan) => {
  const planId = Number(plan?.id)
  if (!auth.user?.id || !planId || planActionBusy.value) return
  planActionBusy.value = `star:${planId}`
  planLibraryError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/ai/plans/${encodeURIComponent(String(planId))}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        is_starred: !plan?.is_starred,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to update plan.')
    }
    upsertPlanItem(data.item)
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to update plan.')
  } finally {
    planActionBusy.value = ''
  }
}

const deleteSavedPlan = async (plan) => {
  const planId = Number(plan?.id)
  if (!auth.user?.id || !planId || planActionBusy.value) return
  if (typeof window !== 'undefined' && !window.confirm(`Delete "${plan?.title || 'this saved plan'}"?`)) return
  planActionBusy.value = `delete:${planId}`
  planLibraryError.value = ''
  try {
    const res = await fetch(apiUrl(`/api/ai/plans/${encodeURIComponent(String(planId))}?user_id=${encodeURIComponent(String(auth.user.id))}`), {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to delete plan.')
    }
    removePlanItem(planId)
    if (Number(activeSavedPlanId.value) === planId) {
      activeSavedPlanId.value = null
      savePlannerStateNow()
    }
    setPlanFlash('Saved plan deleted.')
  } catch (err) {
    planLibraryError.value = String(err?.message || 'Failed to delete plan.')
  } finally {
    planActionBusy.value = ''
  }
}

onMounted(() => {
  restorePlannerState()
  fetchSavedPlans()
  fetchPlannerQuota()
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
  if (planFlashTimer) {
    clearTimeout(planFlashTimer)
    planFlashTimer = null
  }
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
})
</script>

<style scoped>
.planner-page {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(470px, 1.12fr) minmax(540px, 0.88fr);
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
  gap: 12px;
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
  font-size: 32px;
  letter-spacing: -0.03em;
  line-height: 1.02;
}

.panel-head p {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.scope-pill {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #4d8cff 42%, transparent);
  background: color-mix(in srgb, #4d8cff 12%, transparent);
  color: color-mix(in srgb, var(--fg) 90%, transparent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.engine-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  padding: 10px 12px;
}

.engine-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.engine-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.engine-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 5px;
  flex: 0 0 auto;
  background: color-mix(in srgb, var(--panel-border) 90%, transparent);
}

.engine-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: color-mix(in srgb, var(--fg) 92%, transparent);
}

.engine-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.engine-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}

.engine-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.quota-card {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.quota-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quota-title {
  font-size: 13px;
  font-weight: 800;
  color: color-mix(in srgb, var(--fg) 92%, transparent);
}

.quota-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.quota-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--panel-border) 82%, transparent);
  background: color-mix(in srgb, var(--fg) 6%, transparent);
  color: color-mix(in srgb, var(--fg) 86%, transparent);
}

.quota-badge.role-admin {
  color: #7c3aed;
  border-color: color-mix(in srgb, #7c3aed 42%, transparent);
  background: color-mix(in srgb, #7c3aed 12%, transparent);
}

.quota-badge.role-svip {
  color: #d97706;
  border-color: color-mix(in srgb, #f59e0b 42%, transparent);
  background: color-mix(in srgb, #f59e0b 12%, transparent);
}

.quota-badge.role-vip {
  color: #2563eb;
  border-color: color-mix(in srgb, #2563eb 42%, transparent);
  background: color-mix(in srgb, #2563eb 12%, transparent);
}

.quota-metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: color-mix(in srgb, var(--fg) 86%, transparent);
}

.quota-track {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel-border) 55%, transparent);
  overflow: hidden;
}

.quota-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4d8cff, #74d8ff);
}

.library-toolbar {
  display: grid;
  gap: 8px;
}

.library-toolbar-copy {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.library-empty,
.library-error,
.library-flash {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  font-size: 12px;
  line-height: 1.55;
  color: var(--muted);
}

.library-error {
  color: #dc2626;
  border-color: color-mix(in srgb, #ef4444 35%, transparent);
  background: color-mix(in srgb, #ef4444 8%, transparent);
}

.library-flash {
  color: #0f766e;
  border-color: color-mix(in srgb, #14b8a6 30%, transparent);
  background: color-mix(in srgb, #14b8a6 9%, transparent);
}

.plan-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  max-height: 340px;
  overflow: auto;
  padding-right: 4px;
}

.plan-item {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  padding: 12px;
  display: grid;
  gap: 10px;
  transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

.plan-item.active {
  border-color: color-mix(in srgb, #4d8cff 52%, transparent);
  box-shadow: 0 12px 28px rgba(77, 140, 255, 0.12);
}

.plan-item.starred {
  background: linear-gradient(180deg, color-mix(in srgb, #f59e0b 8%, var(--surface)) 0%, color-mix(in srgb, var(--surface) 94%, transparent) 100%);
}

.plan-item-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.plan-item-top h4 {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--fg) 94%, transparent);
}

.plan-item-top p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--muted);
}

.plan-star-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: color-mix(in srgb, var(--fg) 84%, transparent);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.plan-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.plan-item-meta span {
  font-size: 11px;
  color: var(--muted);
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
}

.plan-item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.engine-live .engine-dot,
.engine-badge.engine-live {
  background: color-mix(in srgb, #10b981 18%, transparent);
  border-color: color-mix(in srgb, #10b981 44%, transparent);
  color: #0f9f74;
}

.engine-fallback .engine-dot,
.engine-badge.engine-fallback {
  background: color-mix(in srgb, #f59e0b 18%, transparent);
  border-color: color-mix(in srgb, #f59e0b 42%, transparent);
  color: #c77b03;
}

.engine-idle .engine-dot,
.engine-badge.engine-idle {
  background: color-mix(in srgb, #4d8cff 14%, transparent);
  border-color: color-mix(in srgb, #4d8cff 42%, transparent);
  color: #356fe0;
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
  flex-direction: row;
  align-items: flex-end;
  gap: 6px;
}

.clear-chat-btn {
  min-width: 108px;
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

.fold-card {
  padding: 10px 12px;
}

.fold-head {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
}

.fold-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.fold-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a8cff;
}

.fold-title {
  font-size: 13px;
  font-weight: 800;
  color: color-mix(in srgb, var(--fg) 92%, transparent);
}

.fold-meta {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.fold-body {
  margin-top: 10px;
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

.msg-content.rich {
  white-space: normal;
}

.msg-line {
  line-height: 1.62;
}

.msg-line + .msg-line {
  margin-top: 4px;
}

.msg-line-strong {
  font-weight: 700;
  color: color-mix(in srgb, var(--fg) 96%, transparent);
}

.msg-line-bullet {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.msg-bullet-dot {
  width: 7px;
  height: 7px;
  margin-top: 8px;
  border-radius: 999px;
  background: #5a8cff;
  flex: 0 0 auto;
}

.msg-gap {
  height: 8px;
}

.msg-label {
  display: inline-block;
  margin-right: 4px;
  color: #5a8cff;
  font-weight: 800;
}

.msg-token {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 0.94em;
  font-weight: 700;
  line-height: 1.45;
  margin: 0 1px;
}

.msg-token-pct {
  background: color-mix(in srgb, #5a8cff 16%, transparent);
  color: #356fe0;
}

.msg-token-metric {
  background: color-mix(in srgb, #10b981 14%, transparent);
  color: #0f9f74;
}

.msg-token-key {
  background: color-mix(in srgb, #f59e0b 14%, transparent);
  color: #c77b03;
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
  margin: 0 0 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 14px 14px;
  display: flex;
  flex-direction: column;
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

.itinerary-card,
.insight-card,
.sources-card {
  margin: 0 0 10px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  padding: 12px;
}

.itinerary-board {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.scope-warning-card,
.scope-warning-card {
  margin: 0 0 10px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  padding: 12px;
  border-color: color-mix(in srgb, #f59e0b 40%, transparent);
  background: color-mix(in srgb, #f59e0b 10%, var(--surface) 90%);
}

.scope-warning-title,
.insight-title,
.sources-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.scope-warning-card p,
.sources-head p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.insight-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--muted);
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.sources-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.citation-strip {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.citation-pill {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  color: var(--fg);
  padding: 7px 10px;
  cursor: pointer;
}

.citation-label {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 2px 7px;
  background: color-mix(in srgb, #4d8cff 18%, transparent);
  color: #5a8cff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.citation-copy {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--muted);
}

.source-item {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  background: color-mix(in srgb, var(--panel) 76%, transparent);
  padding: 10px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.source-item:hover,
.source-item:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #4d8cff 58%, transparent);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.14);
}

.source-topline,
.source-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: var(--muted);
}

.source-type {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: #5a8cff;
}

.source-rank {
  font-weight: 700;
  color: color-mix(in srgb, var(--fg) 78%, transparent);
}

.source-item h4 {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.source-item p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.source-foot {
  margin-top: 10px;
  align-items: flex-end;
}

.source-foot-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.source-plan-btn {
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #5a8cff 36%, transparent);
  background: color-mix(in srgb, #5a8cff 10%, transparent);
  color: #3d73ff;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.source-plan-btn:hover,
.source-plan-btn:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #5a8cff 58%, transparent);
  background: color-mix(in srgb, #5a8cff 16%, transparent);
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
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.reco-grid {
  margin: 0;
  display: grid;
  gap: 10px;
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

.detail-community-card,
.detail-story-block {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  padding: 12px;
}

.detail-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.detail-section-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f8cff;
}

.detail-community-metrics,
.detail-chip-row,
.detail-story-meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-community-metrics span,
.detail-story-meta span {
  color: var(--muted);
  font-size: 12px;
}

.detail-community-copy {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.detail-community-copy p {
  margin: 0;
  color: color-mix(in srgb, var(--fg) 84%, transparent);
  line-height: 1.55;
  font-size: 13px;
}

.detail-chip {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 6px 10px;
  font-size: 12px;
}

.detail-chip.positive {
  color: #10b981;
}

.detail-chip.caution {
  color: #f59e0b;
}

.detail-story-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.detail-story-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.detail-story-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
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

  .head-meta {
    align-items: flex-start;
  }

  .itinerary-board {
    grid-template-columns: 1fr;
  }

  .sources-grid {
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
