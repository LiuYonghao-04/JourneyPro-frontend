<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">社区广场</div>
      <div class="nav">
        <RouterLink to="/posts" class="nav-item active">发现</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">发布</RouterLink>
        <div class="nav-item muted">通知</div>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">我</RouterLink>
        <div v-else class="nav-item muted">我</div>
      </div>
      <div v-if="!auth.user" class="login-card">
        <el-button type="primary" class="w-full" @click="$router.push('/login')">登录/发布</el-button>
        <ul>
          <li>刷到更懂你的优质内容</li>
          <li>搜索看到评论、爆料信息</li>
          <li>查看收藏、点赞的笔记</li>
        </ul>
      </div>
    </aside>

    <main class="content">
      <header class="topbar">
        <div class="search">
          <el-input
            v-model="search"
            placeholder="搜索你感兴趣的"
            prefix-icon="el-icon-search"
            @input="handleSearch"
          />
        </div>
        <div class="top-actions">
          <el-button text>创作中心</el-button>
          <el-button text>业务合作</el-button>
        </div>
      </header>

      <section class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="chip"
          :class="{ active: activeTab === tab }"
          @click="setTab(tab)"
        >
          {{ tab }}
        </button>
        <button class="chip outline" @click="switchSort">
          {{ sort === 'latest' ? '最新' : '最热' }}
        </button>
      </section>

      <section class="feed">
        <div v-if="loading && posts.length === 0" class="skeleton-list">
          <div v-for="n in 6" :key="n" class="skeleton-card" />
        </div>

        <div v-else-if="!loading && filteredPosts.length === 0" class="empty">
          <div>暂无内容，去发布一篇吧</div>
          <el-button type="primary" @click="$router.push('/posts/publish')">去发布</el-button>
        </div>

        <div v-else class="waterfall">
          <div
            v-for="card in filteredPosts"
            :key="card._dupKey || card.id"
            class="card"
            @click="openDetail(card)"
          >
            <div class="cover" v-if="card.cover_image || (card.images && card.images[0])">
              <div v-if="!loadedMap[card._dupKey || card.id]" class="img-skeleton" />
              <img
                :src="card.cover_image || card.images?.[0]"
                :alt="card.title"
                loading="lazy"
                @load="markLoaded(card)"
              />
              <div class="floating-tag" v-if="card.tags?.length">{{ card.tags[0] }}</div>
            </div>
            <div class="card-body">
              <div class="card-title">{{ card.title }}</div>
              <div class="card-meta">
                <span>{{ card.user?.nickname || '旅人' }}</span>
                <span v-if="card.tags?.length"> · {{ card.tags.slice(0, 2).join(' / ') }}</span>
              </div>
              <div class="card-footer">
                <div class="icon-btn" @click.stop="toggleLike(card)">
                  <span class="heart" :class="{ active: card._liked }">❤️</span> {{ card.like_count || 0 }}
                </div>
                <div class="icon-btn" @click.stop="toggleFav(card)">
                  <span class="star" :class="{ active: card._fav }">⭐</span> {{ card.favorite_count || 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref="sentinel" class="sentinel" />
        <div v-if="loading && posts.length > 0" class="skeleton-more">
          <div v-for="n in 3" :key="n" class="skeleton-card small" />
        </div>
        <div v-if="noMore" class="no-more">已经到底了</div>
      </section>
    </main>

    <el-dialog v-model="detailVisible" :show-close="true" width="72%" top="5vh" class="detail-dialog">
      <template #header>
        <div class="detail-header">
          <div class="detail-author">
            <img v-if="detail?.user?.avatar_url" :src="detail.user.avatar_url" class="avatar" />
            <span>{{ detail?.user?.nickname || '旅人' }}</span>
          </div>
          <el-button v-if="auth.user && detail?.user?.id === auth.user.id" text disabled>我的帖子</el-button>
          <el-button v-else type="danger" plain>关注</el-button>
        </div>
      </template>
      <div class="detail-body" v-if="detail">
        <div class="detail-gallery" v-if="detail.images?.length">
          <el-carousel height="480px" arrow="hover">
            <el-carousel-item v-for="(img, idx) in detail.images" :key="idx">
              <img :src="img" class="gallery-img" />
            </el-carousel-item>
          </el-carousel>
        </div>
        <div class="detail-content">
          <h3>{{ detail.title }}</h3>
          <p class="content-text">{{ detail.content }}</p>
          <div class="tags">
            <span v-for="tag in detail.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="detail-stats">
            <span>❤️ {{ detail.like_count || 0 }}</span>
            <span>📌 {{ detail.favorite_count || 0 }}</span>
            <span>👁️ {{ detail.view_count || 0 }}</span>
          </div>
          <div class="detail-actions">
            <el-button @click="toggleLike(detail)" type="primary" plain>点赞</el-button>
            <el-button @click="toggleFav(detail)" type="success" plain>收藏</el-button>
            <el-button @click="detailVisible = false" type="text">关闭</el-button>
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
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const auth = useAuthStore()

const tabs = ref(['推荐'])
const activeTab = ref('推荐')
const sort = ref('latest')
const search = ref('')
const posts = ref([])
const basePosts = ref([])
const loadedMap = ref({})
const loading = ref(false)
const noMore = ref(false)
const sentinel = ref(null)
const limit = 20
const offset = ref(0)
const dupRounds = ref(0)

const fetchTags = async () => {
  try {
    const res = await axios.get(`${API_BASE}/tags/list`)
    const names = res.data?.data?.map((t) => t.name).filter(Boolean) || []
    const uniq = Array.from(new Set(names))
    tabs.value = ['推荐', ...uniq]
  } catch (e) {
    // ignore
  }
}

const fetchPosts = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    if (reset) {
      posts.value = []
      basePosts.value = []
      loadedMap.value = {}
      offset.value = 0
      noMore.value = false
      dupRounds.value = 0
    }
    const res = await axios.get(API_BASE, {
      params: { limit, offset: offset.value, sort: sort.value },
    })
    const list = res.data?.data || []
    if (list.length < limit) noMore.value = true
    posts.value = reset ? list : [...posts.value, ...list]
    if (basePosts.value.length === 0 && list.length > 0) {
      basePosts.value = list
    }
    offset.value += list.length
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
  }
}

