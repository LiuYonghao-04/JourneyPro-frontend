<template>
  <div class="page" ref="pageEl" @scroll.passive="onScroll">
    <nav class="side-nav" aria-label="On this page">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="side-nav-item"
        :class="{ active: activeAnchor === item.key }"
        :aria-current="activeAnchor === item.key ? 'page' : null"
        @click="scrollToAnchor(item.key)"
      >
        <span class="side-nav-dot" aria-hidden="true"></span>
        <span class="side-nav-text">{{ item.label }}</span>
      </button>
    </nav>

    <section class="hero" id="hero" ref="heroEl" :style="heroVars">
      <div class="hero-sticky">
        <div class="hero-bg" aria-hidden="true">
          <svg class="hero-bg-svg" viewBox="0 0 1200 700" fill="none">
            <defs>
              <linearGradient id="jpRouteGrad" x1="0" y1="0" x2="1200" y2="700" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="var(--jp-accent)" stop-opacity="1" />
                <stop offset="1" stop-color="var(--jp-accent-2)" stop-opacity="1" />
              </linearGradient>
              <radialGradient
                id="jpGlow"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(620 280) rotate(90) scale(520 900)"
              >
                <stop offset="0" stop-color="var(--jp-accent)" stop-opacity="0.24" />
                <stop offset="1" stop-color="transparent" stop-opacity="0" />
              </radialGradient>
              <filter id="jpSoftBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="18" />
              </filter>
            </defs>

            <rect x="-20" y="-20" width="1240" height="740" fill="url(#jpGlow)" />

            <path class="road" d="M120 560 C 260 480, 410 430, 560 420 S 880 430, 1100 320" />
            <path class="road" d="M160 200 C 320 320, 420 380, 520 420 S 720 520, 980 610" />
            <path class="road" d="M240 620 C 360 560, 480 530, 600 500 S 780 420, 980 260" />
            <path class="road" d="M80 340 C 220 310, 350 320, 480 360 S 760 470, 1120 520" />

            <path
              id="jpHeroRoute"
              class="route"
              pathLength="100"
              d="M160 520 C 330 420, 460 360, 620 340 S 940 300, 1060 220"
            />

            <circle class="pin pin-a" cx="160" cy="520" r="10" />
            <circle class="pin pin-b" cx="620" cy="340" r="10" />
            <circle class="pin pin-c" cx="1060" cy="220" r="10" />

            <circle v-if="!reduceMotion" class="traveler" r="8">
              <animateMotion
                dur="7.5s"
                repeatCount="indefinite"
                keyTimes="0;1"
                keySplines="0.25 0.1 0.25 1"
                calcMode="spline"
              >
                <mpath href="#jpHeroRoute" />
              </animateMotion>
            </circle>
          </svg>
        </div>

        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">JourneyPro</p>
            <h1 class="hero-title">
              Explore,
              <span class="accent">personalized</span>.
            </h1>
            <p class="hero-lede">
              POI recommendations that balance what you love and what's close &mdash; all along your route.
            </p>

            <div class="hero-actions">
              <RouterLink class="btn primary" to="/map">Open Map</RouterLink>
              <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
              <template v-if="!auth.user">
                <RouterLink class="btn ghost" to="/login">Login</RouterLink>
              </template>
            </div>

            <div class="hero-metrics">
              <div class="metric">
                <div class="k">Interest x Distance</div>
                <div class="v">User-controlled tuning</div>
              </div>
              <div class="metric">
                <div class="k">Along-route POIs</div>
                <div class="v">Start / End / Via-aware</div>
              </div>
              <div class="metric">
                <div class="k">Signals</div>
                <div class="v">Likes &middot; Favorites &middot; Views</div>
              </div>
            </div>
          </div>

          <div class="hero-media">
            <div class="device" role="img" aria-label="Animated route preview">
              <div class="device-screen">
                <div class="device-top">
                  <div class="search-pill">Search along route</div>
                  <div class="status-dot"></div>
                </div>

                <svg class="device-map" viewBox="0 0 360 680" fill="none">
                  <defs>
                    <linearGradient id="jpDeviceGrad" x1="0" y1="0" x2="360" y2="680" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stop-color="rgba(255,255,255,0.10)" />
                      <stop offset="1" stop-color="rgba(255,255,255,0.02)" />
                    </linearGradient>
                    <linearGradient
                      id="jpDeviceRouteGrad"
                      x1="0"
                      y1="0"
                      x2="360"
                      y2="680"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stop-color="var(--jp-accent)" />
                      <stop offset="1" stop-color="var(--jp-accent-2)" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width="360" height="680" rx="28" fill="url(#jpDeviceGrad)" />

                  <path class="mini-road" d="M40 580 C 120 520, 180 480, 250 460 S 320 390, 340 300" />
                  <path class="mini-road" d="M20 260 C 120 280, 180 330, 250 380 S 320 520, 350 640" />
                  <path class="mini-road" d="M10 420 C 90 400, 150 390, 220 360 S 320 290, 360 240" />

                  <path
                    id="jpDeviceRoute"
                    class="mini-route"
                    pathLength="100"
                    d="M46 500 C 120 470, 190 458, 250 442 S 318 388, 336 312"
                  />

                  <circle class="mini-pin a" cx="46" cy="500" r="8" />
                  <circle class="mini-pin b" cx="250" cy="442" r="8" />
                  <circle class="mini-pin c" cx="336" cy="312" r="8" />

                  <circle v-if="!reduceMotion" class="mini-traveler" r="6">
                    <animateMotion dur="6.2s" repeatCount="indefinite">
                      <mpath href="#jpDeviceRoute" />
                    </animateMotion>
                  </circle>
                </svg>

                <div class="device-sheet">
                  <div class="sheet-title">Recommended stops</div>
                  <div class="sheet-row" v-for="p in demoSortedPois.slice(0, 3)" :key="p.name">
                    <div class="sheet-ic">{{ p.icon }}</div>
                    <div class="sheet-main">
                      <div class="sheet-name">{{ p.name }}</div>
                      <div class="sheet-meta">{{ p.category }} &middot; {{ p.distanceKm.toFixed(1) }} km</div>
                    </div>
                    <div class="sheet-score">{{ Math.round(p.score * 100) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="demo">
              <div class="demo-label">
                <span>Distance {{ demoDistancePct }}%</span>
                <span>Interest {{ demoInterestPct }}%</span>
              </div>
              <input class="demo-range" type="range" min="0" max="100" v-model.number="demoWeightPct" />
              <div class="demo-hint">Slider changes ordering only &mdash; nothing disappears.</div>
            </div>
          </div>
        </div>

        <div class="hero-scroll" aria-hidden="true">
          <div class="scroll-dot"></div>
          <div class="scroll-text">Scroll</div>
        </div>
      </div>
    </section>

    <section class="scene scene-props jp-reveal" id="props" ref="propsEl" :style="propsVars">
      <div class="scene-sticky">
        <div class="section-inner">
        <h2 class="section-title">Three things, done beautifully.</h2>
        <p class="section-sub">Big typography, clean cards, and subtle motion &mdash; inspired by Apple-style product pages.</p>
        <div class="props">
          <div class="prop card">
            <div class="prop-ic">01</div>
            <h3 class="prop-title">Plan</h3>
            <p class="prop-desc">Multi-stop routes, via points, and fast map preview.</p>
          </div>
          <div class="prop card">
            <div class="prop-ic">02</div>
            <h3 class="prop-title">Discover</h3>
            <p class="prop-desc">POIs re-ranked by your interests and route proximity.</p>
          </div>
          <div class="prop card">
            <div class="prop-ic">03</div>
            <h3 class="prop-title">Share</h3>
            <p class="prop-desc">Posts, likes, saves &mdash; turn trips into stories.</p>
          </div>
          <div class="prop card">
            <div class="prop-ic">04</div>
            <h3 class="prop-title">Personalize</h3>
            <p class="prop-desc">Tune interest vs distance, and see your taste profile as percentages.</p>
          </div>
        </div>
        </div>
      </div>
    </section>

    <section class="scene scene-tiles jp-reveal" id="explore" ref="tilesEl" :style="tilesVars">
      <div class="scene-sticky">
        <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">Made for your journey.</h2>
          <p class="section-sub">A homepage that feels calm, premium, and alive.</p>
        </div>

        <div class="tiles-grid">
          <RouterLink class="tile tile-wide link" to="/map">
            <div class="tile-copy">
              <p class="tile-eyebrow">Routing</p>
              <div class="tile-title">A route-first map UI.</div>
              <div class="tile-desc">Start &middot; End &middot; Via &mdash; then explore what's nearby.</div>
              <div class="tile-cta">Open Map &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="mini-card">
                <div class="mini-k">ETA</div>
                <div class="mini-v">12 min</div>
              </div>
              <div class="mini-card">
                <div class="mini-k">Stops</div>
                <div class="mini-v">3</div>
              </div>
              <div class="mini-card">
                <div class="mini-k">Match</div>
                <div class="mini-v">Food</div>
              </div>
            </div>
          </RouterLink>

          <RouterLink class="tile link" :to="profileLink">
            <div class="tile-copy">
              <p class="tile-eyebrow">Profile</p>
              <div class="tile-title">See what you're into.</div>
              <div class="tile-desc">Your interest distribution is visualized as percentages.</div>
              <div class="tile-cta">Open Profile &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="bars">
                <div class="bar">
                  <div class="bar-label">Food</div>
                  <div class="bar-track"><span class="bar-fill" style="--w: 0.62"></span></div>
                </div>
                <div class="bar">
                  <div class="bar-label">History</div>
                  <div class="bar-track"><span class="bar-fill" style="--w: 0.28"></span></div>
                </div>
                <div class="bar">
                  <div class="bar-label">Nature</div>
                  <div class="bar-track"><span class="bar-fill" style="--w: 0.10"></span></div>
                </div>
              </div>
            </div>
          </RouterLink>

          <RouterLink class="tile link" to="/posts">
            <div class="tile-copy">
              <p class="tile-eyebrow">Community</p>
              <div class="tile-title">Trips become stories.</div>
              <div class="tile-desc">Get inspiration from posts and save places you love.</div>
              <div class="tile-cta">Browse Community &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="bubble">Photo</div>
              <div class="bubble">Comment</div>
              <div class="bubble">Save</div>
            </div>
          </RouterLink>

          <RouterLink class="tile link" to="/fast-ux">
            <div class="tile-copy">
              <p class="tile-eyebrow">Experience</p>
              <div class="tile-title">Fast, smooth UX.</div>
              <div class="tile-desc">Keyboard shortcuts, refined panels, and responsive motion.</div>
              <div class="tile-cta">Explore UX &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="mini-card">
                <div class="mini-k">Shortcut</div>
                <div class="mini-v">F</div>
              </div>
              <div class="mini-card">
                <div class="mini-k">Pin</div>
                <div class="mini-v">On</div>
              </div>
            </div>
          </RouterLink>

          <RouterLink class="tile link" to="/privacy">
            <div class="tile-copy">
              <p class="tile-eyebrow">Privacy</p>
              <div class="tile-title">Control what you share.</div>
              <div class="tile-desc">Clear settings and privacy-first defaults for every trip.</div>
              <div class="tile-cta">Read Privacy &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="bubble">Settings</div>
              <div class="bubble">Visibility</div>
              <div class="bubble">Consent</div>
            </div>
          </RouterLink>

          <RouterLink class="tile link" to="/notifications">
            <div class="tile-copy">
              <p class="tile-eyebrow">Updates</p>
              <div class="tile-title">Stay in sync.</div>
              <div class="tile-desc">Likes, favorites, and replies &mdash; all in one inbox.</div>
              <div class="tile-cta">Open Inbox &rarr;</div>
            </div>
            <div class="tile-media">
              <div class="mini-card">
                <div class="mini-k">Likes</div>
                <div class="mini-v">+8</div>
              </div>
              <div class="mini-card">
                <div class="mini-k">Replies</div>
                <div class="mini-v">2</div>
              </div>
            </div>
          </RouterLink>
        </div>
        </div>
      </div>
    </section>

    <section class="scene scene-showcase jp-reveal" id="showcase" ref="showcaseEl" :style="showcaseVars">
      <div class="scene-sticky">
        <div class="section-inner">
          <div class="section-head">
            <h2 class="section-title">Scroll-driven details.</h2>
            <p class="section-sub">Click a card &mdash; it flips to reveal what's underneath.</p>
          </div>

          <div class="showcase-grid">
            <button
              class="flip-card"
              :class="{ flipped: showcaseFlip[0] }"
              type="button"
              :aria-pressed="showcaseFlip[0] ? 'true' : 'false'"
              aria-label="Flip card: Recommendation and Signals"
              @click="toggleShowcaseFlip(0)"
            >
              <div class="flip-inner">
                <div class="flip-face front">
                  <div class="flip-eyebrow">Recommendation</div>
                  <div class="flip-title">Ordering, not filtering.</div>
                  <div class="flip-desc">The slider changes the ranking of POIs &mdash; it won't hide categories.</div>
                  <div class="flip-pills">
                    <span class="pill">Distance</span>
                    <span class="pill">Interest</span>
                  </div>
                </div>
                <div class="flip-face back">
                  <div class="flip-eyebrow">Signals</div>
                  <div class="flip-title">Learn what you love.</div>
                  <div class="flip-desc">Likes, favorites, and views contribute to a personal taste profile.</div>
                  <div class="flip-pills">
                    <span class="pill">Like</span>
                    <span class="pill">Save</span>
                    <span class="pill">View</span>
                  </div>
                </div>
              </div>
            </button>

            <button
              class="flip-card"
              :class="{ flipped: showcaseFlip[1] }"
              type="button"
              :aria-pressed="showcaseFlip[1] ? 'true' : 'false'"
              aria-label="Flip card: Navigation and Community"
              @click="toggleShowcaseFlip(1)"
            >
              <div class="flip-inner">
                <div class="flip-face front">
                  <div class="flip-eyebrow">Navigation</div>
                  <div class="flip-title">Route-first UI.</div>
                  <div class="flip-desc">Start / End / Via &mdash; then discover stops along the way.</div>
                  <div class="flip-pills">
                    <span class="pill">Start</span>
                    <span class="pill">Via</span>
                    <span class="pill">End</span>
                  </div>
                </div>
                <div class="flip-face back">
                  <div class="flip-eyebrow">Community</div>
                  <div class="flip-title">Trips become stories.</div>
                  <div class="flip-desc">Open a post and jump straight to the map location.</div>
                  <div class="flip-pills">
                    <span class="pill">Posts</span>
                    <span class="pill">Photos</span>
                    <span class="pill">Places</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div class="showcase-note">
            Tip: scroll still drives the scene; click drives the flip.
          </div>
        </div>
      </div>
    </section>

    <section class="section flow jp-reveal" id="flow" ref="flowEl">
      <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">From idea to itinerary.</h2>
          <p class="section-sub">A simple workflow built into JourneyPro, from discovery to sharing.</p>
        </div>

        <div class="flow-grid">
          <div class="flow-card card">
            <div class="flow-num">01</div>
            <div class="flow-title">Discover</div>
            <div class="flow-desc">Browse community posts, search POIs, and save places you like.</div>
          </div>
          <div class="flow-card card">
            <div class="flow-num">02</div>
            <div class="flow-title">Plan</div>
            <div class="flow-desc">Set start/end/via points, preview the route, and pin useful steps.</div>
          </div>
          <div class="flow-card card">
            <div class="flow-num">03</div>
            <div class="flow-title">Tune</div>
            <div class="flow-desc">Choose how much interest vs distance matters &mdash; it only reorders results.</div>
          </div>
          <div class="flow-card card">
            <div class="flow-num">04</div>
            <div class="flow-title">Share</div>
            <div class="flow-desc">Publish your trip as a post and help others discover new places.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section spotlight jp-reveal" id="spotlight" ref="spotlightEl">
      <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">Community spotlight.</h2>
          <RouterLink class="link-more" to="/posts">Browse all &rarr;</RouterLink>
        </div>

        <div v-if="spotlightError" class="spotlight-empty card">
          <div class="spotlight-empty-title">Community is offline</div>
          <div class="spotlight-empty-sub">Start the API server to load trending posts.</div>
        </div>

        <div v-else class="spotlight-rail" :class="{ loading: spotlightLoading }">
          <div v-if="spotlightLoading" v-for="n in 6" :key="n" class="spotlight-card skeleton" />

          <RouterLink
            v-else
            v-for="p in spotlightPosts"
            :key="p.id"
            :to="`/posts/postsid=${p.id}`"
            class="spotlight-card link"
          >
            <div class="spotlight-cover" :class="{ empty: !coverOf(p) }">
              <CroppedImage v-if="coverOf(p)" :src="coverOf(p)" :alt="p.title" class="spotlight-img" />
              <div v-else class="spotlight-empty">No cover</div>
            </div>
            <div class="spotlight-body">
              <div class="spotlight-title">{{ p.title || 'Untitled' }}</div>
              <div class="spotlight-meta">
                <span class="name">{{ p.user?.nickname || 'Guest' }}</span>
                <span class="date">{{ formatShortDate(p.created_at) }}</span>
              </div>
              <div class="spotlight-stats">
                <span class="stat">
                  <el-icon class="stat-ic"><CircleCheck /></el-icon>
                  {{ p.like_count || 0 }}
                </span>
                <span class="stat">
                  <el-icon class="stat-ic"><Star /></el-icon>
                  {{ p.favorite_count || 0 }}
                </span>
                <span class="stat">
                  <el-icon class="stat-ic"><View /></el-icon>
                  {{ p.view_count || 0 }}
                </span>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="section faq jp-reveal" id="faq" ref="faqEl">
      <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">FAQ</h2>
          <p class="section-sub">A few quick answers about the recommendation and privacy.</p>
        </div>

        <div class="faq-list">
          <details class="faq-item">
            <summary>Does the slider hide POIs if my interest is low?</summary>
            <div class="faq-body">No. The slider only changes the display order (ranking) of the same recommended set.</div>
          </details>
          <details class="faq-item">
            <summary>What signals are used for personalization?</summary>
            <div class="faq-body">Likes, favorites, and views help build a taste profile, plus distance to your route.</div>
          </details>
          <details class="faq-item">
            <summary>Can I sync my slider setting across devices?</summary>
            <div class="faq-body">Yes. After login, the weight is loaded from the server and kept consistent across browsers.</div>
          </details>
          <details class="faq-item">
            <summary>What if the community server is offline?</summary>
            <div class="faq-body">The homepage will show a fallback state; start the API server to load spotlight posts.</div>
          </details>
        </div>
      </div>
    </section>

    <section class="section cta jp-reveal" id="start" ref="ctaEl">
      <div class="section-inner">
        <div class="cta-card card">
          <div class="cta-copy">
            <p class="eyebrow">Ready?</p>
            <h2 class="section-title">Start your next trip.</h2>
            <p class="section-sub">Map a route, tune recommendations, and collect places you'll love.</p>
            <div class="hero-actions">
              <RouterLink class="btn primary" to="/map">Open Map</RouterLink>
              <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
            </div>
          </div>
          <div class="cta-media">
            <div class="cta-chip">Live routing</div>
            <div class="cta-chip">POI discovery</div>
            <div class="cta-chip">Interest profile</div>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="section-inner footer-inner">
        <div class="footer-brand">
          <div class="footer-logo">JourneyPro</div>
          <div class="footer-sub">Intelligent Trip OS</div>
        </div>
        <div class="footer-links">
          <RouterLink class="footer-link" to="/map">Map</RouterLink>
          <RouterLink class="footer-link" to="/posts">Community</RouterLink>
          <RouterLink class="footer-link" to="/privacy">Privacy</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { CircleCheck, Star, View } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/authStore'
import CroppedImage from '../components/CroppedImage.vue'

const auth = useAuthStore()

const API_POSTS = 'http://localhost:3001/api/posts'

const pageEl = ref(null)
const heroEl = ref(null)
const propsEl = ref(null)
const tilesEl = ref(null)
const showcaseEl = ref(null)
const flowEl = ref(null)
const spotlightEl = ref(null)
const faqEl = ref(null)
const ctaEl = ref(null)

const heroProgress = ref(0)
const propsProgress = ref(0)
const tilesProgress = ref(0)
const showcaseProgress = ref(0)

let rafId = 0

const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

const navItems = [
  { key: 'hero', label: 'Overview' },
  { key: 'props', label: 'Pillars' },
  { key: 'explore', label: 'Explore' },
  { key: 'showcase', label: 'Showcase' },
  { key: 'flow', label: 'Flow' },
  { key: 'spotlight', label: 'Spotlight' },
  { key: 'faq', label: 'FAQ' },
  { key: 'start', label: 'Start' },
]
const activeAnchor = ref('hero')

const heroVars = computed(() => ({
  '--hero-p': String(heroProgress.value),
}))

const propsVars = computed(() => ({
  '--p': String(propsProgress.value),
}))
const tilesVars = computed(() => ({
  '--p': String(tilesProgress.value),
}))
const showcaseVars = computed(() => ({
  '--p': String(showcaseProgress.value),
}))

const updateHeaderState = (scrollTop) => {
  document.body.classList.toggle('jp-home-scrolled', scrollTop > 8)
}

const topInPage = (page, el) => {
  if (!page || !el) return 0
  const pageRect = page.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return elRect.top - pageRect.top + page.scrollTop
}

const anchorElByKey = (key) => {
  const map = {
    hero: heroEl,
    props: propsEl,
    explore: tilesEl,
    showcase: showcaseEl,
    flow: flowEl,
    spotlight: spotlightEl,
    faq: faqEl,
    start: ctaEl,
  }
  return map[key]?.value || null
}

const progressFor = (page, sectionEl) => {
  if (!page || !sectionEl) return 0
  const scrollTop = page.scrollTop
  const start = sectionEl.offsetTop
  const end = Math.max(start, start + sectionEl.offsetHeight - page.clientHeight)
  const p = end === start ? 1 : (scrollTop - start) / (end - start)
  return clamp(p, 0, 1)
}

const updateScrollProgress = () => {
  const page = pageEl.value
  if (!page) return

  updateHeaderState(page.scrollTop)
  heroProgress.value = progressFor(page, heroEl.value)
  propsProgress.value = progressFor(page, propsEl.value)
  tilesProgress.value = progressFor(page, tilesEl.value)
  showcaseProgress.value = progressFor(page, showcaseEl.value)

  const cursor = page.scrollTop + page.clientHeight * 0.35
  let current = 'hero'
  for (const item of navItems) {
    const el = anchorElByKey(item.key)
    if (!el) continue
    const top = topInPage(page, el)
    if (cursor >= top) current = item.key
  }
  activeAnchor.value = current
}

const scheduleUpdate = () => {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    updateScrollProgress()
  })
}

