<template>
  <div class="ops-page">
    <aside class="ops-rail">
      <div class="rail-brand">Admin</div>
      <RouterLink to="/admin" class="rail-link">Dashboard</RouterLink>
      <RouterLink to="/admin/ops" class="rail-link rail-link-active">Ops Center</RouterLink>
      <RouterLink to="/home" class="rail-link">Home</RouterLink>
      <RouterLink to="/posts" class="rail-link">Community</RouterLink>
      <RouterLink to="/map" class="rail-link">Map</RouterLink>
      <RouterLink to="/ads" class="rail-link">Ads</RouterLink>
      <RouterLink to="/membership" class="rail-link">Membership</RouterLink>
      <div class="rail-note">
        <div>Operator</div>
        <strong>{{ auth.user?.nickname || 'Admin' }}</strong>
        <span>{{ auth.user?.role_label || auth.user?.role || 'ADMIN' }}</span>
        <small>{{ generatedAtLabel }}</small>
      </div>
    </aside>

    <main class="ops-main">
      <header class="hero">
        <div>
          <div class="eyebrow">Operational visibility</div>
          <h1>Ops center</h1>
          <p>See which users hit which errors, where they happened, and update live membership pricing without touching code.</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn ghost" type="button" :disabled="loading" @click="fetchOpsCenter(true)">
            {{ loading ? 'Refreshing...' : 'Refresh all' }}
          </button>
        </div>
      </header>

      <section v-if="errorText" class="notice error">
        <strong>Ops center failed to load.</strong>
        <span>{{ errorText }}</span>
      </section>
      <section v-else-if="flashText" class="notice success">
        <strong>Action saved.</strong>
        <span>{{ flashText }}</span>
      </section>

      <section class="card-grid">
        <article v-for="card in summaryCards" :key="card.label" class="metric-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </article>
      </section>

      <section class="signal-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>System health</h2>
            <span>{{ healthLabel }}</span>
          </div>
          <div class="signal-list">
            <div v-for="item in healthCards" :key="item.label" class="signal-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Slow API watch</h2>
            <span>{{ formatNumber(opsMetrics?.endpoint_count || 0) }} endpoints</span>
          </div>
          <div class="signal-list">
            <div v-for="item in metricCards" :key="item.label" class="signal-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>
      </section>

      <section class="layout-grid">
        <article class="panel error-panel">
          <div class="panel-head">
            <div>
              <h2>Error inbox</h2>
              <span>{{ formatNumber(errorEvents.length) }} recent events</span>
            </div>
            <button class="mini-btn" type="button" :disabled="loading" @click="fetchErrorFeed">Refresh feed</button>
          </div>

          <div class="filter-bar">
            <label class="filter-field">
              <span>Status</span>
              <select v-model="errorStatusFilter">
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
                <option value="IGNORED">Ignored</option>
              </select>
            </label>
            <label class="filter-field">
              <span>Source</span>
              <select v-model="errorSourceFilter">
                <option value="ALL">All</option>
                <option value="WINDOW">Window</option>
                <option value="VUE">Vue</option>
                <option value="ROUTER">Router</option>
                <option value="FETCH">Fetch</option>
                <option value="AXIOS">Axios</option>
                <option value="MANUAL">Manual</option>
              </select>
            </label>
            <label class="filter-field filter-search">
              <span>Search</span>
              <input v-model.trim="errorSearch" type="text" placeholder="User, route, endpoint, message" />
            </label>
            <button class="mini-btn primary" type="button" :disabled="loading" @click="fetchErrorFeed">Apply</button>
          </div>

          <div v-if="errorEvents.length" class="error-feed">
            <article v-for="item in errorEvents" :key="item.id" class="error-item">
              <div class="error-item-head">
                <div>
                  <strong>{{ item.user_nickname || `User ${item.user_id || 'Guest'}` }}</strong>
                  <span>{{ item.surface || item.page_name || item.page_path || 'Unknown surface' }}</span>
                </div>
                <div class="error-badges">
                  <span class="status-badge" :class="`status-${String(item.status || '').toLowerCase()}`">{{ item.status }}</span>
                  <span class="source-badge">{{ item.source }}</span>
                </div>
              </div>

              <p class="error-message">{{ item.message }}</p>

              <div class="error-meta">
                <span>{{ item.error_type }}</span>
                <span>{{ formatDateTime(item.occurred_at) }}</span>
                <span v-if="item.http_status">HTTP {{ item.http_status }}</span>
                <span v-if="item.request_id">Req {{ item.request_id }}</span>
              </div>

              <div class="error-route">
                <strong>Panel</strong>
                <span>{{ item.page_path || item.surface || 'Unknown' }}</span>
              </div>

              <div v-if="item.endpoint" class="error-route">
                <strong>Endpoint</strong>
                <span>{{ item.http_method || 'GET' }} {{ item.endpoint }}</span>
              </div>

              <div v-if="item.stack_text" class="error-detail">
                <strong>Stack</strong>
                <pre>{{ item.stack_text }}</pre>
              </div>

              <div v-if="item.context" class="error-detail">
                <strong>Context</strong>
                <pre>{{ formatJson(item.context) }}</pre>
              </div>

              <div v-if="item.admin_note" class="error-route">
                <strong>Admin note</strong>
                <span>{{ item.admin_note }}</span>
              </div>

              <div class="error-actions">
                <button class="mini-btn" type="button" :disabled="updatingErrorId === item.id" @click="markErrorStatus(item, 'ACKNOWLEDGED')">
                  Acknowledge
                </button>
                <button class="mini-btn approve" type="button" :disabled="updatingErrorId === item.id" @click="markErrorStatus(item, 'RESOLVED')">
                  Resolve
                </button>
                <button class="mini-btn reject" type="button" :disabled="updatingErrorId === item.id" @click="markErrorStatus(item, 'IGNORED')">
                  Ignore
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty">No error events matched the current filters.</div>
        </article>

        <div class="stack-column">
          <article class="panel">
            <div class="panel-head">
              <h2>Top failing surfaces</h2>
              <span>Last 7 days</span>
            </div>
            <div v-if="summary.top_surfaces?.length" class="compact-list">
              <div v-for="item in summary.top_surfaces" :key="item.surface" class="compact-item">
                <div>
                  <strong>{{ item.surface }}</strong>
                  <span>{{ formatDateTime(item.last_seen_at) }}</span>
                </div>
                <div class="compact-metric">{{ formatNumber(item.total) }}</div>
              </div>
            </div>
            <div v-else class="empty">No surface hotspots yet.</div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Top failing endpoints</h2>
              <span>Last 7 days</span>
            </div>
            <div v-if="summary.top_endpoints?.length" class="compact-list">
              <div v-for="item in summary.top_endpoints" :key="item.endpoint" class="compact-item">
                <div>
                  <strong>{{ item.endpoint }}</strong>
                  <span>{{ formatDateTime(item.last_seen_at) }}</span>
                </div>
                <div class="compact-metric">{{ formatNumber(item.total) }}</div>
              </div>
            </div>
            <div v-else class="empty">No endpoint hotspots yet.</div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Slow endpoints</h2>
              <span>p95 latency</span>
            </div>
            <div v-if="slowEndpoints.length" class="compact-list">
              <div v-for="endpoint in slowEndpoints" :key="endpoint.endpoint" class="compact-item">
                <div>
                  <strong>{{ endpoint.endpoint }}</strong>
                  <span>{{ endpoint.count }} requests</span>
                </div>
                <div class="compact-metric">{{ formatMs(endpoint.p95_ms) }}</div>
              </div>
            </div>
            <div v-else class="empty">No latency samples yet.</div>
          </article>
        </div>
      </section>

      <section class="pricing-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Membership pricing</h2>
              <span>Edit live VIP and SVIP prices used by the purchase flow.</span>
            </div>
            <button class="mini-btn primary" type="button" :disabled="savingPrices" @click="savePricing">
              {{ savingPrices ? 'Saving...' : 'Save prices' }}
            </button>
          </div>

          <div class="price-editor">
            <label v-for="field in priceFields" :key="field.key" class="price-field">
              <span>{{ field.label }}</span>
              <input v-model="priceForm[field.key]" type="number" min="1" step="0.01" />
            </label>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Price audit</h2>
            <span>{{ formatNumber(priceAudit.length) }} recent changes</span>
          </div>
          <div v-if="priceAudit.length" class="compact-list">
            <div v-for="item in priceAudit" :key="item.id" class="compact-item">
              <div>
                <strong>{{ item.role }} {{ item.billing_cycle }}</strong>
                <span>{{ item.updated_by_nickname || `User ${item.updated_by || 'System'}` }} · {{ formatDateTime(item.created_at) }}</span>
              </div>
              <div class="compact-metric">{{ formatMoney(item.old_price_cny) }}￥ → {{ formatMoney(item.new_price_cny) }}￥</div>
            </div>
          </div>
          <div v-else class="empty">No pricing changes yet.</div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../store/authStore'
