<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="860px"
    class="crop-dialog"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="crop-layout">
      <div class="crop-stage">
        <img ref="imgEl" class="crop-img" :src="src" alt="source" />
      </div>

      <aside class="crop-side">
        <div class="preview-block">
          <div class="preview-title">Preview</div>
          <div class="preview-box" :style="previewStyle">
            <div ref="previewEl" class="preview-inner" />
          </div>
          <div class="preview-meta">
            <div>Output: {{ outputWidth }} x {{ outputHeight }}</div>
            <div>Ratio: {{ ratioLabel }}</div>
          </div>
        </div>

        <div class="crop-actions">
          <el-button :disabled="!ready || busy" @click="autoCrop">Auto</el-button>
          <el-button :disabled="!ready || busy" @click="resetCrop">Reset</el-button>
          <el-button type="primary" :loading="busy" :disabled="!ready" @click="confirmCrop">
            Use
          </el-button>
        </div>

        <div class="crop-tip">
          Drag to move. Scroll to zoom. Resize with corners.
        </div>
      </aside>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  src: { type: String, default: '' },
  title: { type: String, default: 'Crop image' },
  aspectRatio: { type: Number, default: 1 },
  outputWidth: { type: Number, default: 120 },
  outputHeight: { type: Number, default: 120 },
  previewWidth: { type: Number, default: 180 },
  initialCrop: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const imgEl = ref(null)
const previewEl = ref(null)
const ready = ref(false)
const busy = ref(false)

let cropper = null

const ratioLabel = computed(() => {
  const r = props.aspectRatio || 1
  if (Math.abs(r - 1) < 0.0001) return '1:1'
  if (Math.abs(r - 3 / 4) < 0.0001) return '3:4'
  if (Math.abs(r - 4 / 3) < 0.0001) return '4:3'
  return r.toFixed(2)
})

const previewStyle = computed(() => {
  const w = Math.max(120, Math.min(260, props.previewWidth || 180))
  const h = Math.round(w / (props.aspectRatio || 1))
  return { width: `${w}px`, height: `${h}px` }
})

const destroyCropper = () => {
  ready.value = false
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0))
const round6 = (n) => Math.round(n * 1e6) / 1e6

const applyAutoCrop = () => {
  if (!cropper) return
  const img = cropper.getImageData()
  const w = img?.naturalWidth || 0
  const h = img?.naturalHeight || 0
  const r = props.aspectRatio || 1
  if (!w || !h || !r) return

  let cropW = w
  let cropH = h
  let x = 0
  let y = 0
  if (w / h > r) {
    cropH = h
    cropW = h * r
    x = (w - cropW) / 2
    y = 0
  } else {
    cropW = w
    cropH = w / r
    x = 0
    y = (h - cropH) / 2
  }
  cropper.setData({ x, y, width: cropW, height: cropH })
}

const applyInitialCrop = () => {
  if (!cropper || !props.initialCrop) return false
  const img = cropper.getImageData()
  const w = img?.naturalWidth || 0
  const h = img?.naturalHeight || 0
  if (!w || !h) return false

  const c = props.initialCrop
  const x = clamp01(c.x) * w
  const y = clamp01(c.y) * h
  const cw = Math.max(1, clamp01(c.w) * w)
  const ch = Math.max(1, clamp01(c.h) * h)
  cropper.setData({ x, y, width: cw, height: ch })
  return true
}

const initCropper = async () => {
  if (!props.modelValue || !props.src) return
  await nextTick()

  destroyCropper()
  if (!imgEl.value) return

  cropper = new Cropper(imgEl.value, {
    aspectRatio: props.aspectRatio || 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    background: false,
    checkCrossOrigin: false,
    guides: false,
    center: false,
    highlight: false,
    responsive: true,
    toggleDragModeOnDblclick: false,
    preview: previewEl.value ? previewEl.value : undefined,
    ready() {
      ready.value = true
      const ok = applyInitialCrop()
      if (!ok) applyAutoCrop()
    },
  })
}

const autoCrop = () => {
  if (!cropper) return
  cropper.setAspectRatio(props.aspectRatio || 1)
  applyAutoCrop()
}

const resetCrop = () => {
  if (!cropper) return
  cropper.reset()
  cropper.setAspectRatio(props.aspectRatio || 1)
  applyAutoCrop()
}

const confirmCrop = async () => {
  if (!cropper || busy.value) return
  busy.value = true
  try {
    const data = cropper.getData(true)
    const img = cropper.getImageData()
    const w = img?.naturalWidth || 0
    const h = img?.naturalHeight || 0
    if (!w || !h) return
    const crop = {
      x: round6(clamp01(data.x / w)),
      y: round6(clamp01(data.y / h)),
      w: round6(clamp01(data.width / w)),
      h: round6(clamp01(data.height / h)),
    }
    emit('confirm', crop)
  } finally {
    busy.value = false
  }
}

watch(
  () => [props.modelValue, props.src, props.aspectRatio],
  ([open]) => {
    if (open) initCropper()
    else destroyCropper()
  }
)

onBeforeUnmount(() => destroyCropper())
</script>

<style scoped>
.crop-layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: start;
}

.crop-stage {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: var(--badge);
  border: 1px solid var(--panel-border);
  min-height: 480px;
  display: grid;
  place-items: center;
}

.crop-img {
  max-width: 100%;
  max-height: 480px;
  display: block;
}

.crop-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-block {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--panel);
  padding: 12px;
  box-shadow: var(--shadow);
}

.preview-title {
  font-weight: 700;
  color: var(--fg);
  font-size: 13px;
  margin-bottom: 10px;
}

.preview-box {
  border-radius: 14px;
  overflow: hidden;
  background: var(--badge);
  border: 1px solid var(--badge-border);
  display: grid;
  place-items: center;
}

.preview-inner {
  width: 100%;
  height: 100%;
}

.preview-meta {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
  display: grid;
  gap: 4px;
}

.crop-actions {
  display: flex;
  gap: 8px;
}

.crop-tip {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

@media (max-width: 980px) {
  .crop-layout {
    grid-template-columns: 1fr;
  }
}
</style>
