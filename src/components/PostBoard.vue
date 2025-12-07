<template>
  <div class="xhs-shell">
    <aside class="sidebar">
      <div class="logo">小红书</div>
      <nav class="side-nav">
        <div class="nav-item active">发现</div>
        <RouterLink to="/posts/publish" class="nav-item">发布</RouterLink>
        <div class="nav-item">通知</div>
        <div class="nav-item">我</div>
      </nav>
      <div v-if="!auth.user" class="login-box">
        <el-button type="primary" class="login-btn" @click="$router.push('/login')">登录/发布</el-button>
        <ul>
          <li>刷到更懂你的优质内容</li>
          <li>搜索看到评论、爆料信息</li>
          <li>查看收藏、点赞的笔记</li>
          <li>与他人好好互动、交流</li>
        </ul>
      </div>
      <div class="more">≡ 更多</div>
    </aside>

    <main class="main">
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
          class="tab-btn"
          :class="{ active: activeTab === tab }"
          @click="setTab(tab)"
        >
          {{ tab }}
        </button>
      </section>

      <section class="feed">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else class="waterfall">
          <div v-for="card in filteredPosts" :key="card.id" class="card" @click="openDetail(card)">
            <div class="cover" v-if="card.cover_image || (card.images && card.images[0])">
              <img :src="card.cover_image || card.images?.[0]" :alt="card.title" loading="lazy" />
            </div>
            <div class="card-body">
              <div class="card-title">{{ card.title }}</div>
              <div class="card-meta">
                <span>{{ card.user?.nickname || '旅人' }}</span>
                <span> · {{ (card.tags || []).slice(0, 2).join(' / ') }}</span>
              </div>
              <div class="card-footer">
                <div class="icon-btn" @click.stop="like(card)">❤️ {{ card.like_count || 0 }}</div>
                <div class="icon-btn" @click.stop="favorite(card)">📌 {{ card.favorite_count || 0 }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <el-dialog v-model="detailVisible" :show-close="true" width="70%" top="5vh" class="detail-dialog">
      <template #header>
        <div class="detail-header">
          <div class="detail-author">
            <img v-if="detail?.user?.avatar_url" :src="detail.user.avatar_url" class="avatar" />
            <span>{{ detail?.user?.nickname || '旅人' }}</span>
          </div>
          <el-button type="danger" plain>关注</el-button>
        </div>
      </template>
      <div class="detail-body" v-if="detail">
        <div class="detail-image" v-if="detail.images?.[0] || detail.cover_image">
          <img :src="detail.images?.[0] || detail.cover_image" alt="cover" />
        </div>
        <div class="detail-content">
          <h3>{{ detail.title }}</h3>
          <p class="content-text">{{ detail.content }}</p>
          <div class="tags">
            <span v-for="tag in detail.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="detail-actions">
            <el-button @click="like(detail)" type="text">❤️ {{ detail.like_count || 0 }}</el-button>
            <el-button @click="favorite(detail)" type="text">📌 {{ detail.favorite_count || 0 }}</el-button>
            <el-button @click="detailVisible = false" type="text">关闭</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const auth = useAuthStore()

const tabs = ref(['推荐'])
const activeTab = ref('推荐')
const search = ref('')
const posts = ref([])
const loading = ref(false)
const error = ref('')
const detailVisible = ref(false)
const detail = ref(null)

const fetchPosts = async () => {
  loading.value = true
  try {
    const res = await axios.get(API_BASE)
    posts.value = res.data?.data || []
  } catch (e) {
    error.value = '加载帖子失败'
  } finally {
    loading.value = false
  }
}

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

const like = async (card) => {
  try {
    const res = await axios.post(`${API_BASE}/${card.id}/like`)
    const updated = res.data?.data
    if (updated) {
      const idx = posts.value.findIndex((p) => p.id === card.id)
      if (idx > -1) posts.value[idx] = updated
      if (detail.value?.id === card.id) detail.value = updated
    }
  } catch (e) {
    // ignore
  }
}

const favorite = async (card) => {
  try {
    await axios.post(`${API_BASE}/${card.id}/favorite`)
  } catch (e) {
    // ignore
  }
}

const openDetail = async (card) => {
  try {
    const res = await axios.get(`${API_BASE}/${card.id}`)
    detail.value = res.data?.data || card
  } catch (e) {
    detail.value = card
  } finally {
    detailVisible.value = true
  }
}

const setTab = (tab) => {
  activeTab.value = tab
}

const handleSearch = () => {
  // filtering handled in computed
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

onMounted(fetchPosts)
onMounted(fetchTags)
</script>

<style scoped>
.xhs-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: #f7f8fa;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #f0f0f0;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.logo {
  font-weight: 800;
  color: #ff2442;
  font-size: 20px;
}
.side-nav .nav-item,
.side-nav :global(.router-link-active.nav-item) {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: #4b4b4b;
}
.side-nav .nav-item.active,
.side-nav .nav-item:hover,
.side-nav :global(.router-link-active.nav-item) {
  background: #f4f5f7;
}
.login-box {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
}
.login-btn {
  width: 100%;
  margin-bottom: 8px;
}
.login-box ul {
  padding-left: 18px;
  margin: 0;
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

.main {
  overflow-y: auto;
  padding: 10px 18px 24px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
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
  gap: 12px;
  padding: 10px 0 6px;
}
.tab-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  color: #444;
}
.tab-btn.active {
  background: #1a1a1a;
  color: #fff;
}

.feed {
  min-height: 400px;
}
.loading {
  padding: 20px;
  text-align: center;
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
  .xhs-shell {
    grid-template-columns: 1fr;
  }
  .waterfall {
    column-count: 1;
  }
  .sidebar {
    display: none;
  }
}

.card {
  break-inside: avoid;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f1f1;
  cursor: pointer;
  transition: transform 0.2s;
}
.card:hover {
  transform: translateY(-2px);
}
.cover img {
  width: 100%;
  display: block;
  object-fit: cover;
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

.detail-dialog .detail-body {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
}
.detail-image img {
  width: 100%;
  border-radius: 12px;
}
.detail-content h3 {
  margin: 0 0 8px;
}
.content-text {
  white-space: pre-wrap;
  line-height: 1.5;
}
.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
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
</style>
