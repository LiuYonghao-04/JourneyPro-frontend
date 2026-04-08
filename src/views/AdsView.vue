<template>
  <div class="ads-page">
    <section class="ads-hero">
      <div>
        <h1>Ad Studio</h1>
        <p>SVIP campaigns are stored in JourneyPro database tables and rendered as popup ads inside Map and Community. Paste a remote image URL, write the copy, and track impressions in one place.</p>
      </div>
      <div class="ads-hero-badges">
        <span class="hero-badge">{{ auth.roleLabel }}</span>
        <span class="hero-badge strong">{{ quotaHeadline }}</span>
      </div>
    </section>

    <section class="ads-grid">
      <article class="ads-card form-card">
        <header class="card-head">
          <div>
            <span class="card-kicker">Create</span>
            <h2>Launch popup campaign</h2>
          </div>
          <span class="quota-pill">{{ quotaDetail }}</span>
        </header>

        <div v-if="flashText" class="flash-success">{{ flashText }}</div>
        <div v-if="errorText" class="flash-error">{{ errorText }}</div>

        <div class="form-grid">
          <label>
            <span>Title</span>
            <input v-model.trim="form.title" type="text" :maxlength="TITLE_LIMIT" placeholder="A sharp campaign headline" />
          </label>
          <label>
            <span>Subtitle</span>
            <input v-model.trim="form.subtitle" type="text" :maxlength="SUBTITLE_LIMIT" placeholder="Optional secondary line" />
          </label>
          <label class="full">
            <span>Body</span>
            <textarea v-model.trim="form.body" rows="4" :maxlength="BODY_LIMIT" placeholder="Describe the offer, place, or event." />
          </label>
          <label>
            <span>Placement</span>
            <select v-model="form.placement">
              <option value="map">Map popup</option>
              <option value="posts">Community popup</option>
            </select>
          </label>
          <label>
            <span>CTA text</span>
            <input v-model.trim="form.cta_text" type="text" :maxlength="CTA_TEXT_LIMIT" placeholder="Book now / Learn more" />
          </label>
          <label class="full">
            <span>Link to an existing story (optional)</span>
            <div class="post-search-row">
              <input
                v-model.trim="postSearchQuery"
                type="text"
                maxlength="120"
                placeholder="Search older posts by title or content"
                @keydown.enter.prevent="searchPosts"
              />
              <button class="btn-ghost" type="button" :disabled="postSearchBusy" @click="searchPosts">
                {{ postSearchBusy ? 'Searching...' : 'Search' }}
              </button>
            </div>
            <div v-if="selectedLinkedPost" class="linked-post-pill">
              <span>Linked story: {{ selectedLinkedPost.title }}</span>
              <button class="btn-ghost" type="button" @click="clearLinkedPost">Remove</button>
            </div>
            <div v-if="postSearchResults.length" class="post-search-results">
              <button
                v-for="post in postSearchResults"
                :key="post.id"
                class="post-search-item"
                type="button"
                @click="selectLinkedPost(post)"
              >
                <span class="post-search-title">{{ post.title }}</span>
                <span class="post-search-meta">#{{ post.id }}</span>
              </button>
            </div>
          </label>
          <label class="full">
            <span>Image URL</span>
            <div class="image-url-stack">
              <input
                v-model.trim="form.image_url"
                type="url"
                maxlength="1024"
                placeholder="https://images.example.com/campaign-cover.jpg"
              />
              <div class="image-tools">
                <button class="btn-ghost" type="button" :disabled="!cropReadyUrl" @click="openImageCrop">
                  {{ hasImageCrop ? 'Adjust crop' : 'Crop image' }}
                </button>
                <button v-if="hasImageCrop" class="btn-ghost" type="button" @click="clearImageCrop">
                  Reset crop
                </button>
                <span class="image-hint">Portrait crop only. JourneyPro will resize automatically for popup rendering.</span>
              </div>
            </div>
          </label>
          <label class="full helper-field">
            <span>CTA link</span>
            <input v-model.trim="form.cta_link" type="url" maxlength="1024" placeholder="https://example.com" />
          </label>
          <label class="full helper-field">
            <span>Storage note</span>
            <div class="helper-copy">Campaign records are stored in the database. Images are referenced by remote URL only and are not uploaded into local app storage.</div>
          </label>
          <label class="full helper-field">
            <span>Creative guidance</span>
            <div class="helper-copy">For a stable popup layout, keep copy concise. Recommended limits: title {{ TITLE_LIMIT }}, subtitle {{ SUBTITLE_LIMIT }}, body {{ BODY_LIMIT }}, CTA {{ CTA_TEXT_LIMIT }}.</div>
          </label>
        </div>

        <div class="form-actions">
          <button class="btn-primary" type="button" :disabled="!canCreate || createBusy" @click="createCampaign">
            {{ createBusy ? 'Publishing...' : 'Publish popup ad' }}
          </button>
        </div>
      </article>

      <article class="ads-card preview-card">
        <header class="card-head">
          <div>
            <span class="card-kicker">Preview</span>
            <h2>Popup template</h2>
          </div>
          <span class="placement-pill">{{ form.placement === 'map' ? 'Map' : 'Community' }}</span>
        </header>

        <div class="preview-shell">
          <AdPopupCard
            :ad="previewAd"
            countdown-label="Close in 5s"
            :show-close="true"
            :clickable="false"
            class="preview-popup"
          />
        </div>
      </article>
    </section>

    <section class="ads-card campaigns-card">
      <header class="card-head">
        <div>
          <span class="card-kicker">Traffic</span>
          <h2>Your campaigns</h2>
        </div>
        <button class="btn-ghost" type="button" :disabled="loading" @click="fetchCampaigns">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <div v-if="!campaigns.length && !loading" class="empty-state">No campaigns yet. Publish your first popup ad above.</div>
      <div v-else class="campaign-list">
        <article v-for="item in campaigns" :key="item.id" class="campaign-item">
          <div class="campaign-media" :class="{ empty: !item.image_url }">
            <CroppedImage v-if="item.image_url" :src="item.image_url" :alt="item.title" class="campaign-image" />
            <div v-else class="preview-empty">No image</div>
          </div>
          <div class="campaign-copy">
            <div class="campaign-top">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.subtitle || item.body }}</p>
              </div>
              <span class="status-pill" :class="item.status.toLowerCase()">{{ item.status }}</span>
            </div>
            <div class="campaign-meta">
              <span>{{ item.placement === 'map' ? 'Map popup' : 'Community popup' }}</span>
              <span>{{ item.impression_count }} impressions</span>
              <span>{{ item.unique_viewer_count }} viewers</span>
              <span v-if="item.linked_post_id">{{ item.linked_post_title || `Post #${item.linked_post_id}` }}</span>
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="campaign-actions">
              <button
                class="btn-ghost"
                type="button"
                :disabled="busyId === item.id"
                @click="updateStatus(item, item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')"
              >
                {{ item.status === 'ACTIVE' ? 'Pause' : 'Resume' }}
              </button>
              <button class="btn-ghost danger" type="button" :disabled="busyId === item.id" @click="deleteCampaign(item)">
                Delete
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <ImageCropperDialog
      v-model="imageCropOpen"
      :src="imageCropSrc"
      title="Crop ad image"
      :aspect-ratio="3 / 4"
      :output-width="300"
      :output-height="400"
      :preview-width="180"
      :initial-crop="imageCropInitial"
      @confirm="onImageCropConfirm"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'
