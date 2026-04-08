<template>
  <div class="post-page">
    <PostBoard />
    <AdPopupModal placement="posts" />
  </div>
</template>

<script setup>
import PostBoard from '../components/PostBoard.vue'
import AdPopupModal from '../components/AdPopupModal.vue'
</script>

<style scoped>
.post-page {
  height: 100%;
}
</style>
