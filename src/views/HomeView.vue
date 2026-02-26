<template>
  <div class="page" ref="pageEl" @scroll.passive="onScroll">
    <nav
      class="side-nav"
      aria-label="On this page"
      :style="{ '--nav-progress': String(pageProgress), '--active-idx': String(activeNavIndex) }"
    >
      <div class="side-nav-top" aria-hidden="true">
        <span class="side-nav-kicker">JourneyPro</span>
      </div>
      <div class="side-nav-track" aria-hidden="true">
        <span class="side-nav-track-fill"></span>
      </div>
      <button
        v-for="(item, idx) in navItems"
        :key="item.key"
        type="button"
        class="side-nav-item"
        :class="{ active: activeAnchor === item.key }"
        :aria-current="activeAnchor === item.key ? 'page' : null"
        @click="scrollToAnchor(item.key)"
      >
        <span class="side-nav-item-no" aria-hidden="true">{{ String(idx + 1).padStart(2, '0') }}</span>
        <span class="side-nav-item-label">{{ item.label }}</span>
        <span class="side-nav-item-chevron" aria-hidden="true">↗</span>
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
            <div class="hero-status-row">
              <span class="hero-status-pill online">AI Engine Online</span>
              <span class="hero-status-pill">Realtime Ranking</span>
              <span class="hero-status-pill">Route-aware</span>
            </div>
            <p class="eyebrow">JourneyPro</p>
            <h1 class="hero-title">
              Smart travel,
              <span class="accent">rendered live</span>.
            </h1>
            <p class="hero-lede">
              Tech-driven POI recommendations that blend preference signals with route proximity, so every stop feels
              both personal and practical.
            </p>

            <div class="hero-actions">
              <RouterLink class="btn primary" to="/map">Open Map</RouterLink>
              <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
              <template v-if="!auth.user">
                <RouterLink class="btn ghost" to="/login">Login</RouterLink>
              </template>
            </div>

            <div class="hero-command">
              <span class="cmd-key">/</span>
              <span class="cmd-text">Set destination, tune weight, and get ranked stops instantly.</span>
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
            <div class="hero-orbit" aria-hidden="true"></div>
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

    <section class="section smart-center jp-reveal" id="intel" ref="intelEl">
      <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">Intelligence center.</h2>
          <p class="section-sub">A compact command hub for faster planning and clearer system feedback.</p>
          <div class="section-flair">
            <span class="flair-chip">Smart ranking</span>
            <span class="flair-chip">Realtime route context</span>
            <span class="flair-chip">Low-latency feedback</span>
          </div>
        </div>

        <div class="smart-grid">
          <article class="smart-card card smart-core">
            <p class="smart-eyebrow">Adaptive model</p>
            <h3 class="smart-title">Preference x distance balance</h3>
            <p class="smart-desc">
              The ranking engine keeps all candidate POIs visible and only adjusts order by your chosen preference
              ratio.
            </p>
            <div class="smart-ring-row">
              <div class="smart-ring" :style="{ '--ring-p': String(demoInterestPct / 100) }">
                <div class="smart-ring-inner">
                  <div class="smart-ring-k">{{ demoInterestPct }}%</div>
                  <div class="smart-ring-v">Interest</div>
                </div>
              </div>
              <div class="smart-ring-copy">
                <div class="smart-chip">Distance {{ demoDistancePct }}%</div>
                <div class="smart-chip">Interest {{ demoInterestPct }}%</div>
              </div>
            </div>
          </article>

          <article class="smart-card card smart-actions">
            <p class="smart-eyebrow">Quick actions</p>
            <h3 class="smart-title">Go from idea to route in seconds</h3>
            <div class="smart-action-list">
              <RouterLink class="smart-action-btn" to="/map">Open route planner</RouterLink>
              <RouterLink class="smart-action-btn" to="/posts">Browse community feed</RouterLink>
              <RouterLink class="smart-action-btn" :to="profileLink">Check profile interests</RouterLink>
              <RouterLink class="smart-action-btn" to="/notifications">Review notifications</RouterLink>
            </div>
          </article>

          <article class="smart-card card smart-metrics">
            <p class="smart-eyebrow">Live status</p>
            <h3 class="smart-title">System telemetry</h3>
            <div class="telemetry-list">
              <div class="telemetry-item" v-for="item in intelligenceStats" :key="item.k">
                <div class="telemetry-k">{{ item.k }}</div>
                <div class="telemetry-v">{{ item.v }}</div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="scene scene-props jp-reveal" id="props" ref="propsEl" :style="propsVars">
      <div class="scene-sticky">
        <div class="section-inner">
        <h2 class="section-title">Three things, done beautifully.</h2>
        <p class="section-sub">
          Big typography, clean cards, and
          <span class="glow-word">subtle motion</span>
          &mdash; inspired by Apple-style product pages.
        </p>
        <div class="section-flair">
          <span class="flair-chip">Plan</span>
          <span class="flair-chip">Discover</span>
          <span class="flair-chip">Share</span>
          <span class="flair-chip">Personalize</span>
        </div>
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
          <p class="section-sub">
            A homepage that feels calm, premium, and
            <span class="glow-word">intelligently alive</span>.
          </p>
          <div class="section-flair">
            <span class="flair-chip">Fast map flow</span>
            <span class="flair-chip">Adaptive cards</span>
            <span class="flair-chip">Context actions</span>
          </div>
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
            <p class="section-sub">
              Click a card &mdash; it flips to reveal what's underneath, with
              <span class="glow-word">micro-interaction feedback</span>.
            </p>
            <div class="section-flair">
              <span class="flair-chip">Click-to-flip</span>
              <span class="flair-chip">Motion hierarchy</span>
              <span class="flair-chip">Visual depth</span>
            </div>
          </div>

          <div class="showcase-shell card">
            <div class="showcase-shell-head">
              <div class="showcase-kpis">
                <div class="showcase-kpi">
                  <span class="k">Interaction</span>
                  <span class="v">Click Flip</span>
                </div>
                <div class="showcase-kpi">
                  <span class="k">Depth</span>
                  <span class="v">Front / Back</span>
                </div>
                <div class="showcase-kpi">
                  <span class="k">Feedback</span>
                  <span class="v">Instant</span>
                </div>
              </div>
              <div class="showcase-lab-tag">Interaction Lab</div>
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
              Tip: scroll drives the scene, click drives the flip.
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section flow jp-reveal" id="flow" ref="flowEl">
      <div class="section-inner">
        <div class="section-head">
          <h2 class="section-title">From idea to itinerary.</h2>
          <p class="section-sub">
            A simple workflow built into JourneyPro, from discovery to sharing with
            <span class="glow-word">decision-ready guidance</span>.
          </p>
          <div class="section-flair">
            <span class="flair-chip">Discover</span>
            <span class="flair-chip">Plan</span>
            <span class="flair-chip">Tune</span>
            <span class="flair-chip">Share</span>
          </div>
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
          <div>
            <h2 class="section-title">Community spotlight.</h2>
            <p class="section-sub spotlight-sub">Curated posts with strong engagement and practical route value.</p>
          </div>
          <RouterLink class="link-more spotlight-link-more" to="/posts">Browse all &rarr;</RouterLink>
        </div>
        <div class="spotlight-toolbar">
          <span class="spotlight-chip">Trending now</span>
          <span class="spotlight-chip">Quality photos</span>
          <span class="spotlight-chip">Route-linked stories</span>
        </div>

        <div v-if="spotlightError" class="spotlight-empty card">
          <div class="spotlight-empty-title">Community is offline</div>
          <div class="spotlight-empty-sub">Start the API server to load trending posts.</div>
        </div>

        <div v-else class="spotlight-rail" :class="{ loading: spotlightLoading }">
          <div v-if="spotlightLoading" v-for="n in 3" :key="n" class="spotlight-card skeleton" />

          <RouterLink
            v-else
            v-for="(p, idx) in spotlightTopPosts"
            :key="p.id"
            :to="`/posts/postsid=${p.id}`"
            class="spotlight-card link"
          >
            <div class="spotlight-cover" :class="{ empty: !coverOf(p) }">
              <div class="spotlight-rank">#{{ idx + 1 }}</div>
              <div class="spotlight-hot-tag">Hot</div>
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
              <div class="spotlight-cta">Open story &rarr;</div>
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
            <p class="eyebrow">Launch</p>
            <h2 class="section-title">Start your next trip.</h2>
            <p class="section-sub cta-sub">Map a route, tune recommendations, and collect places you'll love.</p>
            <div class="cta-actions">
              <RouterLink class="btn primary" to="/map">Open Map</RouterLink>
              <RouterLink class="btn ghost" to="/posts">Community</RouterLink>
            </div>
            <div class="cta-mini-kpis">
              <div class="cta-mini-item">
                <span class="k">Step 01</span>
                <span class="v">Set route</span>
              </div>
              <div class="cta-mini-item">
                <span class="k">Step 02</span>
                <span class="v">Tune ranking</span>
              </div>
              <div class="cta-mini-item">
                <span class="k">Step 03</span>
                <span class="v">Save and share</span>
              </div>
            </div>
          </div>
          <div class="cta-media">
            <div class="cta-panel">
              <div class="cta-panel-head">Launch checklist</div>
              <div class="cta-step">
                <span class="dot"></span>
                <span>Choose destination and route</span>
              </div>
              <div class="cta-step">
                <span class="dot"></span>
                <span>Adjust interest vs distance</span>
              </div>
              <div class="cta-step">
                <span class="dot"></span>
                <span>Review recommended stops</span>
              </div>
              <div class="cta-step">
                <span class="dot"></span>
                <span>Publish highlights to community</span>
              </div>
            </div>
            <div class="cta-chip-row">
              <div class="cta-chip">Live routing</div>
              <div class="cta-chip">POI discovery</div>
              <div class="cta-chip">Interest profile</div>
            </div>
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
import { apiUrl } from '../config/api'