import { apiUrl } from '../config/api'

const auth = useAuthStore()

const loading = ref(false)
const savingPrices = ref(false)
const updatingErrorId = ref(0)
const errorText = ref('')
const flashText = ref('')
const generatedAt = ref('')

const summary = ref({})
const errorEvents = ref([])
const opsHealth = ref(null)
const opsMetrics = ref(null)
const priceAudit = ref([])

const errorStatusFilter = ref('ALL')
const errorSourceFilter = ref('ALL')
const errorSearch = ref('')

const priceFields = [
  { key: 'VIP_MONTHLY', role: 'VIP', billing_cycle: 'MONTHLY', label: 'VIP Monthly' },
  { key: 'VIP_YEARLY', role: 'VIP', billing_cycle: 'YEARLY', label: 'VIP Yearly' },
  { key: 'SVIP_MONTHLY', role: 'SVIP', billing_cycle: 'MONTHLY', label: 'SVIP Monthly' },
  { key: 'SVIP_YEARLY', role: 'SVIP', billing_cycle: 'YEARLY', label: 'SVIP Yearly' },
]

const priceForm = reactive({
  VIP_MONTHLY: '',
  VIP_YEARLY: '',
  SVIP_MONTHLY: '',
  SVIP_YEARLY: '',
})

const generatedAtLabel = computed(() => {
  if (!generatedAt.value) return 'Awaiting snapshot'
  return `Updated ${formatDateTime(generatedAt.value)}`
})