const toggleLike = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`, { user_id: auth.user?.id })
    const updated = res.data?.data
    if (updated) {
      updated._liked = res.data?.liked
      replacePost(updated)
    }
  } catch (e) {
    // ignore
  }
}

const toggleFav = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/favorite`, { user_id: auth.user?.id })
    const updated = res.data?.data
    const favorited = res.data?.favorited
    if (updated) {
      updated._fav = favorited
      replacePost(updated)
    } else {
      card._fav = favorited
      card.favorite_count = (card.favorite_count || 0) + (favorited ? 1 : -1)
      replacePost(card)
    }
  } catch (e) {
    // ignore
  }
}

const openDetail = (card) => {
  window.location.href = `/posts/postsid=${card.id}`
}

const replacePost = (updated) => {
  const idx = posts.value.findIndex((p) => p.id === updated.id)
  if (idx > -1) posts.value[idx] = { ...posts.value[idx], ...updated }
}

const setTab = (tab) => {
  activeTab.value = tab
}

const switchSort = () => {
  sort.value = sort.value === 'latest' ? 'hot' : 'latest'
  fetchPosts(true)
}

const handleSearch = () => {
  // computed handles filtering
}

const filteredPosts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return posts.value.filter((p) => {
    const inTab = activeTab.value === '推荐' ? true : (p.tags || []).includes(activeTab.value)
    const inKw =
      !kw ||
      p.title?.toLowerCase().includes(kw) ||
      p.content?.toLowerCase().includes(kw) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(kw))
    return inTab && inKw
  })
})

