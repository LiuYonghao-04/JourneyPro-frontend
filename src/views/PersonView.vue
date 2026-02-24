<template>
  <div class="profile-page">
    <aside class="left-rail">
      <div class="brand">Profile</div>
      <RouterLink to="/posts" class="rail-link">Discover</RouterLink>
      <RouterLink to="/posts/publish" class="rail-link">Publish</RouterLink>
      <RouterLink to="/notifications" class="rail-link">Notifications</RouterLink>
      <RouterLink to="/person" class="rail-link active">Me</RouterLink>
    </aside>

    <main class="content">
      <section class="hero">
        <div class="avatar-wrap" @click="isSelf && openAvatarDialog()">
          <CroppedImage :src="displayAvatar" alt="avatar" class="avatar" :aspect-ratio="1" />
          <div v-if="isSelf" class="avatar-mask">Change</div>
        </div>
        <div class="hero-main">
          <h1>{{ displayUserName }}</h1>
          <div class="hero-sub">
            <span>User ID: {{ userId || 'guest' }}</span>
            <button class="link-btn" :disabled="!isSelf" @click="isSelf && openFollowers()">
              Followers {{ followerCount }}
            </button>
          </div>
          <div class="kpi-row">
            <div class="kpi-card">
              <span>Posts</span>
              <strong>{{ posts.length }}</strong>
            </div>
            <div class="kpi-card">
              <span>Favorites</span>
              <strong>{{ isSelf ? favs.length : 0 }}</strong>
            </div>
            <div class="kpi-card">
              <span>Likes</span>
              <strong>{{ isSelf ? likes.length : 0 }}</strong>
            </div>
            <div class="kpi-card">
              <span>Visible</span>
              <strong>{{ filteredList.length }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section v-if="isSelf" class="insights">
        <article class="panel">
          <h3>Recommendation Controls</h3>
          <div class="slider-wrap">
            <div class="slider-labels">
              <span>Distance {{ distancePercent }}%</span>
              <span>Interest {{ interestPercent }}%</span>
            </div>
            <el-slider v-model="interestSlider" :min="0" :max="100" />
          </div>
          <div class="slider-wrap">
            <div class="slider-labels">
              <span>Safe {{ safePercent }}%</span>
              <span>Explore {{ explorePercent }}%</span>
            </div>
            <el-slider v-model="exploreSlider" :min="0" :max="100" />
          </div>
        </article>

        <article class="panel">
          <h3>Interest Profile</h3>
          <div v-if="interestLoading" class="muted">Loading profile...</div>
          <template v-else-if="!interestProfile?.personalized">
            <div class="muted">Interact with posts to generate preference profile.</div>
          </template>
          <template v-else>
            <div class="bar-grid">
              <div class="bar-block" v-for="item in interestTags" :key="`tag-${item.name}`">
                <div class="bar-head">
                  <span>#{{ item.name }}</span>
                  <span>{{ item.percent }}%</span>
                </div>
                <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
              </div>
              <div class="bar-block" v-if="otherTagPercent > 0">
                <div class="bar-head">
                  <span>Other tags</span>
                  <span>{{ otherTagPercent }}%</span>
                </div>
                <el-progress :percentage="otherTagPercent" :stroke-width="8" :show-text="false" />
              </div>
            </div>
            <div class="bar-grid">
              <div class="bar-block" v-for="item in interestCategories" :key="`cat-${item.name}`">
                <div class="bar-head">
                  <span>{{ item.name }}</span>
                  <span>{{ item.percent }}%</span>
                </div>
                <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
              </div>
              <div class="bar-block" v-if="otherCategoryPercent > 0">
                <div class="bar-head">
                  <span>Other categories</span>
                  <span>{{ otherCategoryPercent }}%</span>
                </div>
                <el-progress :percentage="otherCategoryPercent" :stroke-width="8" :show-text="false" />
              </div>
            </div>
          </template>
        </article>
      </section>

      <section class="controls">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
          <button v-if="isSelf" class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">Favorites</button>
          <button v-if="isSelf" class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">Likes</button>
        </div>

        <div class="filters">
          <el-input v-model="search" placeholder="Search title or content" clearable style="width: 260px" />
          <el-select v-model="sort" style="width: 140px">
            <el-option label="Newest" value="new" />
            <el-option label="Hottest" value="hot" />
          </el-select>
          <button class="mode-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">Grid</button>
          <button class="mode-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">List</button>
        </div>
      </section>

      <section v-if="filteredList.length" class="feed">
        <div v-if="viewMode === 'grid'" class="card-grid">
          <article v-for="card in filteredList" :key="card._dupKey || card.id" class="card" @click="goDetail(card.id)">
            <CroppedImage :src="card.cover_image || card.images?.[0] || 'https://placehold.co/640x420'" class="cover" />
            <div class="body">
              <h4>{{ card.title }}</h4>
              <p>{{ card.content }}</p>
              <div class="meta">
                <span>{{ card.like_count || 0 }} likes</span>
                <span>{{ card.favorite_count || 0 }} favs</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="list-view">
          <article v-for="card in filteredList" :key="card._dupKey || card.id" class="list-card" @click="goDetail(card.id)">
            <CroppedImage :src="card.cover_image || card.images?.[0] || 'https://placehold.co/240x160'" class="list-cover" />
            <div class="list-body">
              <h4>{{ card.title }}</h4>
              <p>{{ card.content }}</p>
              <div class="meta">
                <span>{{ card.like_count || 0 }} likes</span>
                <span>{{ card.favorite_count || 0 }} favs</span>
                <span>{{ card.view_count || 0 }} views</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="empty">No content found.</section>
    </main>
  </div>

  <el-dialog v-model="followerDialog" title="Followers" width="380px">
    <div v-if="followers.length" class="followers-list">
      <div v-for="f in followers" :key="f.id" class="follower-row">
        <CroppedImage :src="f.avatar_url || 'https://placehold.co/80x80'" class="follower-avatar" :aspect-ratio="1" />
        <div>
          <div>{{ f.nickname || 'Traveler' }}</div>
          <div class="muted">ID: {{ f.user_id }}</div>
        </div>
      </div>
    </div>
    <div v-else class="muted">No followers yet.</div>
  </el-dialog>

  <el-dialog v-model="avatarDialog" title="Update Avatar" width="420px">
    <div class="avatar-editor">
      <el-input v-model="avatarInput" placeholder="https://..." />
      <div class="avatar-editor-actions">
        <el-button size="small" @click="randomAvatar">Random</el-button>
        <el-button size="small" type="primary" @click="startAvatarCrop">Crop & Save</el-button>
      </div>
      <div class="avatar-preview" @click="startAvatarCrop">
        <CroppedImage :src="avatarInput || displayAvatar" class="avatar-preview-img" :aspect-ratio="1" />
      </div>
    </div>
  </el-dialog>

  <ImageCropperDialog
    v-model="avatarCropOpen"
    :src="avatarCropSrc"
    title="Crop avatar"
    :aspect-ratio="1"
    :output-width="120"
    :output-height="120"
    :preview-width="160"
    :initial-crop="avatarCropInitial"
    @confirm="onAvatarCropConfirm"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import ImageCropperDialog from '../components/ImageCropperDialog.vue'
import CroppedImage from '../components/CroppedImage.vue'
import { buildUrlWithCrop, parseUrlWithCrop } from '../utils/cropUrl'
import { proxiedImageSrc } from '../utils/imageProxy'

const API_BASE = 'http://localhost:3001/api/posts'
const FOLLOW_API = 'http://localhost:3001/api/follow'
const AUTH_API = 'http://localhost:3001/api/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()

const userId = computed(() => route.query.userid || auth.user?.id)
const isSelf = computed(() => String(userId.value || '') === String(auth.user?.id || ''))

const posts = ref([])
const favs = ref([])
const likes = ref([])
const followers = ref([])
const profile = ref(null)
const tab = ref('posts')
const sort = ref('new')
const search = ref('')
const viewMode = ref(localStorage.getItem('jp_person_view_mode') || 'grid')

const followerDialog = ref(false)
const avatarDialog = ref(false)
const avatarInput = ref('')
const avatarCropOpen = ref(false)
const avatarCropSrc = ref('')
const avatarCropInitial = ref(null)
const avatarCropBaseUrl = ref('')

const fetchData = async () => {
  const uid = userId.value
  if (!uid) return
  const [p, f, l] = await Promise.all([
    axios.get(API_BASE, { params: { user_id: uid, limit: 150 } }).then((r) => r.data?.data || []),
    axios.get(API_BASE, { params: { favorited_by: uid, limit: 150 } }).then((r) => r.data?.data || []),
    axios.get(API_BASE, { params: { liked_by: uid, limit: 150 } }).then((r) => r.data?.data || []),
  ])
  const likedSet = new Set(l.map((i) => i.id))
  const favSet = new Set(f.map((i) => i.id))
  posts.value = p.map((item) => ({ ...item, _fav: favSet.has(item.id), _liked: likedSet.has(item.id) }))
  favs.value = f.map((item) => ({ ...item, _fav: true }))
  likes.value = l.map((item) => ({ ...item, _liked: true }))
  await fetchFollowers()
}

const fetchFollowers = async () => {
  const uid = userId.value
  if (!uid) {
    followers.value = []
    return
  }
  try {
    const res = await axios.get(`${FOLLOW_API}/followers`, { params: { target_id: uid } })
    followers.value = res.data?.data || []
  } catch {
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
  } catch {
    profile.value = null
  }
}

const currentList = computed(() => {
  if (!isSelf.value) return posts.value
  if (tab.value === 'favs') return favs.value
  if (tab.value === 'likes') return likes.value
  return posts.value
})

const filteredList = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = currentList.value.filter((item) => {
    if (!q) return true
    return `${item.title || ''} ${item.content || ''}`.toLowerCase().includes(q)
  })
  if (sort.value === 'hot') {
    return [...list].sort((a, b) => (Number(b.like_count) || 0) - (Number(a.like_count) || 0))
  }
  return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const followerCount = computed(() => followers.value.length)
const displayUserName = computed(() => profile.value?.nickname || auth.user?.nickname || 'Traveler')
const displayAvatar = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || 'https://placehold.co/120x120')

