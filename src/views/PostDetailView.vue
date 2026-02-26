<template>
  <div class="page" v-if="post">
    <aside class="sidebar">
      <div class="brand">Community</div>
      <RouterLink to="/posts" class="nav-link">Discover</RouterLink>
      <RouterLink to="/posts/publish" class="nav-link">Publish</RouterLink>
      <RouterLink to="/notifications" class="nav-link">Notifications</RouterLink>
      <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-link">Me</RouterLink>
      <div v-else class="nav-link muted">Me</div>
      <div class="side-meta">
        <div>Post #{{ postId }}</div>
        <div>{{ formatTime(post.created_at) }}</div>
      </div>
    </aside>

    <main class="content">
      <header class="toolbar">
        <el-button text @click="goBack">Back</el-button>
        <div class="toolbar-actions">
          <el-button @click="copyPostLink">Copy link</el-button>
          <el-button :disabled="!poiDetail?.id" @click="openPoiPostFeed">Related POI posts</el-button>
        </div>
      </header>

      <div class="detail-shell">
        <section class="hero-grid">
          <article class="hero-media card">
            <div class="media-top">
              <div class="media-title">Photo Story</div>
              <div v-if="postImages.length" class="media-count">{{ mediaIndex + 1 }} / {{ postImages.length }}</div>
            </div>

            <button class="main-image-btn" @click="openPhotoViewer(postImages, mediaIndex)">
              <CroppedImage
                v-if="postImages[mediaIndex]"
                :src="postImages[mediaIndex]"
                :alt="`post-image-${mediaIndex}`"
                class="main-image"
              />
              <div v-else class="image-empty">No image</div>
            </button>

            <div v-if="postImages.length > 1" class="thumb-rail">
              <button
                v-for="(img, idx) in postImages"
                :key="`${img}-${idx}`"
                class="thumb"
                :class="{ active: mediaIndex === idx }"
                @click="mediaIndex = idx"
              >
                <CroppedImage :src="img" :alt="`thumb-${idx}`" class="thumb-img" />
              </button>
            </div>
          </article>

          <article class="story-card card">
            <div class="author-row">
              <RouterLink v-if="post.user?.id" :to="profileLink(post.user.id)">
                <CroppedImage :src="post.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
              </RouterLink>
              <CroppedImage v-else :src="post.user?.avatar_url || defaultAvatar" class="avatar" :aspect-ratio="1" />
              <div class="author-info">
                <RouterLink v-if="post.user?.id" :to="profileLink(post.user.id)" class="author-name">
                  {{ post.user?.nickname || 'Traveler' }}
                </RouterLink>
                <div v-else class="author-name">{{ post.user?.nickname || 'Traveler' }}</div>
                <div class="time">{{ formatTime(post.created_at) }}</div>
              </div>
              <el-button
                v-if="auth.user && auth.user.id !== post.user?.id"
                size="small"
                :type="following ? 'success' : 'primary'"
                plain
                @click="toggleFollow"
              >
                {{ following ? 'Following' : 'Follow' }}
              </el-button>
            </div>

            <h1 class="post-title">{{ post.title }}</h1>
            <p class="post-text">{{ post.content }}</p>

            <div v-if="post.tags?.length" class="tags">
              <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>

            <div class="post-actions">
              <button class="pill" @click="toggleLikePost">
                <el-icon :class="{ active: post._liked }">
                  <component :is="post._liked ? CircleCheckFilled : CircleCheck" />
                </el-icon>
                <span>{{ post.like_count || 0 }}</span>
              </button>
              <button class="pill" @click="toggleFavPost">
                <el-icon :class="{ active: post._fav }">
                  <component :is="post._fav ? StarFilled : Star" />
                </el-icon>
                <span>{{ post.favorite_count || 0 }}</span>
              </button>
              <span class="time">{{ post.view_count || 0 }} views</span>
            </div>
          </article>
        </section>

        <section class="content-grid">
          <section class="comments card">
            <div class="comments-head">
              <h3>Comments ({{ commentTotal }})</h3>
              <div class="comment-tools">
                <el-input v-model="commentQuery" placeholder="Search comments" clearable />
                <el-select v-model="commentSort" style="width: 120px">
                  <el-option label="Newest" value="new" />
                  <el-option label="Hottest" value="hot" />
                </el-select>
              </div>
            </div>

            <div class="comment-editor">
              <el-input v-model="commentText" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="Write a comment" />
              <el-button type="primary" @click="submitComment()">Post</el-button>
            </div>

            <div class="comment-list">
              <article v-for="item in filteredComments" :key="item.id" class="comment-item">
                <div class="comment-header">
                  <CroppedImage :src="item.user?.avatar_url || defaultAvatar" class="comment-avatar" :aspect-ratio="1" />
                  <div>
                    <div class="comment-name">{{ item.user?.nickname || 'Traveler' }}</div>
                    <div class="time">{{ formatTime(item.created_at) }}</div>
                  </div>
                </div>
                <p class="comment-content">{{ item.content }}</p>
                <div class="comment-actions">
                  <button class="mini-btn" @click="likeComment(item)">Like {{ item.like_count || 0 }}</button>
                  <button class="mini-btn" @click="replyTarget = item.id">Reply</button>
                  <button v-if="item.replies?.length" class="mini-btn" @click="item._expanded = !item._expanded">
                    {{ item._expanded ? 'Hide' : 'Show' }} replies
                  </button>
                </div>

                <div v-if="replyTarget === item.id" class="reply-box">
                  <el-input v-model="replyText" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="Reply..." />
                  <div class="reply-actions">
                    <el-button size="small" type="primary" @click="submitComment(item)">Send</el-button>
                    <el-button size="small" @click="cancelReply">Cancel</el-button>
                  </div>
                </div>

                <div v-if="item.replies?.length && item._expanded !== false" class="reply-list">
                  <div v-for="reply in flattenReplies(item)" :key="reply.id" class="reply-item" :style="{ '--depth': reply._depth }">
                    <div class="comment-header">
                      <CroppedImage :src="reply.user?.avatar_url || defaultAvatar" class="comment-avatar small" :aspect-ratio="1" />
                      <div>
                        <div class="comment-name">{{ reply.user?.nickname || 'Traveler' }}</div>
                        <div class="time">{{ formatTime(reply.created_at) }}</div>
                      </div>
                    </div>
                    <p class="comment-content">{{ reply.content }}</p>
                    <div class="comment-actions">
                      <button class="mini-btn" @click="likeComment(reply)">Like {{ reply.like_count || 0 }}</button>
                      <button class="mini-btn" @click="replyTarget = reply.id">Reply</button>
                    </div>
                  </div>
                </div>
              </article>

              <div v-if="filteredComments.length === 0" class="empty">No comments match your filter.</div>
            </div>
          </section>

          <aside class="right-stack">
            <section v-if="post.poi_id" class="poi-card card">
              <div class="poi-header">
                <div>
                  <strong>{{ poiDetail?.name || 'Linked place' }}</strong>
                  <div class="time">{{ poiDetail?.category || 'POI' }}</div>
                </div>
                <div class="poi-actions">
                  <el-button size="small" :icon="Location" :disabled="!poiDetail" @click="viewOnMap">View map</el-button>
                  <el-button size="small" type="primary" :icon="Plus" :disabled="!poiDetail" @click="addToRoute">Add via</el-button>
                </div>
              </div>

              <div class="poi-gallery" v-if="poiGallery.length">
                <button v-for="(img, idx) in poiGallery" :key="`${img}-${idx}`" class="poi-photo" @click="openPhotoViewer(poiGallery, idx)">
                  <CroppedImage :src="img" :alt="`poi-${idx}`" class="poi-photo-img" />
                </button>
              </div>
              <el-alert
                v-if="alertMessage"
                :title="alertMessage"
                :type="alertType"
                :closable="false"
                show-icon
                class="inline-alert"
              />
            </section>

            <section class="side-card card">
              <h3>Post insights</h3>
              <div class="kpi-grid">
                <div class="kpi"><span>Likes</span><strong>{{ post.like_count || 0 }}</strong></div>
                <div class="kpi"><span>Favorites</span><strong>{{ post.favorite_count || 0 }}</strong></div>
                <div class="kpi"><span>Views</span><strong>{{ post.view_count || 0 }}</strong></div>
                <div class="kpi"><span>Comments</span><strong>{{ commentTotal }}</strong></div>
              </div>
            </section>

            <section class="side-card card">
              <h3>More from this place</h3>
              <div v-if="relatedPosts.length" class="related-list">
                <button v-for="item in relatedPosts" :key="item.id" class="related-item" @click="openPost(item.id)">
                  <div class="related-top">
                    <div class="related-title">{{ item.title }}</div>
                    <span class="related-badge">{{ item.like_count || 0 }} likes</span>
                  </div>
                  <div class="time">{{ item.user?.nickname || 'Traveler' }} · {{ formatTime(item.created_at) }}</div>
                </button>
              </div>
              <div v-else class="empty">No related posts yet.</div>
            </section>
          </aside>
        </section>
      </div>
    </main>

    <div v-if="photoViewerOpen && activePhotoUrl" class="photo-viewer" @click.self="closePhotoViewer">
      <button class="viewer-close" @click="closePhotoViewer">x</button>
      <button v-if="photoViewerImages.length > 1" class="viewer-nav prev" @click.stop="showPrevPhoto"><</button>
      <img class="viewer-image" :src="activePhotoUrl" :alt="`photo-${photoViewerIndex + 1}`" />
      <button v-if="photoViewerImages.length > 1" class="viewer-nav next" @click.stop="showNextPhoto">></button>
      <div class="viewer-count">{{ photoViewerIndex + 1 }} / {{ photoViewerImages.length }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { CircleCheck, CircleCheckFilled, Star, StarFilled, Location, Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import CroppedImage from '../components/CroppedImage.vue'
import { apiUrl } from '../config/api'

const API_BASE = apiUrl('/api/posts')
const FOLLOW_API = apiUrl('/api/follow')
const POI_API = apiUrl('/api/poi')

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()

const post = ref(null)
const comments = ref([])
const relatedPosts = ref([])
const commentText = ref('')
const replyText = ref('')
const replyTarget = ref(null)
const commentQuery = ref('')
const commentSort = ref('new')
const mediaIndex = ref(0)

const defaultAvatar = 'https://placehold.co/80x80'
const likedIds = ref(new Set())
const favIds = ref(new Set())
const following = ref(false)
const poiDetail = ref(null)
const alertMessage = ref('')
const alertType = ref('success')

const photoViewerOpen = ref(false)
const photoViewerImages = ref([])
const photoViewerIndex = ref(0)

const postId = computed(() => Number(route.params.id))
const activePhotoUrl = computed(() => photoViewerImages.value[photoViewerIndex.value] || '')

const normalizeImageList = (list) => Array.from(new Set((list || []).map((img) => String(img || '').trim()).filter(Boolean)))
const postImages = computed(() => normalizeImageList(post.value?.images || [post.value?.cover_image]))
const poiGallery = computed(() => normalizeImageList([poiDetail.value?.image_url, ...(poiDetail.value?.photos || [])]).slice(0, 8))

const commentTotal = computed(() => {
  const walk = (list) => (list || []).reduce((sum, item) => sum + 1 + walk(item.replies || []), 0)
  return walk(comments.value)
})

const hasQueryHit = (item, query) => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const text = `${item.content || ''} ${item.user?.nickname || ''}`.toLowerCase()
  if (text.includes(q)) return true
  return (item.replies || []).some((r) => hasQueryHit(r, q))
}

const filteredComments = computed(() => {
  const list = [...comments.value].filter((item) => hasQueryHit(item, commentQuery.value))
  const sorter = commentSort.value === 'hot'
    ? (a, b) => (Number(b.like_count) || 0) - (Number(a.like_count) || 0)
    : (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  return list.sort(sorter)
})

const formatTime = (time) => (time ? new Date(time).toLocaleString() : '')
const profileLink = (uid) => `/person?userid=${uid}`

const flattenReplies = (root) => {
  const out = []
  const walk = (arr, depth = 1) => {
    ;(arr || []).forEach((item) => {
      out.push({ ...item, _depth: depth })
      if (item.replies?.length) walk(item.replies, depth + 1)
    })
  }
  walk(root.replies || [], 1)
  return out
}

const findCommentById = (id, list = comments.value) => {
  for (const item of list) {
    if (item.id === id) return item
    const nested = findCommentById(id, item.replies || [])
    if (nested) return nested
  }
  return null
}

const normalizeReplies = (replies = []) =>
  (replies || []).map((item) => ({
    ...item,
    _liked: !!item.liked_by_user,
    replies: normalizeReplies(item.replies || []),
  }))

const loadReactions = async () => {
  if (!auth.user?.id) {
    likedIds.value = new Set()
    favIds.value = new Set()
    return
  }
  try {
    const [likedRes, favRes] = await Promise.all([
      axios.get(API_BASE, { params: { liked_by: auth.user.id, limit: 300 } }),
      axios.get(API_BASE, { params: { favorited_by: auth.user.id, limit: 300 } }),
    ])
    likedIds.value = new Set((likedRes.data?.data || []).map((item) => Number(item.id)))
    favIds.value = new Set((favRes.data?.data || []).map((item) => Number(item.id)))
  } catch {
    likedIds.value = new Set()
    favIds.value = new Set()
  }
}

const fetchPost = async () => {
  await loadReactions()
  const res = await axios.get(`${API_BASE}/${postId.value}`, { params: { user_id: auth.user?.id } })
  const data = res.data?.data
  post.value = {
    ...data,
    _liked: likedIds.value.has(postId.value),
    _fav: favIds.value.has(postId.value),
  }
  mediaIndex.value = 0
  await Promise.all([fetchFollowStatus(), fetchPoiDetail(), fetchRelatedPosts()])
}

const fetchComments = async () => {
  const res = await axios.get(`${API_BASE}/${postId.value}/comments`, { params: { user_id: auth.user?.id } })
  comments.value = (res.data?.data || []).map((item) => ({
    ...item,
    _liked: !!item.liked_by_user,
    _expanded: true,
    replies: normalizeReplies(item.replies || []),
  }))
}

const fetchRelatedPosts = async () => {
  if (!post.value?.poi_id) {
    relatedPosts.value = []
    return
  }
  try {
    const res = await axios.get(API_BASE, { params: { poi_id: post.value.poi_id, limit: 4 } })
    const dedup = new Set()
    relatedPosts.value = (res.data?.data || [])
      .filter((item) => Number(item.id) !== postId.value)
      .filter((item) => {
        const key = `${String(item.title || '').trim().toLowerCase()}__${String(item.user?.id || item.user_id || '')}`
        if (dedup.has(key)) return false
        dedup.add(key)
        return true
      })
      .slice(0, 4)
  } catch {
    relatedPosts.value = []
  }
}

const updateCommentTree = (updated) => {
  const patch = (list) =>
    list.map((item) => {
      if (item.id === updated.id) return { ...item, ...updated }
      return { ...item, replies: item.replies?.length ? patch(item.replies) : [] }
    })
  comments.value = patch(comments.value)
}

const toggleLikePost = async () => {
  if (!post.value) return
  const res = await axios.post(`${API_BASE}/${postId.value}/like`, { user_id: auth.user?.id })
  const updated = res.data?.data
  if (!updated) return
  const liked = !!res.data?.liked
  likedIds.value = liked ? new Set([...likedIds.value, postId.value]) : new Set([...likedIds.value].filter((id) => id !== postId.value))
  post.value = { ...updated, _liked: liked, _fav: post.value._fav }
}

const toggleFavPost = async () => {
  if (!post.value) return
  const res = await axios.post(`${API_BASE}/${postId.value}/favorite`, { user_id: auth.user?.id })
  const updated = res.data?.data
  if (!updated) return
  const favored = !!res.data?.favorited
  favIds.value = favored ? new Set([...favIds.value, postId.value]) : new Set([...favIds.value].filter((id) => id !== postId.value))
  post.value = { ...updated, _fav: favored, _liked: post.value._liked }
}

const submitComment = async (parent) => {
  const content = parent ? replyText.value : commentText.value
  if (!content || !content.trim()) return
  try {
    const res = await axios.post(`${API_BASE}/${postId.value}/comments`, {
      content: content.trim(),
      parent_id: parent ? parent.id : null,
      user_id: auth.user?.id,
    })
    const item = { ...res.data?.data, _liked: false, replies: [] }
    if (parent) {
      const target = findCommentById(parent.id)
      if (target) {
        target.replies = [...(target.replies || []), item]
        target._expanded = true
      }
      replyText.value = ''
      replyTarget.value = null
      return
    }
    comments.value = [...comments.value, { ...item, _expanded: true }]
    commentText.value = ''
  } catch {
    alertType.value = 'error'
    alertMessage.value = 'Failed to submit comment.'
  }
}

const cancelReply = () => {
  replyText.value = ''
  replyTarget.value = null
}

const likeComment = async (comment) => {
  const res = await axios.post(`${API_BASE}/comments/${comment.id}/like`, { user_id: auth.user?.id })
  const data = res.data?.data
  if (data) updateCommentTree({ ...data, _liked: !!res.data?.liked })
}

const fetchPoiDetail = async () => {
  if (!post.value?.poi_id) {
    poiDetail.value = null
    return
  }
  try {
    const res = await axios.get(`${POI_API}/${post.value.poi_id}`)
    poiDetail.value = res.data?.data || null
  } catch {
    poiDetail.value = null
  }
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
  } catch {
    following.value = false
  }
}

const toggleFollow = async () => {
  if (!auth.user || !post.value?.user?.id || auth.user.id === post.value.user.id) return
  try {
    const res = await axios.post(`${FOLLOW_API}/toggle`, { user_id: auth.user.id, target_id: post.value.user.id })
    following.value = !!res.data?.following
  } catch {
    // ignore
  }
}

const viewOnMap = () => {
  if (!poiDetail.value) return
  const { lat, lng, name, id } = poiDetail.value
  router.push({ path: '/map', query: { poi_lat: lat, poi_lng: lng, poi_name: name, poi_id: id } })
}

const addToRoute = () => {
  if (!poiDetail.value) return
  const { id, name, lat, lng } = poiDetail.value
  const exists = (routeStore.viaPoints || []).some((item) => String(item.id || '') === String(id || ''))
  if (exists) {
    alertType.value = 'warning'
    alertMessage.value = 'Already in via points.'
    return
  }
  routeStore.addViaPoint({ id, name, lat: Number(lat), lng: Number(lng) })
  alertType.value = 'success'
  alertMessage.value = 'Added to route.'
}

const openPoiPostFeed = () => {
  if (!poiDetail.value?.id) return
  router.push({ path: '/posts', query: { poi_id: String(poiDetail.value.id), poi_name: poiDetail.value.name || '' } })
}

const goBack = () => router.back()
const openPost = (id) => id && router.push(`/posts/postsid=${id}`)

const copyPostLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    alertType.value = 'success'
    alertMessage.value = 'Post link copied.'
  } catch {
    alertType.value = 'warning'
    alertMessage.value = 'Copy failed.'
  }
}

