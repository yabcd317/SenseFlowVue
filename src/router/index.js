import {
  createRouter,
  createWebHistory
} from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue' 

const routes = [{
    path: '/login',
    name: 'Login',
    component: Login
  },

  {
    path: '/',
    component: Home, 
    meta: {
      requiresAuth: true
    },
    children: [ 

      {
       
        path: '', 
        name: 'HomeContent', 
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'monitor/realtime', 
        name: 'MonitorRealtime',
        component: () => import('../views/monitor/RealTimeData.vue'), 
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'data/history',
        name: 'DataHistory',
        component: () => import('../views/datacenter/HistoricalData.vue'), 
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'data/alarm', 
        name: 'DataAlarm',
        component: () => import('../views/datacenter/AlarmData.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'management', 
        name: 'UserManagement',
        component: () => import('../views/UserManagement.vue'), 
        meta: { requiresAuth: true }
      }

    ]
  },

  {
    path: '/:pathMatch(.*)*',
    redirect: to => {

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
  
  // 检查token是否过期
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (to.meta.requiresAuth) {
          next('/login')
          return
        }
      }
    } catch (error) {
      console.error('Token解析失败:', error)
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