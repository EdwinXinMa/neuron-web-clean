import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const loading = ref(false)
  const title = ref('N3 Lite 云平台测试版本')

  return { loading, title }
})
