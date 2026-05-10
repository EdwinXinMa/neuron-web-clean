import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { setupI18n } from './i18n'

const app = createApp(App)
app.use(createPinia())
app.use(router)
setupI18n(app)
app.mount('#app')