const onScroll = () => {
  scheduleUpdate()
}

const scrollToAnchor = (key) => {
  const page = pageEl.value
  const el = anchorElByKey(key)
  if (!page || !el) return
  const top = topInPage(page, el)
  page.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' })
}

const profileLink = computed(() => {
  if (!auth.user?.id) return '/login'
  return `/person?userid=${auth.user.id}`
})

const demoWeightPct = ref(50)
const demoWeight = computed(() => clamp(Number(demoWeightPct.value || 0) / 100, 0, 1))
const demoDistancePct = computed(() => Math.round((1 - demoWeight.value) * 100))
const demoInterestPct = computed(() => Math.round(demoWeight.value * 100))

const demoPois = [
  { icon: 'F', name: 'Noodle House', category: 'Food', interest: 0.92, distanceKm: 1.2 },
  { icon: 'H', name: 'City Museum', category: 'History', interest: 0.74, distanceKm: 3.8 },
  { icon: 'F', name: 'Coffee Corner', category: 'Food', interest: 0.62, distanceKm: 0.8 },
  { icon: 'N', name: 'Riverside Park', category: 'Nature', interest: 0.58, distanceKm: 2.1 },
]

const demoSortedPois = computed(() => {
  const w = demoWeight.value
  const maxD = Math.max(...demoPois.map((p) => p.distanceKm), 1)
  return demoPois
    .map((p) => {
      const distanceScore = 1 - clamp(p.distanceKm / maxD, 0, 1)
      const score = w * p.interest + (1 - w) * distanceScore
      return { ...p, score }
    })
    .sort((a, b) => b.score - a.score)
})

