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
          <div class="likes-filter">
            <span>Min likes {{ minLikes }}</span>
            <el-slider v-model="minLikes" :min="0" :max="120" :show-tooltip="false" />
          </div>
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
              <div class="card-meta">
                <span>{{ card.user?.nickname || 'Guest' }}</span>
                <span v-if="card.tags?.length">&middot; {{ card.tags.slice(0, 2).join(' / ') }}</span>
              </div>

              <button v-if="card.poi?.id" class="poi-link" @click.stop="openPoiFromFeed(card)">
                <el-icon><Location /></el-icon>
                <span>{{ card.poi?.name || 'Linked place' }}</span>
              </button>

              <div class="card-footer">
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
              <p class="list-text">{{ summarize(card.content) }}</p>
              <div class="list-meta">
                <span>{{ card.user?.nickname || 'Guest' }}</span>
                <span>&middot;</span>
                <span>{{ formatTime(card.created_at) }}</span>
              </div>
              <div class="list-actions">
                <button v-if="card.poi?.id" class="poi-link" @click.stop="openPoiFromFeed(card)">
                  <el-icon><Location /></el-icon>
                  <span>{{ card.poi?.name || 'Linked place' }}</span>
                </button>
                <div class="metric-group">
                  <span>{{ card.like_count || 0 }} likes</span>
                  <span>{{ card.favorite_count || 0 }} favs</span>
                  <span>{{ card.view_count || 0 }} views</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div ref="sentinel" class="sentinel" />
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
import CroppedImage from './CroppedImage.vue'
import { proxiedImageSrc } from '../utils/imageProxy'

const API_BASE = 'http://localhost:3001/api/posts'
const auth = useAuthStore()
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
const sentinel = ref(null)
const observer = ref(null)
const imageObserver = ref(null)
const limit = 16
const offset = ref(0)
const likedIds = ref(new Set())
const favIds = ref(new Set())
const onlyPoi = ref(false)
const minLikes = ref(0)
const viewMode = ref(localStorage.getItem('jp_post_view_mode') || 'masonry')
const poiFilterId = computed(() => {
  const raw = route.query.poi_id
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
})
const activeTagParam = computed(() => (activeTab.value === 'Recommended' ? '' : activeTab.value))

const markWithReactions = (list) =>
  list.map((item) => ({
    ...item,
    _liked: likedIds.value.has(item.id),
    _fav: favIds.value.has(item.id),
  }))

const syncReactionsToPosts = () => {
  posts.value = posts.value.map((item) => ({
    ...item,
    _liked: likedIds.value.has(item.id),
    _fav: favIds.value.has(item.id),
  }))
}

const loadReactions = async () => {
  if (!auth.user) {
    likedIds.value = new Set()
    favIds.value = new Set()
    syncReactionsToPosts()
    return
  }
  try {
    const res = await axios.get(`${API_BASE}/reactions/summary`, {
      params: { user_id: auth.user.id, limit: 2000 },
    })
    likedIds.value = new Set((res.data?.data?.liked_ids || []).map((id) => Number(id)).filter(Boolean))
    favIds.value = new Set((res.data?.data?.favorited_ids || []).map((id) => Number(id)).filter(Boolean))
    syncReactionsToPosts()
  } catch {
    likedIds.value = new Set()
    favIds.value = new Set()
    syncReactionsToPosts()
  }
}

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
      noMore.value = false
      loadReactions()
    }
    const res = await axios.get(API_BASE, {
      params: {
        limit,
        offset: offset.value,
        sort: sort.value,
        compact: 1,
        lite: 1,
        tag: activeTagParam.value || undefined,
        poi_id: poiFilterId.value || undefined,
      },
    })
    const list = markWithReactions(res.data?.data || [])
    if (list.length < limit) noMore.value = true
    posts.value = reset ? list : [...posts.value, ...list]
    offset.value += list.length
    await nextTick()
    refreshImageObservers()
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const toggleLike = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (!updated) return
    const liked = !!res.data?.liked
    if (liked) likedIds.value.add(card.id)
    else likedIds.value.delete(card.id)
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
    if (favored) favIds.value.add(card.id)
    else favIds.value.delete(card.id)
    replacePost({ ...updated, _fav: favored, _liked: card._liked })
  } catch {
    // ignore
  }
}

