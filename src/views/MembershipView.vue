<template>
  <div class="membership-page">
    <section class="hero-card">
      <div>
        <div class="eyebrow">Membership Center</div>
        <h1>Upgrade JourneyPro access</h1>
        <p>Manage VIP and SVIP membership, check balance, and review every renewal before you pay.</p>
      </div>
      <div class="hero-actions">
        <span class="role-pill" :class="`role-${String(auth.user?.role || '').toLowerCase()}`">
          {{ auth.roleLabel }}
        </span>
        <span class="wallet-pill">Balance ¥{{ formatMoney(walletBalance) }}</span>
        <span v-if="auth.user?.membership_expires_at && !auth.isAdmin" class="expiry-pill">
          Expires {{ formatDate(auth.user.membership_expires_at, { dateOnly: true }) }}
        </span>
      </div>
    </section>

    <div v-if="flashText" class="flash success">{{ flashText }}</div>
    <div v-if="errorText" class="flash error">{{ errorText }}</div>

    <section class="layout">
      <article class="panel current-panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">Current Access</div>
            <h2>{{ currentHeadline }}</h2>
          </div>
          <button class="ghost-btn" type="button" :disabled="loading" @click="fetchSummary">
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div class="current-grid">
          <div class="metric-tile">
            <span class="metric-label">Current role</span>
            <strong>{{ auth.roleLabel }}</strong>
            <small>{{ roleDescription }}</small>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Membership status</span>
            <strong>{{ membershipStatusLabel }}</strong>
            <small>{{ membershipSubline }}</small>
          </div>
          <div class="metric-tile">
            <span class="metric-label">AI usage</span>
            <strong>{{ aiQuotaLabel }}</strong>
            <small>{{ aiQuotaSubline }}</small>
          </div>
          <div class="metric-tile wallet-tile">
            <span class="metric-label">Wallet balance</span>
            <strong>¥{{ formatMoney(walletBalance) }}</strong>
            <small>Balance top-up will be added later. Membership is deducted from this wallet.</small>
          </div>
        </div>

        <div class="benefit-list">
          <div v-for="item in currentBenefits" :key="item" class="benefit-item">
            <span class="benefit-dot"></span>
            <span>{{ item }}</span>
          </div>
        </div>
      </article>

      <article class="panel plans-panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">Plans</div>
            <h2>Choose a membership</h2>
          </div>
        </div>

        <div class="plan-grid">
          <article v-for="plan in plans" :key="plan.role" class="plan-card" :class="`plan-${plan.role.toLowerCase()}`">
            <div class="plan-top">
              <div>
                <span class="plan-kicker">{{ plan.role }}</span>
                <h3>{{ plan.name }}</h3>
                <p>{{ plan.tagline }}</p>
              </div>
              <span class="plan-badge">{{ plan.role === 'SVIP' ? 'Best for creators' : 'Best for frequent planners' }}</span>
            </div>

            <div class="price-grid">
              <button
                v-for="price in plan.pricing"
                :key="`${plan.role}-${price.cycle}`"
                class="price-card"
                type="button"
                :disabled="auth.isAdmin"
                @click="openCheckout(plan, price)"
              >
                <div class="price-topline">
                  <span class="price-cycle">{{ price.label }}</span>
                  <span v-if="price.savings_cny > 0" class="save-tag">Save ¥{{ formatMoney(price.savings_cny) }}</span>
                </div>
                <div class="price-main">
                  <span v-if="price.original_price_cny > price.price_cny" class="price-original">¥{{ formatMoney(price.original_price_cny) }}</span>
                  <span class="price-value">¥{{ formatMoney(price.price_cny) }}</span>
                </div>
                <div class="price-foot">
                  {{ price.months === 1 ? '1 month' : '12 months' }}
                  <span v-if="price.savings_pct > 0">· {{ price.savings_pct }}% off</span>
                </div>
              </button>
            </div>

            <div class="plan-benefits">
              <div v-for="item in plan.benefits" :key="item" class="benefit-item">
                <span class="benefit-dot"></span>
                <span>{{ item }}</span>
              </div>
            </div>
          </article>
        </div>
      </article>
    </section>

    <section class="panel history-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Orders</div>
          <h2>Membership history</h2>
        </div>
      </div>

      <div v-if="!orders.length" class="empty-state">No membership renewals yet.</div>
      <div v-else class="history-list">
        <article v-for="order in orders" :key="order.id" class="history-item">
          <div class="history-main">
            <strong>{{ order.role_after }}</strong>
            <span>{{ order.billing_cycle === 'YEARLY' ? 'Yearly' : 'Monthly' }}</span>
            <span>¥{{ formatMoney(order.amount_cny) }}</span>
          </div>
          <div class="history-meta">
            <span>{{ formatDate(order.created_at) }}</span>
            <span>{{ order.expires_after ? `Valid until ${formatDate(order.expires_after, { dateOnly: true })}` : 'No expiry' }}</span>
            <span>Balance after ¥{{ formatMoney(order.balance_after_cny) }}</span>
            <span>{{ order.status }}</span>
          </div>
        </article>
      </div>
    </section>

    <div v-if="checkoutOffer" class="checkout-backdrop" @click.self="closeCheckout">
      <section class="checkout-card">
        <div class="checkout-top">
          <div>
            <div class="eyebrow">Confirm payment</div>
            <h2>{{ checkoutOffer.plan.name }} {{ checkoutOffer.price.label }}</h2>
            <p>{{ checkoutOffer.plan.tagline }}</p>
          </div>
          <button class="checkout-close" type="button" @click="closeCheckout">Close</button>
        </div>

        <div class="checkout-grid">
          <div class="checkout-summary">
            <div class="summary-line">
              <span>Current balance</span>
              <strong>¥{{ formatMoney(walletBalance) }}</strong>
            </div>
            <div class="summary-line">
              <span>Plan price</span>
              <strong>¥{{ formatMoney(checkoutOffer.price.price_cny) }}</strong>
            </div>
            <div v-if="checkoutOffer.price.original_price_cny > checkoutOffer.price.price_cny" class="summary-line muted">
              <span>Original price</span>
              <span class="line-through">¥{{ formatMoney(checkoutOffer.price.original_price_cny) }}</span>
            </div>
            <div v-if="checkoutOffer.price.savings_cny > 0" class="summary-line success">
              <span>Yearly savings</span>
              <strong>¥{{ formatMoney(checkoutOffer.price.savings_cny) }}</strong>
            </div>
            <div class="summary-line">
              <span>Membership valid until</span>
              <strong>{{ checkoutExpiryLabel }}</strong>
            </div>
            <div class="summary-line total">
              <span>Balance after payment</span>
              <strong :class="{ danger: !canAffordCheckout }">¥{{ formatMoney(checkoutBalanceAfter) }}</strong>
            </div>
          </div>

          <div class="checkout-details">
            <div class="checkout-copy">
              <h3>What you unlock</h3>
              <div class="benefit-list compact">
                <div v-for="item in checkoutOffer.plan.benefits" :key="item" class="benefit-item">
                  <span class="benefit-dot"></span>
                  <span>{{ item }}</span>
                </div>
              </div>
            </div>
            <div class="checkout-note" :class="{ warning: !canAffordCheckout }">
              <template v-if="canAffordCheckout">
                Payment will be deducted directly from your JourneyPro wallet.
              </template>
              <template v-else>
                Your current wallet balance is not enough for this plan. Balance top-up will be added later.
              </template>
            </div>
            <div class="checkout-actions">
              <button class="ghost-btn" type="button" :disabled="purchaseBusy" @click="closeCheckout">Cancel</button>
              <button
                class="pay-btn"
                type="button"
                :disabled="purchaseBusy || !canAffordCheckout || auth.isAdmin"
                @click="confirmPurchase"
              >
                {{ purchaseBusy ? 'Processing...' : `Pay ¥${formatMoney(checkoutOffer.price.price_cny)}` }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiUrl } from '../config/api'
