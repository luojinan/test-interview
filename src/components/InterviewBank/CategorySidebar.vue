<template>
  <div class="flex flex-col bg-base-200 border-r border-base-300 h-full" style="width: 280px; min-width: 280px;">
    <!-- 顶部标题和主题切换 -->
    <div class="p-4 border-b border-base-300">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-base-content">📚 面试题库</h1>
        <div class="flex items-center space-x-2">
          <SettingsMenu @cache-cleared="handleCacheCleared" @expired-cache-cleared="handleExpiredCacheCleared" />
          <ThemeToggle @theme-change="handleThemeChange" />
        </div>
      </div>
      
      <!-- 搜索框 -->
      <div class="form-control">
        <div class="input-group">
          <input 
            type="text" 
            placeholder="搜索题目..." 
            class="input input-bordered input-sm w-full focus:border-primary focus:ring-1 focus:ring-primary"
            :value="searchQuery"
            @input="handleSearch"
          />
          <button class="btn btn-square btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 分类菜单 -->
    <div class="p-2">
      <ul class="menu menu-compact">
        <!-- 全部分类 -->
        <li>
          <a 
            class="menu-item transition-all duration-200 hover:bg-base-300"
            :class="{ 'bg-primary text-primary-content font-medium': currentCategoryId === '' }"
            @click="selectCategory('')"
          >
            <span class="text-lg">📋</span>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span>全部题目</span>
                <span class="badge badge-ghost badge-sm" :class="{ 'badge-primary-content': currentCategoryId === '' }">{{ totalQuestions }}</span>
              </div>
            </div>
          </a>
        </li>
        
        <!-- 分类列表 -->
        <li v-for="category in categories" :key="category.id">
          <a 
            class="menu-item transition-all duration-200 hover:bg-base-300"
            :class="{ 'bg-primary text-primary-content font-medium': currentCategoryId === category.id }"
            @click="selectCategory(category.id)"
          >
            <span class="text-lg">{{ category.icon }}</span>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span>{{ category.name }}</span>
                <span class="badge badge-ghost badge-sm" :class="{ 'badge-primary-content': currentCategoryId === category.id }">{{ category.questionCount }}</span>
              </div>
            </div>
          </a>
        </li>
        
        <!-- 分隔线 -->
        <div class="my-2 h-px bg-base-300 border-none"></div>
        
        <!-- 收藏夹 -->
        <li>
          <a 
            class="menu-item transition-all duration-200 hover:bg-base-300"
            :class="{ 'bg-primary text-primary-content font-medium': currentView === 'bookmarks' }"
            @click="selectSpecialView('bookmarks')"
          >
            <span class="text-lg">❤️</span>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span>我的收藏</span>
                <span class="badge badge-error badge-sm" :class="{ 'badge-primary-content': currentView === 'bookmarks' }">{{ bookmarkedCount }}</span>
              </div>
            </div>
          </a>
        </li>
        
        <!-- 已编辑 -->
        <li>
          <a 
            class="menu-item transition-all duration-200 hover:bg-base-300"
            :class="{ 'bg-primary text-primary-content font-medium': currentView === 'edited' }"
            @click="selectSpecialView('edited')"
          >
            <span class="text-lg">✏️</span>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span>已编辑</span>
                <span class="badge badge-warning badge-sm" :class="{ 'badge-primary-content': currentView === 'edited' }">{{ editedCount }}</span>
              </div>
            </div>
          </a>
        </li>
      </ul>
    </div>
    
    <!-- 底部统计信息 -->
    <div class="mt-auto p-4 border-t border-base-300">
      <div class="stats stats-vertical shadow-sm bg-base-100 rounded-lg">
        <div class="stat py-2 text-center">
          <div class="stat-title text-xs">总题目数</div>
          <div class="stat-value text-lg">{{ totalQuestions }}</div>
        </div>
        <div class="stat py-2 text-center">
          <div class="stat-title text-xs">已收藏</div>
          <div class="stat-value text-lg text-error">{{ bookmarkedCount }}</div>
        </div>
        <div class="stat py-2 text-center">
          <div class="stat-title text-xs">已编辑</div>
          <div class="stat-value text-lg text-warning">{{ editedCount }}</div>
        </div>
      </div>
      
      <!-- 导出数据按钮 -->
      <div class="mt-4">
        <button 
          class="btn btn-outline btn-block btn-sm hover:border-primary hover:bg-primary hover:text-primary-content"
          @click="handleExport"
        >
          📤 导出数据
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '@/types/interview'
import ThemeToggle from './ThemeToggle.vue'
import SettingsMenu from './SettingsMenu.vue'

// 定义props
interface Props {
  categories: Category[]
  currentCategoryId: string
  currentView?: 'normal' | 'bookmarks' | 'edited'
  totalQuestions: number
  bookmarkedCount: number
  editedCount: number
  searchQuery: string
}

const props = withDefaults(defineProps<Props>(), {
  currentView: 'normal'
})

// 定义emits
const emit = defineEmits<{
  categoryChange: [categoryId: string]
  viewChange: [view: 'normal' | 'bookmarks' | 'edited']
  search: [query: string]
  themeChange: [theme: 'light' | 'dark' | 'auto']
  export: []
  cacheCleared: []
  expiredCacheCleared: []
}>()

// 选择分类
const selectCategory = (categoryId: string) => {
  emit('categoryChange', categoryId)
  emit('viewChange', 'normal')
}

// 选择特殊视图
const selectSpecialView = (view: 'bookmarks' | 'edited') => {
  emit('viewChange', view)
  emit('categoryChange', '') // 清空分类选择
}

// 处理搜索
const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('search', target.value)
}

// 处理主题变化
const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
  emit('themeChange', theme)
}

// 处理数据导出
const handleExport = () => {
  emit('export')
}

// 处理缓存清除
const handleCacheCleared = () => {
  emit('cacheCleared')
}

// 处理过期缓存清除
const handleExpiredCacheCleared = () => {
  emit('expiredCacheCleared')
}
</script>

<style scoped>
/* 滚动条样式 */
.category-sidebar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--bc) / 0.2) transparent;
}

.category-sidebar::-webkit-scrollbar {
  width: 6px;
}

.category-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.category-sidebar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--bc) / 0.2);
  border-radius: 3px;
}

.category-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--bc) / 0.3);
}

/* 菜单项样式 */
.menu-item {
  border-radius: 0.5rem;
  margin-bottom: 0.25rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: hsl(var(--bc));
  background-color: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background-color: hsl(var(--b3));
  transform: translateX(2px);
}

.menu-item.active {
  background-color: hsl(var(--p));
  color: hsl(var(--pc));
  font-weight: 600;
}

/* 输入框和按钮的 focus 样式 */
.input:focus {
  outline: none;
  border-color: hsl(var(--p));
  box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.btn:focus {
  outline: none;
}

/* 徽章样式优化 */
.badge {
  font-size: 0.75rem;
  font-weight: 500;
}

/* 统计卡片样式 */
.stats {
  background: linear-gradient(135deg, hsl(var(--b1)), hsl(var(--b2)));
}

.stat-value {
  font-weight: 700;
}

/* 响应式调整 */
@media (max-width: 1023px) {
  .category-sidebar {
    width: 100% !important;
    min-width: 100% !important;
  }
}
</style>
