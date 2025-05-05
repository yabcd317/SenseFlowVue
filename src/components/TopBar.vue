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
    handleLogout() {
      this.$emit('logout');
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