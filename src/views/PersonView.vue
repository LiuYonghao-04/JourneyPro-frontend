<template>
  <div class="profile-page">
    <aside class="left-rail">
      <div class="brand">Profile</div>
      <RouterLink to="/posts" class="rail-link">Discover</RouterLink>
      <RouterLink to="/trips" class="rail-link">Trips</RouterLink>
      <RouterLink to="/posts/publish" class="rail-link">Publish</RouterLink>
      <RouterLink to="/notifications" class="rail-link">Notifications</RouterLink>
      <RouterLink to="/person" class="rail-link active">Me</RouterLink>
    </aside>

    <main class="content">
      <section class="hero hero-v2">
        <div class="avatar-wrap" @click="isSelf && openAvatarDialog()">
          <CroppedImage :src="displayAvatar" alt="avatar" class="avatar" :aspect-ratio="1" />
          <div v-if="isSelf" class="avatar-mask">Change</div>
        </div>
        <div class="hero-main">
          <div class="hero-eyebrow">Personalization Center</div>
          <div class="hero-title-row">
            <h1>{{ displayUserName }}</h1>
            <span v-if="isSelf && profileArchetype" class="hero-pill hero-pill-accent">{{ profileArchetype }}</span>
            <span v-if="isSelf && profileConfidence" class="hero-pill">
              {{ profileConfidence }}% {{ profileConfidenceLabel }}
            </span>
          </div>
          <p class="hero-summary">
            {{ isSelf ? profileSummaryText : 'Personal posts, reactions and public travel content in one workspace.' }}
          </p>
          <div class="hero-sub">
            <span>User ID: {{ userId || 'guest' }}</span>
            <button class="link-btn" :disabled="!isSelf" @click="isSelf && openFollowers()">
              Followers {{ followerCount }}
            </button>
            <span v-if="isSelf && profileGeneratedAt">Profile updated {{ profileGeneratedAt }}</span>
          </div>
          <div v-if="isSelf" class="hero-tag-row">
            <span class="hero-chip">Focus {{ dominantCategoryLabel }}</span>
            <span class="hero-chip">Tag {{ dominantTagLabel }}</span>
            <span class="hero-chip">Signal {{ dominantSignalLabel }}</span>
            <span class="hero-chip">Diversity {{ profileDiversity }}%</span>
          </div>
          <div class="kpi-row kpi-row-wide">
            <div class="kpi-card">
              <span>Posts</span>
              <strong>{{ posts.length }}</strong>
            </div>
            <div class="kpi-card">
              <span>Followers</span>
              <strong>{{ followerCount }}</strong>
            </div>
            <div class="kpi-card">
              <span>Favorites</span>
              <strong>{{ isSelf ? favTotal : 0 }}</strong>
            </div>
            <div class="kpi-card">
              <span>Likes</span>
              <strong>{{ isSelf ? likeTotal : 0 }}</strong>
            </div>
            <div class="kpi-card">
              <span>Visible</span>
              <strong>{{ filteredList.length }}</strong>
            </div>
            <div v-if="isSelf" class="kpi-card">
              <span>Profile confidence</span>
              <strong>{{ profileConfidence || 0 }}%</strong>
            </div>
          </div>
        </div>
      </section>

      <section v-if="isSelf" class="personalization-grid">
        <article class="panel preference-panel">
          <div class="panel-head">
            <div>
              <h3>Preference Center</h3>
              <p class="panel-copy">Manual controls only reorder recommendations. Categories remain available.</p>
            </div>
            <button class="collapse-btn" type="button" @click="resetPreferencePreset">Balanced reset</button>
          </div>
          <div class="slider-wrap">
            <div class="slider-labels">
              <span>Distance {{ distancePercent }}%</span>
              <span>Interest {{ interestPercent }}%</span>
            </div>
            <el-slider v-model="interestSlider" :min="0" :max="100" />
          </div>
          <div class="slider-wrap">
            <div class="slider-labels">
              <span>Safe {{ safePercent }}%</span>
              <span>Explore {{ explorePercent }}%</span>
            </div>
            <el-slider v-model="exploreSlider" :min="0" :max="100" />
          </div>
          <div class="slider-wrap">
            <div class="slider-labels">
              <span>Tight route {{ tightRoutePercent }}%</span>
              <span>Flexible detour {{ detourPercent }}%</span>
            </div>
            <el-slider v-model="detourSlider" :min="0" :max="100" />
          </div>
          <div class="preset-row">
            <button class="preset-btn" :class="{ active: currentPreset === 'balanced' }" type="button" @click="applyPreferencePreset('balanced')">
              Balanced
            </button>
            <button class="preset-btn" :class="{ active: currentPreset === 'route' }" type="button" @click="applyPreferencePreset('route')">
              Route-first
            </button>
            <button class="preset-btn" :class="{ active: currentPreset === 'discovery' }" type="button" @click="applyPreferencePreset('discovery')">
              Discovery
            </button>
          </div>
          <div class="control-matrix">
            <div class="mini-stat">
              <span>Ordering</span>
              <strong>{{ profileOrderingMode }}</strong>
            </div>
            <div class="mini-stat">
              <span>Exploration</span>
              <strong>{{ profileExploreMode }}</strong>
            </div>
            <div class="mini-stat">
              <span>Profile source</span>
              <strong>{{ profileSourceLabel }}</strong>
            </div>
            <div class="mini-stat">
              <span>Detour window</span>
              <strong>{{ detourModeLabel }}</strong>
            </div>
          </div>
        </article>

        <article class="panel story-panel">
          <div class="panel-head">
            <div>
              <h3>Why JourneyPro leans this way</h3>
              <p class="panel-copy">An explanation layer for what is shaping ranking decisions right now.</p>
            </div>
            <button class="collapse-btn" type="button" @click="explanationCollapsed = !explanationCollapsed">
              {{ explanationCollapsed ? 'Expand' : 'Collapse' }}
            </button>
          </div>
          <div v-if="explanationCollapsed" class="summary-strip">
            <div class="summary-tile">
              <span>Archetype</span>
              <strong>{{ profileArchetype }}</strong>
            </div>
            <div class="summary-tile">
              <span>Confidence</span>
              <strong>{{ profileConfidence }}%</strong>
            </div>
            <div class="summary-tile">
              <span>Dominant category</span>
              <strong>{{ dominantCategoryLabel }}</strong>
            </div>
          </div>
          <div v-else class="explanation-grid">
            <div v-for="item in profileExplanations" :key="item.key" class="explanation-card">
              <span>{{ item.title }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.detail }}</p>
            </div>
          </div>
        </article>

        <article class="panel signal-panel">
          <div class="panel-head">
            <div>
              <h3>Signal Mix</h3>
              <p class="panel-copy">Likes, saves and reading depth contribute differently to the profile.</p>
            </div>
            <button class="collapse-btn" type="button" @click="signalCollapsed = !signalCollapsed">
              {{ signalCollapsed ? 'Expand' : 'Collapse' }}
            </button>
          </div>
          <div v-if="signalCollapsed" class="summary-strip">
            <div class="summary-tile">
              <span>Primary signal</span>
              <strong>{{ dominantSignalLabel }}</strong>
            </div>
            <div class="summary-tile">
              <span>Last 7 days</span>
              <strong>{{ recentActivity7d }}</strong>
            </div>
            <div class="summary-tile">
              <span>Momentum</span>
              <strong>{{ recentMomentumLabel }}</strong>
            </div>
          </div>
          <div v-else class="signal-stack">
            <div v-for="item in signalMixItems" :key="item.key" class="signal-item">
              <div class="signal-head">
                <span>{{ item.label }}</span>
                <span>{{ item.percent }}%</span>
              </div>
              <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
              <div class="signal-foot">
                <span>{{ item.count }} events</span>
                <span>{{ item.note }}</span>
              </div>
            </div>
            <div class="activity-strip">
              <div class="summary-tile">
                <span>Last 7 days</span>
                <strong>{{ recentActivity7d }}</strong>
              </div>
              <div class="summary-tile">
                <span>Last 30 days</span>
                <strong>{{ recentActivity30d }}</strong>
              </div>
              <div class="summary-tile">
                <span>Momentum</span>
                <strong>{{ recentMomentumLabel }}</strong>
              </div>
            </div>
          </div>
        </article>

        <article class="panel interest-panel">
          <div class="panel-head">
            <div>
              <h3>Interest Profile</h3>
              <p class="panel-copy">Current tag and category distribution inferred from your behavior.</p>
            </div>
            <button v-if="interestProfile?.personalized" class="collapse-btn" type="button" @click="interestCollapsed = !interestCollapsed">
              {{ interestCollapsed ? 'Expand' : 'Collapse' }}
            </button>
          </div>
          <div v-if="interestLoading" class="muted">Loading profile...</div>
          <template v-else-if="!interestProfile?.personalized">
            <div class="muted">Interact with posts to generate preference profile.</div>
          </template>
          <template v-else>
            <div class="interest-meta-row">
              <span class="meta-chip">Source {{ profileSourceLabel }}</span>
              <span class="meta-chip">Evidence {{ profileEvidenceScore }}%</span>
              <span class="meta-chip">Diversity {{ profileDiversity }}%</span>
            </div>
            <div v-if="interestCollapsed" class="bar-grid">
              <div class="bar-block" v-for="item in collapsedInterestItems" :key="item.key">
                <div class="bar-head">
                  <span>{{ item.label }}</span>
                  <span>{{ item.percent }}%</span>
                </div>
                <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
              </div>
            </div>
            <template v-else>
              <div class="interest-columns">
                <div class="interest-column">
                  <div class="interest-column-title">Tags</div>
                  <div class="bar-grid">
                    <div class="bar-block" v-for="item in interestTags" :key="`tag-${item.name}`">
                      <div class="bar-head">
                        <span>#{{ item.name }}</span>
                        <span>{{ item.percent }}%</span>
                      </div>
                      <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
                    </div>
                    <div class="bar-block" v-if="otherTagPercent > 0">
                      <div class="bar-head">
                        <span>Other tags</span>
                        <span>{{ otherTagPercent }}%</span>
                      </div>
                      <el-progress :percentage="otherTagPercent" :stroke-width="8" :show-text="false" />
                    </div>
                  </div>
                </div>
                <div class="interest-column">
                  <div class="interest-column-title">Categories</div>
                  <div class="bar-grid">
                    <div class="bar-block" v-for="item in interestCategories" :key="`cat-${item.name}`">
                      <div class="bar-head">
                        <span>{{ item.name }}</span>
                        <span>{{ item.percent }}%</span>
                      </div>
                      <el-progress :percentage="item.percent" :stroke-width="8" :show-text="false" />
                    </div>
                    <div class="bar-block" v-if="otherCategoryPercent > 0">
                      <div class="bar-head">
                        <span>Other categories</span>
                        <span>{{ otherCategoryPercent }}%</span>
                      </div>
                      <el-progress :percentage="otherCategoryPercent" :stroke-width="8" :show-text="false" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </article>

        <article class="panel trend-panel">
          <div class="panel-head">
            <div>
              <h3>Interest Evolution</h3>
              <p class="panel-copy">See how category and tag preference moved across the last 90 days, plus the latest shifts.</p>
            </div>
            <button class="collapse-btn" type="button" @click="trendCollapsed = !trendCollapsed">
              {{ trendCollapsed ? 'Expand' : 'Collapse' }}
            </button>
          </div>
          <div v-if="trendCollapsed" class="summary-strip">
            <div class="summary-tile">
              <span>Detour style</span>
              <strong>{{ detourModeLabel }}</strong>
            </div>
            <div class="summary-tile">
              <span>Rising</span>
              <strong>{{ topRisingShiftLabel }}</strong>
            </div>
            <div class="summary-tile">
              <span>Cooling</span>
              <strong>{{ topCoolingShiftLabel }}</strong>
            </div>
          </div>
          <template v-else>
            <p class="trend-summary">{{ preferenceShiftSummary }}</p>
            <div class="evolution-grid">
              <div class="evolution-column">
                <div class="interest-column-title">Category evolution</div>
                <div v-if="!evolutionCategories.length" class="muted">No recent category movement yet.</div>
                <div v-else class="evolution-stack">
                  <article v-for="item in evolutionCategories" :key="item.key" class="evolution-card">
                    <div class="evolution-card-head">
                      <span>{{ item.name }}</span>
                      <strong class="delta-badge" :class="item.trend">{{ formatShiftDelta(item.delta) }}</strong>
                    </div>
                    <div class="evolution-points">
                      <div v-for="point in item.points" :key="point.key" class="evolution-point">
                        <span>{{ point.short_label }}</span>
                        <div class="evolution-bar"><i :style="{ width: `${Math.max(point.percent, point.percent > 0 ? 6 : 0)}%` }"></i></div>
                        <strong>{{ point.percent }}%</strong>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <div class="evolution-column">
                <div class="interest-column-title">Tag evolution</div>
                <div v-if="!evolutionTags.length" class="muted">No recent tag movement yet.</div>
                <div v-else class="evolution-stack">
                  <article v-for="item in evolutionTags" :key="item.key" class="evolution-card">
                    <div class="evolution-card-head">
                      <span>#{{ item.name }}</span>
                      <strong class="delta-badge" :class="item.trend">{{ formatShiftDelta(item.delta) }}</strong>
                    </div>
                    <div class="evolution-points">
                      <div v-for="point in item.points" :key="point.key" class="evolution-point">
                        <span>{{ point.short_label }}</span>
                        <div class="evolution-bar"><i :style="{ width: `${Math.max(point.percent, point.percent > 0 ? 6 : 0)}%` }"></i></div>
                        <strong>{{ point.percent }}%</strong>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <div class="shift-grid">
              <div class="shift-card">
                <div class="interest-column-title">Rising now</div>
                <div v-if="!risingShifts.length" class="muted">No rising preference yet.</div>
                <div v-else class="shift-stack">
                  <div v-for="item in risingShifts" :key="item.key" class="shift-pill up">
                    <span>{{ item.label }}</span>
                    <strong>{{ formatShiftDelta(item.delta) }}</strong>
                  </div>
                </div>
              </div>
              <div class="shift-card">
                <div class="interest-column-title">Cooling off</div>
                <div v-if="!coolingShifts.length" class="muted">No cooling preference yet.</div>
                <div v-else class="shift-stack">
                  <div v-for="item in coolingShifts" :key="item.key" class="shift-pill down">
                    <span>{{ item.label }}</span>
                    <strong>{{ formatShiftDelta(item.delta) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </article>
      </section>

      <section v-if="isSelf" class="workflow-grid">
        <article class="panel workflow-panel">
          <div class="panel-head">
            <div>
              <h3>Trip Hub</h3>
              <p class="panel-copy">Recent workspaces created from AI planning and route execution.</p>
            </div>
            <RouterLink to="/trips" class="workflow-link">Open Trips</RouterLink>
          </div>
          <div class="workflow-summary-row">
            <div class="summary-tile">
              <span>Total trips</span>
              <strong>{{ tripStats.total }}</strong>
            </div>
            <div class="summary-tile">
              <span>Active</span>
              <strong>{{ tripStats.active }}</strong>
            </div>
            <div class="summary-tile">
              <span>Starred</span>
              <strong>{{ tripStats.starred }}</strong>
            </div>
          </div>
          <div v-if="tripHubLoading" class="muted">Loading trip workspace summary...</div>
          <div v-else-if="tripHubError" class="muted">{{ tripHubError }}</div>
          <div v-else-if="!tripHub.length" class="muted">No trip workspaces yet. Create one from AI Planner.</div>
          <div v-else class="workflow-list">
            <article v-for="trip in tripHub" :key="trip.id" class="workflow-card">
              <div class="workflow-card-top">
                <div>
                  <h4>{{ trip.title }}</h4>
                  <p>{{ trip.summary || trip.prompt_preview || 'Trip workspace' }}</p>
                </div>
                <span class="status-pill">{{ trip.status }}</span>
              </div>
              <div class="workflow-chip-row">
                <span class="meta-chip">{{ trip.stop_count }} stops</span>
                <span class="meta-chip">{{ trip.via_count }} via</span>
                <span v-if="trip.profile_snapshot?.archetype" class="meta-chip">{{ trip.profile_snapshot.archetype }}</span>
                <span v-if="trip.intent_snapshot?.preferred_categories?.[0]" class="meta-chip">
                  {{ trip.intent_snapshot.preferred_categories[0] }}
                </span>
              </div>
              <div class="workflow-footer">
                <span>{{ formatRelativeTimeShort(trip.updated_at) }}</span>
                <div class="workflow-actions">
                  <button class="inline-cta" type="button" @click="openTripWorkspace(trip.id)">Open</button>
                  <button class="inline-cta inline-cta-primary" type="button" @click="continueTripInMap(trip)">Map</button>
                </div>
              </div>
            </article>
          </div>
        </article>

        <article class="panel workflow-panel">
          <div class="panel-head">
            <div>
              <h3>AI Plan Shelf</h3>
              <p class="panel-copy">Saved planner outputs that can be restored back into the AI workspace.</p>
            </div>
            <RouterLink to="/ai-planner" class="workflow-link">Open Planner</RouterLink>
          </div>
          <div class="workflow-summary-row">
            <div class="summary-tile">
              <span>Saved plans</span>
              <strong>{{ planStats.total }}</strong>
            </div>
            <div class="summary-tile">
              <span>Starred</span>
              <strong>{{ planStats.starred }}</strong>
            </div>
            <div class="summary-tile">
              <span>Live AI</span>
              <strong>{{ planStats.external }}</strong>
            </div>
          </div>
          <div v-if="planHubLoading" class="muted">Loading AI plans...</div>
          <div v-else-if="planHubError" class="muted">{{ planHubError }}</div>
          <div v-else-if="!planHub.length" class="muted">No saved AI plans yet. Save one from AI Planner.</div>
          <div v-else class="workflow-list">
            <article v-for="plan in planHub" :key="plan.id" class="workflow-card">
              <div class="workflow-card-top">
                <div>
                  <h4>{{ plan.title }}</h4>
                  <p>{{ plan.summary || plan.prompt_preview || 'AI plan snapshot' }}</p>
                </div>
                <span class="status-pill" :class="{ accent: plan.is_starred }">{{ plan.engine_mode || 'saved' }}</span>
              </div>
              <div class="workflow-chip-row">
                <span class="meta-chip">{{ plan.stop_count }} stops</span>
                <span class="meta-chip">{{ plan.scope_city }}</span>
                <span v-if="plan.profile_snapshot?.archetype" class="meta-chip">{{ plan.profile_snapshot.archetype }}</span>
                <span v-if="plan.intent_snapshot?.pace" class="meta-chip">{{ plan.intent_snapshot.pace }} pace</span>
              </div>
              <div class="workflow-footer">
                <span>{{ formatRelativeTimeShort(plan.updated_at) }}</span>
                <div class="workflow-actions">
                  <button class="inline-cta" type="button" @click="restorePlanToPlanner(plan.id)">Restore</button>
                  <button class="inline-cta inline-cta-primary" type="button" @click="openPlannerPage()">Planner</button>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section class="controls">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
          <button v-if="isSelf" class="tab" :class="{ active: tab === 'favs' }" @click="tab = 'favs'">Favorites</button>
          <button v-if="isSelf" class="tab" :class="{ active: tab === 'likes' }" @click="tab = 'likes'">Likes</button>
        </div>

        <div class="filters">
          <el-input v-model="search" placeholder="Search title or content" clearable style="width: 260px" />
          <el-select v-model="sort" style="width: 140px">
            <el-option label="Newest" value="new" />
            <el-option label="Hottest" value="hot" />
          </el-select>
          <button class="mode-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">Grid</button>
          <button class="mode-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">List</button>
        </div>
      </section>

      <section v-if="filteredList.length" class="feed">
        <div v-if="viewMode === 'grid'" class="card-grid">
          <article v-for="card in filteredList" :key="card._dupKey || card.id" class="card" @click="goDetail(card)">
            <CroppedImage :src="card.cover_image || card.images?.[0] || 'https://placehold.co/640x420'" class="cover" />
            <div class="body">
              <h4>{{ card.title }}</h4>
              <p>{{ card.content }}</p>
              <div class="meta">
                <span>{{ card.like_count || 0 }} likes</span>
                <span>{{ card.favorite_count || 0 }} favs</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="list-view">
          <article v-for="card in filteredList" :key="card._dupKey || card.id" class="list-card" @click="goDetail(card)">
            <CroppedImage :src="card.cover_image || card.images?.[0] || 'https://placehold.co/240x160'" class="list-cover" />
            <div class="list-body">
              <h4>{{ card.title }}</h4>
              <p>{{ card.content }}</p>
              <div class="meta">
                <span>{{ card.like_count || 0 }} likes</span>
                <span>{{ card.favorite_count || 0 }} favs</span>
                <span>{{ card.view_count || 0 }} views</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="empty">No content found.</section>
    </main>
  </div>

  <el-dialog v-model="followerDialog" title="Followers" width="380px">
    <div v-if="followers.length" class="followers-list">
      <div v-for="f in followers" :key="f.id" class="follower-row">
        <CroppedImage :src="f.avatar_url || 'https://placehold.co/80x80'" class="follower-avatar" :aspect-ratio="1" />
        <div>
          <div>{{ f.nickname || 'Traveler' }}</div>
          <div class="muted">ID: {{ f.user_id }}</div>
        </div>
      </div>
    </div>
    <div v-else class="muted">No followers yet.</div>
  </el-dialog>

  <el-dialog v-model="avatarDialog" title="Update Avatar" width="420px">
    <div class="avatar-editor">
      <el-input v-model="avatarInput" placeholder="https://..." />
      <div class="avatar-editor-actions">
        <el-button size="small" @click="randomAvatar">Random</el-button>
        <el-button size="small" type="primary" @click="startAvatarCrop">Crop & Save</el-button>
      </div>
      <div class="avatar-preview" @click="startAvatarCrop">
        <CroppedImage :src="avatarInput || displayAvatar" class="avatar-preview-img" :aspect-ratio="1" />
      </div>
    </div>
  </el-dialog>

  <ImageCropperDialog
    v-model="avatarCropOpen"
    :src="avatarCropSrc"
    title="Crop avatar"
    :aspect-ratio="1"
    :output-width="120"
    :output-height="120"
    :preview-width="160"
    :initial-crop="avatarCropInitial"
    @confirm="onAvatarCropConfirm"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useRouteStore } from '../store/routeStore'
import ImageCropperDialog from '../components/ImageCropperDialog.vue'
import CroppedImage from '../components/CroppedImage.vue'
import { buildUrlWithCrop, parseUrlWithCrop } from '../utils/cropUrl'
import { proxiedImageSrc } from '../utils/imageProxy'
import { apiUrl } from '../config/api'
import { buildPlannerStorageKey } from '../utils/aiPlannerBridge'
import { seedPostDetailPreview } from '../utils/postDetailBridge'

const API_BASE = apiUrl('/api/posts')
const FOLLOW_API = apiUrl('/api/follow')
const AUTH_API = apiUrl('/api/auth')
const TRIPS_API = apiUrl('/api/trips')
const AI_PLANS_API = apiUrl('/api/ai/plans')
const PERSON_POST_LIMIT = 80
const PERSON_REACTION_TAB_LIMIT = 40
const PERSON_CACHE_PREFIX = 'jp_person_cache_v3_'
const PERSON_INTEREST_COLLAPSE_PREFIX = 'jp_person_interest_collapsed_v1_'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const routeStore = useRouteStore()

const userId = computed(() => route.query.userid || auth.user?.id)
const isSelf = computed(() => String(userId.value || '') === String(auth.user?.id || ''))

const posts = ref([])
const favs = ref([])
const likes = ref([])
const followers = ref([])
const followerCountValue = ref(0)
const profile = ref(null)
const reactionSummary = ref({ liked_ids: [], favorited_ids: [] })
const tripHub = ref([])
const planHub = ref([])
const tripHubLoading = ref(false)
const planHubLoading = ref(false)
const tripHubError = ref('')
const planHubError = ref('')
const favsLoaded = ref(false)
const likesLoaded = ref(false)
const requestSeq = ref(0)

const tab = ref('posts')
const sort = ref('new')
const search = ref('')
const viewMode = ref(localStorage.getItem('jp_person_view_mode') || 'grid')

const followerDialog = ref(false)
const avatarDialog = ref(false)
const avatarInput = ref('')
const avatarCropOpen = ref(false)
const avatarCropSrc = ref('')
const avatarCropInitial = ref(null)
const avatarCropBaseUrl = ref('')
const interestCollapsed = ref(true)
const explanationCollapsed = ref(false)
const signalCollapsed = ref(false)
const trendCollapsed = ref(false)

const detourLabelFor = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'Balanced detours'
  if (num <= 0.3) return 'Tight route'
  if (num >= 0.7) return 'Flexible detours'
  return 'Balanced detours'
}

