<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式重置 */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#app {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 确保daisyUI主题正确应用 */
:root {
  color-scheme: light dark;
}

/* 优化中文字体显示 */
body {
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif;
  line-height: 1.6;
}

/* 滚动条样式优化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}

/* 深色模式滚动条 */
@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-thumb {
    background: oklch(var(--bc) / 0.3);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: oklch(var(--bc) / 0.4);
  }
}

/* 无障碍优化 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .text-base-content\/70,
  .text-base-content\/60,
  .text-base-content\/50 {
    opacity: 1;
  }
}
</style>