const AI_PLANNER_CACHE_VERSION = 2
const AI_PLANNER_CACHE_PREFIX = `jp_ai_planner_v${AI_PLANNER_CACHE_VERSION}_`

const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max)

const normalizeArray = (list, limit = 4) =>
  Array.from(new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit)

export const buildPlannerStorageKey = (userId) => `${AI_PLANNER_CACHE_PREFIX}${userId || 'guest'}`

export const buildPoiPlannerPrompt = (poi, options = {}) => {
  const placeName = String(poi?.name || 'this place').trim()
  const city = String(options.city || poi?.city || 'London').trim() || 'London'
  const category = String(poi?.category || '').trim().toLowerCase()
  const bestFor = normalizeArray(poi?.community_summary?.best_for || poi?.best_for || options.bestFor, 2)
  const watchOut = normalizeArray(poi?.community_summary?.watch_out || poi?.watch_out || options.watchOut, 2)
  const topTags = normalizeArray(poi?.community_summary?.top_tags || poi?.tags || options.topTags, 3)
  const focus = options.focusText || bestFor.join(' and ') || topTags.join(', ') || category || 'high-quality stops'
  const avoid = options.avoidText || watchOut.join(' and ')
  const routePart = options.routeHint ? `${options.routeHint}. ` : ''
  const avoidPart = avoid ? ` Avoid ${avoid}.` : ''
  return `Plan a ${city} route that includes ${placeName}. Prioritize ${focus}, keep detours practical, and do not collapse the plan into only food stops.${avoidPart} ${routePart}`.replace(/\s+/g, ' ').trim()
}

export const buildRouteContextSnapshotFromStore = (routeStore, anchorPoi = null) => {
  const currentVia = Array.isArray(routeStore?.viaPoints) ? routeStore.viaPoints : []
  const normalizedAnchor =
    anchorPoi && Number.isFinite(Number(anchorPoi?.lat)) && Number.isFinite(Number(anchorPoi?.lng))
      ? {
          id: anchorPoi?.id ?? null,
          name: anchorPoi?.name || 'POI',
          lat: Number(anchorPoi.lat),
          lng: Number(anchorPoi.lng),
          category: anchorPoi?.category || '',
          image_url: anchorPoi?.image_url || '',
        }
      : null

  const via = currentVia
    .map((point) => ({
      id: point?.id ?? null,
      name: point?.name || 'POI',
      lat: Number(point?.lat),
      lng: Number(point?.lng),
      category: point?.category || '',
      image_url: point?.image_url || '',
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

  const anchorExists =
    !!normalizedAnchor &&
    via.some((point) => String(point.id || '') === String(normalizedAnchor.id || '') || (point.lat === normalizedAnchor.lat && point.lng === normalizedAnchor.lng))

  const mergedVia = normalizedAnchor && !anchorExists ? [normalizedAnchor, ...via].slice(0, 12) : via.slice(0, 12)

  return {
    start: { lng: routeStore?.startLng, lat: routeStore?.startLat },
    end: { lng: routeStore?.endLng, lat: routeStore?.endLat },
    via: mergedVia,
    interest_weight: clamp(routeStore?.recoInterestWeight ?? 0.5, 0, 1),
    explore_weight: clamp(routeStore?.recoExploreWeight ?? 0.15, 0, 1),
  }
}

export const seedAiPlannerFromContext = ({
  userId,
  routeStore,
  prompt,
  anchorPoi = null,
  profileSnapshot = null,
  source = 'bridge',
  scope = { supported: true, supported_city: 'London' },
}) => {
  if (typeof window === 'undefined') return
  const payload = {
    v: AI_PLANNER_CACHE_VERSION,
    saved_at: Date.now(),
    saved_plan_id: null,
    request_id: '',
    stream_error: '',
    route_meta: null,
    planner_meta: { bridge_source: source },
    planner_intent: null,
    itinerary: null,
    recommendations: [],
    sources: [],
    insights: [],
    llm: null,
    retrieval: null,
    scope,
    profile_snapshot: profileSnapshot || null,
    route_context: buildRouteContextSnapshotFromStore(routeStore, anchorPoi),
    messages: [
      {
        id: `m_${Date.now().toString(36)}_seed`,
        role: 'assistant',
        content: 'Share your route goal and I will stream a ranked, map-ready itinerary.',
      },
    ],
    draft_prompt: String(prompt || '').trim(),
  }
  localStorage.setItem(buildPlannerStorageKey(userId), JSON.stringify(payload))
}