const interestSlider = computed({
  get() {
    return Math.round((routeStore.recoInterestWeight ?? 0.5) * 100)
  },
  set(val) {
    routeStore.setRecoInterestWeight(Number(val) / 100)
  },
})

const exploreSlider = computed({
  get() {
    return Math.round((routeStore.recoExploreWeight ?? 0.15) * 100)
  },
  set(val) {
    routeStore.setRecoExploreWeight(Number(val) / 100)
  },
})

const interestPercent = computed(() => interestSlider.value)
const distancePercent = computed(() => 100 - interestSlider.value)
const explorePercent = computed(() => exploreSlider.value)
const safePercent = computed(() => 100 - exploreSlider.value)

const interestProfile = computed(() => routeStore.userInterestProfile || null)
const interestLoading = computed(() => routeStore.interestProfileLoading)
const interestTags = computed(() => interestProfile.value?.tags?.items || [])
const otherTagPercent = computed(() => Number(interestProfile.value?.tags?.other_percent) || 0)
const interestCategories = computed(() => interestProfile.value?.categories?.items || [])
const otherCategoryPercent = computed(() => Number(interestProfile.value?.categories?.other_percent) || 0)

const goDetail = (id) => router.push(`/posts/postsid=${id}`)
const openFollowers = () => (followerDialog.value = true)