const auth = useAuthStore()

const API_POSTS = apiUrl('/api/posts')
const SPOTLIGHT_CACHE_KEY = 'jp_home_spotlight_v1'
const SPOTLIGHT_CACHE_TTL_MS = 3 * 60 * 1000

const pageEl = ref(null)
const heroEl = ref(null)
const propsEl = ref(null)
const tilesEl = ref(null)
const showcaseEl = ref(null)
const flowEl = ref(null)
const intelEl = ref(null)
const spotlightEl = ref(null)
const faqEl = ref(null)
const ctaEl = ref(null)

const heroProgress = ref(0)
const propsProgress = ref(0)
const tilesProgress = ref(0)
const showcaseProgress = ref(0)
const pageProgress = ref(0)

let rafId = 0

const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

const navItems = [
  { key: 'hero', label: 'Overview' },
  { key: 'intel', label: 'Intelligence' },
  { key: 'props', label: 'Pillars' },
  { key: 'explore', label: 'Explore' },
  { key: 'showcase', label: 'Showcase' },
  { key: 'flow', label: 'Flow' },
  { key: 'spotlight', label: 'Spotlight' },
  { key: 'faq', label: 'FAQ' },
  { key: 'start', label: 'Start' },
]
const activeAnchor = ref('hero')
const activeNavIndex = computed(() => {
  const idx = navItems.findIndex((item) => item.key === activeAnchor.value)
  return idx < 0 ? 0 : idx
})

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
    intel: intelEl,
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
  const maxScroll = Math.max(1, page.scrollHeight - page.clientHeight)
  pageProgress.value = clamp(page.scrollTop / maxScroll, 0, 1)
  heroProgress.value = progressFor(page, heroEl.value)
  propsProgress.value = progressFor(page, propsEl.value)
  tilesProgress.value = progressFor(page, tilesEl.value)
  showcaseProgress.value = progressFor(page, showcaseEl.value)

  const cursor = page.scrollTop + page.clientHeight * 0.38
  const anchors = navItems
    .map((item) => {
      const el = anchorElByKey(item.key)
      return el ? { key: item.key, top: topInPage(page, el) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top)

  let current = anchors[0]?.key || 'hero'
  for (let i = anchors.length - 1; i >= 0; i -= 1) {
    if (cursor >= anchors[i].top - 14) {
      current = anchors[i].key
      break
    }
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
  activeAnchor.value = key
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
const spotlightTopPosts = computed(() => (Array.isArray(spotlightPosts.value) ? spotlightPosts.value.slice(0, 3) : []))

const intelligenceStats = computed(() => [
  { k: 'Ranking strategy', v: `Interest ${demoInterestPct.value}% / Distance ${demoDistancePct.value}%` },
  { k: 'Community status', v: spotlightLoading.value ? 'Syncing posts...' : `${spotlightPosts.value.length} spotlight cards` },
  { k: 'Profile mode', v: auth.user?.id ? 'Signed in & synced' : 'Guest (local fallback)' },
  { k: 'Engine target', v: 'Low latency, route-first ranking' },
])

const coverOf = (post) => post?.cover_image || (Array.isArray(post?.images) ? post.images[0] : '')

const readSpotlightCache = () => {
  try {
    const raw = sessionStorage.getItem(SPOTLIGHT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const ts = Number(parsed?.ts || 0)
    if (!Number.isFinite(ts) || Date.now() - ts > SPOTLIGHT_CACHE_TTL_MS) return null
    if (!Array.isArray(parsed?.data)) return null
    return parsed.data
  } catch {
    return null
  }
}

const writeSpotlightCache = (list) => {
  try {
    sessionStorage.setItem(
      SPOTLIGHT_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data: Array.isArray(list) ? list : [],
      })
    )
  } catch {
    // ignore cache failures
  }
}

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
  const cached = readSpotlightCache()
  if (cached && cached.length) {
    spotlightPosts.value = cached
    spotlightLoading.value = false
  }
  try {
    const res = await axios.get(API_POSTS, {
      params: { limit: 6, offset: 0, sort: 'hot', compact: 1, lite: 1, feed_lite: 1 },
    })
    spotlightPosts.value = res.data?.data || []
    writeSpotlightCache(spotlightPosts.value)
  } catch (e) {
    if (!cached || !cached.length) spotlightError.value = 'offline'
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
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap');

:global(body[data-theme='dark']) {
  --jp-home-bg: radial-gradient(1200px 900px at 14% -10%, rgba(0, 133, 255, 0.30), transparent 60%),
    radial-gradient(900px 700px at 95% 8%, rgba(15, 216, 186, 0.18), transparent 56%),
    linear-gradient(180deg, #04070d 0%, #05090f 45%, #04060a 100%);
  --jp-home-fg: #f5f5f7;
  --jp-home-muted: rgba(230, 236, 247, 0.74);
  --jp-surface: linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  --jp-border: rgba(168, 204, 255, 0.24);
  --jp-shadow: 0 30px 96px rgba(0, 0, 0, 0.58);
  --jp-accent: #3ea7ff;
  --jp-accent-2: #11d6b8;
  --jp-grid-line: rgba(141, 177, 230, 0.14);
  --jp-grid-glow: rgba(62, 167, 255, 0.24);
}

:global(body[data-theme='light']) {
  --jp-home-bg: radial-gradient(1200px 900px at 16% -14%, rgba(60, 145, 255, 0.20), transparent 60%),
    radial-gradient(900px 700px at 88% 4%, rgba(17, 214, 184, 0.14), transparent 54%),
    linear-gradient(180deg, #eef4ff 0%, #f5f8ff 44%, #f4f7fb 100%);
  --jp-home-fg: #141b2a;
  --jp-home-muted: rgba(20, 27, 42, 0.70);
  --jp-surface: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.66));
  --jp-border: rgba(49, 100, 170, 0.18);
  --jp-shadow: 0 26px 64px rgba(36, 63, 99, 0.18);
  --jp-accent: #0076ff;
  --jp-accent-2: #09c8ad;
  --jp-grid-line: rgba(26, 73, 139, 0.10);
  --jp-grid-glow: rgba(9, 200, 173, 0.18);
}

.page {
  height: calc(100vh - 56px);
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--jp-home-bg);
  color: var(--jp-home-fg);
  font-family: 'Manrope', 'Segoe UI', sans-serif;
  position: relative;
}

.page::before,
.page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.page::before {
  background:
    repeating-linear-gradient(90deg, var(--jp-grid-line) 0 1px, transparent 1px 86px),
    repeating-linear-gradient(0deg, var(--jp-grid-line) 0 1px, transparent 1px 86px);
  opacity: 0.30;
}

.page::after {
  background:
    radial-gradient(900px 340px at 20% 0%, var(--jp-grid-glow), transparent 70%),
    radial-gradient(840px 280px at 88% 100%, rgba(17, 214, 184, 0.16), transparent 72%);
  animation: jp-grid-drift 14s ease-in-out infinite alternate;
}

.page > * {
  position: relative;
  z-index: 1;
}

.side-nav {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 178px;
  padding: 10px 8px 10px 11px;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 86%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--jp-surface) 94%, transparent), color-mix(in srgb, var(--jp-surface) 78%, transparent));
  box-shadow: 0 20px 52px rgba(6, 18, 40, 0.34);
  backdrop-filter: blur(20px) saturate(190%);
  -webkit-backdrop-filter: blur(20px) saturate(190%);
  pointer-events: auto;
  overflow: hidden;
}

