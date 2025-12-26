<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <nav class="nav">
        <RouterLink to="/posts" class="nav-item">Discover</RouterLink>
        <RouterLink to="/posts/publish" class="nav-item">Publish</RouterLink>
        <div class="nav-item active">Notifications</div>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </nav>
    </aside>

    <main class="content">
      <header class="top">
        <h2>Notifications</h2>
        <div class="hint">Likes &middot; Favorites &middot; Comments</div>
      </header>

      <section v-if="!auth.user" class="empty">
        <p>Please login to view your notifications.</p>
        <el-button type="primary" @click="$router.push('/login')">Login</el-button>
      </section>

      <section v-else-if="activeType !== 'chat'" class="list" v-loading="loading">
        <div class="filter">
          <el-button
            v-for="c in categories"
            :key="c.key"
            size="small"
            :type="activeType === c.key ? 'primary' : 'default'"
            @click="switchType(c.key)"
          >
            {{ c.label }}<span v-if="countMap[c.key]"> ({{ countMap[c.key] }})</span>
          </el-button>
        </div>
        <div v-if="filteredItems.length === 0" class="empty">
          <p>No notifications yet.</p>
        </div>
        <div v-else>
          <div v-for="(item, idx) in filteredItems" :key="idx" class="card">
            <RouterLink
              class="avatar"
              v-if="item.actor_id"
              :to="`/person?userid=${item.actor_id}`"
            >
              <CroppedImage :src="item.avatar_url || placeholder" class="avatar-img" :aspect-ratio="1" />
            </RouterLink>
            <div class="avatar" v-else>
              <CroppedImage :src="item.avatar_url || placeholder" class="avatar-img" :aspect-ratio="1" />
            </div>
            <div class="body">
              <div class="row">
                <span class="name">{{ item.nickname || 'Someone' }}</span>
                <span class="action" :class="item.type">{{ label(item.type) }}</span>
                <RouterLink v-if="item.post_id" class="post" :to="`/posts/postsid=${item.post_id}`">
                  {{ item.title }}
                </RouterLink>
                <span v-else class="post">you</span>
              </div>
              <div v-if="item.content" class="content">{{ item.content }}</div>
              <div class="time">{{ formatTime(item.created_at) }}</div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="chat-wrap" v-loading="chatLoading">
        <div class="chat-filter">
          <el-button
            v-for="c in categories"
            :key="c.key"
            size="small"
            :type="activeType === c.key ? 'primary' : 'default'"
            @click="switchType(c.key)"
          >
            {{ c.label }}<span v-if="countMap[c.key]"> ({{ countMap[c.key] }})</span>
          </el-button>
        </div>
        <div class="chat-box">
          <div class="chat-sidebar">
            <div class="chat-sidebar-title">Chats</div>
            <div class="chat-search">
              <el-input
                v-model="searchKey"
                placeholder="Search by nickname or ID"
                size="small"
                clearable
                @change="searchUsers"
                @clear="() => { searchResults = [] }"
              />
              <div v-if="searchResults.length" class="search-results">
                <div
                  v-for="u in searchResults"
                  :key="u.id"
                  class="search-item"
                  @click="startChatWithUser(u)"
                >
                  <RouterLink :to="`/person?userid=${u.id}`">
                    <CroppedImage :src="u.avatar_url || placeholder" class="chat-avatar" :aspect-ratio="1" />
                  </RouterLink>
                  <div class="search-text">
                    <div class="chat-name">{{ u.nickname || u.username || ('User ' + u.id) }}</div>
                    <div class="chat-time">ID: {{ u.id }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="conversations.length === 0" class="chat-empty">No conversations yet.</div>
            <div
              v-for="c in conversations"
              :key="c.peer_id"
              class="chat-conv"
              :class="{ active: activePeerId === c.peer_id }"
              @click="openConversation(c.peer_id)"
            >
              <RouterLink :to="`/person?userid=${c.peer_id}`">
                <CroppedImage class="chat-avatar" :src="c.avatar_url || placeholder" :aspect-ratio="1" />
              </RouterLink>
              <div class="chat-conv-main">
                <div class="chat-conv-top">
                  <span class="chat-name">{{ c.nickname || ('User ' + c.peer_id) }}</span>
                  <span class="chat-time">{{ formatTime(c.last_time) }}</span>
                </div>
                <div class="chat-conv-bottom">
                  <span class="chat-preview">{{ c.last_content || 'Start chatting' }}</span>
                  <span v-if="c.unreadCount" class="chat-badge">{{ c.unreadCount }}</span>
                </div>
              </div>
            </div>
          </div>
            <div class="chat-panel" v-if="activePeerId">
              <div class="chat-panel-header">
                <div class="chat-peer">{{ activePeer?.nickname || ('User ' + activePeerId) }}</div>
              </div>
              <div class="chat-messages" ref="messageContainer">
              <div
                v-for="msg in chatMessages"
                :key="msg.id || msg.local_id"
                class="chat-bubble"
                :class="{ me: msg.sender_id === auth.user.id }"
              >
                <div class="chat-text">{{ msg.content }}</div>
                <div class="chat-meta">{{ formatTime(msg.created_at) }}</div>
              </div>
            </div>
              <div class="chat-input">
                <div class="chat-toolbar">
                  <el-popover placement="top-start" width="240" trigger="click" v-model:visible="emojiVisible">
                    <template #reference>
                      <el-button size="small" text>Emoji</el-button>
                    </template>
                    <div class="emoji-grid">
                      <span v-for="(em, idx) in emojis" :key="idx" class="emoji-cell" @click="addEmoji(em)">
                        {{ em }}
                      </span>
                    </div>
                  </el-popover>
                </div>
                <el-input
                  v-model="chatInput"
                  type="textarea"
                  rows="2"
                  placeholder="Type a message"
                  @keydown.enter.prevent="sendMessage"
                />
                <div class="chat-actions">
                  <el-button type="primary" @click="sendMessage" :loading="chatSending">Send</el-button>
                </div>
              </div>
            </div>
          <div class="chat-panel empty-state" v-else>
            <p>Select a conversation to start chatting.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import CroppedImage from '../components/CroppedImage.vue'
import { API_CHAT, API_NOTIFICATIONS } from '../config/api'

const API_BASE = API_NOTIFICATIONS
const CHAT_BASE = API_CHAT
const auth = useAuthStore()
const items = ref([])
const loading = ref(false)
const placeholder = 'https://placehold.co/80x80'
let es = null
const route = useRoute()
const router = useRouter()
const categories = [
  { key: 'all', label: 'All' },
  { key: 'like', label: 'Likes' },
  { key: 'favorite', label: 'Favorites' },
  { key: 'comment', label: 'Comments' },
  { key: 'follow', label: 'Follows' },
  { key: 'chat', label: 'Chat' },
]
const activeType = ref('all')
const filteredItems = computed(() =>
  activeType.value === 'all' ? items.value : items.value.filter((it) => it.type === activeType.value)
)

const conversations = ref([])
const chatMessages = ref([])
const activePeerId = ref(null)
const chatInput = ref('')
const chatLoading = ref(false)
const chatSending = ref(false)
const messageContainer = ref(null)
const emojiVisible = ref(false)
const emojis = [
  '\u{1F600}',
  '\u{1F603}',
  '\u{1F604}',
  '\u{1F601}',
  '\u{1F606}',
  '\u{1F979}',
  '\u{1F60A}',
  '\u{1F609}',
  '\u{1F60D}',
  '\u{1F618}',
  '\u{1F61C}',
  '\u{1F92A}',
  '\u{1F60E}',
  '\u{1F914}',
  '\u{1F928}',
  '\u{1F634}',
  '\u{1F637}',
  '\u{1F912}',
  '\u{1F915}',
  '\u{1F92E}',
  '\u{1F973}',
  '\u{1F92F}',
  '\u{1F607}',
  '\u{1F62D}',
  '\u{1F621}',
  '\u{1F44D}',
  '\u{1F44E}',
  '\u{1F64F}',
  '\u{1F44F}',
  '\u{1F44C}',
  '\u{1F91D}',
  '\u{1F4AA}',
  '\u{1F525}',
  '\u{2728}',
  '\u{2764}\u{FE0F}',
  '\u{1F494}',
  '\u{1F4AF}',
  '\u{1F389}',
  '\u{1F381}',
  '\u{1F31F}',
  '\u{1F340}',
  '\u{1F354}',
  '\u{1F355}',
  '\u{1F35C}',
  '\u{1F363}',
  '\u{1F37A}',
  '\u{2615}\u{FE0F}',
]
const searchKey = ref('')
const searchResults = ref([])
const searchLoading = ref(false)

const activePeer = computed(() => conversations.value.find((c) => c.peer_id === activePeerId.value))
const chatUnread = computed(() => conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0))
const countMap = computed(() => {
  const m = { all: items.value.length, chat: chatUnread.value }
  items.value.forEach((it) => {
    m[it.type] = (m[it.type] || 0) + 1
  })
  return m
})

