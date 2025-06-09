<template>
  <header class="top-bar">
    <div class="logo">革命旧址监测系统</div>
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
            'token': `${token}`
          }
        });
        
        // 检查响应状态
        if (!response.ok) {
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
        console.error('退出登录过程中发生错误:', error);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (this.$router) {
          this.$router.push('/login');
        } else {
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