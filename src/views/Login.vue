<template>
  <div class="login-container">
    <div class="login-background"></div>
    <div class="login-box">
      <h2>登录</h2>
      <el-form ref="loginFormRef" :model="loginForm" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input type="password" v-model="loginForm.password"></el-input>
        </el-form-item>
        <el-form-item label="记住我">
          <el-checkbox v-model="loginForm.remember"></el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading">登录</el-button>
        </el-form-item>
        <!-- 添加错误提示 -->
        <el-form-item v-if="errorMessage">
          <p class="error-message">{{ errorMessage }}</p>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ElForm, ElFormItem, ElInput, ElCheckbox, ElButton } from 'element-plus'

export default {
  components: {
    ElForm,
    ElFormItem,
    ElInput,
    ElCheckbox,
    ElButton
  },
  setup() {
    const router = useRouter()
    const loginFormRef = ref(null)
    const loginForm = reactive({
      username: '',
      password: '',
      remember: false
    })
    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
      ]
    }
    const loading = ref(false)
    const errorMessage = ref('')

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
          // 根据失败信息弹出提示
          errorMessage.value = result.msg || '登录失败'
          return
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
        errorMessage.value = error.message || '登录失败'
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
      errorMessage,
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

/* 确保提示信息不会被遮挡 */
.el-message {
  z-index: 1000;
}

/* 错误提示样式 */
.error-message {
  color: red;
  font-size: 14px;
  text-align: center;
}
</style>