const showcaseFlip = ref([false, false])
const toggleShowcaseFlip = (index) => {
  const list = showcaseFlip.value
  const next = list.map((isFlipped, i) => (i === index ? !isFlipped : false))
  showcaseFlip.value = next
}

const spotlightLoading = ref(true)
const spotlightError = ref('')
const spotlightPosts = ref([])

const coverOf = (post) => post?.cover_image || (Array.isArray(post?.images) ? post.images[0] : '')

const formatShortDate = (ts) => {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fetchSpotlight = async () => {
  spotlightLoading.value = true
  spotlightError.value = ''
  try {
    const res = await axios.get(API_POSTS, { params: { limit: 6, offset: 0, sort: 'hot' } })
    spotlightPosts.value = res.data?.data || []
  } catch (e) {
    spotlightError.value = 'offline'
  } finally {
    spotlightLoading.value = false
  }
}

let sectionObserver = null
let motionQuery = null
let motionListener = null
const reduceMotion = ref(false)

onMounted(() => {
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null
  if (motionQuery) {
    reduceMotion.value = !!motionQuery.matches
    motionListener = () => {
      reduceMotion.value = !!motionQuery.matches
    }
    motionQuery.addEventListener?.('change', motionListener)
    motionQuery.addListener?.(motionListener)
  }

  const revealEls = document.querySelectorAll('.jp-reveal')
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
      })
    },
    { threshold: 0.16 }
  )
  revealEls.forEach((el) => sectionObserver.observe(el))

  fetchSpotlight()
  scheduleUpdate()
  window.addEventListener('resize', scheduleUpdate)
})

