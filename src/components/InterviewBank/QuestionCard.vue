<template>
  <div 
    class="collapse bg-base-100 border border-base-300 rounded-lg mb-4 shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary/30 hover:scale-[1.01] hover:origin-center"
    :class="{ 
      'collapse-open border-primary/40 shadow-md': question.isExpanded 
    }"
  >
    <!-- 题目标题区域 -->
    <div 
      class="collapse-title cursor-pointer p-4 transition-all duration-200 hover:bg-base-200/50 active:scale-[0.99]"
      :class="{ 'bg-primary/5': question.isExpanded }"
      @click="handleToggle"
    >
      <div class="flex items-start justify-between">
        <!-- 题目标题和状态 -->
        <div class="flex-1 pr-4">
          <div class="flex items-center gap-2 mb-2">
            <!-- 题目编号 -->
            <span class="badge badge-outline badge-sm">{{ question.id }}</span>
            
            <!-- 已编辑标记 -->
            <span 
              v-if="question.isEdited" 
              class="badge badge-warning badge-sm transition-all duration-200 hover:scale-105"
              title="已编辑"
            >
              ✏️ 已编辑
            </span>
            
            <!-- 收藏状态 -->
            <span 
              v-if="question.isBookmarked" 
              class="badge badge-error badge-sm transition-all duration-200 hover:scale-105"
              title="已收藏"
            >
              ❤️ 收藏
            </span>
          </div>
          
          <!-- 题目内容 -->
          <div class="text-base font-medium text-base-content">
            {{ question.subject }}
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex-shrink-0 flex items-center gap-2">
          <!-- 收藏按钮 -->
          <button 
            class="btn btn-ghost btn-sm btn-circle hover:scale-110 active:scale-95 transition-transform duration-200"
            :class="{ 
              'text-error hover:bg-error/10': question.isBookmarked 
            }"
            @click.stop="handleBookmark"
            :title="question.isBookmarked ? '取消收藏' : '收藏'"
          >
            {{ question.isBookmarked ? '❤️' : '🤍' }}
          </button>
          
          <!-- 编辑按钮 -->
          <button 
            class="btn btn-ghost btn-sm btn-circle hover:scale-110 active:scale-95 transition-transform duration-200"
            @click.stop="handleEdit"
            title="编辑"
          >
            ✏️
          </button>
          
          <!-- 展开/折叠指示器 -->
          <div class="text-base-content/60">
            <svg 
              class="w-4 h-4 transition-transform duration-300"
              :class="{ 'rotate-180': question.isExpanded }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 答案内容区域 -->
    <div 
      v-if="question.isExpanded"
      class="collapse-content px-4 pb-4 animate-slideDown"
    >
      <div class="border-t border-base-300 pt-4">
        <!-- 答案内容 -->
        <div class="prose prose-sm max-w-none text-base-content">
          <div class="whitespace-pre-wrap text-sm leading-relaxed">
            {{ question.answer }}
          </div>
        </div>
        
        <!-- 操作区域 -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-base-300/50">
          <!-- 时间信息 -->
          <div class="text-xs text-base-content/60 space-y-1 animate-fadeInLeft">
            <div>创建时间: {{ formatDate(question.createTime) }}</div>
            <div v-if="question.isEdited && question.editedAt">
              编辑时间: {{ formatDate(question.editedAt) }}
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex gap-2">
            <!-- 恢复原始内容按钮 -->
            <button 
              v-if="question.isEdited"
              class="btn btn-outline btn-sm animate-fadeInUp"
              @click="handleRestore"
            >
              🔄 恢复原始
            </button>
            
            <!-- 分享按钮 -->
            <button 
              class="btn btn-outline btn-sm animate-fadeInUp animate-delay-100"
              @click="handleShare"
            >
              📤 分享
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 编辑模态框 -->
  <dialog 
    ref="editModalRef" 
    class="modal"
  >
    <div class="modal-box w-11/12 max-w-4xl animate-modalSlideIn">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      
      <h3 class="font-bold text-lg mb-4">编辑题目</h3>
      
      <!-- 编辑表单 -->
      <div class="space-y-4">
        <!-- 题目编辑 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">题目内容</span>
          </label>
          <textarea 
            v-model="editForm.subject"
            class="textarea textarea-bordered h-24 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
            placeholder="请输入题目内容"
          ></textarea>
        </div>
        
        <!-- 答案编辑 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">答案内容</span>
          </label>
          <textarea 
            v-model="editForm.answer"
            class="textarea textarea-bordered h-48 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
            placeholder="请输入答案内容"
          ></textarea>
        </div>
      </div>
      
      <!-- 模态框操作按钮 -->
      <div class="modal-action">
        <button 
          class="btn btn-outline"
          @click="cancelEdit"
        >
          取消
        </button>
        <button 
          class="btn btn-primary"
          @click="confirmEdit"
          :disabled="!editForm.subject.trim() || !editForm.answer.trim()"
        >
          保存
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { Question } from '@/types/interview'

