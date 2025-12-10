<template>
  <div class="page" :style="parallaxStyle" @mousemove="handleMouse">
    <!-- Removed floating blobs -->

    <section class="intro" ref="sections">
      <div class="intro-text" :style="introStyle">
        <div class="intro-logo">JourneyPro</div>
        <p class="intro-sub">Where routes meet stories</p>
        <div class="intro-anim">
          <span class="pulse"></span>
          <span class="pulse"></span>
          <span class="pulse"></span>
        </div>
        <a class="scroll-hint" href="#main" @click.prevent="jumpToMain">Scroll to explore &darr;</a>
      </div>
      <div class="intro-scenery">
        <div class="intro-mountain"></div>
        <div
          v-if="theme === 'light'"
          class="intro-sun"
          :style="sunStyle"
        ></div>
        <div
          v-else
          class="intro-moon"
          :style="moonStyle"
        ></div>
<!--        <div class="intro-cloud cloud-a"></div>-->
<!--        <div class="intro-cloud cloud-b"></div>-->
      </div>
    </section>

    <header class="hero" id="main">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <p class="eyebrow">JourneyPro &middot; Intelligent Trip OS</p>
        <h1>
          Plan smart. <span>Explore deeper.</span>
        </h1>
        <p class="lede">
          Not just shortest paths &mdash; discover food, scenery, and stories along every journey.
        </p>
        <div class="hero-actions">
          <RouterLink class="btn primary" to="/map">Open Map</RouterLink>
          <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
          <template v-if="!auth.user">
            <RouterLink class="btn ghost" to="/login">Login</RouterLink>
            <RouterLink class="btn ghost" to="/register">Register</RouterLink>
          </template>
        </div>
        <div class="hero-badges">
          <span class="badge">Live routing</span>
          <span class="badge">POI discovery</span>
          <span class="badge">Social planning</span>
        </div>
      </div>
      <div class="hero-visual">
        <div class="glass card" v-for="card in heroCards" :key="card.title">
          <div class="icon">{{ card.icon }}</div>
          <div class="title">{{ card.title }}</div>
          <div class="desc">{{ card.desc }}</div>
        </div>
      </div>
    </header>

    <section class="section" ref="sections">
      <div class="section-header">
        <p class="eyebrow">Why JourneyPro</p>
        <h2>Three pillars for better trips</h2>
        <p class="lede narrow">
          Curated POIs, seamless routing, and a vibrant community to keep you inspired along the way.
        </p>
      </div>
                  <div class="grid">
        <component
          v-for="f in features"
          :is="f.to ? RouterLink : 'div'"
          :to="f.to"
          class="feature card"
          :class="{ link: !!f.to, modal: !!f.modal }"
          :key="f.title"
          @click="handleFeatureClick(f)"
        >
          <div class="icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
          <div class="chip" v-for="tag in f.tags" :key="tag">{{ tag }}</div>
        </component>
      </div>
    </section>

    <section class="section alt" ref="sections">
      <div class="section-header">
        <p class="eyebrow">Flow</p>
        <h2>From idea to itinerary</h2>
      </div>
      <div class="timeline">
        <div class="step" v-for="(step, idx) in steps" :key="step.title">
          <div class="dot">{{ idx + 1 }}</div>
          <div class="body">
            <h4>{{ step.title }}</h4>
            <p>{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" ref="sections">
      <div class="cta card">
        <div>
          <p class="eyebrow">Ready?</p>
          <h2>Jump in and start planning</h2>
          <p class="lede">Map a route, post inspiration, or save POIs you love.</p>
          <div class="hero-actions">
            <RouterLink class="btn primary" to="/posts/publish">Publish Inspiration</RouterLink>
            <RouterLink class="btn ghost" to="/posts">Browse Community</RouterLink>
          </div>
        </div>
        <div class="cta-visual">
          <div class="cta-bubble">Live ETA</div>
          <div class="cta-bubble">Offline-ready</div>
          <div class="cta-bubble">Multi-stop</div>
        </div>
      </div>
    </section>
    <div v-if="modalContent" class="feature-modal" @click.self="closeModal">
      <div class="feature-modal__card">
        <h3>{{ modalContent.title }}</h3>
        <p>{{ modalContent.body }}</p>
        <button class="btn primary" @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../store/authStore'

const auth = useAuthStore()



const heroCards = [
  { icon: '🧭', title: 'Smart map', desc: 'Clean UI, focus on your route.'},
  { icon: '📍', title: 'POI precision', desc: 'Curated stops that match your vibe.'},
  { icon: '🤝', title: 'Community', desc: 'Learn from locals and fellow travelers.'},
]


const features = [
  { icon: '🧭', title: 'Adaptive routing', desc: 'Dynamic routes with POI-aware suggestions.', tags: ['live', 'safe'], to: '/map' },
  { icon: '📚', title: 'POI library', desc: 'Search by mood, theme, or distance.', tags: ['food', 'sights'] },
  { icon: '💬', title: 'Social layer', desc: 'Posts, likes, saves, and chat in real time.', tags: ['social', 'realtime'], to: '/posts' },
  { icon: '🔒', title: 'Privacy-first', desc: 'Control what you share and with whom.', tags: ['secure'], modal: 'privacy' },
  { icon: '⚡', title: 'Fast UX', desc: 'Lightweight, animated, and delightful.', tags: ['fast'], modal: 'ux' },
]

const activeModal = ref(null)
const modalCopy = {
  privacy: {
    title: 'Privacy-first',
    body: 'We only store the minimum needed, and you control visibility for posts, routes, and profile.',
  },
  ux: {
    title: 'Fast UX',
    body: 'Preloading key assets, lean API responses, and animation throttling keep the experience snappy.',
  },
}
const modalContent = computed(() => (activeModal.value ? modalCopy[activeModal.value] : null))
const handleFeatureClick = (f) => {
  if (f.modal) {
    activeModal.value = f.modal
  }
}
const closeModal = () => {
  activeModal.value = null
}

const steps = [
  { title: 'Discover', desc: 'Browse community posts and curated POIs.' },
  { title: 'Plan', desc: 'Add stops, reorder, and preview on the map.' },
  { title: 'Share', desc: 'Publish, chat, and collaborate with friends.' },
]

const sections = ref([])

const tilt = ref({ x: 0, y: 0 })
const parallaxStyle = computed(() => ({
  '--px': `${tilt.value.x}px`,
  '--py': `${tilt.value.y}px`,
  '--intro-progress': introProgress.value,
}))
const introProgress = ref(0)
const scrollHandler = ref(null)
const wheelHandler = ref(null)
const introLocked = ref(true)
const introPlayed = ref(false)
const theme = ref(document.body.getAttribute('data-theme') || 'dark')
let themeObserver = null
const introStyle = computed(() => {
  if (introPlayed.value && !introLocked.value) {
    return {
      transform: 'translateY(0) scale(1)',
      opacity: 1,
      filter: 'none',
    }
  }
  const p = Math.min(Math.max(introProgress.value, 0), 1.2)
  const scale = 1 + p * 4.2 // dramatically fill screen
  const translateY = 24 - p * 80
  const opacity = Math.max(1 - p * 1.1, 0)
  const blur = p * 6
  return {
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    filter: `blur(${blur}px)`,
  }
})
const sunStyle = computed(() => {
  const isLight = theme.value === 'light'
  if (!introLocked.value) return { opacity: isLight ? 1 : 0, filter: 'none' }
  const p = Math.min(Math.max(introProgress.value, 0), 1) // 0 -> 1
  if (!isLight) return { opacity: 0, filter: 'blur(6px)' }
  if (p <= 0.15) return { opacity: 1, filter: 'none' }
  const t = Math.min(Math.max((p - 0.15) / 0.35, 0), 1) // fade 15% -> 50%
  const opacity = 1 - t
  const blur = t * 8
  return { opacity, filter: `blur(${blur}px)` }
})

const moonStyle = computed(() => {
  const isDark = theme.value === 'dark'
  if (!introLocked.value) return { opacity: isDark ? 1 : 0, filter: 'none' }
  if (!isDark) return { opacity: 0, filter: 'blur(6px)' }
  const p = Math.min(Math.max(introProgress.value, 0), 1)
  if (p <= 0.15) return { opacity: 1, filter: 'none' }
  const t = Math.min(Math.max((p - 0.15) / 0.35, 0), 1)
  const opacity = 1 - t
  const blur = t * 6
  return { opacity, filter: `blur(${blur}px)` }
})

const handleMouse = (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 10
  const y = (e.clientY / window.innerHeight - 0.5) * 10
  tilt.value = { x, y }
}

const unlockIntro = () => {
  introProgress.value = 0
  introLocked.value = false
  introPlayed.value = true
  document.body.style.overflow = ''
  if (wheelHandler.value) {
    window.removeEventListener('wheel', wheelHandler.value)
  }
  const main = document.getElementById('main')
  if (main) {
    main.scrollIntoView({ behavior: 'smooth' })
  }
}

const jumpToMain = () => {
  introProgress.value = 0
  unlockIntro()
}

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    theme.value = document.body.getAttribute('data-theme') || 'dark'
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })

  const els = document.querySelectorAll('.section, .hero, .intro')
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    },
    { threshold: 0.2 }
  )
  els.forEach((el) => observer.observe(el))

  if (introLocked.value) {
    document.body.style.overflow = 'hidden'

    const onWheel = (e) => {
      if (!introLocked.value) return
      e.preventDefault()
      const delta = e.deltaY || 0
      const next = Math.min(Math.max(introProgress.value + delta * 0.0022, 0), 1)
      introProgress.value = next
      if (next >= 1) {
        unlockIntro()
      }
    }
    wheelHandler.value = onWheel
    window.addEventListener('wheel', onWheel, { passive: false })
  }
})