const summaryCards = computed(() => [
  { label: 'Total error events', value: formatNumber(summary.value.total_events || 0) },
  { label: 'Open events', value: formatNumber(summary.value.open_events || 0) },
  { label: 'Last 24h', value: formatNumber(summary.value.last_24h || 0) },
  { label: 'Impacted users / 7d', value: formatNumber(summary.value.impacted_users_7d || 0) },
  { label: 'Server/API errors', value: formatNumber(summary.value.server_error_events || 0) },
  { label: 'Runtime/UI errors', value: formatNumber(summary.value.runtime_error_events || 0) },
])

const healthLabel = computed(() => {
  const status = String(opsHealth.value?.status || '').toLowerCase()
  if (status === 'ok') return 'Healthy'
  if (status === 'degraded') return 'Degraded'
  return 'No signal'
})

const healthCards = computed(() => [
  { label: 'DB', value: opsHealth.value?.db?.ok ? 'Connected' : 'Unavailable' },
  { label: 'Uptime', value: formatUptime(opsHealth.value?.uptime_sec) },
  { label: 'RSS', value: formatMb(opsHealth.value?.memory?.rss_mb) },
  { label: 'Heap used', value: formatMb(opsHealth.value?.memory?.heap_used_mb) },
])

const metricCards = computed(() => [
  { label: 'Slow APIs', value: formatNumber(opsMetrics.value?.slow_api_count || 0) },
  { label: 'Tracked endpoints', value: formatNumber(opsMetrics.value?.endpoint_count || 0) },
  { label: 'Threshold', value: `${formatNumber(opsMetrics.value?.slow_api_threshold_ms || 0)} ms` },
  { label: 'Status 500s', value: formatNumber(opsMetrics.value?.status_counts?.['500'] || 0) },
])

const slowEndpoints = computed(() => {
  const list = Array.isArray(opsMetrics.value?.endpoints) ? opsMetrics.value.endpoints : []
  return list.slice(0, 6)
})

const formatNumber = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString() : '0'
}

const formatMoney = (value) => {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatMb = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? `${num.toFixed(1)} MB` : '0 MB'
}

const formatMs = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? `${num.toFixed(1)} ms` : '0 ms'
}