const toUid = (raw) => {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const currentUid = () => toUid(userId.value)
const cacheKey = (uid) => `${PERSON_CACHE_PREFIX}${uid}`
const interestCollapseKey = (uid) => `${PERSON_INTEREST_COLLAPSE_PREFIX}${uid || 'guest'}`

const hydrateInterestCollapsed = (uid) => {
  if (typeof window === 'undefined') return
  interestCollapsed.value = true
  try {
    const raw = localStorage.getItem(interestCollapseKey(uid))
    if (raw === null) return
    interestCollapsed.value = raw === '1'
  } catch {
    interestCollapsed.value = true
  }
}

const persistInterestCollapsed = (uid, collapsed) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(interestCollapseKey(uid), collapsed ? '1' : '0')
  } catch {
    // ignore storage failures
  }
}

const formatDateLabel = (value) => {
  if (!value) return ''
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))
}

const normalizeList = (list) => {
  const map = new Map()
  ;(list || []).forEach((item) => {
    const id = toUid(item?.id)
    if (!id) return
    map.set(id, { ...item, id })
  })
  return Array.from(map.values()).slice(0, PERSON_POST_LIMIT)
}

const applyReactionFlags = (list) => {
  const likedSet = new Set((reactionSummary.value?.liked_ids || []).map((v) => Number(v)))
  const favSet = new Set((reactionSummary.value?.favorited_ids || []).map((v) => Number(v)))
  return (list || []).map((item) => ({
    ...item,
    _liked: !!item?._liked || likedSet.has(Number(item.id)),
    _fav: !!item?._fav || favSet.has(Number(item.id)),
  }))
}