const fetchData = async () => {
  if (!auth.user) return
  loading.value = true
  try {
    const res = await axios.get(API_BASE, { params: { user_id: auth.user.id } })
    items.value = res.data?.data || []
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

const setupStream = () => {
  if (!auth.user) return
  if (es) es.close()
  es = new EventSource(`${API_BASE}/stream?user_id=${auth.user.id}`)
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      if (data.connected) return
       // chat pushes are handled separately
      if (data.type === 'chat') {
        handleIncomingChat(data)
        return
      }
      items.value = [data, ...items.value].slice(0, 100)
    } catch (e) {
      // ignore parse errors
    }
  }
  es.onerror = () => {
    es?.close()
    es = null
  }
}

const formatTime = (ts) => (ts ? new Date(ts).toLocaleString() : '')
const label = (type) => {
  if (type === 'like') return 'liked your post'
  if (type === 'favorite') return 'favorited your post'
  if (type === 'comment') return 'commented on your post'
  if (type === 'follow') return 'followed you'
  if (type === 'chat') return 'sent you a message'
  return 'activity'
}

const fetchConversations = async () => {
  if (!auth.user) return
  chatLoading.value = true
  try {
    const res = await axios.get(`${CHAT_BASE}/list`, { params: { user_id: auth.user.id } })
    const data = res.data?.data || []
    conversations.value = data.map((c) => ({
      ...c,
      last_content: c.content,
      last_time: c.created_at,
      unreadCount: c.unreadCount || 0,
    }))
  } catch (e) {
    conversations.value = []
  } finally {
    chatLoading.value = false
  }
}

