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
          <p>Likes, favorites, comments, reports, follows and chats in one streamlined workspace.</p>
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
          <article v-for="item in filteredItems" :key="makeNotificationKey(item)" :class="['notice', { unread: item.unread } ]">
            <div class="notice-left">
              <span v-if="item.unread" class="dot-unread"></span>
              <RouterLink v-if="item.actor_id" :to="`/person?userid=${item.actor_id}`">
                <CroppedImage :src="item.avatar_url || placeholder" class="avatar" :aspect-ratio="1" />
              </RouterLink>
              <CroppedImage v-else :src="item.avatar_url || placeholder" class="avatar" :aspect-ratio="1" />
            </div>
            <div class="notice-body">
              <div class="line">
                <strong>{{ displayActorName(item) }}</strong>
                <span class="muted">{{ actionLabel(item) }}</span>
                <RouterLink v-if="item.post_id" :to="`/posts/postsid=${item.post_id}`" class="post-link">
                  {{ item.title }}
                </RouterLink>
                <span v-else class="muted">you</span>
              </div>
              <p v-if="item.content" class="content">{{ item.content }}</p>
              <div class="time">
                <span>{{ formatTime(item.created_at) }}</span>
                <span v-if="item.unread" class="unread-pill">Unread</span>
              </div>
            </div>
          </article>
          <div v-if="filteredItems.length === 0" class="empty">No notifications in this category.</div>
          <div v-if="filteredItems.length > 0" class="load-more-row">
            <el-button size="small" plain :loading="loadingOlder" :disabled="loadingOlder || !hasMoreOlder" @click="loadOlder">
              {{ hasMoreOlder ? 'Load older' : 'No more notifications' }}
            </el-button>
          </div>
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
                <el-popover placement="top-start" width="288" trigger="click" v-model:visible="emojiVisible">
                  <template #reference>
                    <el-button size="small" text>😊 Emoji</el-button>
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
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import CroppedImage from '../components/CroppedImage.vue'
import { apiUrl } from '../config/api'

const API_BASE = apiUrl('/api/notifications')
const CHAT_BASE = apiUrl('/api/chat')

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
const latestCursor = ref({ ts: '', id: 0 })
const olderCursor = ref({ ts: '', id: 0 })
const loadingOlder = ref(false)
const hasMoreOlder = ref(true)
let es = null

const NOTIFICATION_CACHE_PREFIX = 'jp_notifications_cache_v1_'
const BASE_LIMIT = 40
const DELTA_LIMIT = 120
const MAX_ITEMS = 320
const TYPE_HYDRATE_LIMIT = 80
const FUTURE_SKEW_MS = 5 * 60 * 1000

const categories = [
  { key: 'all', label: 'All' },
  { key: 'like', label: 'Likes' },
  { key: 'favorite', label: 'Favorites' },
  { key: 'comment', label: 'Comments' },
  { key: 'report', label: 'Reports' },
  { key: 'follow', label: 'Follows' },
  { key: 'chat', label: 'Chat' },
]

const emojis = [
  '😀',
  '😂',
  '🥹',
  '😍',
  '😎',
  '🤔',
  '😴',
  '🥳',
  '👍',
  '👀',
  '👏',
  '🙏',
  '🤝',
  '💯',
  '🔥',
  '✨',
  '🎉',
  '❤️',
  '☕',
  '🍜',
  '📍',
  '🗺️',
  '🚗',
  '🌧️',
]

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
const displayActorName = (item) => {
  const type = String(item?.type || '')
  if (type === 'report' && String(item?.meta?.event || '').toLowerCase() === 'submitted') {
    return item?.nickname || 'System'
  }
  return item?.nickname || 'Someone'
}
const actionLabel = (item) => {
  const type = String(item?.type || '')
  if (type === 'like') return 'liked your post'
  if (type === 'favorite') return 'favorited your post'
  if (type === 'comment') return 'commented on your post'
  if (type === 'report') {
    const event = String(item?.meta?.event || '').toLowerCase()
    const resolution = String(item?.meta?.resolution || '').toUpperCase()
    if (event === 'submitted') return 'submitted a report for'
    if (event === 'reviewed') {
      return resolution === 'DISMISSED' ? 'dismissed your report on' : 'reviewed your report on'
    }
    if (event === 'owner_hidden') return 'hid your post after a report review:'
    return 'updated a report for'
  }
  if (type === 'follow') return 'followed you'
  if (type === 'chat') return 'sent you a message'
  return 'activity'
}

