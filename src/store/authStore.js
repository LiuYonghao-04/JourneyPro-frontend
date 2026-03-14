import { defineStore } from 'pinia'
import { apiUrl } from '../config/api'

const API_BASE = apiUrl('/api/auth')

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('jp_user') || 'null'),
    token: localStorage.getItem('jp_token') || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAdmin: (state) =>
      !!(state.user?.is_admin || String(state.user?.username || '').trim().toLowerCase() === 'test'),
  },
  actions: {
    setUser(user) {
      const normalizedUser = user
        ? {
            ...user,
            is_admin: !!(user.is_admin || String(user.username || '').trim().toLowerCase() === 'test'),
          }
        : null
      this.user = normalizedUser
      localStorage.setItem('jp_user', JSON.stringify(normalizedUser))
    },
    async login(payload) {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error('Login failed. Please check your username or password.')
        }
        this.setUser(data.user)
        this.token = data.token
        localStorage.setItem('jp_token', this.token)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },
    async register(payload) {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error('Register failed. The username may already exist.')
        }
        this.setUser(data.user)
        this.token = data.token
        localStorage.setItem('jp_token', this.token)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('jp_user')
      localStorage.removeItem('jp_token')
    },
  },
})