const searchUsers = async () => {
  if (!auth.user) return
  const keyword = searchKey.value.trim()
  if (!keyword) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  try {
    const res = await axios.get(`${CHAT_BASE}/search`, {
      params: { keyword, user_id: auth.user.id },
    })
    searchResults.value = res.data?.data || []
  } catch (e) {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

const startChatWithUser = (user) => {
  if (!user?.id) return
  const existing = conversations.value.find((c) => c.peer_id === user.id)
  if (!existing) {
    conversations.value.unshift({
      peer_id: user.id,
      nickname: user.nickname || user.username || `User ${user.id}`,
      avatar_url: user.avatar_url,
      last_content: 'New chat',
      last_time: new Date().toISOString(),
      unreadCount: 0,
    })
  }
  activePeerId.value = user.id
  searchResults.value = []
  searchKey.value = ''
  fetchHistory(user.id)
}

const addEmoji = (emoji) => {
  chatInput.value = (chatInput.value || '') + emoji
  emojiVisible.value = false
}

const fetchHistory = async (peerId) => {
  if (!auth.user || !peerId) return
  chatLoading.value = true
  try {
    const res = await axios.get(`${CHAT_BASE}/history`, {
      params: { user_id: auth.user.id, peer_id: peerId },
    })
    chatMessages.value = res.data?.data || []
    await nextTick()
    scrollToBottom()
  } catch (e) {
    chatMessages.value = []
  } finally {
    chatLoading.value = false
  }
}

const openConversation = (peerId) => {
  activePeerId.value = peerId
  const target = conversations.value.find((c) => c.peer_id === peerId)
  if (target) target.unreadCount = 0
  fetchHistory(peerId)
}

const scrollToBottom = () => {
  if (!messageContainer.value) return
  requestAnimationFrame(() => {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  })
}

const upsertConversation = (payload) => {
  const peerId = payload.peer_id
  const idx = conversations.value.findIndex((c) => c.peer_id === peerId)
  const base = {
    peer_id: peerId,
    nickname: payload.nickname,
    avatar_url: payload.avatar_url,
    last_content: payload.content,
    last_time: payload.created_at || new Date().toISOString(),
    unreadCount: 0,
  }
  if (idx >= 0) {
    const existing = conversations.value[idx]
    const updated = {
      ...existing,
      ...base,
      unreadCount:
        peerId === activePeerId.value ? 0 : (existing.unreadCount || 0) + (payload.incrementUnread ? 1 : 0),
    }
    conversations.value.splice(idx, 1)
    conversations.value.unshift(updated)
  } else {
    conversations.value.unshift({
      ...base,
      unreadCount: peerId === activePeerId.value ? 0 : (payload.incrementUnread ? 1 : 0),
    })
  }
}

const handleIncomingChat = (data) => {
  const peerId = data.actor_id
  const isActive = peerId === activePeerId.value
  upsertConversation({
    peer_id: peerId,
    nickname: data.actor_nickname,
    avatar_url: data.actor_avatar,
    content: data.content,
    created_at: data.created_at,
    incrementUnread: !isActive,
  })
  if (isActive) {
    chatMessages.value.push({
      sender_id: peerId,
      receiver_id: auth.user.id,
      content: data.content,
      created_at: data.created_at || new Date().toISOString(),
      id: `incoming-${Date.now()}`,
    })
    scrollToBottom()
  }
}

const sendMessage = async () => {
  if (!auth.user || !activePeerId.value) return
  const content = (chatInput.value || '').trim()
  if (!content) return
  chatSending.value = true
  try {
    const res = await axios.post(`${CHAT_BASE}/send`, {
      sender_id: auth.user.id,
      receiver_id: activePeerId.value,
      content,
    })
    const msg = res.data?.data || {
      sender_id: auth.user.id,
      receiver_id: activePeerId.value,
      content,
      created_at: new Date().toISOString(),
      id: `local-${Date.now()}`,
    }
    chatMessages.value.push(msg)
    upsertConversation({
      peer_id: activePeerId.value,
      nickname: activePeer.value?.nickname,
      avatar_url: activePeer.value?.avatar_url,
      content,
      created_at: msg.created_at,
      incrementUnread: false,
    })
    chatInput.value = ''
    scrollToBottom()
  } catch (e) {
    // ignore
  } finally {
    chatSending.value = false
  }
}

onMounted(() => {
  fetchData()
  setupStream()
})
onUnmounted(() => {
  es?.close()
})

watch(
  () => auth.user?.id,
  () => {
    fetchData()
    fetchConversations()
    setupStream()
  }
)

watch(
  () => route.params.type,
  (val) => {
    activeType.value = (val || 'all')
    if (activeType.value === 'chat') {
      fetchConversations()
    }
  },
  { immediate: true }
)

const switchType = (key) => {
  router.push(key === 'all' ? '/notifications' : `/notifications/${key}`)
}

watch(
  () => activePeerId.value,
  () => {
    nextTick(() => scrollToBottom())
  }
)
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: calc(100vh - 56px);
  background: var(--bg-main);
}
.sidebar {
  background: var(--panel);
  border-right: 1px solid var(--panel-border);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: calc(100vh - 56px);
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
  cursor: pointer;
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
  padding: 18px 20px;
  overflow-y: auto;
}
.top {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
.list {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  min-height: 200px;
}
.card {
  display: flex;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid var(--panel-border);
}
.card:last-child {
  border-bottom: none;
}
.avatar {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: grid;
  place-items: center;
}
.avatar-img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--badge);
}
.body {
  flex: 1;
}
.row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.name {
  font-weight: 700;
}
.action {
  color: var(--muted);
}
.action.like {
  color: #ff2442;
}
.action.favorite {
  color: #f5a524;
}
.action.comment {
  color: #1677ff;
}
.post {
  color: #1677ff;
}
.badge {
  background: #f1f3f5;
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}
.content {
  margin: 4px 0;
  color: var(--fg);
}
.time {
  color: var(--muted);
  font-size: 12px;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
}
.chat-wrap {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  min-height: 520px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chat-filter {
  display: flex;
  gap: 8px;
}
.chat-box {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 10px;
  height: 640px;
}
.chat-sidebar {
  border-right: 1px solid var(--panel-border);
  padding-right: 10px;
  overflow-y: auto;
}
.chat-sidebar-title {
  font-weight: 700;
  margin-bottom: 8px;
}
.chat-search {
  margin-bottom: 10px;
  position: relative;
}
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: var(--panel) !important;
  color: var(--fg) !important;
  border-color: var(--panel-border) !important;
}
:deep(.el-input__inner) {
  color: var(--fg);
}
.search-results {
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  max-height: 220px;
  overflow-y: auto;
}
.search-item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
}
.search-item:hover {
  background: #f6f7f9;
}
.search-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat-conv {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
}
.chat-conv:hover,
.chat-conv.active {
  background: #9f9d9d;
}
.chat-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f3f3;
}
.chat-conv-main {
  flex: 1;
  min-width: 0;
}
.chat-conv-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.chat-name {
  font-weight: 700;
}
.chat-time {
  color: var(--muted);
}
.chat-conv-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.chat-preview {
  color: var(--muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-badge {
  min-width: 18px;
  padding: 2px 6px;
  background: #ff4d4f;
  color: var(--fg);
  border-radius: 12px;
  font-size: 12px;
}
.chat-panel {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--panel-border);
  padding-left: 10px;
}
.chat-panel-header {
  padding: 6px 0;
  border-bottom: 1px solid var(--panel-border);
  font-weight: 700;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chat-bubble {
  max-width: 70%;
  background: #f4f6f8;
  padding: 10px 12px;
  border-radius: 14px;
  align-self: flex-start;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.04);
}
.chat-bubble.me {
  background: #4b8afc;
  color: var(--fg);
  align-self: flex-end;
}
.chat-text {
  font-size: 14px;
}
.chat-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}
.chat-bubble.me .chat-meta {
  color: rgba(255, 255, 255, 0.8);
}
.chat-input {
  border-top: 1px solid var(--panel-border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-toolbar {
  display: flex;
  gap: 8px;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 6px;
  color: var(--muted);
}
.emoji-cell {
  cursor: pointer;
  font-size: 18px;
  text-align: center;
  line-height: 32px;
  border-radius: 8px;
}
.emoji-cell:hover {
  background: #f4f5f7;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
}
.chat-empty {
  color: var(--muted);
  padding: 12px;
}
.empty-state {
  justify-content: center;
  align-items: center;
  color: var(--muted);
}
@media (max-width: 780px) {
  .page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .chat-box {
    grid-template-columns: 1fr;
    height: auto;
  }
  .chat-panel {
    border-left: none;
    padding-left: 0;
  }
}
</style>