const persistCache = () => {
  if (typeof window === 'undefined') return
  const uid = currentUid()
  if (!uid) return
  try {
    localStorage.setItem(
      cacheKey(uid),
      JSON.stringify({
        profile: profile.value || null,
        posts: normalizeList(posts.value),
        favs: favsLoaded.value ? normalizeList(favs.value) : [],
        likes: likesLoaded.value ? normalizeList(likes.value) : [],
        follower_count: Number(followerCountValue.value || 0),
        reaction_summary: {
          liked_ids: (reactionSummary.value?.liked_ids || []).slice(0, 4000),
          favorited_ids: (reactionSummary.value?.favorited_ids || []).slice(0, 4000),
        },
        favs_loaded: !!favsLoaded.value,
        likes_loaded: !!likesLoaded.value,
        updated_at: Date.now(),
      })
    )
  } catch {
    // ignore cache failures
  }
}

const hydrateCache = (uid) => {
  if (typeof window === 'undefined' || !uid) return false
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (parsed?.profile) profile.value = parsed.profile
    posts.value = normalizeList(parsed?.posts || [])
    favs.value = normalizeList(parsed?.favs || [])
    likes.value = normalizeList(parsed?.likes || [])
    followerCountValue.value = Number(parsed?.follower_count || 0)
    reactionSummary.value = {
      liked_ids: Array.isArray(parsed?.reaction_summary?.liked_ids) ? parsed.reaction_summary.liked_ids : [],
      favorited_ids: Array.isArray(parsed?.reaction_summary?.favorited_ids)
        ? parsed.reaction_summary.favorited_ids
        : [],
    }
    favsLoaded.value = !!parsed?.favs_loaded
    likesLoaded.value = !!parsed?.likes_loaded
    posts.value = applyReactionFlags(posts.value)
    favs.value = applyReactionFlags(favs.value)
    likes.value = applyReactionFlags(likes.value)
    return posts.value.length > 0 || !!profile.value
  } catch {
    return false
  }
}