import { useAuthStore } from '../store/authStore'

const auth = useAuthStore()
const loading = ref(false)
const purchaseBusy = ref(false)
const errorText = ref('')
const flashText = ref('')
const plans = ref([])
const orders = ref([])
const checkoutOffer = ref(null)

const resetMessages = () => {
  errorText.value = ''
  flashText.value = ''
}

const formatDate = (value, { dateOnly = false } = {}) => {
  const ts = new Date(value || '').getTime()
  if (!Number.isFinite(ts) || ts <= 0) return 'Not set'
  const date = new Date(ts)
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString()
}

const formatMoney = (value) => {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, '') : '0'
}

const walletBalance = computed(() => auth.walletBalance ?? 20)

const membershipStatusLabel = computed(() => {
  if (auth.isAdmin) return 'Permanent'
  if (auth.user?.membership_status === 'active') return 'Active'
  if (auth.user?.membership_status === 'expired') return 'Expired'
  return 'Standard'
})

const membershipSubline = computed(() => {
  if (auth.isAdmin) return 'Admin access does not expire'
  if (auth.user?.membership_expires_at && auth.user?.membership_status === 'active') {
    return `${auth.user.membership_days_left ?? 0} days left`
  }
  if (auth.user?.membership_status === 'expired') return 'Renew to restore premium benefits'
  return 'Upgrade anytime to unlock more access'
})

const aiQuotaLabel = computed(() => {
  if (auth.hasUnlimitedAi) return 'Unlimited'
  const limit = auth.aiMonthlyLimit
  return Number.isFinite(limit) ? `${limit} / month` : '10 / month'
})

