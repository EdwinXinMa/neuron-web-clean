<template>
  <div class="overview-screen">
    <!-- 数字卡片 -->
    <div class="stats-row">
      <div v-for="card in statCards" :key="card.key" class="stat-col">
        <div class="stat-card" :style="{ background: card.gradient }" @click="goDevices(card.key)">
          <div class="stat-card-body">
            <div class="stat-main">
              <div>
                <div class="stat-label">{{ card.label }}</div>
                <div class="stat-value">
                  {{ animatedCounts[card.key] ?? 0 }}
                </div>
              </div>
              <component :is="card.icon" class="stat-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体：地图 + 告警 -->
    <div class="main-area">
      <div class="map-panel">
        <div ref="mapRef" class="map-container"></div>
        <div class="map-legend">
          <span class="legend-item"><span class="legend-dot legend-online"></span>在线</span>
          <span class="legend-item"><span class="legend-dot legend-offline"></span>离线</span>
          <span class="legend-item"><span class="legend-dot legend-fault"></span>故障</span>
        </div>
        <!-- 地图点脉冲 SVG 滤镜 -->
        <svg width="0" height="0" style="position:absolute">
          <defs>
            <filter id="glow-green"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#2d9d78" /></filter>
            <filter id="glow-red"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ff4757" /></filter>
            <filter id="glow-gray"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#94a3b8" /></filter>
          </defs>
        </svg>
      </div>

      <div class="right-column">
        <div class="online-rate-panel">
          <div class="rate-panel-header">
            <span class="rate-panel-title">今日统计</span>
            <span class="rate-panel-active" v-if="counts.activeToday > 0">
              <span class="active-dot"></span>活跃 {{ counts.activeToday }} 台
            </span>
            <span class="rate-panel-inactive" v-else>暂无活跃设备</span>
          </div>
          <div class="pie-wrapper">
            <div ref="pieRef" class="pie-container"></div>
            <div class="pie-center-label">
              <template v-if="counts.online > 0">
                <div class="pie-center-value">{{ onlineRate }}<span class="pie-center-unit">%</span></div>
                <div class="pie-center-text">在线率</div>
              </template>
              <template v-else>
                <div class="pie-center-value" style="color: #cbd5e1;">- -</div>
                <div class="pie-center-text">在线率</div>
              </template>
            </div>
          </div>
        </div>
        <div class="alert-panel">
          <div class="alert-header">
            <span class="blink-dot"></span>
            <span class="alert-title">今日告警</span>
            <span class="alert-count" v-if="recentAlerts.length">{{ recentAlerts.length }} 条</span>
          </div>
          <div v-if="recentAlerts.length" class="alert-scroll-outer">
            <div class="alert-scroll-wrapper" ref="alertScrollRef">
              <div class="alert-scroll-inner">
                <div
                  v-for="(alert, i) in recentAlerts"
                  :key="i"
                  class="alert-item"
                  :class="'alert-' + alert.level"
                >
                  <div class="alert-content" :style="{ background: alertBg(alert.level) }">
                    <div class="alert-top">
                      <span class="alert-device" @click="goDevice(alert.device)">{{ alert.device }}</span>
                      <span class="alert-time">{{ formatAlertTime(alert.time) }}</span>
                    </div>
                    <div class="alert-msg">{{ alert.msg }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="alert-fade-mask"></div>
          </div>
          <div v-else class="alert-empty">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="4" width="24" height="28" rx="3" stroke="#cbd5e1" stroke-width="1.5"/>
              <line x1="11" y1="12" x2="25" y2="12" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="11" y1="18" x2="22" y2="18" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="11" y1="24" x2="18" y2="24" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div class="alert-empty-text">暂无告警</div>
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
import { ClusterOutlined, CheckCircleOutlined, StopOutlined, WarningOutlined, LockOutlined } from '@ant-design/icons-vue';
import http from '@/api/http';
import { useDeviceEvents } from '@/composables/useDeviceEvents';

const router = useRouter();

// 监听设备事件，自动刷新仪表盘
useDeviceEvents(() => {
  loadDashboard();
});

// ─── 统计 ───
const counts = reactive({ total: 0, online: 0, offline: 0, fault: 0, unactivated: 0, alertBadge: 0, activeToday: 0 });

const statCards = computed(() => [
  { key: 'total' as const, label: '设备总数', gradient: 'linear-gradient(135deg, #2a4a7f, #3b82f6)', icon: ClusterOutlined },
  { key: 'online' as const, label: '在线', gradient: 'linear-gradient(135deg, #0d6b5e, #1a8c6e)', icon: CheckCircleOutlined },
  { key: 'offline' as const, label: '离线', gradient: 'linear-gradient(135deg, #5a6a7a, #a0aec0)', icon: StopOutlined },
  { key: 'fault' as const, label: '故障', gradient: 'linear-gradient(135deg, #8b3a3a, #c96b6b)', icon: WarningOutlined },
  { key: 'unactivated' as const, label: '未激活', gradient: 'linear-gradient(135deg, #4a5e78, #7c9ab8)', icon: LockOutlined },
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

// ─── 告警背景渐变 ───
function alertBg(level: string) {
  const m: Record<string, string> = {
    critical: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
    major: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))',
    minor: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.03))',
    info: 'linear-gradient(135deg, rgba(100,116,139,0.10), rgba(100,116,139,0.03))',
  };
  return m[level] || m.info;
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

