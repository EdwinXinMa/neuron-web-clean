<template>
  <div class="overview-screen">
    <!-- 数字卡片 -->
    <div class="stats-row">
      <div v-for="card in statCards" :key="card.key" class="stat-col">
        <div class="stat-card" :style="{ '--accent': card.color }" @click="goDevices(card.key)">
          <div class="stat-card-glow"></div>
          <div class="stat-card-body">
            <div class="stat-main">
              <div>
                <div class="stat-label">{{ card.label }}</div>
                <div class="stat-value" :style="{ color: card.color }">
                  {{ animatedCounts[card.key] ?? 0 }}
                </div>
              </div>
              <component :is="card.icon" class="stat-icon" :style="{ color: card.color, fontSize: '44px', filter: `drop-shadow(0 0 10px ${card.color})` }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体：地图 + 告警 -->
    <div class="main-area">
      <div class="map-panel">
        <div ref="mapRef" class="map-container"></div>
        <!-- 地图点脉冲 SVG 滤镜 -->
        <svg width="0" height="0" style="position:absolute">
          <defs>
            <filter id="glow-green"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#00ff88" /></filter>
            <filter id="glow-red"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ff4757" /></filter>
            <filter id="glow-gray"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#94a3b8" /></filter>
          </defs>
        </svg>
      </div>

      <div class="alert-panel">
        <div class="alert-header">
          <span class="blink-dot"></span>
          <span class="alert-title">最近告警</span>
        </div>
        <div class="alert-list">
          <div
            v-for="(alert, i) in recentAlerts"
            :key="i"
            class="alert-item"
            :class="'alert-' + alert.level"
          >
            <div class="alert-color-bar" :style="{ background: alertColor(alert.level) }"></div>
            <div class="alert-content">
              <div class="alert-top">
                <span class="alert-device" @click="goDevice(alert.device)">{{ alert.device }}</span>
                <span class="alert-time">{{ formatAlertTime(alert.time) }}</span>
              </div>
              <div class="alert-msg">{{ alert.msg }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, reactive, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDeviceStats, getDeviceMapData } from '@/api/device';