const toTime = (v) => {
  if (!v) return 0
  const ts = new Date(v).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const makeNotificationKey = (item = {}) =>
  [
    item.type || 'unknown',
    item.source_id || 0,
    item.actor_id || 0,
    item.post_id || 0,
    item.created_at || '',
    item.content || '',
  ].join('::')

const parseNotificationMeta = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

const normalizeNotificationItem = (item = {}) => ({
  ...item,
  nickname: item.nickname || item.actor_nickname || '',
  avatar_url: item.avatar_url || item.actor_avatar || '',
  meta: parseNotificationMeta(item.meta || item.meta_json),
})

const getCacheKey = (userId) => `${NOTIFICATION_CACHE_PREFIX}${userId}`

const isUnreadByState = (item, stateRow) => {
  const nowMs = Date.now()
  const nowSec = Math.floor(Date.now() / 1000)
  const allReadAtRaw = toTime(stateRow?.read_all_at)
  const typeReadAtRaw = toTime(stateRow?.[`read_${String(item?.type || '')}_at`])
  const readAnchorRaw = Math.max(allReadAtRaw || 0, typeReadAtRaw || 0)
  const createdAtRaw = toTime(item?.created_at)
  const normalizedCreatedRaw =
    createdAtRaw > nowMs + FUTURE_SKEW_MS ? (readAnchorRaw || nowMs) : createdAtRaw
  const createdAt = normalizedCreatedRaw ? Math.floor(normalizedCreatedRaw / 1000) : 0
  if (!createdAt) return false
  const allReadAt = allReadAtRaw ? Math.min(Math.floor(allReadAtRaw / 1000), nowSec) : 0
  if (allReadAt && createdAt <= allReadAt) return false
  const typeReadAt = typeReadAtRaw ? Math.min(Math.floor(typeReadAtRaw / 1000), nowSec) : 0
  if (typeReadAt && createdAt <= typeReadAt) return false
  return true
}

const dedupeSortTrim = (list) => {
  const map = new Map()
  ;(list || []).forEach((it) => {
    const key = makeNotificationKey(it)
    const old = map.get(key)
    if (!old || toTime(it?.created_at) >= toTime(old?.created_at)) {
      map.set(key, it)
    }
  })
  return Array.from(map.values())
    .sort((a, b) => toTime(b?.created_at) - toTime(a?.created_at))
    .slice(0, MAX_ITEMS)
}

const applyUnreadState = (list, stateRow) => {
  if (!stateRow) return list
  return (list || []).map((it) => ({
    ...it,
    unread: isUnreadByState(it, stateRow),
  }))
}

const cursorFromTop = () => {
  const top = items.value?.[0] || null
  const id = Number(top?.source_id || 0)
  return {
    ts: top?.created_at || '',
    id: Number.isFinite(id) && id > 0 ? id : 0,
  }
}

const cursorFromBottom = (list = null) => {
  const source = Array.isArray(list) ? list : items.value
  const bottom = source?.[source.length - 1] || null
  const id = Number(bottom?.source_id || 0)
  return {
    ts: bottom?.created_at || '',
    id: Number.isFinite(id) && id > 0 ? id : 0,
  }
}

const normalizeCursor = (raw) => {
  const ts = String(raw?.ts || raw?.created_at || '').trim()
  const id = Number(raw?.id || raw?.source_id || 0)
  return {
    ts,
    id: Number.isFinite(id) && id > 0 ? id : 0,
  }
}

const syncLatestCursor = () => {
  const top = cursorFromTop()
  if (top.ts) {
    latestCursor.value = top
  }
}

const persistCache = () => {
  if (typeof window === 'undefined') return
  const userId = auth.user?.id
  if (!userId) return
  try {
    localStorage.setItem(
      getCacheKey(userId),
      JSON.stringify({
        items: items.value.slice(0, MAX_ITEMS),
        state: state.value || null,
        latest_cursor: latestCursor.value || { ts: '', id: 0 },
        older_cursor: olderCursor.value || { ts: '', id: 0 },
        has_more_older: hasMoreOlder.value,
        updated_at: new Date().toISOString(),
      })
    )
  } catch {
    // ignore localStorage failures
  }
}

const hydrateCache = () => {
  if (typeof window === 'undefined') return false
  const userId = auth.user?.id
  if (!userId) return false
  try {
    const raw = localStorage.getItem(getCacheKey(userId))
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.items)) return false
    if (parsed?.state) {
      state.value = parsed.state
    }
    const cached = dedupeSortTrim((parsed.items || []).map((item) => normalizeNotificationItem(item)))
    items.value = state.value ? applyUnreadState(cached, state.value) : cached
    const cachedCursor = normalizeCursor(parsed?.latest_cursor || {})
    latestCursor.value = cachedCursor.ts ? cachedCursor : cursorFromTop()
    const cachedOlder = normalizeCursor(parsed?.older_cursor || {})
    olderCursor.value = cachedOlder.ts ? cachedOlder : { ...latestCursor.value }
    hasMoreOlder.value = Boolean(parsed?.has_more_older ?? true)
    return items.value.length > 0
  } catch {
    return false
  }
}

