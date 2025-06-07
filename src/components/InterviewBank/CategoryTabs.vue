<template>
  <div class="category-tabs bg-base-100 border-b border-base-300 sticky top-0 z-10">
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between p-4 border-b border-base-300/50">
      <!-- 标题和主题切换 -->
      <div class="flex items-center gap-3">
        <h1 class="text-lg md:text-base font-bold text-base-content">📚 面试题库</h1>
        <ThemeToggle @theme-change="handleThemeChange" />
      </div>
      
      <!-- 搜索按钮 -->
      <button 
        class="btn btn-ghost btn-sm btn-circle"
        @click="toggleSearch"
        :class="{ 'btn-active': showSearch }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
    
    <!-- 搜索栏 -->
    <div 
      v-if="showSearch"
      class="p-4 border-b border-base-300/50"
    >
      <div class="form-control">
        <div class="input-group">
          <input 
            ref="searchInputRef"
            type="text" 
            placeholder="搜索题目或答案..." 
            class="input input-bordered input-sm w-full"
            :value="searchQuery"
            @input="handleSearch"
          />
          <button 
            class="btn btn-square btn-sm"
            @click="clearSearch"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
    
    <!-- 分类标签页 -->
    <div class="overflow-x-auto">
      <div role="tablist" class="tabs tabs-bordered w-max min-w-full px-2">
        <!-- 全部题目 -->
        <a 
          role="tab" 
          class="tab whitespace-nowrap px-3 py-2 text-sm md:px-2 md:text-xs md:px-4 transition-all duration-200 hover:bg-base-200 active:bg-base-300 active:scale-95"
          :class="{ 
            'tab-active border-primary text-primary font-medium': currentCategoryId === '' && currentView === 'normal' 
          }"
          @click="selectCategory('')"
        >
          <span class="mr-1">📋</span>
          <span class="md:text-xs">全部</span>
          <span 
            class="badge badge-ghost badge-sm ml-1 md:badge-xs"
            :class="{ 
              'badge-primary text-primary-content': currentCategoryId === '' && currentView === 'normal' 
            }"
          >{{ totalQuestions }}</span>
        </a>
        
        <!-- 分类标签 -->
        <a 
          v-for="category in categories" 
          :key="category.id"
          role="tab" 
          class="tab whitespace-nowrap px-3 py-2 text-sm md:px-2 md:text-xs md:px-4 transition-all duration-200 hover:bg-base-200 active:bg-base-300 active:scale-95"
          :class="{ 
            'tab-active border-primary text-primary font-medium': currentCategoryId === category.id && currentView === 'normal' 
          }"
          @click="selectCategory(category.id)"
        >
          <span class="mr-1">{{ category.icon }}</span>
          <span class="md:text-xs">{{ category.name }}</span>
          <span 
            class="badge badge-ghost badge-sm ml-1 md:badge-xs"
            :class="{ 
              'badge-primary text-primary-content': currentCategoryId === category.id && currentView === 'normal' 
            }"
          >{{ category.questionCount }}</span>
        </a>
        
        <!-- 收藏夹 -->
        <a 
          role="tab" 
          class="tab whitespace-nowrap px-3 py-2 text-sm md:px-2 md:text-xs md:px-4 transition-all duration-200 hover:bg-base-200 active:bg-base-300 active:scale-95"
          :class="{ 
            'tab-active border-primary text-primary font-medium': currentView === 'bookmarks' 
          }"
          @click="selectSpecialView('bookmarks')"
        >
          <span class="mr-1">❤️</span>
          <span class="md:text-xs">收藏</span>
          <span 
            class="badge badge-error badge-sm ml-1 md:badge-xs"
            :class="{ 
              'badge-primary text-primary-content': currentView === 'bookmarks' 
            }"
          >{{ bookmarkedCount }}</span>
        </a>
        
        <!-- 已编辑 -->
        <a 
          role="tab" 
          class="tab whitespace-nowrap px-3 py-2 text-sm md:px-2 md:text-xs md:px-4 transition-all duration-200 hover:bg-base-200 active:bg-base-300 active:scale-95"
          :class="{ 
            'tab-active border-primary text-primary font-medium': currentView === 'edited' 
          }"
          @click="selectSpecialView('edited')"
        >
          <span class="mr-1">✏️</span>
          <span class="md:text-xs">已编辑</span>
          <span 
            class="badge badge-warning badge-sm ml-1 md:badge-xs"
            :class="{ 
              'badge-primary text-primary-content': currentView === 'edited' 
            }"
          >{{ editedCount }}</span>
        </a>
      </div>
    </div>
    
    <!-- 当前分类信息 -->
    <div v-if="currentCategory || currentView !== 'normal'" class="px-4 py-2 bg-base-200/50">
      <div class="flex items-center justify-between text-sm text-base-content/70">
        <div class="flex items-center gap-2">
          <span v-if="currentView === 'normal' && currentCategory">
            {{ currentCategory.icon }} {{ currentCategory.name }}
          </span>
          <span v-else-if="currentView === 'bookmarks'">
            ❤️ 我的收藏
          </span>
          <span v-else-if="currentView === 'edited'">
            ✏️ 已编辑题目
          </span>
          <span v-else>
            📋 全部题目
          </span>
        </div>
        
        <!-- 当前显示数量 -->
        <div class="flex items-center gap-4">
          <span>{{ getCurrentCount() }} 道题目</span>
          
          <!-- 导出按钮 -->
          <button 
            class="btn btn-ghost btn-xs"
            @click="handleExport"
          >
            📤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Category } from '@/types/interview'
