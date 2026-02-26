<template>
  <div class="publish-page">
    <aside class="left-rail">
      <div class="brand">Creator</div>
      <RouterLink to="/posts" class="rail-link">Discover</RouterLink>
      <div class="rail-link active">Publish</div>
      <RouterLink to="/notifications" class="rail-link">Notifications</RouterLink>
      <RouterLink v-if="auth.user" :to="`/person?userid=${auth.user.id}`" class="rail-link">Me</RouterLink>
      <div v-else class="rail-link muted">Me</div>
      <div v-if="!auth.user" class="tip">
        <div>Login recommended for account-bound posting and draft sync.</div>
        <el-button size="small" type="primary" @click="$router.push('/login')">Login</el-button>
      </div>
    </aside>

    <main class="view">
      <header class="hero">
        <div>
          <h1>Create Post</h1>
          <p>Compose, crop, reorder, tag and preview your travel post before publishing.</p>
        </div>
        <div class="score-card">
          <span>Quality score</span>
          <strong>{{ qualityScore }}%</strong>
          <el-progress :percentage="qualityScore" :stroke-width="8" :show-text="false" />
        </div>
      </header>

      <section class="layout">
        <article class="editor">
          <el-alert
            v-if="alertMessage"
            :title="alertMessage"
            :type="alertType"
            show-icon
            :closable="false"
            class="alert"
          />

          <div class="block">
            <div class="block-head">
              <span class="title">Quick Templates</span>
            </div>
            <div class="template-row">
              <button class="template" @click="applyTemplate('food')">Food Review</button>
              <button class="template" @click="applyTemplate('museum')">Museum Day</button>
              <button class="template" @click="applyTemplate('nature')">Nature Route</button>
            </div>
          </div>

          <div class="block">
            <div class="block-head">
              <span class="title">Title</span>
              <span class="meta">{{ form.title.length }}/60</span>
            </div>
            <el-input v-model="form.title" maxlength="60" placeholder="Post title" />
          </div>

          <div class="block">
            <div class="block-head">
              <span class="title">Content</span>
              <span class="meta">{{ form.content.length }}/1000</span>
            </div>
            <el-input
              v-model="form.content"
              type="textarea"
              :maxlength="1000"
              :autosize="{ minRows: 6, maxRows: 10 }"
              placeholder="Write route highlights, practical tips, and your experience..."
            />
          </div>

          <div class="block">
            <div class="block-head">
              <span class="title">Images</span>
              <span class="meta">First image is cover, drag to reorder.</span>
            </div>
            <div class="image-actions">
              <el-input v-model="imageInput" placeholder="https://example.com/photo.jpg">
                <template #append>
                  <el-button type="primary" @click="startAddImageCrop" :disabled="!imageInput.trim()">Add URL</el-button>
                </template>
              </el-input>
              <el-button :loading="uploading" @click="triggerUpload">Upload image</el-button>
              <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFilePicked" />
            </div>

            <div v-if="images.length" class="thumbs">
              <div
                v-for="(img, idx) in images"
                :key="`${img}-${idx}`"
                class="thumb"
                draggable="true"
                @dragstart="onDragStart(idx, $event)"
                @dragover.prevent
                @drop="onDrop(idx, $event)"
              >
                <button class="remove" @click.stop="removeImage(idx)">&times;</button>
                <span v-if="idx === 0" class="cover-badge">Cover</span>
                <CroppedImage :src="img" :alt="`image-${idx}`" class="thumb-img" />
                <button class="crop" @click.stop="openCropForIndex(idx)">Crop</button>
              </div>
            </div>
          </div>

          <div class="block">
            <div class="block-head">
              <span class="title">Tags</span>
              <span class="meta">Quick select + custom input.</span>
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
            <el-input v-model="form.tagsText" placeholder="city-walk, hidden-gems, budget..." />
          </div>

          <div class="block">
            <div class="block-head">
              <span class="title">Linked POI</span>
              <span class="meta">Optional</span>
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
                    <div>{{ item.name }}</div>
                    <div class="meta">{{ item.category || 'POI' }}</div>
                  </div>
                </template>
              </el-autocomplete>
              <el-button v-if="selectedPoi" text @click="clearPoi">Clear</el-button>
            </div>
            <div v-if="selectedPoi" class="poi-preview">
              <CroppedImage :src="selectedPoi.image_url || 'https://placehold.co/80x80'" class="poi-image" />
              <div>
                <div class="poi-name">{{ selectedPoi.name }}</div>
                <div class="meta">{{ selectedPoi.category || 'POI' }}</div>
              </div>
            </div>
          </div>

          <footer class="actions">
            <div class="left">
              <el-button text @click="clearDraft">Clear draft</el-button>
              <span class="meta">Autosaved {{ savedAtText }}</span>
            </div>
            <div class="right">
              <el-button @click="router.push('/posts')">Cancel</el-button>
              <el-button type="primary" :loading="submitting" @click="submitPost">Publish</el-button>
            </div>
          </footer>
        </article>

        <aside class="preview">
          <h3>Live Preview</h3>
          <div class="preview-card">
            <div class="preview-cover">
              <CroppedImage v-if="coverImage" :src="coverImage" class="preview-cover-img" />
              <div v-else class="empty-cover">Cover preview</div>
            </div>
            <div class="preview-body">
              <h4>{{ form.title || 'Untitled Story' }}</h4>
              <p>{{ snippet }}</p>
              <div class="preview-meta">
                <span>{{ auth.user?.nickname || 'Guest' }}</span>
                <span>{{ mergedTags.length }} tags</span>
                <span>{{ images.length }} images</span>
              </div>
              <div v-if="mergedTags.length" class="preview-tags">
                <span v-for="tag in mergedTags.slice(0, 6)" :key="tag">#{{ tag }}</span>
              </div>
            </div>
          </div>

          <div class="checklist">
            <div class="item" v-for="item in checkItems" :key="item.label">
              <span :class="['dot', { ok: item.done }]"></span>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </aside>
      </section>
    </main>

    <ImageCropperDialog
      v-model="imageCropOpen"
      :src="imageCropSrc"
      title="Crop image"
      :aspect-ratio="4 / 3"
      :output-width="720"
      :output-height="540"
      :preview-width="180"
      :initial-crop="imageCropInitial"
      @confirm="onImageCropConfirm"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import ImageCropperDialog from '../components/ImageCropperDialog.vue'
