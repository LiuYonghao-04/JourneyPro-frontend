import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 引入 Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from "./router";
import { initErrorReporting } from './utils/errorReporter'

const DEFAULT_IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='#e9eef8'/><stop offset='100%' stop-color='#d7dde9'/></linearGradient></defs><rect width='800' height='500' fill='url(#g)'/><circle cx='290' cy='190' r='58' fill='#c4cedf'/><rect x='150' y='290' width='500' height='34' rx='17' fill='#bcc7da'/><rect x='220' y='350' width='360' height='22' rx='11' fill='#cdd6e6'/></svg>`
  )

if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const target = event?.target
      if (!target || target.tagName !== 'IMG') return
      if (target.dataset?.jpFallbackApplied === '1') return
      target.dataset.jpFallbackApplied = '1'
      target.src = target.dataset?.fallback || DEFAULT_IMAGE_FALLBACK
    },
    true
  )
}

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(router)
initErrorReporting({ app, router })
app.mount('#app')
