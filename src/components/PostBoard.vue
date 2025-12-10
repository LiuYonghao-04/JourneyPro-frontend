<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item active">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <RouterLink to="/notifications" class="nav-item">Notifications</RouterLink>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </div>
      <div v-if="!auth.user" class="login-card">
        <el-button type="primary" class="w-full" @click="$router.push('/login')">Login / Publish</el-button>
        <ul>
          <li>See content tailored for you</li>
          <li>Keep your favorites and likes</li>
          <li>Comment and follow creators</li>
        </ul>
      </div>
    </aside>

    <main class="content">
      <header class="topbar">
        <div class="search">
          <el-input v-model="search" placeholder="Search what you love" clearable @input="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="top-actions">
<!--          <el-button text>Creator</el-button>-->
<!--          <el-button text>Business</el-button>-->
        </div>
      </header>

      <section class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="chip"
          :class="{ active: activeTab === tab }"
          @click="setTab(tab)"
        >
          {{ tab }}
        </button>
        <button class="chip outline" @click="switchSort">
          {{ sort === 'latest' ? 'Latest' : 'Hot' }}
        </button>
      </section>

      <section class="feed">
        <div v-if="loading && posts.length === 0" class="skeleton-list">
          <div v-for="n in 6" :key="n" class="skeleton-card" />
        </div>

        <div v-else-if="!loading && filteredPosts.length === 0" class="empty">
          <div>No posts yet. Publish one?</div>
          <el-button type="primary" @click="$router.push('/posts/publish')">Create</el-button>
        </div>

        <div v-else class="waterfall">
          <div
            v-for="card in filteredPosts"
            :key="card._dupKey || card.id"
            class="card"
            @click="openDetail(card)"
          >
            <div class="cover" v-if="card.cover_image || (card.images && card.images[0])">
              <div v-if="!loadedMap[card._dupKey || card.id]" class="img-skeleton" />
              <img
                :src="card.cover_image || card.images?.[0]"
                :alt="card.title"
                loading="lazy"
                @load="markLoaded(card)"
              />
              <div class="floating-tag" v-if="card.tags?.length">{{ card.tags[0] }}</div>
            </div>
            <div class="card-body">
              <div class="card-title">{{ card.title }}</div>
              <div class="card-meta">
                <span>{{ card.user?.nickname || 'Guest' }}</span>
                <span v-if="card.tags?.length"> · {{ card.tags.slice(0, 2).join(' / ') }}</span>
              </div>
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
              </div>
            </div>
          </div>
        </div>

        <div ref="sentinel" class="sentinel" />
        <div v-if="loading && posts.length > 0" class="skeleton-more">
          <div v-for="n in 3" :key="n" class="skeleton-card small" />
        </div>
        <div v-if="noMore" class="no-more">End of feed · keep scrolling to loop</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { Search, CircleCheck, CircleCheckFilled, Star, StarFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const auth = useAuthStore()

const tabs = ref(['Recommended'])
const activeTab = ref('Recommended')
const sort = ref('latest')
const search = ref('')
const posts = ref([])
const basePosts = ref([])
const loadedMap = ref({})
const loading = ref(false)
const noMore = ref(false)
const sentinel = ref(null)
const limit = 20
const offset = ref(0)
const dupRounds = ref(0)
const likedIds = ref(new Set())
const favIds = ref(new Set())

const markWithReactions = (list) =>
  list.map((item) => ({
    ...item,
    _liked: likedIds.value.has(item.id),
    _fav: favIds.value.has(item.id),
  }))

const loadReactions = async () => {
  if (!auth.user) {
    likedIds.value = new Set()
    favIds.value = new Set()
    return
  }
  try {
    const [likedRes, favRes] = await Promise.all([
      axios.get(API_BASE, { params: { liked_by: auth.user.id, limit: 200 } }),
      axios.get(API_BASE, { params: { favorited_by: auth.user.id, limit: 200 } }),
    ])
    likedIds.value = new Set((likedRes.data?.data || []).map((p) => p.id))
    favIds.value = new Set((favRes.data?.data || []).map((p) => p.id))
  } catch (e) {
    // ignore
  }
}

const fetchTags = async () => {
  try {
    const res = await axios.get(`${API_BASE}/tags/list`)
    const names = res.data?.data?.map((t) => t.name).filter(Boolean) || []
    const uniq = Array.from(new Set(names))
    tabs.value = ['Recommended', ...uniq]
  } catch (e) {
    // ignore
  }
}

const fetchPosts = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    if (reset) {
      posts.value = []
      basePosts.value = []
      loadedMap.value = {}
      offset.value = 0
      noMore.value = false
      dupRounds.value = 0
      await loadReactions()
    }
    const res = await axios.get(API_BASE, {
      params: { limit, offset: offset.value, sort: sort.value },
    })
    const list = markWithReactions(res.data?.data || [])
    if (list.length < limit) noMore.value = true
    posts.value = reset ? list : [...posts.value, ...list]
    if (basePosts.value.length === 0 && list.length > 0) {
      basePosts.value = list
    }
    offset.value += list.length
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
  }
}

const toggleLike = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (updated) {
      updated._liked = res.data?.liked
      replacePost(updated)
    }
  } catch (e) {
    // ignore
  }
}

