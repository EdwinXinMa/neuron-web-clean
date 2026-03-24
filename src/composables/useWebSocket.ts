import { ref, onBeforeUnmount } from 'vue'

/**
 * OTA WebSocket 封装
 * 连接后端 /otaSocket/{token}，接收 OTA 升级进度推送
 */
export function useWebSocket(url: string) {
  const connected = ref(false)
  const data = ref<any>(null)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      ws = new WebSocket(url)
    } catch (e) {
      console.error('WebSocket connection failed:', e)
      return
    }

    ws.onopen = () => {
      connected.value = true
      console.log('[OtaWS] Connected:', url)
    }

    ws.onmessage = (event) => {
      try {
        data.value = JSON.parse(event.data)
      } catch {
        data.value = event.data
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null
    }

    ws.onerror = (err) => {
      console.error('[OtaWS] Error:', err)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.onclose = null // prevent reconnect on intentional close
      ws.close()
      ws = null
    }
    connected.value = false
    data.value = null
  }

  onBeforeUnmount(() => {
    disconnect()
  })

  return { connected, data, connect, disconnect }
}
