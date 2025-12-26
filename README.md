# JourneyPro Frontend

<p align="center">
  <img src="src/assets/logo.png" width="160" alt="JourneyPro logo" />
</p>

<p align="center">
  Route-first map UI · Community · Personalized POI recommendation (interest vs distance)
</p>

JourneyPro Frontend is the Vue 3 web client for the JourneyPro graduation project. It focuses on a premium, Apple-inspired homepage experience, a route-first map workflow, and community-driven signals (likes / favorites / views) to personalize POI ranking.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Features

- Map + routing workflow (Leaflet + OSRM)
- Along-route POI recommendation with user-controlled tuning (interest vs distance slider)
- Community: post feed, publish, like, favorite, comment, follow, notifications, chat
- URL-based images + non-destructive crop (`#jp_crop`) + backend proxy to bypass CORS while editing
- Dark / Light theme with consistent tokens across pages
- Apple-like scroll scenes and left-side in-page navigation on the homepage

## Tech stack

- Vue 3 + Vite 4
- Pinia (state management)
- Element Plus (UI components)
- Leaflet + Leaflet Routing Machine (map)
- Axios (HTTP)

## Project structure

```text
src/
  config/api.js          # API / OSRM base URLs (VITE_*)
  router/index.js        # routes + auth guard + lazy-loading
  store/                 # Pinia stores (auth, route, ...)
  views/                 # main pages (Home / Map / Posts / Profile / ...)
  components/            # reusable UI blocks
  utils/                 # helpers (image proxy, crop URL, ...)
```

## Getting started

### Prerequisites

- Node.js 18+
- A running JourneyPro API (default: `http://localhost:3001`)
- An OSRM instance (local or remote)

### Install

```bash
cd JourneyPro-frontend
npm install
```

### Configure env

Copy `JourneyPro-frontend/.env.example` to `JourneyPro-frontend/.env` and update:

- `VITE_API_BASE` (recommended production value: `/api`)
- `VITE_OSRM_BASE` (recommended production value: `/osrm`)

### Run (dev)

```bash
npm run dev
```

## Configuration

Environment variables (Vite):

| Name | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:3001/api` | Backend API base URL (use `/api` with a reverse proxy) |
| `VITE_OSRM_BASE` | `/osrm` | OSRM routing base URL (dev uses `vite.config.js` to proxy `/osrm` to `http://127.0.0.1:5000`) |
| `VITE_LOOP_FEED` | `false` | Demo-only: loop the community feed after the database ends |

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # eslint --fix
npm run format   # prettier
```

## Deployment

Recommended: serve the built frontend (`dist/`) and reverse-proxy API + OSRM under the same domain to avoid CORS.

Example Nginx (adjust ports to your environment):

```nginx
server {
  listen 80;
  server_name your.domain;

  root /var/www/journeypro-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
  }

  location /osrm/ {
    proxy_pass http://127.0.0.1:5000/;
  }
}
```

## Troubleshooting

- Map tiles are loaded from public providers (OSM / Carto) and require network access.
- If routing fails:
  - Dev: ensure `vite.config.js` proxy target (`http://127.0.0.1:5000`) matches your OSRM instance.
  - Prod: ensure `/osrm` reverse proxy works and `VITE_OSRM_BASE=/osrm`.
- If the page is blank after refresh in production, ensure your server rewrites all routes to `index.html` (SPA fallback).
