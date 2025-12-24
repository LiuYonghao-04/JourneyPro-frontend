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
          <CroppedImage :src="displayAvatar" alt="avatar" class="avatar-img" :aspect-ratio="1" />
          <div v-if="isSelf" class="avatar-mask">Change</div>
        </div>
        <div class="info">
          <h2 style="color: var(--muted);" >{{ displayUserName }}</h2>
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

      <section v-if="isSelf" class="reco-insights">
        <div class="reco-card">
          <div class="reco-title">Recommendation balance</div>
          <div class="reco-sub">Distance {{ distancePercent }}% · Interest {{ interestPercent }}%</div>
          <el-slider v-model="interestSlider" :min="0" :max="100" :show-tooltip="true" />
          <div class="reco-scale">
            <span>Distance-first</span>
            <span>Interest-first</span>
          </div>
        </div>

        <div class="reco-card">
          <div class="reco-title">Your interests</div>
          <div v-if="interestProfile?.signals" class="reco-sub">
            Likes {{ interestProfile.signals.likes }} · Favorites {{ interestProfile.signals.favorites }} · Views
            {{ interestProfile.signals.views }}
          </div>

          <div v-if="interestLoading" class="reco-empty">Loading...</div>
          <div v-else-if="!interestProfile?.personalized" class="reco-empty">
            Interact with posts to build your profile.
          </div>
          <div v-else class="interest-sections">
            <div class="interest-section">
              <div class="section-title">Tags</div>
              <div v-for="item in interestTags" :key="item.name" class="bar-item">
                <div class="bar-row">
                  <span class="bar-label">#{{ item.name }}</span>
                  <span class="bar-value">{{ item.percent }}%</span>
                </div>
                <el-progress :percentage="item.percent" :stroke-width="10" :show-text="false" />
              </div>
              <div v-if="otherTagPercent > 0" class="bar-item">
                <div class="bar-row">
                  <span class="bar-label">Other</span>
                  <span class="bar-value">{{ otherTagPercent }}%</span>
                </div>
                <el-progress :percentage="otherTagPercent" :stroke-width="10" :show-text="false" />
              </div>
            </div>

            <div class="interest-section">
              <div class="section-title">POI categories</div>
              <div v-for="item in interestCategories" :key="item.name" class="bar-item">
                <div class="bar-row">
                  <span class="bar-label">{{ item.name }}</span>
                  <span class="bar-value">{{ item.percent }}%</span>
                </div>
                <el-progress :percentage="item.percent" :stroke-width="10" :show-text="false" />
              </div>
              <div v-if="otherCategoryPercent > 0" class="bar-item">
                <div class="bar-row">
                  <span class="bar-label">Other</span>
                  <span class="bar-value">{{ otherCategoryPercent }}%</span>
                </div>
                <el-progress :percentage="otherCategoryPercent" :stroke-width="10" :show-text="false" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
        <button v-if="isSelf" class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">Favorites</button>
        <button v-if="isSelf" class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">Likes</button>
      </div>

      <section class="grid">
        <div v-if="currentList.length === 0" class="empty">
          <div class="empty-icon">&#127793;</div>
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
              <CroppedImage
                :src="card.cover_image || card.images?.[0]"
                loading="lazy"
                class="cover-img"
                @load="() => markLoaded(card)"
              />
            </div>
            <div class="card-title">{{ card.title }}</div>
            <div class="card-meta">
              <el-icon :class="['stat-icon', { liked: card._liked }]">
                <component :is="card._liked ? CircleCheckFilled : CircleCheck" />
              </el-icon>
              <span>{{ card.like_count || 0 }}</span>
              <span class="dot">&middot;</span>
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
        <CroppedImage :src="f.avatar_url || 'https://placehold.co/80x80'" class="follower-avatar" :aspect-ratio="1" />
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
        <el-button type="primary" size="small" @click="startAvatarCrop">Save</el-button>
      </div>
      <div class="avatar-preview clickable" role="button" tabindex="0" @click="startAvatarCrop">
        <CroppedImage :src="avatarInput || displayAvatar" alt="preview" class="avatar-preview-img" :aspect-ratio="1" />
        <div class="avatar-preview-mask">Change</div>
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
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { CircleCheck, CircleCheckFilled, Star, StarFilled } from '@element-plus/icons-vue'
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
const tab = ref('posts')
const loadedMap = ref({})
const followers = ref([])
const followerDialog = ref(false)
const profile = ref(null)
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
  avatarInput.value = `https://picsum.photos/seed/jp_post${seed}_cover/120/120`
}

const startAvatarCrop = () => {
  if (!isSelf.value) return
  const raw = (avatarInput.value || '').trim()
  if (!raw) {
    alert('Please enter an image URL first.')
    return
  }
  const parsed = parseUrlWithCrop(raw)
  avatarCropBaseUrl.value = parsed.baseUrl || raw
  avatarCropInitial.value = parsed.crop
  avatarCropSrc.value = proxiedImageSrc(avatarCropBaseUrl.value)
  avatarCropOpen.value = true
}

