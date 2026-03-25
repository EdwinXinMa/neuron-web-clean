<template>
  <div class="devices-view">
    <!-- 左侧面板 -->
    <div class="left-panel">
      <div class="panel-header">
        <a-input-search
          v-model:value="searchText"
          placeholder="按序列号搜索..."
          allow-clear
          class="search-input"
          @search="onSearch"
        />
      </div>
      <div class="status-filter">
        <a-radio-group v-model:value="statusFilter" button-style="solid" size="small" class="filter-group">
          <a-radio-button value="all">全部</a-radio-button>
          <a-radio-button value="online">在线</a-radio-button>
          <a-radio-button value="offline">离线</a-radio-button>
          <a-radio-button value="fault">故障</a-radio-button>
          <a-radio-button value="unactivated">未激活</a-radio-button>
        </a-radio-group>
      </div>
      <div class="device-list">
        <template v-for="(group, gIdx) in groupedDevices" :key="gIdx">
          <div
            v-for="device in group.items"
            :key="device.sn"
            :class="['device-item', { active: selectedSn === device.sn }]"
            @click="selectDevice(device)"
          >
            <span :class="['status-dot', `status-${(device.onlineStatus || 'UNACTIVATED').toLowerCase()}`]"></span>
            <div class="device-info">
              <div class="device-sn">{{ device.sn }}</div>
              <div class="device-meta">
                <span :class="['status-text', `text-${(device.onlineStatus || 'UNACTIVATED').toLowerCase()}`]">{{ statusLabel((device.onlineStatus || 'UNACTIVATED').toLowerCase()) }}</span>
                <span class="hb-time">{{ device.lastHeartbeat ? formatHb(device.lastHeartbeat) : '-' }}</span>
              </div>
            </div>
          </div>
          <div v-if="gIdx < groupedDevices.length - 1" class="group-divider"></div>
        </template>
        <div v-if="deviceList.length === 0" class="empty-list">无匹配设备</div>
      </div>
      <div class="pagination-bar">
        <a-pagination
          v-model:current="currentPage"
          :total="filteredTotal"
          :page-size="pageSize"
          size="small"
          :show-total="(total: number) => `共 ${total} 台`"
        />
      </div>
    </div>

    <!-- 右侧详情区 -->
    <div class="right-panel">
      <div v-if="!selectedDevice" class="empty-detail">
        <div class="empty-icon">📡</div>
        <div class="empty-text">← 从左侧选择一台设备查看详情</div>
      </div>
      <div v-else class="detail-content">
        <!-- 头部：SN + 台账摘要 -->
        <div class="detail-header">
          <div class="detail-header-left">
            <div class="detail-sn">{{ selectedDevice.sn }}</div>
            <div class="detail-sub">
              <span class="sub-label">经销商</span>
              <span v-if="selectedDevice.dealer">{{ selectedDevice.dealer }}</span>
              <a-tooltip v-else title="台账信息不完整，请前往设备管理完善">
                <span class="sub-empty">未填写 <span class="sub-tip-icon">⚠</span></span>
              </a-tooltip>
              <span class="sub-sep">·</span>
              <span class="sub-label">类型</span><span>{{ selectedDevice.deviceType || '-' }}</span>
              <span class="sub-sep">·</span>
              <span class="sub-label">型号</span><span>{{ selectedDevice.deviceModel || '-' }}</span>
              <span class="sub-sep">·</span>
              <span class="sub-label">出货</span><span>{{ selectedDevice.shipDate ? selectedDevice.shipDate.slice(0, 10) : '-' }}</span>
            </div>
          </div>
          <div class="detail-header-right">
            <span :class="['status-badge', `status-badge-${selectedDevice.status}`]">
              {{ statusLabel(selectedDevice.status) }}
            </span>
          </div>
        </div>

        <!-- 未激活提示 -->
        <div v-if="selectedDevice.status === 'unactivated'" class="unactivated-tip">
          ⚠ 设备未激活，等待首次上线
        </div>

        <!-- 两列 grid -->
        <div class="detail-grid">
          <!-- 左列：设备状态 -->
          <div class="detail-section">
            <div class="section-title">设备状态</div>
            <div class="info-row">
              <span class="info-label">在线状态</span>
              <span class="info-value">
                <a-badge :status="badgeStatus(selectedDevice.status)" :text="statusLabel(selectedDevice.status)" :class="`badge-${selectedDevice.status}`" />
                <a-tooltip v-if="(selectedDevice.status === 'online' || selectedDevice.status === 'fault') && !resetting" title="重启">
                  <a-popconfirm
                    title="确认重启该设备？"
                    ok-text="确认"
                    cancel-text="取消"
                    @confirm="resetDevice"
                  >
                    <ReloadOutlined class="reset-icon" />
                  </a-popconfirm>
                </a-tooltip>
                <a-tooltip v-if="resetting" title="重启中...">
                  <LoadingOutlined class="reset-icon resetting" />
                </a-tooltip>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">最后心跳</span>
              <span class="info-value">{{ selectedDevice.lastHb }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">固件版本</span>
              <span class="info-value">
                {{ selectedDevice.fw }}
                <a-button v-if="selectedDevice.status !== 'unactivated' && otaPhase === 'idle'" type="link" size="small" class="action-btn" @click="openOtaSelect">升级</a-button>
              </span>
            </div>
            <!-- 选择固件（内嵌） -->
            <div v-if="otaPhase === 'select'" class="ota-inline">
              <div class="ota-inline-header"><span class="ota-inline-label">选择目标固件版本</span></div>
              <div v-if="firmwareList.length === 0" style="color: #64748b; font-size: 13px; padding: 4px 0;">暂无可用固件</div>
              <a-radio-group v-else v-model:value="selectedFw" class="fw-radio-group" style="width:100%;">
                <div v-for="fw in firmwareList" :key="fw.id" class="fw-option">
                  <a-radio :value="fw.id">
                    <span style="color:#00d4ff;font-weight:600;">{{ fw.version }}</span>
                    <span style="color:#64748b;font-size:12px;margin-left:8px;">{{ fw.releaseNotes || '无说明' }}</span>
                  </a-radio>
                </div>
              </a-radio-group>
              <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
                <a-button size="small" @click="closeOtaModal">取消</a-button>
                <a-button size="small" type="primary" :disabled="!selectedFw" @click="confirmOta" style="background:rgba(0,212,255,0.15);border-color:#00d4ff;color:#00d4ff;">确认升级</a-button>
              </div>
            </div>

            <!-- 升级进度（内嵌，不弹窗） -->
            <div v-if="otaPhase === 'running'" class="ota-inline">
              <div class="ota-inline-header">
                <span class="ota-inline-label">{{ otaStatusText }}</span>
                <span class="ota-inline-pct">{{ otaProgress }}%</span>
              </div>
              <div class="ota-bar-bg">
                <div class="ota-bar" :style="{ width: otaProgress + '%' }"></div>
              </div>
              <div v-if="otaError" class="ota-error-text">{{ otaError }}</div>
              <a-button v-if="otaStatus === 'COMPLETED' || otaStatus === 'FAILED'" size="small" class="ota-close-btn" @click="closeOtaModal">关闭</a-button>
            </div>
            <div class="info-row">
              <span class="info-label">硬件版本</span>
              <span class="info-value">{{ selectedDevice.hardwareVersion || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">IP 地址</span>
              <span class="info-value">{{ selectedDevice.ipAddress || '-' }}</span>
            </div>
          </div>

          <!-- 右列：家庭电力 -->
          <div class="detail-section">
            <div class="section-title">家庭电力（CT 数据）</div>
            <a-alert
              v-if="selectedDevice.ctMax > 0 && selectedDevice.ctCurrent / selectedDevice.ctMax >= 0.9"
              type="warning"
              show-icon
              :message="`电流 ${selectedDevice.ctCurrent}A 已达阈值 ${selectedDevice.ctMax}A 的 ${Math.round(selectedDevice.ctCurrent / selectedDevice.ctMax * 100)}%`"
              class="current-warning"
            />
            <div class="info-row">
              <span class="info-label">入户总电流</span>
              <span class="info-value highlight">{{ selectedDevice.ctCurrent > 0 ? selectedDevice.ctCurrent + ' A' : '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">最大电流阈值</span>
              <span class="info-value">
                {{ selectedDevice.ctMax }} A
                <a-button v-if="selectedDevice.status !== 'unactivated'" type="link" size="small" class="action-btn" @click="openDlmModal">修改</a-button>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">电压</span>
              <span class="info-value">{{ selectedDevice.voltage > 0 ? selectedDevice.voltage + ' V' : '-' }}</span>
            </div>
          </div>

          <!-- 下挂充电桩（跨两列） -->
          <div class="detail-section full">
            <div class="section-title">下挂充电桩</div>
            <div v-if="selectedDevice.chargers.length === 0" class="no-chargers">暂无下挂充电桩</div>
            <div v-for="pile in selectedDevice.chargers" :key="pile.sn" class="pile-block">
              <!-- 桩行 -->
              <div class="pile-row">
                <span :class="['status-dot', `status-${pile.status}`]"></span>
                <span class="pile-sn">{{ pile.sn }}</span>
                <span class="pile-model">{{ pile.model }}</span>
                <a-tag :color="chargerTagColor(pile.status)" class="charger-tag">{{ chargerStatusLabel(pile.status) }}</a-tag>
              </div>
              <!-- 枪行（缩进） -->
              <div v-for="(conn, cidx) in pile.connectors" :key="conn.id" class="connector-row">
                <span class="conn-indent">└</span>
                <span :class="['status-dot', `status-${conn.status}`]"></span>
                <span class="conn-label">枪 {{ cidx + 1 }}</span>
                <a-tag :color="chargerTagColor(conn.status)" class="charger-tag" size="small">{{ chargerStatusLabel(conn.status) }}</a-tag>
                <span class="conn-current">{{ conn.current > 0 ? conn.current + ' A' : '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 告警 / 日志（跨两列） -->
          <div class="detail-section full">
            <a-tabs v-model:activeKey="logTab" class="dark-tabs">
              <a-tab-pane key="alerts" tab="最近告警">
                <div v-if="deviceAlerts.length === 0" class="no-data">暂无告警记录</div>
                <div v-for="(alert, idx) in deviceAlerts" :key="idx" class="alert-row">
                  <a-tag :color="{ critical: '#ff4757', major: '#ff9f43', minor: '#00d4ff', info: '#64748b' }[alert.level] || '#faad14'" size="small">
                    {{ { critical: '严重', major: '重要', minor: '一般', info: '信息' }[alert.level] || alert.level }}
                  </a-tag>
                  <span class="alert-msg">{{ alert.msg }}</span>
                  <span class="alert-time">{{ alert.time }}</span>
                </div>
              </a-tab-pane>
              <a-tab-pane key="logs" tab="操作日志">
                <div v-if="deviceLogs.length === 0" class="no-data">暂无操作记录</div>
                <div v-for="(log, idx) in deviceLogs" :key="idx" class="log-row">
                  <span class="log-time">{{ log.time }}</span>
                  <a-tag color="blue" size="small">{{ log.type }}</a-tag>
                  <span class="log-content">{{ log.content }}</span>
                  <a-tag :color="log.result === 'success' ? '#52c41a' : '#ff4757'" size="small">{{ log.result === 'success' ? '成功' : '失败' }}</a-tag>
                  <span class="log-user">{{ log.user }}</span>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>
        </div>
      </div>
    </div>

    <!-- DLM 修改 Modal -->
    <a-modal
      v-model:open="showDlmModal"
      title="修改最大电流阈值"
      @ok="confirmDlm"
      ok-text="确认修改"
      cancel-text="取消"
      class="dark-modal"
    >
      <p style="color: #94a3b8; margin-bottom: 16px;">选择电流档位：</p>
      <a-radio-group v-model:value="selectedDlm" class="dlm-radio-group">
        <a-radio-button v-for="amp in dlmOptions" :key="amp" :value="amp" class="dlm-option">
          {{ amp }}A{{ selectedDevice && selectedDevice.ctMax === amp ? ' (当前)' : '' }}
        </a-radio-button>
      </a-radio-group>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { message } from 'ant-design-vue';
  import { getDeviceList, getDeviceDetail } from '@/api/device';
  import http from '@/api/http';
  import { useDeviceEvents } from '@/composables/useDeviceEvents';
  import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons-vue';

  // 监听设备事件，自动刷新列表
  useDeviceEvents(() => {
    loadList();
    if (selectedSn.value) {
      loadDetail(selectedSn.value);
      resetting.value = false;
    }
  });

  // ==================== State ====================
  const route = useRoute();
  const router = useRouter();

  const searchText = ref('');
  const statusFilter = ref('all');
  const selectedSn = ref<string | null>(null);
  const currentPage = ref(1);
  const pageSize = 10;
  const logTab = ref('alerts');
  const loading = ref(false);
  const detailLoading = ref(false);

  // 列表数据
  const deviceList = ref<any[]>([]);
  const total = ref(0);

  // 详情数据
  const deviceDetail = ref<any>(null);

  // Modal state
  const showOtaModal = ref(false);
  const showDlmModal = ref(false);
  const selectedFw = ref<string>('');
  const selectedDlm = ref<number>(32);
  const dlmOptions = [20, 25, 32, 40, 50, 63];
  const firmwareList = ref<any[]>([]);

  // OTA 升级流程状态
  const otaPhase = ref<'idle' | 'select' | 'running'>('idle');
  const otaStatus = ref('');
  const otaProgress = ref(0);
  const otaMessage = ref('');
  const otaTaskId = ref('');
  const otaError = ref('');
  let otaWs: WebSocket | null = null;
  let otaAnimTimer: ReturnType<typeof setInterval> | null = null;

  // 平滑过渡进度条：从当前值缓动到目标值
  function animateOtaProgress(target: number, durationMs = 2000) {
    if (otaAnimTimer) { clearInterval(otaAnimTimer); otaAnimTimer = null; }
    const start = otaProgress.value;
    if (start >= target) { otaProgress.value = target; return; }
    const step = Math.max(1, Math.round((target - start) / (durationMs / 60)));
    otaAnimTimer = setInterval(() => {
      otaProgress.value = Math.min(otaProgress.value + step, target);
      if (otaProgress.value >= target) {
        if (otaAnimTimer) { clearInterval(otaAnimTimer); otaAnimTimer = null; }
      }
    }, 60);
  }

  const otaStatusText = computed(() => {
    const map: Record<string, string> = {
      PENDING: '等待升级...',
      DOWNLOADING: '固件下载中...',
      INSTALLING: '安装中...',
      COMPLETED: '升级完成',
      FAILED: '升级失败',
    };
    return map[otaStatus.value] || otaMessage.value || '升级中...';
  });

  const otaProgressStatus = computed(() => {
    if (otaStatus.value === 'COMPLETED') return 'success';
    if (otaStatus.value === 'FAILED') return 'exception';
    return 'active';
  });

  function openOtaSelect() {
    selectedFw.value = '';
    otaPhase.value = 'select';
    loadFirmwares();
  }

  async function loadFirmwares() {
    try {
      const res: any = await http.get('/firmware/list', { params: { status: 'RELEASED', pageSize: 50 } });
      const data = res.result || res;
      firmwareList.value = (data.records || data || []);
    } catch {
      firmwareList.value = [];
    }
  }

  // ==================== 列表数据加载 ====================
  async function loadList() {
    loading.value = true;
    try {
      const res: any = await getDeviceList({
        sn: searchText.value || undefined,
        onlineStatus: statusFilter.value === 'all' ? undefined : statusFilter.value,
        pageNo: currentPage.value,
        pageSize,
      });
      const data = res.result || res;
      deviceList.value = data.records || [];
      total.value = data.total || 0;
    } catch (e: any) {
      message.error('加载设备列表失败');
    } finally {
      loading.value = false;
    }
  }

  // ==================== 详情数据加载 ====================
  async function loadDetail(sn: string) {
    detailLoading.value = true;
    deviceLogsData.value = [];
    try {
      // 并行拉详情和日志
      const [detailRes, logRes]: any[] = await Promise.all([
        getDeviceDetail(sn),
        http.get('/oplog/list', { params: { deviceSn: sn, pageSize: 20 } }),
      ]);
      deviceDetail.value = detailRes.result || detailRes;
      const logData = logRes.result || logRes;
      deviceLogsData.value = (logData.records || []).map((l: any) => ({
        time: l.opTime || l.createTime || '-',
        user: l.opUser || '-',
        type: opTypeLabel(l.opType),
        content: l.opContent || '-',
        result: l.opResult === 'SUCCESS' ? 'success' : 'fail',
      }));
    } catch (e: any) {
      message.error('加载设备详情失败');
    } finally {
      detailLoading.value = false;
    }
  }

  function opTypeLabel(t: string): string {
    const map: Record<string, string> = {
      OTA_UPGRADE: 'OTA 升级',
      DLM_CONFIG: 'DLM 修改',
      REMOTE_REBOOT: '远程重启',
      REMOTE_RESET: '远程重置',
    };
    return map[t] || t || '其他';
  }

  // ==================== Computed ====================
  const statusOrder: Record<string, number> = { FAULT: 0, fault: 0, ONLINE: 1, online: 1, OFFLINE: 2, offline: 2, UNACTIVATED: 3, unactivated: 3 };

  const filteredTotal = computed(() => total.value);

  // 前端 groupedDevices 直接用 deviceList（排序由后端处理）
  const groupedDevices = computed(() => {
    const list = deviceList.value;
    if (!list.length) return [];
    const groups: { key: string; items: any[] }[] = [];
    let lastOrder = -1;
    for (const device of list) {
      const order = statusOrder[device.onlineStatus] ?? 9;
      if (order !== lastOrder) {
        groups.push({ key: `${order}`, items: [] });
        lastOrder = order;
      }
      groups[groups.length - 1].items.push(device);
    }
    return groups;
  });

  const selectedDevice = computed(() => {
    const d = deviceDetail.value?.device;
    if (!d) return null;
    const ct = deviceDetail.value?.ctData || {};
    // 适配层：统一字段名，兼容模板
    return {
      ...d,
      status: (d.onlineStatus || 'UNACTIVATED').toLowerCase(),
      lastHb: d.lastHeartbeat ? formatHb(d.lastHeartbeat) : '-',
      fw: d.firmwareVersion || '-',
      // 台账字段透传（后端原字段名直接用）
      dealer: d.dealer,
      deviceType: d.deviceType,
      deviceModel: d.deviceModel,
      batchNo: d.batchNo,
      hardwareVersion: d.hardwareVersion,
      macAddress: d.macAddress,
      productionDate: d.productionDate,
      shipDate: d.shipDate,
      ipAddress: d.ipAddress,
      ctCurrent: ct.totalCurrent ?? 0,
      ctMax: ct.breakerRating ?? d.breakerRating ?? 32,
      voltage: ct.voltage ?? 0,
      dataFresh: ct.dataFresh !== false,
      chargers: (deviceDetail.value?.chargers || []).map((pile: any) => ({
        sn: pile.sn,
        model: pile.model || pile.deviceModel || '-',
        status: pile.onlineStatus ? pile.onlineStatus.toLowerCase() : 'offline',
        connectors: (pile.connectors || []).map((conn: any) => ({
          id: conn.connectorId,
          status: conn.status === 'Charging' ? 'charging' : conn.status === 'Faulted' ? 'fault' : 'idle',
          current: conn.currentPower ?? 0,
        })),
      })),
    };
  });
  const deviceAlerts = computed(() => {
    return (deviceDetail.value?.recentAlerts || []).map((a: any) => ({
      level: a.alertLevel === 'CRITICAL' ? 'critical'
           : a.alertLevel === 'IMPORTANT' ? 'major'
           : a.alertLevel === 'NORMAL' ? 'minor' : 'info',
      msg: a.description || a.errorCode || '-',
      time: a.alertTime || '-',
    }))
  });
  const deviceLogsData = ref<any[]>([]);
  const deviceLogs = computed(() => deviceLogsData.value);

  // ==================== Methods ====================
  function formatHb(hb: string | null): string {
    if (!hb) return '-';
    const diff = Date.now() - new Date(hb).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min}分钟前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  }

  function statusLabel(status: string): string {
    const map: Record<string, string> = { online: '在线', offline: '离线', fault: '故障', unactivated: '未激活' };
    return map[status] || status;
  }

  function badgeStatus(status: string): string {
    const map: Record<string, string> = { online: 'success', offline: 'default', fault: 'error', unactivated: 'warning' };
    return map[status] || 'default';
  }

  function alertLevelLabel(level: string): string {
    const map: Record<string, string> = { CRITICAL: 'critical', IMPORTANT: 'major', NORMAL: 'minor', INFO: 'info' };
    return map[level] || level.toLowerCase();
  }

  function alertLevelText(level: string): string {
    const map: Record<string, string> = { CRITICAL: '严重', IMPORTANT: '重要', NORMAL: '一般', INFO: '信息' };
    return map[level] || level;
  }

  function chargerStatusLabel(status: string): string {
    const map: Record<string, string> = {
      charging: '充电中', idle: '空闲', fault: '故障',
      online: '在线', offline: '离线', unactivated: '未激活',
    };
    return map[status] || status;
  }

  function chargerTagColor(status: string): string {
    const map: Record<string, string> = {
      charging: '#00d4ff', idle: '#52c41a', fault: '#ff4757',
      online: '#00ff88', offline: '#64748b', unactivated: '#faad14',
    };
    return map[status] || '#64748b';
  }

  function selectDevice(device: any) {
    selectedSn.value = device.sn;
    logTab.value = 'alerts';
    loadDetail(device.sn);
    router.replace({ query: { ...route.query, id: device.sn } });
  }

  function onDevicePageChange(page) {
    currentPage.value = page;
    loadList();
  }

  function onSearch() {
    if (currentPage.value !== 1) {
      currentPage.value = 1; // watcher will call loadList
    } else {
      loadList();
    }
  }

  const resetting = ref(false);

  async function resetDevice() {
    if (!selectedDevice.value) return;
    const sn = selectedDevice.value.sn;
    try {
      resetting.value = true;
      await http.post(`/device/${sn}/reset`, null, { params: { type: 'Soft' } });
      message.success('重启命令已下发');
    } catch (e: any) {
      resetting.value = false;
      message.error(e?.response?.data?.message || '重启命令下发失败');
    }
  }

  function openDlmModal() {
    if (deviceDetail.value?.ctData) {
      selectedDlm.value = deviceDetail.value.ctData.breakerRating || 32;
    }
    showDlmModal.value = true;
  }

  async function confirmOta() {
    if (!selectedFw.value || !selectedDevice.value) return;
    const deviceSn = selectedDevice.value.sn;

    // 1. 先建 WebSocket，确保连上后再发升级指令
    otaPhase.value = 'running';
    otaStatus.value = 'PENDING';
    otaProgress.value = 0;
    otaError.value = '';
    otaMessage.value = '正在建立连接...';
    showOtaModal.value = false;

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${location.host}/api/otaSocket/${deviceSn}`;

    function setupWsMessageHandler(wsConn: WebSocket) {
      wsConn.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data);
          const newStatus = d.status || otaStatus.value;
          otaMessage.value = d.message || otaMessage.value;

          if (newStatus !== otaStatus.value) otaStatus.value = newStatus;
          if (newStatus === 'PENDING') {
            animateOtaProgress(5, 3000);
          } else if (newStatus === 'DOWNLOADING') {
            const rawP = d.progress ?? 0;
            const target = rawP >= 100 ? 50 : Math.round(5 + (rawP / 100) * 45);
            animateOtaProgress(target, 2000);
          } else if (newStatus === 'INSTALLING') {
            const rawP = d.progress ?? 0;
            const target = Math.round(55 + (rawP / 100) * 35);
            animateOtaProgress(target, 2000);
          } else if (newStatus === 'COMPLETED') {
            animateOtaProgress(100, 800);
            message.success('固件升级成功');
            setTimeout(() => loadDetail(deviceSn), 1500);
          } else if (newStatus === 'FAILED') {
            otaError.value = d.message || '升级失败，请重试';
            if (otaAnimTimer) { clearInterval(otaAnimTimer); otaAnimTimer = null; }
          }
        } catch { /* ignore parse errors */ }
      };
    }

    // 启动轮询兜底（无论 WebSocket 是否连上都启动，确保不漏状态）
    function startPollingFallback() {
      const pollTimer = setInterval(async () => {
        if (!otaTaskId.value) return;
        try {
          const r: any = await http.get(`/firmware/upgrade/task/${otaTaskId.value}`);
          const d = r.result || r;
          // 仅在 WebSocket 未推送更新时才用轮询值
          const curStatus = otaStatus.value;
          if (d.status && d.status !== curStatus) {
            otaStatus.value = d.status;
            otaProgress.value = d.progress ?? otaProgress.value;
          }
          if (d.status === 'COMPLETED') {
            if (curStatus !== 'COMPLETED') {
              otaProgress.value = 100;
              message.success('固件升级成功');
              setTimeout(() => loadDetail(deviceSn), 1000);
            }
            clearInterval(pollTimer);
          } else if (d.status === 'FAILED') {
            otaError.value = d.errorMsg || d.message || '升级失败，请重试';
            clearInterval(pollTimer);
          }
        } catch { /* ignore */ }
      }, 2000);
      return pollTimer;
    }

    try {
      otaWs = new WebSocket(wsUrl);
    } catch {
      otaWs = null;
    }

    // 2. 等 WebSocket 连上（最多 3 秒），然后发升级请求
    const wsReady = new Promise<void>((resolve) => {
      if (!otaWs) { resolve(); return; }
      const timeout = setTimeout(() => resolve(), 3000);
      otaWs.onopen = () => { clearTimeout(timeout); resolve(); };
      otaWs.onerror = () => { clearTimeout(timeout); resolve(); };
    });

    await wsReady;

    if (otaWs && otaWs.readyState === WebSocket.OPEN) {
      setupWsMessageHandler(otaWs);
    }

    // 3. 发起升级请求
    try {
      const res: any = await http.post('/firmware/upgrade/start', {
        firmwareId: selectedFw.value,
        deviceSn: deviceSn,
      });
      const taskId = typeof res?.result === 'string' ? res.result : res?.result?.taskId || res?.taskId;
      if (!taskId) {
        console.error('OTA start response:', JSON.stringify(res));
        message.error('升级指令下发失败：未获取到任务ID');
        otaPhase.value = 'idle';
        closeOtaWs();
        return;
      }
      otaTaskId.value = taskId;
      animateOtaProgress(5, 2000);

      // 4. 启动轮询兜底
      const pollTimer = startPollingFallback();
      // 保存 cleanup 引用
      const origClose = otaWs;
      if (origClose) {
        const origOnClose = origClose.onclose;
        origClose.onclose = () => { clearInterval(pollTimer); };
      }
      // closeOtaWs 时也清理 poll
      const _closeOtaWs = closeOtaWs;
      // 挂在 otaWs 上方便统一清理
      if (!otaWs) {
        otaWs = { close: () => clearInterval(pollTimer) } as any;
      }

    } catch (e: any) {
      message.error('升级指令下发失败：' + (e.message || '网络错误'));
      otaPhase.value = 'idle';
      closeOtaWs();
    }
  }

  function closeOtaWs() {
    if (otaAnimTimer) { clearInterval(otaAnimTimer); otaAnimTimer = null; }
    if (otaWs) {
      otaWs.onmessage = null;
      otaWs.onerror = null;
      otaWs.onclose = null;
      if (otaWs.readyState === WebSocket.OPEN || otaWs.readyState === WebSocket.CONNECTING) {
        otaWs.close();
      }
      otaWs = null;
    }
  }

  function closeOtaModal() {
    closeOtaWs();
    showOtaModal.value = false;
    // 重置状态
    otaPhase.value = 'idle';
    otaStatus.value = '';
    otaProgress.value = 0;
    otaMessage.value = '';
    otaTaskId.value = '';
    otaError.value = '';
    selectedFw.value = '';
  }

  async function confirmDlm() {
    if (!selectedDevice.value) return;
    try {
      await http.post(`/device/${selectedDevice.value.sn}/dlm`, {
        breakerRating: selectedDlm.value,
      });
      selectedDevice.value.ctMax = selectedDlm.value;
      showDlmModal.value = false;
      message.success(`阈值已修改为 ${selectedDlm.value}A`);
      // 刷新详情
      setTimeout(() => loadDetail(selectedDevice.value!.sn), 500);
    } catch (e: any) {
      message.error('DLM 修改失败：' + (e.message || '网络错误'));
    }
  }

  // ==================== Init from URL ====================
  onMounted(() => {
    const queryStatus = route.query.status as string;
    if (queryStatus && queryStatus !== 'total') {
      statusFilter.value = queryStatus;
    } else {
      statusFilter.value = 'all';
    }
    const queryId = route.query.id as string;
    if (queryId) {
      selectedSn.value = queryId;
      loadDetail(queryId);
    }
    loadList();
  });

  // 筛选/搜索变化时重新加载
  watch(statusFilter, () => {
    currentPage.value = 1;
    loadList();
  });
  watch(currentPage, () => {
    loadList();
  });
</script>

<style scoped>
  .devices-view {
    display: flex;
    height: 100vh;
    background: #0a1628;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ========== Left Panel ========== */
  .left-panel {
    width: 320px;
    min-width: 320px;
    background: rgba(10, 18, 35, 0.9);
    border-right: 1px solid rgba(0, 212, 255, 0.12);
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  }

  .search-input :deep(.ant-input) {
    background: rgba(15, 25, 50, 0.85) !important;
    border-color: rgba(0, 212, 255, 0.2) !important;
    color: #e2e8f0 !important;
  }

  .search-input :deep(.ant-input::placeholder) {
    color: #64748b !important;
  }

  .search-input :deep(.ant-input-search-button) {
    background: rgba(0, 212, 255, 0.15) !important;
    border-color: rgba(0, 212, 255, 0.3) !important;
    color: #00d4ff !important;
  }

  .search-input :deep(.ant-input-clear-icon) {
    color: #64748b !important;
  }

  .status-filter {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  }

  .filter-group {
    display: flex;
    width: 100%;
  }

  .filter-group :deep(.ant-radio-button-wrapper) {
    flex: 1;
    text-align: center;
    background: rgba(15, 25, 50, 0.6);
    border-color: rgba(0, 212, 255, 0.15);
    color: #94a3b8;
    font-size: 12px;
    padding: 0 6px;
  }

  .filter-group :deep(.ant-radio-button-wrapper-checked) {
    background: rgba(0, 212, 255, 0.15) !important;
    border-color: #00d4ff !important;
    color: #00d4ff !important;
  }

  .filter-group :deep(.ant-radio-button-wrapper:hover) {
    color: #00d4ff;
  }

  /* ========== Device List ========== */
  .device-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .device-list::-webkit-scrollbar {
    width: 4px;
  }

  .device-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .device-list::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.2);
    border-radius: 2px;
  }

  .device-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid transparent;
  }

  .device-item:hover {
    background: rgba(0, 212, 255, 0.04);
  }

  .device-item.active {
    background: rgba(0, 212, 255, 0.08);
    border-left-color: #00d4ff;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .status-dot.status-online {
    background: #00ff88;
    box-shadow: 0 0 6px rgba(0, 255, 136, 0.5);
  }

  .status-dot.status-offline {
    background: #64748b;
  }

  .status-dot.status-fault {
    background: #ff4757;
    box-shadow: 0 0 6px rgba(255, 71, 87, 0.5);
    animation: pulse-fault 2s infinite;
  }

  .status-dot.status-unactivated {
    background: #64748b;
    border: 1px dashed #94a3b8;
  }

  .status-dot.status-charging {
    background: #00d4ff;
    box-shadow: 0 0 6px rgba(0, 212, 255, 0.5);
  }

  .status-dot.status-idle {
    background: #64748b;
  }

  @keyframes pulse-fault {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-sn {
    font-size: 13px;
    font-weight: 500;
    color: #e2e8f0;
    font-family: 'Courier New', monospace;
  }

  .device-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
    font-size: 11px;
  }

  .status-text {
    font-weight: 500;
  }

  .text-online { color: #00ff88; }
  .text-offline { color: #64748b; }
  .text-fault { color: #ff4757; }
  .text-unactivated { color: #94a3b8; }

  .hb-time {
    color: #475569;
  }

  .group-divider {
    border-top: 1px dashed rgba(0, 212, 255, 0.12);
    margin: 4px 16px;
  }

  .empty-list {
    text-align: center;
    color: #475569;
    padding: 32px;
    font-size: 13px;
  }

  .pagination-bar {
    padding: 12px 16px;
    border-top: 1px solid rgba(0, 212, 255, 0.08);
    display: flex;
    justify-content: center;
  }

  .pagination-bar :deep(.ant-pagination-item) {
    background: transparent;
    border-color: rgba(0, 212, 255, 0.2);
  }

  .pagination-bar :deep(.ant-pagination-item a) {
    color: #94a3b8;
  }

  .pagination-bar :deep(.ant-pagination-item-active) {
    border-color: #00d4ff;
  }

  .pagination-bar :deep(.ant-pagination-item-active a) {
    color: #00d4ff;
  }

  .pagination-bar :deep(.ant-pagination-prev button),
  .pagination-bar :deep(.ant-pagination-next button) {
    color: #94a3b8 !important;
  }

  .pagination-bar :deep(.ant-pagination-total-text) {
    color: #64748b;
  }

  /* ========== Right Panel ========== */
  .right-panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .right-panel::-webkit-scrollbar {
    width: 6px;
  }

  .right-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .right-panel::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.15);
    border-radius: 3px;
  }

  .empty-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #475569;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 15px;
  }

  /* ========== Detail Header ========== */
  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  }

  .detail-sn {
    font-size: 20px;
    font-weight: 700;
    color: #00d4ff;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 16px rgba(0, 212, 255, 0.4);
    letter-spacing: 0.5px;
  }

  .detail-sub {
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .sub-sep { color: #334155; }

  .sub-label {
    color: #475569;
    font-size: 11px;
  }

  .sub-empty {
    color: #faad14;
    font-size: 12px;
    cursor: default;
  }

  .sub-tip-icon {
    font-size: 11px;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 99px;
    font-size: 13px;
    font-weight: 600;
  }

  .status-badge-online { background: rgba(0,255,136,0.12); color: #00ff88; }
  .status-badge-offline { background: rgba(100,116,139,0.15); color: #94a3b8; }
  .status-badge-fault { background: rgba(255,71,87,0.12); color: #ff4757; }
  .status-badge-unactivated { background: rgba(250,173,20,0.12); color: #faad14; }

  .unactivated-tip {
    background: rgba(250, 173, 20, 0.08);
    border: 1px solid rgba(250, 173, 20, 0.25);
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #faad14;
  }

  /* ========== Detail Grid ========== */
  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .detail-section {
    background: rgba(15, 25, 50, 0.85);
    border: 1px solid rgba(0, 212, 255, 0.12);
    border-radius: 10px;
    padding: 16px 20px;
  }

  .detail-section.full {
    grid-column: 1 / -1;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #00d4ff;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  }

  .ledger-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 24px;
  }

  .info-value.mono {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #94a3b8;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0, 212, 255, 0.04);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #64748b;
    font-size: 13px;
  }

  .info-value {
    color: #e2e8f0;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-value.highlight {
    color: #00d4ff;
    font-weight: 600;
    font-size: 15px;
  }

  .action-btn {
    color: #00d4ff !important;
    font-size: 12px;
    padding: 0 4px;
    height: auto;
  }

  .action-btn:hover {
    color: #33dfff !important;
  }

  .reset-icon {
    color: #00d4ff;
    font-size: 14px;
    margin-left: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .reset-icon:hover {
    color: #33dfff;
    transform: rotate(90deg);
  }

  .reset-icon.resetting {
    color: #faad14;
    cursor: default;
  }

  /* ── 内嵌 OTA 进度条 ── */
  .ota-inline {
    margin-top: 10px;
    padding: 12px 14px;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.15);
    border-radius: 8px;
  }

  .ota-inline-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .ota-inline-label { color: #94a3b8; }
  .ota-inline-pct { color: #00d4ff; font-weight: 600; }

  .ota-bar-bg {
    height: 6px;
    background: rgba(0, 212, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .ota-bar {
    height: 100%;
    background: linear-gradient(90deg, #00d4ff, #00ff88);
    border-radius: 3px;
    transition: width 0.4s ease;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
  }

  .ota-error-text {
    margin-top: 6px;
    font-size: 12px;
    color: #ff4757;
  }

  .ota-close-btn {
    margin-top: 10px;
    font-size: 12px;
    background: rgba(0, 212, 255, 0.1) !important;
    border-color: rgba(0, 212, 255, 0.3) !important;
    color: #00d4ff !important;
  }

  /* Badge overrides */
  .badge-online :deep(.ant-badge-status-text) { color: #00ff88; }
  .badge-offline :deep(.ant-badge-status-text) { color: #64748b; }
  .badge-fault :deep(.ant-badge-status-text) { color: #ff4757; }
  .badge-unactivated :deep(.ant-badge-status-text) { color: #94a3b8; }

  /* Current warning */
  .current-warning {
    margin-bottom: 12px;
    background: rgba(250, 173, 20, 0.1) !important;
    border-color: rgba(250, 173, 20, 0.3) !important;
  }

  .current-warning :deep(.ant-alert-message) {
    color: #faad14 !important;
    font-size: 12px;
  }

  /* ========== Chargers ========== */
  .no-chargers {
    color: #475569;
    font-size: 13px;
    text-align: center;
    padding: 12px;
  }

  .pile-block {
    border-bottom: 1px solid rgba(0, 212, 255, 0.06);
    padding: 8px 0;
  }

  .pile-block:last-child {
    border-bottom: none;
  }

  .pile-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
  }

  .pile-sn {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    flex: 1;
  }

  .pile-model {
    font-size: 12px;
    color: #64748b;
  }

  .connector-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0 3px 12px;
  }

  .conn-indent {
    color: #334155;
    font-size: 12px;
  }

  .conn-label {
    font-size: 12px;
    color: #94a3b8;
    width: 36px;
  }

  .conn-current {
    margin-left: auto;
    font-size: 12px;
    color: #64748b;
  }

  .charger-tag {
    font-size: 11px;
  }

  /* ========== Alerts & Logs ========== */
  .dark-tabs :deep(.ant-tabs-nav) {
    padding: 0 20px;
    margin-bottom: 0;
  }

  .dark-tabs :deep(.ant-tabs-tab) {
    color: #64748b !important;
    font-size: 13px;
  }

  .dark-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
    color: #00d4ff !important;
  }

  .dark-tabs :deep(.ant-tabs-ink-bar) {
    background: #00d4ff !important;
  }

  .dark-tabs :deep(.ant-tabs-content-holder) {
    padding: 12px 20px 16px;
  }

  .no-data {
    color: #475569;
    text-align: center;
    padding: 20px;
    font-size: 13px;
  }

  .alert-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0, 212, 255, 0.04);
  }

  .alert-row:last-child {
    border-bottom: none;
  }

  .alert-msg {
    flex: 1;
    font-size: 13px;
    color: #e2e8f0;
  }

  .alert-time {
    font-size: 11px;
    color: #475569;
    white-space: nowrap;
  }

  .log-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0, 212, 255, 0.04);
    flex-wrap: wrap;
  }

  .log-row:last-child {
    border-bottom: none;
  }

  .log-time {
    font-size: 11px;
    color: #475569;
    white-space: nowrap;
  }

  .log-content {
    flex: 1;
    font-size: 13px;
    color: #e2e8f0;
  }

  .log-user {
    font-size: 11px;
    color: #64748b;
  }

  /* ========== Modals ========== */
  .dark-modal :deep(.ant-modal-content) {
    background: #0f1932 !important;
    border: 1px solid rgba(0, 212, 255, 0.2);
  }

  .dark-modal :deep(.ant-modal-header) {
    background: transparent !important;
    border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  }

  .dark-modal :deep(.ant-modal-title) {
    color: #e2e8f0 !important;
  }

  .dark-modal :deep(.ant-modal-close-x) {
    color: #64748b !important;
  }

  .dark-modal :deep(.ant-modal-footer) {
    border-top: 1px solid rgba(0, 212, 255, 0.1);
  }

  .fw-radio-group {
    width: 100%;
  }

  .fw-option {
    padding: 8px 0;
  }

  .fw-radio-group :deep(.ant-radio-wrapper) {
    color: #e2e8f0;
    font-size: 13px;
  }

  .dlm-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dlm-radio-group :deep(.ant-radio-button-wrapper) {
    background: rgba(15, 25, 50, 0.6);
    border-color: rgba(0, 212, 255, 0.2);
    color: #94a3b8;
    min-width: 70px;
    text-align: center;
  }

  .dlm-radio-group :deep(.ant-radio-button-wrapper-checked) {
    background: rgba(0, 212, 255, 0.15) !important;
    border-color: #00d4ff !important;
    color: #00d4ff !important;
  }
</style>
