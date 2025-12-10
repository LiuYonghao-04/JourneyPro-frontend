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
        <div class="avatar-wrap" @click="isSelf && openAvatarDialog()">
          <img :src="displayAvatar" alt="avatar" />
          <div v-if="isSelf" class="avatar-mask">Change</div>
        </div>
        <div class="info">
          <h2>{{ displayUserName }}</h2>
          <div class="meta">
            {{ userIdLabel }}
            <span class="link" :class="{ inert: !isSelf }" @click="isSelf ? openFollowers() : null">
              Followers: {{ followerCount }}
            </span>
          </div>
          <div class="stats">
            <span> posts:{{ posts.length }}</span>
            <span v-if="isSelf">favorites:{{ favs.length }} </span>
            <span v-if="isSelf">likes:{{ likes.length }} </span>
          </div>
        </div>
      </header>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
        <button v-if="isSelf" class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">Favorites</button>
        <button v-if="isSelf" class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">Likes</button>
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
              <div v-if="!loadedMap[coverKey(card)]" class="img-skeleton" />
              <img
                :src="card.cover_image || card.images?.[0]"
                loading="lazy"
                @load="markLoaded(card)"
              />
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

  <el-dialog v-model="avatarDialog" title="Update Avatar" width="420px">
    <div class="avatar-edit">
      <el-input v-model="avatarInput" placeholder="https://..."></el-input>
      <div class="avatar-actions">
        <el-button size="small" @click="randomAvatar">Random</el-button>
        <el-button type="primary" size="small" @click="saveAvatar">Save</el-button>
      </div>
      <div class="avatar-preview">
        <img :src="avatarInput || displayAvatar" alt="preview" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { CircleCheck, CircleCheckFilled, Star, StarFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const FOLLOW_API = 'http://localhost:3001/api/follow'
const AUTH_API = 'http://localhost:3001/api/auth'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userId = computed(() => route.query.userid || auth.user?.id)
const isSelf = computed(() => String(userId.value || '') === String(auth.user?.id || ''))
const posts = ref([])
const favs = ref([])
const likes = ref([])
const tab = ref('posts')
const loadedMap = ref({})
const followers = ref([])
const followerDialog = ref(false)
const profile = ref(null)
const avatarDialog = ref(false)
const avatarInput = ref('')

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

const userIdLabel = computed(() => `User ID: ${userId.value || 'guest'}`)
const currentList = computed(() => {
  if (!isSelf.value) return posts.value
  return tab.value === 'posts' ? posts.value : tab.value === 'favs' ? favs.value : likes.value
})
const coverKey = (card) => card._dupKey || card.id
const markLoaded = (card) => {
  const key = coverKey(card)
  loadedMap.value = { ...loadedMap.value, [key]: true }
}
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

const fetchProfile = async () => {
  const uid = userId.value
  if (!uid) {
    profile.value = null
    return
  }
  try {
    const res = await axios.get(`${AUTH_API}/user`, { params: { id: uid } })
    profile.value = res.data?.user || null
  } catch (e) {
    profile.value = null
  }
}

const openFollowers = () => {
  followerDialog.value = true
}

const openAvatarDialog = () => {
  if (!isSelf.value) return
  avatarInput.value = profile.value?.avatar_url || auth.user?.avatar_url || ''
  avatarDialog.value = true
}

const randomAvatar = () => {
  const seed = Math.floor(Math.random() * 200) + 1
  avatarInput.value = `https://picsum.photos/seed/jp_post${seed}_cover/800/600`
}

const saveAvatar = async () => {
  const url = (avatarInput.value || '').trim()
  if (!url) return
  try {
    const res = await axios.post(`${AUTH_API}/avatar`, {
      user_id: auth.user?.id,
      avatar_url: url,
    })
    const updated = res.data?.user
    if (updated) {
      profile.value = updated
      auth.setUser(updated)
      avatarDialog.value = false
    }
  } catch (e) {
    // ignore
  }
}

const displayUserName = computed(() => profile.value?.nickname || auth.user?.nickname || 'Traveler')
const displayAvatar = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || 'https://placehold.co/120x120')

onMounted(() => {
  fetchData()
  fetchProfile()
})

watch(
  () => route.query.userid,
  () => {
    fetchData()
    fetchProfile()
  }
)

watch(
  () => isSelf.value,
  (val) => {
    if (!val) tab.value = 'posts'
  }
)
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
  position: relative;
  cursor: pointer;
}
.avatar-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-weight: 700;
  font-size: 14px;
}
.avatar-wrap:hover .avatar-mask {
  opacity: 1;
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
  cursor: pointer;
}
.meta .link:hover {
  color: #1677ff;
  text-decoration: underline;
}
.meta .link.inert {
  pointer-events: none;
  cursor: default;
  text-decoration: none;
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
.card .cover {
  position: relative;
  height: 180px;
}
.img-skeleton {
  position: absolute;
  inset: 0;
  background: #f3f3f3;
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
.avatar-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.avatar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.avatar-preview {
  display: inline-flex;
  padding: 8px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  background: #fafbfc;
}
.avatar-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
}
</style>
