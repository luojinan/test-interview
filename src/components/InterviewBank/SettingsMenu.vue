<template>
  <div class="flex items-center">
    <!-- 设置菜单下拉框 -->
    <div class="dropdown dropdown-content">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle" title="设置">
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="inline-block h-5 w-5 stroke-current"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-200 rounded-box z-[1] w-64 p-2 shadow-2xl"
      >
        <!-- 缓存状态信息 -->
        <li class="menu-title">
          <span>缓存状态</span>
        </li>
        <li>
          <div class="p-2 text-sm">
            <div class="flex justify-between items-center mb-1">
              <span>状态:</span>
              <div class="badge" :class="cacheStatus.hasCache ? 'badge-success' : 'badge-warning'">
                {{ cacheStatus.hasCache ? '已缓存' : '无缓存' }}
              </div>
            </div>
            <div v-if="cacheStatus.hasCache" class="space-y-1">
              <div class="flex justify-between text-xs opacity-70">
                <span>版本:</span>
                <span>{{ cacheStatus.version || '未知' }}</span>
              </div>
              <div class="flex justify-between text-xs opacity-70">
                <span>更新时间:</span>
                <span>{{ formatDate(cacheStatus.lastUpdated) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span>状态:</span>
                <span :class="cacheStatus.isExpired ? 'text-warning' : 'text-success'">
                  {{ cacheStatus.isExpired ? '已过期' : '有效' }}
                </span>
              </div>
            </div>
          </div>
        </li>
        
        <div class="divider my-1"></div>
        
        <!-- 缓存管理操作 -->
        <li class="menu-title">
          <span>缓存管理</span>
        </li>
        <li>
          <button 
            @click="showClearExpiredConfirm = true"
            class="btn btn-sm btn-outline btn-warning justify-start"
            :disabled="isOperating"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
            </svg>
            清理过期缓存
          </button>
        </li>
        <li>
          <button 
            @click="showClearAllConfirm = true"
            class="btn btn-sm btn-outline btn-error justify-start"
            :disabled="isOperating"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            清除所有缓存
          </button>
        </li>
        
        <div class="divider my-1"></div>
        
        <!-- 数据管理 -->
        <li class="menu-title">
          <span>数据管理</span>
        </li>
        <li>
          <button 
            @click="refreshCacheStatus"
            class="btn btn-sm btn-ghost justify-start"
            :disabled="isOperating"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            刷新状态
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- 清理过期缓存确认弹窗 -->
  <dialog 
    ref="clearExpiredModal" 
    class="modal" 
    :class="{ 'modal-open': showClearExpiredConfirm }"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">清理过期缓存</h3>
      <p class="py-4">
        此操作将删除所有过期的缓存数据，不会影响有效缓存。
        <br />
        确定要继续吗？
      </p>
      <div class="modal-action">
        <button 
          class="btn btn-ghost" 
          @click="showClearExpiredConfirm = false"
          :disabled="isOperating"
        >
          取消
        </button>
        <button 
          class="btn btn-warning" 
          @click="clearExpiredCache"
          :disabled="isOperating"
        >
          <span v-if="isOperating" class="loading loading-spinner loading-sm"></span>
          确定清理
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="showClearExpiredConfirm = false"></div>
  </dialog>

  <!-- 清除所有缓存确认弹窗 -->
  <dialog 
    ref="clearAllModal" 
    class="modal" 
    :class="{ 'modal-open': showClearAllConfirm }"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4 text-error">清除所有缓存</h3>
      <div class="alert alert-warning mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>此操作将删除所有缓存数据，包括题目数据和用户设置。数据将重新从远程加载。</span>
      </div>
      <p class="py-4">
        确定要清除所有缓存吗？此操作无法撤销。
      </p>
      <div class="modal-action">
        <button 
          class="btn btn-ghost" 
          @click="showClearAllConfirm = false"
          :disabled="isOperating"
        >
          取消
        </button>
        <button 
          class="btn btn-error" 
          @click="clearAllCache"
          :disabled="isOperating"
        >
          <span v-if="isOperating" class="loading loading-spinner loading-sm"></span>
          确定清除
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="showClearAllConfirm = false"></div>
  </dialog>

  <!-- 操作结果提示 -->
  <div v-if="operationResult" class="toast toast-top toast-center z-50">
    <div class="alert" :class="{
      'alert-success': operationResult.type === 'success',
      'alert-error': operationResult.type === 'error',
      'alert-info': operationResult.type === 'info'
    }">
      <span>{{ operationResult.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

// 定义props
interface Props {
  onCacheCleared?: () => void
  onExpiredCacheCleared?: (count: number) => void
}

const props = withDefaults(defineProps<Props>(), {
  onCacheCleared: () => {},
  onExpiredCacheCleared: () => {}
})

// 从父组件注入interviewBank实例
const emit = defineEmits<{
  cacheCleared: []
  expiredCacheCleared: [count: number]
}>()

// 响应式状态
const cacheStatus = ref({
  hasCache: false,
  version: '',
  lastUpdated: new Date(),
  isExpired: false,
  totalSize: 0
})

const isOperating = ref(false)
const showClearExpiredConfirm = ref(false)
const showClearAllConfirm = ref(false)

// 操作结果提示
const operationResult = ref<{
  type: 'success' | 'error' | 'info'
  message: string
} | null>(null)

// 注入useInterviewBank实例（需要在父组件中提供）
import { inject } from 'vue'
import type { UseInterviewBankReturn } from '@/composables/useInterviewBank'

const interviewBank = inject<UseInterviewBankReturn>('interviewBank')

if (!interviewBank) {
  throw new Error('SettingsMenu必须在提供interviewBank的组件中使用')
}

// 计算属性
const formattedCacheStatus = computed(() => {
  if (!cacheStatus.value.hasCache) {
    return '无缓存数据'
  }
  
  const status = cacheStatus.value.isExpired ? '已过期' : '有效'
  const date = formatDate(cacheStatus.value.lastUpdated)
  return `${status} (更新于 ${date})`
})

// 工具函数
function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

function showResult(type: 'success' | 'error' | 'info', message: string) {
  operationResult.value = { type, message }
  setTimeout(() => {
    operationResult.value = null
  }, 3000)
}

// 缓存管理方法
async function refreshCacheStatus() {
  try {
    isOperating.value = true
    const status = await interviewBank.getCacheStatus()
    cacheStatus.value = status
    showResult('info', '缓存状态已刷新')
  } catch (error) {
    console.error('刷新缓存状态失败:', error)
    showResult('error', '刷新缓存状态失败')
  } finally {
    isOperating.value = false
  }
}

async function clearExpiredCache() {
  try {
    isOperating.value = true
    const count = await interviewBank.clearExpiredCache()
    
    if (count > 0) {
      showResult('success', `已清理 ${count} 个过期缓存项`)
      emit('expiredCacheCleared', count)
      props.onExpiredCacheCleared(count)
    } else {
      showResult('info', '没有发现过期缓存')
    }
    
    // 刷新缓存状态
    await refreshCacheStatus()
  } catch (error) {
    console.error('清理过期缓存失败:', error)
    showResult('error', '清理过期缓存失败')
  } finally {
    isOperating.value = false
    showClearExpiredConfirm.value = false
  }
}

async function clearAllCache() {
  try {
    isOperating.value = true
    const success = await interviewBank.clearAllCache()
    
    if (success) {
      showResult('success', '所有缓存已清除，正在重新加载数据...')
      emit('cacheCleared')
      props.onCacheCleared()
      
      // 重新初始化数据
      await interviewBank.initializeData()
    } else {
      showResult('error', '清除缓存失败')
    }
    
    // 刷新缓存状态
    await refreshCacheStatus()
  } catch (error) {
    console.error('清除所有缓存失败:', error)
    showResult('error', '清除所有缓存失败')
  } finally {
    isOperating.value = false
    showClearAllConfirm.value = false
  }
}

// 组件挂载时加载缓存状态
onMounted(async () => {
  await refreshCacheStatus()
})
</script>

<style scoped>
/* 菜单项悬停效果 */
.menu li > *:hover {
  background-color: oklch(var(--b2));
}

/* 下拉菜单动画 */
.dropdown-content {
  transition: all 0.2s ease-in-out;
}

/* Toast通知样式调整 */
.toast {
  pointer-events: none;
}

.toast .alert {
  pointer-events: auto;
}

/* 确保模态框在最顶层 */
.modal {
  z-index: 9999;
}
</style> 