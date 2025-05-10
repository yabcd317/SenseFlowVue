<template>
  <header class="top-bar">
    <div class="logo">Vue 应用</div>
    <div class="user-info">
      <span>欢迎，{{ username }}</span>
      <button @click="handleLogout">退出登录</button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'TopBar',
  props: {
    username: {
      type: String,
      default: '用户'
    }
  },
  methods: {
    async handleLogout() {
      try {
        const token = localStorage.getItem('token');
        
        // 发送退出登录请求
        const response = await fetch('/sense/logout', {
          method: 'POST',
          headers: {
            // 如果您的后端需要 Content-Type，即使没有body，也可能需要指定
            // 'Content-Type': 'application/json', // 根据后端实际需求决定是否需要
            'Authorization': `Bearer ${token}`
          }
          // 不需要 body，因为您提到无需发送JSON
        });
        
        // 检查响应状态
        if (!response.ok) {
          // 即便请求失败，也打印错误，但依然会执行 finally 中的清理和跳转
          console.error('退出登录请求失败:', response.status, response.statusText);
        } else {
          const result = await response.json();
          if (result.code === 1) {
            console.log('退出登录成功');
          } else {
            console.warn('退出登录响应异常:', result.msg || '未知错误');
          }
        }
      } catch (error) {
        // 网络错误或其他异常
        console.error('退出登录过程中发生错误:', error);
      } finally {
        // 无论请求成功与否，都清除本地存储的用户信息和token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // 跳转到登录页面
        // 确保 this.$router 可用，如果 TopBar 不是在路由视图中直接使用，
        // 可能需要通过 props 传入 router 实例或使用其他方式访问
        if (this.$router) {
          this.$router.push('/login');
        } else {
          // 如果 $router 不可用，可以尝试直接操作 window.location
          // 但这会导致整个页面刷新，通常不推荐在SPA中这样做
          window.location.href = '/login';
          console.warn('this.$router is not available, using window.location.href for redirection.');
        }
      }
    }
  }
}
</script>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  background-color: #1890ff;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo {
  font-size: 20px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 15px;
}

button {
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>