onBeforeUnmount(() => {
  document.body.classList.remove('jp-home-scrolled')
  window.removeEventListener('resize', scheduleUpdate)
  sectionObserver?.disconnect()
  sectionObserver = null
  if (motionQuery && motionListener) {
    motionQuery.removeEventListener?.('change', motionListener)
    motionQuery.removeListener?.(motionListener)
  }
  motionQuery = null
  motionListener = null
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
})
</script>

<style scoped>
:global(body[data-theme='dark']) {
  --jp-home-bg: radial-gradient(1200px 900px at 20% -10%, rgba(0, 113, 227, 0.24), transparent 60%),
    radial-gradient(900px 700px at 90% 10%, rgba(255, 59, 48, 0.14), transparent 55%),
    #050506;
  --jp-home-fg: #f5f5f7;
  --jp-home-muted: rgba(245, 245, 247, 0.72);
  --jp-surface: rgba(255, 255, 255, 0.06);
  --jp-border: rgba(255, 255, 255, 0.12);
  --jp-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  --jp-accent: #4da3ff;
  --jp-accent-2: #a78bfa;
}

:global(body[data-theme='light']) {
  --jp-home-bg: radial-gradient(1200px 900px at 18% -10%, rgba(0, 113, 227, 0.14), transparent 60%),
    radial-gradient(900px 700px at 90% 8%, rgba(255, 45, 85, 0.08), transparent 55%),
    #f5f5f7;
  --jp-home-fg: #1d1d1f;
  --jp-home-muted: rgba(29, 29, 31, 0.7);
  --jp-surface: rgba(255, 255, 255, 0.72);
  --jp-border: rgba(29, 29, 31, 0.10);
  --jp-shadow: 0 24px 60px rgba(0, 0, 0, 0.14);
  --jp-accent: #1677ff;
  --jp-accent-2: #7c3aed;
}

