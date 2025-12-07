<template>
  <div id="app">
    <!-- 顶部导航 -->
    <header class="jp-header">
      <div class="jp-logo">
        <RouterLink to="/">JourneyPro</RouterLink>
      </div>
      <nav class="jp-nav">
        <RouterLink to="/home" class="jp-nav-link">首页</RouterLink>
        <RouterLink to="/map" class="jp-nav-link">地图导航</RouterLink>
        <RouterLink to="/posts" class="jp-nav-link">帖子广场</RouterLink>
      </nav>
    </header>

    <!-- 下面根据 URL 显示对应页面 -->
    <main class="jp-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
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

.jp-logo a {
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  color: #222;
}

.jp-nav {
  display: flex;
  gap: 12px;
}

.jp-nav-link {
  text-decoration: none;
  color: #555;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 999px;
}

/* 当前激活路由的样式（vue-router 自带类名） */
.jp-nav-link.router-link-active {
  background: #1677ff;
  color: #fff;
}

.jp-main {
  height: calc(100% - 56px);
}
.jp-main > * {
  height: 100%;
}
</style>
