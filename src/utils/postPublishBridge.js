const STORAGE_KEY = 'jp_publish_draft_v2'

const normalizeArray = (list, limit = 8) =>
  Array.from(new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit)

const normalizeImages = (list, limit = 6) =>
  Array.from(new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit)

const buildTripStyle = (trip) => {
  const focus = normalizeArray([
    ...(trip?.completion_report?.focus_categories || []),
    ...(trip?.intent_snapshot?.preferred_categories || []),
    ...(trip?.intent_snapshot?.tags || []),
  ])
    .join(' ')
    .toLowerCase()

  if (focus.includes('museum') || focus.includes('history') || focus.includes('gallery')) return 'museum-day'
  if (focus.includes('food') || focus.includes('coffee') || focus.includes('restaurant')) return 'food-crawl'
  if (focus.includes('photo') || focus.includes('photography')) return 'photo-route'
  if (String(trip?.intent_snapshot?.pace || '').toLowerCase() === 'slow') return 'slow-afternoon'
  return 'city-walk'
}

const buildRouteRole = (trip) => {
  const status = String(trip?.status || '').trim().toUpperCase()
  if (status === 'COMPLETED') return 'final-stop'
  if (Number(trip?.via_count || 0) > 0) return 'core-stop'
  return 'start-anchor'
}

const buildBestForText = (trip) =>
  normalizeArray([
    ...(trip?.completion_report?.focus_categories || []),
    ...(trip?.intent_snapshot?.preferred_categories || []),
  ], 4).join(', ')

const buildAvoidForText = (trip) => normalizeArray(trip?.intent_snapshot?.avoid_categories || [], 4).join(', ')

const buildDraftContent = (trip) => {
  const report = trip?.completion_report && typeof trip.completion_report === 'object' ? trip.completion_report : null
  const summary = String(report?.overview || trip?.completion_summary || trip?.summary || '').trim()
  const highlights = normalizeArray(report?.highlights || [], 4)
  const routeBits = []
  const startName = String(trip?.route_context?.start?.name || trip?.route_context?.start?.address || '').trim()
  const endName = String(trip?.route_context?.end?.name || trip?.route_context?.end?.address || '').trim()
  if (startName) routeBits.push(`Started from ${startName}.`)
  if (endName) routeBits.push(`Finished at ${endName}.`)
  const focus = normalizeArray(report?.focus_categories || trip?.intent_snapshot?.preferred_categories || [], 3)
  const focusLine = focus.length ? `This route leaned into ${focus.join(', ')}.` : ''
  const highlightsBlock = highlights.length ? `Highlights:\n- ${highlights.join('\n- ')}` : ''

  return [summary, focusLine, routeBits.join(' '), highlightsBlock].filter(Boolean).join('\n\n').trim()
}

export const buildPostDraftFromTrip = (trip) => {
  const savedPois = Array.isArray(trip?.saved_pois) ? trip.saved_pois : []
  const linkedPosts = Array.isArray(trip?.linked_posts) ? trip.linked_posts : []
  const primaryPoi = savedPois[0] || linkedPosts.find((item) => item?.poi_id) || null
  const tags = normalizeArray([
    ...(trip?.completion_report?.focus_categories || []),
    ...(trip?.intent_snapshot?.preferred_categories || []),
    ...(trip?.intent_snapshot?.tags || []),
    trip?.profile_snapshot?.dominant_category,
  ])
  const images = normalizeImages([
    ...savedPois.map((item) => item?.image_url),
    ...linkedPosts.map((item) => item?.image_url),
  ])

  return {
    title:
      String(trip?.completion_report?.headline || trip?.title || '').trim().slice(0, 60) ||
      'Trip summary',
    content: buildDraftContent(trip).slice(0, 1000),
    tagsText: tags.join(', '),
    tripStyle: buildTripStyle(trip),
    routeRole: buildRouteRole(trip),
    pace: String(trip?.intent_snapshot?.pace || '').trim() || 'balanced',
    visitTime: '',
    spendLevel: '',
    crowdLevel: '',
    companionType: '',
    bestForText: buildBestForText(trip),
    avoidForText: buildAvoidForText(trip),
    selectedTags: tags,
    images,
    poi: primaryPoi
      ? {
          id: primaryPoi.id ?? primaryPoi.poi_id ?? null,
          name: primaryPoi.name || primaryPoi.poi_name || '',
          category: primaryPoi.category || '',
          image_url: primaryPoi.image_url || '',
          lat: Number(primaryPoi.lat),
          lng: Number(primaryPoi.lng),
        }
      : null,
    poiInput: String(primaryPoi?.name || primaryPoi?.poi_name || '').trim(),
    saved_at: Date.now(),
  }
}

export const seedPostPublishDraftFromTrip = (trip) => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  const payload = buildPostDraftFromTrip(trip)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return payload
}