.page {
  height: calc(100vh - 56px);
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--jp-home-bg);
  color: var(--jp-home-fg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.side-nav {
  position: fixed;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 8px;
  pointer-events: auto;
}

.side-nav-item {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
}

.side-nav-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.35);
  border: 1px solid rgba(127, 127, 127, 0.22);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.side-nav-text {
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.18s ease, transform 0.18s ease, color 0.18s ease, background 0.18s ease;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--jp-home-muted);
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  white-space: nowrap;
}

.side-nav-item:hover .side-nav-text,
.side-nav-item.active .side-nav-text {
  opacity: 1;
  transform: translateX(0);
}
.side-nav-item:hover .side-nav-text {
  color: var(--jp-home-fg);
  background: rgba(127, 127, 127, 0.12);
  border-color: rgba(127, 127, 127, 0.18);
}
.side-nav-item.active .side-nav-text {
  color: var(--jp-home-fg);
  background: rgba(127, 127, 127, 0.14);
  border-color: rgba(127, 127, 127, 0.22);
}
.side-nav-item.active .side-nav-dot {
  background: var(--jp-accent);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 6px rgba(77, 163, 255, 0.14);
  transform: scale(1.08);
}
.side-nav-item:focus-visible {
  outline: 2px solid var(--jp-accent);
  outline-offset: 3px;
  border-radius: 999px;
}

.page::-webkit-scrollbar {
  width: 10px;
}
.page::-webkit-scrollbar-thumb {
  background: rgba(127, 127, 127, 0.28);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.page::-webkit-scrollbar-track {
  background: transparent;
}

.jp-reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.jp-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.scene.jp-reveal,
.scene.jp-reveal.is-visible {
  transform: none;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 12px;
  color: var(--jp-home-muted);
  margin: 0 0 12px;
}

.hero {
  height: 150vh;
  position: relative;
  --p: var(--hero-p, 0);
}

.hero-sticky {
  position: sticky;
  top: 0;
  height: calc(100vh - 56px);
  display: grid;
  align-items: center;
  padding: 28px 20px;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--jp-home-bg);
}