.side-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(400px 130px at 10% -12%, color-mix(in srgb, var(--jp-accent) 26%, transparent), transparent 70%),
    radial-gradient(320px 120px at 110% 120%, color-mix(in srgb, var(--jp-accent-2) 22%, transparent), transparent 74%);
  opacity: 0.84;
}

.side-nav-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin: 0 2px 7px 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--jp-border) 82%, transparent);
}

.side-nav-kicker {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--jp-home-muted) 88%, transparent);
}

.side-nav-track {
  position: absolute;
  left: 20px;
  top: 52px;
  bottom: 16px;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--jp-border) 72%, transparent);
  z-index: 0;
}

.side-nav-track-fill {
  display: block;
  width: 100%;
  height: calc(var(--nav-progress, 0) * 100% + 8px);
  border-radius: inherit;
  background: linear-gradient(180deg, var(--jp-accent), var(--jp-accent-2));
  box-shadow: 0 0 16px color-mix(in srgb, var(--jp-accent) 48%, transparent);
  transition: height 0.18s linear;
}

.side-nav-item {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  padding: 8px 8px 8px 7px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  position: relative;
  border-radius: 14px;
  color: var(--jp-home-muted);
  min-height: 36px;
  z-index: 1;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.side-nav-item::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  width: 4px;
  height: 0;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--jp-accent), var(--jp-accent-2));
  box-shadow: 0 0 16px color-mix(in srgb, var(--jp-accent) 42%, transparent);
  transition: height 0.2s ease;
}