const resetState = () => {
  posts.value = []
  favs.value = []
  likes.value = []
  followers.value = []
  followerCountValue.value = 0
  profile.value = null
  reactionSummary.value = { liked_ids: [], favorited_ids: [] }
  tripHub.value = []
  planHub.value = []
  tripHubError.value = ''
  planHubError.value = ''
  favsLoaded.value = false
  likesLoaded.value = false
}

const listParams = (extra = {}) => ({
  limit: PERSON_POST_LIMIT,
  compact: 1,
  lite: 1,
  feed_lite: 1,
  viewer_id: auth.user?.id || undefined,
  ...extra,
})

const fetchPostList = async (extra = {}) => {
  const res = await axios.get(API_BASE, { params: listParams(extra) })
  return normalizeList(res.data?.data || [])
}

const fetchOwnPosts = async (uid) => {
  try {
    const list = await fetchPostList({ user_id: uid })
    posts.value = applyReactionFlags(list)
  } catch {
    posts.value = []
  }
  persistCache()
}

const ensureFavsLoaded = async (uid, force = false) => {
  if (!isSelf.value || !uid) return
  if (favsLoaded.value && !force) return
  try {
    const list = await fetchPostList({ favorited_by: uid, limit: PERSON_REACTION_TAB_LIMIT })
    favs.value = list.map((item) => ({ ...item, _fav: true }))
    favsLoaded.value = true
  } catch {
    favs.value = []
  }
  favs.value = applyReactionFlags(favs.value)
  persistCache()
}

