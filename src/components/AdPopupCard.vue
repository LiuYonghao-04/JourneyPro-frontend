<template>
  <article class="ad-modal">
    <button v-if="showClose" class="ad-close" type="button" @click.stop="$emit('close')">
      {{ countdownLabel }}
    </button>
    <div class="ad-grid">
      <div class="ad-media" :class="{ empty: !mediaSrc, actionable: clickable }" @click="handlePrimaryClick">
        <CroppedImage v-if="mediaSrc" :src="mediaSrc" :alt="resolvedAd.title || 'Ad image'" class="ad-image" />
        <div v-else class="ad-empty">JourneyPro</div>
      </div>
      <div class="ad-copy" :class="{ actionable: clickable }" @click="handlePrimaryClick">
        <div class="ad-kicker">Sponsored</div>
        <h3>{{ resolvedAd.title }}</h3>
        <p v-if="resolvedAd.subtitle" class="ad-subtitle">{{ resolvedAd.subtitle }}</p>
        <p class="ad-body">{{ resolvedAd.body }}</p>
        <div class="ad-meta">
          <span>{{ resolvedAd.placement === 'map' ? 'Map placement' : 'Community placement' }}</span>
          <span>{{ resolvedAd.role_snapshot }}</span>
          <span v-if="resolvedAd.linked_post_id">Opens post #{{ resolvedAd.linked_post_id }}</span>
        </div>
        <div class="ad-actions" @click.stop>
          <a
            v-if="resolvedAd.cta_link"
            class="ad-cta"
            :href="resolvedAd.cta_link"
            target="_blank"
            rel="noreferrer"
            @click="$emit('secondary')"
          >
            {{ resolvedAd.cta_text || 'Learn more' }}
          </a>
          <button
            v-else
            class="ad-cta ghost"
            type="button"
            @click="$emit('secondary')"
          >
            {{ resolvedAd.linked_post_id ? 'Open story' : resolvedAd.cta_text || 'Got it' }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import CroppedImage from './CroppedImage.vue'
import { buildUrlWithCrop, parseUrlWithCrop } from '../utils/cropUrl'
import { proxiedImageSrc } from '../utils/imageProxy'

const props = defineProps({
  ad: {
    type: Object,
    default: () => ({}),
  },
  clickable: {
    type: Boolean,
    default: false,
  },
  countdownLabel: {
    type: String,
    default: 'Close in 5s',
  },
  showClose: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['primary', 'secondary', 'close'])

const resolvedAd = computed(() => ({
  title: String(props.ad?.title || 'Campaign title').trim(),
  subtitle: String(props.ad?.subtitle || '').trim(),
  body: String(props.ad?.body || 'Write a concise but persuasive body. This copy will be shown inside the popup on Map or Community.').trim(),
  image_url: String(props.ad?.image_url || '').trim(),
  placement: String(props.ad?.placement || 'map').trim() || 'map',
  role_snapshot: String(props.ad?.role_snapshot || 'SVIP').trim() || 'SVIP',
  linked_post_id: Number(props.ad?.linked_post_id) > 0 ? Number(props.ad.linked_post_id) : null,
  cta_text: String(props.ad?.cta_text || 'Learn more').trim() || 'Learn more',
  cta_link: String(props.ad?.cta_link || '').trim(),
}))

const mediaSrc = computed(() => {
  const parsed = parseUrlWithCrop(resolvedAd.value.image_url)
  const base = parsed.baseUrl ? proxiedImageSrc(parsed.baseUrl) : ''
  return buildUrlWithCrop(base, parsed.crop)
})

const handlePrimaryClick = () => {
  if (!props.clickable) return
  emit('primary')
}
</script>

<style scoped>
.ad-modal {
  width: min(var(--ad-card-width, 860px), calc(100vw - 28px));
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, rgba(255, 255, 255, 0.28));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel) 98%, rgba(255, 255, 255, 0.64)), color-mix(in srgb, var(--panel) 92%, rgba(248, 251, 255, 0.54)));
  box-shadow:
    0 34px 86px rgba(15, 23, 42, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  position: relative;
  overflow: hidden;
}

.ad-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(77, 140, 255, 0.14), transparent 34%),
    radial-gradient(circle at bottom right, rgba(116, 216, 255, 0.12), transparent 30%);
}

.ad-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, rgba(255, 255, 255, 0.42));
  color: var(--fg);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  font-family: 'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ad-grid {
  display: grid;
  grid-template-columns: 276px minmax(0, 1fr);
  gap: 24px;
  padding: 22px;
  align-items: start;
}

.ad-media {
  aspect-ratio: 3 / 4;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 14px 28px rgba(15, 23, 42, 0.1);
}

.ad-image {
  width: 100%;
  height: 100%;
}

.ad-media.actionable,
.ad-copy.actionable {
  cursor: pointer;
}

.ad-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-family: 'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.06em;
  background:
    radial-gradient(circle at top, color-mix(in srgb, #4d8cff 16%, transparent), transparent 46%),
    color-mix(in srgb, var(--surface) 92%, transparent);
}

.ad-copy {
  padding: 18px 12px 10px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 372px;
  min-width: 0;
}

.ad-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #4d8cff;
  font-family: 'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.ad-copy h3 {
  margin: 0;
  font-size: 26px;
  line-height: 1.08;
  color: var(--fg);
  font-family: 'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif;
  font-weight: 700;
  letter-spacing: -0.04em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ad-subtitle,
.ad-body {
  margin: 0;
  color: var(--muted);
  line-height: 1.58;
  font-family: 'Manrope', 'Segoe UI', sans-serif;
}

.ad-subtitle {
  font-size: 16px;
  font-weight: 600;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ad-body {
  font-size: 14px;
  color: color-mix(in srgb, var(--fg) 76%, transparent);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
}

.ad-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  margin-top: 2px;
}

.ad-meta span {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  min-height: 34px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-family: 'Manrope', 'Segoe UI', sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--fg) 82%, transparent);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(245, 248, 255, 0.46));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.ad-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}

.ad-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 999px;
  min-height: 42px;
  padding: 10px 18px;
  background: linear-gradient(120deg, #4d8cff, #74d8ff);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  font-family: 'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif;
  letter-spacing: -0.02em;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  box-shadow:
    0 12px 24px color-mix(in srgb, #4d8cff 24%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
  transition: transform 0.5s ease, box-shadow 0.5s ease, filter 0.5s ease;
}

.ad-cta.ghost {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  color: var(--fg);
  box-shadow: none;
}

.ad-cta:hover {
  transform: translateY(-1px);
  filter: saturate(1.06);
}

@media (max-width: 780px) {
  .ad-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }

  .ad-media {
    aspect-ratio: 3 / 4;
    max-height: 360px;
  }

  .ad-copy {
    height: auto;
    padding: 0 4px 6px;
  }
}
</style>
