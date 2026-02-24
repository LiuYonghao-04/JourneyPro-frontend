<template>
  <div class="notify-page">
    <aside class="rail">
      <div class="rail-brand">Inbox</div>
      <RouterLink to="/posts" class="rail-link">Discover</RouterLink>
      <RouterLink to="/posts/publish" class="rail-link">Publish</RouterLink>
      <div class="rail-link active">Notifications</div>
      <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="rail-link">Me</RouterLink>
      <div v-else class="rail-link muted">Me</div>
    </aside>

    <main class="view">
      <header class="hero">
        <div>
          <h1>Notification Center</h1>
          <p>Likes, favorites, comments, follows and chats in one streamlined workspace.</p>
        </div>
        <div class="hero-actions" v-if="auth.user">
          <el-button @click="refreshAll">Refresh</el-button>
          <el-button type="primary" plain @click="markRead('all')">Mark all read</el-button>
        </div>
      </header>

      <section v-if="!auth.user" class="guest">
        <p>Please login to view notifications and chats.</p>
        <el-button type="primary" @click="$router.push('/login')">Login</el-button>
      </section>

      <template v-else>
        <section class="stats">
          <div class="stat-card">
            <span>Total</span>
            <strong>{{ items.length }}</strong>
          </div>
          <div class="stat-card">
            <span>Unread</span>
            <strong>{{ unreadTotal }}</strong>
          </div>
          <div class="stat-card">
            <span>Comments</span>
            <strong>{{ countMap.comment || 0 }}</strong>
          </div>
          <div class="stat-card">
            <span>Chat unread</span>
            <strong>{{ chatUnread }}</strong>
          </div>
        </section>

        <section class="tabs">
          <button
            v-for="c in categories"
            :key="c.key"
            :class="['tab', { active: activeType === c.key }]"
            @click="switchType(c.key)"
          >
            <span>{{ c.label }}</span>
            <span v-if="unreadByType[c.key]" class="unread-dot">{{ unreadByType[c.key] }}</span>
            <span v-else-if="countMap[c.key]" class="count-dot">{{ countMap[c.key] }}</span>
          </button>
          <div class="tabs-spacer"></div>
          <el-button v-if="activeType !== 'chat'" size="small" plain @click="markCurrentRead">Mark current read</el-button>
          <el-button v-else size="small" plain @click="markRead('chat')">Mark chat read</el-button>
        </section>

        <section v-if="activeType !== 'chat'" class="list">
          <article v-for="(item, idx) in filteredItems" :key="`${item.type}-${item.actor_id}-${idx}`" class="notice">
            <div class="notice-left">
              <span v-if="item.unread" class="dot-unread"></span>
              <RouterLink v-if="item.actor_id" :to="`/person?userid=${item.actor_id}`">
                <CroppedImage :src="item.avatar_url || placeholder" class="avatar" :aspect-ratio="1" />
              </RouterLink>
              <CroppedImage v-else :src="item.avatar_url || placeholder" class="avatar" :aspect-ratio="1" />
            </div>
            <div class="notice-body">
              <div class="line">
                <strong>{{ item.nickname || 'Someone' }}</strong>
                <span class="muted">{{ actionLabel(item.type) }}</span>
                <RouterLink v-if="item.post_id" :to="`/posts/postsid=${item.post_id}`" class="post-link">
                  {{ item.title }}
                </RouterLink>
                <span v-else class="muted">you</span>
              </div>
              <p v-if="item.content" class="content">{{ item.content }}</p>
              <div class="time">{{ formatTime(item.created_at) }}</div>
            </div>
          </article>
          <div v-if="filteredItems.length === 0" class="empty">No notifications in this category.</div>
        </section>

        <section v-else class="chat">
          <aside class="chat-left">
            <div class="chat-search">
              <el-input
                v-model="searchKey"
                placeholder="Search by nickname or id"
                clearable
                size="small"
                @change="searchUsers"
                @clear="searchResults = []"
              />
            </div>

            <div v-if="searchResults.length" class="search-results">
              <button v-for="u in searchResults" :key="u.id" class="search-item" @click="startChatWithUser(u)">
                <CroppedImage :src="u.avatar_url || placeholder" class="small-avatar" :aspect-ratio="1" />
                <div class="meta">
                  <div>{{ u.nickname || u.username || `User ${u.id}` }}</div>
                  <div class="muted">ID: {{ u.id }}</div>
                </div>
              </button>
            </div>

            <button
              v-for="c in conversations"
              :key="c.peer_id"
              :class="['conv', { active: activePeerId === c.peer_id }]"
              @click="openConversation(c.peer_id)"
            >
              <CroppedImage :src="c.avatar_url || placeholder" class="small-avatar" :aspect-ratio="1" />
              <div class="conv-body">
                <div class="conv-top">
                  <span>{{ c.nickname || `User ${c.peer_id}` }}</span>
                  <span class="muted">{{ formatTime(c.last_time) }}</span>
                </div>
                <div class="conv-bottom">
                  <span class="muted line-clamp">{{ c.last_content || 'Start chatting' }}</span>
                  <span v-if="c.unreadCount" class="badge">{{ c.unreadCount }}</span>
                </div>
              </div>
            </button>
            <div v-if="conversations.length === 0" class="empty">No conversations yet.</div>
          </aside>

          <div v-if="activePeerId" class="chat-main">
            <header class="chat-head">
              <div>{{ activePeer?.nickname || `User ${activePeerId}` }}</div>
            </header>

            <div class="messages" ref="messageContainer">
              <div
                v-for="msg in chatMessages"
                :key="msg.id || msg.local_id"
                :class="['bubble', { me: msg.sender_id === auth.user.id }]"
              >
                <div>{{ msg.content }}</div>
                <div class="bubble-time">{{ formatTime(msg.created_at) }}</div>
              </div>
            </div>

            <footer class="composer">
              <div class="composer-tools">
                <el-popover placement="top-start" width="220" trigger="click" v-model:visible="emojiVisible">
                  <template #reference>
                    <el-button size="small" text>Emoji</el-button>
                  </template>
                  <div class="emoji-grid">
                    <span v-for="(em, idx) in emojis" :key="idx" class="emoji" @click="addEmoji(em)">{{ em }}</span>
                  </div>
                </el-popover>
                <span class="muted">Enter to send</span>
              </div>
              <el-input
                v-model="chatInput"
                type="textarea"
                :rows="2"
                placeholder="Type a message"
                @keydown.enter.prevent="sendMessage"
              />
              <div class="send-row">
                <el-button type="primary" :loading="chatSending" @click="sendMessage">Send</el-button>
              </div>
            </footer>
          </div>
          <div v-else class="chat-empty">
            Select a conversation to start chatting.
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import CroppedImage from '../components/CroppedImage.vue'