// ─── 告警自动滚动 ───
const alertScrollRef = ref<HTMLElement>();
const pieRef = ref<HTMLElement>();
let pieInstance: any = null;

const onlineRate = computed(() => {
  const total = counts.total || 0;
  if (total === 0) {
    return '0.0';
  }
  return ((counts.online / total) * 100).toFixed(1);
});

async function renderPie() {
  if (!pieRef.value) {
    return;
  }
  const echarts = await import('echarts');
  if (pieInstance) {
    pieInstance.dispose();
  }
  pieInstance = echarts.init(pieRef.value);

  const hasData = counts.online + counts.offline + counts.fault + counts.unactivated > 0;
  const data = hasData ? [
    { value: counts.online, name: '在线', itemStyle: { color: '#1a8c6e' } },
    { value: counts.offline, name: '离线', itemStyle: { color: '#a0aec0' } },
    { value: counts.fault, name: '故障', itemStyle: { color: '#c96b6b' } },
    { value: counts.unactivated, name: '未激活', itemStyle: { color: '#7c9ab8' } },
  ] : [
    { value: 1, name: '暂无设备', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#2a4a7f' }, { offset: 1, color: '#3b82f6' }] } } },
  ];

  // 颜色映射：[亮色, 暗色]
  const colorMap: Record<string, string[]> = {
    '在线': ['#2dd4bf', '#0d6b5e'],
    '离线': ['#c0cad8', '#7a8a9a'],
    '故障': ['#e08080', '#8b3a3a'],
    '未激活': ['#9cb8d4', '#4a5e78'],
    '暂无设备': ['#3b82f6', '#2a4a7f'],
  };

  // 主体数据加渐变
  const mainData = data.map((d: any) => ({
    ...d,
    itemStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: (colorMap[d.name] || ['#a0aec0', '#7a8a9a'])[0] },
          { offset: 1, color: (colorMap[d.name] || ['#a0aec0', '#7a8a9a'])[1] },
        ],
      },
    },
  }));

  // 底座数据：统一暗色
  const shadowData = data.map((d: any) => ({
    value: d.value,
    name: '',
    itemStyle: { color: '#e2e8f0' },
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.name === '暂无设备') return '暂无设备';
        return `${params.name}: ${params.value} 台 (${params.percent}%)`;
      },
    },
    legend: {
      bottom: 4,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: '#64748b', fontSize: 12 },
      data: hasData ? ['在线', '离线', '故障', '未激活'] : ['暂无设备'],
    },
    series: [
      // 底座：往下偏移，浅灰色，模拟厚度
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '47%'],
        silent: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3,
        },
        label: { show: false },
        tooltip: { show: false },
        data: shadowData,
        z: 1,
      },
      // 主体
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 8,
        },
        data: mainData,
        z: 2,
      },
    ],
  };
  pieInstance.setOption(option);
}
let alertScrollTimer: any = null;

