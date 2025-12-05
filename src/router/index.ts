import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue') },
  {
    path: '/dataView',
    name: 'DataView',
    component: () => import('../views/DataView/index.vue'),
  },
  {
    path: '/dataRequest',
    name: 'DataRequest',
    component: () => import('../views/DataRequest.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
