<template>
  <div class="detail-page">
    <aside class="sidebar">
      <div class="logo">社区广场</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item">发现</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">发布</RouterLink>
        <div class="nav-item muted">通知</div>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">我</RouterLink>
        <div v-else class="nav-item muted">我</div>
      </div>
    </aside>

    <main class="main">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!post" class="loading">未找到帖子</div>
      <div v-else class="detail-body">
        <div class="gallery" v-if="post.images?.length">
          <el-carousel height="520px" arrow="hover">
            <el-carousel-item v-for="(img, idx) in post.images" :key="idx">
              <img :src="img" class="gallery-img" />
            </el-carousel-item>
          </el-carousel>
        </div>
        <div class="info">
          <div class="title">{{ post.title }}</div>
          <div class="meta">
            <span>{{ post.user?.nickname || '旅人' }}</span>
            <span class="light">· 浏览 {{ post.view_count || 0 }}</span>
          </div>
          <p class="content">{{ post.content }}</p>
          <div class="tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="actions">
            <el-button @click="toggleLike(post)" type="primary" plain>
              <span class="heart" :class="{ active: post._liked }">❤</span> {{ post.like_count || 0 }}
            </el-button>
            <el-button @click="toggleFav(post)" type="success" plain>
              <span class="star" :class="{ active: post._fav }">⭐星</span> {{ post.favorite_count || 0 }}
            </el-button>
          </div>

          <div class="comments">
            <h4>留言</h4>
            <div class="comment-input">
              <el-input v-model="commentText" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
              <el-button type="primary" size="small" @click="submitComment()">发布</el-button>
            </div>
            <div class="comment-list">
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-head">
                  <span class="c-author">{{ c.user?.nickname || '旅人' }}</span>
                  <span class="c-time">{{ formatTime(c.created_at) }}</span>
                </div>
                <div class="c-body">{{ c.content }}</div>
                <div class="c-actions">
                  <span class="c-btn" @click="likeComment(c)">❤️ {{ c.like_count || 0 }}</span>
                  <span class="c-btn" @click="toggleReply(c)">追评</span>
                </div>
                <div v-if="c._showReply" class="reply-box">
                  <el-input
                    v-model="c._replyText"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 3 }"
                  />
                  <el-button size="small" @click="submitComment(c)">发布追评</el-button>
                </div>
                <div class="replies" v-if="c.replies?.length">
                  <div v-for="r in c.replies" :key="r.id" class="reply-item">
                    <div class="comment-head">
                      <span class="c-author">{{ r.user?.nickname || '旅人' }}</span>
                      <span class="c-time">{{ formatTime(r.created_at) }}</span>
                    </div>
                    <div class="c-body">{{ r.content }}</div>
                    <div class="c-actions">
                      <span class="c-btn" @click="likeComment(r)">❤️ {{ r.like_count || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const route = useRoute()
const auth = useAuthStore()

const post = ref(null)
const loading = ref(false)
const comments = ref([])
const commentText = ref('')

const postId = computed(() => {
  const q = route.params.id || route.query.postsid || ''
  return q
})

const fetchPost = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/${postId.value}`)
    post.value = res.data?.data
    if (post.value) {
      post.value._liked = false
      post.value._fav = false
    }
  } catch (e) {
    post.value = null
  } finally {
    loading.value = false
  }
}

const fetchComments = async () => {
  try {
    const res = await axios.get(`${API_BASE}/${postId.value}/comments`)
    comments.value = res.data?.data || []
  } catch (e) {
    comments.value = []
  }
}

const toggleLike = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (updated) {
      updated._liked = res.data?.liked
      card.like_count = updated.like_count
      card._liked = updated._liked
    }
  } catch (e) {
    // ignore
  }
}

const toggleFav = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/favorite`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (updated) {
      updated._fav = res.data?.favorited
      card.favorite_count = updated.favorite_count
      card._fav = updated._fav
    }
  } catch (e) {
    // ignore
  }
}

const submitComment = async (parent) => {
  const text = parent ? parent._replyText : commentText.value
  if (!text) return
  try {
    await axios.post(`${API_BASE}/${postId.value}/comments`, {
      content: text,
      parent_id: parent?.id,
      user_id: auth.user?.id,
    })
    if (parent) {
      parent._replyText = ''
      parent._showReply = false
    } else {
      commentText.value = ''
    }
    await fetchComments()
  } catch (e) {
    // ignore
  }
}

const toggleReply = (c) => {
  c._showReply = !c._showReply
  if (!c._replyText) c._replyText = ''
}

const likeComment = async (c) => {
  try {
    const res = await axios.post(`${API_BASE}/comments/${c.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (updated) {
      c.like_count = updated.like_count
    }
  } catch (e) {
    // ignore
  }
}

const formatTime = (t) => (t ? new Date(t).toLocaleString() : '')

onMounted(async () => {
  await fetchPost()
  await fetchComments()
})
</script>

<style scoped>
.detail-page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #f7f8fa;
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
  color: #ff2442;
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
.main {
  overflow-y: auto;
  padding: 20px;
}
.loading {
  padding: 40px;
}
.detail-body {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
}
.gallery-img {
  width: 100%;
  height: 520px;
  object-fit: cover;
  border-radius: 12px;
}
.info {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}
.title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}
.meta {
  color: #777;
  font-size: 13px;
}
.meta .light {
  margin-left: 6px;
}
.content {
  margin: 12px 0;
  line-height: 1.6;
  color: #222;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.tag {
  background: #f1f5ff;
  color: #2f54eb;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.heart {
  color: #bbb;
}
.heart.active {
  color: #ff2442;
}
.star {
  color: #b5b5b5;
}
.star.active {
  color: #f5a524;
}
.comments {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
.comment-input {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.comment-item,
.reply-item {
  background: #fafafa;
  border-radius: 12px;
  padding: 10px;
}
.comment-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}
.c-body {
  margin: 6px 0;
  color: #222;
}
.c-actions {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}
.c-btn {
  cursor: pointer;
}
.reply-box {
  margin-top: 8px;
}
.replies {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
@media (max-width: 900px) {
  .detail-page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .detail-body {
    grid-template-columns: 1fr;
  }
}
</style>
