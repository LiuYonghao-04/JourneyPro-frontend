<template>
  <Teleport to="body">
    <div v-if="open && ad" class="ad-backdrop" @click.self="close">
      <article class="ad-modal" :class="{ clickable: canOpenLinkedPost }" @click="handlePrimaryClick">
        <button class="ad-close" type="button" @click.stop="close">
          {{ countdownLabel }}
        </button>
        <div class="ad-grid">
          <div class="ad-media" :class="{ empty: !ad.image_url }">
            <img v-if="ad.image_url" :src="ad.image_url" :alt="ad.title || 'Ad image'" />
            <div v-else class="ad-empty">JourneyPro</div>
          </div>
          <div class="ad-copy">
            <div class="ad-kicker">Sponsored</div>
            <h3>{{ ad.title }}</h3>
            <p v-if="ad.subtitle" class="ad-subtitle">{{ ad.subtitle }}</p>
            <p class="ad-body">{{ ad.body }}</p>
            <div class="ad-meta">
              <span>{{ ad.placement === 'map' ? 'Map placement' : 'Community placement' }}</span>
              <span>{{ ad.role_snapshot }}</span>
              <span v-if="ad.linked_post_id">Opens post #{{ ad.linked_post_id }}</span>
            </div>
            <div class="ad-actions">
              <a
                v-if="ad.cta_link"
                class="ad-cta"
                :href="ad.cta_link"
                target="_blank"
                rel="noreferrer"
                @click.stop="close"
              >
                {{ ad.cta_text || 'Learn more' }}
              </a>
              <button v-else class="ad-cta ghost" type="button" @click.stop="handleSecondaryAction">
                {{ ad.linked_post_id ? 'Open story' : ad.cta_text || 'Got it' }}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'
import { getClientSessionKey } from '../utils/clientSession'

const props = defineProps({
  placement: {
    type: String,
    default: 'map',
  },
})

const auth = useAuthStore()
const router = useRouter()
const ad = ref(null)
const dismissed = ref(false)
const loading = ref(false)
const countdownMs = ref(3000)
const clientSessionKey = getClientSessionKey()
const cooldownKey = computed(() => `jp_ad_popup_cooldown_${props.placement}`)
let countdownTimer = null

const open = computed(() => !!ad.value && !dismissed.value)
const canOpenLinkedPost = computed(() => Number(ad.value?.linked_post_id) > 0)
const countdownLabel = computed(() => `Close in ${Math.max(0, Math.ceil(countdownMs.value / 1000))}s`)

const close = () => {
  dismissed.value = true
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  try {
    localStorage.setItem(cooldownKey.value, String(Date.now()))
  } catch {
    // ignore
  }
}

const handlePrimaryClick = async () => {
  if (!canOpenLinkedPost.value) return
  const postId = Number(ad.value?.linked_post_id)
  close()
  await router.push({ path: `/posts/postsid=${postId}` })
}

const handleSecondaryAction = async () => {
  if (canOpenLinkedPost.value) {
    await handlePrimaryClick()
    return
  }
  close()
}

const isCoolingDown = () => {
  try {
    const raw = Number(localStorage.getItem(cooldownKey.value) || 0)
    return Number.isFinite(raw) && raw > 0 && Date.now() - raw < 20 * 60 * 1000
  } catch {
    return false
  }
}

const fetchAd = async () => {
  if (loading.value || isCoolingDown()) return
  loading.value = true
  try {
    const params = new URLSearchParams({
      placement: props.placement,
      session_key: clientSessionKey,
    })
    if (auth.user?.id) params.set('user_id', String(auth.user.id))
    const res = await fetch(apiUrl(`/api/ads/serve?${params.toString()}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.item) return
    ad.value = data.item
    dismissed.value = false
    countdownMs.value = 3000
  } catch (err) {
    console.error('fetch popup ad error', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => open.value,
  (visible) => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    if (!visible) return
    countdownMs.value = 3000
    countdownTimer = setInterval(() => {
      countdownMs.value = Math.max(0, countdownMs.value - 100)
      if (countdownMs.value <= 0) {
        close()
      }
    }, 100)
  },
  { immediate: true }
)

onMounted(() => {
  fetchAd()
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
.ad-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 15, 32, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210000;
  padding: 20px;
}

.ad-modal {
  width: min(760px, calc(100vw - 28px));
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.28);
  position: relative;
  overflow: hidden;
}

.ad-modal.clickable {
  cursor: pointer;
}

.ad-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  color: var(--fg);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
}

.ad-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.1fr);
}

.ad-media {
  min-height: 320px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
}

.ad-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ad-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.ad-copy {
  padding: 36px 30px 28px;
  display: grid;
  gap: 14px;
}

.ad-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d8cff;
}

.ad-copy h3 {
  margin: 0;
  font-size: 28px;
  line-height: 1.08;
  color: var(--fg);
}

.ad-subtitle,
.ad-body {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.ad-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ad-meta span {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  padding: 6px 10px;
  font-size: 12px;
  color: color-mix(in srgb, var(--fg) 82%, transparent);
}

.ad-actions {
  display: flex;
  gap: 10px;
}

.ad-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 999px;
  padding: 10px 16px;
  background: linear-gradient(120deg, #4d8cff, #74d8ff);
  color: #fff;
  font-weight: 700;
}

.ad-cta.ghost {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  color: var(--fg);
}

@media (max-width: 780px) {
  .ad-grid {
    grid-template-columns: 1fr;
  }

  .ad-media {
    min-height: 220px;
  }
}
</style>