const API_BASE = 'http://localhost:3001/api/notifications'
const CHAT_BASE = 'http://localhost:3001/api/chat'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const placeholder = 'https://placehold.co/80x80'
const items = ref([])
const state = ref(null)
const activeType = ref('all')
const conversations = ref([])
const chatMessages = ref([])
const activePeerId = ref(null)
const chatInput = ref('')
const chatSending = ref(false)
const messageContainer = ref(null)
const emojiVisible = ref(false)
const searchKey = ref('')
const searchResults = ref([])
let es = null

const categories = [
  { key: 'all', label: 'All' },
  { key: 'like', label: 'Likes' },
  { key: 'favorite', label: 'Favorites' },
  { key: 'comment', label: 'Comments' },
  { key: 'follow', label: 'Follows' },
  { key: 'chat', label: 'Chat' },
]

const emojis = [':)', ':D', '<3', 'wow', 'ok', 'go', 'nice', 'gg', 'lol', 'ty']

const filteredItems = computed(() =>
  activeType.value === 'all' ? items.value : items.value.filter((it) => it.type === activeType.value)
)

const activePeer = computed(() => conversations.value.find((c) => c.peer_id === activePeerId.value))
const chatUnread = computed(() => conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0))

const countMap = computed(() => {
  const m = { all: items.value.length, chat: chatUnread.value }
  items.value.forEach((it) => {
    m[it.type] = (m[it.type] || 0) + 1
  })
  return m
})

const unreadByType = computed(() => {
  const m = { all: 0, like: 0, favorite: 0, comment: 0, follow: 0, chat: chatUnread.value }
  items.value.forEach((it) => {
    if (it.unread) {
      m.all += 1
      m[it.type] = (m[it.type] || 0) + 1
    }
  })
  return m
})

const unreadTotal = computed(() => unreadByType.value.all + (chatUnread.value || 0))