import ThemeToggle from './ThemeToggle.vue'

// 定义props
interface Props {
  categories: Category[]
  currentCategoryId: string
  currentView?: 'normal' | 'bookmarks' | 'edited'
  totalQuestions: number
  bookmarkedCount: number
  editedCount: number
  searchQuery: string
  currentQuestionsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentView: 'normal',
  currentQuestionsCount: 0
})

// 定义emits
const emit = defineEmits<{
  categoryChange: [categoryId: string]
  viewChange: [view: 'normal' | 'bookmarks' | 'edited']
  search: [query: string]
  themeChange: [theme: 'light' | 'dark' | 'auto']
  export: []
}>()

// 搜索相关状态
const showSearch = ref(false)
const searchInputRef = ref<HTMLInputElement>()

// 计算属性
const currentCategory = computed(() => 
  props.categories.find(cat => cat.id === props.currentCategoryId)
)

// 获取当前显示的题目数量
const getCurrentCount = () => {
  if (props.currentView === 'bookmarks') {
    return props.bookmarkedCount
  } else if (props.currentView === 'edited') {
    return props.editedCount
  } else if (props.currentCategoryId === '') {
    return props.totalQuestions
  } else {
    return currentCategory.value?.questionCount || 0
  }
}

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

// 切换搜索框显示
const toggleSearch = async () => {
  showSearch.value = !showSearch.value
  
  if (showSearch.value) {
    // 显示搜索框时自动聚焦
    await nextTick()
    searchInputRef.value?.focus()
  } else {
    // 隐藏搜索框时清空搜索内容
    emit('search', '')
  }
}

// 处理搜索
const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('search', target.value)
}

// 清空搜索
const clearSearch = () => {
  emit('search', '')
  searchInputRef.value?.focus()
}

// 处理主题变化
const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
  emit('themeChange', theme)
}

// 处理数据导出
const handleExport = () => {
  emit('export')
}
</script>

<style scoped>
.category-tabs {
  /* 确保在移动端固定在顶部 */
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 标签页水平滚动样式 */
.overflow-x-auto {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.overflow-x-auto::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* 搜索框动画 */
.form-control {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端激活触摸效果的过渡 */
@media (max-width: 768px) {
  .tab:active {
    transition: all 0.1s ease;
  }
}

/* 激活状态的标签页指示 */
.tab-active {
  position: relative;
}

.tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 2px;
  background-color: currentColor;
  animation: borderExpand 0.3s ease-out;
}

@keyframes borderExpand {
  from {
    width: 0;
  }
  to {
    width: 80%;
  }
}
</style>