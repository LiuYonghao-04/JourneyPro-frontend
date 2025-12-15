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

