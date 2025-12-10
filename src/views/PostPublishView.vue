<template>
  <div class="page">
    <aside class="sidebar">
      <div class="logo">Community</div>
      <nav class="nav">
        <RouterLink to="/posts" class="nav-item">Discover</RouterLink>
        <div class="nav-item active">Publish</div>
        <RouterLink to="/notifications" class="nav-item">Notifications</RouterLink>
        <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="nav-item">Me</RouterLink>
        <div v-else class="nav-item muted">Me</div>
      </nav>
      <div v-if="!auth.user" class="login-box">
        <el-button type="primary" class="login-btn" @click="$router.push('/login')">Login / Publish</el-button>
        <ul>
          <li>Save your posts</li>
          <li>Keep likes and favorites</li>
          <li>Sync across devices</li>
        </ul>
      </div>
    </aside>

    <main class="main">
      <section class="hero">
        <div>
          <h1>Create a new post</h1>
          <p>Polish your story with preview, tag suggestions, and autosave.</p>
        </div>
        <el-tag type="success" v-if="auth.user" size="large">Logged in as {{ auth.user.nickname }}</el-tag>
        <el-tag type="warning" v-else>Posting as guest</el-tag>
      </section>

      <section class="workspace">
        <div class="form">
          <el-alert
            v-if="alertMessage"
            :title="alertMessage"
            :type="alertType"
            show-icon
            class="inline-alert"
            :closable="false"
          />

          <div class="field">
            <div class="label-row">
              <label>Title</label>
              <span class="hint">{{ form.title.length }}/60</span>
            </div>
            <el-input
              v-model="form.title"
              maxlength="60"
              placeholder="Title (e.g. Weekend by the sea)"
            />
          </div>

          <div class="field">
            <div class="label-row">
              <label>Content</label>
              <span class="hint">{{ form.content.length }}/800</span>
            </div>
            <el-input
              v-model="form.content"
              type="textarea"
              :maxlength="800"
              :autosize="{ minRows: 4, maxRows: 8 }"
              placeholder="Write tips, feelings, routes, budgets..."
            />
          </div>

          <div class="field">
            <div class="label-row">
              <label>Images</label>
              <span class="hint">First image becomes cover · drag to reorder</span>
            </div>
            <el-input v-model="imageInput" placeholder="https://...jpg">
              <template #append>
                <el-button type="primary" @click="addImage" :disabled="!imageInput.trim()">Add</el-button>
              </template>
            </el-input>
            <div class="thumbs" v-if="images.length">
              <div
                v-for="(img, idx) in images"
                :key="img + idx"
                class="thumb draggable"
                draggable="true"
                @dragstart="onDragStart(idx, $event)"
                @dragover.prevent
                @drop="onDrop(idx, $event)"
              >
                <button class="thumb-delete" @click.stop="removeImage(idx)">✕</button>
                <div class="thumb-badge" v-if="idx === 0">Cover</div>
                <img :src="img" :alt="`img-${idx}`" />
              </div>
            </div>
          </div>

          <div class="field">
            <div class="label-row">
              <label>Tags</label>
              <span class="hint">Pick or type your own</span>
            </div>
            <div class="chips">
              <el-tag
                v-for="tag in tagOptions"
                :key="tag"
                :type="selectedTags.includes(tag) ? 'success' : 'info'"
                class="chip"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </el-tag>
            </div>
            <el-input v-model="form.tagsText" placeholder="food, night view, outfit..." />
          </div>

          <div class="field">
            <div class="label-row">
              <label>POI</label>
              <span class="hint">Search POI by name</span>
            </div>
            <div class="poi-row">
              <el-autocomplete
                v-model="poiInput"
                :fetch-suggestions="querySearchPoi"
                placeholder="Search POI..."
                value-key="name"
                :trigger-on-focus="false"
                @select="onPoiSelect"
              >
                <template #default="{ item }">
                  <div class="poi-option">
                    <div class="poi-name">{{ item.name }}</div>
                    <div class="poi-meta">{{ item.category || 'POI' }}</div>
                  </div>
                </template>
              </el-autocomplete>
              <el-button v-if="selectedPoi" size="small" text @click="clearPoi">Clear</el-button>
            </div>
            <div v-if="selectedPoi" class="poi-preview">
              <img v-if="selectedPoi.image_url" :src="selectedPoi.image_url" alt="poi" />
              <div class="poi-text">
                <div class="poi-title">{{ selectedPoi.name }}</div>
                <div class="poi-meta">
                  {{ selectedPoi.category || 'POI' }} · {{ selectedPoi.city || '' }}
                </div>
              </div>
            </div>
          </div>

          <div class="field actions">
            <div class="left">
              <el-button @click="clearDraft" text>Clear draft</el-button>
              <span class="hint">Autosaved locally</span>
            </div>
            <div class="right">
              <el-button @click="router.push('/posts')" text>Cancel</el-button>
              <el-button type="primary" :loading="submitting" @click="submitPost">Publish</el-button>
            </div>
            <span v-if="error" class="error">{{ error }}</span>
          </div>
        </div>

        <div class="preview">
          <h3 class="card-title">Live preview</h3>
          <div class="card">
            <div class="cover" :class="{ empty: !coverImage }">
              <img v-if="coverImage" :src="coverImage" alt="cover" />
              <div v-else class="placeholder">Cover will appear here</div>
            </div>
            <div class="card-body">
              <div class="card-title">{{ form.title || 'Untitled' }}</div>
              <div class="card-meta">
                <span>{{ auth.user?.nickname || 'Guest' }}</span>
                <span v-if="selectedTags.length || extraTags.length"> · {{ [...selectedTags, ...extraTags].join(' / ') }}</span>
              </div>
              <p class="card-text">{{ snippet }}</p>
              <div class="card-foot">
                <span>{{ previewImages.length }} images</span>
                <span>{{ form.content.length }} chars</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'http://localhost:3001/api/posts'
