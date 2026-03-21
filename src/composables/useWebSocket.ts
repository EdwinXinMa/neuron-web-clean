import { ref } from 'vue'

/**
 * WebSocket 封装（占位）
 */
export function useWebSocket(_url: string) {
  const connected = ref(false)
  const data = ref<any>(null)

  function connect() {
    // TODO: 实现 WebSocket 连接
    console.log('WebSocket connect - 待实现')
  }

  function disconnect() {
    // TODO: 实现断开连接
    console.log('WebSocket disconnect - 待实现')
  }

  return { connected, data, connect, disconnect }
}
