import {
  defineConfig
} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {
  ElementPlusResolver
} from 'unplugin-vue-components/resolvers'
import {
  VueAmapResolver
} from '@vuemap/unplugin-resolver'

// https://vite.dev/config/
export default defineConfig({

  plugins: [

    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver({
        exclude: /^ElAmap[A-Z]*/
      }), VueAmapResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver({
        exclude: /^ElAmap[A-Z]*/
      }), VueAmapResolver()],
    }),
  ],

  // 添加开发服务器配置
  server: {
    historyApiFallback: true,
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