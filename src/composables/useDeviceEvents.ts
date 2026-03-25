import { ref, onBeforeUnmount } from 'vue'

export interface DeviceEvent {
  type: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'ALERT'
  deviceSn: string
  detail: string
  timestamp: string
}

type EventCallback = (event: DeviceEvent) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<EventCallback>()
const connected = ref(false)

function ensureConnection() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${wsProtocol}//${location.host}/api/deviceSocket`

  try {
    ws = new WebSocket(url)
  } catch {
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    connected.value = true
    console.log('[DeviceEvents] WebSocket connected')
  }

  ws.onmessage = (event) => {
    try {
      const data: DeviceEvent = JSON.parse(event.data)
      console.log('[DeviceEvents] Received:', data.type, data.deviceSn)
      listeners.forEach((cb) => cb(data))
    } catch { /* ignore */ }
  }

  ws.onclose = () => {
    connected.value = false
    ws = null
    if (listeners.size > 0) {
      scheduleReconnect()
    }
  }

  ws.onerror = (err) => {
    connected.value = false
    console.warn('[DeviceEvents] WebSocket error:', err)
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (listeners.size > 0) {
      ensureConnection()
    }
  }, 5000)
}

/**
 * 监听设备事件（ONLINE/OFFLINE/FAULT/ALERT）
 * 自动管理 WebSocket 连接生命周期：有监听者时连接，全部退出时断开
 */
export function useDeviceEvents(callback: EventCallback) {
  listeners.add(callback)
  if (localStorage.getItem('token')) {
    ensureConnection()
  }

  onBeforeUnmount(() => {
    listeners.delete(callback)
    // 没有监听者时断开
    if (listeners.size === 0) {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      if (ws) { ws.close(); ws = null }
      connected.value = false
    }
  })

  return { connected }
}