onBeforeUnmount(() => {
  tilt.value = { x: 0, y: 0 }
  document.body.style.overflow = ''
  if (wheelHandler.value) {
    window.removeEventListener('wheel', wheelHandler.value)
  }
  themeObserver?.disconnect()
})
</script>

<style scoped>
:global(body[data-theme='dark']) {
  --bg-main: #0b1221;
  --bg-pattern: radial-gradient(circle at 20% 20%, rgba(110, 143, 255, 0.12), transparent 30%),
    radial-gradient(circle at 80% 0%, rgba(255, 118, 174, 0.14), transparent 28%),
    #0b1221;
  --fg: #e8ecf5;
  --muted: #c3c9d6;
  --panel: rgba(255, 255, 255, 0.05);
  --panel-border: rgba(255, 255, 255, 0.08);
  --badge: rgba(255, 255, 255, 0.06);
  --badge-border: rgba(255, 255, 255, 0.08);
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  --btn-primary: linear-gradient(120deg, #5a8cff, #7ae0ff);
  --btn-text: #0a0f1a;
  --mountain-bg: linear-gradient(180deg, rgba(90, 120, 220, 0.35), rgba(8, 12, 22, 1));
}
:global(body[data-theme='light']) {
  --bg-main: #f6f8fb;
  --bg-pattern: radial-gradient(circle at 20% 18%, rgba(255, 230, 190, 0.18), transparent 32%),
    radial-gradient(circle at 78% 8%, rgba(188, 214, 255, 0.2), transparent 30%),
    #f6f8fb;
  --fg: rgba(17, 28, 43, 0.8);
  --muted: #4b5567;
  --panel: #ffffff;
  --panel-border: #e8ebf2;
  --badge: #f3f5fb;
  --badge-border: #e3e7ef;
  --shadow: 0 14px 36px rgba(15, 35, 52, 0.12);
  --btn-primary: linear-gradient(120deg, #4d8cff, #74d8ff);
  --btn-text: #0a0f1a;
  --mountain-bg: linear-gradient(180deg, rgba(255, 230, 200, 0.65), rgba(245, 247, 251, 1));
}
:global(body) {
  background: var(--bg-main);
  transition: background 1s ease, color 1s ease;
}
 .page {
  color: var(--fg);
  min-height: 100%;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: var(--bg-pattern);
  transition: background 1s ease, color 1s ease;
}
.intro {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  perspective: 1200px;
}
.intro-text {
  text-align: center;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease;
  transform-origin: center;
  z-index: 2;
}
.intro.visible .intro-text {
  opacity: 1;
}
.intro-scenery {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  filter: blur(calc(var(--intro-progress, 0) * 1px));
}
.intro-mountain {
  position: absolute;
  bottom: -5%;
  left: 50%;
  width: 140%;
  height: 40%;
  background: var(--mountain-bg, linear-gradient(180deg, rgba(110, 143, 255, 0.35), rgba(11, 18, 33, 1)));
  border-radius: 50% 50% 0 0;
  transform: translateX(-50%) scale(calc(1 + var(--intro-progress, 0) * 4));
  transition: transform 0.6s ease, background 1s ease;
}
.intro-sun {
  position: absolute;
  top: 14%;
  left: 20%;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 235, 150, 0.95), transparent 65%),
    radial-gradient(circle, rgba(255, 245, 210, 0.8), transparent 70%);
  border-radius: 50%;
  animation: glow 6s ease-in-out infinite alternate;
  box-shadow: 0 0 50px rgba(255, 220, 160, 0.7), 0 0 90px rgba(255, 210, 140, 0.4);
  opacity: calc(1 - var(--intro-progress, 0));
  filter: blur(calc(var(--intro-progress, 0) * 6px));
  transition: opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease, box-shadow 0.9s ease, background 0.9s ease;
}
.intro-moon {
  position: absolute;
  top: 14%;
  right: 20%;
  width: 110px;
  height: 110px;
  background: radial-gradient(circle at 40% 40%, rgba(230, 236, 255, 0.95), transparent 70%);
  border-radius: 50%;
  box-shadow:
    inset -14px -12px 22px rgba(20, 28, 48, 0.45),
    10px 8px 18px rgba(0, 0, 0, 0.28);
  transform: translateX(10px);
  transition: opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease, box-shadow 0.9s ease, background 0.9s ease;
}
.intro-moon::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 60% 50%, rgba(12, 16, 28, 0.95), transparent 62%);
  border-radius: 50%;
  transform: translateX(14px);
  mix-blend-mode: multiply;
}
.intro-cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  filter: blur(2px);
}
.cloud-a {
  width: 220px;
  height: 70px;
  top: 18%;
  right: 12%;
  animation: drift 18s linear infinite;
}
.cloud-b {
  width: 180px;
  height: 60px;
  top: 28%;
  left: 18%;
  animation: drift 24s linear infinite reverse;
}
@keyframes drift {
  from {
    transform: translateX(-40px);
  }
  to {
    transform: translateX(40px);
  }
}
@keyframes glow {
  from {
    transform: scale(1);
    opacity: 0.9;
  }
  to {
    transform: scale(1.08);
    opacity: 1;
  }
}
.intro-logo {
  font-size: clamp(42px, 6vw, 64px);
  font-weight: 800;
  letter-spacing: 0.08em;
}
.intro-sub {
  color: #c3c9d6;
  margin: 10px 0 18px;
  font-size: 16px;
}
.intro-anim {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}
.pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(120deg, #6ea8ff, #7ae0ff);
  animation: pulse 1.4s ease-in-out infinite;
}
.pulse:nth-child(2) {
  animation-delay: 0.2s;
}
.pulse:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}
.scroll-hint {
  color: #7fb1ff;
  text-decoration: none;
  font-weight: 600;
}
.scroll-hint:hover {
  text-decoration: underline;
}
.hero {
  position: relative;
  overflow: hidden;
  padding: 80px 64px 60px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
  transform: translate3d(calc(var(--px, 0px) * 0.2), calc(var(--py, 0px) * 0.2), 0);
  transition: background 1s ease, color 1s ease;
}
.hero.visible .hero-content,
.section.visible .section-header,
.section.visible .grid,
.section.visible .timeline,
.section.visible .cta {
  opacity: 1;
  transform: translateY(0);
}
.hero-content,
.section-header,
.grid,
.timeline,
.cta {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(95, 149, 255, 0.18), rgba(255, 132, 172, 0.16));
  filter: blur(30px);
  opacity: 0.9;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.hero-visual {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-content: start;
  transform: translate3d(calc(var(--px, 0px) * 0.35), calc(var(--py, 0px) * 0.35), 0);
}
.glass {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.hero-visual .card .icon {
  font-size: 22px;
}
.hero-visual .card .title {
  font-weight: 700;
  margin-top: 8px;
}
.hero-visual .card .desc {
  color: #c3c9d6;
  margin-top: 4px;
  font-size: 14px;
}
.eyebrow {
  color: #7fb1ff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 12px;
}
h1 {
  font-size: clamp(36px, 5vw, 54px);
  margin: 10px 0;
  line-height: 1.1;
}
h1 span {
  color: #8ad8ff;
}
.lede {
  color: var(--muted);
  font-size: 16px;
  max-width: 520px;
  line-height: 1.6;
}
.lede.narrow {
  max-width: 640px;
}
.hero-actions,
.section .hero-actions {
  display: flex;
  gap: 12px;
  margin: 18px 0;
}
.btn {
  border-radius: 999px;
  padding: 12px 20px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  text-decoration: none;
  color: var(--fg);
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}
.btn.primary {
  background: var(--btn-primary);
  color: var(--btn-text);
  border: none;
}
.btn.ghost {
  background: transparent;
  border-color: color-mix(in srgb, var(--fg) 60%, transparent);
  color: var(--fg);
}
.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.badge {
  background: var(--badge);
  border: 1px solid var(--badge-border);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--muted);
}
.section {
  padding: 40px 64px 60px;
  position: relative;
  transition: background 1s ease, color 1s ease;
}
.section.alt {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0));
}
.section-header {
  margin-bottom: 24px;
}
.section h2 {
  margin: 6px 0 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.feature.card {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 16px;
  color: var(--fg);
  box-shadow: var(--shadow);
  transition: transform 0.25s ease, border-color 0.2s;
}
.feature.card.link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  display: block;
}