const ensureLikesLoaded = async (uid, force = false) => {
  if (!isSelf.value || !uid) return
  if (likesLoaded.value && !force) return
  try {
    const list = await fetchPostList({ liked_by: uid, limit: PERSON_REACTION_TAB_LIMIT })
    likes.value = list.map((item) => ({ ...item, _liked: true }))
    likesLoaded.value = true
  } catch {
    likes.value = []
  }
  likes.value = applyReactionFlags(likes.value)
  persistCache()
}

const fetchReactionSummary = async (uid) => {
  if (!isSelf.value || !uid) return
  try {
    const res = await axios.get(`${API_BASE}/reactions/summary`, { params: { user_id: uid, limit: 4000 } })
    reactionSummary.value = {
      liked_ids: Array.isArray(res.data?.data?.liked_ids) ? res.data.data.liked_ids : [],
      favorited_ids: Array.isArray(res.data?.data?.favorited_ids) ? res.data.data.favorited_ids : [],
    }
    posts.value = applyReactionFlags(posts.value)
    favs.value = applyReactionFlags(favs.value)
    likes.value = applyReactionFlags(likes.value)
  } catch {
    reactionSummary.value = { liked_ids: [], favorited_ids: [] }
  }
  persistCache()
}

const fetchFollowerCount = async (uid) => {
  if (!uid) {
    followerCountValue.value = 0
    return
  }
  try {
    const res = await axios.get(`${FOLLOW_API}/followers`, {
      params: { target_id: uid, count_only: 1 },
    })
    followerCountValue.value = Number(res.data?.count || 0)
  } catch {
    followerCountValue.value = followers.value.length || 0
  }
  persistCache()
}

const fetchFollowers = async (uid, force = false) => {
  if (!uid) {
    followers.value = []
    followerCountValue.value = 0
    return
  }
  if (followers.value.length && !force) return
  try {
    const res = await axios.get(`${FOLLOW_API}/followers`, {
      params: { target_id: uid, limit: 200 },
    })
    followers.value = res.data?.data || []
    followerCountValue.value = Number(res.data?.count || followers.value.length || 0)
  } catch {
    followers.value = []
  }
}

const fetchProfile = async (uid) => {
  if (!uid) {
    profile.value = null
    return
  }
  try {
    const res = await axios.get(`${AUTH_API}/user`, { params: { id: uid } })
    profile.value = res.data?.user || null
  } catch {
    if (!profile.value) profile.value = null
  }
  persistCache()
}

const fetchTripHub = async (uid) => {
  if (!isSelf.value || !uid) {
    tripHub.value = []
    tripHubError.value = ''
    return
  }
  tripHubLoading.value = true
  tripHubError.value = ''
  try {
    const res = await fetch(`${TRIPS_API}?user_id=${encodeURIComponent(String(uid))}&limit=3`)
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load trips.')
    }
    tripHub.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    tripHubError.value = String(err?.message || 'Failed to load trips.')
  } finally {
    tripHubLoading.value = false
  }
}

const fetchPlanHub = async (uid) => {
  if (!isSelf.value || !uid) {
    planHub.value = []
    planHubError.value = ''
    return
  }
  planHubLoading.value = true
  planHubError.value = ''
  try {
    const res = await fetch(`${AI_PLANS_API}?user_id=${encodeURIComponent(String(uid))}&limit=3`)
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load saved plans.')
    }
    planHub.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    planHubError.value = String(err?.message || 'Failed to load saved plans.')
  } finally {
    planHubLoading.value = false
  }
}

const refreshPage = async ({ useCache = true } = {}) => {
  const uid = currentUid()
  if (!uid) return
  const reqId = ++requestSeq.value
  if (useCache) hydrateCache(uid)

  await Promise.all([fetchProfile(uid), fetchFollowerCount(uid), fetchOwnPosts(uid)])
  if (reqId !== requestSeq.value) return

  if (!isSelf.value) {
    tab.value = 'posts'
    favs.value = []
    likes.value = []
    reactionSummary.value = { liked_ids: [], favorited_ids: [] }
    favsLoaded.value = false
    likesLoaded.value = false
    return
  }

  fetchReactionSummary(uid)
  if (tab.value === 'favs') ensureFavsLoaded(uid)
  if (tab.value === 'likes') ensureLikesLoaded(uid)
  if (auth.user?.id) {
    routeStore.fetchRecoSettingsFromServer(auth.user.id)
    routeStore.fetchUserInterestProfile(auth.user.id)
    fetchTripHub(auth.user.id)
    fetchPlanHub(auth.user.id)
  }
}

const currentList = computed(() => {
  if (!isSelf.value) return posts.value
  if (tab.value === 'favs') return favs.value
  if (tab.value === 'likes') return likes.value
  return posts.value
})

const filteredList = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = currentList.value.filter((item) => {
    if (!q) return true
    return `${item.title || ''} ${item.content || ''}`.toLowerCase().includes(q)
  })
  if (sort.value === 'hot') {
    return [...list].sort((a, b) => (Number(b.like_count) || 0) - (Number(a.like_count) || 0))
  }
  return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const followerCount = computed(() => Number(followerCountValue.value || followers.value.length || 0))
const tripStats = computed(() => ({
  total: tripHub.value.length,
  active: tripHub.value.filter((item) => String(item?.status || '').toUpperCase() === 'ACTIVE').length,
  starred: tripHub.value.filter((item) => !!item?.is_starred).length,
}))
const planStats = computed(() => ({
  total: planHub.value.length,
  starred: planHub.value.filter((item) => !!item?.is_starred).length,
  external: planHub.value.filter((item) => String(item?.engine_mode || '').toLowerCase() === 'external').length,
}))
const likeTotal = computed(() => {
  if (!isSelf.value) return 0
  const summaryCount = Number(reactionSummary.value?.liked_ids?.length || 0)
  return summaryCount || likes.value.length
})
const favTotal = computed(() => {
  if (!isSelf.value) return 0
  const summaryCount = Number(reactionSummary.value?.favorited_ids?.length || 0)
  return summaryCount || favs.value.length
})
const displayUserName = computed(() => profile.value?.nickname || auth.user?.nickname || 'Traveler')
const displayAvatar = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || 'https://placehold.co/120x120')