const TAG_API = 'http://localhost:3001/api/posts/tags/list'
const POI_API = 'http://localhost:3001/api/poi/search'
const STORAGE_KEY = 'jp_publish_draft'
const auth = useAuthStore()
const router = useRouter()

const submitting = ref(false)
const alertMessage = ref('')
const alertType = ref('info')
const tagOptions = ref([])
const selectedTags = reactive([])
const images = ref([])
const imageInput = ref('')
const poiInput = ref('')
const poiOptions = ref([])
const poiLoading = ref(false)
const selectedPoi = ref(null)

const form = reactive({
  title: '',
  content: '',
  tagsText: '',
})

const parseTags = (txt) =>
  txt
    .split(/[,\\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

const previewImages = computed(() => images.value)
const coverImage = computed(() => previewImages.value[0] || '')
const extraTags = computed(() => parseTags(form.tagsText))
const snippet = computed(() => (form.content ? form.content.slice(0, 140) : 'Share your story...'))

const toggleTag = (tag) => {
  const idx = selectedTags.indexOf(tag)
  if (idx > -1) selectedTags.splice(idx, 1)
  else selectedTags.push(tag)
}

const addImage = () => {
  const url = imageInput.value.trim()
  if (!url) return
  images.value = [...images.value, url]
  imageInput.value = ''
}

const removeImage = (idx) => {
  images.value = images.value.filter((_, i) => i !== idx)
}

const draggingIndex = ref(null)
const onDragStart = (idx, evt) => {
  draggingIndex.value = idx
  if (evt?.dataTransfer) {
    evt.dataTransfer.effectAllowed = 'move'
  }
}
const onDrop = (idx, evt) => {
  if (draggingIndex.value === null) return
  evt?.preventDefault?.()
  const list = [...images.value]
  const [moved] = list.splice(draggingIndex.value, 1)
  list.splice(idx, 0, moved)
  images.value = list
  draggingIndex.value = null
}

const saveDraft = () => {
  const draft = { ...form, selectedTags, images: images.value, poi: selectedPoi.value, poiInput: poiInput.value }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    form.title = draft.title || ''
    form.content = draft.content || ''
    form.tagsText = draft.tagsText || ''
    images.value = Array.isArray(draft.images) ? draft.images : []
    selectedPoi.value = draft.poi || null
    poiInput.value = draft.poiInput || (draft.poi?.name || '')
    if (Array.isArray(draft.selectedTags)) {
      selectedTags.splice(0, selectedTags.length, ...draft.selectedTags)
    }
  } catch (e) {
    // ignore
  }
}

const clearDraft = () => {
  form.title = ''
  form.content = ''
  form.tagsText = ''
  selectedTags.splice(0, selectedTags.length)
  images.value = []
  poiInput.value = ''
  selectedPoi.value = null
  localStorage.removeItem(STORAGE_KEY)
}

const fetchTags = async () => {
  try {
    const res = await axios.get(TAG_API)
    tagOptions.value = (res.data?.data || []).map((t) => t.name)
  } catch (e) {
    tagOptions.value = []
  }
}

const querySearchPoi = async (query, cb) => {
  if (!query) {
    poiOptions.value = []
    cb([])
    return
  }
  poiLoading.value = true
  try {
    const res = await axios.get(POI_API, { params: { keyword: query, limit: 10 } })
    const list = res.data?.data || []
    poiOptions.value = list
    cb(list)
  } catch (e) {
    poiOptions.value = []
    cb([])
  } finally {
    poiLoading.value = false
  }
}

const onPoiSelect = (item) => {
  selectedPoi.value = item
  poiInput.value = item?.name || ''
}

const clearPoi = () => {
  selectedPoi.value = null
  poiInput.value = ''
}

const submitPost = async () => {
  const mergedTags = Array.from(new Set([...selectedTags, ...extraTags.value]))
  if (!form.title || !form.content || images.value.length === 0 || mergedTags.length === 0) {
    const missing = []
    if (!form.title) missing.push('title')
    if (!form.content) missing.push('content')
    if (images.value.length === 0) missing.push('images')
    if (mergedTags.length === 0) missing.push('tags')
    alertMessage.value = `Missing: ${missing.join(', ')}`
    alertType.value = 'warning'
    return
  }
  submitting.value = true
  alertMessage.value = ''
  const payload = {
    title: form.title,
    content: form.content,
    images: images.value,
    tags: mergedTags,
    poi_id: selectedPoi.value?.id ?? null,
    user_id: auth.user?.id,
  }
  try {
    await axios.post(API_BASE, payload)
    clearDraft()
    alertMessage.value = 'Published'
    alertType.value = 'success'
    router.push('/posts')
  } catch (e) {
    alertMessage.value = e.response?.data?.message || 'Publish failed'
    alertType.value = 'error'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDraft()
  fetchTags()
})

watch(
  () => ({ ...form, selectedTags: [...selectedTags], images: [...images.value], poi: selectedPoi.value, poiInput: poiInput.value }),
  () => saveDraft(),
  { deep: true }
)
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: var(--bg-main);
}
.sidebar {
  background: var(--panel);
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
  cursor: pointer;
  color: var(--fg);
  text-decoration: none;
}
.nav-item.active,
.nav-item:hover,
.nav :global(.router-link-active.nav-item) {
  background: var(--badge);
}
.nav-item.muted {
  color: var(--muted);
}
.login-box {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
}
.login-btn {
  width: 100%;
  margin-bottom: 8px;
}
.el-input__wrapper,
.el-textarea__inner {
  background: var(--panel) !important;
  color: var(--fg) !important;
  border-color: var(--panel-border) !important;
}
:deep(.el-input__inner) {
  color: var(--fg);
}
.login-box ul {
  padding-left: 18px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.main {
  overflow-y: auto;
  padding: 20px 24px 32px;
}
.hero {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--panel) 85%, transparent),
    color-mix(in srgb, var(--badge) 90%, transparent)
  );
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.hero h1 {
  margin: 0 0 4px;
  color: var(--fg);
}
.hero p {
  margin: 0;
  color: var(--muted);
}
.workspace {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}
.form,
.preview {
  background: var(--panel);
  border-radius: 18px;
  border: 1px solid var(--panel-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  padding: 16px;
}
.field {
  margin-bottom: 14px;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
label {
  font-weight: 600;
  color: var(--fg);
}

.hint {
  color: var(--muted);
  font-size: 12px;
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
.thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.thumb {
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  overflow: hidden;
  height: 72px;
  position: relative;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb.draggable {
  cursor: grab;
}
.thumb-delete {
  position: absolute;
  top: 6px;
  left: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: var(--fg);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
}
.thumb-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--fg);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.chip {
  background: var(--badge);
  color: var(--fg);
  cursor: pointer;
}
.poi-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.poi-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 8px;
  margin-top: 8px;
}
.poi-preview img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
}
.poi-text .poi-title {
  font-weight: 700;
}
.poi-text .poi-meta {
  font-size: 12px;
  color: var(--muted);
}
.poi-option {
  display: flex;
  flex-direction: column;
}
.poi-option .poi-name {
  font-weight: 600;
}
.poi-option .poi-meta {
  font-size: 12px;
  color: var(--muted);
}
.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}
.actions .right {
  display: flex;
  gap: 10px;
}
.inline-alert {
  margin-bottom: 12px;
}
.preview h3 {
  margin: 0 0 10px;
}
.card {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  overflow: hidden;
}
.cover {
  background: var(--badge);
  height: 220px;
  display: grid;
  place-items: center;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover.empty {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--badge) 90%, #fff),
    color-mix(in srgb, var(--panel) 85%, #fff)
  );
  color: var(--muted);
}
.placeholder {
  color: var(--muted);
  font-size: 12px;
}
.card-body {
  padding: 12px;
}
.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--fg);
}
.card-meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}
.card-text {
  color: var(--fg);
  line-height: 1.5;
  margin: 0 0 8px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 780px) {
  .page {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
}
</style>
