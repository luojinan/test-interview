import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/interview-bank'
    },
    {
      path: '/interview-bank',
      name: 'interview-bank',
      component: () => import('../views/InterviewBankView.vue'),
      meta: {
        title: '面试题库'
      }
    }
  ],
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 面试题库系统`
  } else {
    document.title = '面试题库系统'
  }
  next()
})

export default router