const interestSlider = computed({
  get() {
    return Math.round((routeStore.recoInterestWeight ?? 0.5) * 100)
  },
  set(val) {
    routeStore.setRecoInterestWeight(Number(val) / 100)
  },
})

const exploreSlider = computed({
  get() {
    return Math.round((routeStore.recoExploreWeight ?? 0.15) * 100)
  },
  set(val) {
    routeStore.setRecoExploreWeight(Number(val) / 100)
  },
})

const detourSlider = computed({
  get() {
    return Math.round((routeStore.recoDetourTolerance ?? Number(profileSettings.value?.detour_tolerance) ?? 0.5) * 100)
  },
  set(val) {
    routeStore.setRecoDetourTolerance(Number(val) / 100)
  },
})

const interestPercent = computed(() => interestSlider.value)
const distancePercent = computed(() => 100 - interestSlider.value)
const explorePercent = computed(() => exploreSlider.value)
const safePercent = computed(() => 100 - exploreSlider.value)
const detourPercent = computed(() => detourSlider.value)
const tightRoutePercent = computed(() => 100 - detourSlider.value)

const interestProfile = computed(() => routeStore.userInterestProfile || null)
const interestLoading = computed(() => routeStore.interestProfileLoading)
const interestTags = computed(() => interestProfile.value?.tags?.items || [])
const otherTagPercent = computed(() => Number(interestProfile.value?.tags?.other_percent) || 0)
const interestCategories = computed(() => interestProfile.value?.categories?.items || [])
const otherCategoryPercent = computed(() => Number(interestProfile.value?.categories?.other_percent) || 0)
const profileSettings = computed(() => interestProfile.value?.settings || null)
const profileStory = computed(() => interestProfile.value?.profile_story || null)
const signalMixItems = computed(() => interestProfile.value?.signals?.mix?.items || [])
const profileExplanations = computed(() => interestProfile.value?.explanations || [])
const recentActivity = computed(() => interestProfile.value?.recent_activity || null)
const profileGeneratedAt = computed(() =>
  formatDateLabel(interestProfile.value?.generated_at || profileSettings.value?.updated_at || '')
)
const profileArchetype = computed(() => profileStory.value?.archetype || 'Unshaped profile')
const profileSummaryText = computed(() => {
  if (!isSelf.value) return ''
  return (
    profileStory.value?.summary ||
    'JourneyPro is still learning from your posts, saves and reading behavior. Interact with more places to sharpen the profile.'
  )
})
const profileConfidence = computed(() => Math.round(Number(profileStory.value?.confidence) || 0))
const profileConfidenceLabel = computed(() => profileStory.value?.confidence_label || 'Early')
const profileDiversity = computed(() => Math.round(Number(profileStory.value?.diversity_score) || 0))
const profileEvidenceScore = computed(() => Math.round(Number(profileStory.value?.evidence_score) || 0))
const dominantCategoryLabel = computed(() => profileStory.value?.dominant_category?.name || 'Mixed')
const dominantTagLabel = computed(() => {
  const raw = profileStory.value?.dominant_tag?.name
  return raw ? `#${raw}` : 'No clear tag'
})
const dominantSignalLabel = computed(() => profileStory.value?.dominant_signal?.label || 'Light signal')
const recentActivity7d = computed(() => Number(recentActivity.value?.last_7d || 0))
const recentActivity30d = computed(() => Number(recentActivity.value?.last_30d || 0))
const recentMomentumLabel = computed(() => recentActivity.value?.momentum_label || 'Cold start')
const interestEvolution = computed(() => interestProfile.value?.interest_evolution || null)
const evolutionTags = computed(() => interestEvolution.value?.tags || [])
const evolutionCategories = computed(() => interestEvolution.value?.categories || [])
const preferenceShifts = computed(() => interestProfile.value?.preference_shifts || null)
const risingShifts = computed(() => preferenceShifts.value?.rising || [])
const coolingShifts = computed(() => preferenceShifts.value?.cooling || [])
const preferenceShiftSummary = computed(
  () => preferenceShifts.value?.summary || 'JourneyPro has not detected a meaningful preference swing yet.'
)
const topRisingShiftLabel = computed(() => risingShifts.value?.[0]?.label || 'Stable')
const topCoolingShiftLabel = computed(() => coolingShifts.value?.[0]?.label || 'Stable')
const profileSourceLabel = computed(() => {
  const source = String(interestProfile.value?.source || '').toLowerCase()
  if (source === 'user_interest_agg') return 'learned'
  if (source === 'fallback_posts') return 'fallback'
  if (source === 'empty_agg') return 'warming up'
  return 'local'
})
const profileOrderingMode = computed(() => {
  if (interestPercent.value >= 60) return 'Interest-first'
  if (distancePercent.value >= 60) return 'Distance-first'
  return 'Balanced'
})
const profileExploreMode = computed(() => {
  if (explorePercent.value >= 60) return 'Discovery-heavy'
  if (safePercent.value >= 60) return 'Stable picks'
  return 'Balanced'
})
const detourModeLabel = computed(() => detourLabelFor((routeStore.recoDetourTolerance ?? profileSettings.value?.detour_tolerance ?? 0.5)))
const collapsedInterestItems = computed(() => {
  const tagItems = (interestTags.value || []).map((item) => ({
    key: `tag-${item.name}`,
    label: `#${item.name}`,
    percent: Number(item.percent) || 0,
  }))
  const categoryItems = (interestCategories.value || []).map((item) => ({
    key: `cat-${item.name}`,
    label: String(item.name || ''),
    percent: Number(item.percent) || 0,
  }))
  return [...tagItems, ...categoryItems]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)
})

const near = (value, target) => Math.abs(Number(value || 0) - Number(target || 0)) <= 6

const currentPreset = computed(() => {
  if (near(interestPercent.value, 50) && near(explorePercent.value, 50) && near(detourPercent.value, 50)) return 'balanced'
  if (interestPercent.value <= 42 && explorePercent.value <= 28 && detourPercent.value <= 34) return 'route'
  if (interestPercent.value >= 62 && explorePercent.value >= 62 && detourPercent.value >= 66) return 'discovery'
  return 'custom'
})

const applyPreferencePreset = (preset) => {
  if (preset === 'balanced') {
    routeStore.setRecoInterestWeight(0.5)
    routeStore.setRecoExploreWeight(0.5)
    routeStore.setRecoDetourTolerance(0.5)
    return
  }
  if (preset === 'route') {
    routeStore.setRecoInterestWeight(0.35)
    routeStore.setRecoExploreWeight(0.2)
    routeStore.setRecoDetourTolerance(0.22)
    return
  }
  if (preset === 'discovery') {
    routeStore.setRecoInterestWeight(0.68)
    routeStore.setRecoExploreWeight(0.72)
    routeStore.setRecoDetourTolerance(0.74)
  }
}

const resetPreferencePreset = () => applyPreferencePreset('balanced')

const formatShiftDelta = (value) => {
  const num = Number(value) || 0
  if (num > 0) return `+${num.toFixed(1)}%`
  if (num < 0) return `${num.toFixed(1)}%`
  return '0.0%'
}