.hero-bg {
  position: absolute;
  inset: -40px;
  pointer-events: none;
}
.hero-bg-svg {
  width: 100%;
  height: 100%;
  opacity: 0.92;
  transform: scale(calc(1.06 + var(--p) * 0.06));
  transition: transform 0.12s linear;
}
.road {
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 2.5;
  opacity: 0.6;
  fill: none;
}
:global(body[data-theme='light']) .road {
  stroke: rgba(29, 29, 31, 0.12);
}
.route {
  stroke: url(#jpRouteGrad);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 100;
  stroke-dashoffset: calc(100 - var(--p) * 100);
  transition: stroke-dashoffset 0.12s linear;
  filter: url(#jpSoftBlur);
  opacity: 0.9;
}
.pin {
  fill: var(--jp-home-fg);
  opacity: calc(var(--p) * 1.2);
}
.traveler {
  fill: var(--jp-accent);
  opacity: 0.9;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));
}

.hero-grid {
  position: relative;
  z-index: 1;
  width: min(1160px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 22px;
  align-items: center;
}

.hero-copy {
  transform: translateY(calc(var(--p) * -14px));
  opacity: calc(1 - var(--p) * 0.72);
  transition: transform 0.12s linear, opacity 0.12s linear;
}

.hero-title {
  font-size: clamp(44px, 6vw, 72px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 0;
}
.accent {
  color: var(--jp-accent);
}
.hero-lede {
  margin: 14px 0 0;
  max-width: 520px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--jp-home-muted);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.btn {
  border-radius: 999px;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  border: 1px solid var(--jp-border);
  color: var(--jp-home-fg);
  background: transparent;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
}
.btn.primary {
  background: var(--jp-accent);
  border-color: transparent;
  color: #fff;
}
:global(body[data-theme='dark']) .btn.primary {
  color: #081018;
  background: linear-gradient(135deg, var(--jp-accent), var(--jp-accent-2));
}
.btn.ghost:hover {
  background: rgba(127, 127, 127, 0.12);
}

.hero-metrics {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.metric {
  border-radius: 18px;
  background: rgba(127, 127, 127, 0.08);
  border: 1px solid rgba(127, 127, 127, 0.14);
  padding: 12px 12px;
}
:global(body[data-theme='light']) .metric {
  background: rgba(255, 255, 255, 0.58);
  border-color: rgba(29, 29, 31, 0.08);
}
.metric .k {
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.03em;
}
.metric .v {
  margin-top: 4px;
  font-size: 12px;
  color: var(--jp-home-muted);
}

.hero-media {
  display: grid;
  justify-items: center;
  gap: 16px;
  transform: translateY(calc(var(--p) * -24px)) scale(calc(0.94 + var(--p) * 0.06));
  transition: transform 0.12s linear;
}

.device {
  width: min(380px, 92vw);
  aspect-ratio: 10 / 18;
  border-radius: 44px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: var(--jp-shadow);
  position: relative;
}
:global(body[data-theme='light']) .device {
  background: linear-gradient(180deg, rgba(29, 29, 31, 0.08), rgba(29, 29, 31, 0.02));
  border-color: rgba(29, 29, 31, 0.08);
}
.device::before {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: 36px;
  pointer-events: none;
  background: radial-gradient(600px 280px at 30% 20%, rgba(255, 255, 255, 0.12), transparent 60%);
  opacity: 0.9;
}
.device-screen {
  border-radius: 34px;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
}

.device-top {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 3;
}
.search-pill {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  backdrop-filter: blur(14px) saturate(180%);
}
:global(body[data-theme='light']) .search-pill {
  background: rgba(255, 255, 255, 0.70);
  border-color: rgba(29, 29, 31, 0.10);
  color: rgba(29, 29, 31, 0.78);
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--jp-accent);
  box-shadow: 0 0 0 6px rgba(77, 163, 255, 0.18);
}

.device-map {
  position: absolute;
  inset: 0;
}
.mini-road {
  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 2.2;
  opacity: 0.5;
  fill: none;
}
:global(body[data-theme='light']) .mini-road {
  stroke: rgba(29, 29, 31, 0.12);
}
.mini-route {
  stroke: url(#jpDeviceRouteGrad);
  stroke-width: 6;
  stroke-linecap: round;
  fill: none;
  stroke-dasharray: 100;
  stroke-dashoffset: calc(100 - var(--p) * 100);
  transition: stroke-dashoffset 0.12s linear;
}
.mini-pin {
  fill: rgba(255, 255, 255, 0.9);
  opacity: calc(var(--p) * 1.2);
}
:global(body[data-theme='light']) .mini-pin {
  fill: rgba(29, 29, 31, 0.85);
}
.mini-traveler {
  fill: var(--jp-accent);
  opacity: 0.95;
}

.device-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  border-radius: 22px;
  padding: 10px 10px 9px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.14));
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(18px) saturate(180%);
  z-index: 3;
}
:global(body[data-theme='light']) .device-sheet {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.78));
  border-color: rgba(29, 29, 31, 0.10);
}
.sheet-title {
  font-weight: 800;
  letter-spacing: -0.01em;
  font-size: 12px;
  opacity: 0.92;
}
.sheet-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: center;
}
.sheet-ic {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 900;
  font-size: 12px;
}
:global(body[data-theme='light']) .sheet-ic {
  background: rgba(29, 29, 31, 0.06);
}
.sheet-name {
  font-weight: 800;
  font-size: 12px;
}
.sheet-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--jp-home-muted);
}
.sheet-score {
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  font-size: 12px;
  opacity: 0.9;
  padding-left: 10px;
}

.demo {
  width: min(380px, 92vw);
  border-radius: 20px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  padding: 12px 12px 10px;
  box-sizing: border-box;
  backdrop-filter: blur(18px) saturate(180%);
}
.demo-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.demo-range {
  width: 100%;
  margin-top: 10px;
  accent-color: var(--jp-accent);
}
.demo-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--jp-home-muted);
}

