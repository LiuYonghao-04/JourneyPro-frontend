<template>
  <div class="page" v-if="post">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item active">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <RouterLink to="/notifications" class="nav-item">Notifications</RouterLink>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </div>
    </aside>

    <main class="content">
      <div class="header">
        <el-button text @click="goBack">Back</el-button>
        <div class="meta">
          <span>Post #{{ postId }}</span>
        </div>
      </div>

      <section class="panel">
        <div class="media">
          <el-carousel v-if="post.images?.length" height="520px">
            <el-carousel-item v-for="(img, idx) in post.images" :key="idx">
              <CroppedImage :src="img" :alt="`image-${idx}`" class="media-img" />
            </el-carousel-item>
          </el-carousel>
          <div v-else class="media-placeholder">No image</div>
        </div>

        <div class="body">
          <div class="author">
            <RouterLink v-if="post.user?.id" :to="profileLink(post.user.id)" class="avatar-link">
              <CroppedImage :src="post.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
            </RouterLink>
            <CroppedImage v-else :src="post.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
            <div class="author-info">
              <RouterLink v-if="post.user?.id" :to="profileLink(post.user.id)" class="name-link">
                <div class="name">{{ post.user?.nickname || 'Traveler' }}</div>
              </RouterLink>
              <div v-else class="name">{{ post.user?.nickname || 'Traveler' }}</div>
              <div class="time">{{ formatTime(post.created_at) }}</div>
            </div>
            <template v-if="auth.user && auth.user.id !== post.user?.id">
              <el-button
                class="follow-btn"
                :type="following ? 'success' : 'primary'"
                @click="toggleFollow"
                plain
              >
                {{ following ? 'Following' : 'Follow' }}
              </el-button>
            </template>
          </div>

          <h2 class="title">{{ post.title }}</h2>
          <p class="text">{{ post.content }}</p>

          <div class="tags" v-if="post.tags?.length">
            <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>

          <div v-if="post.poi_id" class="poi-actions">
            <div class="poi-meta">
              <strong>{{ poiDetail?.name || 'POI from this post' }}</strong>
              <span class="poi-cat" v-if="poiDetail?.category">{{ poiDetail.category }}</span>
              <span class="poi-cat" v-else-if="poiLoading">Loading...</span>
            </div>
            <div class="poi-buttons">
              <el-button size="small" :icon="Location" :disabled="!poiDetail" @click="viewOnMap">View on map</el-button>
              <el-button size="small" type="primary" :icon="Plus" :disabled="!poiDetail" @click="addToRoute">
                Add to route
              </el-button>
            </div>
            <el-alert
              v-if="alertMessage"
              :title="alertMessage"
              :type="alertType"
              :closable="false"
              show-icon
              class="inline-alert"
            />
          </div>

          <div class="stats">
            <button class="pill" @click="toggleLikePost">
              <el-icon :class="['stat-icon', { liked: post._liked }]">
                <component :is="post._liked ? CircleCheckFilled : CircleCheck" />
              </el-icon>
              <span class="views">{{ post.like_count || 0 }}</span>
            </button>
            <button class="pill" @click="toggleFavPost">
              <el-icon :class="['stat-icon', 'fav', { active: post._fav }]">
                <component :is="post._fav ? StarFilled : Star" />
              </el-icon>
              <span class="views">{{ post.favorite_count || 0 }}</span>
            </button>
            <span class="views">{{ post.view_count || 0 }} views</span>
          </div>
        </div>
      </section>

      <section class="comments">
        <div class="comments-header">
          <h3 class="title">Comments</h3>
          <span class="count">{{ comments.length }}</span>
        </div>
        <div class="comment-editor">
          <el-input
            v-model="commentText"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="Share your thoughts..."
          />
          <el-button type="primary" @click="submitComment()">Post</el-button>
        </div>

        <div class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment-item">
            <div class="comment-head">
              <RouterLink v-if="c.user?.id" :to="profileLink(c.user.id)" class="avatar-link">
                <CroppedImage :src="c.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
              </RouterLink>
              <CroppedImage v-else :src="c.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
              <div class="comment-meta">
                <div class="name">
                  <RouterLink v-if="c.user?.id" :to="profileLink(c.user.id)" class="inline-link">
                    {{ c.user?.nickname || 'Traveler' }}
                  </RouterLink>
                  <span v-else>{{ c.user?.nickname || 'Traveler' }}</span>
                </div>
                <div class="time">{{ formatTime(c.created_at) }}</div>
              </div>
            </div>
            <div class="comment-body">{{ c.content }}</div>
            <div class="comment-actions">
              <button class="icon-link" @click="likeComment(c)">
                <el-icon :class="['stat-icon', { liked: c._liked }]">
                  <component :is="c._liked ? CircleCheckFilled : CircleCheck" />
                </el-icon>
                <span>{{ c.like_count || 0 }}</span>
              </button>
              <button class="icon-link" @click="replyTarget = c.id">Reply</button>
              <button
                v-if="(c.replies?.length || 0) > 0"
                class="icon-link"
                @click="c._expanded = !c._expanded"
              >
                {{ c._expanded ? 'Collapse' : 'Expand' }}
              </button>
            </div>

            <div v-if="replyTarget === c.id" class="reply-box">
              <el-input
                v-model="replyText"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="Reply..."
              />
              <div class="reply-actions">
                <el-button size="small" @click="submitComment(c)">Send</el-button>
                <el-button size="small" text @click="cancelReply">Cancel</el-button>
              </div>
            </div>

            <div v-if="c.replies?.length && c._expanded !== false" class="replies">
              <div v-for="r in flattenReplies(c)" :key="r.id" class="reply-item">
                <div class="comment-head reply-head">
                  <RouterLink v-if="r.user?.id" :to="profileLink(r.user.id)" class="avatar-link">
                    <CroppedImage :src="r.user?.avatar_url || defaultAvatar" class="avatar small" :aspect-ratio="1" />
                  </RouterLink>
                  <CroppedImage v-else :src="r.user?.avatar_url || defaultAvatar" class="avatar small" :aspect-ratio="1" />
                  <div class="comment-meta reply-meta">
                    <div class="name" :class="{ muted: r._depth > 1 }">
                      <template v-if="r._depth > 1">
                        <RouterLink v-if="r.user?.id" :to="profileLink(r.user.id)" class="inline-link">
                          {{ r.user?.nickname || 'Traveler' }}
                        </RouterLink>
                        <span v-else>{{ r.user?.nickname || 'Traveler' }}</span>
                        &rarr; {{ getReplyTargetName(r) }}
                      </template>
                      <template v-else>
                        <RouterLink v-if="r.user?.id" :to="profileLink(r.user.id)" class="inline-link">
                          {{ r.user?.nickname || 'Traveler' }}
                        </RouterLink>
                        <span v-else>{{ r.user?.nickname || 'Traveler' }}</span>
                      </template>
                    </div>
                    <div class="time">{{ formatTime(r.created_at) }}</div>
                  </div>
                </div>
                <div class="comment-body">{{ r.content }}</div>
                <div class="comment-actions">
                  <button class="icon-link" @click="likeComment(r)">
                    <el-icon :class="['stat-icon', { liked: r._liked }]">
                      <component :is="r._liked ? CircleCheckFilled : CircleCheck" />
                    </el-icon>
                    <span>{{ r.like_count || 0 }}</span>
                  </button>
                  <button class="icon-link" @click="replyTarget = r.id">Reply</button>
                </div>
                <div v-if="replyTarget === r.id" class="reply-box nested">
                  <el-input
                    v-model="replyText"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="Reply..."
                  />
                  <div class="reply-actions">
                    <el-button size="small" @click="submitComment(r)">Send</el-button>
                    <el-button size="small" text @click="cancelReply">Cancel</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { CircleCheck, CircleCheckFilled, Star, StarFilled, Location, Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import CroppedImage from '../components/CroppedImage.vue'

const API_BASE = 'http://localhost:3001/api/posts'
const FOLLOW_API = 'http://localhost:3001/api/follow'
const POI_API = 'http://localhost:3001/api/poi'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()
const post = ref(null)
const comments = ref([])
const commentText = ref('')
const replyText = ref('')
const replyTarget = ref(null)
const defaultAvatar = 'https://placehold.co/80x80'
const likedIds = ref(new Set())
const favIds = ref(new Set())
const following = ref(false)
const poiDetail = ref(null)
const poiLoading = ref(false)
const alertMessage = ref('')
const alertType = ref('success')

const postId = computed(() => route.params.id)

const goBack = () => {
  router.back()
}

const profileLink = (uid) => `/person?userid=${uid}`

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString()
}

