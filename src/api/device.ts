import http from './http'

export type AllocationMode = 'Average' | 'FIFO'

/** Read the live firmware mode, without replacing failures with a default. */
export async function getAllocationMode(sn: string): Promise<AllocationMode> {
  const response = await http.get<unknown, { result?: { AllocationMode?: unknown } }>(
    `/device/${encodeURIComponent(sn)}/allocation-mode`, { silentError: true },
  )
  const mode = response.result?.AllocationMode
  if (mode !== 'Average' && mode !== 'FIFO') throw new Error('Invalid AllocationMode response')
  return mode
}

/** The Web endpoint waits for the firmware to confirm persistence. */
export function setAllocationMode(sn: string, mode: AllocationMode) {
  return http.post(`/device/${encodeURIComponent(sn)}/allocation-mode`,
    { AllocationMode: mode }, { silentError: true })
}

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
