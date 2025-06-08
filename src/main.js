import {
  createApp
} from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// 导入 Element Plus 样式
import 'element-plus/dist/index.css'

// 引入高德地图
import VueAMap, {
  initAMapApiLoader
} from '@vuemap/vue-amap'
import '@vuemap/vue-amap/dist/style.css'

// 初始化高德地图
initAMapApiLoader({
  key: '3727496af05139a39ca25b431bc96c45', // 请替换为您的高德地图API Key
  plugin: ['AMap.Autocomplete', 'AMap.PlaceSearch', 'AMap.Scale', 'AMap.OverView', 'AMap.ToolBar', 'AMap.MapType', 'AMap.PolyEditor', 'AMap.CircleEditor'],
  v: '1.4.4'
})

const app = createApp(App).use(router).mount('#app')
app.use(router)
app.use(VueAMap)
app.mount('#app')