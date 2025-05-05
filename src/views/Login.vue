<template>
  <div class="login-container">
    <div class="login-box">
      <h2>系统登录</h2>
      <div class="form-item">
        <label>用户名</label>
        <input 
          type="text" 
          v-model="loginForm.username" 
          placeholder="请输入用户名"
        />
      </div>
      <div class="form-item">
        <label>密码</label>
        <input 
          type="password" 
          v-model="loginForm.password" 
          placeholder="请输入密码"
        />
      </div>
      <div class="form-item remember">
        <input type="checkbox" id="remember" v-model="loginForm.remember">
        <label for="remember">记住我</label>
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <button class="login-btn" @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginPage',
  data() {
    return {
      loginForm: {
        username: '',
        password: '',
        remember: false
      },
      loading: false,
      errorMessage: ''
    }
  },
  methods: {
    async handleLogin() {
      // 表单验证
      if (!this.loginForm.username) {
        this.errorMessage = '请输入用户名';
        return;
      }
      if (!this.loginForm.password) {
        this.errorMessage = '请输入密码';
        return;
      }

      this.errorMessage = '';
      this.loading = true;

      try {
        // 调用后端登录接口
        const response = await fetch('http://localhost:8080/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.loginForm.username,
            password: this.loginForm.password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '登录失败，请检查用户名和密码');
        }

        // 登录成功，保存token和用户信息
        localStorage.setItem('token', data.token || 'demo-token');
        localStorage.setItem('user', JSON.stringify(data.user || {
          username: this.loginForm.username
        }));
        
        // 如果记住我，保存用户名
        if (this.loginForm.remember) {
          localStorage.setItem('rememberedUser', this.loginForm.username);
        } else {
          localStorage.removeItem('rememberedUser');
        }
        
        // 登录成功后跳转到首页
        this.$router.push('/');
      } catch (error) {
        console.error('登录错误:', error);
        this.errorMessage = error.message || '登录失败，请稍后再试';
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    // 如果之前选择了"记住我"，自动填充用户名
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      this.loginForm.username = rememberedUser;
      this.loginForm.remember = true;
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  background-color: #f5f5f5;
  position: absolute;
  top: 0;
  left: 0;
}

.login-box {
  width: 400px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-item input[type="text"],
.form-item input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-item.remember {
  display: flex;
  align-items: center;
}

.form-item.remember input {
  margin-right: 8px;
}

.error-message {
  color: #f56c6c;
  margin-bottom: 15px;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-btn:hover {
  background-color: #66b1ff;
}

.login-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>