.feature.card:hover {
  transform: translateY(-6px) scale(1.01);
  border-color: rgba(122, 224, 255, 0.5);
}
.feature .icon {
  font-size: 22px;
  margin-bottom: 8px;
}
.feature h3 {
  margin: 0 0 6px;
}
.feature p {
  color: var(--muted);
  font-size: 14px;
  min-height: 40px;
}
.chip {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--badge);
  border: 1px solid var(--badge-border);
  font-size: 12px;
  margin-right: 6px;
  color: var(--muted);
}
.timeline {
  margin-top: 14px;
  display: grid;
  gap: 14px;
}
.step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 14px;
}
.dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(145deg, #6ea8ff, #7ae0ff);
  color: #0b1221;
  display: grid;
  place-items: center;
  font-weight: 800;
}
.step h4 {
  margin: 0 0 4px;
}
.step p {
  margin: 0;
  color: var(--muted);
}
.cta.card {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  align-items: center;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
}
.cta-visual {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.cta-bubble {
  background: var(--badge);
  border: 1px solid var(--badge-border);
  padding: 10px 12px;
  border-radius: 14px;
  color: var(--fg);
}

.feature-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.feature-modal__card {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  color: var(--fg);
  padding: 24px;
  border-radius: 16px;
  box-shadow: var(--shadow);
  max-width: 420px;
  width: 90%;
}
.feature.card.modal {
  cursor: pointer;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 60px 24px;
  }
  .hero-visual {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .section {
    padding: 32px 20px;
  }
  .cta.card {
    grid-template-columns: 1fr;
  }
}
</style>









