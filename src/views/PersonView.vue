<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <RouterLink to="/notifications" class="nav-item">Notifications</RouterLink>
        <RouterLink to="/person" class="nav-item active">Me</RouterLink>
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
            {{ userIdLabel }}
            <span class="link" @click="openFollowers">Followers: {{ followerCount }}</span>
          </div>
          <div class="stats">
            <span> posts:{{ posts.length }}</span>
            <span>favorites:{{ favs.length }} </span>
            <span>likes:{{ likes.length }} </span>
<!--            <span class="link" @click="openFollowers">Followers {{ followerCount }}</span>-->
          </div>
        </div>
      </header>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
        <button class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">Favorites</button>
        <button class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">Likes</button>
      </div>

      <section class="grid">
        <div v-if="currentList.length === 0" class="empty">
          <div class="empty-icon">🌱</div>
          <p>No content yet.</p>
        </div>
        <div v-else class="cards">
          <div
            v-for="card in currentList"
            :key="card._dupKey || card.id"
            class="card"
            @click="goDetail(card.id)"
          >
            <div class="cover" v-if="card.cover_image || card.images?.[0]">
              <img :src="card.cover_image || card.images?.[0]" loading="lazy" />
            </div>
            <div class="card-title">{{ card.title }}</div>
            <div class="card-meta">
              <el-icon :class="['stat-icon', { liked: card._liked }]">
                <component :is="card._liked ? CircleCheckFilled : CircleCheck" />
              </el-icon>
              <span>{{ card.like_count || 0 }}</span>
              <span class="dot">·</span>
              <el-icon :class="['stat-icon', 'fav', { active: card._fav }]">
                <component :is="card._fav ? StarFilled : Star" />
              </el-icon>
              <span>{{ card.favorite_count || 0 }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <el-dialog v-model="followerDialog" title="Followers" width="360px">
    <div class="followers-list" v-if="followers.length">
      <div v-for="f in followers" :key="f.id" class="follower-item">
        <img :src="f.avatar_url || 'https://placehold.co/80x80'" class="follower-avatar" />
        <div>
          <div class="follower-name">{{ f.nickname || 'Traveler' }}</div>
          <div class="follower-meta">ID: {{ f.user_id }}</div>
        </div>
      </div>
    </div>
    <div v-else>None yet.</div>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { CircleCheck, CircleCheckFilled, Star, StarFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const FOLLOW_API = 'http://localhost:3001/api/follow'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userId = computed(() => route.query.userid || auth.user?.id)
const posts = ref([])
const favs = ref([])
const likes = ref([])
const tab = ref('posts')
const followers = ref([])
const followerDialog = ref(false)

const fetchData = async () => {
  const uid = userId.value
  if (!uid) return
  const [p, f, l] = await Promise.all([
    axios.get(API_BASE, { params: { user_id: uid, limit: 50 } }).then((r) => r.data?.data || []),
    axios.get(API_BASE, { params: { favorited_by: uid, limit: 50 } }).then((r) => r.data?.data || []),
    axios.get(API_BASE, { params: { liked_by: uid, limit: 50 } }).then((r) => r.data?.data || []),
  ])
  const likedSet = new Set(l.map((i) => i.id))
  const favSet = new Set(f.map((i) => i.id))
  posts.value = p.map((item) => ({ ...item, _fav: favSet.has(item.id), _liked: likedSet.has(item.id) }))
  favs.value = f.map((item) => ({ ...item, _fav: true }))
  likes.value = l.map((item) => ({ ...item, _liked: true }))
  await fetchFollowers()
}

const goDetail = (id) => {
  router.push(`/posts/postsid=${id}`)
}

const userName = computed(() => auth.user?.nickname || 'Traveler')
const userAvatar = computed(() => auth.user?.avatar_url || 'https://placehold.co/120x120')
const userIdLabel = computed(() => `User ID: ${userId.value || 'guest'}`)
const currentList = computed(() =>
  tab.value === 'posts' ? posts.value : tab.value === 'favs' ? favs.value : likes.value
)
const followerCount = computed(() => followers.value.length)

const fetchFollowers = async () => {
  const uid = userId.value
  if (!uid) {
    followers.value = []
    return
  }
  try {
    const res = await axios.get(`${FOLLOW_API}/followers`, { params: { target_id: uid } })
    followers.value = res.data?.data || []
  } catch (e) {
    followers.value = []
  }
}

const openFollowers = () => {
  followerDialog.value = true
}

onMounted(fetchData)
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #fafafa;
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
  color: #111;
  font-weight: 800;
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
  text-decoration: none;
  color: #444;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: #f2f3f5;
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
  gap: 15px;
  font-size: 13px;
}
.meta .link {
  color: #1677ff;
  cursor: pointer;
}
.meta .link:hover {
  text-decoration: underline;
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
  cursor: pointer;
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
  display: flex;
  gap: 6px;
  align-items: center;
}
.stat-icon {
  color: #aaa;
}
.stat-icon.liked {
  color: #ff2442;
}
.stat-icon.fav.active {
  color: #f5a524;
}
.dot {
  color: #bbb;
}
.followers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.follower-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.follower-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f3f3;
}
.follower-name {
  font-weight: 600;
}
.follower-meta {
  font-size: 12px;
  color: #666;
}
</style>
