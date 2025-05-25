<template>
  <div class="login-container">
    <div class="login-background"></div>

    <div class="login-box">
      <h2>系统登录</h2>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" class="login-btn">
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export default {
  name: 'LoginPage',
  setup() {
    const loginFormRef = ref(null)
    const router = useRouter()

    const loginForm = reactive({
      username: '',
      password: '',
      remember: false
    })

    const loading = ref(false)

    // 表单验证规则
    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
      ]
    }

    const handleLogin = async () => {
      if (!loginFormRef.value) return

      try {
        await loginFormRef.value.validate()

        loading.value = true

        const response = await fetch('/user/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: loginForm.password,
            username: loginForm.username
          })
        })

        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('服务器未返回JSON数据')
        }

        let result
        try {
          const text = await response.text()
          if (!text) {
            throw new Error('服务器返回空响应')
          }
          result = JSON.parse(text)
        } catch (parseError) {
          console.error('JSON解析错误:', parseError)
          throw new Error('无法解析服务器响应: ' + parseError.message)
        }

        if (result.code !== 1) {
          throw new Error(result.msg || '登录失败')
        }

        const userData = result.data
        localStorage.setItem('token', userData.token)
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          username: userData.userName
        }))

        if (loginForm.remember) {
          localStorage.setItem('rememberedUser', loginForm.username)
        } else {
          localStorage.removeItem('rememberedUser')
        }

        ElMessage.success('登录成功')

        router.push('/')
      } catch (error) {
        console.error('登录错误:', error)
        ElMessage.error(error.message || '登录失败')
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      const rememberedUser = localStorage.getItem('rememberedUser')
      if (rememberedUser) {
        loginForm.username = rememberedUser
        loginForm.remember = true
      }
    })

    return {
      loginFormRef,
      loginForm,
      rules,
      loading,
      handleLogin
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
  position: relative;
  overflow: hidden;
}

/* 背景图片区域 */
.login-background {
  position: fixed; 
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('/login.jpg'); 
  background-repeat: no-repeat;
  background-position: center; 
  background-size: 100% 100%;

  z-index: 0;
}

.login-box {
  position: relative;
  z-index: 1;
  transform: translateY(-5%);
  min-width: 380px;
  max-width: 90%;
  width: 400px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.login-btn {
  width: 100%;
}
</style>