const formatUptime = (seconds) => {
  const value = Number(seconds || 0)
  if (!Number.isFinite(value) || value <= 0) return '0m'
  if (value < 3600) return `${Math.round(value / 60)}m`
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`
  return `${(value / 86400).toFixed(1)}d`
}

const formatDateTime = (value) => {
  const time = new Date(value || '').getTime()
  if (!Number.isFinite(time) || time <= 0) return 'Unknown'
  return new Date(time).toLocaleString()
}

const formatJson = (value) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value || '')
  }
}

const setFlash = (value) => {
  flashText.value = value
  errorText.value = ''
}

const setError = (value) => {
  errorText.value = value
  flashText.value = ''
}

const buildErrorQuery = () => {
  const params = new URLSearchParams({
    user_id: String(auth.user?.id || ''),
    status: errorStatusFilter.value,
    source: errorSourceFilter.value,
    q: errorSearch.value || '',
    limit: '40',
  })
  return params.toString()
}

const fillPriceForm = (matrix = []) => {
  priceFields.forEach((field) => {
    const match = matrix.find((item) => item.role === field.role && item.billing_cycle === field.billing_cycle)
    priceForm[field.key] = match?.price_cny != null ? String(match.price_cny) : ''
  })
}

const fetchOpsSignals = async () => {
  const [healthRes, metricsRes] = await Promise.all([
    fetch(apiUrl('/api/ops/health')),
    fetch(apiUrl('/api/ops/metrics')),
  ])
  const healthData = healthRes.ok ? await healthRes.json().catch(() => null) : null
  const metricsData = metricsRes.ok ? await metricsRes.json().catch(() => null) : null
  if (healthData?.success) opsHealth.value = healthData
  if (metricsData?.success) opsMetrics.value = metricsData
}

const fetchErrorFeed = async () => {
  const res = await fetch(apiUrl(`/api/admin/ops/errors?${buildErrorQuery()}`))
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load error feed')
  summary.value = data.data?.summary || {}
  errorEvents.value = Array.isArray(data.data?.events) ? data.data.events : []
}

const fetchPricing = async () => {
  const res = await fetch(apiUrl(`/api/admin/ops/pricing?user_id=${encodeURIComponent(String(auth.user?.id || ''))}`))
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load pricing')
  fillPriceForm(Array.isArray(data.data?.matrix) ? data.data.matrix : [])
  priceAudit.value = Array.isArray(data.data?.audit) ? data.data.audit : []
}

const fetchOpsCenter = async (forceMessage = false) => {
  if (!auth.user?.id) return
  loading.value = true
  if (!forceMessage) flashText.value = ''
  errorText.value = ''
  try {
    await Promise.all([fetchErrorFeed(), fetchPricing(), fetchOpsSignals()])
    generatedAt.value = new Date().toISOString()
  } catch (err) {
    setError(err?.message || 'Failed to load ops center')
  } finally {
    loading.value = false
  }
}

const markErrorStatus = async (item, status) => {
  if (!auth.user?.id || !item?.id || updatingErrorId.value) return
  updatingErrorId.value = Number(item.id)
  try {
    const params = buildErrorQuery()
    const res = await fetch(apiUrl(`/api/admin/ops/errors/${encodeURIComponent(String(item.id))}/status?${params}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        status,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to update error status')
    summary.value = data.data?.summary || summary.value
    errorEvents.value = Array.isArray(data.data?.events) ? data.data.events : errorEvents.value
    setFlash(`Error #${item.id} moved to ${status}.`)
  } catch (err) {
    setError(err?.message || 'Failed to update error status')
  } finally {
    updatingErrorId.value = 0
  }
}