const fetchPost = async () => {
  await loadReactions()
  const res = await axios.get(`${API_BASE}/${postId.value}`)
  const data = res.data?.data
  post.value = {
    ...data,
    _liked: likedIds.value.has(Number(postId.value)),
    _fav: favIds.value.has(Number(postId.value)),
  }
  await fetchFollowStatus()
  await fetchPoiDetail()
}

const normalizeReplies = (replies = []) =>
  (replies || []).map((r) => ({
    ...r,
    _liked: !!r.liked_by_user,
    replies: normalizeReplies(r.replies || []),
  }))

const fetchComments = async () => {
  const res = await axios.get(`${API_BASE}/${postId.value}/comments`, {
    params: { user_id: auth.user?.id },
  })
  comments.value = (res.data?.data || []).map((c) => ({
    ...c,
    _liked: !!c.liked_by_user,
    _expanded: true,
    replies: normalizeReplies(c.replies || []),
  }))
}

const findCommentById = (id, list = comments.value) => {
  for (const c of list) {
    if (c.id === id) return c
    const child = findCommentById(id, c.replies || [])
    if (child) return child
  }
  return null
}

const flattenReplies = (root) => {
  const result = []
  const walk = (arr, depth = 1) => {
    arr.forEach((r) => {
      result.push({ ...r, _depth: depth })
      if (r.replies?.length) walk(r.replies, depth + 1)
    })
  }
  walk(root.replies || [], 1)
  return result
}

