<template>
  <div class="home">
    <div class="home-left">
      <h1>JourneyPro · 智能旅程规划</h1>
      <p>
        不只是最短路径，<br />
        还帮你发现沿途的景点、美食和故事。
      </p>
      <div class="home-actions">
        <RouterLink to="/map" class="btn primary">
          进入地图导航
        </RouterLink>
        <RouterLink to="/posts" class="btn ghost">
          逛逛帖子广场
        </RouterLink>
      </div>
    </div>
    <div class="home-right">
      <p>这里以后可以放项目截图或功能介绍。</p>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.home {
  height: 100%;
  display: flex;
  padding: 40px 60px;
  box-sizing: border-box;
  background: #f5f7fb;
  gap: 40px;
}

.home-left {
  flex: 1;
}

.home-left h1 {
  font-size: 32px;
  margin-bottom: 16px;
}

.home-left p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.home-actions {
  display: flex;
  gap: 16px;
}

.btn {
  display: inline-block;
  text-decoration: none;
  border-radius: 999px;
  padding: 10px 22px;
  border: 1px solid transparent;
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

.home-right {
  flex: 1;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 35, 52, 0.08);
  padding: 24px;
}
</style>
