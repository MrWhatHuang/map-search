import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
// 导入配置（如果配置缺失会抛出错误，阻止应用启动）
import { AMAP_KEY } from './config'

// 动态加载高德地图 API
function loadAmapScript() {
  const script = document.getElementById('amap-loader') as HTMLScriptElement
  if (script && !script.src) {
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
  }
}

// 立即加载高德地图 API
loadAmapScript()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
