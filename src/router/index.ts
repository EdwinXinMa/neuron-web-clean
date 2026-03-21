import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/login/index.vue'

const routes = [
  { path: '/login', component: LoginPage, meta: { layout: 'none' } },
  { path: '/', redirect: '/overview' },
  { path: '/overview', component: () => import('../views/overview/index.vue') },
  { path: '/devices', component: () => import('../views/devices/index.vue') },
  { path: '/alerts', component: () => import('../views/alerts/index.vue') },
  { path: '/oplog', component: () => import('../views/oplog/index.vue') },
  { path: '/management', component: () => import('../views/management/index.vue') },
  { path: '/accounts', component: () => import('../views/accounts/index.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫：无 token 跳登录
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
