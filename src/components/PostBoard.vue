<template>
  <div class="page">
    <aside class="sidebar">
      <div class="brand">Community</div>

      <nav class="nav">
        <RouterLink to="/posts" class="nav-item active">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <RouterLink to="/notifications" class="nav-item">Notifications</RouterLink>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </nav>

      <div class="stats-card">
        <div class="stats-title">Feed Snapshot</div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Visible</div>
            <div class="stat-value">{{ filteredPosts.length }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Avg Likes</div>
            <div class="stat-value">{{ avgLikes }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Avg Favs</div>
            <div class="stat-value">{{ avgFavs }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">With POI</div>
            <div class="stat-value">{{ poiLinkRate }}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Structured</div>
            <div class="stat-value">{{ structuredRate }}%</div>
          </div>
        </div>
      </div>

      <div v-if="topCreators.length" class="creator-card">
        <div class="stats-title">Top Creators</div>
        <div class="creator-list">
          <button
            v-for="creator in topCreators"
            :key="creator.id"
            class="creator-item"
            @click="openCreator(creator.id)"
          >
            <span class="creator-name">{{ creator.name }}</span>
            <span class="creator-count">{{ creator.posts }} posts</span>
          </button>
        </div>
      </div>

      <div v-if="!auth.user" class="login-card">
        <el-button type="primary" class="w-full" @click="$router.push('/login')">Login / Publish</el-button>
        <ul>
          <li>Sync likes and favorites</li>
          <li>Build your interest profile</li>
          <li>Join comments and chat</li>
        </ul>
      </div>
    </aside>

    <main class="content" ref="contentEl">
      <header class="topbar">
        <div class="search-wrap">
          <el-input v-model="search" placeholder="Search titles, tags, and content" clearable @input="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="top-actions">
          <button class="tool-btn" :class="{ active: sort === 'hot' }" @click="switchSort">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ sort === 'latest' ? 'Latest' : 'Hot' }}</span>
          </button>
          <button class="tool-btn" :class="{ active: viewMode === 'masonry' }" @click="viewMode = 'masonry'">
            <el-icon><Grid /></el-icon>
            <span>Masonry</span>
          </button>
          <button class="tool-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
            <el-icon><Tickets /></el-icon>
            <span>List</span>
          </button>
        </div>
      </header>

      <section class="filter-strip">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            class="chip"
            :class="{ active: activeTab === tab }"
            @click="setTab(tab)"
          >
            {{ tab }}
          </button>
        </div>

        <div class="toggles">
          <button class="chip outline" :class="{ active: onlyPoi }" @click="onlyPoi = !onlyPoi">
            POI linked only
          </button>
          <button class="chip outline" :class="{ active: structuredOnly }" @click="structuredOnly = !structuredOnly">
            Structured stories
          </button>
          <div class="likes-filter">
            <span>Min likes {{ minLikes }}</span>
            <el-slider v-model="minLikes" :min="0" :max="150" :show-tooltip="false" style="width: 300px"/>
          </div>
        </div>
      </section>

      <div v-if="tripAttachFlash || tripAttachError" class="workspace-toast" :class="{ error: !!tripAttachError }">
        {{ tripAttachError || tripAttachFlash }}
      </div>

      <section v-if="spotlightLoading || hasSpotlightContent" class="spotlight-shell">
        <div class="spotlight-head">
          <div>
            <div class="spotlight-kicker">Community Lanes</div>
            <h2 class="spotlight-title">Route-linked stories and structured travel context.</h2>
            <p class="spotlight-copy">{{ spotlightSummary }}</p>
          </div>
          <div v-if="spotlight?.meta?.trip_style" class="spotlight-pill">
            {{ humanizeTripMetaValue(spotlight.meta.trip_style) }}
          </div>
        </div>
        <div v-if="spotlightError" class="spotlight-error">{{ spotlightError }}</div>

        <div v-if="spotlightLoading && !hasSpotlightContent" class="spotlight-skeleton-grid">
          <div class="spotlight-skeleton hero" />
          <div class="spotlight-skeleton" />
          <div class="spotlight-skeleton" />
        </div>

        <article
          v-else-if="spotlight.featured"
          class="featured-story"
          @click="openDetail(spotlight.featured)"
        >
          <div
            class="featured-cover"
            v-if="cardCoverImage(spotlight.featured)"
            :data-card-id="spotlight.featured.id"
            :ref="observeImageHost"
          >
            <div v-if="!isImageVisible(spotlight.featured.id) || !loadedMap[spotlight.featured.id]" class="img-skeleton" />
            <CroppedImage
              v-if="isImageVisible(spotlight.featured.id)"
              :src="cardCoverImage(spotlight.featured)"
              :alt="spotlight.featured.title"
              class="cover-img"
              loading="lazy"
              @load="() => markLoaded(spotlight.featured)"
            />
            <div class="featured-chip">Featured story</div>
          </div>
          <div class="featured-body">
            <div class="signal-row">
              <span
                v-for="signal in travelSignals(spotlight.featured).slice(0, 4)"
                :key="signal"
                class="signal-pill"
              >
                {{ signal }}
              </span>
            </div>
            <h3 class="featured-title">{{ spotlight.featured.title }}</h3>
            <p class="featured-text">{{ summarize(spotlight.featured.content) }}</p>
            <div class="featured-meta">
              <span>{{ spotlight.featured.user?.nickname || 'Guest' }}</span>
              <span v-if="spotlight.featured.poi?.name">&middot; {{ spotlight.featured.poi.name }}</span>
              <span v-if="spotlight.featured.poi?.category">&middot; {{ spotlight.featured.poi.category }}</span>
            </div>
            <div class="featured-actions">
              <button v-if="spotlight.featured.poi?.id" class="poi-link" @click.stop="openPoiFromFeed(spotlight.featured)">
                <el-icon><Location /></el-icon>
                <span>{{ spotlight.featured.poi?.name || 'Linked place' }}</span>
              </button>
              <button v-if="spotlight.featured.poi?.id" class="story-ai-btn" @click.stop="planFromStory(spotlight.featured)">
                Plan with AI
              </button>
              <button
                v-if="auth.user?.id"
                class="trip-link-btn"
                type="button"
                :disabled="isTripAttachBusy(spotlight.featured)"
                @click.stop="attachStoryToTrip(spotlight.featured)"
              >
                {{ isStoryAttached(spotlight.featured) ? 'Added to Trip' : isTripAttachBusy(spotlight.featured) ? 'Adding...' : 'Add to Trip' }}
              </button>
            </div>
          </div>
        </article>

        <div v-if="spotlightSections.length" class="spotlight-grid">
          <section v-for="section in spotlightSections" :key="section.key" class="spotlight-lane">
            <div class="lane-head">
              <div>
                <div class="lane-title">{{ section.title }}</div>
                <div class="lane-copy">{{ section.copy }}</div>
              </div>
              <div class="lane-count">{{ section.cards.length }}</div>
            </div>
            <div class="lane-track">
              <article
                v-for="card in section.cards"
                :key="`${section.key}-${card.id}`"
                class="lane-card"
                @click="openDetail(card)"
              >
                <div
                  v-if="cardCoverImage(card)"
                  class="lane-cover"
                  :data-card-id="card.id"
                  :ref="observeImageHost"
                >
                  <div v-if="!isImageVisible(card.id) || !loadedMap[card.id]" class="img-skeleton" />
                  <CroppedImage
                    v-if="isImageVisible(card.id)"
                    :src="cardCoverImage(card)"
                    :alt="card.title"
                    class="cover-img"
                    loading="lazy"
                    @load="() => markLoaded(card)"
                  />
                </div>
                <div class="lane-body">
                  <div class="lane-card-topline">
                    <span>{{ card.poi?.name || card.user?.nickname || 'Story' }}</span>
                    <span v-if="section.key === 'nearby' && card.distance_km !== null">{{ formatDistanceKm(card.distance_km) }}</span>
                  </div>
                  <h4 class="lane-card-title">{{ card.title }}</h4>
                  <div v-if="travelSignals(card).length" class="signal-row compact">
                    <span v-for="signal in travelSignals(card).slice(0, 2)" :key="signal" class="signal-pill">{{ signal }}</span>
                  </div>
                  <p class="lane-card-text">{{ summarize(card.content) }}</p>
                  <div class="lane-card-actions">
                    <button v-if="card.poi?.id" class="poi-link small" @click.stop="openPoiFromFeed(card)">
                      <el-icon><Location /></el-icon>
                      <span>{{ card.poi?.name || 'POI' }}</span>
                    </button>
                    <button v-if="card.poi?.id" class="story-ai-btn mini" @click.stop="planFromStory(card)">
                      Plan
                    </button>
                    <button
                      v-if="auth.user?.id"
                      class="trip-link-btn small"
                      type="button"
                      :disabled="isTripAttachBusy(card)"
                      @click.stop="attachStoryToTrip(card)"
                    >
                      {{ isStoryAttached(card) ? 'Added' : isTripAttachBusy(card) ? 'Adding...' : 'Trip' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>

      <section class="feed">
        <div v-if="loading && posts.length === 0" class="skeleton-list">
          <div v-for="n in 8" :key="n" class="skeleton-card" />
        </div>

        <div v-else-if="!loading && filteredPosts.length === 0" class="empty">
          <div>No posts match your current filters.</div>
          <el-button type="primary" @click="resetFilters">Reset filters</el-button>
        </div>

        <div v-else-if="viewMode === 'masonry'" class="waterfall">
          <article
            v-for="card in filteredPosts"
            :key="card.id"
            class="card"
            @click="openDetail(card)"
          >
            <div class="cover" v-if="cardCoverImage(card)" :data-card-id="card.id" :ref="observeImageHost">
              <div v-if="!isImageVisible(card.id) || !loadedMap[card.id]" class="img-skeleton" />
              <CroppedImage
                v-if="isImageVisible(card.id)"
                :src="cardCoverImage(card)"
                :alt="card.title"
                loading="lazy"
                class="cover-img"
                @load="() => markLoaded(card)"
              />
              <div class="floating-tag" v-if="card.tags?.length">{{ card.tags[0] }}</div>
            </div>

            <div class="card-body">
              <h3 class="card-title">{{ card.title }}</h3>
              <div v-if="card._collapsed_count" class="cluster-note">
                +{{ card._collapsed_count }} similar {{ card._collapsed_count === 1 ? 'story' : 'stories' }} folded
              </div>
              <div v-if="travelSignals(card).length" class="signal-row">
                <span v-for="signal in travelSignals(card).slice(0, 3)" :key="signal" class="signal-pill">{{ signal }}</span>
              </div>
              <div class="card-meta">
                <span>{{ card.user?.nickname || 'Guest' }}</span>
                <span v-if="card.tags?.length">&middot; {{ card.tags.slice(0, 2).join(' / ') }}</span>
              </div>

              <button v-if="card.poi?.id" class="poi-link" @click.stop="openPoiFromFeed(card)">
                <el-icon><Location /></el-icon>
                <span>{{ card.poi?.name || 'Linked place' }}</span>
              </button>

              <div class="card-footer">
                <button v-if="card.poi?.id" class="story-ai-btn" @click.stop="planFromStory(card)">
                  Plan with AI
                </button>
                <button
                  v-if="auth.user?.id"
                  class="trip-link-btn"
                  type="button"
                  :disabled="isTripAttachBusy(card)"
                  @click.stop="attachStoryToTrip(card)"
                >
                  {{ isStoryAttached(card) ? 'Added to Trip' : isTripAttachBusy(card) ? 'Adding...' : 'Add to Trip' }}
                </button>
                <button class="icon-btn" @click.stop="toggleLike(card)">
                  <el-icon :class="['stat-icon', { liked: card._liked }]">
                    <component :is="card._liked ? CircleCheckFilled : CircleCheck" />
                  </el-icon>
                  <span>{{ card.like_count || 0 }}</span>
                </button>
                <button class="icon-btn" @click.stop="toggleFav(card)">
                  <el-icon :class="['stat-icon', 'fav', { active: card._fav }]">
                    <component :is="card._fav ? StarFilled : Star" />
                  </el-icon>
                  <span>{{ card.favorite_count || 0 }}</span>
                </button>
                <span class="views">{{ card.view_count || 0 }} views</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="list-view">
          <article
            v-for="card in filteredPosts"
            :key="card.id"
            class="list-card"
            @click="openDetail(card)"
          >
            <div class="list-cover" v-if="cardCoverImage(card)" :data-card-id="card.id" :ref="observeImageHost">
              <div v-if="!isImageVisible(card.id) || !loadedMap[card.id]" class="img-skeleton" />
              <CroppedImage
                v-if="isImageVisible(card.id)"
                :src="cardCoverImage(card)"
                :alt="card.title"
                class="cover-img"
                loading="lazy"
                @load="() => markLoaded(card)"
              />
            </div>
            <div class="list-body">
              <h3 class="list-title">{{ card.title }}</h3>
              <div v-if="travelSignals(card).length" class="signal-row compact">
                <span v-for="signal in travelSignals(card).slice(0, 4)" :key="signal" class="signal-pill">{{ signal }}</span>
              </div>
              <p class="list-text">{{ summarize(card.content) }}</p>
              <div class="list-meta">
                <span>{{ card.user?.nickname || 'Guest' }}</span>
                <span>&middot;</span>
                <span>{{ formatTime(card.created_at) }}</span>
              </div>
              <div v-if="card._collapsed_count" class="cluster-note list">
                +{{ card._collapsed_count }} similar {{ card._collapsed_count === 1 ? 'story' : 'stories' }} folded
              </div>
              <div class="list-actions">
                <div class="list-link-group">
                  <button v-if="card.poi?.id" class="poi-link" @click.stop="openPoiFromFeed(card)">
                    <el-icon><Location /></el-icon>
                    <span>{{ card.poi?.name || 'Linked place' }}</span>
                  </button>
                  <button v-if="card.poi?.id" class="story-ai-btn subtle" @click.stop="planFromStory(card)">
                    Plan with AI
                  </button>
                  <button
                    v-if="auth.user?.id"
                    class="trip-link-btn subtle"
                    type="button"
                    :disabled="isTripAttachBusy(card)"
                    @click.stop="attachStoryToTrip(card)"
                  >
                    {{ isStoryAttached(card) ? 'Added to Trip' : isTripAttachBusy(card) ? 'Adding...' : 'Add to Trip' }}
                  </button>
                </div>
                <div class="metric-group">
                  <span>{{ card.like_count || 0 }} likes</span>
                  <span>{{ card.favorite_count || 0 }} favs</span>
                  <span>{{ card.view_count || 0 }} views</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="loading && posts.length > 0" class="loading-more">Loading more...</div>
        <div v-if="noMore" class="no-more">No more posts</div>
      </section>

      <transition name="back-top">
        <button v-if="showBackTop" class="back-top" type="button" @click="scrollToTop" aria-label="Back to top">
          <el-icon class="back-top-icon"><ArrowUpBold /></el-icon>
        </button>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import {
  Search,
  CircleCheck,
  CircleCheckFilled,
  Star,
  StarFilled,
  ArrowUpBold,
  Location,
  Grid,
  Tickets,
  TrendCharts,
} from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import CroppedImage from './CroppedImage.vue'
import { proxiedImageSrc } from '../utils/imageProxy'
import { apiUrl } from '../config/api'
import { buildPoiPlannerPrompt, seedAiPlannerFromContext } from '../utils/aiPlannerBridge'
import { seedPostDetailPreview } from '../utils/postDetailBridge'

const API_BASE = apiUrl('/api/posts')
const auth = useAuthStore()
const routeStore = useRouteStore()
const route = useRoute()
const router = useRouter()

const tabs = ref(['Recommended'])
const activeTab = ref('Recommended')
const sort = ref('latest')
const search = ref('')
const posts = ref([])
const loadedMap = ref({})
const loading = ref(false)
const noMore = ref(false)
const imageObserver = ref(null)
const limit = 12
const offset = ref(0)
const cursor = ref(null)
const onlyPoi = ref(false)
const structuredOnly = ref(false)
const minLikes = ref(0)
const viewMode = ref(localStorage.getItem('jp_post_view_mode') || 'masonry')
const createEmptySpotlight = () => ({
  featured: null,
  route_linked: [],
  nearby: [],
  same_style: [],
  meta: {},
})
const spotlight = ref(createEmptySpotlight())
const spotlightLoading = ref(false)
const spotlightError = ref('')
const tripAttachFlash = ref('')
const tripAttachError = ref('')
const attachedStoryIds = ref(new Set())
const tripAttachBusyMap = ref({})
let spotlightRequestSeq = 0
const poiFilterId = computed(() => {
  const raw = route.query.poi_id
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
})
const activeTagParam = computed(() => (activeTab.value === 'Recommended' ? '' : activeTab.value))
const isCursorSort = computed(() => sort.value === 'latest')
const routeContextPoiIds = computed(() => {
  const ids = new Set()
  if (poiFilterId.value) ids.add(Number(poiFilterId.value))
  ;(routeStore.viaPoints || []).forEach((poi) => {
    const id = Number(poi?.id ?? poi?.poi_id)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  })
  ;(routeStore.recommendedPOIs || []).slice(0, 8).forEach((poi) => {
    const id = Number(poi?.id ?? poi?.poi_id)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  })
  const selectedId = Number(routeStore.selectedPoi?.id ?? routeStore.selectedPoi?.poi_id)
  if (Number.isFinite(selectedId) && selectedId > 0) ids.add(selectedId)
  return [...ids].slice(0, 12)
})
const dominantTripStyle = computed(() => {
  const counts = new Map()
  posts.value.forEach((post) => {
    const style = String(post?.trip_meta?.trip_style || '').trim()
    if (!style) return
    counts.set(style, (counts.get(style) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
})
const spotlightSections = computed(() => {
  const data = spotlight.value || createEmptySpotlight()
  return [
    {
      key: 'route_linked',
      title: 'Along your route',
      copy: 'Stories attached to current waypoints and recommended stops.',
      cards: data.route_linked || [],
    },
    {
      key: 'nearby',
      title: 'Nearby now',
      copy: 'Posts clustered around the current map anchor.',
      cards: data.nearby || [],
    },
    {
      key: 'same_style',
      title: 'Same trip style',
      copy: 'Structured stories that match the dominant travel pattern.',
      cards: data.same_style || [],
    },
  ].filter((section) => section.cards.length > 0)
})
const hasSpotlightContent = computed(() => !!spotlight.value?.featured || spotlightSections.value.length > 0)
const spotlightRouteSignature = computed(() =>
  JSON.stringify({
    routePoiIds: routeContextPoiIds.value,
    selectedPoiId: routeStore.selectedPoi?.id ?? routeStore.selectedPoi?.poi_id ?? null,
    dominantTripStyle: dominantTripStyle.value,
    onlyPoi: onlyPoi.value,
  })
)
const spotlightSummary = computed(() => {
  const meta = spotlight.value?.meta || {}
  const parts = []
  if (Number(meta.route_poi_count) > 0) parts.push(`${meta.route_poi_count} route-linked POIs`)
  if (meta.trip_style) parts.push(`${humanizeTripMetaValue(meta.trip_style)} stories`)
  if (activeTagParam.value) parts.push(`tagged ${activeTagParam.value}`)
  return parts.length ? parts.join(' · ') : 'Pulling stories from route context, POI links, and structured trip metadata.'
})

const markWithReactions = (list) =>
  list.map((item) => ({
    ...item,
    _liked: !!item?._liked,
    _fav: !!item?._fav,
  }))

const fetchTags = async () => {
  try {
    const res = await axios.get(`${API_BASE}/tags/list`)
    const names = res.data?.data?.map((t) => t.name).filter(Boolean) || []
    tabs.value = ['Recommended', ...Array.from(new Set(names)).slice(0, 18)]
  } catch {
    tabs.value = ['Recommended']
  }
}

const fetchPosts = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    if (reset) {
      posts.value = []
      loadedMap.value = {}
      visibleImageIds.value = new Set()
      offset.value = 0
      cursor.value = null
      noMore.value = false
      lastContentScrollTop.value = 0
    }
    const params = {
      limit,
      sort: sort.value,
      compact: 1,
      lite: 1,
      feed_lite: 1,
      tag: activeTagParam.value || undefined,
      poi_id: poiFilterId.value || undefined,
      viewer_id: auth.user?.id || undefined,
      structured_only: structuredOnly.value ? 1 : undefined,
    }
    if (isCursorSort.value) {
      if (cursor.value?.created_at && cursor.value?.id) {
        params.cursor_created_at = cursor.value.created_at
        params.cursor_id = cursor.value.id
      }
    } else {
      params.offset = offset.value
    }
    const res = await axios.get(API_BASE, { params })
    const list = markWithReactions(res.data?.data || [])
    if (list.length < limit) noMore.value = true
    posts.value = reset ? list : [...posts.value, ...list]
    if (isCursorSort.value) {
      cursor.value = res.data?.next_cursor || null
      if (!cursor.value && list.length >= limit) {
        const last = list[list.length - 1]
        cursor.value = last?.created_at && last?.id ? { created_at: last.created_at, id: last.id } : null
      }
    } else {
      offset.value += list.length
    }
    await nextTick()
    refreshImageObservers()
    if (reset) {
      void fetchSpotlightSections()
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const fetchSpotlightSections = async () => {
  const seq = ++spotlightRequestSeq
  spotlightLoading.value = true
  spotlightError.value = ''
  try {
    const focusPoi = poiFilterId.value || routeContextPoiIds.value[0] || undefined
    const anchorPoi =
      routeStore.selectedPoi ||
      routeStore.viaPoints?.[0] ||
      routeStore.recommendedPOIs?.[0] ||
      null
    const params = {
      viewer_id: auth.user?.id || undefined,
      focus_poi_id: focusPoi,
      route_poi_ids: routeContextPoiIds.value.length ? routeContextPoiIds.value.join(',') : undefined,
      trip_style: dominantTripStyle.value || undefined,
      structured_only: structuredOnly.value ? 1 : undefined,
      poi_only: onlyPoi.value ? 1 : undefined,
      tag: activeTagParam.value || undefined,
      lat: Number.isFinite(Number(anchorPoi?.lat)) ? Number(anchorPoi.lat) : undefined,
      lng: Number.isFinite(Number(anchorPoi?.lng)) ? Number(anchorPoi.lng) : undefined,
      limit: 4,
    }
    const res = await axios.get(`${API_BASE}/sections/spotlight`, { params })
    if (seq !== spotlightRequestSeq) return
    spotlight.value = res.data?.data || createEmptySpotlight()
  } catch {
    if (seq !== spotlightRequestSeq) return
    spotlight.value = createEmptySpotlight()
    spotlightError.value = 'Failed to load spotlight lanes.'
  } finally {
    if (seq === spotlightRequestSeq) {
      spotlightLoading.value = false
    }
  }
}

let tripAttachFlashTimer = null
const setTripAttachFeedback = (value = '', isError = false) => {
  if (tripAttachFlashTimer) {
    clearTimeout(tripAttachFlashTimer)
    tripAttachFlashTimer = null
  }
  tripAttachFlash.value = isError ? '' : String(value || '')
  tripAttachError.value = isError ? String(value || '') : ''
  if (!value) return
  tripAttachFlashTimer = setTimeout(() => {
    tripAttachFlash.value = ''
    tripAttachError.value = ''
    tripAttachFlashTimer = null
  }, 2600)
}

const buildCurrentRouteContext = () => ({
  start:
    Number.isFinite(Number(routeStore.startLat)) && Number.isFinite(Number(routeStore.startLng))
      ? { lat: Number(routeStore.startLat), lng: Number(routeStore.startLng), name: routeStore.startAddress || '' }
      : null,
  end:
    Number.isFinite(Number(routeStore.endLat)) && Number.isFinite(Number(routeStore.endLng))
      ? { lat: Number(routeStore.endLat), lng: Number(routeStore.endLng), name: routeStore.endAddress || '' }
      : null,
  via: Array.isArray(routeStore.viaPoints) ? routeStore.viaPoints.slice(0, 16) : [],
  interest_weight: Number(routeStore.recoInterestWeight || 0.5),
  explore_weight: Number(routeStore.recoExploreWeight || 0.15),
  detour_tolerance: Number(routeStore.recoDetourTolerance || 0.5),
})

const buildTripAttachPayload = (card) => ({
  user_id: auth.user?.id,
  post: {
    post_id: card?.id,
    poi_id: card?.poi?.id || card?.poi_id || null,
    title: card?.title || '',
    snippet: summarize(card?.content || ''),
    author: card?.user?.nickname || 'Traveler',
    poi_name: card?.poi?.name || '',
    image_url: cardCoverImage(card) || '',
    source_type: 'post',
    created_at: card?.created_at || null,
    metrics: {
      likes: Number(card?.like_count || 0),
      favorites: Number(card?.favorite_count || 0),
      views: Number(card?.view_count || 0),
    },
  },
  poi: card?.poi
    ? {
        id: card.poi.id || card.poi_id || null,
        name: card.poi.name || '',
        category: card.poi.category || '',
        image_url: card.poi.image_url || cardCoverImage(card) || '',
        lat: card.poi.lat,
        lng: card.poi.lng,
        reason: `Attached from community story: ${card?.title || 'Community story'}`,
        source: 'community-story',
      }
    : null,
  title: card?.poi?.name ? `${card.poi.name} community workspace` : truncateTitle(card?.title || 'Community workspace'),
  summary: summarize(card?.content || ''),
  prompt_preview: card?.title || '',
  route_context: buildCurrentRouteContext(),
})

const truncateTitle = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return 'Community workspace'
  return text.length > 140 ? `${text.slice(0, 137).trim()}...` : text
}

const storyAttachKey = (card) => {
  const id = Number(card?.id)
  if (Number.isFinite(id) && id > 0) return `post:${id}`
  const poiId = Number(card?.poi?.id || card?.poi_id)
  if (Number.isFinite(poiId) && poiId > 0) return `poi:${poiId}`
  return `title:${String(card?.title || '').trim().toLowerCase()}`
}

const isTripAttachBusy = (card) => !!tripAttachBusyMap.value[storyAttachKey(card)]
const isStoryAttached = (card) => attachedStoryIds.value.has(storyAttachKey(card))

const attachStoryToTrip = async (card) => {
  if (!auth.user?.id) {
    router.push('/login')
    return
  }
  const key = storyAttachKey(card)
  if (!key || isTripAttachBusy(card)) return
  tripAttachBusyMap.value = { ...tripAttachBusyMap.value, [key]: true }
  setTripAttachFeedback('')
  try {
    const res = await fetch(apiUrl('/api/trips/attach-community'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTripAttachPayload(card)),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success || !data?.item?.id) {
      throw new Error(data?.message || 'Failed to attach story to trip workspace.')
    }
    attachedStoryIds.value = new Set([...attachedStoryIds.value, key])
    const tripTitle = data?.item?.title || 'trip workspace'
    setTripAttachFeedback(`${data?.created ? 'Created' : 'Updated'} "${tripTitle}" from this story.`)
  } catch (err) {
    setTripAttachFeedback(String(err?.message || 'Failed to attach story to trip workspace.'), true)
  } finally {
    const next = { ...tripAttachBusyMap.value }
    delete next[key]
    tripAttachBusyMap.value = next
  }
}

const toggleLike = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (!updated) return
    const liked = !!res.data?.liked
    replacePost({ ...updated, _liked: liked, _fav: card._fav })
  } catch {
    // ignore
  }
}

const toggleFav = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/favorite`, { user_id: auth.user?.id })
    const updated = res.data?.data
    const favored = !!res.data?.favorited
    if (!updated) return
    replacePost({ ...updated, _fav: favored, _liked: card._liked })
  } catch {
    // ignore
  }
}

const openDetail = (card) => {
  seedPostDetailPreview(card)
  router.push(`/posts/postsid=${card.id}`)
}

const toFeedImageUrl = (raw) => {
  const url = String(raw || '').trim()
  if (!url) return ''
  const resized = url
    .replace(/loremflickr\.com\/1280\/864\//i, 'loremflickr.com/360/240/')
    .replace(/loremflickr\.com\/640\/432\//i, 'loremflickr.com/360/240/')
  return proxiedImageSrc(resized)
}

const cardCoverImage = (card) => toFeedImageUrl(card?.cover_image || card?.images?.[0] || card?.poi?.image_url || '')

const openPoiFromFeed = (card) => {
  const poi = card?.poi
  if (!poi?.id) return
  router.push({
    path: '/map',
    query: {
      poi_id: String(poi.id),
      poi_name: poi.name || '',
      poi_lat: poi.lat ?? '',
      poi_lng: poi.lng ?? '',
    },
  })
}

const buildProfileSnapshot = () => {
  const profile = routeStore.userInterestProfile || null
  const story = profile?.profile_story || null
  if (!story) return null
  return {
    archetype: String(story?.archetype || ''),
    confidence: Number(story?.confidence || 0),
    dominant_category: String(story?.dominant_category?.name || ''),
    dominant_tag: String(story?.dominant_tag?.name || ''),
    source: String(profile?.source || ''),
    interest_weight: Number(routeStore.recoInterestWeight || 0.5),
    explore_weight: Number(routeStore.recoExploreWeight || 0.15),
  }
}

const buildStoryPrompt = (card) => {
  const poi = card?.poi || null
  const bestFor = Array.isArray(card?.trip_meta?.best_for) ? card.trip_meta.best_for.slice(0, 2) : []
  const avoidFor = Array.isArray(card?.trip_meta?.avoid_for) ? card.trip_meta.avoid_for.slice(0, 2) : []
  const tags = Array.isArray(card?.tags) ? card.tags.slice(0, 3) : []
  if (poi?.id) {
    return buildPoiPlannerPrompt(poi, {
      bestFor,
      watchOut: avoidFor,
      topTags: tags,
      focusText: bestFor.join(' and ') || tags.join(', ') || poi.category || 'high-quality stops',
    })
  }
  const focus = bestFor.join(' and ') || tags.join(', ') || 'community-backed places'
  return `Plan a London route inspired by this community story. Prioritize ${focus}, keep detours practical, and preserve a balanced mix of stops.`
}

const planFromStory = (card) => {
  const prompt = buildStoryPrompt(card)
  seedAiPlannerFromContext({
    userId: auth.user?.id || null,
    routeStore,
    prompt,
    anchorPoi: card?.poi || null,
    profileSnapshot: buildProfileSnapshot(),
    source: 'community-feed-card',
  })
  router.push('/ai-planner')
}

const contentEl = ref(null)
const showBackTop = ref(false)
const lastScrollEl = ref(null)
const lastContentScrollTop = ref(0)
const LOAD_MORE_THRESHOLD_PX = 220

const isInContentScope = (el) => {
  const root = contentEl.value
  if (!root) return true
  return el === root || root.contains(el) || el.contains(root)
}

const pickScrollableEl = (el) => {
  if (!(el instanceof HTMLElement)) return null
  if (!isInContentScope(el)) return null
  if (el === document.body || el === document.documentElement) return null
  const style = window.getComputedStyle(el)
  const overflowY = String(style?.overflowY || '').toLowerCase()
  if (!['auto', 'scroll', 'overlay'].includes(overflowY)) return null
  if (el.scrollHeight <= el.clientHeight + 2) return null
  return el
}

const getDocumentScrollEl = () => document.scrollingElement || document.documentElement || document.body

const getFeedLoadContainer = (preferredTarget = null) => {
  const preferred = pickScrollableEl(preferredTarget)
  if (preferred) return preferred
  const lastActive = pickScrollableEl(lastScrollEl.value)
  if (lastActive) return lastActive
  const scopedContent = pickScrollableEl(contentEl.value)
  if (scopedContent) return scopedContent
  const docEl = getDocumentScrollEl()
  if (docEl && docEl.scrollHeight > docEl.clientHeight + 2) return docEl
  return null
}

const getDocumentScrollTop = () =>
  window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0

const getActiveScrollTop = () => {
  const active = getFeedLoadContainer()
  return active ? active.scrollTop : getDocumentScrollTop()
}

const onAnyScroll = (e) => {
  const targetEl = pickScrollableEl(e?.target)
  if (targetEl) lastScrollEl.value = targetEl
  showBackTop.value = getActiveScrollTop() > 360
  maybeLoadMoreOnScroll(e?.target)
}

const maybeLoadMoreOnScroll = (preferredTarget = null) => {
  const container = getFeedLoadContainer(preferredTarget)
  if (!container || loading.value || noMore.value) return
  const currentTop = Number(container.scrollTop || 0)
  const isScrollingDown = currentTop > lastContentScrollTop.value
  lastContentScrollTop.value = currentTop
  if (!isScrollingDown) return
  const remaining = container.scrollHeight - currentTop - container.clientHeight
  if (remaining <= LOAD_MORE_THRESHOLD_PX) {
    fetchPosts()
  }
}

const scrollToTop = () => {
  const active = pickScrollableEl(lastScrollEl.value) || pickScrollableEl(contentEl.value)
  if (active) {
    lastContentScrollTop.value = 0
    active.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  lastContentScrollTop.value = 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const replacePost = (updated) => {
  const idx = posts.value.findIndex((p) => p.id === updated.id)
  if (idx > -1) posts.value[idx] = { ...posts.value[idx], ...updated }
}

const setTab = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
}

const switchSort = () => {
  sort.value = sort.value === 'latest' ? 'hot' : 'latest'
}

const handleSearch = () => {
  // computed filter only
}

const dedupePostsByPrimaryImage = (list) => {
  const seen = new Set()
  return (list || []).filter((post) => {
    const raw = String(post?.cover_image || post?.images?.[0] || '').trim().toLowerCase()
    if (!raw) return true
    if (seen.has(raw)) return false
    seen.add(raw)
    return true
  })
}

const buildFeedEntries = (list) => {
  const imageOwners = new Map()
  const poiCounts = new Map()
  const poiOwners = new Map()
  const visible = []

  ;(list || []).forEach((post) => {
    const imageKey = String(post?.cover_image || post?.images?.[0] || '').trim().toLowerCase()
    const poiKey = !poiFilterId.value && post?.poi_id ? String(post.poi_id) : ''
    let owner = null

    if (imageKey && imageOwners.has(imageKey)) {
      owner = imageOwners.get(imageKey)
    } else if (poiKey) {
      const currentPoiCount = poiCounts.get(poiKey) || 0
      if (currentPoiCount >= 2 && poiOwners.has(poiKey)) {
        owner = poiOwners.get(poiKey)
      }
    }

    if (owner) {
      owner._collapsed_count = Number(owner._collapsed_count || 0) + 1
      if (!owner._collapsed_titles) owner._collapsed_titles = []
      if (post?.title && owner._collapsed_titles.length < 3) {
        owner._collapsed_titles.push(post.title)
      }
      return
    }

    const next = {
      ...post,
      _collapsed_count: 0,
      _collapsed_titles: [],
    }
    visible.push(next)
    if (imageKey) imageOwners.set(imageKey, next)
    if (poiKey) {
      poiCounts.set(poiKey, (poiCounts.get(poiKey) || 0) + 1)
      if (!poiOwners.has(poiKey)) poiOwners.set(poiKey, next)
    }
  })

  return visible
}

const filteredPosts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  const filtered = posts.value.filter((p) => {
    const metaText = [
      p.trip_meta?.trip_style,
      p.trip_meta?.route_role,
      p.trip_meta?.visit_time,
      p.trip_meta?.pace,
      p.trip_meta?.spend_level,
      p.trip_meta?.crowd_level,
      p.trip_meta?.companion_type,
      ...(p.trip_meta?.best_for || []),
      ...(p.trip_meta?.avoid_for || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const inPoi = poiFilterId.value ? Number(p.poi_id) === poiFilterId.value : true
    const inTab =
      activeTab.value === 'Recommended'
        ? true
        : (p.tags || []).length === 0 || (p.tags || []).includes(activeTab.value)
    const inKw =
      !kw ||
      p.title?.toLowerCase().includes(kw) ||
      p.content?.toLowerCase().includes(kw) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(kw)) ||
      p.user?.nickname?.toLowerCase().includes(kw) ||
      metaText.includes(kw)
    const inPoiToggle = onlyPoi.value ? !!p.poi_id : true
    const inStructured = structuredOnly.value ? !!p.trip_meta : true
    const inLikes = (Number(p.like_count) || 0) >= minLikes.value
    return inPoi && inTab && inKw && inPoiToggle && inStructured && inLikes
  })
  return buildFeedEntries(dedupePostsByPrimaryImage(filtered))
})

const avgLikes = computed(() => {
  if (!filteredPosts.value.length) return 0
  const total = filteredPosts.value.reduce((sum, p) => sum + (Number(p.like_count) || 0), 0)
  return Math.round(total / filteredPosts.value.length)
})

const avgFavs = computed(() => {
  if (!filteredPosts.value.length) return 0
  const total = filteredPosts.value.reduce((sum, p) => sum + (Number(p.favorite_count) || 0), 0)
  return Math.round(total / filteredPosts.value.length)
})

const poiLinkRate = computed(() => {
  if (!filteredPosts.value.length) return 0
  const linked = filteredPosts.value.filter((p) => !!p.poi_id).length
  return Math.round((linked * 100) / filteredPosts.value.length)
})

const structuredRate = computed(() => {
  if (!filteredPosts.value.length) return 0
  const count = filteredPosts.value.filter((p) => !!p.trip_meta).length
  return Math.round((count * 100) / filteredPosts.value.length)
})

const topCreators = computed(() => {
  const map = new Map()
  posts.value.forEach((p) => {
    const id = p.user?.id
    if (!id) return
    if (!map.has(id)) {
      map.set(id, { id, name: p.user?.nickname || `User ${id}`, posts: 0 })
    }
    map.get(id).posts += 1
  })
  return [...map.values()].sort((a, b) => b.posts - a.posts).slice(0, 5)
})

const summarize = (text) => {
  const raw = String(text || '').replace(/\s+/g, ' ').trim()
  if (!raw) return 'No content.'
  return raw.length > 150 ? `${raw.slice(0, 150)}...` : raw
}

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleDateString()
}

const formatDistanceKm = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 'Nearby'
  return num < 1 ? `${Math.round(num * 1000)} m` : `${num.toFixed(1)} km`
}

const markLoaded = (card) => {
  loadedMap.value = { ...loadedMap.value, [card.id]: true }
}

const humanizeTripMetaValue = (value) =>
  String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const travelSignals = (card) => {
  const meta = card?.trip_meta
  if (!meta) return []
  const chips = []
  if (meta.route_role) chips.push(humanizeTripMetaValue(meta.route_role))
  if (meta.trip_style) chips.push(humanizeTripMetaValue(meta.trip_style))
  if (meta.visit_time) chips.push(humanizeTripMetaValue(meta.visit_time))
  if (meta.spend_level) chips.push(humanizeTripMetaValue(meta.spend_level))
  if (meta.best_for?.length) chips.push(`Best for ${meta.best_for[0]}`)
  return chips
}

const visibleImageIds = ref(new Set())

const isImageVisible = (cardId) => visibleImageIds.value.has(Number(cardId))

const revealImage = (cardId) => {
  const id = Number(cardId)
  if (!Number.isFinite(id) || id <= 0 || visibleImageIds.value.has(id)) return
  visibleImageIds.value = new Set([...visibleImageIds.value, id])
}

const observeImageHost = (el) => {
  if (!el || !imageObserver.value) return
  imageObserver.value.observe(el)
}

const refreshImageObservers = () => {
  if (!imageObserver.value || !contentEl.value) return
  const hosts = contentEl.value.querySelectorAll('.cover[data-card-id], .list-cover[data-card-id]')
  hosts.forEach((el) => imageObserver.value.observe(el))
}

const setupImageObserver = () => {
  if (imageObserver.value) imageObserver.value.disconnect()
  imageObserver.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = Number(entry.target?.dataset?.cardId)
        if (entry.isIntersecting) {
          revealImage(id)
          imageObserver.value?.unobserve(entry.target)
        }
      })
    },
    { root: contentEl.value || null, threshold: 0.01, rootMargin: '100px 0px' }
  )
  refreshImageObservers()
}

const resetFilters = () => {
  activeTab.value = 'Recommended'
  search.value = ''
  onlyPoi.value = false
  structuredOnly.value = false
  minLikes.value = 0
}

const openCreator = (id) => {
  router.push(`/person?userid=${id}`)
}

watch(sort, () => fetchPosts(true))
watch(activeTagParam, () => fetchPosts(true))
watch(structuredOnly, () => fetchPosts(true))
watch(onlyPoi, () => {
  if (posts.value.length) {
    void fetchSpotlightSections()
  }
})
watch(spotlightRouteSignature, () => {
  if (posts.value.length) {
    void fetchSpotlightSections()
  }
})
watch(
  () => route.query.poi_name,
  (name) => {
    if (typeof name === 'string' && name.trim()) search.value = name.trim()
  },
  { immediate: true }
)
watch(
  () => poiFilterId.value,
  () => {
    fetchPosts(true)
  }
)
watch(
  () => viewMode.value,
  (mode) => {
    localStorage.setItem('jp_post_view_mode', mode)
  }
)
watch(
  () => auth.user?.id,
  () => {
    fetchPosts(true)
  }
)

onMounted(() => {
  fetchTags()
  fetchPosts(true)
  setupImageObserver()
  document.addEventListener('scroll', onAnyScroll, { passive: true, capture: true })
  window.addEventListener('scroll', onAnyScroll, { passive: true })
  onAnyScroll()
})

onBeforeUnmount(() => {
  if (tripAttachFlashTimer) {
    clearTimeout(tripAttachFlashTimer)
    tripAttachFlashTimer = null
  }
  document.removeEventListener('scroll', onAnyScroll, true)
  window.removeEventListener('scroll', onAnyScroll)
  if (imageObserver.value) imageObserver.value.disconnect()
})
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 290px 1fr;
  height: calc(100vh - 56px);
  min-height: calc(100vh - 56px);
  overflow: hidden;
  align-items: stretch;
  background:
    radial-gradient(circle at 8% 6%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 30%),
    radial-gradient(circle at 92% 0%, color-mix(in srgb, #8de8ff 8%, transparent), transparent 26%),
    var(--bg-main);
  color: var(--fg);
}

.sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: calc(100vh - 56px);
  overflow-y: auto;
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 82%, transparent);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand {
  font-weight: 900;
  color: var(--fg);
  font-size: 22px;
  padding: 8px 6px;
  letter-spacing: 0.2px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--fg);
  text-decoration: none;
}

.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: var(--btn-primary);
  color: var(--btn-text);
}

.nav-item.muted {
  color: var(--muted);
}

.stats-card,
.creator-card,
.login-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 82%, transparent);
  border-radius: 14px;
  padding: 12px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
}

.stats-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  border-radius: 10px;
  padding: 8px;
  background: color-mix(in srgb, var(--panel) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
}

.stat-label {
  color: var(--muted);
  font-size: 11px;
}

.stat-value {
  font-size: 14px;
  font-weight: 800;
  margin-top: 2px;
}

.creator-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.creator-item {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 65%, transparent);
  color: var(--fg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
}

.creator-item:hover {
  background: color-mix(in srgb, var(--panel) 82%, transparent);
}

.creator-name {
  font-size: 12px;
  font-weight: 600;
}

.creator-count {
  font-size: 11px;
  color: var(--muted);
}

.login-card ul {
  padding-left: 16px;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.content {
  height: calc(100vh - 56px);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 8;
  padding: 10px 12px;
  margin-bottom: 10px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  backdrop-filter: blur(12px);
}

.search-wrap {
  flex: 1;
  max-width: 620px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: var(--panel) !important;
  color: var(--fg) !important;
  border-color: var(--panel-border) !important;
}

:deep(.el-input__inner) {
  color: var(--fg);
}

.top-actions {
  display: flex;
  gap: 8px;
}

.tool-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  background: color-mix(in srgb, var(--panel) 75%, transparent);
  color: var(--fg);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.tool-btn.active {
  background: var(--btn-primary);
  border-color: transparent;
  color: var(--btn-text);
}

.filter-strip {
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  border-radius: 14px;
  padding: 12px;
  background: color-mix(in srgb, var(--panel) 86%, transparent);
  margin-bottom: 12px;
}

.workspace-toast {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, #4f8cff 24%, transparent);
  background: color-mix(in srgb, #4f8cff 10%, var(--panel));
  color: #4f8cff;
  font-size: 13px;
  font-weight: 600;
}

.workspace-toast.error {
  color: #d65a5a;
  border-color: color-mix(in srgb, #d65a5a 28%, transparent);
  background: color-mix(in srgb, #d65a5a 8%, var(--panel));
}

.spotlight-shell {
  display: grid;
  gap: 14px;
  padding: 16px;
  margin-bottom: 14px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, #7ea6ff 8%, var(--panel)) 0%, color-mix(in srgb, var(--panel) 95%, transparent) 48%),
    color-mix(in srgb, var(--panel) 88%, transparent);
}

.spotlight-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.spotlight-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f8cff;
  margin-bottom: 4px;
}

.spotlight-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
}

.spotlight-copy {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.spotlight-pill {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: color-mix(in srgb, #4f8cff 10%, var(--panel));
  border: 1px solid color-mix(in srgb, #4f8cff 36%, transparent);
  color: #4f8cff;
  font-size: 12px;
  font-weight: 700;
}

.spotlight-error {
  color: #d65a5a;
  font-size: 12px;
}

.spotlight-skeleton-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.spotlight-skeleton {
  min-height: 220px;
  border-radius: 18px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--badge) 92%, #fff) 18%,
    color-mix(in srgb, var(--badge) 78%, #fff) 50%,
    color-mix(in srgb, var(--badge) 92%, #fff) 82%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.spotlight-skeleton.hero {
  min-height: 280px;
}

.featured-story {
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 82%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  overflow: hidden;
  cursor: pointer;
}

.featured-story:hover {
  border-color: color-mix(in srgb, #4f8cff 55%, var(--panel-border));
}

.featured-cover {
  position: relative;
  min-height: 260px;
  background: var(--badge);
}

.featured-chip {
  position: absolute;
  left: 14px;
  top: 14px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.featured-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 20px 18px 4px;
}

.featured-title {
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.1;
}

.featured-text {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
}

.featured-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 12px;
}

.featured-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.spotlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.spotlight-lane {
  min-width: 0;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  background: color-mix(in srgb, var(--panel) 82%, transparent);
  padding: 12px;
}

.lane-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.lane-title {
  font-size: 14px;
  font-weight: 800;
}

.lane-copy {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.lane-count {
  flex-shrink: 0;
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 88%, transparent);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--fg);
}

.lane-track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.lane-card {
  min-width: 250px;
  max-width: 260px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  cursor: pointer;
}

.lane-card:hover {
  border-color: color-mix(in srgb, #4f8cff 52%, var(--panel-border));
}

.lane-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--badge);
}

.lane-body {
  padding: 10px;
}

.lane-card-topline {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  margin-bottom: 6px;
}

.lane-card-title {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 1.25;
}

.lane-card-text {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.lane-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chip {
  border: none;
  background: var(--badge);
  padding: 6px 12px;
  border-radius: 14px;
  color: var(--fg);
  cursor: pointer;
  font-size: 12px;
}

.chip.active {
  background: var(--btn-primary);
  color: var(--btn-text);
}

.chip.outline {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: transparent;
}

.toggles {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.likes-filter {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--muted);
}

.feed {
  min-height: 500px;
}

.skeleton-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.skeleton-card {
  height: 270px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--badge) 90%, #fff) 25%,
    color-mix(in srgb, var(--badge) 80%, #fff) 50%,
    color-mix(in srgb, var(--badge) 90%, #fff) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.waterfall {
  column-count: 4;
  column-gap: 16px;
}

.card {
  break-inside: avoid;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.16);
  border-color: color-mix(in srgb, #4f8cff 55%, var(--panel-border));
}

.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--badge);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.img-skeleton {
  position: absolute;
  inset: 0;
  background: var(--badge);
  z-index: 1;
}

.floating-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
}

.card-body {
  padding: 10px 12px 12px;
}

.card-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--fg);
  margin-bottom: 6px;
}

.signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.signal-row.compact {
  margin-bottom: 4px;
}

.signal-pill {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 700;
  color: var(--fg);
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
}

.card-meta {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}

.poi-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 85%, transparent);
  border-radius: 10px;
  padding: 5px 9px;
  background: color-mix(in srgb, var(--badge) 85%, transparent);
  color: var(--fg);
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 8px;
}

.poi-link:hover {
  background: color-mix(in srgb, var(--badge) 95%, transparent);
}

.poi-link.small {
  margin-bottom: 0;
  padding: 4px 8px;
  font-size: 11px;
}

.story-ai-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, #4f8cff 48%, transparent);
  border-radius: 999px;
  padding: 6px 10px;
  background: color-mix(in srgb, #4f8cff 12%, transparent);
  color: #4f8cff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.story-ai-btn.subtle {
  background: color-mix(in srgb, var(--panel) 86%, transparent);
}

.story-ai-btn.mini {
  padding: 5px 9px;
  font-size: 11px;
}

.trip-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--panel-border) 88%, transparent);
  border-radius: 999px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--badge) 88%, transparent);
  color: var(--fg);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.trip-link-btn.small {
  padding: 5px 9px;
  font-size: 11px;
}

.trip-link-btn.subtle {
  background: color-mix(in srgb, var(--panel) 86%, transparent);
}

.trip-link-btn:disabled {
  opacity: 0.68;
  cursor: default;
}

.cluster-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, #4f8cff 10%, var(--panel));
  border: 1px solid color-mix(in srgb, #4f8cff 28%, transparent);
  color: #4f8cff;
  font-size: 11px;
  font-weight: 700;
}

.cluster-note.list {
  margin-bottom: 2px;
}

.card-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 13px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 12px;
  background: var(--badge);
  border: none;
  color: var(--muted);
  cursor: pointer;
}

.icon-btn :deep(.stat-icon) {
  color: color-mix(in srgb, var(--fg) 50%, transparent);
}

.icon-btn :deep(.stat-icon.liked) {
  color: #ff2442;
}

.icon-btn :deep(.stat-icon.fav.active) {
  color: #f5a524;
}

.views {
  margin-left: auto;
  font-size: 12px;
}

.list-view {
  display: grid;
  gap: 12px;
}

.list-card {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.list-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, #4f8cff 55%, var(--panel-border));
}

.list-cover {
  position: relative;
  background: var(--badge);
  min-height: 160px;
  overflow: hidden;
}

.list-body {
  padding: 12px 14px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
}

.list-text {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.list-meta {
  display: flex;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.list-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.list-link-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-group {
  display: inline-flex;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 12px;
  color: var(--muted);
}

.back-top-enter-active,
.back-top-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.back-top-enter-from,
.back-top-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.back-top {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: var(--fg);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  cursor: pointer;
  z-index: 160000;
}

.back-top-icon {
  font-size: 18px;
}

@media (max-width: 1450px) {
  .waterfall { column-count: 3; }
  .spotlight-grid { grid-template-columns: 1fr; }
}

@media (max-width: 1160px) {
  .page { grid-template-columns: 1fr; height: auto; min-height: calc(100vh - 56px); }
  .sidebar { display: none; }
  .content { height: auto; min-height: calc(100vh - 56px); }
  .waterfall { column-count: 2; }
  .list-card { grid-template-columns: 1fr; }
  .list-cover { min-height: 180px; }
  .list-body { padding: 12px; }
  .toggles { grid-template-columns: 1fr; }
  .featured-story { grid-template-columns: 1fr; }
  .featured-body { padding: 14px; }
  .spotlight-skeleton-grid { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .waterfall { column-count: 1; }
  .topbar { flex-direction: column; align-items: stretch; }
  .top-actions { justify-content: flex-start; }
  .spotlight-head { flex-direction: column; }
  .spotlight-title { font-size: 20px; }
  .featured-title { font-size: 22px; }
  .lane-card { min-width: 220px; }
}
</style>
