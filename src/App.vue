<template>
  <div id="app">
    <header class="jp-header">
      <div class="jp-logo">
        <RouterLink to="/">JourneyPro</RouterLink>
      </div>
      <nav class="jp-nav">
        <RouterLink to="/home" class="jp-nav-link">Home</RouterLink>
        <RouterLink to="/map" class="jp-nav-link">Map</RouterLink>
        <RouterLink
          to="/posts"
          :class="['jp-nav-link', { 'jp-active': isPostsActive, 'router-link-active': isPostsActive }]"
        >
          Community
        </RouterLink>
      </nav>
      <div class="jp-auth">
        <button
          class="jp-switch"
          :class="theme"
          type="button"
          @click="toggleTheme"
          aria-label="Toggle theme"
        >
          <span class="switch-icon sun">&#9728;</span>
          <span class="switch-icon moon">&#127769;</span>
          <span class="switch-thumb"></span>
        </button>
        <template v-if="!auth.user">
          <RouterLink
            to="/login"
            :class="['jp-btn', isLoginPage ? 'primary' : 'ghost']"
          >
            Login
          </RouterLink>
          <RouterLink
            to="/register"
            :class="['jp-btn', isRegisterPage ? 'primary' : 'ghost']"
          >
            Register
          </RouterLink>
        </template>
        <template v-else>
          <div class="jp-user">
            <RouterLink :to="`/person?userid=${auth.user.id}`" class="nickname">{{ auth.user.nickname }}</RouterLink>
            <button class="jp-btn ghost" @click="auth.logout">Logout</button>
          </div>
        </template>
      </div>
    </header>

    <main class="jp-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed, ref, watchEffect, watch } from 'vue'
import { useAuthStore } from './store/authStore'
import { useRouteStore } from './store/routeStore'

const auth = useAuthStore()
const routeStore = useRouteStore()
const route = useRoute()
const isPostsActive = computed(() => route.path.startsWith('/posts') || route.path.startsWith('/notifications'))
const isLoginPage = computed(() => route.name === 'login')
const isRegisterPage = computed(() => route.name === 'register')
const isHomePage = computed(() => route.name === 'home' || route.path === '/home')

const theme = ref(localStorage.getItem('jp_theme') || 'dark')
watchEffect(() => {
  document.body.setAttribute('data-theme', theme.value)
  localStorage.setItem('jp_theme', theme.value)
})

watchEffect(() => {
  document.body.classList.toggle('jp-home', isHomePage.value)
})
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

