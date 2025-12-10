<template>
  <div class="page">
    <header class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <p class="eyebrow">JourneyPro · Intelligent Trip OS</p>
        <h1>
          Plan smart. <span>Explore deeper.</span>
        </h1>
        <p class="lede">
          Not just shortest paths — discover food, scenery, and stories along every journey.
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
        <div class="feature card" v-for="f in features" :key="f.title">
          <div class="icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
          <div class="chip" v-for="tag in f.tags" :key="tag">{{ tag }}</div>
        </div>
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
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../store/authStore'

const auth = useAuthStore()

const heroCards = [
  { icon: '🗺️', title: 'Smart map', desc: 'Clean UI, focus on your route.' },
  { icon: '🎯', title: 'POI precision', desc: 'Curated stops that match your vibe.' },
  { icon: '🤝', title: 'Community', desc: 'Learn from locals and fellow travelers.' },
]

const features = [
  { icon: '✨', title: 'Adaptive routing', desc: 'Dynamic routes with POI-aware suggestions.', tags: ['live', 'safe'] },
  { icon: '📌', title: 'POI library', desc: 'Search by mood, theme, or distance.', tags: ['food', 'sights'] },
  { icon: '💬', title: 'Social layer', desc: 'Posts, likes, saves, and chat in real time.', tags: ['social', 'realtime'] },
  { icon: '📱', title: 'Mobile first', desc: 'Smooth on phones and tablets.', tags: ['responsive'] },
  { icon: '🔒', title: 'Privacy-first', desc: 'Control what you share and with whom.', tags: ['secure'] },
  { icon: '🚀', title: 'Fast UX', desc: 'Lightweight, animated, and delightful.', tags: ['fast'] },
]

const steps = [
  { title: 'Discover', desc: 'Browse community posts and curated POIs.' },
  { title: 'Plan', desc: 'Add stops, reorder, and preview on the map.' },
  { title: 'Share', desc: 'Publish, chat, and collaborate with friends.' },
]

const sections = ref([])

onMounted(() => {
  const els = document.querySelectorAll('.section, .hero')
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    },
    { threshold: 0.2 }
  )
  els.forEach((el) => observer.observe(el))
})
</script>

<style scoped>
:global(body) {
  background: #0b1221;
}
.page {
  color: #e8ecf5;
  min-height: 100%;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at 20% 20%, rgba(110, 143, 255, 0.12), transparent 30%),
    radial-gradient(circle at 80% 0%, rgba(255, 118, 174, 0.14), transparent 28%),
    #0b1221;
}
.hero {
  position: relative;
  overflow: hidden;
  padding: 80px 64px 60px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
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
}
.glass {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
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
  color: #c3c9d6;
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
  color: #e8ecf5;
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}
.btn.primary {
  background: linear-gradient(120deg, #5a8cff, #7ae0ff);
  color: #0a0f1a;
  border: none;
}
.btn.ghost {
  background: rgba(255, 255, 255, 0.05);
}
.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #d3d9e5;
}
.section {
  padding: 40px 64px 60px;
  position: relative;
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  color: #e8ecf5;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.16);
}
.feature .icon {
  font-size: 22px;
  margin-bottom: 8px;
}
.feature h3 {
  margin: 0 0 6px;
}
.feature p {
  color: #c3c9d6;
  font-size: 14px;
  min-height: 40px;
}
.chip {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  margin-right: 6px;
  color: #d3d9e5;
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  color: #c3c9d6;
}
.cta.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  background: rgba(255, 255, 255, 0.08);
  padding: 10px 12px;
  border-radius: 14px;
  color: #e8ecf5;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