import { AppstoreOutlined, CheckCircleOutlined, DisconnectOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons-vue';
import http from '@/api/http';
import { useDeviceEvents } from '@/composables/useDeviceEvents';

const router = useRouter();

// 监听设备事件，自动刷新仪表盘
useDeviceEvents(() => {
  loadDashboard();
});

// ─── 统计 ───
const counts = reactive({ total: 0, online: 0, offline: 0, fault: 0, unactivated: 0, alertBadge: 0 });

const statCards = computed(() => [
  { key: 'total' as const, label: '设备总数', color: '#00d4ff', icon: AppstoreOutlined },
  { key: 'online' as const, label: '在线', color: '#00ff88', icon: CheckCircleOutlined },
  { key: 'offline' as const, label: '离线', color: '#94a3b8', icon: DisconnectOutlined },
  { key: 'fault' as const, label: '故障', color: '#ff4757', icon: WarningOutlined },
  { key: 'unactivated' as const, label: '未激活', color: '#faad14', icon: ClockCircleOutlined },
]);

// ─── CountUp 动画 ───
const animatedCounts = reactive<Record<string, number>>({ total: 0, online: 0, offline: 0, fault: 0, unactivated: 0 });

function animateCount(key: string, target: number, duration = 800) {
  const start = performance.now();
  const from = 0;
  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    animatedCounts[key] = Math.round(from + (target - from) * ease);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── 路由跳转 ───
function goDevices(status: string) {
  router.push({ path: '/devices', query: { status } });
}
function goDevice(sn: string) {
  router.push({ path: '/devices', query: { id: sn } });
}

// ─── 告警颜色 ───
function alertColor(level: string) {
  const m: Record<string, string> = { critical: '#ff4757', major: '#ff9f43', minor: '#00d4ff', info: '#64748b' };
  return m[level] || '#64748b';
}

// ─── 告警时间格式化：只取时间部分，跨天显示日期 ───
function formatAlertTime(time: string) {
  if (!time) return '';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const datePart = time.slice(0, 10);
  const timePart = time.slice(11);
  if (datePart === today) return timePart;
  if (datePart === yesterday) return `昨天 ${timePart}`;
  return `${datePart.slice(5)} ${timePart}`;
}

// ─── 地图 ───
const mapRef = ref<HTMLElement>();
let map: L.Map | null = null;

const statusColor: Record<string, string> = {
  online: '#00ff88',
  offline: '#94a3b8',
  fault: '#ff4757',
};
const statusLabel: Record<string, string> = {
  online: '在线',
  offline: '离线',
  fault: '故障',
};

function initMap() {
  if (!mapRef.value) return;
  map = L.map(mapRef.value, {
    center: [20, 120],
    zoom: 2,
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // 添加 zoom 控件到右下
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 设备点（有坐标的）
  const devs = mapDevices.value.length ? mapDevices.value : [];
  devs.forEach((d: any, idx: number) => {
    const color = statusColor[d.status] || '#94a3b8';
    const marker = L.circleMarker([d.lat!, d.lng!], {
      radius: 7,
      fillColor: color,
      fillOpacity: 0.9,
      color: color,
      weight: 1,
      opacity: 0,
      className: `pulse-marker pulse-marker-${d.status} pulse-delay-${idx % 5}`,
    }).addTo(map!);

    marker.bindTooltip(
      `<div style="font-family:monospace;font-size:12px;line-height:1.6">
        <div style="font-weight:600;color:${color}">${d.sn}</div>
        <div>状态: ${statusLabel[d.status] || d.status}</div>
        <div style="color:#64748b">${d.dealer}</div>
      </div>`,
      { className: 'dark-tooltip', direction: 'top', offset: [0, -8] },
    );

    marker.on('click', () => goDevice(d.sn));
  });
}

// 真实数据
const recentAlerts = ref<any[]>([]);
const mapDevices = ref<any[]>([]);

async function loadDashboard() {
  try {
    const [statsRes, mapRes, alertRes]: any[] = await Promise.all([
      getDeviceStats(),
      getDeviceMapData(),
      http.get('/alert/list', { params: { pageSize: 10, pageNo: 1 } })
    ]);
    const s = statsRes.result || statsRes;
    counts.total = s.total || 0;
    counts.online = s.online || 0;
    counts.offline = s.offline || 0;
    counts.fault = s.fault || 0;
    counts.unactivated = s.unactivated || 0;
    // 触发 CountUp 动画
    ['total','online','offline','fault','unactivated'].forEach((key, i) => {
      setTimeout(() => animateCount(key, counts[key as keyof typeof counts] as number), i * 100);
    });
    
    mapDevices.value = (mapRes.result || mapRes) || [];
    
    const alertData = alertRes.result || alertRes;
    recentAlerts.value = (alertData.records || []).map((a: any) => ({
      level: a.alertLevel === 'CRITICAL' ? 'critical' : a.alertLevel === 'IMPORTANT' ? 'major' : 'minor',
      device: a.deviceSn,
      msg: a.description || a.errorCode,
      time: a.alertTime,
    }));
    
    // 更新地图点位（地图已在 onMounted 初始化，这里重新加载点位）
    if (mapDevices.value.length) {
      if (map) { map.eachLayer((l: any) => { if (l instanceof L.CircleMarker) map!.removeLayer(l); }); }
      mapDevices.value.forEach((d: any, idx: number) => {
        const color = (statusColor as any)[d.status] || '#94a3b8';
        const marker = L.circleMarker([d.lat, d.lng], {
          radius: 7, fillColor: color, fillOpacity: 0.9,
          color, weight: 1, opacity: 0,
        }).addTo(map!);
        marker.bindTooltip(
          '<div style="font-size:12px"><b>' + d.sn + '</b><br>状态: ' + ((statusLabel as any)[d.status] || d.status) + '</div>',
          { direction: 'top', offset: [0, -8] }
        );
        marker.on('click', () => goDevice(d.sn));
      });
    }
  } catch(e) {
    console.error('Dashboard load failed:', e);
  }
}

onMounted(async () => {
  await nextTick();
  initMap();
  loadDashboard();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
/* ─── 全局布局 ─── */
.overview-screen {
  height: calc(100vh - 96px);
  background: #0a1628;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ─── 数字卡片 ─── */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.stat-col {
  flex: 1;
  min-width: 0;
}

.stat-card {
  position: relative;
  background: rgba(15, 25, 50, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 8px;
  padding: 20px 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 25%, transparent);
  transform: translateY(-2px);
}

.stat-card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent), 0 0 24px color-mix(in srgb, var(--accent) 50%, transparent);
}

.stat-card-body {
  position: relative;
  z-index: 1;
}

.stat-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  opacity: 0.7;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.stat-card:hover .stat-icon {
  opacity: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 0 16px currentColor;
}

/* ─── 主体区域 ─── */
.main-area {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.map-panel {
  flex: 3;
  position: relative;
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 8px;
  overflow: hidden;
  background: #0d1b2a;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #0d1b2a;
}

/* ─── 地图点样式 ─── */
:deep(.pulse-marker) {
  animation: fadeIn 0.5s ease forwards;
  opacity: 0;
}
:deep(.pulse-marker-online) {
  filter: drop-shadow(0 0 4px #00ff88);
}
:deep(.pulse-marker-offline) {
  filter: drop-shadow(0 0 2px #94a3b8);
}
:deep(.pulse-marker-fault) {
  filter: drop-shadow(0 0 4px #ff4757) drop-shadow(0 0 8px rgba(255, 71, 87, 0.4));
  animation: fadeIn 0.5s ease forwards, faultBlink 2s ease-in-out 0.5s infinite;
}
:deep(.pulse-delay-0) { animation-delay: 0s; }
:deep(.pulse-delay-1) { animation-delay: 0.1s; }
:deep(.pulse-delay-2) { animation-delay: 0.2s; }
:deep(.pulse-delay-3) { animation-delay: 0.3s; }
:deep(.pulse-delay-4) { animation-delay: 0.4s; }

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes faultBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ─── 地图 Tooltip ─── */
:deep(.dark-tooltip) {
  background: rgba(10, 22, 40, 0.95) !important;
  border: 1px solid rgba(0, 212, 255, 0.25) !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
  color: #e2e8f0 !important;
}
:deep(.dark-tooltip::before) {
  border-top-color: rgba(0, 212, 255, 0.25) !important;
}

/* ─── Leaflet zoom 按钮暗色 ─── */
:deep(.leaflet-control-zoom a) {
  background: rgba(15, 25, 50, 0.9) !important;
  color: #00d4ff !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
}
:deep(.leaflet-control-zoom a:hover) {
  background: rgba(0, 212, 255, 0.15) !important;
}

/* ─── 告警面板 ─── */
.alert-panel {
  flex: 1;
  background: rgba(15, 25, 50, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
}

.blink-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4757;
  box-shadow: 0 0 8px #ff4757;
  animation: blink 1.2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes blink {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px #ff4757; }
  50% { opacity: 0.3; box-shadow: 0 0 2px #ff4757; }
}

.alert-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.5px;
}

.alert-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.alert-list::-webkit-scrollbar {
  width: 4px;
}
.alert-list::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.2);
  border-radius: 2px;
}

.alert-item {
  display: flex;
  padding: 0;
  margin: 0 12px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: background 0.2s;
}

.alert-item:hover {
  background: rgba(0, 212, 255, 0.05);
}

.alert-color-bar {
  width: 3px;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  padding: 10px 12px;
  min-width: 0;
}

.alert-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.alert-device {
  font-family: monospace;
  font-size: 12px;
  color: #00d4ff;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-device:hover {
  text-decoration: underline;
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
}

.alert-time {
  font-size: 11px;
  color: #475569;
  flex-shrink: 0;
  margin-left: 8px;
}

.alert-msg {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
}

/* ─── 严重告警闪烁提示 ─── */
.alert-critical {
  border: 1px solid rgba(255, 71, 87, 0.15);
}
</style>