const getReplyTargetName = (reply) => {
  const parent = reply.parent_id ? findCommentById(reply.parent_id) : null
  return parent?.user?.nickname || 'Traveler'
}

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
    likedIds.value = new Set()
    favIds.value = new Set()
  }
}

const toggleLikePost = async () => {
  if (!post.value) return
  const res = await axios.post(`${API_BASE}/${postId.value}/like`, { user_id: auth.user?.id })
  const updated = res.data?.data
  if (updated) {
    const liked = !!res.data?.liked
    likedIds.value = liked
      ? new Set([...likedIds.value, Number(postId.value)])
      : new Set([...likedIds.value].filter((id) => id !== Number(postId.value)))
    post.value = { ...updated, _liked: liked, _fav: post.value._fav }
  }
}

const toggleFavPost = async () => {
  if (!post.value) return
  const res = await axios.post(`${API_BASE}/${postId.value}/favorite`, { user_id: auth.user?.id })
  const updated = res.data?.data
  if (updated) {
    const favored = !!res.data?.favorited
    favIds.value = favored
      ? new Set([...favIds.value, Number(postId.value)])
      : new Set([...favIds.value].filter((id) => id !== Number(postId.value)))
    post.value = { ...updated, _fav: favored, _liked: post.value._liked }
  }
}