function startAlertScroll() {
  stopAlertScroll();
  const el = alertScrollRef.value;
  if (!el) {
    return;
  }
  alertScrollTimer = setInterval(() => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      el.scrollTop = 0;
    } else {
      el.scrollTop += 1;
    }
  }, 50);

  el.addEventListener('mouseenter', stopAlertScroll);
  el.addEventListener('mouseleave', startAlertScroll);
}

function stopAlertScroll() {
  if (alertScrollTimer) {
    clearInterval(alertScrollTimer);
    alertScrollTimer = null;
  }
}

// ─── 地图 ───
const mapRef = ref<HTMLElement>();
let map: L.Map | null = null;

const statusColor: Record<string, string> = {
  online: '#1a8c6e',
  offline: '#a0aec0',
  fault: '#c96b6b',
  unactivated: '#7c9ab8',
};
const statusLabel: Record<string, string> = {
  online: '在线',
  offline: '离线',
  fault: '故障',
  unactivated: '未激活',
};

function initMap() {
  if (!mapRef.value) return;
  map = L.map(mapRef.value, {
    center: [20, 120],
    zoom: 2,
    minZoom: 2,
    maxBoundsViscosity: 1.0,
    maxBounds: [[-90, -180], [90, 180]],
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // 添加 zoom 控件到右下
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 设备点（有坐标的）
  const devs = mapDevices.value.length ? mapDevices.value : [];
  devs.forEach((d: any) => {
    const color = statusColor[d.status] || '#a0aec0';
    const needBreathe = d.status === 'online' || d.status === 'fault';
    const icon = L.divIcon({
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      html: `<div class="map-dot map-dot-${d.status}">
        <div class="dot-core" style="background:${color}"></div>
        ${needBreathe ? `<div class="dot-ripple" style="border-color:${color}"></div>` : ''}
      </div>`,
    });
    const marker = L.marker([d.lat!, d.lng!], { icon }).addTo(map!);

    marker.bindTooltip(
      `<div style="font-family:monospace;font-size:12px;line-height:1.6">
        <div style="font-weight:600;color:${color}">${d.sn}</div>
        <div>状态: ${statusLabel[d.status] || d.status}</div>
      </div>`,
      { className: 'dark-tooltip', direction: 'top', offset: [0, -14] },
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
    counts.activeToday = s.activeToday || 0;
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

    // 启动告警滚动
    nextTick(() => {
      startAlertScroll();
      renderPie();
    });

    // 更新地图点位（地图已在 onMounted 初始化，这里重新加载点位）
    if (mapDevices.value.length) {
      if (map) { map.eachLayer((l: any) => { if (l instanceof L.Marker) map!.removeLayer(l); }); }
      mapDevices.value.forEach((d: any) => {
        const color = (statusColor as any)[d.status] || '#a0aec0';
        const needBreathe = d.status === 'online' || d.status === 'fault';
        const icon = L.divIcon({
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: `<div class="map-dot map-dot-${d.status}">
            <div class="dot-core" style="background:${color}"></div>
            ${needBreathe ? `<div class="dot-ripple" style="border-color:${color}"></div>` : ''}
          </div>`,
        });
        const marker = L.marker([d.lat, d.lng], { icon }).addTo(map!);
        marker.bindTooltip(
          '<div style="font-size:12px"><b>' + d.sn + '</b><br>状态: ' + ((statusLabel as any)[d.status] || d.status) + '</div>',
          { direction: 'top', offset: [0, -14] }
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
  height: calc(100vh - 64px);
  background: #f5f7fa;
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
  border: none;
  border-radius: 12px;
  padding: 28px 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
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
  font-size: 52px !important;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  transition: all 0.3s;
}

.stat-card:hover .stat-icon {
  color: rgba(255, 255, 255, 0.55);
  transform: scale(1.1);
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.stat-value {
  font-size: 34px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: #fff;
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
  border: none;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
}

.map-panel:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.map-container {
  width: 100%;
  height: 100%;
  background: #e8ecf1;
}

/* ─── 地图点样式 ─── */
/* ─── 地图标点 ─── */
:deep(.map-dot) {
  position: relative;
  width: 20px;
  height: 20px;
}
:deep(.dot-core) {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
:deep(.dot-ripple) {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  transform: translate(-50%, -50%);
  animation: ripple 2.5s ease-out infinite;
}
:deep(.map-dot-fault .dot-ripple) {
  animation-duration: 1.5s;
}
@keyframes ripple {
  0% { width: 10px; height: 10px; opacity: 0.8; }
  100% { width: 30px; height: 30px; opacity: 0; }
}

/* ─── 地图图例 ─── */
.map-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #475569;
  z-index: 1000;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-online {
  background: #1a8c6e;
  box-shadow: 0 0 4px rgba(26, 140, 110, 0.5);
}
.legend-offline {
  background: #a0aec0;
}
.legend-fault {
  background: #c96b6b;
  box-shadow: 0 0 4px rgba(201, 107, 107, 0.5);
}

/* ─── 地图 Tooltip ─── */
:deep(.dark-tooltip) {
  background: #fff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  color: #1a1a2e !important;
}
:deep(.dark-tooltip::before) {
  border-top-color: #e2e8f0 !important;
}

/* ─── Leaflet zoom 按钮 ─── */
:deep(.leaflet-control-zoom a) {
  background: #fff !important;
  color: #64748b !important;
  border-color: #e2e8f0 !important;
}
:deep(.leaflet-control-zoom a:hover) {
  background: #f5f7fa !important;
  color: #3b82f6 !important;
}

/* ─── 告警面板 ─── */
.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.alert-panel {
  flex: 1;
  background: #fff;
  border: none;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
}

.alert-panel:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.online-rate-panel {
  flex: 1;
  background: #fff;
  border: none;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
}

.online-rate-panel:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.rate-panel-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.rate-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  letter-spacing: 0.5px;
}

.rate-panel-active {
  margin-left: auto;
  font-size: 12px;
  color: #1a8c6e;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeSlideIn 0.6s ease;
}

.active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1a8c6e;
  animation: activePulse 2s ease-in-out infinite;
}

@keyframes activePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(26, 140, 110, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(26, 140, 110, 0); }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.rate-panel-inactive {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.pie-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
}

.pie-container {
  width: 100%;
  height: 100%;
}

.pie-center-label {
  position: absolute;
  top: 43%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.pie-center-value {
  font-size: 25px;
  font-weight: 700;
  color: #2a4a7f;
  line-height: 1.1;
}

.pie-center-unit {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.pie-center-text {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.pie-center-icon {
  margin-bottom: 4px;
}

.pie-center-empty {
  font-size: 11px;
  color: #94a3b8;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
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
  color: #1a1a2e;
  letter-spacing: 0.5px;
}

.alert-count {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.alert-scroll-outer {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.alert-scroll-wrapper {
  height: 100%;
  overflow: hidden;
}

.alert-scroll-inner {
  padding: 8px 0;
}

.alert-fade-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: linear-gradient(transparent, #fff);
  pointer-events: none;
}

.alert-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.alert-empty-text {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.alert-empty-hint {
  font-size: 12px;
  color: #94a3b8;
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
  background: #d0d8e0;
  border-radius: 2px;
}

.alert-item {
  margin: 0 12px 8px;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.alert-item:hover {
  transform: translateX(2px);
}

.alert-content {
  padding: 10px 14px;
  min-width: 0;
  border-radius: 8px;
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
  font-weight: 600;
  color: #4a6fa5;
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
  color: #94a3b8;
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
