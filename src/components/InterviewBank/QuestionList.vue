<template>
  <div class="question-list">
    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">加载中...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-12">
      <div class="text-error text-6xl mb-4">⚠️</div>
      <p class="text-error font-medium mb-4">{{ error }}</p>
      <button class="btn btn-outline btn-primary" @click="$emit('retry')">
        🔄 重试
      </button>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="questions.length === 0" class="text-center py-12">
      <div class="text-base-content/50 text-6xl mb-4">
        {{ getEmptyIcon() }}
      </div>
      <p class="text-base-content/70 font-medium mb-2">
        {{ getEmptyTitle() }}
      </p>
      <p class="text-base-content/50 text-sm">
        {{ getEmptyDescription() }}
      </p>
    </div>
    
    <!-- 题目列表 -->
    <div v-else class="space-y-4">
      <!-- 列表头部信息 -->
      <div class="flex items-center justify-between mb-6">
        <div class="text-base-content/70">
          <span class="text-lg font-medium">共 {{ questions.length }} 道题目</span>
          <span v-if="currentView !== 'normal'" class="ml-2 text-sm">
            ({{ getViewDescription() }})
          </span>
        </div>
        
        <!-- 排序和筛选 -->
        <div class="flex items-center gap-2">
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
              排序 ▼
            </div>
            <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-[1] w-40 p-2 shadow">
              <li><a @click="handleSort('id')">按编号</a></li>
              <li><a @click="handleSort('createTime')">按创建时间</a></li>
              <li><a @click="handleSort('updateTime')">按更新时间</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 题目卡片列表 -->
      <div class="grid gap-4">
        <QuestionCard
          v-for="question in sortedQuestions"
          :key="question.id"
          :question="question"
          @toggle="handleToggle"
          @bookmark="handleBookmark"
          @edit="handleEdit"
          @restore="handleRestore"
        />
      </div>
      
      <!-- 加载更多 (未来扩展) -->
      <div v-if="hasMore" class="text-center py-6">
        <button class="btn btn-outline btn-primary" @click="$emit('loadMore')">
          加载更多
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Question } from '@/types/interview'
import QuestionCard from './QuestionCard.vue'

// 定义props
interface Props {
  questions: Question[]
  loading?: boolean
  error?: string
  currentView?: 'normal' | 'bookmarks' | 'edited'
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentView: 'normal',
  hasMore: false
})

// 定义emits
const emit = defineEmits<{
  toggle: [questionId: string]
  bookmark: [questionId: string]
  edit: [questionId: string, subject: string, answer: string]
  restore: [questionId: string]
  retry: []
  loadMore: []
}>()

// 排序状态
const sortBy = ref<'id' | 'createTime' | 'updateTime'>('id')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 排序后的题目列表
const sortedQuestions = computed(() => {
  const sorted = [...props.questions].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortBy.value) {
      case 'id':
        aValue = parseInt(a.id)
        bValue = parseInt(b.id)
        break
      case 'createTime':
        aValue = a.createTime.getTime()
        bValue = b.createTime.getTime()
        break
      case 'updateTime':
        aValue = a.updateTime.getTime()
        bValue = b.updateTime.getTime()
        break
      default:
        return 0
    }
    
    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
  
  return sorted
})

// 获取空状态图标
const getEmptyIcon = () => {
  switch (props.currentView) {
    case 'bookmarks':
      return '💔'
    case 'edited':
      return '📝'
    default:
      return '📚'
  }
}

// 获取空状态标题
const getEmptyTitle = () => {
  switch (props.currentView) {
    case 'bookmarks':
      return '暂无收藏的题目'
    case 'edited':
      return '暂无已编辑的题目'
    default:
      return '暂无题目'
  }
}

// 获取空状态描述
const getEmptyDescription = () => {
  switch (props.currentView) {
    case 'bookmarks':
      return '点击题目右上角的心形图标来收藏喜欢的题目'
    case 'edited':
      return '点击题目的编辑按钮来编辑题目内容'
    default:
      return '请尝试切换分类或检查数据加载状态'
  }
}

// 获取视图描述
const getViewDescription = () => {
  switch (props.currentView) {
    case 'bookmarks':
      return '收藏的题目'
    case 'edited':
      return '已编辑的题目'
    default:
      return ''
  }
}

// 处理排序
const handleSort = (field: 'id' | 'createTime' | 'updateTime') => {
  if (sortBy.value === field) {
    // 切换排序顺序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 切换排序字段
    sortBy.value = field
    sortOrder.value = 'asc' // 阅读量默认降序
  }
}

// 事件处理
const handleToggle = (questionId: string) => {
  emit('toggle', questionId)
}

const handleBookmark = (questionId: string) => {
  emit('bookmark', questionId)
}

const handleEdit = (questionId: string, subject: string, answer: string) => {
  emit('edit', questionId, subject, answer)
}

const handleRestore = (questionId: string) => {
  emit('restore', questionId)
}
</script>

<style scoped>
.question-list {
  @apply w-full max-w-none;
}

/* 响应式网格布局 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* 大屏幕可以考虑两列布局 */
@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(1, 1fr);
  }
}

/* 超大屏幕可以考虑两列布局 */
@media (min-width: 1536px) {
  .grid {
    grid-template-columns: repeat(1, 1fr);
  }
}

/* 加载状态动画 */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 空状态样式 */
.text-center {
  text-align: center;
}

/* 排序下拉菜单样式 */
.dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content {
  display: none;
}

.dropdown:focus-within .dropdown-content {
  display: block;
}

/* 题目卡片进入动画 */
.grid > * {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式间距 */
@media (max-width: 768px) {
  .space-y-4 > * + * {
    margin-top: 0.75rem;
  }
  
  .mb-6 {
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .space-y-4 > * + * {
    margin-top: 0.5rem;
  }
  
  .grid {
    gap: 0.5rem;
  }
}

/* 滚动优化 */
.question-list {
  scroll-behavior: smooth;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .text-base-content\/70,
  .text-base-content\/50 {
    opacity: 1;
  }
}
</style> 