const submitComment = async (parent) => {
  const content = parent ? replyText.value : commentText.value
  if (!content || !content.trim()) return
  const payload = { content: content.trim(), parent_id: parent ? parent.id : null, user_id: auth.user?.id }
  try {
    const res = await axios.post(`${API_BASE}/${postId.value}/comments`, payload)
    const item = { ...res.data?.data, _liked: false, replies: [] }
    if (parent) {
      const target = findCommentById(parent.id)
      if (target) {
        target.replies = [...(target.replies || []), item]
      }
      replyText.value = ''
      replyTarget.value = null
    } else {
      comments.value = [...comments.value, item]
      commentText.value = ''
    }
  } catch (e) {
    console.error('comment failed', e)
  }
}

const cancelReply = () => {
  replyText.value = ''
  replyTarget.value = null
}

const updateCommentInTree = (updated) => {
  const replace = (list) =>
    list.map((c) => {
      if (c.id === updated.id) return { ...c, ...updated }
      const replies = c.replies?.length ? replace(c.replies) : []
      return { ...c, replies }
    })
  comments.value = replace(comments.value)
}

const likeComment = async (comment) => {
  const res = await axios.post(`${API_BASE}/comments/${comment.id}/like`, { user_id: auth.user?.id })
  const data = res.data?.data
  if (data) {
    updateCommentInTree({ ...data, _liked: res.data?.liked })
  }
}

const fetchPoiDetail = async () => {
  const poiId = post.value?.poi_id
  if (!poiId) {
    poiDetail.value = null
    return
  }
  poiLoading.value = true
  try {
    const res = await axios.get(`${POI_API}/${poiId}`)
    poiDetail.value = res.data?.data || null
  } catch (e) {
    poiDetail.value = null
  } finally {
    poiLoading.value = false
  }
}

const viewOnMap = () => {
  if (!poiDetail.value) return
  const { lat, lng, name, id } = poiDetail.value
  const poiId = Number(id) || id
  router.push({
    path: '/map',
    query: {
      poi_lat: lat,
      poi_lng: lng,
      poi_name: name,
      poi_id: poiId,
    },
  })
}

const addToRoute = () => {
  if (!poiDetail.value) return
  const { id, name, lat, lng } = poiDetail.value
  const latNum = Number(lat)
  const lngNum = Number(lng)
  const currentId = id !== undefined && id !== null ? String(id) : null
  const exists = routeStore.viaPoints.some((p) => {
    const pid = p.id !== undefined && p.id !== null ? String(p.id) : null
    if (pid && currentId) return pid === currentId
    if (
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      !Number.isNaN(latNum) &&
      !Number.isNaN(lngNum)
    ) {
      return Number(p.lat) === latNum && Number(p.lng) === lngNum
    }
    return false
  })
  if (exists) {
    alertType.value = 'warning'
    alertMessage.value = 'Already added to route'
    console.log('addToRoute skipped duplicate', { currentId, latNum, lngNum, viaPoints: routeStore.viaPoints })
    return
  }
  routeStore.addViaPoint({
    id,
    name,
    lat: latNum,
    lng: lngNum,
  })
  alertType.value = 'success'
  alertMessage.value = 'Added to route'
  console.log('addToRoute success', { id, latNum, lngNum, viaPoints: routeStore.viaPoints })
}

const fetchFollowStatus = async () => {
  if (!auth.user || !post.value?.user?.id || auth.user.id === post.value.user.id) {
    following.value = false
    return
  }
  try {
    const res = await axios.get(`${FOLLOW_API}/status`, {
      params: { user_id: auth.user.id, target_id: post.value.user.id },
    })
    following.value = !!res.data?.following
  } catch (e) {
    following.value = false
  }
}

const toggleFollow = async () => {
  if (!auth.user || !post.value?.user?.id || auth.user.id === post.value.user.id) return
  try {
    const res = await axios.post(`${FOLLOW_API}/toggle`, {
      user_id: auth.user.id,
      target_id: post.value.user.id,
    })
    following.value = !!res.data?.following
  } catch (e) {
    // ignore
  }
}

