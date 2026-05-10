import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'
import router from '../router'
import { i18n, getStoredLang } from '../i18n'

const t = (key: string) => i18n.global.t(key)

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// 不需要 token 的接口
const whiteList = ['/sys/login']

// 请求拦截器：自动加 token，未登录时拦截非白名单请求
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['X-Access-Token'] = token
  } else if (!whiteList.some(url => config.url?.includes(url))) {
    return Promise.reject(new axios.Cancel(t('http.notLoggedIn')))
  }
  // 携带当前语言，后端据此返回对应语言的消息
  const langMap: Record<string, string> = { zh: 'zh-CN', en: 'en', tw: 'zh-TW', es: 'es', pt: 'pt' }
  config.headers['Accept-Language'] = langMap[getStoredLang()] ?? 'zh-CN'
  return config
})

// 响应拦截器：统一处理
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    if (data.success === false) {
      message.error(data.message || t('http.requestFail'))
      return Promise.reject(new Error(data.message || t('http.requestFail')))
    }
    return data
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
        message.error(t('http.sessionExpired'))
      }
    } else {
      message.error(error.message || t('http.networkError'))
    }
    return Promise.reject(error)
  },
)

export default http
