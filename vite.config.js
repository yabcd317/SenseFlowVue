import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 添加开发服务器配置
  server: {
    // 配置代理
    proxy: {
      '/sense': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
