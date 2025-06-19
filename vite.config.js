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

  server: {
    historyApiFallback: true,
    proxy: {
      '/sense': {
        target: 'http://120.46.84.131:8081',
        changeOrigin: true,
        secure: false
      },
      '/user': {
        target: 'http://120.46.84.131:8081',
        changeOrigin: true,
        secure: false
      }
    }
  }
})