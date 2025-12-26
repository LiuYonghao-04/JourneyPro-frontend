<template>
  <div class="nf">
    <div class="card">
      <div class="code">404</div>
      <h1>Page not found</h1>
      <p class="sub">The link may be broken, or the page may have moved.</p>
      <div class="actions">
        <RouterLink class="btn primary" to="/home">Go Home</RouterLink>
        <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
        <RouterLink class="btn ghost" to="/map">Map</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.nf {
  height: calc(100vh - 56px);
  display: grid;
  place-items: center;
  padding: 22px;
  box-sizing: border-box;
  background: var(--bg-pattern);
  color: var(--fg);
}
.card {
  width: min(560px, 100%);
  border-radius: 28px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--fg) 12%, transparent);
  padding: 26px 22px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
}
.code {
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--fg) 65%, transparent);
}
h1 {
  margin: 10px 0 10px;
  letter-spacing: -0.02em;
  font-size: 32px;
  line-height: 1.05;
}
.sub {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.btn {
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 900;
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
</style>

