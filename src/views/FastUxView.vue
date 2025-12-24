<template>
  <div class="info-page">
    <section class="hero">
      <p class="eyebrow">Speed & Delight</p>
      <h1>Fast UX</h1>
      <p class="lede">
        Smooth interactions matter. JourneyPro focuses on perceived performance: instant feedback, stable layouts, and
        fewer "jumps" while content loads.
      </p>
      <div class="actions">
        <RouterLink class="btn primary" to="/home">Back to Home</RouterLink>
        <RouterLink class="btn ghost" to="/map">Open Map</RouterLink>
        <RouterLink class="btn ghost" to="/posts">Browse Community</RouterLink>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="title">Skeletons & stable layout</div>
        <ul class="list">
          <li>Post covers and avatars reserve space before images load (no layout shift).</li>
          <li>Feed uses skeleton cards while requesting the first batch.</li>
          <li>Crop previews render via CSS (no heavy image processing in the browser).</li>
        </ul>
        <div class="hint">
          Frontend: <code>src/components/PostBoard.vue</code>, <code>src/components/CroppedImage.vue</code>
        </div>
      </div>

      <div class="card">
        <div class="title">Infinite feed</div>
        <ul class="list">
          <li>IntersectionObserver-based infinite scroll for Discover.</li>
          <li>When the database ends, the UI loops the content (keeps the page alive for demos).</li>
          <li>Back-to-top appears after a large scroll distance.</li>
        </ul>
        <div class="hint">Frontend: <code>src/components/PostBoard.vue</code></div>
      </div>

      <div class="card">
        <div class="title">Responsive map tools</div>
        <ul class="list">
          <li>Route panels can collapse, auto-fit, and highlight steps on hover.</li>
          <li>Keyboard shortcuts (e.g. Escape clears hover/pin).</li>
          <li>Theme switching keeps map overlays readable.</li>
        </ul>
        <div class="hint">Frontend: <code>src/views/MapView.vue</code> + <code>src/components/*Panel.vue</code></div>
      </div>

      <div class="card">
        <div class="title">Local draft & guardrails</div>
        <ul class="list">
          <li>Publish autosaves drafts locally to prevent losing work.</li>
          <li>Server-side validation returns detailed errors to the UI.</li>
          <li>Authenticated-only routes redirect cleanly to Login.</li>
        </ul>
        <div class="hint">
          Frontend: <code>src/views/PostPublishView.vue</code> · Router: <code>src/router/index.js</code>
        </div>
      </div>
    </section>

    <section class="footer card">
      <div class="title">Next UX upgrades</div>
      <p class="lede small">
        If you want, we can add post list virtualization, image prefetching for the next screen, and a lightweight
        performance HUD for demo days.
      </p>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.info-page {
  height: calc(100vh - 56px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 28px 22px 44px;
  box-sizing: border-box;
  background: var(--jp-home-bg);
  color: var(--jp-home-fg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  transition: background 1s ease, color 1s ease;
}

.info-page::-webkit-scrollbar {
  width: 10px;
}
.info-page::-webkit-scrollbar-thumb {
  background: rgba(127, 127, 127, 0.28);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.info-page::-webkit-scrollbar-track {
  background: transparent;
}

.hero {
  width: min(1160px, 100%);
  margin: 0 auto;
  border-radius: 32px;
  padding: 28px 26px 24px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: radial-gradient(720px 260px at 18% 0%, rgba(77, 163, 255, 0.22), transparent 60%),
    radial-gradient(520px 240px at 86% 20%, rgba(167, 139, 250, 0.18), transparent 60%);
  opacity: 0.9;
  pointer-events: none;
}
.hero > * {
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--jp-home-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 900;
  font-size: 12px;
}

h1 {
  margin: 0 0 10px;
  font-size: clamp(38px, 4.2vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.lede {
  margin: 0;
  color: var(--jp-home-muted);
  max-width: 860px;
  line-height: 1.6;
}
.lede.small {
  max-width: 920px;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.btn {
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 900;
  font-size: 14px;
  border: 1px solid var(--jp-border);
  text-decoration: none;
  color: var(--jp-home-fg);
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.15);
}
.btn.primary {
  background: var(--jp-accent);
  color: #fff;
  border-color: transparent;
}
:global(body[data-theme='dark']) .btn.primary {
  color: #081018;
  background: linear-gradient(135deg, var(--jp-accent), var(--jp-accent-2));
}
.btn.ghost {
  background: transparent;
}
.btn.ghost:hover {
  background: rgba(127, 127, 127, 0.12);
  border-color: rgba(127, 127, 127, 0.22);
}

.grid {
  width: min(1160px, 100%);
  margin: 14px auto 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.card {
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  border-radius: 28px;
  padding: 20px;
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
}

.title {
  font-weight: 900;
  font-size: 16px;
  margin-bottom: 10px;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: var(--jp-home-muted);
  line-height: 1.7;
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  color: color-mix(in srgb, var(--jp-home-muted) 88%, transparent);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  padding: 2px 6px;
  border-radius: 8px;
  color: var(--jp-home-fg);
}

.footer {
  width: min(1160px, 100%);
  margin: 14px auto 0;
}

@media (max-width: 640px) {
  .info-page {
    padding: 22px 16px 38px;
  }
  .hero {
    padding: 24px 18px 20px;
  }
}
</style>
