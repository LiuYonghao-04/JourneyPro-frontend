<template>
  <div ref="wrapEl" class="crop-wrap" :style="wrapStyle">
    <img
      ref="imgEl"
      class="crop-img"
      :src="baseUrl"
      :alt="alt"
      :style="imgStyle"
      :loading="loading"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { parseUrlWithCrop } from '../utils/cropUrl'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  loading: { type: String, default: 'lazy' },
  aspectRatio: { type: Number, default: 0 },
  fit: { type: String, default: 'cover' },
})

const emit = defineEmits(['load', 'error'])

const wrapEl = ref(null)
const imgEl = ref(null)
const container = ref({ w: 0, h: 0 })
const natural = ref({ w: 0, h: 0 })

let ro = null

const parsed = computed(() => parseUrlWithCrop(props.src))
const baseUrl = computed(() => parsed.value.baseUrl || '')
const crop = computed(() => parsed.value.crop)

const wrapStyle = computed(() => {
  if (!props.aspectRatio) return undefined
  return { aspectRatio: String(props.aspectRatio) }
})

const updateContainerSize = () => {
  if (!wrapEl.value) return
  const r = wrapEl.value.getBoundingClientRect()
  container.value = { w: r.width || 0, h: r.height || 0 }
}

const resetImage = () => {
  natural.value = { w: 0, h: 0 }
}

const handleLoad = (e) => {
  const el = e?.target
  natural.value = { w: el?.naturalWidth || 0, h: el?.naturalHeight || 0 }
  updateContainerSize()
  emit('load', e)
}

const handleError = (e) => {
  emit('error', e)
}

const imgStyle = computed(() => {
  const c = crop.value
  const cw = container.value.w
  const ch = container.value.h
  const iw = natural.value.w
  const ih = natural.value.h

  if (!c || !cw || !ch || !iw || !ih) {
    return {
      width: '100%',
      height: '100%',
      objectFit: props.fit,
    }
  }

  const cropX = c.x * iw
  const cropY = c.y * ih
  const cropW = c.w * iw
  const cropH = c.h * ih
  if (!cropW || !cropH) {
    return {
      width: '100%',
      height: '100%',
      objectFit: props.fit,
    }
  }

  const scale = cw / cropW
  const scaledW = iw * scale
  const scaledH = ih * scale
  const tx = -cropX * scale
  const ty = -cropY * scale

  return {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${scaledW}px`,
    height: `${scaledH}px`,
    transform: `translate3d(${tx}px, ${ty}px, 0)`,
    transformOrigin: '0 0',
  }
})

onMounted(() => {
  updateContainerSize()
  if (wrapEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => updateContainerSize())
    ro.observe(wrapEl.value)
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  ro = null
})

watch(
  () => baseUrl.value,
  () => resetImage()
)
</script>

<style scoped>
.crop-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.crop-img {
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}
</style>

