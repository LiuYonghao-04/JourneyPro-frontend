<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="switchMode('login')">Login</button>
        <button :class="{ active: mode === 'register' }" @click="switchMode('register')">Register</button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          Username
          <input v-model="form.username" type="text" placeholder="Enter username" required />
        </label>
        <label>
          Password
          <input v-model="form.password" type="password" placeholder="Enter password (min 6 chars)" required />
          <span class="hint">Password must be at least 6 characters.</span>
        </label>
        <label v-if="mode === 'register'">
          Nickname
          <input v-model="form.nickname" type="text" placeholder="Display name" required />
        </label>
        <label v-if="mode === 'register'">
          Avatar URL (optional)
          <div class="avatar-row">
            <input v-model="form.avatarUrl" type="url" placeholder="http://..." />
            <button type="button" class="mini-btn" @click="setRandomAvatar">Random</button>
            <button type="button" class="mini-btn" @click="togglePreview">Preview</button>
          </div>
        </label>
        <div v-if="mode === 'register' && showPreview" class="avatar-preview">
          <img :src="form.avatarUrl || defaultAvatar" alt="avatar preview" />
        </div>

        <div v-if="mode === 'register'" class="captcha-row">
          <label class="captcha-label">
            Image Captcha
            <input
              v-model="form.captchaCode"
              type="text"
              placeholder="Enter code"
              maxlength="6"
              required
            />
          </label>
          <div class="captcha-img" @click="loadCaptcha">
            <img v-if="captchaImg" :src="captchaImg" alt="captcha" />
            <span v-else>Loading...</span>
          </div>
        </div>

        <button class="submit" type="submit" :disabled="auth.loading">
          {{ mode === 'login' ? 'Login' : 'Register' }}
        </button>
        <p v-if="auth.error" class="error">{{ auth.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const props = defineProps({
  mode: {
    type: String,
    default: 'login',
  },
})

const mode = ref(props.mode || 'login')
const form = reactive({
  username: '',
  password: '',
  nickname: '',
  avatarUrl: '',
  captchaCode: '',
})
const captchaKey = ref('')
const captchaImg = ref('')
const showPreview = ref(false)
const defaultAvatar = 'https://placehold.co/120x120'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const switchMode = (m) => {
  mode.value = m
  const targetName = m === 'register' ? 'register' : 'login'
  router.replace({ name: targetName, query: route.query })
  if (m === 'register') {
    loadCaptcha()
  }
}

const loadCaptcha = async () => {
  try {
    const res = await axios.get('http://localhost:3001/api/auth/captcha')
    if (res.data?.success) {
      captchaKey.value = res.data.key
      captchaImg.value = res.data.image
    }
  } catch (e) {
    captchaKey.value = ''
    captchaImg.value = ''
  }
}

const handleSubmit = async () => {
  if (!form.password || form.password.length < 6) {
    auth.error = 'Password must be at least 6 characters.'
    return
  }
  if (mode.value === 'login') {
    const ok = await auth.login({ username: form.username, password: form.password })
    if (ok) {
      const redirect = route.query.redirect || '/home'
      router.push(redirect)
    }
  } else {
    if (!form.captchaCode || !captchaKey.value) {
      auth.error = 'Please enter captcha'
      return
    }
    const ok = await auth.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname,
      avatarUrl: form.avatarUrl || null,
      captcha_key: captchaKey.value,
      captcha_code: form.captchaCode,
    })
    if (ok) {
      router.push('/home')
    } else {
      loadCaptcha()
    }
  }
}

const setRandomAvatar = () => {
  const seed = Math.floor(Math.random() * 200) + 1
  form.avatarUrl = `https://picsum.photos/seed/jp_post${seed}_cover/800/600`
}

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

onMounted(() => {
  if (mode.value === 'register') {
    loadCaptcha()
  }
})

watch(
  () => route.name,
  (val) => {
    if (val === 'register') {
      switchMode('register')
    } else if (val === 'login') {
      switchMode('login')
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 85%, transparent), color-mix(in srgb, var(--badge) 90%, transparent));
}

.auth-card {
  width: 380px;
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
  padding: 20px 24px 28px;
  box-sizing: border-box;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tabs button {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  background: var(--badge);
  cursor: pointer;
  font-weight: 600;
}

.tabs button.active {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-form label {
  font-size: 13px;
  color: var(--fg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form input {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
}

.submit {
  margin-top: 6px;
  background: #1677ff;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.captcha-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.captcha-label {
  flex: 1;
}

.captcha-img {
  width: 120px;
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--badge);
}

.captcha-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.avatar-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mini-btn {
  padding: 10px 10px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background: var(--badge);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.mini-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
}
.avatar-preview {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  background: var(--badge);
  display: inline-flex;
}
.avatar-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
}

.error {
  color: #e03131;
  font-size: 12px;
  margin: 0;
}
.hint {
  color: var(--muted);
  font-size: 12px;
}
</style>