const resetNotificationState = () => {
  items.value = []
  state.value = null
  latestCursor.value = { ts: '', id: 0 }
  olderCursor.value = { ts: '', id: 0 }
  loadingOlder.value = false
  hasMoreOlder.value = true
  conversations.value = []
  chatMessages.value = []
  activePeerId.value = null
}

const fetchData = async ({ incremental = true, forceFull = false } = {}) => {
  if (!auth.user?.id) return
  const useDelta = incremental && !forceFull && !!latestCursor.value?.ts
  const params = {
    user_id: auth.user.id,
    limit: useDelta ? DELTA_LIMIT : BASE_LIMIT,
  }
  if (useDelta) {
    params.since_ts = latestCursor.value.ts
    params.since_id = latestCursor.value.id || 0
  }
  try {
    const res = await axios.get(API_BASE, { params })
    const incoming = Array.isArray(res.data?.data) ? res.data.data : []
    state.value = res.data?.state || state.value
    const normalizedIncoming = incoming.map((item) => normalizeNotificationItem(item))
    items.value = useDelta ? dedupeSortTrim([...normalizedIncoming, ...items.value]) : dedupeSortTrim(normalizedIncoming)
    if (state.value) {
      items.value = applyUnreadState(items.value, state.value)
    }
    const responseCursor = normalizeCursor(res.data?.latest_cursor || {})
    if (responseCursor.ts) {
      latestCursor.value = responseCursor
    } else {
      syncLatestCursor()
    }
    const next = normalizeCursor(res.data?.next_cursor || {})
    olderCursor.value = next.ts ? next : cursorFromBottom()
    hasMoreOlder.value = Boolean(res.data?.has_more ?? false)
    persistCache()
  } catch {
    // keep cache/in-memory data on request failures
  }
}

const loadOlder = async () => {
  if (!auth.user?.id || loadingOlder.value || !hasMoreOlder.value || !olderCursor.value?.ts) return
  loadingOlder.value = true
  try {
    const params = {
      user_id: auth.user.id,
      limit: BASE_LIMIT,
      before_ts: olderCursor.value.ts,
      before_id: olderCursor.value.id || 0,
    }
    if (activeType.value !== 'all' && activeType.value !== 'chat') {
      params.type = activeType.value
    }
    const res = await axios.get(API_BASE, { params })
    const incoming = Array.isArray(res.data?.data) ? res.data.data : []
    if (incoming.length) {
      items.value = dedupeSortTrim([...items.value, ...incoming.map((item) => normalizeNotificationItem(item))])
      if (state.value) {
        items.value = applyUnreadState(items.value, state.value)
      }
    }
    const next = normalizeCursor(res.data?.next_cursor || {})
    olderCursor.value = next.ts ? next : olderCursor.value
    hasMoreOlder.value = Boolean(res.data?.has_more ?? false)
    persistCache()
  } catch {
    // ignore
  } finally {
    loadingOlder.value = false
  }
}

