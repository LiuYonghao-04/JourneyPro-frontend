import { defineStore } from 'pinia'
import { apiUrl } from '../config/api'

const API_BASE = apiUrl('/api/auth')
const normalizeRole = (value) => String(value || 'USER').trim().toUpperCase() || 'USER'

const normalizeUser = (user) => {
  if (!user) return null
  const role = normalizeRole(user.role || (user.is_admin ? 'ADMIN' : 'USER'))
  const aiLimit =
    user.ai_monthly_limit === null || user.ai_monthly_limit === undefined ? null : Number(user.ai_monthly_limit)
  const adLimit =
    user.ad_monthly_limit === null || user.ad_monthly_limit === undefined ? null : Number(user.ad_monthly_limit)
  return {
    ...user,
    role,
    role_label: user.role_label || role,
    ai_monthly_limit: Number.isFinite(aiLimit) ? aiLimit : null,
    ad_monthly_limit: Number.isFinite(adLimit) ? adLimit : null,
    can_manage_ads: !!user.can_manage_ads,
    ai_unlimited: !!user.ai_unlimited,
    is_admin: role === 'ADMIN' || !!user.is_admin,
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: normalizeUser(JSON.parse(localStorage.getItem('jp_user') || 'null')),
    token: localStorage.getItem('jp_token') || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAdmin: (state) => state.user?.role === 'ADMIN' || !!state.user?.is_admin,
    isVip: (state) => ['VIP', 'SVIP', 'ADMIN'].includes(normalizeRole(state.user?.role)),
    isSvip: (state) => ['SVIP', 'ADMIN'].includes(normalizeRole(state.user?.role)),
    canManageAds: (state) => !!state.user?.can_manage_ads || ['SVIP', 'ADMIN'].includes(normalizeRole(state.user?.role)),
    roleLabel: (state) => state.user?.role_label || state.user?.role || 'Guest',
    aiMonthlyLimit: (state) => state.user?.ai_monthly_limit ?? null,
    hasUnlimitedAi: (state) => !!state.user?.ai_unlimited || ['SVIP', 'ADMIN'].includes(normalizeRole(state.user?.role)),
  },
  actions: {
    setUser(user) {
      const normalizedUser = normalizeUser(user)
      this.user = normalizedUser
      if (normalizedUser) localStorage.setItem('jp_user', JSON.stringify(normalizedUser))
      else localStorage.removeItem('jp_user')
    },
    async refreshUser() {
      const userId = this.user?.id
      if (!userId) return null
      try {
        const res = await fetch(`${API_BASE}/user?id=${userId}`)
        const data = await res.json()
        if (!res.ok || !data.success || !data.user) {
          throw new Error(data?.message || 'Failed to refresh user')
        }
        this.setUser(data.user)
        return this.user
      } catch (err) {
        console.error('refresh user error', err)
        return null
      }
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