const appendDuplicateBatch = () => {
  if (basePosts.value.length === 0) return
  dupRounds.value += 1
  const round = dupRounds.value
  const duplicated = basePosts.value.map((p, idx) => ({
    ...p,
    _dupKey: `${p.id}-dup-${round}-${idx}`,
  }))
  posts.value = [...posts.value, ...duplicated]
}

const setupInfiniteScroll = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !noMore.value) {
          fetchPosts()
        } else if (entry.isIntersecting && noMore.value) {
          appendDuplicateBatch()
        }
      })
    },
    { root: null, threshold: 0.1 }
  )
  if (sentinel.value) observer.observe(sentinel.value)
}

watch(sort, () => fetchPosts(true))

onMounted(() => {
  fetchTags()
  fetchPosts(true)
  setupInfiniteScroll()
})

const markLoaded = (card) => {
  const key = card._dupKey || card.id
  loadedMap.value = { ...loadedMap.value, [key]: true }
}
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #f5f6f7;
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
.login-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
  background: #fafafa;
}
.login-card ul {
  padding-left: 16px;
  margin: 8px 0 0;
  color: #777;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.more {
  margin-top: auto;
  color: #555;
  font-size: 14px;
}

.content {
  overflow-y: auto;
  padding: 12px 18px 24px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 0 8px;
}
.search {
  flex: 1;
  max-width: 520px;
}
.top-actions {
  display: flex;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 10px;
  padding: 10px 0 6px;
  flex-wrap: wrap;
}
.chip {
  border: none;
  background: #f1f2f6;
  padding: 8px 14px;
  border-radius: 16px;
  color: #444;
  cursor: pointer;
}
.chip.active {
  background: #1e1e1e;
  color: #fff;
}
.chip.outline {
  background: transparent;
  border: 1px solid #d0d0d0;
}

.feed {
  min-height: 400px;
}
.skeleton-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.skeleton-card {
  height: 260px;
  border-radius: 16px;
  background: linear-gradient(90deg, #f1f2f3 25%, #e5e7eb 50%, #f1f2f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-card.small {
  height: 140px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.empty {
  text-align: center;
  padding: 60px 0;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.waterfall {
  column-count: 4;
  column-gap: 16px;
}
@media (max-width: 1400px) {
  .waterfall {
    column-count: 3;
  }
}
@media (max-width: 1100px) {
  .waterfall {
    column-count: 2;
  }
}
@media (max-width: 780px) {
  .page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .waterfall {
    column-count: 1;
  }
}

.card {
  break-inside: avoid;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f1f1;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
}
.cover {
  position: relative;
}
.cover img {
  width: 100%;
  display: block;
  object-fit: cover;
}
.img-skeleton {
  position: absolute;
  inset: 0;
  background: #f2f2f2;
  z-index: 1;
}
.floating-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
}
.card-body {
  padding: 10px 12px 12px;
}
.card-title {
  font-weight: 700;
  font-size: 14px;
  color: #111;
  margin-bottom: 6px;
}
.card-meta {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}
.card-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  font-size: 13px;
  color: #555;
}
.icon-btn {
  padding: 6px 8px;
  border-radius: 12px;
  background: #f8f8f8;
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

.loading-more,
.no-more {
  text-align: center;
  padding: 12px;
  color: #777;
}
.sentinel {
  height: 1px;
}

.detail-dialog .detail-body {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
}
.detail-gallery {
  width: 100%;
}
.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}
.detail-content h3 {
  margin: 0 0 8px;
}
.content-text {
  white-space: pre-wrap;
  line-height: 1.5;
  color: #222;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0;
}
.tag {
  background: #f1f5ff;
  color: #2f54eb;
  border-radius: 10px;
  padding: 4px 8px;
  font-size: 12px;
}
.detail-stats {
  display: flex;
  gap: 10px;
  color: #555;
  font-size: 13px;
}
.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.detail-author {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-dialog .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comments {
  margin-top: 16px;
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
</style>
