<template>
  <div class="admin-page">
    <aside class="admin-rail">
      <div class="rail-brand">Admin</div>
      <RouterLink to="/home" class="rail-link">Overview</RouterLink>
      <RouterLink to="/posts" class="rail-link">Community</RouterLink>
      <RouterLink to="/map" class="rail-link">Map</RouterLink>
      <RouterLink to="/person" class="rail-link">Profile</RouterLink>
      <div class="rail-note">
        <div>Viewer</div>
        <strong>{{ auth.user?.nickname || 'Admin' }}</strong>
        <span>{{ auth.user?.username || 'test' }}</span>
      </div>
    </aside>

    <main class="admin-main">
      <header class="hero">
        <div>
          <div class="eyebrow">Platform control</div>
          <h1>Operations dashboard</h1>
          <p>High-level system volume, recent activity, and current engagement leaders.</p>
        </div>
        <button class="refresh-btn" type="button" :disabled="loading" @click="fetchOverview">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <section v-if="error" class="error-card">
        <strong>Failed to load admin metrics.</strong>
        <span>{{ error }}</span>
      </section>

      <template v-else>
        <section class="card-grid">
          <article v-for="card in totalCards" :key="card.label" class="metric-card">
            <span>{{ card.label }}</span>
            <strong>{{ formatNumber(card.value) }}</strong>
          </article>
        </section>

        <section class="panel-grid">
          <article class="panel">
            <div class="panel-head">
              <h2>Last 24 hours</h2>
              <span>{{ formatNumber(recent.active_creators_30d) }} active creators / 30d</span>
            </div>
            <div class="recent-list">
              <div v-for="item in recentCards" :key="item.label" class="recent-item">
                <span>{{ item.label }}</span>
                <strong>{{ formatNumber(item.value) }}</strong>
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Top posts</h2>
              <span>Highest engagement blend</span>
            </div>
            <div v-if="topPosts.length" class="list">
              <button v-for="post in topPosts" :key="post.id" class="list-item" type="button" @click="openPost(post.id)">
                <div>
                  <strong>{{ post.title }}</strong>
                  <span>{{ post.nickname || 'Traveler' }}</span>
                </div>
                <div class="list-metrics">
                  <span>{{ formatNumber(post.like_count) }} likes</span>
                  <span>{{ formatNumber(post.favorite_count) }} favs</span>
                  <span>{{ formatNumber(post.view_count) }} views</span>
                </div>
              </button>
            </div>
            <div v-else class="empty">No post metrics yet.</div>
          </article>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Active users</h2>
            <span>Current follower reach</span>
          </div>
          <div v-if="activeUsers.length" class="list compact">
            <div v-for="user in activeUsers" :key="user.id" class="list-item static">
              <div>
                <strong>{{ user.nickname || `User ${user.id}` }}</strong>
                <span>ID {{ user.id }}</span>
              </div>
              <div class="user-stats">
                <span>{{ formatNumber(user.follower_count) }} followers</span>
                <span v-if="Number(user.post_count) > 0">{{ formatNumber(user.post_count) }} posts</span>
                <span v-if="Number(user.comment_count) > 0">{{ formatNumber(user.comment_count) }} comments</span>
                <span v-if="Number(user.like_count) > 0">{{ formatNumber(user.like_count) }} likes</span>
                <span class="score">score {{ Math.round(user.activity_score || 0) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty">No user activity available.</div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../store/authStore'
import { apiUrl } from '../config/api'

const auth = useAuthStore()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const overview = ref({
  totals: {},
  recent: {},
  top_posts: [],
  active_users: [],
})

const totals = computed(() => overview.value?.totals || {})
const recent = computed(() => overview.value?.recent || {})
const topPosts = computed(() => overview.value?.top_posts || [])
const activeUsers = computed(() => overview.value?.active_users || [])

const totalCards = computed(() => [
  { label: 'Posts', value: totals.value.posts || 0 },
  { label: 'POIs', value: totals.value.pois || 0 },
  { label: 'Users', value: totals.value.users || 0 },
  { label: 'Comments', value: totals.value.comments || 0 },
  { label: 'Likes', value: totals.value.likes || 0 },
  { label: 'Favorites', value: totals.value.favorites || 0 },
  { label: 'Follows', value: totals.value.follows || 0 },
])

const recentCards = computed(() => [
  { label: 'Posts published', value: recent.value.posts_24h || 0 },
  { label: 'Active creators', value: recent.value.active_creators_30d || 0 },
  { label: 'Avg likes / post', value: recent.value.avg_likes_per_post || 0 },
  { label: 'Avg favorites / post', value: recent.value.avg_favorites_per_post || 0 },
  { label: 'POI linked rate %', value: recent.value.poi_link_rate || 0 },
])

const formatNumber = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString() : '0'
}

const openPost = (id) => {
  if (!id) return
  router.push(`/posts/postsid=${id}`)
}

const fetchOverview = async () => {
  if (!auth.user?.id) return
  loading.value = true
  error.value = ''
  try {
    const url = `${apiUrl('/api/admin/overview')}?user_id=${encodeURIComponent(auth.user.id)}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Request failed')
    }
    overview.value = data.data || { totals: {}, recent: {}, top_posts: [], active_users: [] }
  } catch (err) {
    error.value = err?.message || 'Request failed'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOverview()
})
</script>

<style scoped>
.admin-page {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 8% 4%, color-mix(in srgb, #6f9bff 14%, transparent), transparent 30%),
    radial-gradient(circle at 100% 0%, color-mix(in srgb, #79ddff 14%, transparent), transparent 30%),
    var(--bg-main);
}

.admin-rail {
  padding: 18px 14px;
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rail-brand {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 8px;
}

.rail-link {
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--fg);
  text-decoration: none;
  background: color-mix(in srgb, var(--badge) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
}

.rail-link:hover {
  background: color-mix(in srgb, var(--panel) 88%, transparent);
}

.rail-note {
  margin-top: auto;
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--panel) 90%, transparent), color-mix(in srgb, #1677ff 10%, transparent));
}

.rail-note div,
.rail-note span {
  color: var(--muted);
  font-size: 12px;
}

.admin-main {
  padding: 22px;
  overflow-y: auto;
  display: grid;
  gap: 16px;
}

.hero,
.panel,
.error-card {
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.hero {
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #3b82f6;
  margin-bottom: 8px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 40px;
  line-height: 1;
}

.hero p {
  margin: 0;
  color: var(--muted);
  max-width: 680px;
}

.refresh-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: var(--btn-primary);
  color: var(--btn-text);
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.metric-card {
  border-radius: 18px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--panel) 92%, transparent), color-mix(in srgb, var(--badge) 78%, transparent));
  display: grid;
  gap: 8px;
}

.metric-card span,
.recent-item span,
.list-item span {
  color: var(--muted);
}

.metric-card strong {
  font-size: 28px;
}

.panel-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.panel,
.error-card {
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.panel-head span {
  color: var(--muted);
  font-size: 13px;
}

.recent-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.recent-item {
  border-radius: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  display: grid;
  gap: 8px;
}

.recent-item strong {
  font-size: 22px;
}

.list {
  display: grid;
  gap: 10px;
}

.list-item {
  width: 100%;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  color: var(--fg);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}

.list-item.static {
  cursor: default;
}

.list-item strong {
  display: block;
  margin-bottom: 4px;
}

.list-metrics,
.user-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
}

.score {
  color: #3b82f6;
  font-weight: 700;
}

.empty,
.error-card span {
  color: var(--muted);
}

@media (max-width: 1080px) {
  .admin-page {
    grid-template-columns: 1fr;
  }

  .admin-rail {
    display: none;
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