const formatRelativeTimeShort = (value) => {
  const ts = new Date(value || '').getTime()
  if (!Number.isFinite(ts) || ts <= 0) return 'Unknown'
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d`
  return new Date(ts).toLocaleDateString()
}

const applyRouteContextToStore = (context, fallbackStops = []) => {
  if (!context || typeof context !== 'object') return
  const startLat = Number(context?.start?.lat)
  const startLng = Number(context?.start?.lng)
  if (Number.isFinite(startLat) && Number.isFinite(startLng)) {
    routeStore.setStart(startLat, startLng)
    const startName = String(context?.start?.name || context?.start?.address || '').trim()
    if (startName) routeStore.startAddress = startName
  }
  const endLat = Number(context?.end?.lat)
  const endLng = Number(context?.end?.lng)
  if (Number.isFinite(endLat) && Number.isFinite(endLng)) {
    routeStore.setEnd(endLat, endLng)
    const endName = String(context?.end?.name || context?.end?.address || '').trim()
    if (endName) routeStore.endAddress = endName
  }
  const via = Array.isArray(context?.via) ? context.via : []
  const normalizedVia = (via.length ? via : fallbackStops)
    .map((point) => ({
      id: point?.id ?? null,
      name: point?.name || 'POI',
      lat: Number(point?.lat),
      lng: Number(point?.lng),
      category: point?.category || '',
      image_url: point?.image_url || '',
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
  routeStore.replaceViaPoints(normalizedVia)
  if (Number.isFinite(Number(context?.interest_weight))) routeStore.setRecoInterestWeight(Number(context.interest_weight))
  if (Number.isFinite(Number(context?.explore_weight))) routeStore.setRecoExploreWeight(Number(context.explore_weight))
  if (Number.isFinite(Number(context?.detour_tolerance))) routeStore.setRecoDetourTolerance(Number(context.detour_tolerance))
}

const openPlannerPage = () => {
  router.push('/ai-planner')
}

const restorePlanToPlanner = async (planId) => {
  const uid = auth.user?.id
  if (!uid || !planId) return
  try {
    const res = await fetch(`${AI_PLANS_API}/${encodeURIComponent(String(planId))}?user_id=${encodeURIComponent(String(uid))}`)
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item?.payload) return
    localStorage.setItem(
      buildPlannerStorageKey(uid),
      JSON.stringify({
        ...data.item.payload,
        saved_plan_id: Number(planId),
      })
    )
    router.push('/ai-planner')
  } catch {
    // ignore
  }
}

const openTripWorkspace = (tripId) => {
  if (!tripId) return
  router.push({ path: '/trips', query: { tripId: String(tripId) } })
}

const continueTripInMap = async (trip) => {
  const uid = auth.user?.id
  const tripId = Number(trip?.id)
  if (!uid || !tripId) return
  try {
    const res = await fetch(`${TRIPS_API}/${encodeURIComponent(String(tripId))}?user_id=${encodeURIComponent(String(uid))}`)
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.item) return
    const detail = data.item
    applyRouteContextToStore(
      detail.route_context,
      Array.isArray(detail?.planner_snapshot?.recommendations) ? detail.planner_snapshot.recommendations.slice(0, 8) : []
    )
    router.push('/map')
  } catch {
    // ignore
  }
}

const goDetail = (postOrId) => {
  const postId = Number(typeof postOrId === 'object' ? postOrId?.id : postOrId)
  if (!postId) return
  if (postOrId && typeof postOrId === 'object') {
    seedPostDetailPreview(postOrId)
  }
  router.push(`/posts/postsid=${postId}`)
}
const openFollowers = async () => {
  if (!isSelf.value) return
  followerDialog.value = true
  await fetchFollowers(currentUid())
}

const openAvatarDialog = () => {
  if (!isSelf.value) return
  avatarInput.value = profile.value?.avatar_url || auth.user?.avatar_url || ''
  avatarDialog.value = true
}

const randomAvatar = () => {
  avatarInput.value = `https://picsum.photos/seed/jp_avatar_${Math.floor(Math.random() * 10000)}/160/160`
}

const startAvatarCrop = () => {
  const raw = (avatarInput.value || '').trim()
  if (!raw) return
  const parsed = parseUrlWithCrop(raw)
  avatarCropBaseUrl.value = parsed.baseUrl || raw
  avatarCropInitial.value = parsed.crop
  avatarCropSrc.value = proxiedImageSrc(avatarCropBaseUrl.value)
  avatarCropOpen.value = true
}

const persistAvatarUrl = async (finalUrl) => {
  const url = String(finalUrl || '').trim()
  if (!url || !auth.user?.id) return false
  try {
    const res = await axios.post(`${AUTH_API}/avatar`, { user_id: auth.user.id, avatar_url: url })
    const updated = res.data?.user
    if (updated) {
      profile.value = updated
      auth.setUser(updated)
      persistCache()
      return true
    }
  } catch {
    // ignore
  }
  return false
}

const onAvatarCropConfirm = async (crop) => {
  try {
    const base = avatarCropBaseUrl.value || parseUrlWithCrop(avatarInput.value).baseUrl || avatarInput.value
    const finalUrl = buildUrlWithCrop(base, crop)
    avatarInput.value = finalUrl
    const ok = await persistAvatarUrl(finalUrl)
    if (ok) avatarDialog.value = false
  } finally {
    avatarCropOpen.value = false
  }
}

onMounted(() => {
  const uid = currentUid()
  hydrateInterestCollapsed(uid)
  if (uid) {
    hydrateCache(uid)
    refreshPage({ useCache: false })
  }
})

watch(
  () => userId.value,
  (next, prev) => {
    if (String(next || '') !== String(prev || '')) resetState()
    const uid = currentUid()
    hydrateInterestCollapsed(uid)
    if (!uid) return
    hydrateCache(uid)
    refreshPage({ useCache: false })
  }
)

watch(
  () => tab.value,
  (next) => {
    const uid = currentUid()
    if (!uid || !isSelf.value) return
    if (next === 'favs') ensureFavsLoaded(uid)
    if (next === 'likes') ensureLikesLoaded(uid)
  }
)

watch(
  () => isSelf.value,
  (val) => {
    if (!val) tab.value = 'posts'
    if (val && auth.user?.id) {
      routeStore.fetchRecoSettingsFromServer(auth.user.id)
      routeStore.fetchUserInterestProfile(auth.user.id)
    }
  }
)

watch(
  () => viewMode.value,
  (mode) => {
    localStorage.setItem('jp_person_view_mode', mode)
  }
)

watch(
  () => interestCollapsed.value,
  (collapsed) => {
    persistInterestCollapsed(currentUid(), collapsed)
  }
)

watch(
  () => avatarCropOpen.value,
  (open) => {
    if (open) return
    avatarCropSrc.value = ''
    avatarCropInitial.value = null
    avatarCropBaseUrl.value = ''
  }
)
</script>