const formatTime = (ts) => (ts ? new Date(ts).toLocaleString() : '')
const actionLabel = (type) => {
  if (type === 'like') return 'liked your post'
  if (type === 'favorite') return 'favorited your post'
  if (type === 'comment') return 'commented on your post'
  if (type === 'follow') return 'followed you'
  if (type === 'chat') return 'sent you a message'
  return 'activity'
}

const fetchState = async () => {
  if (!auth.user?.id) return
  try {
    const res = await axios.get(`${API_BASE}/state`, { params: { user_id: auth.user.id } })
    state.value = res.data?.state || null
  } catch {
    state.value = null
  }
}

const fetchData = async () => {
  if (!auth.user) return
  try {
    const res = await axios.get(API_BASE, { params: { user_id: auth.user.id } })
    items.value = res.data?.data || []
    state.value = res.data?.state || state.value
  } catch {
    items.value = []
  }
}

const markRead = async (type = 'all') => {
  if (!auth.user?.id) return
  try {
    const res = await axios.post(`${API_BASE}/read`, {
      user_id: auth.user.id,
      type,
      ts: new Date().toISOString(),
    })
    state.value = res.data?.state || state.value
    if (type === 'chat' || type === 'all') {
      conversations.value = (conversations.value || []).map((c) => ({ ...c, unreadCount: 0 }))
    }
    await fetchData()
  } catch {
    // ignore
  }
}

const markCurrentRead = () => {
  markRead(activeType.value === 'all' ? 'all' : activeType.value)
}

const setupStream = () => {
  if (!auth.user) return
  if (es) es.close()
  es = new EventSource(`${API_BASE}/stream?user_id=${auth.user.id}`)
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      if (data.connected) return
      if (data.type === 'chat') {
        handleIncomingChat(data)
        return
      }
      items.value = [{ ...data, unread: true }, ...items.value].slice(0, 140)
    } catch {
      // ignore parse errors
    }
  }
  es.onerror = () => {
    es?.close()
    es = null
  }
}

const fetchConversations = async () => {
  if (!auth.user) return
  try {
    const res = await axios.get(`${CHAT_BASE}/list`, { params: { user_id: auth.user.id } })
    conversations.value = (res.data?.data || []).map((c) => ({
      ...c,
      last_content: c.content,
      last_time: c.created_at,
      unreadCount: c.unreadCount || 0,
    }))
  } catch {
    conversations.value = []
  }
}

const fetchHistory = async (peerId) => {
  if (!auth.user || !peerId) return
  try {
    const res = await axios.get(`${CHAT_BASE}/history`, { params: { user_id: auth.user.id, peer_id: peerId } })
    chatMessages.value = res.data?.data || []
    await nextTick()
    scrollToBottom()
  } catch {
    chatMessages.value = []
  }
}

const openConversation = (peerId) => {
  activePeerId.value = peerId
  const row = conversations.value.find((c) => c.peer_id === peerId)
  if (row) row.unreadCount = 0
  fetchHistory(peerId)
}