.side-nav-item-no {
  width: 26px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 82%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 82%, transparent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--jp-home-muted) 84%, transparent);
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.side-nav-item-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--jp-home-muted);
  transition: color 0.18s ease;
}

.side-nav-item-chevron {
  font-size: 12px;
  font-weight: 900;
  color: color-mix(in srgb, var(--jp-home-muted) 80%, transparent);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.18s ease, transform 0.18s ease, color 0.18s ease;
}

.side-nav-item:hover {
  transform: translateX(2px);
  border-color: color-mix(in srgb, var(--jp-border) 90%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 78%, transparent);
  box-shadow: 0 8px 18px rgba(7, 19, 42, 0.18);
}

.side-nav-item:hover .side-nav-item-label {
  color: var(--jp-home-fg);
}
.side-nav-item:hover .side-nav-item-chevron {
  opacity: 1;
  transform: translateX(0);
}

.side-nav-item.active {
  border-color: color-mix(in srgb, var(--jp-accent) 34%, var(--jp-border));
  background: linear-gradient(135deg, rgba(62, 167, 255, 0.18), rgba(9, 200, 173, 0.12));
  box-shadow: 0 10px 22px rgba(10, 35, 74, 0.26);
}
.side-nav-item.active::before {
  height: 24px;
}
.side-nav-item.active .side-nav-item-no {
  color: var(--jp-home-fg);
  border-color: color-mix(in srgb, var(--jp-accent) 46%, transparent);
  background: linear-gradient(135deg, rgba(62, 167, 255, 0.26), rgba(9, 200, 173, 0.18));
}
.side-nav-item.active .side-nav-item-label {
  color: var(--jp-home-fg);
}
.side-nav-item.active .side-nav-item-chevron {
  opacity: 1;
  transform: translateX(0);
  color: color-mix(in srgb, var(--jp-home-fg) 92%, transparent);
}
.side-nav-item:focus-visible {
  outline: 2px solid var(--jp-accent);
  outline-offset: 3px;
  border-radius: 14px;
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
  font-weight: 800;
  font-size: 12px;
  color: var(--jp-home-muted);
  margin: 0 0 12px;
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
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
  gap: 26px;
  align-items: center;
}