const hydrateTypeIfNeeded = async (typeKey) => {
  if (!auth.user?.id) return
  const type = String(typeKey || '').toLowerCase()
  if (!type || type === 'all' || type === 'chat') return
  const exists = items.value.some((it) => it.type === type)
  if (exists) return
  try {
    const res = await axios.get(API_BASE, {
      params: {
        user_id: auth.user.id,
        type,
        limit: TYPE_HYDRATE_LIMIT,
      },
    })
    const incoming = Array.isArray(res.data?.data) ? res.data.data : []
    if (!incoming.length) return
    state.value = res.data?.state || state.value
    items.value = dedupeSortTrim([...incoming.map((item) => normalizeNotificationItem(item)), ...items.value])
    if (state.value) {
      items.value = applyUnreadState(items.value, state.value)
    }
    syncLatestCursor()
    persistCache()
  } catch {
    // ignore
  }
}

const markRead = async (type = 'all') => {
  if (!auth.user?.id) return
  try {
    const res = await axios.post(`${API_BASE}/read`, {
      user_id: auth.user.id,
      type,
    })
    state.value = res.data?.state || state.value
    if (type === 'chat' || type === 'all') {
      conversations.value = (conversations.value || []).map((c) => ({ ...c, unreadCount: 0 }))
    }
    if (state.value) {
      items.value = applyUnreadState(items.value, state.value)
    } else if (type === 'all') {
      items.value = items.value.map((it) => ({ ...it, unread: false }))
    } else if (type !== 'chat') {
      items.value = items.value.map((it) => (it.type === type ? { ...it, unread: false } : it))
    }
    persistCache()
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
      const normalized = normalizeNotificationItem(data)
      const unread = state.value ? isUnreadByState(normalized, state.value) : true
      items.value = dedupeSortTrim([{ ...normalized, unread }, ...items.value])
      syncLatestCursor()
      persistCache()
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
  const base = chatInput.value || ''
  const separator = base && !/\s$/.test(base) ? ' ' : ''
  chatInput.value = `${base}${separator}${emoji}`
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
  await fetchData({ incremental: true, forceFull: false })
  fetchConversations()
}

const initNotificationData = async () => {
  if (!auth.user?.id) {
    es?.close()
    es = null
    resetNotificationState()
    return
  }
  const hasCache = hydrateCache()
  await fetchData({ incremental: true, forceFull: !hasCache })
  setupStream()
  fetchConversations()
}

onUnmounted(() => {
  es?.close()
  es = null
})

watch(
  () => auth.user?.id,
  (userId, oldUserId) => {
    if (oldUserId && oldUserId !== userId) {
      es?.close()
      es = null
    }
    initNotificationData()
  },
  { immediate: true }
)

watch(
  () => route.params.type,
  (val) => {
    activeType.value = val || 'all'
    if (activeType.value === 'chat') fetchConversations()
    if (activeType.value !== 'chat') {
      hydrateTypeIfNeeded(activeType.value)
      const visible = activeType.value === 'all' ? items.value : items.value.filter((it) => it.type === activeType.value)
      olderCursor.value = cursorFromBottom(visible)
      hasMoreOlder.value = true
    }
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

.notice.unread {
  border-color: color-mix(in srgb, #ef4444 55%, var(--panel-border));
  background:
    linear-gradient(90deg, color-mix(in srgb, #ef4444 12%, transparent) 0 4px, transparent 4px 100%),
    color-mix(in srgb, var(--badge) 76%, transparent);
}

.notice-left {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 6px;
}

.dot-unread {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 3px color-mix(in srgb, #ef4444 22%, transparent);
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 18px;
  color: #fff;
  background: #ef4444;
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

.load-more-row {
  display: flex;
  justify-content: center;
  padding-top: 4px;
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
  font-family: 'Inter', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.emoji {
  text-align: center;
  font-size: 22px;
  line-height: 1;
  border-radius: 10px;
  cursor: pointer;
  padding: 10px 0;
  font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;
  user-select: none;
  transition: transform 0.16s ease, background 0.16s ease;
}

.emoji:hover {
  background: color-mix(in srgb, var(--badge) 92%, transparent);
  transform: translateY(-1px) scale(1.04);
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