// 定义props
interface Props {
  question: Question
}

const props = defineProps<Props>()

// 定义emits
const emit = defineEmits<{
  toggle: [questionId: string]
  bookmark: [questionId: string]
  edit: [questionId: string, subject: string, answer: string]
  restore: [questionId: string]
}>()

// 编辑模态框引用
const editModalRef = ref<HTMLDialogElement>()

// 编辑表单数据
const editForm = reactive({
  subject: '',
  answer: ''
})

// 格式化日期
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 处理展开/折叠
const handleToggle = () => {
  emit('toggle', props.question.id)
}

// 处理收藏
const handleBookmark = () => {
  emit('bookmark', props.question.id)
}

// 处理编辑
const handleEdit = () => {
  // 初始化编辑表单
  editForm.subject = props.question.subject
  editForm.answer = props.question.answer
  
  // 显示模态框
  editModalRef.value?.showModal()
}

// 确认编辑
const confirmEdit = () => {
  if (editForm.subject.trim() && editForm.answer.trim()) {
    emit('edit', props.question.id, editForm.subject.trim(), editForm.answer.trim())
    editModalRef.value?.close()
  }
}

// 取消编辑
const cancelEdit = () => {
  editModalRef.value?.close()
}

// 处理恢复
const handleRestore = () => {
  if (confirm('确定要恢复到原始内容吗？这将丢失所有编辑。')) {
    emit('restore', props.question.id)
  }
}

// 处理分享
const handleShare = async () => {
  const shareText = `题目：${props.question.subject}\n\n答案：${props.question.answer}`
  
  try {
    if (navigator.share) {
      // 使用原生分享API
      await navigator.share({
        title: '面试题分享',
        text: shareText
      })
    } else {
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareText)
      // 这里可以添加一个toast提示
      alert('内容已复制到剪贴板')
    }
  } catch (error) {
    console.warn('分享失败:', error)
  }
}
</script>

<style scoped>
/* 展开/折叠状态控制 */
.collapse:not(.collapse-open) .collapse-content {
  display: none;
}

.collapse.collapse-open .collapse-content {
  display: block;
}

/* 动画关键帧 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scaleY(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 动画工具类 */
.animate-slideDown {
  animation: slideDown 0.3s ease-out;
  transform-origin: top;
}

.animate-fadeInLeft {
  animation: fadeInLeft 0.4s ease-out 0.1s both;
}

.animate-fadeInUp {
  animation: fadeInUp 0.4s ease-out both;
}

.animate-delay-100 {
  animation-delay: 0.1s;
}

.animate-modalSlideIn {
  animation: modalSlideIn 0.3s ease-out;
}

/* 答案内容样式 */
.prose {
  color: inherit;
}

.prose pre {
  background-color: oklch(var(--b2));
  color: oklch(var(--bc));
}

/* 响应式优化 */
@media (max-width: 768px) {
  .collapse:hover {
    transform: none; /* 移动端不要缩放效果 */
  }
  
  .btn-circle:hover {
    transform: none; /* 移动端按钮不要缩放 */
  }
  
  /* 移动端长按效果 */
  .collapse-title:active {
    background-color: oklch(var(--b2) / 0.7);
    transform: scale(0.98);
    transition: all 0.1s ease;
  }
}

/* 高对比度模式优化 */
@media (prefers-contrast: high) {
  .collapse {
    border-width: 2px;
  }
  
  .collapse.collapse-open {
    border-color: oklch(var(--p));
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .collapse,
  .collapse-content,
  .btn-circle,
  .badge,
  .animate-slideDown,
  .animate-fadeInLeft,
  .animate-fadeInUp,
  .animate-modalSlideIn {
    animation: none;
    transition: none;
  }
  
  .transition-transform {
    transition: none;
  }
}

/* 深色模式优化 */
@media (prefers-color-scheme: dark) {
  .collapse:hover {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
}
</style> 