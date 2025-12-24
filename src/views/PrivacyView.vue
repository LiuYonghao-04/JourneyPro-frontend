<template>
  <div class="info-page">
    <section class="hero">
      <p class="eyebrow">Trust & Control</p>
      <h1>Privacy-first</h1>
      <p class="lede">
        JourneyPro is built to store the minimum needed, protect credentials, and keep sensitive activity private by
        default.
      </p>
      <div class="actions">
        <RouterLink class="btn primary" to="/home">Back to Home</RouterLink>
        <RouterLink class="btn ghost" to="/posts">Browse Community</RouterLink>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="title">Credentials</div>
        <ul class="list">
          <li>Passwords are hashed with <b>bcrypt</b> (never stored in plain text).</li>
          <li>Login sessions use <b>JWT</b> tokens.</li>
          <li>Registration includes a <b>captcha</b> challenge.</li>
        </ul>
        <div class="hint">Backend: <code>JourneyPro-api/routes/auth.js</code></div>
      </div>

      <div class="card">
        <div class="title">Least data</div>
        <ul class="list">
          <li>Posts, comments, likes, favorites, follows, and chat messages are normalized by feature tables.</li>
          <li>No hidden tracking fields are required for core features.</li>
          <li>Counts (likes/favorites/views) are stored as aggregates for fast reads.</li>
        </ul>
        <div class="hint">Reference: <code>JourneyPro 社区模块数据库名称文档（数据字典）.md</code></div>
      </div>

      <div class="card">
        <div class="title">Private activity</div>
        <ul class="list">
          <li>When visiting someone else's profile, sensitive tabs like Likes/Favorites stay hidden.</li>
          <li>Followers list is restricted on other users' profiles.</li>
          <li>Notifications focus on events you receive (likes/favorites/comments/follows).</li>
        </ul>
        <div class="hint">Frontend: <code>JourneyPro-frontend/src/views/PersonView.vue</code></div>
      </div>

      <div class="card">
        <div class="title">Images without upload</div>
        <ul class="list">
          <li>Images are URL-based; the database stores the URL only.</li>
          <li>Cropping is <b>non-destructive</b>: we store a crop region in the URL fragment (<code>#jp_crop</code>).</li>
          <li>Crop dialog uses a backend proxy only to bypass CORS while editing.</li>
        </ul>
        <div class="hint">
          Frontend: <code>JourneyPro-frontend/src/utils/cropUrl.js</code> · Backend:
          <code>JourneyPro-api/routes/upload.js</code>
        </div>
      </div>
    </section>

    <section class="footer card">
      <div class="title">Want to verify?</div>
      <p class="lede small">
        You can inspect the implementation in the referenced files. If you'd like, we can add a small "Security" page
        that shows live server configuration (headers, rate limits) next.
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
  background: radial-gradient(720px 260px at 18% 0%, rgba(77, 163, 255, 0.18), transparent 60%),
    radial-gradient(520px 240px at 86% 20%, rgba(255, 59, 48, 0.14), transparent 60%);
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
