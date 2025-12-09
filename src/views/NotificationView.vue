<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <nav class="nav">
        <RouterLink to="/posts" class="nav-item">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <div class="nav-item active">Notifications</div>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </nav>
    </aside>

    <main class="content">
      <header class="top">
        <h2>Notifications</h2>
        <div class="hint">Likes · Favorites · Comments</div>
      </header>

      <section v-if="!auth.user" class="empty">
        <p>Please login to view your notifications.</p>
        <el-button type="primary" @click="$router.push('/login')">Login</el-button>
      </section>

      <section v-else class="list" v-loading="loading">
        <div class="filter">
          <el-button
            v-for="c in categories"
            :key="c.key"
            size="small"
            :type="activeType === c.key ? 'primary' : 'default'"
            @click="switchType(c.key)"
          >
            {{ c.label }}<span v-if="countMap[c.key]"> ({{ countMap[c.key] }})</span>
          </el-button>
        </div>
        <div v-if="filteredItems.length === 0" class="empty">
          <p>No notifications yet.</p>
        </div>
        <div v-else>
          <div v-for="(item, idx) in filteredItems" :key="idx" class="card">
            <div class="avatar">
              <img :src="item.avatar_url || placeholder" />
            </div>
            <div class="body">
              <div class="row">
                <span class="name">{{ item.nickname || 'Someone' }}</span>
                <span class="action" :class="item.type">{{ label(item.type) }}</span>
                <RouterLink v-if="item.post_id" class="post" :to="`/posts/postsid=${item.post_id}`">
                  {{ item.title }}
                </RouterLink>
                <span v-else class="post">you</span>
              </div>
              <div v-if="item.content" class="content">{{ item.content }}</div>
              <div class="time">{{ formatTime(item.created_at) }}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/notifications'
const auth = useAuthStore()
const items = ref([])
const loading = ref(false)
const placeholder = 'https://placehold.co/80x80'
let es = null
const route = useRoute()
const router = useRouter()
const categories = [
  { key: 'all', label: 'All' },
  { key: 'like', label: 'Likes' },
  { key: 'favorite', label: 'Favorites' },
  { key: 'comment', label: 'Comments' },
  { key: 'follow', label: 'Follows' },
]
const activeType = ref('all')
const filteredItems = computed(() =>
  activeType.value === 'all' ? items.value : items.value.filter((it) => it.type === activeType.value)
)
const countMap = computed(() => {
  const m = { all: items.value.length }
  items.value.forEach((it) => {
    m[it.type] = (m[it.type] || 0) + 1
  })
  return m
})

const fetchData = async () => {
  if (!auth.user) return
  loading.value = true
  try {
    const res = await axios.get(API_BASE, { params: { user_id: auth.user.id } })
    items.value = res.data?.data || []
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

const setupStream = () => {
  if (!auth.user) return
  if (es) es.close()
  es = new EventSource(`${API_BASE}/stream?user_id=${auth.user.id}`)
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      if (data.connected) return
      items.value = [data, ...items.value].slice(0, 100)
    } catch (e) {
      // ignore parse errors
    }
  }
  es.onerror = () => {
    es?.close()
    es = null
  }
}

const formatTime = (ts) => (ts ? new Date(ts).toLocaleString() : '')
const label = (type) => {
  if (type === 'like') return 'liked your post'
  if (type === 'favorite') return 'favorited your post'
  if (type === 'comment') return 'commented on your post'
  if (type === 'follow') return 'followed you'
  return 'activity'
}

onMounted(() => {
  fetchData()
  setupStream()
})
onUnmounted(() => {
  es?.close()
})

watch(
  () => auth.user?.id,
  () => {
    fetchData()
    setupStream()
  }
)

watch(
  () => route.params.type,
  (val) => {
    activeType.value = (val || 'all')
  },
  { immediate: true }
)

const switchType = (key) => {
  router.push(key === 'all' ? '/notifications' : `/notifications/${key}`)
}
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #f5f6f8;
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
  cursor: pointer;
  color: #4b4b4b;
  text-decoration: none;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: #f4f5f7;
}
.nav-item.muted {
  color: #999;
}
.content {
  padding: 18px 20px;
  overflow-y: auto;
}
.top {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.hint {
  color: #777;
  font-size: 13px;
}
.list {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  min-height: 200px;
}
.card {
  display: flex;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.card:last-child {
  border-bottom: none;
}
.avatar img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  background: #f2f2f2;
}
.body {
  flex: 1;
}
.row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.name {
  font-weight: 700;
}
.action {
  color: #555;
}
.action.like {
  color: #ff2442;
}
.action.favorite {
  color: #f5a524;
}
.action.comment {
  color: #1677ff;
}
.post {
  color: #1677ff;
}
.badge {
  background: #f1f3f5;
  color: #555;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}
.content {
  margin: 4px 0;
  color: #333;
}
.time {
  color: #888;
  font-size: 12px;
}
.empty {
  text-align: center;
  color: #666;
  padding: 40px 0;
}
@media (max-width: 780px) {
  .page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
}
</style>