const openDetail = (card) => {
  router.push(`/posts/postsid=${card.id}`)
}

const toFeedImageUrl = (raw) => {
  const url = String(raw || '').trim()
  if (!url) return ''
  const resized = url
    .replace(/loremflickr\.com\/1280\/864\//i, 'loremflickr.com/480/320/')
    .replace(/loremflickr\.com\/640\/432\//i, 'loremflickr.com/480/320/')
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

const contentEl = ref(null)
const showBackTop = ref(false)
const lastScrollEl = ref(null)

const isInContentScope = (el) => {
  const root = contentEl.value
  if (!root) return true
  return el === root || root.contains(el) || el.contains(root)
}

const pickScrollableEl = (el) => {
  if (!(el instanceof HTMLElement)) return null
  if (!isInContentScope(el)) return null
  if (el === document.body || el === document.documentElement) return null
  if (el.scrollHeight <= el.clientHeight + 2) return null
  return el
}

const getDocumentScrollTop = () =>
  window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0

const getActiveScrollTop = () => {
  const active = pickScrollableEl(lastScrollEl.value) || pickScrollableEl(contentEl.value)
  return active ? active.scrollTop : getDocumentScrollTop()
}

const onAnyScroll = (e) => {
  const targetEl = pickScrollableEl(e?.target)
  if (targetEl) lastScrollEl.value = targetEl
  showBackTop.value = getActiveScrollTop() > 360
}

const scrollToTop = () => {
  const active = pickScrollableEl(lastScrollEl.value) || pickScrollableEl(contentEl.value)
  if (active) {
    active.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
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

const filteredPosts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return posts.value.filter((p) => {
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
      p.user?.nickname?.toLowerCase().includes(kw)
    const inPoiToggle = onlyPoi.value ? !!p.poi_id : true
    const inLikes = (Number(p.like_count) || 0) >= minLikes.value
    return inPoi && inTab && inKw && inPoiToggle && inLikes
  })
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

const markLoaded = (card) => {
  loadedMap.value = { ...loadedMap.value, [card.id]: true }
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

const setupInfiniteScroll = () => {
  if (observer.value) observer.value.disconnect()
  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !noMore.value) {
          fetchPosts()
        }
      })
    },
    { root: contentEl.value || null, threshold: 0.01, rootMargin: '900px 0px' }
  )
  if (sentinel.value) observer.value.observe(sentinel.value)
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
    { root: contentEl.value || null, threshold: 0.01, rootMargin: '280px 0px' }
  )
  refreshImageObservers()
}

const resetFilters = () => {
  activeTab.value = 'Recommended'
  search.value = ''
  onlyPoi.value = false
  minLikes.value = 0
}

const openCreator = (id) => {
  router.push(`/person?userid=${id}`)
}

watch(sort, () => fetchPosts(true))
watch(activeTagParam, () => fetchPosts(true))
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

onMounted(() => {
  fetchTags()
  fetchPosts(true)
  setupInfiniteScroll()
  setupImageObserver()
  document.addEventListener('scroll', onAnyScroll, { passive: true, capture: true })
  window.addEventListener('scroll', onAnyScroll, { passive: true })
  onAnyScroll()
})

onBeforeUnmount(() => {
  document.removeEventListener('scroll', onAnyScroll, true)
  window.removeEventListener('scroll', onAnyScroll)
  if (observer.value) observer.value.disconnect()
  if (imageObserver.value) imageObserver.value.disconnect()
})
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 290px 1fr;
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(circle at 8% 6%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 30%),
    radial-gradient(circle at 92% 0%, color-mix(in srgb, #8de8ff 8%, transparent), transparent 26%),
    var(--bg-main);
  color: var(--fg);
}

.sidebar {
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
  overflow-y: auto;
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

.card-footer {
  display: flex;
  align-items: center;
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
}

.metric-group {
  display: inline-flex;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

.sentinel {
  height: 1px;
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
}

@media (max-width: 1160px) {
  .page { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .waterfall { column-count: 2; }
  .list-card { grid-template-columns: 1fr; }
  .list-cover { min-height: 180px; }
  .list-body { padding: 12px; }
  .toggles { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .waterfall { column-count: 1; }
  .topbar { flex-direction: column; align-items: stretch; }
  .top-actions { justify-content: flex-start; }
}
</style>
