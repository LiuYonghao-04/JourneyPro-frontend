<template>
  <Teleport to="body">
    <Transition name="ad-fade" @after-leave="handleAfterLeave">
      <div v-if="open && ad" class="ad-backdrop" @click.self="close">
        <AdPopupCard
          :ad="ad"
          :clickable="canOpenLinkedPost"
          :countdown-label="countdownLabel"
          @close="close"
          @primary="handlePrimaryClick"
          @secondary="handleSecondaryAction"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'
import { getClientSessionKey } from '../utils/clientSession'
import AdPopupCard from './AdPopupCard.vue'

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
const countdownMs = ref(5000)
const clientSessionKey = getClientSessionKey()
const viewerKey = computed(() => (auth.user?.id ? `user:${auth.user.id}` : `guest:${clientSessionKey}`))
const cooldownKey = computed(() => `jp_ad_popup_cooldown_${props.placement}_${viewerKey.value}`)
let countdownTimer = null

const open = computed(() => !!ad.value && !dismissed.value)
const canOpenLinkedPost = computed(() => Number(ad.value?.linked_post_id) > 0)
const countdownLabel = computed(() => `Close in ${Math.max(0, Math.ceil(countdownMs.value / 1000))}s`)

const close = () => {
  if (dismissed.value) return
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

const handleAfterLeave = () => {
  ad.value = null
}

const handlePrimaryClick = async () => {
  if (!canOpenLinkedPost.value) return
  const postId = Number(ad.value?.linked_post_id)
  close()
  await router.push({ path: `/posts/postsid=${postId}` })
}

const handleSecondaryAction = async () => {
  if (ad.value?.cta_link) {
    close()
    return
  }
  if (canOpenLinkedPost.value) {
    await handlePrimaryClick()
    return
  }
  close()
}

const isCoolingDown = () => {
  try {
    const raw = Number(localStorage.getItem(cooldownKey.value) || 0)
    return Number.isFinite(raw) && raw > 0 && Date.now() - raw < 60 * 1000
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
    countdownMs.value = 5000
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
    countdownMs.value = 5000
    countdownTimer = setInterval(() => {
      countdownMs.value = Math.max(0, countdownMs.value - 100)
      if (countdownMs.value <= 0) {
        close()
      }
    }, 100)
  },
  { immediate: true }
)

watch(
  () => [props.placement, auth.user?.id || null],
  () => {
    ad.value = null
    dismissed.value = false
    fetchAd()
  }
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
  background:
    radial-gradient(circle at top, rgba(77, 140, 255, 0.14), transparent 44%),
    rgba(8, 15, 32, 0.44);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210000;
  padding: 20px;
  backdrop-filter: blur(8px) saturate(132%);
  -webkit-backdrop-filter: blur(8px) saturate(132%);
}

.ad-fade-enter-active,
.ad-fade-leave-active {
  transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.ad-fade-enter-from,
.ad-fade-leave-to {
  opacity: 0;
}

.ad-fade-enter-active :deep(.ad-modal),
.ad-fade-leave-active :deep(.ad-modal) {
  transition:
    opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.ad-fade-enter-from :deep(.ad-modal) {
  opacity: 0;
  transform: translateY(18px) scale(0.985);
  filter: blur(8px);
}

.ad-fade-leave-to :deep(.ad-modal) {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  filter: blur(10px);
}
</style>