.hero-copy {
  transform: translateY(calc(var(--p) * -14px));
  opacity: calc(1 - var(--p) * 0.72);
  transition: transform 0.12s linear, opacity 0.12s linear;
}

.hero-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.hero-status-pill {
  border-radius: 999px;
  border: 1px solid var(--jp-border);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
  background: rgba(127, 127, 127, 0.12);
  backdrop-filter: blur(12px) saturate(170%);
}

.hero-status-pill.online {
  color: #e4fff9;
  background: linear-gradient(135deg, rgba(0, 118, 255, 0.40), rgba(9, 200, 173, 0.30));
  border-color: rgba(62, 167, 255, 0.54);
  box-shadow: 0 0 0 4px rgba(0, 118, 255, 0.12);
}
:global(body[data-theme='light']) .hero-status-pill.online {
  color: #104364;
}

.hero-title {
  font-size: clamp(44px, 6vw, 72px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 0;
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
  text-wrap: balance;
}
.accent {
  color: var(--jp-accent);
  text-shadow: 0 0 26px rgba(0, 118, 255, 0.30);
}
.hero-lede {
  margin: 14px 0 0;
  max-width: 560px;
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
  padding: 12px 17px;
  font-weight: 800;
  font-size: 14px;
  text-decoration: none;
  border: 1px solid var(--jp-border);
  color: var(--jp-home-fg);
  background: rgba(127, 127, 127, 0.08);
  transition: transform 0.18s ease, background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  backdrop-filter: blur(12px) saturate(170%);
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}
.btn.primary {
  background: linear-gradient(135deg, var(--jp-accent), var(--jp-accent-2));
  border-color: transparent;
  color: #f5ffff;
}
:global(body[data-theme='dark']) .btn.primary {
  color: #0a1416;
}
.btn.ghost:hover {
  background: rgba(127, 127, 127, 0.16);
}

.hero-command {
  margin-top: 14px;
  width: fit-content;
  max-width: min(580px, 100%);
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--jp-border);
  border-radius: 14px;
  padding: 9px 11px;
  background: rgba(127, 127, 127, 0.10);
  color: var(--jp-home-muted);
  backdrop-filter: blur(12px) saturate(180%);
}