const aiQuotaSubline = computed(() => {
  if (auth.isAdmin) return 'Highest priority access'
  if (auth.isSvip) return 'Unlimited planning requests'
  if (auth.isVip) return 'Expanded quota for regular trip planning'
  return 'Base AI quota for standard users'
})

const roleDescription = computed(() => {
  if (auth.isAdmin) return 'Administrator with full platform access'
  if (auth.isSvip) return 'Top-tier access for creators and advanced users'
  if (auth.isVip) return 'Extended AI planning for active users'
  return 'Standard access with base limits'
})

const currentHeadline = computed(() => {
  if (auth.isAdmin) return 'Admin access is active'
  if (auth.user?.membership_status === 'active' && auth.user?.stored_role_label) {
    return `${auth.user.stored_role_label} membership is active`
  }
  if (auth.user?.membership_status === 'expired' && auth.user?.stored_role_label) {
    return `${auth.user.stored_role_label} membership expired`
  }
  return 'You are on the standard plan'
})

const currentBenefits = computed(() => {
  if (auth.isAdmin) {
    return ['Unlimited AI planning', 'Unlimited ad publishing', 'Administrator control center']
  }
  if (auth.isSvip) {
    return ['Unlimited AI planning', 'Ad campaign publishing', 'Premium SVIP badge']
  }
  if (auth.isVip) {
    return ['30 AI plans per month', 'VIP badge and renewal tracking', 'Priority membership status']
  }
  return ['10 AI plans per month', 'Map, community, and trip workspace access', 'Upgrade path to VIP and SVIP']
})

const checkoutBalanceAfter = computed(() => {
  if (!checkoutOffer.value) return walletBalance.value
  return Math.max(0, Number((walletBalance.value - Number(checkoutOffer.value.price.price_cny || 0)).toFixed(2)))
})

const canAffordCheckout = computed(() => {
  if (!checkoutOffer.value) return false
  return walletBalance.value >= Number(checkoutOffer.value.price.price_cny || 0)
})

const checkoutExpiryLabel = computed(() => {
  if (!checkoutOffer.value) return 'Not set'
  const months = Number(checkoutOffer.value.price.months || 0)
  const currentExpiry =
    auth.user?.membership_status === 'active' && auth.user?.membership_expires_at
      ? new Date(auth.user.membership_expires_at)
      : new Date()
  const nextExpiry = new Date(currentExpiry.getTime())
  const day = nextExpiry.getUTCDate()
  nextExpiry.setUTCMonth(nextExpiry.getUTCMonth() + months)
  if (nextExpiry.getUTCDate() !== day) {
    nextExpiry.setUTCDate(0)
  }
  return formatDate(nextExpiry, { dateOnly: true })
})