const toggleFav = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/favorite`, { user_id: auth.user?.id })
    const updated = res.data?.data
    const favorited = res.data?.favorited
    if (updated) {
      updated._fav = favorited
      replacePost(updated)
    } else {
      card._fav = favorited
      card.favorite_count = (card.favorite_count || 0) + (favorited ? 1 : -1)
      replacePost(card)
    }
  } catch (e) {
    // ignore
  }
}

const openDetail = (card) => {
  window.location.href = `/posts/postsid=${card.id}`
}

const replacePost = (updated) => {
  const idx = posts.value.findIndex((p) => p.id === updated.id)
  if (idx > -1) posts.value[idx] = { ...posts.value[idx], ...updated }
}

const setTab = (tab) => {
  activeTab.value = tab
}

const switchSort = () => {
  sort.value = sort.value === 'latest' ? 'hot' : 'latest'
  fetchPosts(true)
}

const handleSearch = () => {
  // computed handles filtering
}

const filteredPosts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return posts.value.filter((p) => {
    const inTab = activeTab.value === 'Recommended' ? true : (p.tags || []).includes(activeTab.value)
    const inKw =
      !kw ||
      p.title?.toLowerCase().includes(kw) ||
      p.content?.toLowerCase().includes(kw) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(kw))
    return inTab && inKw
  })
})

const appendDuplicateBatch = () => {
  if (basePosts.value.length === 0) return
  dupRounds.value += 1
  const round = dupRounds.value
  const duplicated = basePosts.value.map((p, idx) => ({
    ...p,
    _dupKey: `${p.id}-dup-${round}-${idx}`,
  }))
  posts.value = [...posts.value, ...duplicated]
}

const setupInfiniteScroll = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !noMore.value) {
          fetchPosts()
        } else if (entry.isIntersecting && noMore.value) {
          appendDuplicateBatch()
        }
      })
    },
    { root: null, threshold: 0.1 }
  )
  if (sentinel.value) observer.observe(sentinel.value)
}

watch(sort, () => fetchPosts(true))

onMounted(() => {
  fetchTags()
  fetchPosts(true)
  setupInfiniteScroll()
})

const markLoaded = (card) => {
  const key = card._dupKey || card.id
  loadedMap.value = { ...loadedMap.value, [key]: true }
}
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #f5f6f7;
}
.sidebar {
  background: #fff;
  border-right: 1px solid #ececec;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.logo {
  font-weight: 800;
  color: #111;
  font-size: 20px;
  padding: 8px 6px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nav-item {
  padding: 10px 12px;
  border-radius: 12px;
  color: #444;
  text-decoration: none;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: #f2f3f5;
}
.nav-item.muted {
  color: #999;
}
.login-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
  background: #fafafa;
}
.login-card ul {
  padding-left: 16px;
  margin: 8px 0 0;
  color: #777;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.content {
  overflow-y: auto;
  padding: 12px 18px 24px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 0 8px;
}
.search {
  flex: 1;
  max-width: 520px;
}
.top-actions {
  display: flex;
  gap: 8px;
}
.tabs {
  display: flex;
  gap: 10px;
  padding: 10px 0 6px;
  flex-wrap: wrap;
}
.chip {
  border: none;
  background: #f1f2f6;
  padding: 8px 14px;
  border-radius: 16px;
  color: #444;
  cursor: pointer;
}
.chip.active {
  background: #111;
  color: #fff;
}
.chip.outline {
  background: transparent;
  border: 1px solid #d0d0d0;
}
.feed {
  min-height: 400px;
}
.skeleton-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.skeleton-card {
  height: 260px;
  border-radius: 16px;
  background: linear-gradient(90deg, #f1f2f3 25%, #e5e7eb 50%, #f1f2f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-card.small {
  height: 140px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.empty {
  text-align: center;
  padding: 60px 0;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.waterfall {
  column-count: 4;
  column-gap: 16px;
}
@media (max-width: 1400px) {
  .waterfall {
    column-count: 3;
  }
}
@media (max-width: 1100px) {
  .waterfall {
    column-count: 2;
  }
}
@media (max-width: 780px) {
  .page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .waterfall {
    column-count: 1;
  }
}
.card {
  break-inside: avoid;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f1f1;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
}
.cover {
  position: relative;
  width: 100%;
  min-height: 240px;
  background: #f6f7f9;
}
.cover img {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: block;
  object-fit: cover;
}
.img-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f1f2f3 25%, #e5e7eb 50%, #f1f2f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.img-skeleton {
  position: absolute;
  inset: 0;
  background: #f2f2f2;
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
  color: #111;
  margin-bottom: 6px;
}
.card-meta {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}
.card-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  font-size: 13px;
  color: #555;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 12px;
  background: #f8f8f8;
  border: none;
  cursor: pointer;
}
.icon-btn :deep(.stat-icon) {
  color: #b5b5b5;
}
.icon-btn :deep(.stat-icon.liked) {
  color: #ff2442;
}
.icon-btn :deep(.stat-icon.fav.active) {
  color: #f5a524;
}
.loading-more,
.no-more {
  text-align: center;
  padding: 12px;
  color: #777;
}
.sentinel {
  height: 1px;
}
</style>