.cmd-key {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(62, 167, 255, 0.32), rgba(9, 200, 173, 0.26));
  color: var(--jp-home-fg);
  font-size: 13px;
  font-weight: 900;
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
}

.cmd-text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.hero-metrics {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.metric {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(127, 127, 127, 0.16), rgba(127, 127, 127, 0.08));
  border: 1px solid rgba(127, 127, 127, 0.22);
  padding: 12px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
:global(body[data-theme='light']) .metric {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  border-color: rgba(26, 73, 139, 0.14);
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
  position: relative;
  display: grid;
  justify-items: center;
  gap: 16px;
  transform: translateY(calc(var(--p) * -24px)) scale(calc(0.94 + var(--p) * 0.06));
  transition: transform 0.12s linear;
}

.hero-orbit {
  position: absolute;
  top: 8px;
  right: 20px;
  width: 190px;
  height: 190px;
  border-radius: 999px;
  border: 1px solid rgba(62, 167, 255, 0.28);
  background:
    radial-gradient(circle at 50% 50%, rgba(62, 167, 255, 0.24), transparent 62%),
    conic-gradient(from 180deg, rgba(62, 167, 255, 0.0), rgba(62, 167, 255, 0.56), rgba(9, 200, 173, 0.24), rgba(62, 167, 255, 0.0));
  filter: blur(0.2px);
  opacity: 0.8;
  animation: jp-orbit 12s linear infinite;
  pointer-events: none;
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

@keyframes jp-grid-drift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(0, -22px, 0);
  }
}

@keyframes jp-orbit {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes jp-chip-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
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
  padding: 72px 22px;
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
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
}
.section-sub {
  margin: 10px 0 0;
  max-width: 720px;
  color: var(--jp-home-muted);
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 84%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 78%, transparent);
  backdrop-filter: blur(10px) saturate(160%);
}

