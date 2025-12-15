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
  padding: 24px 24px 44px;
  box-sizing: border-box;
  background: var(--bg-pattern);
  color: var(--fg);
  transition: background 1s ease, color 1s ease;
}

.hero {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  padding: 20px 20px 18px;
  box-shadow: var(--shadow);
}

.eyebrow {
  margin: 0 0 6px;
  color: color-mix(in srgb, var(--fg) 75%, transparent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  font-size: 12px;
}

h1 {
  margin: 0 0 10px;
  font-size: 42px;
  line-height: 1.05;
}

.lede {
  margin: 0;
  color: var(--muted);
  max-width: 820px;
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
  font-weight: 800;
  font-size: 14px;
  border: 1px solid color-mix(in srgb, var(--fg) 22%, transparent);
  text-decoration: none;
  color: var(--fg);
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.15);
}
.btn.primary {
  background: var(--btn-primary);
  color: var(--btn-text);
  border-color: transparent;
}
.btn.ghost {
  background: transparent;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.title {
  font-weight: 900;
  font-size: 16px;
  margin-bottom: 10px;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.7;
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  color: color-mix(in srgb, var(--muted) 80%, transparent);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  background: var(--badge);
  border: 1px solid var(--badge-border);
  padding: 2px 6px;
  border-radius: 8px;
  color: var(--fg);
}

.footer {
  margin-top: 14px;
}
</style>