const openAvatarDialog = () => {
  if (!isSelf.value) return
  avatarInput.value = profile.value?.avatar_url || auth.user?.avatar_url || ''
  avatarDialog.value = true
}

const randomAvatar = () => {
  avatarInput.value = `https://picsum.photos/seed/jp_avatar_${Math.floor(Math.random() * 10000)}/160/160`
}

const startAvatarCrop = () => {
  const raw = (avatarInput.value || '').trim()
  if (!raw) return
  const parsed = parseUrlWithCrop(raw)
  avatarCropBaseUrl.value = parsed.baseUrl || raw
  avatarCropInitial.value = parsed.crop
  avatarCropSrc.value = proxiedImageSrc(avatarCropBaseUrl.value)
  avatarCropOpen.value = true
}

const persistAvatarUrl = async (finalUrl) => {
  const url = String(finalUrl || '').trim()
  if (!url || !auth.user?.id) return false
  try {
    const res = await axios.post(`${AUTH_API}/avatar`, { user_id: auth.user.id, avatar_url: url })
    const updated = res.data?.user
    if (updated) {
      profile.value = updated
      auth.setUser(updated)
      return true
    }
  } catch {
    // ignore
  }
  return false
}

const onAvatarCropConfirm = async (crop) => {
  try {
    const base = avatarCropBaseUrl.value || parseUrlWithCrop(avatarInput.value).baseUrl || avatarInput.value
    const finalUrl = buildUrlWithCrop(base, crop)
    avatarInput.value = finalUrl
    const ok = await persistAvatarUrl(finalUrl)
    if (ok) avatarDialog.value = false
  } finally {
    avatarCropOpen.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchProfile()
  if (auth.user?.id) routeStore.fetchUserInterestProfile(auth.user.id)
})

