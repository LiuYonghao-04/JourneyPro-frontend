# JourneyPro Frontend

JourneyPro Frontend is the Vue 3 client for the JourneyPro graduation project. It combines a route-first map workflow, a community-driven discovery feed, and an AI planner that can turn a travel prompt into a route-aware itinerary grounded in local posts and POI data.

## Highlights

- Premium landing page with scroll-led storytelling and map-first product framing
- Map workflow with start/end/via points, along-route POI recommendation, details panels, and parking discovery after arrival
- Community module with large post volume, detail pages, notifications, profile views, and admin entry points
- Admin ops center:
  - frontend/runtime/API error inbox for operators
  - live membership pricing editor for VIP/SVIP monthly and yearly plans
  - backup freshness, scheduled maintenance status, and maintenance log visibility
- AI planner:
  - token-streamed itinerary responses
  - route-aware recommended stops
  - community signals and source cards
  - `Write to Map` handoff into via points
  - London-only scope guard for unsupported cities
- Global error reporting for `window`, Vue component, router, `fetch`, and `axios` failures

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
  utils/             HTTP helpers, formatting helpers, and error reporting
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

### Ops center

The admin operations UI is in `src/views/AdminOpsView.vue`.

It combines four operational surfaces:

1. Live health and slow-API telemetry from the backend ops endpoints
2. Error inbox data collected from client runtime failures
3. Live membership pricing controls for VIP/SVIP monthly and yearly plans
4. Backup freshness and Windows scheduled-maintenance status

### Global client error reporting

`src/utils/errorReporter.js` installs error capture for:

- `window.onerror`
- `unhandledrejection`
- Vue component exceptions
- router navigation failures
- `fetch` 5xx/network failures
- `axios` 5xx/network failures

These events are posted to the backend so administrators can see which user hit the error, where it happened, and when it happened.

## Related backend endpoints

- `POST /api/ai/planner/stream`
- `GET /api/route/recommend`
- `GET /api/poi/:id`
- `GET /api/recommendation/settings`
- `POST /api/recommendation/settings`
- `POST /api/ops/client-errors`
- `GET /api/admin/ops/errors`
- `GET /api/admin/ops/pricing`
- `GET /api/admin/ops/maintenance`

## Deployment notes

- Ensure the frontend build points to the correct API origin.
- Keep the API image proxy enabled for third-party image sources used in posts and POI cards.
- If external LLM support is enabled on the backend, no frontend changes are required; the page already handles both live-LLM and fallback modes.
- The admin ops page is most useful when backend scheduled maintenance is installed with `npm run ops:schedule:install`, otherwise backup/task status will show missing automation.