const openPhotoViewer = (images, index = 0) => {
  const list = normalizeImageList(images)
  if (!list.length) return
  photoViewerImages.value = list
  photoViewerIndex.value = Math.max(0, Math.min(Number(index) || 0, list.length - 1))
  photoViewerOpen.value = true
}
const closePhotoViewer = () => {
  photoViewerOpen.value = false
}
const showPrevPhoto = () => {
  if (!photoViewerImages.value.length) return
  photoViewerIndex.value = (photoViewerIndex.value - 1 + photoViewerImages.value.length) % photoViewerImages.value.length
}
const showNextPhoto = () => {
  if (!photoViewerImages.value.length) return
  photoViewerIndex.value = (photoViewerIndex.value + 1) % photoViewerImages.value.length
}
const onPhotoViewerKeydown = (event) => {
  if (!photoViewerOpen.value) return
  if (event.key === 'Escape') closePhotoViewer()
  if (event.key === 'ArrowLeft') showPrevPhoto()
  if (event.key === 'ArrowRight') showNextPhoto()
}

const init = async () => {
  if (!postId.value) return
  await Promise.all([fetchPost(), fetchComments()])
}

onMounted(() => {
  init()
  window.addEventListener('keydown', onPhotoViewerKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPhotoViewerKeydown)
})