watch(
  () => route.query.userid,
  () => {
    fetchData()
    fetchProfile()
    if (isSelf.value && auth.user?.id) routeStore.fetchUserInterestProfile(auth.user.id)
  }
)

watch(
  () => isSelf.value,
  (val) => {
    if (!val) tab.value = 'posts'
    if (val && auth.user?.id) routeStore.fetchUserInterestProfile(auth.user.id)
  }
)

watch(
  () => viewMode.value,
  (mode) => {
    localStorage.setItem('jp_person_view_mode', mode)
  }
)

watch(
  () => avatarCropOpen.value,
  (open) => {
    if (open) return
    avatarCropSrc.value = ''
    avatarCropInitial.value = null
    avatarCropBaseUrl.value = ''
  }
)
</script>

<style scoped>
.profile-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 8% 0%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 30%),
    radial-gradient(circle at 90% 8%, color-mix(in srgb, #ffd7a0 10%, transparent), transparent 26%),
    var(--bg-main);
}

.left-rail {
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 8px;
}

.rail-link {
  text-decoration: none;
  color: var(--fg);
  padding: 9px 11px;
  border-radius: 12px;
}

.rail-link:hover,
.rail-link.active,
.left-rail :global(.router-link-active.rail-link) {
  background: color-mix(in srgb, var(--badge) 88%, transparent);
}

.content {
  overflow-y: auto;
  padding: 16px 18px 24px;
}

.hero {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
}

.avatar-wrap {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
}

.avatar {
  width: 104px;
  height: 104px;
  border-radius: 999px;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  font-weight: 700;
}

.avatar-wrap:hover .avatar-mask {
  opacity: 1;
}

.hero-main h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.02em;
}

.hero-sub {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
}

.link-btn {
  border: none;
  background: transparent;
  color: #4f8cff;
  cursor: pointer;
  padding: 0;
}

.link-btn:disabled {
  color: var(--muted);
  cursor: not-allowed;
}

.kpi-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.kpi-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 8px;
}

.kpi-card span {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.kpi-card strong {
  font-size: 22px;
}

.insights {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
}

.panel h3 {
  margin: 0 0 8px;
}

.slider-wrap {
  margin-top: 8px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.bar-grid {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.bar-block {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 8px;
}

.bar-head {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.controls {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 6px 12px;
  cursor: pointer;
}

.tab.active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 6px 10px;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #4f8cff;
}

.feed {
  margin-top: 12px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  overflow: hidden;
  cursor: pointer;
}

.cover {
  width: 100%;
  aspect-ratio: 4 / 3;
}

.body {
  padding: 10px;
}

.body h4 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.body p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.list-view {
  display: grid;
  gap: 10px;
}

.list-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 8px;
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 10px;
  cursor: pointer;
}

.list-cover {
  width: 180px;
  height: 120px;
  border-radius: 10px;
}

.list-body h4 {
  margin: 0 0 6px;
  font-size: 20px;
}

.list-body p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty {
  margin-top: 12px;
  border: 1px dashed color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: var(--muted);
}

.followers-list {
  display: grid;
  gap: 8px;
}

.follower-row {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  padding: 8px;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;
  align-items: center;
}

.follower-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.avatar-editor {
  display: grid;
  gap: 8px;
}

.avatar-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.avatar-preview {
  width: 140px;
  height: 140px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  cursor: pointer;
}

.avatar-preview-img {
  width: 140px;
  height: 140px;
}

.muted {
  color: var(--muted);
  font-size: 12px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper) {
  background: color-mix(in srgb, var(--panel) 88%, transparent) !important;
  border-color: color-mix(in srgb, var(--panel-border) 78%, transparent) !important;
  color: var(--fg) !important;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner),
:deep(.el-select__selected-item),
:deep(.el-select__placeholder) {
  color: var(--fg) !important;
}

@media (max-width: 1180px) {
  .insights {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .profile-page {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .content {
    padding: 12px;
  }

  .hero {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .list-card {
    grid-template-columns: 1fr;
  }

  .list-cover {
    width: 100%;
    height: 180px;
  }
}
</style>