import AdPopupCard from '../components/AdPopupCard.vue'
import CroppedImage from '../components/CroppedImage.vue'
import ImageCropperDialog from '../components/ImageCropperDialog.vue'
import { buildUrlWithCrop, parseUrlWithCrop } from '../utils/cropUrl'
import { proxiedImageSrc } from '../utils/imageProxy'

const TITLE_LIMIT = 56
const SUBTITLE_LIMIT = 88
const BODY_LIMIT = 220
const CTA_TEXT_LIMIT = 20

const auth = useAuthStore()
const loading = ref(false)
const createBusy = ref(false)
const busyId = ref(0)
const flashText = ref('')
const errorText = ref('')
const quota = ref(null)
const campaigns = ref([])
const postSearchQuery = ref('')
const postSearchBusy = ref(false)
const postSearchResults = ref([])
const selectedLinkedPost = ref(null)
const imageCropOpen = ref(false)
const imageCropSrc = ref('')
const imageCropInitial = ref(null)
const imageCropBaseUrl = ref('')
const form = ref({
  title: '',
  subtitle: '',
  body: '',
  image_url: '',
  linked_post_id: null,
  placement: 'map',
  cta_text: 'Learn more',
  cta_link: '',
})

const quotaHeadline = computed(() => {
  if (!quota.value) return 'Checking quota'
  if (quota.value.unlimited) return 'Unlimited slots'
  return `${quota.value.remaining ?? 0} slots left`
})

const quotaDetail = computed(() => {
  if (!quota.value) return 'Loading quota'
  if (quota.value.unlimited) return 'Unlimited ad publishing for this role'
  return `${quota.value.used}/${quota.value.monthly_limit} campaigns used this month`
})

const canCreate = computed(() => {
  if (!auth.canManageAds) return false
  if (!quota.value) return false
  if (!quota.value.unlimited && Number(quota.value.remaining || 0) <= 0) return false
  return !!form.value.title && !!form.value.body && !!form.value.image_url
})