.hero-scroll {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  gap: 8px;
  opacity: calc(1 - var(--p) * 1.2);
  transition: opacity 0.12s linear;
}
.scroll-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--jp-home-fg);
  opacity: 0.55;
  animation: jp-bounce 1.8s ease-in-out infinite;
}
.scroll-text {
  font-size: 12px;
  color: var(--jp-home-muted);
}
@keyframes jp-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.scene {
  position: relative;
  --p: var(--p, 0);
}
.scene-sticky {
  position: sticky;
  top: 0;
  height: calc(100vh - 56px);
  padding: 64px 22px;
  box-sizing: border-box;
  display: grid;
  align-content: start;
  overflow: hidden;
  isolation: isolate;
  background: var(--jp-home-bg);
}

.scene-props {
  height: 130vh;
}
.scene-tiles {
  height: 140vh;
}
.scene-showcase {
  height: 150vh;
}

.scene-props .scene-sticky {
  z-index: 30;
  opacity: calc(1 - clamp(0, (var(--p) - 0.88) * 8, 1));
  transition: opacity 0.12s linear;
}
.scene-tiles .scene-sticky {
  z-index: 25;
  opacity: calc(1 - clamp(0, (var(--p) - 0.88) * 8, 1));
  transition: opacity 0.12s linear;
}
.scene-showcase .scene-sticky {
  z-index: 20;
  opacity: calc(1 - clamp(0, (var(--p) - 0.88) * 8, 1));
  transition: opacity 0.12s linear;
}

.scene-props .props {
  transform: translateY(calc((0.5 - var(--p)) * 48px));
  transition: transform 0.12s linear;
  will-change: transform;
}

.scene-tiles .section-inner {
  transform: translateY(calc((0.5 - var(--p)) * 46px));
  transition: transform 0.12s linear;
  will-change: transform;
}
.scene-tiles .tiles-grid {
  transform: scale(calc(0.98 + var(--p) * 0.02));
  transform-origin: top center;
  transition: transform 0.12s linear;
  will-change: transform;
}

.scene-showcase .section-inner {
  transform: translateY(calc((0.5 - var(--p)) * 44px));
  transition: transform 0.12s linear;
  will-change: transform;
}
.scene-showcase .showcase-grid {
  transform: scale(calc(0.985 + var(--p) * 0.015));
  transform-origin: top center;
  transition: transform 0.12s linear;
  will-change: transform;
}

.section {
  padding: 64px 22px;
}
.section-inner {
  width: min(1160px, 100%);
  margin: 0 auto;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.section-title {
  font-size: clamp(28px, 3.5vw, 44px);
  letter-spacing: -0.02em;
  margin: 0;
}
.section-sub {
  margin: 10px 0 0;
  max-width: 720px;
  color: var(--jp-home-muted);
  line-height: 1.6;
}

.props {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 26px;
}
.card {
  border-radius: 28px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  backdrop-filter: blur(18px) saturate(180%);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
}
.prop {
  padding: 22px;
}
.prop-ic {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: var(--jp-accent);
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  font-variant-numeric: tabular-nums;
}
.prop-title {
  margin: 14px 0 0;
  font-size: 16px;
  letter-spacing: -0.01em;
}
.prop-desc {
  margin: 10px 0 0;
  color: var(--jp-home-muted);
  line-height: 1.6;
  font-size: 13px;
}

.tiles-grid {
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.tile {
  position: relative;
  padding: 20px;
  overflow: hidden;
  display: grid;
  gap: 16px;
  align-content: start;
  min-height: 210px;
  border-radius: 32px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  backdrop-filter: blur(18px) saturate(180%);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.tile::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: radial-gradient(700px 300px at 20% 0%, rgba(77, 163, 255, 0.22), transparent 60%),
    radial-gradient(520px 260px at 85% 25%, rgba(167, 139, 250, 0.18), transparent 60%);
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}
.tile:hover {
  transform: translateY(-3px);
  border-color: rgba(127, 127, 127, 0.22);
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.14);
}
.tile:hover::before {
  opacity: 1;
}
.tile-wide {
  grid-column: span 1;
}
.tile.link {
  text-decoration: none;
  color: inherit;
}
.tile-copy {
  position: relative;
  z-index: 1;
}
.tile-eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.tile-title {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.tile-desc {
  margin-top: 10px;
  color: var(--jp-home-muted);
  line-height: 1.6;
  font-size: 13px;
}
.tile-cta {
  margin-top: 16px;
  font-weight: 900;
  color: var(--jp-accent);
}
.tile-media {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.mini-card {
  border-radius: 18px;
  padding: 10px 12px;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  min-width: 92px;
}
:global(body[data-theme='light']) .mini-card {
  background: rgba(255, 255, 255, 0.70);
  border-color: rgba(29, 29, 31, 0.08);
}
.mini-k {
  font-size: 11px;
  color: var(--jp-home-muted);
  font-weight: 800;
}
.mini-v {
  margin-top: 6px;
  font-weight: 900;
  letter-spacing: -0.01em;
}
.bubble {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  font-weight: 800;
  font-size: 12px;
}
.bars {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 260px;
}
.bar {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 10px;
  align-items: center;
}
.bar-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--jp-home-muted);
}
.bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.16);
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  width: calc(var(--w, 0.5) * 100%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--jp-accent), var(--jp-accent-2));
}

.showcase-grid {
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.flip-card {
  width: 100%;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 32px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.12);
  perspective: 1200px;
  min-height: 280px;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.flip-card:hover {
  transform: translateY(-2px);
  border-color: rgba(127, 127, 127, 0.22);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.16);
}
.flip-card:active {
  transform: translateY(0);
}
.flip-card:focus-visible {
  outline: 2px solid var(--jp-accent);
  outline-offset: 4px;
}
.flip-inner {
  height: 100%;
  border-radius: inherit;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.flip-card.flipped .flip-inner {
  transform: rotateY(180deg);
}
.flip-face {
  position: absolute;
  inset: 0;
  padding: 26px;
  box-sizing: border-box;
  border-radius: inherit;
  backface-visibility: hidden;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow: hidden;
}
.flip-face::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(700px 320px at 20% 0%, rgba(77, 163, 255, 0.22), transparent 60%),
    radial-gradient(520px 260px at 90% 20%, rgba(167, 139, 250, 0.18), transparent 60%);
  opacity: 0.9;
  pointer-events: none;
}
.flip-face > * {
  position: relative;
  z-index: 1;
}
.flip-face.back {
  transform: rotateY(180deg);
}
.flip-eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 900;
  font-size: 12px;
  color: var(--jp-home-muted);
}
.flip-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.flip-desc {
  color: var(--jp-home-muted);
  line-height: 1.65;
  font-size: 13px;
  max-width: 44ch;
}
.flip-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.pill {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  font-weight: 900;
  font-size: 12px;
}
.showcase-note {
  margin-top: 18px;
  color: var(--jp-home-muted);
  font-size: 12px;
}