const persistAvatarUrl = async (finalUrl) => {
  const url = String(finalUrl || '').trim()
  if (!url) return false
  try {
    const res = await axios.post(`${AUTH_API}/avatar`, {
      user_id: auth.user?.id,
      avatar_url: url,
    })
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
    if (!ok) throw new Error('save failed')
    avatarDialog.value = false
  } catch {
    alert('Avatar update failed. Please try again.')
  } finally {
    avatarCropOpen.value = false
  }
}

const displayUserName = computed(() => profile.value?.nickname || auth.user?.nickname || 'Traveler')
const displayAvatar = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || 'https://placehold.co/120x120')

const interestSlider = computed({
  get() {
    return Math.round(((routeStore.recoInterestWeight ?? 0.5) * 100))
  },
  set(val) {
    const num = Number(val)
    const normalized = Number.isFinite(num) ? num / 100 : 0.5
    routeStore.setRecoInterestWeight(normalized)
  },
})
const interestPercent = computed(() => interestSlider.value)
const distancePercent = computed(() => 100 - interestSlider.value)
const interestProfile = computed(() => routeStore.userInterestProfile || null)
const interestLoading = computed(() => routeStore.interestProfileLoading)
const interestTags = computed(() => interestProfile.value?.tags?.items || [])
const otherTagPercent = computed(() => Number(interestProfile.value?.tags?.other_percent) || 0)
const interestCategories = computed(() => interestProfile.value?.categories?.items || [])
const otherCategoryPercent = computed(() => Number(interestProfile.value?.categories?.other_percent) || 0)

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
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: calc(100vh - 56px);
  background: var(--badge);
}
.sidebar {
  background: var(--panel);
  border-right: 1px solid #ececec;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.logo {
  color: var(--fg);
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
  color: var(--fg);
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: var(--badge);
}
.nav-item.muted {
  color: var(--muted);
}
.content {
  overflow-y: auto;
  padding: 24px 28px;
}
.profile {
  display: flex;
  gap: 16px;
  align-items: center;
  background: var(--panel);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}
.reco-insights {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.reco-card {
  background: var(--panel);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  border: 1px solid #eee;
}
.reco-title {
  font-weight: 800;
  color: var(--fg);
  margin-bottom: 6px;
}
.reco-sub {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}
.reco-scale {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.reco-empty {
  color: var(--muted);
  font-size: 13px;
  padding: 10px 0;
}
.interest-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.interest-section .section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 8px;
}
.bar-item {
  margin-bottom: 10px;
}
.bar-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}
.bar-label {
  color: var(--fg);
  opacity: 0.8;
}
.bar-value {
  color: var(--muted);
}
.avatar-wrap {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--badge);
  position: relative;
  cursor: pointer;
}
.avatar-img {
  width: 100%;
  height: 100%;
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
  color: var(--muted);
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
  background: var(--badge);
  color: var(--fg);
  cursor: pointer;
}
.tab.active {
  background: var(--btn-primary);
  color: var(--btn-text);
  color: #fff;
}
.grid {
  margin-top: 16px;
  background: var(--panel);
  border-radius: 14px;
  padding: 16px;
  min-height: 400px;
}
.empty {
  text-align: center;
  color: var(--muted);
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
  background: var(--panel);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eee;
  cursor: pointer;
}
.card .cover {
  position: relative;
  height: 180px;
}
.cover-img {
  width: 100%;
  height: 180px;
}
.img-skeleton {
  position: absolute;
  inset: 0;
  background: var(--badge);
}
.card-title {
  font-weight: 700;
  padding: 8px 10px 4px;
  color: var(--muted);
}
.card-meta {
  padding: 0 10px 10px;
  font-size: 12px;
  color: var(--muted);
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
  background: var(--badge);
}
.follower-name {
  font-weight: 600;
}
.follower-meta {
  font-size: 12px;
  color: var(--muted);
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
  align-self: flex-start;
  width: fit-content;
  padding: 8px;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: var(--badge);
  position: relative;
}
.avatar-preview.clickable {
  cursor: pointer;
}
.avatar-preview-mask {
  position: absolute;
  inset: 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-weight: 700;
  font-size: 13px;
  pointer-events: none;
}
.avatar-preview:hover .avatar-preview-mask {
  opacity: 1;
}
.avatar-preview-img {
  width: 100px;
  height: 100px;
  border-radius: 10px;
}

@media (max-width: 1100px) {
  .reco-insights {
    grid-template-columns: 1fr;
  }
  .interest-sections {
    grid-template-columns: 1fr;
  }
}
</style>
