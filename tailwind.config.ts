import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 扩展颜色配置，确保 DaisyUI 主题颜色可用
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'border-expand': 'borderExpand 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        borderExpand: {
          '0%': { width: '0' },
          '100%': { width: '80%' },
        },
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
}

// DaisyUI 配置
;(config as any).daisyui = {
  themes: [
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
  ],
  darkTheme: 'dark', // 默认深色主题
  base: true, // 应用基础样式
  styled: true, // 应用组件样式
  utils: true, // 应用实用工具类
  prefix: '', // 无前缀
  logs: true, // 启用日志
}

export default config 