import axios from 'axios'
import { apiUrl } from '../config/api'

const REPORT_ENDPOINT = apiUrl('/api/ops/client-errors')
const SESSION_KEY = 'jp_ops_session_id'
const DUPLICATE_WINDOW_MS = 15000
const recentFingerprints = new Map()

let initialized = false
let nativeFetchRef = null

const nowIso = () => new Date().toISOString()

const cleanText = (value, max = 255) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

const safeParseUser = () => {
  try {
    const raw = localStorage.getItem('jp_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user && typeof user === 'object' ? user : null
  } catch {
    return null
  }
}

const ensureSessionId = () => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `jp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return `jp_${Date.now()}`
  }
}

const shouldSkipUrl = (url) => {
  const next = String(url || '')
  return next.includes('/api/ops/client-errors')
}

const buildRouteMeta = (router) => {
  const route = router?.currentRoute?.value
  return {
    page_path: route?.fullPath || window.location?.pathname || null,
    page_name: route?.name ? String(route.name) : null,
    surface: route?.name ? String(route.name) : route?.fullPath || window.location?.pathname || 'unknown',
  }
}

const makeFingerprint = (payload) =>
  [
    payload.source,
    payload.error_type,
    payload.page_path,
    payload.endpoint,
    payload.http_status,
    payload.message,
  ]
    .map((item) => cleanText(item, 180))
    .join('|')

const shouldSuppressDuplicate = (payload) => {
  const fingerprint = makeFingerprint(payload)
  const now = Date.now()
  const lastAt = recentFingerprints.get(fingerprint) || 0
  recentFingerprints.set(fingerprint, now)
  for (const [key, seenAt] of recentFingerprints.entries()) {
    if (now - seenAt > DUPLICATE_WINDOW_MS) recentFingerprints.delete(key)
  }
  return now - lastAt < DUPLICATE_WINDOW_MS
}

const sendPayload = (payload) => {
  const body = JSON.stringify(payload)
  if (shouldSuppressDuplicate(payload)) return
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(REPORT_ENDPOINT, blob)) return
    } catch {
      // ignore
    }
  }
  if (typeof nativeFetchRef === 'function') {
    nativeFetchRef(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }
}

const report = (payload = {}, router) => {
  const user = safeParseUser()
  const finalPayload = {
    user_id: user?.id || null,
    session_id: ensureSessionId(),
    user_agent: navigator?.userAgent || null,
    occurred_at: nowIso(),
    ...buildRouteMeta(router),
    ...payload,
    message: cleanText(payload.message, 500) || 'Unknown client error',
    stack_text: cleanText(payload.stack_text || payload.stack, 4000) || null,
  }
  sendPayload(finalPayload)
}

const installFetchInterceptor = (router) => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  if (window.__jpOpsFetchPatched) return
  nativeFetchRef = nativeFetchRef || window.fetch.bind(window)
  window.__jpOpsFetchPatched = true

  window.fetch = async (...args) => {
    const [input, init] = args
    const rawUrl = typeof input === 'string' ? input : input?.url || ''
    const method = cleanText(init?.method || input?.method || 'GET', 12).toUpperCase()
    const startedAt = Date.now()
    try {
      const response = await nativeFetchRef(...args)
      if (!shouldSkipUrl(rawUrl) && response.status >= 500) {
        report(
          {
            source: 'FETCH',
            error_type: 'API_HTTP_ERROR',
            severity: 'ERROR',
            endpoint: cleanText(rawUrl, 255),
            http_method: method,
            http_status: response.status,
            request_id: response.headers?.get?.('x-request-id') || null,
            message: `${method} ${cleanText(rawUrl, 180)} returned ${response.status}`,
            context: {
              duration_ms: Date.now() - startedAt,
            },
          },
          router
        )
      }
      return response
    } catch (error) {
      if (!shouldSkipUrl(rawUrl)) {
        report(
          {
            source: 'FETCH',
            error_type: 'API_NETWORK_ERROR',
            severity: 'ERROR',
            endpoint: cleanText(rawUrl, 255),
            http_method: method,
            message: error?.message || `${method} request failed`,
            stack_text: error?.stack || null,
            context: {
              duration_ms: Date.now() - startedAt,
            },
          },
          router
        )
      }
      throw error
    }
  }
}

const installAxiosInterceptor = (router) => {
  if (axios.__jpOpsInterceptorInstalled) return
  axios.__jpOpsInterceptorInstalled = true
  axios.interceptors.response.use(
    (response) => {
      if (response?.status >= 500 && !shouldSkipUrl(response?.config?.url)) {
        report(
          {
            source: 'AXIOS',
            error_type: 'API_HTTP_ERROR',
            severity: 'ERROR',
            endpoint: cleanText(response?.config?.url, 255),
            http_method: cleanText(response?.config?.method || 'GET', 12).toUpperCase(),
            http_status: response.status,
            request_id: response?.headers?.['x-request-id'] || null,
            message: `${String(response?.config?.method || 'GET').toUpperCase()} ${cleanText(
              response?.config?.url,
              180
            )} returned ${response.status}`,
          },
          router
        )
      }
      return response
    },
    (error) => {
      const response = error?.response
      const config = error?.config || {}
      if (!shouldSkipUrl(config?.url) && (!response || response.status >= 500)) {
        report(
          {
            source: 'AXIOS',
            error_type: response ? 'API_HTTP_ERROR' : 'API_NETWORK_ERROR',
            severity: 'ERROR',
            endpoint: cleanText(config?.url, 255),
            http_method: cleanText(config?.method || 'GET', 12).toUpperCase(),
            http_status: response?.status || null,
            request_id: response?.headers?.['x-request-id'] || null,
            message: error?.message || 'Axios request failed',
            stack_text: error?.stack || null,
          },
          router
        )
      }
      return Promise.reject(error)
    }
  )
}

export const initErrorReporting = ({ app, router }) => {
  if (initialized) return
  initialized = true
  nativeFetchRef = nativeFetchRef || (typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : null)

  const previousVueErrorHandler = app?.config?.errorHandler
  if (app?.config) {
    app.config.errorHandler = (error, instance, info) => {
      report(
        {
          source: 'VUE',
          error_type: 'VUE_COMPONENT_ERROR',
          severity: 'ERROR',
          message: error?.message || info || 'Vue component error',
          stack_text: error?.stack || null,
          context: {
            info: cleanText(info, 255),
            component: cleanText(instance?.type?.name || instance?.type?.__name, 120),
          },
        },
        router
      )
      if (typeof previousVueErrorHandler === 'function') {
        previousVueErrorHandler(error, instance, info)
      }
    }
  }

  if (router?.onError) {
    router.onError((error, to) => {
      report(
        {
          source: 'ROUTER',
          error_type: 'ROUTER_NAVIGATION_ERROR',
          severity: 'ERROR',
          page_path: to?.fullPath || null,
          page_name: to?.name ? String(to.name) : null,
          surface: to?.name ? String(to.name) : to?.fullPath || null,
          message: error?.message || 'Router navigation error',
          stack_text: error?.stack || null,
        },
        router
      )
    })
  }

  window.addEventListener(
    'error',
    (event) => {
      const target = event?.target
      if (target?.tagName === 'IMG') return
      report(
        {
          source: 'WINDOW',
          error_type: 'WINDOW_ERROR',
          severity: 'ERROR',
          message: event?.message || 'Window runtime error',
          stack_text: event?.error?.stack || null,
          context: {
            file: cleanText(event?.filename, 255),
            line: event?.lineno || null,
            column: event?.colno || null,
          },
        },
        router
      )
    },
    true
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    report(
      {
        source: 'WINDOW',
        error_type: 'UNHANDLED_REJECTION',
        severity: 'ERROR',
        message: cleanText(reason?.message || reason || 'Unhandled promise rejection', 500),
        stack_text: reason?.stack || null,
      },
      router
    )
  })

  installFetchInterceptor(router)
  installAxiosInterceptor(router)
}

export const reportClientError = (payload = {}, router = null) => {
  report(payload, router)
}
