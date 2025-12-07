<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          账号
          <input v-model="form.username" type="text" placeholder="请输入账号" required />
        </label>
        <label>
          密码
          <input v-model="form.password" type="password" placeholder="请输入密码" required />
        </label>
        <label v-if="mode === 'register'">
          昵称
          <input v-model="form.nickname" type="text" placeholder="显示昵称" required />
        </label>
        <label v-if="mode === 'register'">
          头像链接（可选）
          <input v-model="form.avatarUrl" type="url" placeholder="http://..." />
        </label>

        <button class="submit" type="submit" :disabled="auth.loading">
          {{ mode === 'login' ? '登录' : '注册' }}
        </button>
        <p v-if="auth.error" class="error">{{ auth.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
})

const auth = useAuthStore()
const router = useRouter()

const handleSubmit = async () => {
  if (mode.value === 'login') {
    const ok = await auth.login({ username: form.username, password: form.password })
    if (ok) router.push('/home')
  } else {
    const ok = await auth.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname,
      avatarUrl: form.avatarUrl || null,
    })
    if (ok) router.push('/home')
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: linear-gradient(135deg, #edf2ff 0%, #f8f9fa 100%);
}

.auth-card {
  width: 380px;
  background: #fff;
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
  background: #f7f9fb;
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
  color: #444;
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

.error {
  color: #e03131;
  font-size: 12px;
  margin: 0;
}
</style>