watch(
  () => route.params.id,
  () => {
    commentText.value = ''
    replyText.value = ''
    replyTarget.value = null
    alertMessage.value = ''
    init()
  }
)
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 236px 1fr;
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 2% -8%, color-mix(in srgb, #8ab4ff 16%, transparent), transparent 38%),
    radial-gradient(circle at 98% 0%, color-mix(in srgb, #84dcff 14%, transparent), transparent 34%),
    linear-gradient(165deg, color-mix(in srgb, #4f8cff 5%, transparent), transparent 48%),
    var(--bg-main);
}

.sidebar {
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 82%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  padding: 20px 14px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.brand {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 10px;
  letter-spacing: 0.2px;
}

.nav-link {
  text-decoration: none;
  color: var(--fg);
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.nav-link:hover,
.sidebar :global(.router-link-active.nav-link) {
  background: color-mix(in srgb, var(--btn-primary) 82%, transparent);
  color: var(--btn-text);
}

.nav-link.muted {
  color: var(--muted);
}

.side-meta {
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  padding: 10px;
  color: var(--muted);
  display: grid;
  gap: 4px;
  font-size: 12px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
}

.content {
  overflow-y: auto;
  padding: 20px 22px 30px;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 16;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--panel) 88%, transparent),
      color-mix(in srgb, var(--panel) 95%, transparent)
    );
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(14px);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.detail-shell {
  max-width: 1520px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.card {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 20px;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--panel) 88%, transparent),
      color-mix(in srgb, var(--panel) 96%, transparent)
    );
  box-shadow:
    0 14px 38px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  overflow: hidden;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, #ffffff 16%, transparent),
    transparent 28%,
    transparent 70%,
    color-mix(in srgb, #ffffff 12%, transparent)
  );
  pointer-events: none;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(380px, 1fr);
  gap: 18px;
  align-items: stretch;
}

.hero-media {
  padding: 14px;
  display: grid;
  gap: 12px;
  background:
    radial-gradient(circle at 14% 0%, color-mix(in srgb, #8ab4ff 22%, transparent), transparent 42%),
    radial-gradient(circle at 100% 100%, color-mix(in srgb, #84dcff 16%, transparent), transparent 36%),
    transparent;
}

.media-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.media-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--fg) 72%, transparent);
}

.media-count {
  font-size: 12px;
  color: var(--muted);
  border: 1px solid color-mix(in srgb, var(--panel-border) 66%, transparent);
  border-radius: 999px;
  padding: 3px 9px;
  background: color-mix(in srgb, var(--panel) 76%, transparent);
}

.main-image-btn {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--panel-border) 66%, transparent);
  border-radius: 16px;
  background: transparent;
  padding: 0;
  cursor: zoom-in;
  overflow: hidden;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.main-image-btn:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, #4f8cff 54%, var(--panel-border));
  box-shadow: 0 18px 40px rgba(26, 73, 165, 0.16);
}

.main-image,
.image-empty {
  width: 100%;
  height: clamp(340px, 52vh, 600px);
  border-radius: 0;
  background: color-mix(in srgb, var(--badge) 88%, transparent);
  overflow: hidden;
}

.image-empty {
  display: grid;
  place-items: center;
  color: var(--muted);
}

.thumb-rail {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}

.thumb {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--panel) 70%, transparent);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease;
}