watch(
  () => auth.user?.id,
  (uid) => {
    if (!uid) return
    routeStore.fetchRecoSettingsFromServer(uid)
  },
  { immediate: true }
)
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
body {
  transition: background-color 1s ease, color 1s ease;
  overflow: hidden;
}
#app {
  overflow-x: hidden;
}
:root {
  --bg-main: #0b1221;
  --bg-pattern: #0b1221;
  --fg: #e8ecf5;
  --muted: #c3c9d6;
  --panel: #0f1624;
  --panel-border: #1f2937;
  --badge: #131c2c;
  --badge-border: #1f2937;
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --btn-primary: linear-gradient(120deg, #5a8cff, #7ae0ff);
  --btn-text: #0a0f1a;
  --map-overlay-bg: #0f1624;
  --map-overlay-border: #1f2937;
  --map-overlay-fg: #e5e7eb;
}
body[data-theme='dark'] {
  --bg-main: #0b1221;
  --bg-pattern: radial-gradient(circle at 20% 20%, rgba(110, 143, 255, 0.12), transparent 30%),
    radial-gradient(circle at 80% 0%, rgba(255, 118, 174, 0.14), transparent 28%),
    #0b1221;
  --fg: #e8ecf5;
  --muted: #c3c9d6;
  --panel: #0f1624;
  --panel-border: #1f2937;
  --badge: #131c2c;
  --badge-border: #1f2937;
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --btn-primary: linear-gradient(120deg, #5a8cff, #7ae0ff);
  --btn-text: #0a0f1a;
  --surface: rgba(255, 255, 255, 0.03);
  --map-overlay-bg: rgba(15, 22, 36, 0.95);
  --map-overlay-border: #243047;
  --map-overlay-fg: #e5e7eb;
}
body[data-theme='light'] {
  --bg-main: #f7f9fc;
  --bg-pattern: radial-gradient(circle at 20% 18%, rgba(255, 226, 196, 0.20), transparent 32%),
    radial-gradient(circle at 78% 8%, rgba(192, 214, 255, 0.24), transparent 30%),
    #f7f9fc;
  --fg: #0f172a;
  --muted: #4b5563;
  --panel: #ffffff;
  --panel-border: #e5e7eb;
  --badge: #eef2f7;
  --badge-border: #e5e7eb;
  --shadow: 0 14px 36px rgba(15, 35, 52, 0.14);
  --btn-primary: linear-gradient(120deg, #4d8cff, #74d8ff);
  --btn-text: #0a0f1a;
  --surface: rgba(0, 0, 0, 0.03);
  --map-overlay-bg: #ffffff;
  --map-overlay-border: #dfe3ea;
  --map-overlay-fg: #0f172a;
}

body.jp-home[data-theme='dark'] {
  --bg-main: #050506;
  --fg: #f5f5f7;
}
body.jp-home[data-theme='light'] {
  --bg-main: #f5f5f7;
  --fg: #1d1d1f;
}

.jp-header {
  height: 56px;
  padding: 0 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--bg-main) 72%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--fg) 12%, transparent);
  color: var(--fg);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  transition: background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
}

body.jp-home .jp-header {
  background: transparent;
  border-bottom-color: transparent;
}
body.jp-home.jp-home-scrolled .jp-header {
  background: color-mix(in srgb, var(--bg-main) 72%, transparent);
  border-bottom-color: color-mix(in srgb, var(--fg) 12%, transparent);
}

.jp-logo a {
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  color: var(--fg);
}

.jp-nav {
  display: flex;
  gap: 12px;
}

.jp-nav-link {
  text-decoration: none;
  color: color-mix(in srgb, var(--fg) 76%, transparent);
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 999px;
}

.jp-nav-link.router-link-active,
.jp-nav-link.jp-active {
  background: #1677ff;
  color: #fff;
}

.jp-auth {
  display: flex;
  align-items: center;
  gap: 10px;
}

.jp-switch {
  position: relative;
  width: 64px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--fg) 40%, transparent);
  background: color-mix(in srgb, var(--fg) 15%, transparent);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: background 0.3s ease, border-color 0.3s ease;
}
.jp-switch .switch-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
  color: color-mix(in srgb, var(--fg) 80%, transparent);
}
.jp-switch .sun { left: 10px; }
.jp-switch .moon { right: 10px; }
.jp-switch .switch-thumb {
  position: absolute;
  top: 2px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--fg);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.25s ease, background 0.25s ease;
}
.jp-switch.dark .switch-thumb {
  transform: translateX(0);
}
.jp-switch.light .switch-thumb {
  transform: translateX(32px);
}
.jp-switch.light {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
  border-color: color-mix(in srgb, var(--fg) 30%, transparent);
}
.jp-switch:focus-visible {
  outline: 2px solid var(--fg);
  outline-offset: 2px;
}

.jp-btn {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
}
.jp-btn.small {
  padding: 6px 10px;
  font-size: 12px;
}

.jp-btn.primary {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}

.jp-btn.ghost {
  background: transparent;
  color: #1677ff;
  border-color: #1677ff;
}

.jp-user {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fg);
}

.nickname {
  font-weight: 600;
}

.jp-main {
  min-height: 100%;
  padding-top: 56px;
  box-sizing: border-box;
}
</style>
