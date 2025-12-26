import { defineStore } from 'pinia'

const API_BASE = 'http://localhost:3001/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('jp_user') || 'null'),
    token: localStorage.getItem('jp_token') || null,
    loading: false,
    error: null,
  }),
  actions: {
    setUser(user) {
      this.user = user
      localStorage.setItem('jp_user', JSON.stringify(user))
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
