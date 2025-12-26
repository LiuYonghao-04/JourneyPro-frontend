# JourneyPro Frontend

<p align="center">
  <img src="src/assets/logo_dark.png" width="160" alt="JourneyPro logo" />
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

This is a [Leaflet Routing Machine plugin](https://github.com/perliedman/leaflet-routing-machine) extension for [vue-leaflet package](https://github.com/vue-leaflet/vue-leaflet) (at the time of publication, it works with version 0.10.1).

You can see an example at [Codesandbox.io](https://codesandbox.io/p/github/Recly/vue3-leaflet-routing-machine/main/), or [Github Pages](https://recly.github.io/vue3-leaflet-routing-machine/)

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
