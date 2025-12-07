<template>
  <div id="app">
    <!-- 顶部导航栏 -->
    <header class="jp-header">
      <div class="jp-logo" @click="switchView('home')">
        JourneyPro
      </div>
      <nav class="jp-nav">
        <button
            class="jp-nav-btn"
            :class="{ active: currentView === 'home' }"
            @click="switchView('home')"
        >
          首页
        </button>
        <button
            class="jp-nav-btn"
            :class="{ active: currentView === 'map' }"
            @click="switchView('map')"
        >
          地图导航
        </button>
        <button
            class="jp-nav-btn"
            :class="{ active: currentView === 'explore' }"
            @click="switchView('explore')"
        >
          旅记广场（小红书区）
        </button>
      </nav>
    </header>

    <!-- 1）首页 -->
    <div v-if="currentView === 'home'" class="jp-home">
      <div class="jp-home-left">
        <h1>JourneyPro · 智能旅程规划</h1>
        <p>
          不只是最短路径，<br />
          还帮你发现沿途的景点、美食和故事。
        </p>
        <div class="jp-home-actions">
          <button class="btn primary" @click="switchView('map')">
            进入地图导航
          </button>
          <button class="btn ghost" @click="switchView('explore')">
            逛逛旅记广场
          </button>
        </div>
      </div>
      <div class="jp-home-right">
        <p>这里以后可以放项目截图、功能介绍卡片之类的内容。</p>
      </div>
    </div>

    <!-- 2）地图页面：就是你原来那一套 -->
    <div v-else-if="currentView === 'map'" class="jp-map-page">
      <RoutePanel />
      <MapContainer />
      <RouteSummary />
      <POIPanel />
    </div>

    <!-- 3）小红书页面：先占位，用 PostBoard -->
    <div v-else class="jp-explore-page">
      <PostBoard />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import RoutePanel from './components/RoutePanel.vue'
import MapContainer from './components/MapContainer.vue'
import RouteSummary from './components/RouteSummary.vue'
import POIPanel from './components/POIPanel.vue'
import PostBoard from './components/PostBoard.vue' // 你自己新建的组件

// 当前显示哪个界面：'home' | 'map' | 'explore'
const currentView = ref('home')

const switchView = (view) => {
  currentView.value = view
}
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

/* 顶部导航 */
.jp-header {
  height: 56px;
  padding: 0 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #eee;
}

.jp-logo {
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
}

.jp-nav {
  display: flex;
  gap: 8px;
}

.jp-nav-btn {
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  color: #555;
}
.jp-nav-btn.active {
  background: #1677ff;
  color: #fff;
}

/* 首页布局 */
.jp-home {
  height: calc(100% - 56px);
  display: flex;
  padding: 40px 60px;
  box-sizing: border-box;
  background: #f5f7fb;
  gap: 40px;
}

.jp-home-left {
  flex: 1;
}

.jp-home-left h1 {
  font-size: 32px;
  margin-bottom: 16px;
}

.jp-home-left p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.jp-home-actions {
  display: flex;
  gap: 16px;
}

.btn {
  border-radius: 999px;
  padding: 10px 22px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
}
.btn.primary {
  background: #1677ff;
  color: #fff;
}
.btn.ghost {
  background: transparent;
  color: #1677ff;
  border-color: #1677ff;
}

.jp-home-right {
  flex: 1;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 35, 52, 0.08);
  padding: 24px;
}

/* 地图页：保持你原来的覆盖布局 */
.jp-map-page {
  height: calc(100% - 56px);
  position: relative;
}

/* 小红书页 */
.jp-explore-page {
  height: calc(100% - 56px);
}
</style>
