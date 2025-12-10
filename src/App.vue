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
        <button class="jp-btn ghost small" @click="toggleTheme">
          {{ themeLabel }}
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
import { computed, ref, watchEffect } from 'vue'
import { useAuthStore } from './store/authStore'

const auth = useAuthStore()
const route = useRoute()
const isPostsActive = computed(() => route.path.startsWith('/posts') || route.path.startsWith('/notifications'))
const isLoginPage = computed(() => route.name === 'login')
const isRegisterPage = computed(() => route.name === 'register')

const theme = ref(localStorage.getItem('jp_theme') || 'dark')
const themeLabel = computed(() => (theme.value === 'dark' ? 'Light' : 'Dark'))
watchEffect(() => {
  document.body.setAttribute('data-theme', theme.value)
  localStorage.setItem('jp_theme', theme.value)
})
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
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

.jp-header {
  height: 56px;
  padding: 0 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #eee;
}

.jp-logo a {
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  color: #222;
}

.jp-nav {
  display: flex;
  gap: 12px;
}

.jp-nav-link {
  text-decoration: none;
  color: #555;
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
  color: #333;
}

.nickname {
  font-weight: 600;
}

.jp-main {
  height: calc(100% - 56px);
}
.jp-main > * {
  height: 100%;
}
</style>