const parsedImage = computed(() => parseUrlWithCrop(form.value.image_url))
const cropReadyUrl = computed(() => String(parsedImage.value.baseUrl || form.value.image_url || '').trim())
const hasImageCrop = computed(() => !!parsedImage.value.crop)
const previewAd = computed(() => ({
  title: form.value.title || 'Campaign title',
  subtitle: form.value.subtitle || 'Optional supporting message for the popup.',
  body: form.value.body || 'Write a concise but persuasive body. This copy will be shown inside the popup on Map or Community.',
  image_url: form.value.image_url || '',
  linked_post_id: form.value.linked_post_id || null,
  placement: form.value.placement || 'map',
  cta_text: form.value.cta_text || 'Learn more',
  cta_link: form.value.cta_link || '',
  role_snapshot: auth.roleLabel,
}))

const resetMessages = () => {
  flashText.value = ''
  errorText.value = ''
}

const formatDate = (value) => {
  const ts = new Date(value || '').getTime()
  if (!Number.isFinite(ts) || ts <= 0) return 'Unknown time'
  return new Date(ts).toLocaleString()
}

const fetchCampaigns = async () => {
  if (!auth.user?.id) return
  loading.value = true
  resetMessages()
  try {
    const res = await fetch(apiUrl(`/api/ads/mine?user_id=${encodeURIComponent(String(auth.user.id))}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load campaigns')
    }
    campaigns.value = Array.isArray(data.items) ? data.items : []
    quota.value = data.quota || null
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to load campaigns')
  } finally {
    loading.value = false
  }
}

const searchPosts = async () => {
  if (!auth.user?.id || postSearchBusy.value) return
  postSearchBusy.value = true
  try {
    const params = new URLSearchParams({
      user_id: String(auth.user.id),
      limit: '8',
    })
    if (postSearchQuery.value) params.set('q', postSearchQuery.value)
    const res = await fetch(apiUrl(`/api/ads/post-search?${params.toString()}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to search stories')
    }
    postSearchResults.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to search stories')
  } finally {
    postSearchBusy.value = false
  }
}

const selectLinkedPost = (post) => {
  if (!post?.id) return
  selectedLinkedPost.value = post
  form.value.linked_post_id = Number(post.id)
  postSearchResults.value = []
}

const clearLinkedPost = () => {
  selectedLinkedPost.value = null
  form.value.linked_post_id = null
}

const openImageCrop = () => {
  const raw = cropReadyUrl.value
  if (!raw) return
  imageCropBaseUrl.value = parsedImage.value.baseUrl || raw
  imageCropInitial.value = parsedImage.value.crop
  imageCropSrc.value = proxiedImageSrc(imageCropBaseUrl.value)
  imageCropOpen.value = true
}

const clearImageCrop = () => {
  const base = parsedImage.value.baseUrl || form.value.image_url
  form.value.image_url = String(base || '').trim()
}

const onImageCropConfirm = (crop) => {
  const base = imageCropBaseUrl.value || parsedImage.value.baseUrl || form.value.image_url
  if (!base) {
    imageCropOpen.value = false
    return
  }
  form.value.image_url = buildUrlWithCrop(base, crop)
  imageCropOpen.value = false
}

const createCampaign = async () => {
  if (!canCreate.value || createBusy.value) return
  createBusy.value = true
  resetMessages()
  try {
    const res = await fetch(apiUrl('/api/ads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user?.id,
        ...form.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to create campaign')
    }
    campaigns.value = [data.item, ...campaigns.value]
    quota.value = data.quota || quota.value
    flashText.value = 'Popup campaign published.'
    form.value = {
      title: '',
      subtitle: '',
      body: '',
      image_url: '',
      linked_post_id: null,
      placement: 'map',
      cta_text: 'Learn more',
      cta_link: '',
    }
    selectedLinkedPost.value = null
    postSearchResults.value = []
    postSearchQuery.value = ''
    imageCropBaseUrl.value = ''
    imageCropInitial.value = null
    imageCropSrc.value = ''
    imageCropOpen.value = false
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to create campaign')
  } finally {
    createBusy.value = false
  }
}

const updateStatus = async (item, status) => {
  if (!item?.id || busyId.value) return
  busyId.value = Number(item.id)
  resetMessages()
  try {
    const res = await fetch(apiUrl(`/api/ads/${encodeURIComponent(String(item.id))}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user?.id,
        status,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.item) {
      throw new Error(data?.message || 'Failed to update campaign')
    }
    campaigns.value = campaigns.value.map((entry) => (Number(entry.id) === Number(item.id) ? data.item : entry))
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to update campaign')
  } finally {
    busyId.value = 0
  }
}

const deleteCampaign = async (item) => {
  if (!item?.id || busyId.value) return
  busyId.value = Number(item.id)
  resetMessages()
  try {
    const res = await fetch(apiUrl(`/api/ads/${encodeURIComponent(String(item.id))}?user_id=${encodeURIComponent(String(auth.user?.id || ''))}`), {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to delete campaign')
    }
    campaigns.value = campaigns.value.filter((entry) => Number(entry.id) !== Number(item.id))
    flashText.value = 'Campaign deleted.'
    fetchCampaigns()
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to delete campaign')
  } finally {
    busyId.value = 0
  }
}

onMounted(() => {
  fetchCampaigns()
})
</script>

<style scoped>
.ads-page {
  min-height: calc(100vh - 56px);
  padding: 24px;
  box-sizing: border-box;
  display: grid;
  gap: 18px;
  background: var(--bg-pattern);
}

.ads-hero,
.ads-card {
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  box-shadow: var(--shadow);
}

.ads-hero {
  padding: 22px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ads-hero h1,
.card-head h2,
.campaign-top h3 {
  margin: 0;
  color: var(--fg);
}

.ads-hero p,
.card-head .card-kicker,
.preview-subtitle,
.preview-body,
.campaign-top p,
.flash-success,
.flash-error {
  margin: 0;
}

.ads-hero p,
.campaign-top p {
  color: var(--muted);
  line-height: 1.6;
}

.ads-hero-badges,
.campaign-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-badge,
.quota-pill,
.placement-pill,
.campaign-meta span,
.status-pill {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  padding: 6px 10px;
  font-size: 12px;
  color: color-mix(in srgb, var(--fg) 84%, transparent);
}

.hero-badge.strong {
  color: #4d8cff;
  border-color: color-mix(in srgb, #4d8cff 38%, transparent);
  background: color-mix(in srgb, #4d8cff 10%, transparent);
}

.ads-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
}

.ads-card {
  padding: 22px;
  display: grid;
  gap: 16px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.card-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d8cff;
}

.flash-success,
.flash-error,
.empty-state {
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px;
}

.flash-success {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
  color: #15803d;
}

.flash-error {
  background: color-mix(in srgb, #ef4444 12%, transparent);
  border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
  color: #b91c1c;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid label {
  display: grid;
  gap: 8px;
  color: var(--fg);
  font-size: 13px;
  font-weight: 600;
}

.form-grid label.full {
  grid-column: 1 / -1;
}

.form-grid input,
.form-grid textarea,
.form-grid select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  color: var(--fg);
  padding: 12px 14px;
  box-sizing: border-box;
}

.image-url-stack {
  display: grid;
  gap: 10px;
}

.image-tools {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.image-hint {
  font-size: 12px;
  color: var(--muted);
}

.post-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.linked-post-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, #4d8cff 28%, transparent);
  background: color-mix(in srgb, #4d8cff 10%, transparent);
  color: color-mix(in srgb, var(--fg) 88%, transparent);
  padding: 10px 12px;
  font-size: 12px;
}

.post-search-results {
  display: grid;
  gap: 8px;
}

.post-search-item {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 75%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  color: var(--fg);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.post-search-title {
  font-weight: 600;
}

.post-search-meta {
  color: var(--muted);
  font-size: 12px;
}

.helper-field {
  align-content: start;
}

.helper-copy {
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--panel-border) 75%, transparent);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--muted);
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.55;
}

.form-actions,
.campaign-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-ghost,
.preview-cta {
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary,
.preview-cta {
  background: linear-gradient(120deg, #4d8cff, #74d8ff);
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-ghost {
  background: transparent;
  color: var(--fg);
  border-color: color-mix(in srgb, var(--panel-border) 78%, transparent);
}

.btn-ghost.danger {
  color: #b91c1c;
  border-color: color-mix(in srgb, #ef4444 35%, transparent);
}

.preview-shell {
  display: flex;
  justify-content: center;
  padding: 6px 0 0;
  pointer-events: none;
}

.preview-popup {
  --ad-card-width: 100%;
}

.campaign-image {
  width: 100%;
  height: 100%;
}

.preview-empty,
.empty-state {
  display: grid;
  place-items: center;
  color: var(--muted);
}

.campaign-list {
  display: grid;
  gap: 14px;
}

.campaign-item {
  display: grid;
  grid-template-columns: 138px minmax(0, 1fr);
  gap: 16px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  overflow: hidden;
}

.campaign-media {
  aspect-ratio: 3 / 4;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
}

.campaign-copy {
  padding: 16px 18px 16px 0;
  display: grid;
  gap: 12px;
}

.campaign-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.campaign-top h3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.14;
}

.campaign-top p {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.status-pill.active {
  color: #15803d;
}

.status-pill.paused {
  color: #b45309;
}

@media (max-width: 1080px) {
  .ads-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .ads-page {
    padding: 16px;
  }

  .ads-hero,
  .card-head,
  .campaign-top {
    grid-template-columns: 1fr;
    display: grid;
  }

  .campaign-item {
    grid-template-columns: 1fr;
  }

  .campaign-copy {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