const savePricing = async () => {
  if (!auth.user?.id || savingPrices.value) return
  savingPrices.value = true
  try {
    const prices = priceFields.map((field) => ({
      role: field.role,
      billing_cycle: field.billing_cycle,
      price_cny: Number(priceForm[field.key]),
    }))
    const res = await fetch(apiUrl(`/api/admin/ops/pricing?user_id=${encodeURIComponent(String(auth.user.id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        prices,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save pricing')
    fillPriceForm(Array.isArray(data.data?.matrix) ? data.data.matrix : [])
    priceAudit.value = Array.isArray(data.data?.audit) ? data.data.audit : []
    const count = Array.isArray(data.data?.changes) ? data.data.changes.length : 0
    setFlash(count ? `Saved ${count} membership price changes.` : 'No pricing changes were needed.')
  } catch (err) {
    setError(err?.message || 'Failed to save pricing')
  } finally {
    savingPrices.value = false
  }
}

onMounted(() => {
  fetchOpsCenter()
})
</script>

<style scoped>
.ops-page {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 8% 4%, color-mix(in srgb, #6f9bff 14%, transparent), transparent 30%),
    radial-gradient(circle at 100% 0%, color-mix(in srgb, #79ddff 14%, transparent), transparent 30%),
    var(--bg-main);
}

.ops-page :deep(*),
.ops-page :deep(*::before),
.ops-page :deep(*::after) {
  box-sizing: border-box;
}

.ops-rail {
  padding: 18px 14px;
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rail-brand {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 8px;
}

.rail-link {
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--fg);
  text-decoration: none;
  background: color-mix(in srgb, var(--badge) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
}

.rail-link-active {
  background: color-mix(in srgb, #3b82f6 18%, transparent);
  border-color: color-mix(in srgb, #3b82f6 38%, transparent);
}

.rail-note {
  margin-top: auto;
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--panel) 90%, transparent), color-mix(in srgb, #1677ff 10%, transparent));
}

.rail-note div,
.rail-note span,
.rail-note small {
  color: var(--muted);
  font-size: 12px;
}

.ops-main {
  padding: 22px;
  overflow-y: auto;
  display: grid;
  gap: 16px;
  min-width: 0;
}

.hero,
.panel,
.notice {
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.hero,
.panel,
.notice {
  padding: 18px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 40px;
  line-height: 1;
}

.hero p,
.panel-head span,
.notice span,
.empty,
.error-meta span,
.error-route span,
.compact-item span {
  color: var(--muted);
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.hero-btn,
.mini-btn {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
  background: transparent;
  color: var(--fg);
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
}

.hero-btn.ghost,
.mini-btn.primary {
  background: var(--btn-primary);
  color: var(--btn-text);
}

.notice.error {
  border-color: color-mix(in srgb, #ef4444 28%, transparent);
  background: color-mix(in srgb, #ef4444 10%, transparent);
}

.notice.success {
  border-color: color-mix(in srgb, #22c55e 28%, transparent);
  background: color-mix(in srgb, #22c55e 10%, transparent);
}

.eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #3b82f6;
  margin-bottom: 8px;
}

.card-grid,
.signal-grid,
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.metric-card,
.signal-card {
  border-radius: 18px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 74%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--panel) 92%, transparent), color-mix(in srgb, var(--badge) 78%, transparent));
  display: grid;
  gap: 8px;
}

.metric-card strong,
.signal-card strong {
  font-size: 26px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.signal-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 16px;
  align-items: start;
}

.stack-column {
  display: grid;
  gap: 16px;
}

.error-panel {
  min-width: 0;
}

.filter-bar {
  display: grid;
  grid-template-columns: 140px 140px minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-field {
  display: grid;
  gap: 6px;
}

.filter-field span {
  font-size: 12px;
  color: var(--muted);
}

.filter-field select,
.filter-field input,
.price-field input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  color: var(--fg);
  padding: 10px 12px;
}

.error-feed,
.compact-list {
  display: grid;
  gap: 10px;
}

.error-item,
.compact-item {
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 68%, transparent);
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 14px;
}

.error-item-head,
.compact-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.error-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-badge,
.source-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--panel-border) 72%, transparent);
}

.status-open {
  color: #b91c1c;
  border-color: color-mix(in srgb, #ef4444 32%, transparent);
}

.status-acknowledged {
  color: #92400e;
  border-color: color-mix(in srgb, #f59e0b 32%, transparent);
}

.status-resolved {
  color: #15803d;
  border-color: color-mix(in srgb, #22c55e 32%, transparent);
}

.status-ignored {
  color: #475569;
  border-color: color-mix(in srgb, #64748b 32%, transparent);
}

.error-message {
  margin: 10px 0;
  font-weight: 700;
}

.error-meta,
.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.error-route {
  margin-top: 10px;
  display: grid;
  gap: 4px;
}

.error-route strong,
.error-detail strong,
.compact-item strong {
  display: block;
  margin-bottom: 4px;
}

.error-detail {
  margin-top: 10px;
}

.error-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--muted);
}

.mini-btn.approve {
  border-color: color-mix(in srgb, #22c55e 32%, transparent);
  color: #15803d;
}

.mini-btn.reject {
  border-color: color-mix(in srgb, #ef4444 32%, transparent);
  color: #b91c1c;
}

.compact-metric {
  font-weight: 800;
  white-space: nowrap;
}

.price-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.price-field {
  display: grid;
  gap: 6px;
}

.price-field span {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 1180px) {
  .ops-page {
    grid-template-columns: 1fr;
  }

  .ops-rail {
    display: none;
  }

  .layout-grid,
  .pricing-grid,
  .signal-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .signal-list,
  .price-editor {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