const searchUsers = async () => {
  if (!auth.user) return
  const keyword = searchKey.value.trim()
  if (!keyword) {
    searchResults.value = []
    return
  }
  try {
    const res = await axios.get(`${CHAT_BASE}/search`, { params: { keyword, user_id: auth.user.id } })
    searchResults.value = res.data?.data || []
  } catch {
    searchResults.value = []
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
  searchKey.value = ''
  searchResults.value = []
  fetchHistory(user.id)
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
    unreadCount: payload.unreadCount || 0,
  }
  if (idx >= 0) {
    const old = conversations.value[idx]
    const updated = {
      ...old,
      ...base,
      unreadCount: peerId === activePeerId.value ? 0 : (old.unreadCount || 0) + (payload.incrementUnread ? 1 : 0),
    }
    conversations.value.splice(idx, 1)
    conversations.value.unshift(updated)
  } else {
    conversations.value.unshift({
      ...base,
      unreadCount: peerId === activePeerId.value ? 0 : payload.incrementUnread ? 1 : 0,
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

const addEmoji = (emoji) => {
  chatInput.value = `${chatInput.value || ''}${emoji}`
  emojiVisible.value = false
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
    })
    chatInput.value = ''
    scrollToBottom()
  } catch {
    // ignore
  } finally {
    chatSending.value = false
  }
}

const scrollToBottom = () => {
  if (!messageContainer.value) return
  requestAnimationFrame(() => {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  })
}

const switchType = (key) => {
  router.push(key === 'all' ? '/notifications' : `/notifications/${key}`)
}

const refreshAll = async () => {
  await Promise.all([fetchData(), fetchState()])
  if (activeType.value === 'chat') fetchConversations()
}

onMounted(() => {
  fetchData()
  fetchState()
  setupStream()
})

onUnmounted(() => {
  es?.close()
})

watch(
  () => auth.user?.id,
  () => {
    fetchData()
    fetchState()
    fetchConversations()
    setupStream()
  }
)

watch(
  () => route.params.type,
  (val) => {
    activeType.value = val || 'all'
    if (activeType.value === 'chat') fetchConversations()
  },
  { immediate: true }
)

watch(
  () => activePeerId.value,
  () => nextTick(() => scrollToBottom())
)
</script>

<style scoped>
.notify-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 10% 10%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 36%),
    radial-gradient(circle at 90% 0%, color-mix(in srgb, #81ffe0 9%, transparent), transparent 28%),
    var(--bg-main);
}

.rail {
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.rail-brand {
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
.rail :global(.router-link-active.rail-link) {
  background: color-mix(in srgb, var(--badge) 88%, transparent);
}

.rail-link.muted {
  color: var(--muted);
}

.view {
  overflow-y: auto;
  padding: 16px 18px 24px;
}

.hero {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.hero h1 {
  margin: 0 0 6px;
  font-size: 32px;
  letter-spacing: -0.02em;
}

.hero p {
  margin: 0;
  color: var(--muted);
}

.hero-actions {
  display: flex;
  gap: 8px;
}

.guest {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 18px;
  text-align: center;
  color: var(--muted);
}

.stats {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.stat-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--panel) 86%, transparent);
  padding: 10px;
}

.stat-card span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.stat-card strong {
  font-size: 24px;
}

.tabs {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tab {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 84%, transparent);
  color: var(--fg);
  padding: 6px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab.active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
}

.tabs-spacer {
  flex: 1;
}

.count-dot,
.unread-dot {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 11px;
}

.count-dot {
  background: color-mix(in srgb, var(--badge) 90%, transparent);
  color: var(--muted);
}

.unread-dot {
  background: #ef4444;
  color: #fff;
}

.list {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.notice {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.notice-left {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 6px;
}

.dot-unread {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.post-link {
  color: #4f8cff;
  text-decoration: none;
}

.content {
  margin: 8px 0 0;
  line-height: 1.55;
  white-space: pre-wrap;
}

.time {
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
}

.muted {
  color: var(--muted);
  font-size: 12px;
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 14px;
}

.chat {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 10px;
  min-height: 620px;
}

.chat-left {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 10px;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  align-content: start;
}

.chat-search {
  margin-bottom: 4px;
}

.search-results {
  display: grid;
  gap: 6px;
}

.search-item,
.conv {
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel) 86%, transparent);
  color: var(--fg);
  padding: 8px;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}

.conv.active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
}

.small-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
}

.meta,
.conv-body {
  min-width: 0;
}

.conv-top,
.conv-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.line-clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  min-width: 18px;
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 11px;
  background: #ef4444;
  color: #fff;
  text-align: center;
}

.chat-main {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.chat-head {
  border-bottom: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  padding: 10px 12px;
  font-weight: 700;
}

.messages {
  overflow-y: auto;
  padding: 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.bubble {
  max-width: 72%;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 8px 10px;
}

.bubble.me {
  justify-self: end;
  background: #4f8cff;
  color: #fff;
  border-color: #4f8cff;
}

.bubble-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

.bubble.me .bubble-time {
  color: rgba(255, 255, 255, 0.86);
}

.composer {
  border-top: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.composer-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.emoji {
  text-align: center;
  line-height: 26px;
  border-radius: 8px;
  cursor: pointer;
}

.emoji:hover {
  background: color-mix(in srgb, var(--badge) 92%, transparent);
}

.send-row {
  display: flex;
  justify-content: flex-end;
}

.chat-empty {
  border: 1px dashed color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--muted);
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
  .chat {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}

@media (max-width: 920px) {
  .notify-page {
    grid-template-columns: 1fr;
  }

  .rail {
    display: none;
  }

  .view {
    padding: 12px;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