onMounted(() => {
  fetchPost()
  fetchComments()
})
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: var(--bg-main);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
}
.sidebar {
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  border-right: 1px solid var(--panel-border);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.logo {
  font-weight: 800;
  color: var(--fg);
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
  color: var(--fg);
  text-decoration: none;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: var(--badge);
  color: var(--fg);
}
.nav-item.muted {
  color: var(--muted);
}
.content {
  overflow-y: auto;
  padding: 18px 22px 40px;
  scrollbar-gutter: stable;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 18px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 16px 30px 16px 16px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.media {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--badge);
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
}
.media :deep(.el-carousel),
.media :deep(.el-carousel__container) {
  border-radius: 16px;
}
.media :deep(.el-carousel__container) {
  overflow: hidden;
}
.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-placeholder {
  height: 520px;
  background: var(--badge);
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--muted);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar-link {
  display: inline-block;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--badge);
}
.avatar.small {
  width: 36px;
  height: 36px;
}
.author-info .name {
  font-weight: 700;
  color: var(--fg);
}
.author-info .time {
  color: var(--muted);
  font-size: 12px;
}
.name-link {
  text-decoration: none;
  color: inherit;
}
.title {
  margin: 6px 0;
  color: var(--fg);
  letter-spacing: -0.02em;
}
.text {
  line-height: 1.6;
  color: var(--fg);
  white-space: pre-wrap;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.poi-actions {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--badge);
  color: var(--fg);
}
.poi-cat{
  margin-left: 12px;
}
.poi-buttons {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.inline-alert {
  margin-top: 8px;
}
.tag {
  background: var(--badge);
  color: var(--fg);
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
}
.stats {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--fg);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 85%, transparent);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  border-radius: 16px;
  padding: 8px 12px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}
.pill:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--panel-border) 100%, transparent);
  background: color-mix(in srgb, var(--badge) 90%, transparent);
}
.stat-icon {
  color: color-mix(in srgb, var(--fg) 50%, transparent);
}
.stat-icon.liked {
  color: #ff2442;
}
.stat-icon.fav.active {
  color: #f5a524;
}
.views {
  color: var(--muted);
  font-size: 13px;
}
.comments {
  margin-top: 18px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.comments-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.comments-header .count {
  color: var(--muted);
}
.comment-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: color-mix(in srgb, var(--badge) 70%, transparent) !important;
  color: var(--fg) !important;
  border-color: color-mix(in srgb, var(--panel-border) 80%, transparent) !important;
}
:deep(.el-input__inner) {
  color: var(--fg);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment-item,
.reply-item {
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  border-radius: 16px;
  padding: 14px;
  transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
}
.comment-item:hover,
.reply-item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--panel-border) 100%, transparent);
  background: color-mix(in srgb, var(--badge) 86%, transparent);
}
.reply-head .avatar.small {
  width: 36px;
  height: 36px;
}
.reply-meta {
  font-size: 12px;
  color: var(--muted);
}
.reply-meta .name.muted {
  color: var(--muted);
  font-size: 12px;
}
.comment-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.comment-meta .name {
  font-weight: 600;
  color: var(--fg);
  line-height: 1.2;
}
.comment-meta .time {
  color: var(--muted);
  font-size: 12px;
}
.inline-link {
  text-decoration: none;
  color: inherit;
}
.inline-link:hover {
  opacity: 0.92;
}
.comment-body {
  margin: 6px 0;
  color: var(--fg);
  font-size: 15px;
  line-height: 1.55;
}
.comment-actions {
  display: flex;
  gap: 12px;
}
.icon-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: color-mix(in srgb, var(--panel) 30%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  padding: 6px 10px;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}
.icon-link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--panel-border) 100%, transparent);
  background: color-mix(in srgb, var(--panel) 42%, transparent);
}
.reply-box {
  margin-top: 8px;
}
.reply-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.replies {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 1px solid color-mix(in srgb, var(--panel-border) 60%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1100px) {
  .panel {
    grid-template-columns: 1fr;
  }
  .media-placeholder {
    height: 420px;
  }
}
</style>