.thumb:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #4f8cff 56%, var(--panel-border));
}

.thumb.active {
  border-color: #4f8cff;
  box-shadow: 0 0 0 2px color-mix(in srgb, #4f8cff 24%, transparent);
}

.thumb-img {
  width: 100%;
  aspect-ratio: 4 / 3;
}

.story-card {
  padding: 22px;
  display: grid;
  gap: 14px;
  align-content: start;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--panel) 92%, transparent),
      color-mix(in srgb, var(--panel) 98%, transparent)
    );
}

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 46px;
  height: 46px;
  border-radius: 999px;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  text-decoration: none;
  color: var(--fg);
  font-weight: 700;
}

.post-title {
  margin: 4px 0 0;
  font-size: clamp(30px, 2.65vw, 42px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.post-text {
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
  color: color-mix(in srgb, var(--fg) 88%, #000);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  font-size: 12px;
  color: var(--muted);
  background: color-mix(in srgb, var(--badge) 82%, transparent);
}

.post-actions {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  border-radius: 999px;
  padding: 8px 13px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--fg);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.16s ease, border-color 0.16s ease;
}

.pill:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, #4f8cff 52%, var(--panel-border));
}

.pill .active {
  color: #4f8cff;
}

.time {
  color: var(--muted);
  font-size: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 18px;
  align-items: start;
}

.comments {
  padding: 18px;
}

.comments-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.comments-head h3 {
  margin: 0;
}

.comment-tools {
  display: flex;
  gap: 8px;
}

.comment-editor {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.comment-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.comment-item {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
}

.comment-avatar.small {
  width: 24px;
  height: 24px;
}

.comment-name {
  font-size: 13px;
  font-weight: 700;
}

.comment-content {
  margin: 8px 0 0;
  line-height: 1.58;
  white-space: pre-wrap;
}

.comment-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

.reply-box {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.reply-actions {
  display: flex;
  gap: 8px;
}

.reply-list {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.reply-item {
  margin-left: calc(8px + (var(--depth, 1) - 1) * 10px);
  border-left: 2px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  padding-left: 8px;
}

.right-stack {
  position: sticky;
  top: 82px;
  display: grid;
  gap: 14px;
  max-height: calc(100vh - 98px);
  overflow-y: auto;
  padding-right: 2px;
}

.poi-card,
.side-card {
  padding: 16px;
}

.poi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.poi-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.poi-gallery {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}

.poi-photo {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 9px;
  overflow: hidden;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.poi-photo-img {
  width: 100%;
  height: 64px;
}

.inline-alert {
  margin-top: 10px;
}

.side-card h3 {
  margin: 0 0 10px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.kpi {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  padding: 9px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
}

.kpi span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.kpi strong {
  font-size: 18px;
}

.related-list {
  display: grid;
  gap: 9px;
}

.related-item {
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  border-radius: 13px;
  background:
    linear-gradient(
      140deg,
      color-mix(in srgb, var(--badge) 72%, transparent),
      color-mix(in srgb, var(--badge) 90%, transparent)
    );
  padding: 10px;
  display: grid;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease;
}

.related-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, #4f8cff 58%, var(--panel-border));
  box-shadow: 0 14px 24px rgba(79, 140, 255, 0.14);
}

.related-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.related-title {
  font-weight: 700;
  font-size: 13px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-badge {
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 11px;
  color: var(--muted);
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 14px;
}

.photo-viewer {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 13, 0.92);
  z-index: 3000;
  display: grid;
  place-items: center;
}

.viewer-image {
  max-width: min(94vw, 1400px);
  max-height: 84vh;
  border-radius: 12px;
  object-fit: contain;
}

.viewer-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.24);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}

.viewer-nav.prev {
  left: 20px;
}

.viewer-nav.next {
  right: 20px;
}

.viewer-count {
  position: absolute;
  bottom: 18px;
  color: #fff;
  font-size: 13px;
}

.thumb-rail::-webkit-scrollbar,
.right-stack::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.thumb-rail::-webkit-scrollbar-thumb,
.right-stack::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--muted) 42%, transparent);
  border-radius: 999px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper) {
  background: color-mix(in srgb, var(--panel) 88%, transparent) !important;
  border-color: var(--panel-border) !important;
  color: var(--fg) !important;
}

:deep(.el-input__inner),
:deep(.el-select__placeholder),
:deep(.el-select__selected-item),
:deep(.el-textarea__inner) {
  color: var(--fg) !important;
}

@media (max-width: 1380px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(340px, 1fr);
  }

  .content-grid {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

@media (max-width: 1220px) {
  .hero-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .right-stack {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 980px) {
  .page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .content {
    padding: 12px;
  }

  .toolbar {
    position: static;
    margin-bottom: 12px;
  }

  .toolbar-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .main-image,
  .image-empty {
    height: clamp(280px, 42vh, 450px);
  }

  .post-title {
    font-size: clamp(24px, 7vw, 32px);
  }
}

@media (max-width: 760px) {
  .comment-tools {
    width: 100%;
    flex-direction: column;
  }

  .comments-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>