.section-flair {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flair-chip {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 92%, transparent);
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
  background: color-mix(in srgb, var(--jp-surface) 84%, transparent);
  animation: jp-chip-float 3.4s ease-in-out infinite;
}
.flair-chip:nth-child(2n) {
  animation-delay: 0.35s;
}
.flair-chip:nth-child(3n) {
  animation-delay: 0.7s;
}

.glow-word {
  color: var(--jp-home-fg);
  text-shadow: 0 0 14px color-mix(in srgb, var(--jp-accent) 38%, transparent);
  font-weight: 800;
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
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.13);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(500px 200px at -8% -4%, rgba(62, 167, 255, 0.26), transparent 70%),
    radial-gradient(430px 190px at 108% 6%, rgba(9, 200, 173, 0.20), transparent 72%);
  opacity: 0.68;
}
.card > * {
  position: relative;
  z-index: 1;
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
  backdrop-filter: blur(20px) saturate(190%);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
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
  transform: translateY(-4px);
  border-color: rgba(62, 167, 255, 0.34);
  box-shadow: 0 24px 64px rgba(12, 44, 84, 0.22);
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
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.showcase-shell {
  margin-top: 18px;
  padding: 14px;
}
.showcase-shell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.showcase-kpis {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.showcase-kpi {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 88%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 84%, transparent);
  padding: 8px 10px;
  display: grid;
  gap: 3px;
  min-width: 110px;
}
.showcase-kpi .k {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.showcase-kpi .v {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.01em;
}
.showcase-lab-tag {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #eafcff;
  background: linear-gradient(135deg, rgba(62, 167, 255, 0.6), rgba(9, 200, 173, 0.42));
  border: 1px solid rgba(62, 167, 255, 0.4);
}
:global(body[data-theme='light']) .showcase-lab-tag {
  color: #0f3f5f;
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
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.16);
  perspective: 1200px;
  min-height: 280px;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.flip-card:hover {
  transform: translateY(-2px);
  border-color: rgba(62, 167, 255, 0.34);
  box-shadow: 0 26px 66px rgba(12, 44, 84, 0.24);
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
  margin-top: 14px;
  color: var(--jp-home-muted);
  font-size: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 84%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 78%, transparent);
  padding: 10px 12px;
  width: fit-content;
}

.link-more {
  text-decoration: none;
  color: var(--jp-accent);
  font-weight: 900;
}

.spotlight-sub {
  margin-top: 8px;
}
.spotlight {
  --spotlight-gap: 14px;
}
.spotlight .section-inner {
  width: min(1160px, 100%);
}
.spotlight-link-more {
  align-self: center;
}
.spotlight-toolbar {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.spotlight-chip {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 88%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 82%, transparent);
  color: var(--jp-home-muted);
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.spotlight-rail {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spotlight-gap);
  overflow: visible;
  padding: 0;
}
.spotlight-card {
  width: auto;
  min-width: 0;
  border-radius: 26px;
  background: var(--jp-surface);
  border: 1px solid var(--jp-border);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.spotlight-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.18);
  border-color: rgba(62, 167, 255, 0.36);
}
.spotlight-cover {
  position: relative;
  height: 168px;
  background: rgba(127, 127, 127, 0.12);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.spotlight-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.42));
  pointer-events: none;
}
.spotlight-rank {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 900;
  background: rgba(8, 12, 20, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #f4f8ff;
}
.spotlight-hot-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #092e25;
  background: linear-gradient(135deg, rgba(21, 228, 192, 0.92), rgba(114, 255, 227, 0.84));
  border: 1px solid rgba(17, 214, 184, 0.68);
}
.spotlight-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.28s ease;
}
.spotlight-card:hover .spotlight-img {
  transform: scale(1.05);
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
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 80%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 80%, transparent);
  padding: 5px 8px;
}
.stat-ic {
  font-size: 14px;
}
.spotlight-cta {
  margin-top: 12px;
  font-size: 12px;
  font-weight: 900;
  color: var(--jp-accent);
  letter-spacing: 0.02em;
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
.smart-center {
  padding-top: 76px;
  padding-bottom: 76px;
}
.smart-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1.05fr 1fr 1fr;
  gap: 12px;
}
.smart-card {
  padding: 20px;
  min-height: 280px;
}
.smart-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.smart-title {
  margin: 10px 0 0;
  font-size: clamp(18px, 2vw, 24px);
  letter-spacing: -0.02em;
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
}
.smart-desc {
  margin-top: 10px;
  color: var(--jp-home-muted);
  font-size: 13px;
  line-height: 1.65;
}
.smart-ring-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.smart-ring {
  --ring-p: 0.5;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  padding: 10px;
  background:
    conic-gradient(from -90deg, var(--jp-accent) 0 calc(var(--ring-p) * 1turn), rgba(127, 127, 127, 0.22) calc(var(--ring-p) * 1turn) 1turn);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}