import CroppedImage from '../components/CroppedImage.vue'
import { buildUrlWithCrop, parseUrlWithCrop } from '../utils/cropUrl'
import { proxiedImageSrc } from '../utils/imageProxy'
import { apiUrl } from '../config/api'

const API_BASE = apiUrl('/api/posts')
const TAG_API = apiUrl('/api/posts/tags/list')
const POI_API = apiUrl('/api/poi/search')
const UPLOAD_API = apiUrl('/api/upload/image')
const STORAGE_KEY = 'jp_publish_draft_v2'

const auth = useAuthStore()
const router = useRouter()

const submitting = ref(false)
const uploading = ref(false)
const alertMessage = ref('')
const alertType = ref('info')
const tagOptions = ref([])
const selectedTags = reactive([])
const images = ref([])
const imageInput = ref('')
const imageCropOpen = ref(false)
const imageCropSrc = ref('')
const imageCropInitial = ref(null)
const imageCropBaseUrl = ref('')
const imageEditingIndex = ref(null)
const poiInput = ref('')
const selectedPoi = ref(null)
const savedAt = ref(null)
const fileInput = ref(null)
const draggingIndex = ref(null)

const form = reactive({
  title: '',
  content: '',
  tagsText: '',
})

const parseTags = (txt) =>
  String(txt || '')
    .split(/[,#\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

const mergedTags = computed(() => Array.from(new Set([...selectedTags, ...parseTags(form.tagsText)])))
const coverImage = computed(() => images.value[0] || '')
const snippet = computed(() => (form.content ? form.content.slice(0, 180) : 'Write your travel highlights...'))
const savedAtText = computed(() => (savedAt.value ? new Date(savedAt.value).toLocaleTimeString() : 'just now'))

const qualityScore = computed(() => {
  const checks = [
    form.title.trim().length >= 8 ? 24 : 0,
    form.content.trim().length >= 80 ? 24 : 0,
    images.value.length >= 3 ? 24 : images.value.length > 0 ? 10 : 0,
    mergedTags.value.length >= 2 ? 14 : mergedTags.value.length ? 8 : 0,
    selectedPoi.value?.id ? 14 : 0,
  ]
  return Math.min(100, checks.reduce((a, b) => a + b, 0))
})

const checkItems = computed(() => [
  { label: 'Title length >= 8', done: form.title.trim().length >= 8 },
  { label: 'Content length >= 80', done: form.content.trim().length >= 80 },
  { label: 'At least 3 images', done: images.value.length >= 3 },
  { label: 'At least 2 tags', done: mergedTags.value.length >= 2 },
  { label: 'Linked POI (recommended)', done: !!selectedPoi.value?.id },
])

const applyTemplate = (type) => {
  if (type === 'food') {
    form.title = form.title || 'Best Local Food Route for One Day'
    form.content =
      form.content ||
      'Morning coffee, lunch market, sunset rooftop, and practical budget tips. Here is a complete route with timing and must-order dishes.'
    selectTags(['food', 'city-walk', 'budget'])
    return
  }
  if (type === 'museum') {
    form.title = form.title || 'Museum + Historic Streets Half-Day Plan'
    form.content =
      form.content ||
      'A compact route for art lovers: ticket advice, queue timing, quiet corners, and nearby cafes for a break.'
    selectTags(['museum', 'history', 'rainy-day'])
    return
  }
  form.title = form.title || 'Nature Escape Route with Photo Spots'
  form.content =
    form.content ||
    'A slow-paced route with viewpoints, trail notes, transport details, and the best time window for photos.'
  selectTags(['nature', 'photography', 'outdoor'])
}

const selectTags = (tags) => {
  tags.forEach((tag) => {
    if (!selectedTags.includes(tag)) selectedTags.push(tag)
  })
}

const toggleTag = (tag) => {
  const idx = selectedTags.indexOf(tag)
  if (idx > -1) selectedTags.splice(idx, 1)
  else selectedTags.push(tag)
}

const startAddImageCrop = () => {
  const raw = imageInput.value.trim()
  if (!raw) return
  imageEditingIndex.value = null
  const parsed = parseUrlWithCrop(raw)
  imageCropBaseUrl.value = parsed.baseUrl || raw
  imageCropInitial.value = parsed.crop
  imageCropSrc.value = proxiedImageSrc(imageCropBaseUrl.value)
  imageCropOpen.value = true
}

const openCropForIndex = (idx) => {
  const raw = images.value?.[idx]
  if (!raw) return
  imageEditingIndex.value = idx
  const parsed = parseUrlWithCrop(raw)
  imageCropBaseUrl.value = parsed.baseUrl || raw
  imageCropInitial.value = parsed.crop
  imageCropSrc.value = proxiedImageSrc(imageCropBaseUrl.value)
  imageCropOpen.value = true
}

const onImageCropConfirm = (crop) => {
  try {
    const base = imageCropBaseUrl.value || parseUrlWithCrop(imageInput.value).baseUrl || imageInput.value
    const url = buildUrlWithCrop(base, crop)
    if (imageEditingIndex.value === null || imageEditingIndex.value === undefined) {
      images.value = [...images.value, url]
      imageInput.value = ''
    } else {
      const list = [...images.value]
      list[imageEditingIndex.value] = url
      images.value = list
    }
    alertType.value = 'success'
    alertMessage.value = 'Image updated.'
  } catch {
    alertType.value = 'error'
    alertMessage.value = 'Image crop failed.'
  } finally {
    imageCropOpen.value = false
  }
}

const removeImage = (idx) => {
  images.value = images.value.filter((_, i) => i !== idx)
}

const onDragStart = (idx, evt) => {
  draggingIndex.value = idx
  if (evt?.dataTransfer) evt.dataTransfer.effectAllowed = 'move'
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

const triggerUpload = () => {
  fileInput.value?.click?.()
}

const onFilePicked = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(UPLOAD_API, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const url = res.data?.url
    if (url) {
      images.value = [...images.value, url]
      alertType.value = 'success'
      alertMessage.value = 'Upload completed.'
    }
  } catch {
    alertType.value = 'error'
    alertMessage.value = 'Upload failed.'
  } finally {
    uploading.value = false
    if (event?.target) event.target.value = ''
  }
}

const fetchTags = async () => {
  try {
    const res = await axios.get(TAG_API)
    tagOptions.value = (res.data?.data || []).map((t) => t.name).slice(0, 24)
  } catch {
    tagOptions.value = ['food', 'museum', 'history', 'city-walk', 'night-view']
  }
}

const querySearchPoi = async (query, cb) => {
  if (!query) return cb([])
  try {
    const res = await axios.get(POI_API, { params: { keyword: query, limit: 10 } })
    cb(res.data?.data || [])
  } catch {
    cb([])
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

const saveDraft = () => {
  const payload = {
    title: form.title,
    content: form.content,
    tagsText: form.tagsText,
    selectedTags: [...selectedTags],
    images: [...images.value],
    poi: selectedPoi.value,
    poiInput: poiInput.value,
    saved_at: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  savedAt.value = payload.saved_at
}

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const payload = JSON.parse(raw)
    form.title = payload.title || ''
    form.content = payload.content || ''
    form.tagsText = payload.tagsText || ''
    images.value = Array.isArray(payload.images) ? payload.images : []
    selectedPoi.value = payload.poi || null
    poiInput.value = payload.poiInput || payload.poi?.name || ''
    selectedTags.splice(0, selectedTags.length, ...(Array.isArray(payload.selectedTags) ? payload.selectedTags : []))
    savedAt.value = payload.saved_at || null
  } catch {
    // ignore
  }
}

const clearDraft = () => {
  form.title = ''
  form.content = ''
  form.tagsText = ''
  selectedTags.splice(0, selectedTags.length)
  images.value = []
  selectedPoi.value = null
  poiInput.value = ''
  localStorage.removeItem(STORAGE_KEY)
  savedAt.value = Date.now()
}

const submitPost = async () => {
  if (!form.title.trim() || !form.content.trim() || !images.value.length || mergedTags.value.length === 0) {
    const missing = []
    if (!form.title.trim()) missing.push('title')
    if (!form.content.trim()) missing.push('content')
    if (!images.value.length) missing.push('images')
    if (!mergedTags.value.length) missing.push('tags')
    alertType.value = 'warning'
    alertMessage.value = `Missing: ${missing.join(', ')}`
    return
  }

  submitting.value = true
  try {
    await axios.post(API_BASE, {
      title: form.title.trim(),
      content: form.content.trim(),
      images: images.value,
      tags: mergedTags.value,
      poi_id: selectedPoi.value?.id ?? null,
      user_id: auth.user?.id,
    })
    clearDraft()
    alertType.value = 'success'
    alertMessage.value = 'Published.'
    router.push('/posts')
  } catch (e) {
    alertType.value = 'error'
    alertMessage.value = e.response?.data?.message || 'Publish failed.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDraft()
  fetchTags()
})

watch(
  () => ({
    title: form.title,
    content: form.content,
    tagsText: form.tagsText,
    selectedTags: [...selectedTags],
    images: [...images.value],
    poi: selectedPoi.value,
    poiInput: poiInput.value,
  }),
  () => saveDraft(),
  { deep: true }
)

watch(
  () => imageCropOpen.value,
  (open) => {
    if (open) return
    imageCropSrc.value = ''
    imageCropInitial.value = null
    imageCropBaseUrl.value = ''
    imageEditingIndex.value = null
  }
)
</script>

<style scoped>
.publish-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 8% 0%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 30%),
    radial-gradient(circle at 96% 4%, color-mix(in srgb, #6de6ff 9%, transparent), transparent 28%),
    var(--bg-main);
}

.left-rail {
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.brand {
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
.left-rail :global(.router-link-active.rail-link) {
  background: color-mix(in srgb, var(--badge) 88%, transparent);
}

.rail-link.muted {
  color: var(--muted);
}

.tip {
  margin-top: 8px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 10px;
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
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
  gap: 12px;
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

.score-card {
  width: 220px;
}

.score-card span {
  color: var(--muted);
  font-size: 12px;
}

.score-card strong {
  display: block;
  font-size: 28px;
  margin: 2px 0 8px;
}

.layout {
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 12px;
}

.editor,
.preview {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 14px;
}

.alert {
  margin-bottom: 10px;
}

.block {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.title {
  font-weight: 700;
}

.meta {
  color: var(--muted);
  font-size: 12px;
}

.template-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 6px 12px;
  cursor: pointer;
}

.image-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.hidden-input {
  display: none;
}

.thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}

.thumb {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  border-radius: 10px;
  overflow: hidden;
  min-height: 84px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  cursor: grab;
}

.thumb-img {
  width: 100%;
  height: 84px;
}

.remove,
.crop {
  position: absolute;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
}

.remove {
  right: 5px;
  top: 5px;
  width: 22px;
  height: 22px;
}

.crop {
  left: 5px;
  bottom: 5px;
  padding: 2px 7px;
  font-size: 11px;
}

.cover-badge {
  position: absolute;
  left: 5px;
  top: 5px;
  border-radius: 999px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  cursor: pointer;
}

.poi-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.poi-option {
  display: grid;
  gap: 2px;
}

.poi-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 8px;
}

.poi-image {
  width: 54px;
  height: 54px;
  border-radius: 9px;
}

.poi-name {
  font-weight: 700;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.right {
  display: flex;
  gap: 8px;
}

.preview h3 {
  margin: 0 0 10px;
}

.preview-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
}

.preview-cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: color-mix(in srgb, var(--badge) 84%, transparent);
}

.preview-cover-img {
  width: 100%;
  height: 100%;
}

.empty-cover {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
}

.preview-body {
  padding: 12px;
}

.preview-body h4 {
  margin: 0 0 8px;
  font-size: 20px;
}

.preview-body p {
  margin: 0;
  line-height: 1.55;
}

.preview-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

.preview-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-tags span {
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--muted);
}

.checklist {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 10px;
  display: grid;
  gap: 6px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
}

.dot.ok {
  background: #10b981;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper),
:deep(.el-autocomplete .el-input__wrapper) {
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
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 940px) {
  .publish-page {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .view {
    padding: 12px;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .score-card {
    width: 100%;
  }
}
</style>
