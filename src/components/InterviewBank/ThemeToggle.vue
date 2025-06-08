<template>
  <div class="flex items-center">
    <!-- daisyUI主题切换器 -->
    <div class="dropdown dropdown-end">
      <div 
        ref="dropdownButton"
        tabindex="0" 
        role="button" 
        class="btn btn-ghost btn-circle"
      >
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
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V5z"
          ></path>
        </svg>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-200 rounded-box z-[1] w-52 p-2 shadow-2xl"
      >
        <li>
          <input
            type="radio"
            name="theme-dropdown"
            class="theme-controller btn btn-sm btn-block btn-ghost justify-start"
            aria-label="Light"
            value="light"
            :checked="currentTheme === 'light'"
            @change="switchTheme('light')"
          />
        </li>
        <li>
          <input
            type="radio"
            name="theme-dropdown"
            class="theme-controller btn btn-sm btn-block btn-ghost justify-start"
            aria-label="Dark"
            value="dark"
            :checked="currentTheme === 'dark'"
            @change="switchTheme('dark')"
          />
        </li>
        <li>
          <input
            type="radio"
            name="theme-dropdown"
            class="theme-controller btn btn-sm btn-block btn-ghost justify-start"
            aria-label="Auto"
            value="cupcake"
            :checked="currentTheme === 'auto'"
            @change="switchTheme('auto')"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

// 定义props
interface Props {
  theme?: 'light' | 'dark' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'auto'
})

// 定义emits
const emit = defineEmits<{
  themeChange: [theme: 'light' | 'dark' | 'auto']
}>()

// 当前主题
const currentTheme = ref<'light' | 'dark' | 'auto'>(props.theme)

// 下拉菜单按钮引用
const dropdownButton = ref<HTMLElement>()

// 应用主题到DOM
const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  const html = document.documentElement
  
  if (theme === 'auto') {
    // 自动模式：根据系统偏好
    const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', isDarkPreferred ? 'dark' : 'light')
  } else {
    // 手动模式
    html.setAttribute('data-theme', theme)
  }
}

// 切换主题
const switchTheme = (theme: 'light' | 'dark' | 'auto') => {
  currentTheme.value = theme
  applyTheme(theme)
  emit('themeChange', theme)
  
  // 保存到localStorage
  localStorage.setItem('interview_bank_theme', theme)
  
  // 关闭下拉菜单 - 移除焦点以关闭dropdown
  if (dropdownButton.value) {
    dropdownButton.value.blur()
  }
  
  // 备用方法：如果上述方法不生效，使用document.activeElement.blur()
  setTimeout(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, 100)
}

// 监听系统主题变化（仅在auto模式下）
const handleSystemThemeChange = (e: MediaQueryListEvent) => {
  if (currentTheme.value === 'auto') {
    applyTheme('auto')
  }
}

// 监听props变化
watch(() => props.theme, (newTheme) => {
  currentTheme.value = newTheme
  applyTheme(newTheme)
})

// 组件挂载时初始化
onMounted(() => {
  // 从localStorage恢复主题
  const savedTheme = localStorage.getItem('interview_bank_theme') as 'light' | 'dark' | 'auto' | null
  if (savedTheme) {
    currentTheme.value = savedTheme
  }
  
  // 应用主题
  applyTheme(currentTheme.value)
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleSystemThemeChange)
  
  // 清理函数
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  })
})
</script>

<style scoped>
/* 自定义主题切换器样式 */
.theme-controller {
  --btn-color: oklch(var(--bc));
  --btn-bg: transparent;
}

.theme-controller[aria-label="Light"]::before {
  content: "☀️";
  margin-right: 8px;
}

.theme-controller[aria-label="Dark"]::before {
  content: "🌙";
  margin-right: 8px;
}

.theme-controller[aria-label="Auto"]::before {
  content: "🔄";
  margin-right: 8px;
}

.theme-controller:checked {
  background-color: oklch(var(--p));
  color: oklch(var(--pc));
}
</style> 