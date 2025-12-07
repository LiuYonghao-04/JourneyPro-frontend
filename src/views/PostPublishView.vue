<template>
  <div class="xhs-shell">
    <aside class="sidebar">
      <div class="logo">小红书</div>
      <nav class="side-nav">
        <RouterLink to="/posts" class="nav-item">发现</RouterLink>
        <div class="nav-item active">发布</div>
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
      <section class="composer-card">
        <div class="composer-left">
          <div class="composer-title">发布灵感</div>
          <p>分享你的旅行/美食/摄影故事</p>
        </div>
        <div class="composer-right">
          <el-input v-model="form.title" placeholder="标题（例如：周末小众海边 24h）" />
          <el-input
            v-model="form.content"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="写点描述，体验、交通、预算、推荐..."
          />
          <el-input
            v-model="form.imageText"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 3 }"
            placeholder="图片 URL，逗号或回车分隔"
          />
          <el-input v-model="form.tagsText" placeholder="标签：美食, 夜景, 穿搭..." />
          <div class="composer-actions">
            <el-button type="danger" :loading="submitting" @click="submitPost">发布</el-button>
            <span v-if="error" class="error">{{ error }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const auth = useAuthStore()
const router = useRouter()

const submitting = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  content: '',
  imageText: '',
  tagsText: '',
})

const parseImages = (txt) =>
  txt
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

const parseTags = (txt) =>
  txt
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

const submitPost = async () => {
  if (!form.title || !form.content) {
    error.value = '标题和内容必填'
    return
  }
  submitting.value = true
  error.value = ''
  const payload = {
    title: form.title,
    content: form.content,
    images: parseImages(form.imageText),
    tags: parseTags(form.tagsText),
    user_id: auth.user?.id,
  }
  try {
    await axios.post(API_BASE, payload)
    form.title = ''
    form.content = ''
    form.imageText = ''
    form.tagsText = ''
    error.value = '发布成功'
    router.push('/posts')
  } catch (e) {
    error.value = '发布失败'
  } finally {
    submitting.value = false
  }
}
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
  text-decoration: none;
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
  padding: 20px;
}
.composer-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  padding: 16px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.composer-title {
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 6px;
}
.composer-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.error {
  color: #e03131;
  font-size: 13px;
}

@media (max-width: 780px) {
  .xhs-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
}
</style>