<style scoped>
.profile-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: calc(100vh - 56px);
  color: var(--fg);
  background:
    radial-gradient(circle at 8% 0%, color-mix(in srgb, #7ea6ff 10%, transparent), transparent 30%),
    radial-gradient(circle at 90% 8%, color-mix(in srgb, #ffd7a0 10%, transparent), transparent 26%),
    var(--bg-main);
}

.left-rail {
  border-right: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 16px 12px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 8px;
}

.rail-link {
  text-decoration: none;
  color: var(--fg);
  padding: 9px 11px;
  border-radius: 12px;
}

.rail-link:hover,
.rail-link.active,
.left-rail :global(.router-link-active.rail-link) {
  background: color-mix(in srgb, var(--badge) 88%, transparent);
}

.content {
  overflow-y: auto;
  padding: 16px 18px 24px;
}

.hero {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 18px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: start;
}

.avatar-wrap {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
}

.avatar {
  width: 104px;
  height: 104px;
  border-radius: 999px;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  font-weight: 700;
}

.avatar-wrap:hover .avatar-mask {
  opacity: 1;
}

.hero-main h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.02em;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4f8cff;
}

.hero-title-row {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.hero-summary {
  margin: 10px 0 0;
  max-width: 920px;
  color: var(--muted);
  line-height: 1.6;
  font-size: 14px;
}

.hero-pill,
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 84%, transparent);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
}

.hero-pill-accent {
  border-color: color-mix(in srgb, #4f8cff 55%, transparent);
  background: color-mix(in srgb, #4f8cff 14%, transparent);
  color: #4f8cff;
}

.hero-sub {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
}

.hero-tag-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.link-btn {
  border: none;
  background: transparent;
  color: #4f8cff;
  cursor: pointer;
  padding: 0;
}

.link-btn:disabled {
  color: var(--muted);
  cursor: not-allowed;
}

.kpi-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.kpi-row-wide {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.kpi-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 78%, transparent);
  padding: 8px;
}

.kpi-card span {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.kpi-card strong {
  font-size: 22px;
}

.insights,
.personalization-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 12px;
}

.panel {
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
}

.panel h3 {
  margin: 0 0 8px;
}

.panel-copy {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.panel-head h3 {
  margin: 0;
}

.preference-panel,
.story-panel,
.signal-panel,
.interest-panel,
.trend-panel {
  min-height: 100%;
}

.trend-panel {
  grid-column: 1 / -1;
}

.preset-row {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 84%, transparent);
  color: var(--fg);
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.preset-btn.active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
  color: #4f8cff;
}

.control-matrix,
.summary-strip,
.activity-strip {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.control-matrix {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mini-stat,
.summary-tile {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 10px;
}

.mini-stat span,
.summary-tile span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.mini-stat strong,
.summary-tile strong {
  display: block;
  margin-top: 4px;
  font-size: 15px;
}

.explanation-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.explanation-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 12px;
}

.explanation-card span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.explanation-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.2;
}

.explanation-card p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.signal-stack {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.signal-item {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 10px;
}

.signal-head,
.signal-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.signal-head {
  margin-bottom: 6px;
  color: var(--fg);
  font-weight: 700;
}

.signal-foot {
  margin-top: 6px;
  color: var(--muted);
}

.interest-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 6px 10px;
  font-size: 12px;
  color: var(--muted);
}

.interest-columns {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.interest-column {
  min-width: 0;
}

.interest-column-title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.workflow-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workflow-panel {
  min-height: 100%;
}

.workflow-link {
  text-decoration: none;
  color: #4f8cff;
  font-size: 13px;
  font-weight: 700;
}

.workflow-summary-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.workflow-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.workflow-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 12px;
}

.workflow-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.workflow-card-top h4 {
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
}

.workflow-card-top p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.status-pill {
  align-self: flex-start;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 86%, transparent);
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-pill.accent {
  color: #4f8cff;
  border-color: color-mix(in srgb, #4f8cff 50%, transparent);
}

.workflow-chip-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workflow-footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.workflow-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.inline-cta {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  color: var(--fg);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.inline-cta-primary {
  border-color: color-mix(in srgb, #4f8cff 56%, transparent);
  background: color-mix(in srgb, #4f8cff 14%, transparent);
  color: #4f8cff;
}

.collapse-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.collapse-btn:hover {
  border-color: #4f8cff;
}

.slider-wrap {
  margin-top: 8px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.bar-grid {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.trend-summary {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 13px;
}

.evolution-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.evolution-column {
  min-width: 0;
}

.evolution-stack,
.shift-stack {
  display: grid;
  gap: 10px;
}

.evolution-card,
.shift-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 12px;
}

.evolution-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
}

.delta-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.delta-badge.up {
  background: color-mix(in srgb, #22c55e 18%, transparent);
  color: #15803d;
}

.delta-badge.down {
  background: color-mix(in srgb, #ef4444 12%, transparent);
  color: #dc2626;
}

.delta-badge.flat {
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  color: var(--muted);
}

.evolution-points {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.evolution-point {
  display: grid;
  grid-template-columns: 48px 1fr 52px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.evolution-bar {
  position: relative;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
}

.evolution-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f8cff, #78d8ff);
}

.shift-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.shift-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
}

.shift-pill.up {
  background: color-mix(in srgb, #22c55e 14%, transparent);
  color: #15803d;
}

.shift-pill.down {
  background: color-mix(in srgb, #ef4444 12%, transparent);
  color: #dc2626;
}

.bar-block {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 76%, transparent);
  padding: 8px;
}

.bar-head {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.controls {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 6px 12px;
  cursor: pointer;
}

.tab.active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 82%, transparent);
  color: var(--fg);
  padding: 6px 10px;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #4f8cff;
}

.feed {
  margin-top: 12px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  overflow: hidden;
  cursor: pointer;
}

.cover {
  width: 100%;
  aspect-ratio: 4 / 3;
}

.body {
  padding: 10px;
}

.body h4 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.body p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.list-view {
  display: grid;
  gap: 10px;
}

.list-card {
  border: 1px solid color-mix(in srgb, var(--panel-border) 78%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  padding: 8px;
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 10px;
  cursor: pointer;
}

.list-cover {
  width: 180px;
  height: 120px;
  border-radius: 10px;
}

.list-body h4 {
  margin: 0 0 6px;
  font-size: 20px;
}

.list-body p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty {
  margin-top: 12px;
  border: 1px dashed color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: var(--muted);
}

.followers-list {
  display: grid;
  gap: 8px;
}

.follower-row {
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  padding: 8px;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;
  align-items: center;
}

.follower-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.avatar-editor {
  display: grid;
  gap: 8px;
}

.avatar-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.avatar-preview {
  width: 140px;
  height: 140px;
  border: 1px solid color-mix(in srgb, var(--panel-border) 76%, transparent);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--badge) 80%, transparent);
  cursor: pointer;
}

.avatar-preview-img {
  width: 140px;
  height: 140px;
}

.muted {
  color: var(--muted);
  font-size: 12px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper) {
  background: color-mix(in srgb, var(--panel) 88%, transparent) !important;
  border-color: color-mix(in srgb, var(--panel-border) 78%, transparent) !important;
  color: var(--fg) !important;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner),
:deep(.el-select__selected-item),
:deep(.el-select__placeholder) {
  color: var(--fg) !important;
}

@media (max-width: 1180px) {
  .insights,
  .personalization-grid,
  .workflow-grid,
  .interest-columns,
  .explanation-grid,
  .evolution-grid,
  .shift-grid {
    grid-template-columns: 1fr;
  }

  .kpi-row-wide {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .control-matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .profile-page {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .content {
    padding: 12px;
  }

  .hero {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .control-matrix,
  .summary-strip,
  .activity-strip,
  .workflow-summary-row {
    grid-template-columns: 1fr;
  }

  .hero-title-row,
  .hero-tag-row,
  .hero-sub {
    width: 100%;
  }

  .list-card {
    grid-template-columns: 1fr;
  }

  .list-cover {
    width: 100%;
    height: 180px;
  }
}
</style>