.smart-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  display: grid;
  place-items: center;
  text-align: center;
  background: color-mix(in srgb, var(--jp-home-bg) 64%, transparent);
  border: 1px solid var(--jp-border);
}
.smart-ring-k {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
}
.smart-ring-v {
  margin-top: 4px;
  font-size: 11px;
  color: var(--jp-home-muted);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.smart-ring-copy {
  display: grid;
  gap: 10px;
}
.smart-chip {
  border-radius: 999px;
  border: 1px solid var(--jp-border);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--jp-home-muted);
  background: rgba(127, 127, 127, 0.10);
}
.smart-action-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}
.smart-action-btn {
  text-decoration: none;
  color: var(--jp-home-fg);
  border-radius: 14px;
  border: 1px solid var(--jp-border);
  padding: 12px 13px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.01em;
  background: rgba(127, 127, 127, 0.10);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.smart-action-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(62, 167, 255, 0.38);
  background: linear-gradient(135deg, rgba(62, 167, 255, 0.16), rgba(9, 200, 173, 0.14));
}
.telemetry-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}
.telemetry-item {
  border-radius: 14px;
  border: 1px solid var(--jp-border);
  padding: 10px 11px;
  background: rgba(127, 127, 127, 0.09);
}
.telemetry-k {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.telemetry-v {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.01em;
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
  padding: 30px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 22px;
  align-items: center;
}
.cta-sub {
  margin-top: 10px;
}
.cta-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.cta-mini-kpis {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cta-mini-item {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 84%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 80%, transparent);
  padding: 9px 10px;
  min-width: 116px;
  display: grid;
  gap: 4px;
}
.cta-mini-item .k {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.cta-mini-item .v {
  font-size: 12px;
  font-weight: 900;
}
.cta-media {
  display: grid;
  gap: 12px;
}
.cta-panel {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--jp-border) 90%, transparent);
  background: color-mix(in srgb, var(--jp-surface) 84%, transparent);
  padding: 12px 12px 10px;
}
.cta-panel-head {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--jp-home-muted);
}
.cta-step {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--jp-home-fg);
}
.cta-step .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--jp-accent), var(--jp-accent-2));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--jp-accent) 22%, transparent);
}
.cta-chip-row {
  display: flex;
  flex-wrap: wrap;
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

@media (max-width: 1240px) {
  .smart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .smart-core {
    grid-column: span 2;
  }
  .spotlight-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .side-nav {
    display: none;
  }
  .page::before,
  .page::after {
    opacity: 0.16;
  }
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .hero-orbit {
    display: none;
  }
  .hero-copy {
    opacity: 1;
  }
  .hero-command {
    width: 100%;
  }
  .section-sub {
    padding: 8px 10px;
    border-radius: 10px;
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
  .showcase-shell {
    padding: 12px;
  }
  .showcase-shell-head {
    align-items: flex-start;
  }
  .showcase-kpis {
    width: 100%;
  }
  .showcase-kpi {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
  }
  .flow-grid {
    grid-template-columns: 1fr;
  }
  .smart-grid {
    grid-template-columns: 1fr;
  }
  .cta-card {
    grid-template-columns: 1fr;
  }
  .cta-media {
    width: 100%;
  }
  .cta-mini-kpis {
    width: 100%;
  }
  .cta-mini-item {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
  }
  .spotlight-rail {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jp-reveal {
    transition: none;
  }
  .page::after,
  .hero-orbit {
    animation: none !important;
  }
  .hero-bg-svg,
  .hero-copy,
  .hero-media,
  .flair-chip,
  .spotlight-img,
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
