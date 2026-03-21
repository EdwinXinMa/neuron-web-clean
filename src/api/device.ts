import http from './http'

/** 设备列表参数 */
export interface DeviceListParams {
  sn?: string
  onlineStatus?: string
  pageNo?: number
  pageSize?: number
}

/** 设备列表接口 */
export function getDeviceList(params: DeviceListParams = {}) {
  return http.get('/device/list', { params })
}

/** 设备详情接口（聚合：DB + Redis CT数据 + 桩枪 + 告警） */
export function getDeviceDetail(sn: string) {
  return http.get(`/device/${sn}/detail`)
}

/** 仪表盘统计数据 */
export function getDeviceStats() {
  return http.get('/device/stats')
}

/** 地图坐标数据 */
export function getDeviceMapData() {
  return http.get('/device/mapdata')
}
