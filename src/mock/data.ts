// 统一 Mock 数据，所有页面共用

export interface Device {
  sn: string
  status: 'online' | 'offline' | 'fault' | 'unactivated'
  fw: string
  dealer: string
  shipDate: string
  lastHb: string
  lat: number | null
  lng: number | null
  ctCurrent: number
  ctMax: number
  voltage: number
  chargers: Charger[]
}

export interface Charger {
  sn: string
  status: 'charging' | 'idle' | 'fault'
  current: number
}

export interface Alert {
  level: 'critical' | 'major' | 'minor' | 'info'
  device: string
  msg: string
  time: string
}

export interface OpLog {
  time: string
  user: string
  device: string
  type: string
  content: string
  result: 'success' | 'fail'
}

export const mockDevices: Device[] = [
  { sn: 'NL-20260101-0001', status: 'online', fw: 'v1.0.3', dealer: 'Munich EV Solutions', shipDate: '2026-01-15', lastHb: '1分钟前', lat: 48.1351, lng: 11.5820, ctCurrent: 28.5, ctMax: 32, voltage: 230, chargers: [
    { sn: 'AT-0001-01', status: 'charging', current: 11 },
    { sn: 'AT-0001-02', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260102-0002', status: 'online', fw: 'v1.0.3', dealer: 'Berlin Power GmbH', shipDate: '2026-01-18', lastHb: '3分钟前', lat: 52.5200, lng: 13.4050, ctCurrent: 15.2, ctMax: 32, voltage: 231, chargers: [
    { sn: 'AT-0002-01', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260103-0003', status: 'online', fw: 'v1.0.2', dealer: 'Amsterdam Charge BV', shipDate: '2026-01-22', lastHb: '2分钟前', lat: 52.3676, lng: 4.9041, ctCurrent: 31.0, ctMax: 40, voltage: 229, chargers: [
    { sn: 'AT-0003-01', status: 'charging', current: 16 },
    { sn: 'AT-0003-02', status: 'charging', current: 14 },
  ]},
  { sn: 'NL-20260115-0004', status: 'online', fw: 'v1.0.3', dealer: 'Paris EnergieTech', shipDate: '2026-02-01', lastHb: '5分钟前', lat: 48.8566, lng: 2.3522, ctCurrent: 22.3, ctMax: 32, voltage: 230, chargers: [
    { sn: 'AT-0004-01', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260120-0005', status: 'online', fw: 'v1.0.2', dealer: 'Vienna SmartGrid', shipDate: '2026-02-05', lastHb: '1分钟前', lat: 48.2082, lng: 16.3738, ctCurrent: 19.8, ctMax: 25, voltage: 232, chargers: [
    { sn: 'AT-0005-01', status: 'charging', current: 8 },
    { sn: 'AT-0005-02', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260125-0006', status: 'online', fw: 'v1.0.3', dealer: 'Zurich E-Mobility', shipDate: '2026-02-10', lastHb: '4分钟前', lat: 47.3769, lng: 8.5417, ctCurrent: 25.1, ctMax: 32, voltage: 230, chargers: [
    { sn: 'AT-0006-01', status: 'charging', current: 11 },
  ]},
  { sn: 'NL-20260128-0007', status: 'online', fw: 'v1.0.2', dealer: 'Brussels ChargePoint', shipDate: '2026-02-12', lastHb: '6分钟前', lat: 50.8503, lng: 4.3517, ctCurrent: 12.5, ctMax: 32, voltage: 228, chargers: [
    { sn: 'AT-0007-01', status: 'idle', current: 0 },
    { sn: 'AT-0007-02', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260201-0008', status: 'online', fw: 'v1.0.3', dealer: 'Copenhagen Green Energy', shipDate: '2026-02-18', lastHb: '2分钟前', lat: 55.6761, lng: 12.5683, ctCurrent: 20.0, ctMax: 32, voltage: 231, chargers: [
    { sn: 'AT-0008-01', status: 'charging', current: 13 },
  ]},
  { sn: 'NL-20260205-0009', status: 'online', fw: 'v1.0.3', dealer: 'Oslo PowerTech', shipDate: '2026-02-22', lastHb: '3分钟前', lat: 59.9139, lng: 10.7522, ctCurrent: 17.6, ctMax: 25, voltage: 230, chargers: [
    { sn: 'AT-0009-01', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260210-0010', status: 'online', fw: 'v1.0.2', dealer: 'Stockholm EV Hub', shipDate: '2026-02-25', lastHb: '1分钟前', lat: 59.3293, lng: 18.0686, ctCurrent: 26.3, ctMax: 32, voltage: 229, chargers: [
    { sn: 'AT-0010-01', status: 'charging', current: 15 },
    { sn: 'AT-0010-02', status: 'charging', current: 10 },
  ]},
  { sn: 'NL-20260215-0011', status: 'offline', fw: 'v1.0.2', dealer: 'Madrid ElectroDrive', shipDate: '2026-03-01', lastHb: '3小时前', lat: 40.4168, lng: -3.7038, ctCurrent: 0, ctMax: 32, voltage: 0, chargers: [] },
  { sn: 'NL-20260218-0012', status: 'offline', fw: 'v1.0.1', dealer: 'Rome EV Italia', shipDate: '2026-03-03', lastHb: '5小时前', lat: 41.9028, lng: 12.4964, ctCurrent: 0, ctMax: 40, voltage: 0, chargers: [] },
  { sn: 'NL-20260220-0013', status: 'offline', fw: 'v1.0.2', dealer: 'Warsaw ChargePL', shipDate: '2026-03-05', lastHb: '1天前', lat: 52.2297, lng: 21.0122, ctCurrent: 0, ctMax: 32, voltage: 0, chargers: [] },
  { sn: 'NL-20260225-0014', status: 'fault', fw: 'v1.0.2', dealer: 'Helsinki EV Nordic', shipDate: '2026-03-08', lastHb: '8分钟前', lat: 60.1699, lng: 24.9384, ctCurrent: 33.5, ctMax: 32, voltage: 235, chargers: [
    { sn: 'AT-0014-01', status: 'idle', current: 0 },
  ]},
  { sn: 'NL-20260310-0015', status: 'unactivated', fw: '-', dealer: 'Dublin GreenCharge', shipDate: '2026-03-15', lastHb: '-', lat: null, lng: null, ctCurrent: 0, ctMax: 32, voltage: 0, chargers: [] },
  { sn: 'NL-20260312-0016', status: 'unactivated', fw: '-', dealer: 'Lisbon PowerUp', shipDate: '2026-03-16', lastHb: '-', lat: null, lng: null, ctCurrent: 0, ctMax: 32, voltage: 0, chargers: [] },
]

export const mockAlerts: Alert[] = [
  { level: 'critical', device: 'NL-20260225-0014', msg: '过温保护触发 — 设备温度超过阈值', time: '2026-03-20 09:42' },
  { level: 'major', device: 'NL-20260103-0003', msg: '入户电流接近最大阈值', time: '2026-03-20 09:30' },
  { level: 'major', device: 'NL-20260210-0010', msg: '过流警告 — 瞬时电流超过额定值', time: '2026-03-20 08:55' },
  { level: 'minor', device: 'NL-20260215-0011', msg: '设备离线 — 超过30分钟无心跳', time: '2026-03-20 06:12' },
  { level: 'minor', device: 'NL-20260218-0012', msg: '设备离线 — 超过30分钟无心跳', time: '2026-03-20 04:05' },
  { level: 'minor', device: 'NL-20260220-0013', msg: '设备离线 — 超过24小时无心跳', time: '2026-03-19 09:30' },
  { level: 'info', device: 'NL-20260201-0008', msg: 'OTA 升级成功 — v1.0.2 → v1.0.3', time: '2026-03-18 11:00' },
  { level: 'info', device: 'NL-20260205-0009', msg: 'OTA 升级成功 — v1.0.2 → v1.0.3', time: '2026-03-18 11:05' },
  { level: 'info', device: 'NL-20260101-0001', msg: 'OTA 升级成功 — v1.0.2 → v1.0.3', time: '2026-03-17 15:30' },
  { level: 'critical', device: 'NL-20260225-0014', msg: '接地故障检测 — GFCI 触发', time: '2026-03-17 10:15' },
  { level: 'info', device: 'NL-20260115-0004', msg: '设备首次激活', time: '2026-03-16 09:00' },
]

export const mockOpLogs: OpLog[] = [
  { time: '2026-03-19 09:45', user: 'Edwin', device: 'NL-20260225-0014', type: '远程重启', content: '过温保护后远程重启设备', result: 'success' },
  { time: '2026-03-18 16:30', user: 'Edwin', device: 'NL-20260210-0010', type: 'DLM 修改', content: '32A → 40A', result: 'success' },
  { time: '2026-03-18 14:25', user: 'Edwin', device: 'NL-20260128-0007', type: 'DLM 修改', content: '32A → 25A（临时降档）', result: 'success' },
  { time: '2026-03-18 11:00', user: 'Edwin', device: 'NL-20260201-0008', type: 'OTA 升级', content: 'v1.0.2 → v1.0.3', result: 'success' },
  { time: '2026-03-18 11:05', user: 'Edwin', device: 'NL-20260205-0009', type: 'OTA 升级', content: 'v1.0.2 → v1.0.3', result: 'success' },
  { time: '2026-03-17 15:30', user: 'Edwin', device: 'NL-20260101-0001', type: 'OTA 升级', content: 'v1.0.2 → v1.0.3', result: 'success' },
  { time: '2026-03-17 15:35', user: 'Edwin', device: 'NL-20260102-0002', type: 'OTA 升级', content: 'v1.0.2 → v1.0.3', result: 'success' },
  { time: '2026-03-17 10:20', user: 'Admin', device: 'NL-20260225-0014', type: '远程重置', content: 'GFCI 故障远程重置', result: 'success' },
  { time: '2026-03-16 16:00', user: 'Edwin', device: 'NL-20260218-0012', type: 'OTA 升级', content: 'v1.0.1 → v1.0.2', result: 'fail' },
  { time: '2026-03-16 14:30', user: 'Edwin', device: 'NL-20260125-0006', type: 'OTA 升级', content: 'v1.0.2 → v1.0.3', result: 'success' },
  { time: '2026-03-15 10:00', user: 'Admin', device: 'NL-20260120-0005', type: 'DLM 修改', content: '32A → 25A', result: 'success' },
  { time: '2026-03-14 09:15', user: 'Edwin', device: 'NL-20260103-0003', type: 'DLM 修改', content: '32A → 40A', result: 'success' },
]

export const mockFirmwares = [
  { ver: 'v1.0.3', date: '2026-03-10', note: '修复心跳异常，优化 DLM 响应速度', size: '2.4 MB', sha: 'a3f8c2...d91e' },
  { ver: 'v1.0.2', date: '2026-02-20', note: 'DLM 稳定性优化，CT 采样频率提升', size: '2.3 MB', sha: 'b7e4d1...f82a' },
  { ver: 'v1.0.1', date: '2026-01-15', note: '初始发布版本', size: '2.2 MB', sha: 'c9f1a3...e47b' },
]

// 辅助函数：获取某设备的告警
export function getDeviceAlerts(sn: string) {
  return mockAlerts.filter(a => a.device === sn)
}

// 辅助函数：获取某设备的操作日志
export function getDeviceLogs(sn: string) {
  return mockOpLogs.filter(l => l.device === sn)
}