const fetchSummary = async () => {
  if (!auth.user?.id) return
  loading.value = true
  resetMessages()
  try {
    const res = await fetch(apiUrl(`/api/membership/summary?user_id=${auth.user.id}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load membership')
    plans.value = Array.isArray(data.plans) ? data.plans : []
    orders.value = Array.isArray(data.orders) ? data.orders : []
    if (data.user) auth.setUser(data.user)
  } catch (err) {
    errorText.value = String(err?.message || 'Failed to load membership')
  } finally {
    loading.value = false
  }
}

const openCheckout = (plan, price) => {
  resetMessages()
  checkoutOffer.value = { plan, price }
}

const closeCheckout = () => {
  if (purchaseBusy.value) return
  checkoutOffer.value = null
}

const confirmPurchase = async () => {
  if (!auth.user?.id || purchaseBusy.value || auth.isAdmin || !checkoutOffer.value) return
  purchaseBusy.value = true
  resetMessages()
  try {
    const res = await fetch(apiUrl('/api/membership/purchase'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        target_role: checkoutOffer.value.plan.role,
        billing_cycle: checkoutOffer.value.price.cycle,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Purchase failed')
    if (data.user) auth.setUser(data.user)
    plans.value = Array.isArray(data.plans) ? data.plans : plans.value
    orders.value = Array.isArray(data.orders) ? data.orders : orders.value
    const planLabel = `${data?.purchased_plan?.role_label || checkoutOffer.value.plan.role} ${data?.purchased_plan?.cycle_label || checkoutOffer.value.price.label}`
    flashText.value = `${planLabel} activated. Remaining balance: ¥${formatMoney(data?.purchased_plan?.balance_after_cny ?? auth.walletBalance)}.`
    checkoutOffer.value = null
  } catch (err) {
    errorText.value = String(err?.message || 'Purchase failed')
  } finally {
    purchaseBusy.value = false
  }
}

onMounted(() => {
  fetchSummary()
})
</script>

<style scoped>
.membership-page {
  min-height: calc(100vh - 56px);
  padding: 24px;
  box-sizing: border-box;
  display: grid;
  gap: 18px;
  background: var(--bg-pattern);
}

.hero-card,
.panel,
.checkout-card {
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  box-shadow: var(--shadow);
}

.hero-card {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #4d8cff;
  margin-bottom: 10px;
}

.hero-card h1,
.panel-head h2,
.plan-top h3,
.checkout-card h2,
.checkout-copy h3 {
  margin: 0;
  color: var(--fg);
}

.hero-card p,
.plan-top p,
.checkout-card p {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.role-pill,
.expiry-pill,
.wallet-pill,
.plan-badge,
.metric-tile small,
.history-meta span {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  padding: 7px 12px;
  font-size: 12px;
}

.role-pill,
.wallet-pill {
  font-weight: 700;
}

.role-pill.role-admin {
  color: #7c3aed;
}

.role-pill.role-svip {
  color: #d97706;
}

.role-pill.role-vip {
  color: #2563eb;
}

.wallet-pill {
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 10%, transparent);
}

.flash {
  border-radius: 16px;
  padding: 12px 14px;
  font-size: 13px;
}

.flash.success {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
  color: #15803d;
}

.flash.error {
  background: color-mix(in srgb, #ef4444 12%, transparent);
  border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
  color: #b91c1c;
}

.layout {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;
}

.panel {
  padding: 22px;
  display: grid;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ghost-btn,
.pay-btn,
.checkout-close {
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.ghost-btn,
.checkout-close {
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: transparent;
  color: var(--fg);
}

.pay-btn {
  border: 1px solid transparent;
  background: linear-gradient(120deg, #4d8cff, #74d8ff);
  color: #0a1220;
}

.pay-btn:disabled,
.ghost-btn:disabled,
.checkout-close:disabled {
  opacity: 0.55;
  cursor: default;
}

.current-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-tile {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  padding: 16px;
  display: grid;
  gap: 8px;
}

.wallet-tile {
  background: linear-gradient(180deg, color-mix(in srgb, #14b8a6 10%, transparent), color-mix(in srgb, var(--surface) 88%, transparent));
}

.metric-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-tile strong {
  font-size: 22px;
  color: var(--fg);
}

.benefit-list,
.plan-benefits {
  display: grid;
  gap: 10px;
}

.benefit-list.compact {
  gap: 8px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--fg);
}

.benefit-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(120deg, #4d8cff, #74d8ff);
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.plan-card {
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.plan-top {
  display: grid;
  gap: 8px;
}

.plan-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4d8cff;
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.price-card {
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  color: var(--fg);
  padding: 14px;
  display: grid;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.price-topline,
.price-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.save-tag {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
  background: color-mix(in srgb, #22c55e 14%, transparent);
}

.price-cycle,
.price-foot {
  color: var(--muted);
  font-size: 13px;
}

.price-original {
  color: color-mix(in srgb, var(--muted) 92%, transparent);
  text-decoration: line-through;
  font-size: 14px;
}

.price-value {
  font-size: 28px;
  font-weight: 800;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  padding: 16px;
  display: grid;
  gap: 10px;
}

.history-main,
.history-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.empty-state {
  color: var(--muted);
}

.checkout-backdrop {
  position: fixed;
  inset: 56px 0 0;
  z-index: 2200;
  background: rgba(9, 14, 24, 0.42);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  padding: 28px;
  box-sizing: border-box;
}

.checkout-card {
  width: min(920px, calc(100vw - 56px));
  padding: 24px;
  display: grid;
  gap: 18px;
}

.checkout-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
}

.checkout-summary,
.checkout-details {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.summary-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: var(--fg);
}

.summary-line.muted {
  color: var(--muted);
}

.summary-line.success {
  color: #15803d;
}

.summary-line.total {
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  font-size: 15px;
  font-weight: 700;
}

.line-through {
  text-decoration: line-through;
}

.danger {
  color: #b91c1c;
}

.checkout-copy {
  display: grid;
  gap: 10px;
}

.checkout-note {
  border-radius: 16px;
  padding: 14px;
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
}

.checkout-note.warning {
  color: #b91c1c;
  background: color-mix(in srgb, #ef4444 10%, transparent);
}

.checkout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1080px) {
  .layout,
  .plan-grid,
  .current-grid,
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .membership-page {
    padding: 16px;
  }

  .hero-card,
  .panel-head,
  .checkout-top,
  .checkout-actions {
    display: grid;
    gap: 12px;
  }

  .price-grid {
    grid-template-columns: 1fr;
  }

  .checkout-backdrop {
    padding: 16px;
  }

  .checkout-card {
    width: min(100%, 100vw - 16px);
  }
}
</style>
