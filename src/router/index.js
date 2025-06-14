import {
  createRouter,
  createWebHistory
} from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue' // 直接导入 Home 组件

const routes = [{
    path: '/login',
    name: 'Login',
    component: Login
  },

  {
    path: '/',
    component: Home, // Home 作为布局组件
    meta: {
      requiresAuth: true
    },
    children: [ 
      // 添加一个默认子路由，用于显示 Home 页面的初始内容
      // 如果你希望 '/' 直接显示 Home 的欢迎信息，可以不加这个默认子路由
      // 但保留 Home.vue 中的 v-if="isHomePage" 逻辑
      // 或者创建一个 Dashboard.vue 组件专门显示欢迎信息
      // {
      //   path: '', // 默认子路由，匹配 '/'
      //   name: 'Dashboard', // 或者叫 HomeContent
      //   component: () => import('../views/Dashboard.vue'), // 需要创建这个组件
      //   meta: { requiresAuth: true }
      // },
      {
        // 首页本身的路径，如果需要区分 Home 布局和 Home 内容页
        // 如果 Home.vue 的 <main> 部分就是首页内容，则不需要这个
        path: '', // 匹配 '/'
        name: 'HomeContent', // 给它一个名字，虽然可能不直接导航到它
        // 注意：这里不需要 component，因为 Home.vue 自身会处理 '/' 路径的显示逻辑
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'monitor/realtime', // 相对路径，完整路径是 /monitor/realtime
        name: 'MonitorRealtime',
        component: () => import('../views/monitor/RealTimeData.vue'), // 确保此组件存在
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'data/history', // 相对路径，完整路径是 /data/history
        name: 'DataHistory',
        component: () => import('../views/datacenter/HistoricalData.vue'), // 确保此组件存在
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'data/alarm', // 相对路径，完整路径是 /data/alarm
        name: 'DataAlarm',
        component: () => import('../views/datacenter/AlarmData.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'management', // 新增的用户管理页面路由
        name: 'UserManagement',
        component: () => import('../views/UserManagement.vue'), 
        meta: { requiresAuth: true }
      }
      // ...可以添加更多子路由
    ]
  },
  // 移除之前独立的 /monitor 和 /data 路由，以及它们的子路由
  // 因为它们现在嵌套在 '/' 下面了

  // 路由匹配失败时重定向到登录页 (如果未登录) 或首页 (如果已登录)
  {
    path: '/:pathMatch(.*)*',
    redirect: to => {
      // 根据登录状态决定重定向目标
      const token = localStorage.getItem('token');
      return token ? '/' : '/login';
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫，检查用户是否已登录
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  // 检查token是否过期（可选）
  if (token) {
    try {
      // 解析JWT token检查过期时间
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      if (payload.exp && payload.exp < currentTime) {
        // token已过期，清除并重定向到登录页
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (to.meta.requiresAuth) {
          next('/login')
          return
        }
      }
    } catch (error) {
      console.error('Token解析失败:', error)
      // token格式错误，清除
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (to.meta.requiresAuth) {
        next('/login')
        return
      }
    }
  }

  if (to.meta.requiresAuth && !token) {
    // 需要登录但未登录，重定向到登录页
    next('/login')
  } else if (to.path === '/login' && token) {
    // 已登录但访问登录页，重定向到首页
    next('/')
  } else if (to.matched.length === 0 && token) {
    // 已登录但访问不存在的路径，重定向到首页
    console.warn(`路由未匹配: ${to.path}, 重定向到 /`);
    next('/');
  } else {
    next()
  }
})

export default router