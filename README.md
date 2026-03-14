# JourneyPro Frontend

JourneyPro Frontend is the Vue 3 client for the JourneyPro graduation project. It combines a route-first map workflow, a community-driven discovery feed, and an AI planner that can turn a travel prompt into a route-aware itinerary grounded in local posts and POI data.

## Highlights

- Premium landing page with scroll-led storytelling and map-first product framing
- Map workflow with start/end/via points, along-route POI recommendation, details panels, and parking discovery after arrival
- Community module with large post volume, detail pages, notifications, profile views, and admin entry points
- AI planner:
  - token-streamed itinerary responses
  - route-aware recommended stops
  - community signals and source cards
  - `Write to Map` handoff into via points
  - London-only scope guard for unsupported cities

## Tech stack

- Vue 3
- Vite
- Vue Router
- Pinia
- Element Plus
- Leaflet / Leaflet Routing Machine

## Project structure

```text
src/
  components/        shared UI, map panels, community cards
  router/            app routes
  store/             auth, route, and page state
  views/             page-level screens
  utils/             HTTP helpers and formatting helpers
public/
  mv.mp4             homepage media asset
```

## Getting started

### Prerequisites

- Node.js 18+
- JourneyPro API running on `http://localhost:3001`

### Install

```bash
cd JourneyPro-frontend
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Runtime notes

### AI planner

The AI planner UI is in `src/views/AIPlannerView.vue`.

It renders three layers of output from the backend:

1. Streamed itinerary narrative
2. Ranked stops and segmented itinerary
3. Community evidence:
   - `Community Signals`
   - `Source Cards`

The page persists planner history in local storage, so conversations and recommendations survive route changes and refreshes until the user clears them.

### Map writeback

`Write to Map` converts AI itinerary stops into map via points through the route store. This allows the AI page to act as a planning surface while the map remains the execution surface.

### Scope guard

The current product scope is London-only. If a user asks for another city, the frontend displays a scoped warning state instead of pretending London results match the request.

## Related backend endpoints

- `POST /api/ai/planner/stream`
- `GET /api/route/recommend`
- `GET /api/poi/:id`
- `GET /api/recommendation/settings`
- `POST /api/recommendation/settings`

## Deployment notes

- Ensure the frontend build points to the correct API origin.
- Keep the API image proxy enabled for third-party image sources used in posts and POI cards.
- If external LLM support is enabled on the backend, no frontend changes are required; the page already handles both live-LLM and fallback modes.