.link-more {
  text-decoration: none;
  color: var(--jp-accent);
  font-weight: 900;
}

.spotlight-rail {
  margin-top: 18px;
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 10px;
  scroll-snap-type: x mandatory;
}
.spotlight-rail::-webkit-scrollbar {
  height: 10px;
}
.spotlight-card {
  width: min(310px, 78vw);
  flex: 0 0 auto;
  scroll-snap-align: start;
  border-radius: 26px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}
.spotlight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.14);
}
.spotlight-cover {
  height: 168px;
  background: rgba(127, 127, 127, 0.12);
  display: grid;
  place-items: center;
}
.spotlight-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.spotlight-body {
  padding: 14px 14px 16px;
}
.spotlight-title {
  font-weight: 900;
  letter-spacing: -0.01em;
  font-size: 14px;
  line-height: 1.35;
}
.spotlight-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--jp-home-muted);
  font-size: 12px;
}
.spotlight-stats {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--jp-home-muted);
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stat-ic {
  font-size: 14px;
}
.spotlight-empty {
  color: var(--jp-home-muted);
  font-weight: 800;
}
.skeleton {
  background: linear-gradient(90deg, rgba(127, 127, 127, 0.12), rgba(127, 127, 127, 0.22), rgba(127, 127, 127, 0.12));
  background-size: 200% 100%;
  animation: jp-shimmer 1.2s ease-in-out infinite;
}
@keyframes jp-shimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: -200% 0%;
  }
}

.spotlight-empty.card {
  padding: 22px;
  margin-top: 18px;
}
.spotlight-empty-title {
  font-weight: 900;
}
.spotlight-empty-sub {
  margin-top: 8px;
  color: var(--jp-home-muted);
}

.flow-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.flow-card {
  padding: 18px;
  display: grid;
  align-content: start;
  gap: 10px;
}
.flow-num {
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: var(--jp-accent);
  font-variant-numeric: tabular-nums;
}
.flow-title {
  font-weight: 900;
  letter-spacing: -0.01em;
}
.flow-desc {
  color: var(--jp-home-muted);
  line-height: 1.6;
  font-size: 13px;
  max-width: 70ch;
}

.faq-list {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}
.faq-item {
  border-radius: 22px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  padding: 2px 18px;
}
.faq-item summary {
  list-style: none;
  cursor: pointer;
  padding: 16px 0;
  font-weight: 900;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.faq-item summary::-webkit-details-marker {
  display: none;
}
.faq-item summary::after {
  content: '>';
  font-size: 18px;
  color: var(--jp-home-muted);
  transform: rotate(0deg);
  transition: transform 0.2s ease, color 0.2s ease;
}
.faq-item[open] summary::after {
  transform: rotate(90deg);
  color: var(--jp-accent);
}
.faq-body {
  padding: 0 0 16px;
  color: var(--jp-home-muted);
  line-height: 1.6;
  font-size: 13px;
  max-width: 90ch;
}

.cta-card {
  padding: 28px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  align-items: center;
}
.cta-media {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.cta-chip {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid rgba(127, 127, 127, 0.16);
  font-weight: 900;
  font-size: 12px;
}

.footer {
  padding: 46px 22px 64px;
  border-top: 1px solid var(--jp-border);
  background: rgba(0, 0, 0, 0.12);
}
:global(body[data-theme='light']) .footer {
  background: rgba(255, 255, 255, 0.55);
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-logo {
  font-weight: 900;
  letter-spacing: -0.01em;
}
.footer-sub {
  margin-top: 6px;
  color: var(--jp-home-muted);
  font-size: 12px;
}
.footer-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.footer-link {
  text-decoration: none;
  color: var(--jp-home-muted);
  font-weight: 900;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 999px;
  transition: background 0.2s ease, color 0.2s ease;
}
.footer-link:hover {
  background: rgba(127, 127, 127, 0.12);
  color: var(--jp-home-fg);
}

@media (max-width: 980px) {
  .side-nav {
    display: none;
  }
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .hero-copy {
    opacity: 1;
  }
  .hero-metrics {
    grid-template-columns: 1fr;
  }
  .scene {
    height: auto !important;
  }
  .scene-sticky {
    position: relative;
    height: auto;
    padding: 56px 18px;
  }
  .scene-props .props,
  .scene-tiles .section-inner,
  .scene-tiles .tiles-grid,
  .scene-showcase .section-inner,
  .scene-showcase .showcase-grid {
    transform: none !important;
  }
  .props {
    grid-template-columns: 1fr;
  }
  .tiles-grid {
    grid-template-columns: 1fr;
  }
  .showcase-grid {
    grid-template-columns: 1fr;
  }
  .flow-grid {
    grid-template-columns: 1fr;
  }
  .cta-card {
    grid-template-columns: 1fr;
  }
  .cta-media {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jp-reveal {
    transition: none;
  }
  .hero-bg-svg,
  .hero-copy,
  .hero-media,
  .route,
  .mini-route,
  .scene-props .props,
  .scene-tiles .section-inner,
  .scene-tiles .tiles-grid,
  .scene-showcase .section-inner,
  .scene-showcase .showcase-grid,
  .flip-inner,
  .scroll-dot {
    transition: none !important;
    animation: none !important;
  }
  .scene-props .props,
  .scene-tiles .section-inner,
  .scene-tiles .tiles-grid,
  .scene-showcase .section-inner,
  .scene-showcase .showcase-grid {
    transform: none !important;
  }
}
</style>
