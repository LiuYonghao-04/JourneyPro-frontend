<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">小红书</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item">发现</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">发布</RouterLink>
        <div class="nav-item muted">通知</div>
        <div class="nav-item active">我</div>
      </div>
    </aside>

    <main class="content">
      <header class="profile">
        <div class="avatar-wrap">
          <img :src="userAvatar" alt="avatar" />
        </div>
        <div class="info">
          <h2>{{ userName }}</h2>
          <div class="meta">
            <span>{{ userIdLabel }}</span>
          </div>
          <div class="stats">
            <span>{{ posts.length }} 笔记</span>
            <span>{{ favs.length }} 收藏</span>
            <span>{{ likes.length }} 点赞</span>
          </div>
        </div>
      </header>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">笔记</button>
        <button class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">收藏</button>
        <button class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">点赞</button>
      </div>

      <section class="grid">
        <div v-if="currentList.length === 0" class="empty">
          <div class="empty-icon">🌥️</div>
          <p>你还没有发布任何内容哦~</p>
        </div>
        <div v-else class="cards">
          <div v-for="card in currentList" :key="card._dupKey || card.id" class="card">
            <div class="cover" v-if="card.cover_image || (card.images && card.images[0])">
              <img :src="card.cover_image || card.images?.[0]" loading="lazy" />
            </div>
            <div class="card-title">{{ card.title }}</div>
            <div class="card-meta">
              ❤️ {{ card.like_count || 0 }} · 📌 {{ card.favorite_count || 0 }}
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const route = useRoute()
const auth = useAuthStore()
const userId = computed(() => route.query.userid || auth.user?.id)
const posts = ref([])
const favs = ref([])
const likes = ref([])
const tab = ref('posts')

const fetchData = async () => {
  const uid = userId.value
  if (!uid) return
  const [p, f, l] = await Promise.all([
    axios.get(API_BASE, { params: { user_id: uid, limit: 50 } }).then((r) => r.data?.data || []),
    axios
      .get(API_BASE, { params: { favorited_by: uid, limit: 50 } })
      .then((r) => r.data?.data || []),
    axios.get(API_BASE, { params: { liked_by: uid, limit: 50 } }).then((r) => r.data?.data || []),
  ])
  posts.value = p
  favs.value = f
  likes.value = l
}

const userName = computed(() => auth.user?.nickname || '旅人')
const userAvatar = computed(() => auth.user?.avatar_url || 'https://placehold.co/120x120')
const userIdLabel = computed(() => `用户ID：${userId.value || '未登录'}`)
const currentList = computed(() =>
  tab.value === 'posts' ? posts.value : tab.value === 'favs' ? favs.value : likes.value
)

onMounted(fetchData)
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100%;
  background: #fafafa;
}
.sidebar {
  background: #fff;
  border-right: 1px solid #f0f0f0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.logo {
  color: #ff2442;
  font-weight: 800;
  font-size: 20px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: #444;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: #f5f5f5;
}
.nav-item.muted {
  color: #999;
}

.content {
  overflow-y: auto;
  padding: 24px 28px;
}
.profile {
  display: flex;
  gap: 16px;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}
.avatar-wrap {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: #f1f1f1;
}
.avatar-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info h2 {
  margin: 0 0 6px;
}
.meta,
.stats {
  color: #777;
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.tabs {
  margin-top: 18px;
  display: flex;
  gap: 12px;
}
.tab {
  border: none;
  padding: 10px 16px;
  border-radius: 20px;
  background: #f1f2f6;
  cursor: pointer;
}
.tab.active {
  background: #111;
  color: #fff;
}

.grid {
  margin-top: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  min-height: 400px;
}
.empty {
  text-align: center;
  color: #777;
  padding: 60px 0;
}
.empty-icon {
  font-size: 28px;
  margin-bottom: 10px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.card {
  background: #f9f9f9;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eee;
}
.card .cover img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}
.card-title {
  font-weight: 700;
  padding: 8px 10px 4px;
}
.card-meta {
  padding: 0 10px 10px;
  font-size: 12px;
  color: #666;
}
</style>
