<template>
  <div class="devices-view">
    <!-- 左侧面板 -->
    <div class="left-panel">
      <div class="panel-header">
        <a-input-search
          v-model:value="searchText"
          :placeholder="t('device.searchSn')"
          allow-clear
          class="search-input"
          @search="onSearch"
        />
      </div>
      <div class="status-filter">
        <a-radio-group v-model:value="statusFilter" button-style="solid" size="small" class="filter-group">
          <a-radio-button value="all">{{ t('common.all') }}</a-radio-button>
          <a-radio-button value="online">{{ t('common.online') }}</a-radio-button>
          <a-radio-button value="offline">{{ t('common.offline') }}</a-radio-button>
          <a-radio-button value="fault">{{ t('common.fault') }}</a-radio-button>
          <a-radio-button value="unactivated">{{ t('common.unactivated') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="device-list">
        <template v-for="(group, gIdx) in groupedDevices" :key="gIdx">
          <div
            v-for="device in group.items"
            :key="device.sn"
            :class="['device-item', { active: selectedSn === device.sn }]"
            :style="selectedSn === device.sn ? { background: deviceGradient((device.onlineStatus || 'UNACTIVATED').toLowerCase()) } : {}"
            @click="selectDevice(device)"
          >
            <span v-if="selectedSn !== device.sn" :class="['status-dot', `status-${(device.onlineStatus || 'UNACTIVATED').toLowerCase()}`]"></span>
            <div class="device-info">
              <div :class="['device-sn', { 'device-sn-active': selectedSn === device.sn }]">{{ device.sn }}</div>
              <div class="device-meta">
                <span :class="['status-text', `text-${(device.onlineStatus || 'UNACTIVATED').toLowerCase()}`]">{{ statusLabel((device.onlineStatus || 'UNACTIVATED').toLowerCase()) }}</span>
                <span class="hb-time">{{ device.lastHeartbeat ? formatHb(device.lastHeartbeat) : '-' }}</span>
              </div>
            </div>
          </div>
          <div v-if="gIdx < groupedDevices.length - 1" class="group-divider"></div>
        </template>
        <div v-if="deviceList.length === 0" class="empty-list">{{ t('device.noMatchingDevices') }}</div>
      </div>
      <div class="pagination-bar">
        <a-pagination
          v-model:current="currentPage"
          :total="filteredTotal"
          :page-size="pageSize"
          size="small"
          :show-total="(n: number) => t('device.totalDevices', { n })"
        />
      </div>
    </div>

    <!-- 右侧详情区 -->
    <div class="right-panel">
      <div v-if="!selectedDevice" class="empty-detail">
        <div class="empty-illustration">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <rect x="20" y="30" width="80" height="60" rx="8" fill="#e8ecf1" />
            <rect x="30" y="40" width="25" height="6" rx="3" fill="#cbd5e1" />
            <rect x="30" y="52" width="40" height="4" rx="2" fill="#e2e8f0" />
            <rect x="30" y="62" width="30" height="4" rx="2" fill="#e2e8f0" />
            <circle cx="85" cy="55" r="12" fill="#3b82f6" opacity="0.15" />
            <path d="M82 55l3 3 6-6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="empty-text">{{ t('device.selectDevice') }}</div>
        <div class="empty-hint">{{ t('device.selectDeviceHint') }}</div>
      </div>
      <div v-else class="detail-content">
        <!-- 头部：SN + 台账摘要 -->
        <div class="detail-header">
          <div class="detail-header-left">
            <div class="detail-sn" :style="{ background: snGradient }">S/N: {{ selectedDevice.sn }}</div>
            <div class="detail-sub">
              <span class="sub-item">
                <ShopOutlined class="sub-icon" />
                <span class="sub-label">{{ t('device.dealer') }}</span>
                <span v-if="selectedDevice.dealer">{{ selectedDevice.dealer }}</span>
                <a-tooltip v-else :title="t('device.ledgerIncomplete')">
                  <span class="sub-empty">{{ t('device.notFilled') }} <span class="sub-tip-icon">⚠</span></span>
                </a-tooltip>
              </span>
              <span class="sub-item">
                <AppstoreOutlined class="sub-icon" />
                <span class="sub-label">{{ t('device.type') }}</span>
                <span>{{ selectedDevice.deviceType || '-' }}</span>
              </span>
              <span class="sub-item">
                <TagOutlined class="sub-icon" />
                <span class="sub-label">{{ t('device.model') }}</span>
                <span>{{ selectedDevice.deviceModel || '-' }}</span>
              </span>
              <span class="sub-item">
                <CalendarOutlined class="sub-icon" />
                <span class="sub-label">{{ t('device.shipDate') }}</span>
                <span>{{ selectedDevice.shipDate ? selectedDevice.shipDate.slice(0, 10) : '-' }}</span>
              </span>
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
          {{ t('device.unactivatedTip') }}
        </div>

        <!-- 两列 grid -->
        <div class="detail-grid">
          <!-- 左列：设备状态 -->
          <div class="detail-section">
            <div class="section-title"><DashboardOutlined class="section-icon" /> {{ t('device.sectionStatus') }}</div>
            <div class="info-row">
              <span class="info-label">{{ t('device.onlineStatus') }}</span>
              <span class="info-value">
                <a-badge :status="badgeStatus(selectedDevice.status)" :text="statusLabel(selectedDevice.status)" :class="`badge-${selectedDevice.status}`" />
                <a-tooltip v-if="(selectedDevice.status === 'online' || selectedDevice.status === 'fault') && !resetting" :title="t('device.reboot')">
                  <a-popconfirm
                    :title="t('device.confirmReboot')"
                    :ok-text="t('common.confirm')"
                    :cancel-text="t('common.cancel')"
                    @confirm="resetDevice"
                  >
                    <ReloadOutlined class="reset-icon" />
                  </a-popconfirm>
                </a-tooltip>
                <a-tooltip v-if="resetting" :title="t('device.rebooting')">
                  <LoadingOutlined class="reset-icon resetting" />
                </a-tooltip>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.lastHb') }}</span>
              <span class="info-value">{{ selectedDevice.lastHb }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.firmware') }}</span>
              <span class="info-value">
                {{ selectedDevice.fw }}
                <a-tooltip v-if="selectedDevice.status === 'online' && otaPhase === 'idle' && isAnyCharging" :title="t('device.noUpgradeWhileCharging')"><a-button type="link" size="small" class="action-btn" disabled>{{ t('device.upgrade') }}</a-button></a-tooltip>
                <a-button v-else-if="selectedDevice.status === 'online' && otaPhase === 'idle'" type="link" size="small" class="action-btn" @click="openOtaSelect">{{ t('device.upgrade') }}</a-button>
              </span>
            </div>
            <!-- 选择固件（内嵌） -->
            <div v-if="otaPhase === 'select'" class="ota-inline">
              <div class="ota-inline-header"><span class="ota-inline-label">{{ t('device.selectFirmware') }}</span></div>
              <div v-if="firmwareList.length === 0" style="color: #64748b; font-size: 13px; padding: 4px 0;">{{ t('device.noFirmware') }}</div>
              <a-radio-group v-else v-model:value="selectedFw" class="fw-radio-group" style="width:100%;">
                <div v-for="fw in firmwareList" :key="fw.id" class="fw-option">
                  <a-radio :value="fw.id">
                    <span style="color:#3b82f6;font-weight:600;">{{ fw.version }}</span>
                    <span style="color:#64748b;font-size:12px;margin-left:8px;">{{ fw.releaseNotes || t('device.noReleaseNotes') }}</span>
                  </a-radio>
                </div>
              </a-radio-group>
              <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
                <a-button size="small" @click="closeOtaModal">{{ t('common.cancel') }}</a-button>
                <a-button size="small" type="primary" :disabled="!selectedFw" @click="confirmOta" style="background:rgba(0,212,255,0.15);border-color:#3b82f6;color:#3b82f6;">{{ t('device.confirmUpgrade') }}</a-button>
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
              <a-button v-if="otaStatus === 'COMPLETED' || otaStatus === 'FAILED'" size="small" class="ota-close-btn" @click="closeOtaModal">{{ t('common.cancel') }}</a-button>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.wifiSignal') }}</span>
              <span class="info-value">{{ selectedDevice.wifiRssi != null ? selectedDevice.wifiRssi + ' dBm' : '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.macAddress') }}</span>
              <span class="info-value" style="font-family: monospace;">{{ selectedDevice.macAddress || '-' }}</span>
            </div>
          </div>

          <!-- 右列：家庭电力 -->
          <div class="detail-section">
            <div class="section-title">
              <ThunderboltOutlined class="section-icon" /> {{ t('device.sectionPower') }}
              <BarChartOutlined
                v-if="selectedDevice.status !== 'unactivated'"
                class="chart-icon"
                @click="openDlmChart"
              />
            </div>
            <!-- 电流进度条 -->
            <div v-if="ctCurrentTotal > 0" class="current-bar-wrapper">
              <div class="current-bar-header">
                <span class="current-bar-label">{{ t('device.currentLoad') }}</span>
                <span class="current-bar-value">{{ ctCurrentTotal }} / {{ selectedDevice.ctMax }} A</span>
              </div>
              <div class="current-bar-bg">
                <div
                  class="current-bar-fill"
                  :style="{ width: Math.min(ctCurrentTotal / selectedDevice.ctMax * 100, 100) + '%', background: currentBarColor }"
                ></div>
              </div>
            </div>
            <a-alert
              v-if="selectedDevice.ctMax > 0 && ctCurrentTotal / selectedDevice.ctMax >= 0.9"
              type="warning"
              show-icon
              :message="`${ctCurrentTotal}A / ${selectedDevice.ctMax}A (${Math.round(ctCurrentTotal / selectedDevice.ctMax * 100)}%)`"
              class="current-warning"
            />
            <div class="info-row">
              <span class="info-label">{{ t('device.totalCurrent') }}</span>
              <span class="info-value highlight">
                <template v-if="ctCurrentTotal > 0">
                  {{ ctCurrentTotal }} A
                  <span v-if="selectedDevice.ctCurrentB > 0" style="font-size:11px; color:#64748b; margin-left:4px;">(A:{{ selectedDevice.ctCurrentA.toFixed(1) }} B:{{ selectedDevice.ctCurrentB.toFixed(1) }} C:{{ selectedDevice.ctCurrentC.toFixed(1) }})</span>
                </template>
                <template v-else>-</template>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.chargingCurrent') }}</span>
              <span class="info-value" style="color: #16a34a; font-weight: 600;">
                <template v-if="chargingCurrentTotal > 0">
                  {{ chargingCurrentTotal }} A
                  <span v-if="selectedDevice.totalChargingCurrentB > 0" style="font-size:11px; color:#64748b; margin-left:4px;">(A:{{ selectedDevice.totalChargingCurrentA.toFixed(1) }} B:{{ selectedDevice.totalChargingCurrentB.toFixed(1) }} C:{{ selectedDevice.totalChargingCurrentC.toFixed(1) }})</span>
                </template>
                <template v-else>-</template>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.homeCurrent') }}</span>
              <span class="info-value">
                <template v-if="loadCurrentTotal > 0">
                  {{ loadCurrentTotal }} A
                  <span v-if="selectedDevice.loadCurrentB > 0" style="font-size:11px; color:#64748b; margin-left:4px;">(A:{{ selectedDevice.loadCurrentA.toFixed(1) }} B:{{ selectedDevice.loadCurrentB.toFixed(1) }} C:{{ selectedDevice.loadCurrentC.toFixed(1) }})</span>
                </template>
                <template v-else>-</template>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('device.currentThreshold') }}</span>
              <span class="info-value">
                {{ selectedDevice.ctMax }} A
                <a-tooltip v-if="selectedDevice.status === 'online' && isAnyCharging" :title="t('device.noEditWhileCharging')"><a-button type="link" size="small" class="action-btn" disabled>{{ t('device.modify') }}</a-button></a-tooltip>
                <a-button v-else-if="selectedDevice.status === 'online'" type="link" size="small" class="action-btn" @click="openDlmModal">{{ t('device.modify') }}</a-button>
              </span>
            </div>
            <!-- <div class="info-row">
              <span class="info-label">电压</span>
              <span class="info-value">{{ selectedDevice.voltage > 0 ? selectedDevice.voltage + ' V' : '-' }}</span>
            </div> -->
            <!-- <div class="info-row">
              <span class="info-label">总功率</span>
              <span class="info-value">{{ selectedDevice.totalPower > 0 ? selectedDevice.totalPower + ' W' : '-' }}</span>
            </div> -->
          </div>

          <!-- 下挂充电桩（跨两列） -->
          <div class="detail-section full">
            <div class="section-title" style="display:flex; align-items:center; justify-content:space-between;">
              <span><CarOutlined class="section-icon" /> {{ t('device.sectionChargers') }}</span>
              <a-button v-if="selectedDevice.status === 'online' && onlinePiles.length > 1" type="link" size="small" class="action-btn" @click="openBatchWorkMode">{{ t('device.batchSetMode') }}</a-button>
            </div>
            <div v-if="selectedDevice.chargers.length === 0" class="no-chargers">{{ t('device.noChargers') }}</div>
            <div v-for="pile in selectedDevice.chargers" :key="pile.sn"
              :class="['pile-card', {
                'pile-card-charging': pile.hasDlmData ? pile.chargeEVStatus === 'Charging' : false,
                'pile-card-offline': pile.hasDlmData ? pile.connectStatus === 'offline' : pile.status === 'offline'
              }]"
            >
              <!-- 桩头部 -->
              <div class="pile-card-header">
                <div class="pile-card-left">
                  <span class="pile-sn-badge" :style="{ background: pileGradient(pile.hasDlmData
                    ? (pile.connectStatus === 'offline' ? 'offline' : connStatusMap(pile.chargeEVStatus || 'Available'))
                    : pile.status) }">{{ pile.sn }}</span>
                  <span v-if="pile.hasDlmData && pile.connectStatus !== 'offline'" class="workmode-badge" @click="onWorkModeClick(pile)">
                    <span class="workmode-prefix">MODE</span>
                    <span class="workmode-value">{{ workModeLabels[pile.workMode] || '---' }}</span>
                    <SwapOutlined class="workmode-arrow" />
                  </span>
                  <!-- 有 DLMStatus 数据：用 connectStatus + charge_EVStatus -->
                  <template v-if="pile.hasDlmData">
                    <a-tag :color="pile.connectStatus === 'online' ? '#166534' : '#991b1b'" size="small">{{ pile.connectStatus === 'online' ? t('common.online') : t('common.offline') }}</a-tag>
                    <a-tag v-if="pile.chargeEVStatus && pile.connectStatus !== 'offline'" :color="chargerTagColor(connStatusMap(pile.chargeEVStatus))" :class="[`tag-${connStatusMap(pile.chargeEVStatus)}`]" size="small">{{ evStatusLabel(pile.chargeEVStatus) }}</a-tag>
                  </template>
                  <!-- 没有 DLMStatus 数据：fallback 到 nc_device.online_status -->
                  <template v-else>
                    <a-tag :color="chargerTagColor(pile.status)" size="small">{{ chargerStatusLabel(pile.status) }}</a-tag>
                    <span class="pile-model">{{ pile.model }}</span>
                  </template>
                </div>
                <div class="pile-card-right">
                  <template v-if="pile.allocatedCurrentA != null">
                    <span v-if="!pile.allocatedCurrentB && !pile.allocatedCurrentC" class="pile-current">{{ pile.allocatedCurrentA }} A</span>
                    <span v-else class="pile-current">A: {{ pile.allocatedCurrentA }} / B: {{ pile.allocatedCurrentB }} / C: {{ pile.allocatedCurrentC }} A</span>
                  </template>
                  <!-- <a-tooltip v-if="pile.snr != null">
                    <template #title>
                      <div>PLC 信噪比: {{ pile.snr }}</div>
                      <div>衰减: {{ pile.atten }}</div>
                    </template>
                    <span class="pile-signal">📶</span>
                  </a-tooltip> -->
                </div>
              </div>
              <!-- 充电信息（充电中显示电量） -->
              <div v-if="pile.hasDlmData && pile.chargeEVStatus === 'Charging' && pile.connectStatus !== 'offline' && pile.energy" class="pile-charge-info">
                <span>{{ t('device.energyLabel') }} <strong>{{ (pile.energy / 1000).toFixed(2) }} kWh</strong></span>
              </div>
              <!-- 枪列表（桩离线时不显示） -->
              <div v-if="!(pile.hasDlmData && pile.connectStatus === 'offline')" class="pile-connectors">
                <div v-for="(conn, cidx) in pile.connectors" :key="conn.id" class="connector-row">
                  <span class="conn-indent">└</span>
                  <span :class="['status-dot', `status-${conn.status}`]"></span>
                  <span class="conn-label">{{ t('device.connectorLabel', { n: conn.id }) }}</span>
                  <a-tag :color="chargerTagColor(conn.status)" :class="['charger-tag', `tag-${conn.status}`]" size="small">
                    {{ chargerStatusLabel(conn.status) }}
                  </a-tag>
                  <span v-if="conn.duration > 0" class="conn-duration">{{ formatDuration(conn.duration) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 告警 / 日志（跨两列） -->
          <div class="detail-section full">
            <a-tabs v-model:activeKey="logTab" class="dark-tabs">
              <a-tab-pane key="alerts" :tab="t('device.tabAlerts')">
                <div v-if="deviceAlerts.length === 0" class="no-data">{{ t('device.noAlerts') }}</div>
                <div v-for="(alert, idx) in deviceAlerts" :key="idx" class="alert-row">
                  <a-tag :color="{ critical: '#ff4757', major: '#ff9f43', minor: '#3b82f6', info: '#64748b' }[alert.level] || '#faad14'" size="small">
                    {{ alertLevelText(alert.level) }}
                  </a-tag>
                  <span class="alert-msg">{{ alert.msg }}</span>
                  <span class="alert-time">{{ alert.time }}</span>
                </div>
              </a-tab-pane>
              <a-tab-pane key="charging" :tab="t('device.tabCharging')">
                <div v-if="chargingSessions.length === 0" class="no-data">{{ t('device.noChargingSessions') }}</div>
                <a-table
                  v-else
                  :dataSource="chargingSessions"
                  :columns="chargingColumns"
                  :pagination="{ pageSize: 5, size: 'small', showTotal: (n: number) => t('device.sessionTotal', { n }) }"
                  size="small"
                  :rowKey="(r: any) => r.id"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'connector'">
                      {{ record.pileSn }} / {{ t('device.connectorLabel', { n: record.connectorId }) }}
                    </template>
                    <template v-if="column.key === 'duration'">
                      {{ record.durationText }}
                    </template>
                    <template v-if="column.key === 'energy'">
                      {{ record.energyText }}
                    </template>
                    <template v-if="column.key === 'method'">
                      {{ record.chargingMethod === 1 ? t('device.chargeMethodN3') : record.chargingMethod === 0 ? t('device.chargeMethodI') : '-' }}
                    </template>
                    <template v-if="column.key === 'status'">
                      <a-tag :color="record.status === 'CHARGING' ? '#16a34a' : '#64748b'" size="small">{{ record.status === 'CHARGING' ? t('device.statusCharging') : t('device.statusFinished') }}</a-tag>
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>
              <a-tab-pane key="logs" :tab="t('device.tabLogs')">
                <div v-if="deviceLogs.length === 0" class="no-data">{{ t('device.noLogs') }}</div>
                <div v-for="(log, idx) in deviceLogs" :key="idx" class="log-row">
                  <span class="log-time">{{ log.time }}</span>
                  <a-tag color="blue" size="small">{{ log.type }}</a-tag>
                  <span class="log-content">{{ log.content }}</span>
                  <a-tag :color="log.result === 'success' ? '#2d9d78' : '#ff4757'" size="small">{{ log.result === 'success' ? t('device.logSuccess') : t('device.logFail') }}</a-tag>
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
      :footer="null"
      :width="440"
      class="dlm-modal"
    >
      <div class="dlm-header">
        <div class="dlm-title">{{ t('device.dlmModalTitle') }}</div>
        <div class="dlm-value-display">
          <span class="dlm-value-num" :style="{ color: dlmSliderColor }">{{ selectedDlm }}</span>
          <span class="dlm-value-unit">A</span>
        </div>
        <div class="dlm-current-hint" v-if="selectedDevice">{{ t('device.dlmCurrent', { n: selectedDevice.ctMax || '-' }) }}</div>
      </div>
      <div class="dlm-slider-wrapper">
        <div class="dlm-slider-track" ref="dlmTrackRef" @click="onTrackClick">
          <div class="dlm-slider-fill" :style="{ width: dlmFillPercent + '%', background: dlmSliderGradient }"></div>
          <div class="dlm-slider-thumb" :style="{ left: dlmFillPercent + '%', background: dlmSliderColor }"
            @mousedown="onThumbDown"></div>
        </div>
        <div class="dlm-marks">
          <span v-for="amp in dlmOptions" :key="amp"
            :class="['dlm-mark', { active: selectedDlm === amp }]"
            :style="{ left: dlmMarkPercent(amp) + '%', color: selectedDlm === amp ? dlmSliderColor : '#94a3b8' }"
            @click="selectedDlm = amp">
            {{ amp }}A
          </span>
        </div>
      </div>
      <a-button type="primary" block size="large" class="dlm-confirm-btn" @click="confirmDlm"
        :disabled="selectedDlm === selectedDevice?.ctMax">
        {{ t('device.dlmConfirmBtn', { n: selectedDlm }) }}
      </a-button>
    </a-modal>

    <!-- 单台切换工作模式 Modal -->
    <a-modal
      v-model:open="showWorkModeModal"
      :title="t('device.switchWorkMode')"
      :width="360"
      @ok="confirmWorkModeChange"
      :okText="t('common.confirm')"
      :cancelText="t('common.cancel')"
      :okButtonProps="{ disabled: workModeNewValue === workModeOldValue }"
      style="top: 30%;"
    >
      <div style="margin-bottom:16px; font-size:13px; color:#64748b;">{{ workModePileSn }}</div>
      <a-radio-group v-model:value="workModeNewValue" button-style="solid" size="small">
        <a-radio-button value="Plc">PLC</a-radio-button>
        <a-radio-button value="App">APP</a-radio-button>
        <a-radio-button value="Ocpp">OCPP</a-radio-button>
      </a-radio-group>
    </a-modal>

    <!-- 批量设置工作模式 Modal -->
    <a-modal
      v-model:open="showBatchWorkMode"
      :title="t('device.batchWorkModeTitle')"
      :width="400"
      @ok="confirmBatchWorkMode"
      :okText="t('common.confirm')"
      :cancelText="t('common.cancel')"
    >
      <div style="margin-bottom:12px; color:#64748b; font-size:13px;">{{ t('device.batchWorkModeDesc') }}</div>
      <a-select v-model:value="batchWorkModeValue" style="width:100%; margin-bottom:16px;">
        <a-select-option value="Plc">PLC</a-select-option>
        <a-select-option value="App">APP</a-select-option>
        <a-select-option value="Ocpp">OCPP</a-select-option>
      </a-select>
      <div v-for="p in onlinePiles" :key="p.sn" style="padding:4px 0; font-size:13px; color:#cbd5e1;">
        {{ p.sn }} <span style="color:#64748b; margin-left:8px;">{{ t('device.currentMode') }}: {{ workModeLabels[p.workMode] || t('device.modeUnknown') }}</span>
      </div>
    </a-modal>

    <!-- DLM 历史图表 Modal -->
    <a-modal
      v-model:open="showDlmChart"
      :footer="null"
      :width="800"
      class="dlm-chart-modal"
      :destroyOnClose="true"
    >
      <div class="dlm-chart-header">
        <div class="dlm-chart-title">{{ t('device.dlmChartTitle') }}</div>
      </div>
      <div class="dlm-chart-toolbar">
        <a-radio-group v-model:value="chartPhase" size="small" @change="onChartPhaseChange">
          <a-radio-button value="total">{{ t('device.phaseTotal') }}</a-radio-button>
          <a-radio-button value="A">{{ t('device.phaseA') }}</a-radio-button>
          <a-radio-button value="B">{{ t('device.phaseB') }}</a-radio-button>
          <a-radio-button value="C">{{ t('device.phaseC') }}</a-radio-button>
        </a-radio-group>
        <a-radio-group v-model:value="chartRange" size="small" style="margin-left: auto;" @change="loadChartData">
          <a-radio-button value="1h">{{ t('device.range1h') }}</a-radio-button>
          <a-radio-button value="6h">{{ t('device.range6h') }}</a-radio-button>
          <a-radio-button value="24h">{{ t('device.range24h') }}</a-radio-button>
          <a-radio-button value="7d">{{ t('device.range7d') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="dlm-chart-container">
        <a-spin :spinning="chartLoading">
          <div ref="chartRef" style="width: 100%; height: 320px;"></div>
          <div v-if="chartEmpty" class="chart-empty">{{ t('device.noChartData') }}</div>
          <!-- <div v-if="!chartEmpty" class="mini-charts-row">
            <div class="mini-chart-box">
              <div class="mini-chart-label">功率 (W)</div>
              <div ref="powerChartRef" style="width: 100%; height: 120px;"></div>
            </div>
            <div class="mini-chart-box">
              <div class="mini-chart-label">电压 (V)</div>
              <div ref="voltageChartRef" style="width: 100%; height: 120px;"></div>
            </div>
          </div> -->
        </a-spin>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch, nextTick } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { message, Modal } from 'ant-design-vue';
  import { useI18n } from 'vue-i18n';
  import { getDeviceList, getDeviceDetail } from '@/api/device';
  import http from '@/api/http';
  import { useDeviceEvents, subscribeDlm } from '@/composables/useDeviceEvents';
  import { ReloadOutlined, LoadingOutlined, ShopOutlined, AppstoreOutlined, TagOutlined, CalendarOutlined, DashboardOutlined, ThunderboltOutlined, CarOutlined, BarChartOutlined, SwapOutlined } from '@ant-design/icons-vue';

  const { t } = useI18n();

  // 监听设备事件，自动刷新列表
  useDeviceEvents((event) => {
    if (event.type === 'DLM_UPDATE' && event.deviceSn === selectedSn.value && event.data) {
      // DLMStatus 实时推送：直接更新 ctData，不用拉接口
      try {
        const dlm = JSON.parse(event.data);
        if (deviceDetail.value) {
          // 收到 DLMStatus 说明设备在线
          if (deviceDetail.value.device) {
            deviceDetail.value.device.onlineStatus = 'ONLINE';
          }
          const ct = deviceDetail.value.ctData || {};
          // 更新 CT 数据
          if (dlm.totalCurrentA != null) { ct.totalCurrentA = dlm.totalCurrentA; }
          if (dlm.totalCurrentB != null) { ct.totalCurrentB = dlm.totalCurrentB; }
          if (dlm.totalCurrentC != null) { ct.totalCurrentC = dlm.totalCurrentC; }
          if (dlm.voltage != null) { ct.voltage = dlm.voltage; }
          if (dlm.totalPower != null) { ct.totalPower = dlm.totalPower; }
          if (dlm.loadCurrentA != null) { ct.loadCurrentA = dlm.loadCurrentA; }
          if (dlm.loadCurrentB != null) { ct.loadCurrentB = dlm.loadCurrentB; }
          if (dlm.loadCurrentC != null) { ct.loadCurrentC = dlm.loadCurrentC; }
          if (dlm.totalChargingCurrentA != null) { ct.totalChargingCurrentA = dlm.totalChargingCurrentA; }
          if (dlm.totalChargingCurrentB != null) { ct.totalChargingCurrentB = dlm.totalChargingCurrentB; }
          if (dlm.totalChargingCurrentC != null) { ct.totalChargingCurrentC = dlm.totalChargingCurrentC; }
          if (dlm.wifiRssi != null) { ct.wifiRssi = dlm.wifiRssi; }
          if (dlm.breakerRating != null) { ct.breakerRating = dlm.breakerRating; }
          if (dlm.macAddress != null && deviceDetail.value.device) {
            deviceDetail.value.device.macAddress = dlm.macAddress;
          }
          ct.dataFresh = true;
          deviceDetail.value.ctData = { ...ct };
          // 更新桩/枪实时数据
          if (dlm.pileAllocations && deviceDetail.value.chargers) {
            const dlmPileMap: Record<string, any> = {};
            for (const pile of dlm.pileAllocations) {
              if (pile.sn) { dlmPileMap[pile.sn] = pile; }
            }
            for (const charger of deviceDetail.value.chargers) {
              const dp = dlmPileMap[charger.sn];
              if (!dp) { continue; }
              charger.allocatedCurrentA = dp.allocatedCurrentA;
              charger.allocatedCurrentB = dp.allocatedCurrentB;
              charger.allocatedCurrentC = dp.allocatedCurrentC;
              charger.connectStatus = dp.connectStatus;
              charger.charge_EVStatus = dp.charge_EVStatus;
              charger.energy = dp.energy;
              charger.workMode = dp.workMode;
              charger.charge_version = dp.charge_version;
              charger.snr = dp.snr;
              charger.atten = dp.atten;
              if (dp.connectors && charger.connectors) {
                const dlmConnMap: Record<number, any> = {};
                for (const c of dp.connectors) { dlmConnMap[c.connectorId] = c; }
                for (const conn of charger.connectors) {
                  const dc = dlmConnMap[conn.connectorId];
                  if (!dc) { continue; }
                  conn.dlmStatus = dc.status;
                  conn.startTime = dc.startTime;
                  conn.endTime = dc.endTime;
                  conn.duration = dc.duration;
                }
              }
            }
          }
          // 触发响应式更新（移到外面，确保 CT 数据也能及时渲染）
          deviceDetail.value = { ...deviceDetail.value };
        }
      } catch { /* ignore parse error */ }
      return;
    }
    // 其他事件（ONLINE/OFFLINE/FAULT/ALERT）：刷新列表和详情
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
      PENDING: t('device.otaStatusPending'),
      DOWNLOADING: t('device.otaStatusDownloading'),
      INSTALLING: t('device.otaStatusInstalling'),
      COMPLETED: t('device.otaStatusCompleted'),
      FAILED: t('device.otaStatusFailed'),
    };
    return map[otaStatus.value] || otaMessage.value || t('device.otaStatusDefault');
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
      message.error(t('device.loadListFailed'));
    } finally {
      loading.value = false;
    }
  }

  // ==================== 详情数据加载 ====================
  async function loadDetail(sn: string) {
    detailLoading.value = true;
    deviceLogsData.value = [];
    chargingSessionsData.value = [];
    try {
      // 并行拉详情、日志、充电记录
      const [detailRes, logRes, chargeRes]: any[] = await Promise.all([
        getDeviceDetail(sn),
        http.get('/oplog/list', { params: { deviceSn: sn, pageSize: 20 } }),
        http.get(`/device/${sn}/charging-sessions`, { params: { pageSize: 10 } }),
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
      const chargeData = chargeRes.result || chargeRes;
      chargingSessionsData.value = chargeData.records || [];
    } catch (e: any) {
      message.error(t('device.loadDetailFailed'));
    } finally {
      detailLoading.value = false;
    }
  }

  // Tab 切换时重新拉取对应数据
  watch(logTab, async (key) => {
    const sn = selectedSn.value;
    if (!sn) return;
    try {
      if (key === 'alerts') {
        const res: any = await getDeviceDetail(sn);
        const detail = res.result || res;
        if (deviceDetail.value) {
          deviceDetail.value.recentAlerts = detail.recentAlerts;
        }
      } else if (key === 'logs') {
        const res: any = await http.get('/oplog/list', { params: { deviceSn: sn, pageSize: 20 } });
        const logData = res.result || res;
        deviceLogsData.value = (logData.records || []).map((l: any) => ({
          time: l.opTime || l.createTime || '-',
          user: l.opUser || '-',
          type: opTypeLabel(l.opType),
          content: l.opContent || '-',
          result: l.opResult === 'SUCCESS' ? 'success' : 'fail',
        }));
      } else if (key === 'charging') {
        const res: any = await http.get(`/device/${sn}/charging-sessions`, { params: { pageSize: 10 } });
        const chargeData = res.result || res;
        chargingSessionsData.value = chargeData.records || [];
      }
    } catch (e: any) {
      // 静默失败，不阻断 tab 切换
    }
  });

  function opTypeLabel(key: string): string {
    const map: Record<string, string> = {
      OTA_UPGRADE: t('oplog.typeOta'),
      DLM_CONFIG: t('oplog.typeDlm'),
      REMOTE_REBOOT: t('oplog.typeReboot'),
      REMOTE_RESET: t('oplog.typeReset'),
    };
    return map[key] || key || t('oplog.typeOther');
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

  const snGradient = computed(() => {
    const status = selectedDevice.value?.status;
    const gradients: Record<string, string> = {
      online: 'linear-gradient(135deg, #188a7e, #2dd4bf)',
      offline: 'linear-gradient(135deg, #5a6a7a, #a0aec0)',
      fault: 'linear-gradient(135deg, #8b3a3a, #c96b6b)',
      unactivated: 'linear-gradient(135deg, #4a5e78, #7c9ab8)',
    };
    return gradients[status || ''] || gradients.offline;
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
      // 台账字段透传
      dealer: d.dealer,
      deviceType: d.deviceType,
      deviceModel: d.deviceModel,
      batchNo: d.batchNo,
      macAddress: d.macAddress,
      productionDate: d.productionDate,
      shipDate: d.shipDate,
      ipAddress: d.ipAddress,
      // CT 数据
      ctCurrentA: ct.totalCurrentA ?? 0,
      ctCurrentB: ct.totalCurrentB ?? 0,
      ctCurrentC: ct.totalCurrentC ?? 0,
      ctMax: ct.breakerRating ?? d.breakerRating ?? 32,
      voltage: ct.voltage ?? 0,
      totalPower: ct.totalPower ?? 0,
      loadCurrentA: ct.loadCurrentA ?? 0,
      loadCurrentB: ct.loadCurrentB ?? 0,
      loadCurrentC: ct.loadCurrentC ?? 0,
      totalChargingCurrentA: ct.totalChargingCurrentA ?? 0,
      totalChargingCurrentB: ct.totalChargingCurrentB ?? 0,
      totalChargingCurrentC: ct.totalChargingCurrentC ?? 0,
      wifiRssi: ct.wifiRssi ?? null,
      dataFresh: ct.dataFresh !== false,
      // 下挂充电桩（合并 DLMStatus 数据）
      chargers: (deviceDetail.value?.chargers || []).map((pile: any) => ({
        sn: pile.sn,
        model: pile.model || pile.deviceModel || '-',
        status: pile.onlineStatus ? pile.onlineStatus.toLowerCase() : 'offline',
        // DLMStatus 桩级别数据
        allocatedCurrentA: pile.allocatedCurrentA ?? null,
        allocatedCurrentB: pile.allocatedCurrentB ?? null,
        allocatedCurrentC: pile.allocatedCurrentC ?? null,
        connectStatus: pile.connectStatus ?? null,
        chargeEVStatus: pile.charge_EVStatus ?? null,
        energy: pile.energy ?? null,
        workMode: pile.workMode ?? 'unknown',
        chargeVersion: pile.charge_version ?? null,
        snr: pile.snr ?? null,
        atten: pile.atten ?? null,
        hasDlmData: pile.connectStatus != null,
        // 枪列表（合并 DLMStatus 枪级别数据）
        connectors: (pile.connectors || []).map((conn: any) => ({
          id: conn.connectorId,
          status: connStatusMap(conn.dlmStatus || conn.status),
          current: conn.currentPower ?? 0,
          dlmStatus: conn.dlmStatus ?? null,
          startTime: conn.startTime ?? null,
          endTime: conn.endTime ?? null,
          duration: conn.duration ?? 0,
        })),
      })),
    };
  });
  const deviceAlerts = computed(() => {
    return (deviceDetail.value?.recentAlerts || []).slice(0, 3).map((a: any) => ({
      level: a.alertLevel === 'CRITICAL' ? 'critical'
           : a.alertLevel === 'IMPORTANT' ? 'major'
           : a.alertLevel === 'NORMAL' ? 'minor' : 'info',
      msg: a.description || a.errorCode || '-',
      time: a.alertTime || '-',
    }))
  });
  const deviceLogsData = ref<any[]>([]);
  const deviceLogs = computed(() => deviceLogsData.value.slice(0, 3));

  const chargingColumns = computed(() => [
    { title: t('device.colConnector'), key: 'connector', width: 160 },
    { title: t('device.colStartTime'), dataIndex: 'startTime', width: 150 },
    { title: t('device.colDuration'), key: 'duration', width: 80 },
    { title: t('device.colEnergy'), key: 'energy', width: 100 },
    { title: t('device.colMethod'), key: 'method', width: 80 },
    { title: t('device.colStatus'), key: 'status', width: 80 },
  ]);

  const chargingSessionsData = ref<any[]>([]);
  const chargingSessions = computed(() => chargingSessionsData.value.map((s: any) => ({
    ...s,
    durationText: s.duration ? formatDuration(s.duration) : '-',
    energyText: s.energy ? (s.energy / 1000).toFixed(2) + ' kWh' : '-',
  })));

  // ==================== Methods ====================
  function formatHb(hb: string | null): string {
    if (!hb) return '-';
    const diff = Date.now() - new Date(hb).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('device.hbJustNow');
    if (min < 60) return t('device.hbMinutes', { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t('device.hbHours', { n: h });
    return t('device.hbDays', { n: Math.floor(h / 24) });
  }

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      online: t('common.online'), offline: t('common.offline'),
      fault: t('common.fault'), unactivated: t('common.unactivated'),
    };
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
    const map: Record<string, string> = {
      critical: t('alert.levelCritical'), major: t('alert.levelMajor'),
      minor: t('alert.levelMinor'), info: t('alert.levelInfo'),
    };
    return map[level] || level;
  }

  function connStatusMap(ocppStatus: string): string {
    const map: Record<string, string> = {
      Available: 'idle', Preparing: 'preparing', Charging: 'charging',
      SuspendedEVSE: 'suspended', SuspendedEV: 'suspended',
      Finishing: 'finishing', Faulted: 'fault', Unavailable: 'unavailable',
    };
    return map[ocppStatus] || 'idle';
  }

  function chargerStatusLabel(status: string): string {
    const map: Record<string, string> = {
      charging: t('device.chargerStatusCharging'), idle: t('device.chargerStatusIdle'),
      fault: t('device.chargerStatusFault'), preparing: t('device.chargerStatusPreparing'),
      suspended: t('device.chargerStatusSuspended'), finishing: t('device.chargerStatusFinishing'),
      unavailable: t('device.chargerStatusUnavailable'),
      online: t('common.online'), offline: t('common.offline'), unactivated: t('common.unactivated'),
    };
    return map[status] || status;
  }

  function deviceGradient(status: string): string {
    const map: Record<string, string> = {
      online: 'linear-gradient(135deg, #188a7e, #2dd4bf)',
      offline: 'linear-gradient(135deg, #5a6a7a, #a0aec0)',
      fault: 'linear-gradient(135deg, #8b3a3a, #c96b6b)',
      unactivated: 'linear-gradient(135deg, #4a5e78, #7c9ab8)',
    };
    return map[status] || map.offline;
  }

  function pileGradient(status: string): string {
    const map: Record<string, string> = {
      online: 'linear-gradient(135deg, #188a7e, #2dd4bf)',
      charging: 'linear-gradient(135deg, #2a4a7f, #3b82f6)',
      idle: 'linear-gradient(135deg, #188a7e, #2dd4bf)',
      preparing: 'linear-gradient(135deg, #0097a7, #00BCD4)',
      suspended: 'linear-gradient(135deg, #92400e, #d97706)',
      finishing: 'linear-gradient(135deg, #0f766e, #14B8A6)',
      unavailable: 'linear-gradient(135deg, #5a6a7a, #a0aec0)',
      offline: 'linear-gradient(135deg, #5a6a7a, #a0aec0)',
      fault: 'linear-gradient(135deg, #8b3a3a, #c96b6b)',
      unactivated: 'linear-gradient(135deg, #4a5e78, #7c9ab8)',
    };
    return map[status] || map.offline;
  }

  function evStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Available: t('device.evStatusAvailable'), Preparing: t('device.evStatusPreparing'),
      Charging: t('device.evStatusCharging'), SuspendedEVSE: t('device.evStatusSuspendedEVSE'),
      SuspendedEV: t('device.evStatusSuspendedEV'), Finishing: t('device.evStatusFinishing'),
      Faulted: t('device.evStatusFaulted'), Unavailable: t('device.evStatusUnavailable'),
    };
    return map[status] || status;
  }

  function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  /** 是否有桩在充电中 */
  const isAnyCharging = computed(() => {
    if (!selectedDevice.value) return false;
    return selectedDevice.value.chargers.some((p: any) => p.hasDlmData && p.chargeEVStatus === 'Charging');
  });

  /** 三相电流合计（用于进度条和告警判断） */
  const ctCurrentTotal = computed(() => {
    if (!selectedDevice.value) return 0;
    return +(selectedDevice.value.ctCurrentA + selectedDevice.value.ctCurrentB + selectedDevice.value.ctCurrentC).toFixed(1);
  });

  const chargingCurrentTotal = computed(() => {
    if (!selectedDevice.value) return 0;
    return +(selectedDevice.value.totalChargingCurrentA + selectedDevice.value.totalChargingCurrentB + selectedDevice.value.totalChargingCurrentC).toFixed(1);
  });

  const loadCurrentTotal = computed(() => {
    if (!selectedDevice.value) return 0;
    return +(selectedDevice.value.loadCurrentA + selectedDevice.value.loadCurrentB + selectedDevice.value.loadCurrentC).toFixed(1);
  });

  const currentBarColor = computed(() => {
    if (!selectedDevice.value) return '#16a34a';
    const ratio = ctCurrentTotal.value / selectedDevice.value.ctMax;
    if (ratio >= 0.9) return '#dc2626';
    if (ratio >= 0.7) return '#d97706';
    return '#16a34a';
  });

  function chargerTagColor(status: string): string {
    const map: Record<string, string> = {
      charging: '#3b82f6', idle: '#2d9d78', fault: '#ff4757',
      preparing: '#00BCD4', suspended: '#d97706', finishing: '#14B8A6', unavailable: '#64748b',
      online: '#2d9d78', offline: '#64748b', unactivated: '#faad14',
    };
    return map[status] || '#64748b';
  }

  function selectDevice(device: any) {
    selectedSn.value = device.sn;
    logTab.value = 'alerts';
    loadDetail(device.sn);
    subscribeDlm(device.sn);
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
      message.success(t('device.rebootSent'));
    } catch (e: any) {
      resetting.value = false;
      message.error(e?.response?.data?.message || t('device.rebootFailed'));
    }
  }

  // ── DLM 滑块 ──
  const dlmTrackRef = ref<HTMLElement>();
  const dlmMin = computed(() => Math.min(...dlmOptions));
  const dlmMax = computed(() => Math.max(...dlmOptions));

  const dlmFillPercent = computed(() => {
    return ((selectedDlm.value - dlmMin.value) / (dlmMax.value - dlmMin.value)) * 100;
  });

  function dlmMarkPercent(amp: number) {
    return ((amp - dlmMin.value) / (dlmMax.value - dlmMin.value)) * 100;
  }

  const dlmSliderColor = computed(() => {
    const ratio = dlmFillPercent.value / 100;
    if (ratio < 0.5) return '#43b89c';
    if (ratio < 0.75) return '#f59e0b';
    return '#ef4444';
  });

  const dlmSliderGradient = computed(() => {
    return 'linear-gradient(90deg, #43b89c, #f59e0b, #ef4444)';
  });

  function snapToNearest(percent: number) {
    const val = dlmMin.value + (percent / 100) * (dlmMax.value - dlmMin.value);
    let closest = dlmOptions[0];
    let minDist = Infinity;
    for (const amp of dlmOptions) {
      const dist = Math.abs(amp - val);
      if (dist < minDist) { minDist = dist; closest = amp; }
    }
    selectedDlm.value = closest;
  }

  function onTrackClick(e: MouseEvent) {
    if (!dlmTrackRef.value) return;
    const rect = dlmTrackRef.value.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    snapToNearest(percent);
  }

  function onThumbDown(e: MouseEvent) {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!dlmTrackRef.value) return;
      const rect = dlmTrackRef.value.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      snapToNearest(percent);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
    otaMessage.value = t('device.otaConnecting');
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
            message.success(t('device.otaSuccess'));
            setTimeout(() => loadDetail(deviceSn), 1500);
          } else if (newStatus === 'FAILED') {
            otaError.value = d.message || t('device.otaStatusFailed');
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
              message.success(t('device.otaSuccess'));
              setTimeout(() => loadDetail(deviceSn), 1000);
            }
            clearInterval(pollTimer);
          } else if (d.status === 'FAILED') {
            otaError.value = d.errorMsg || d.message || t('device.otaStatusFailed');
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
        message.error(t('device.otaNoTaskId'));
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
      message.error(t('device.otaNoTaskId'));
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
      message.success(t('device.dlmSuccess', { n: selectedDlm.value }));
      // 刷新详情
      setTimeout(() => loadDetail(selectedDevice.value!.sn), 500);
    } catch (e: any) {
      message.error(t('device.dlmFailed'));
    }
  }

  // ==================== 工作模式切换 ====================
  const workModeLabels: Record<string, string> = { Plc: 'PLC', App: 'APP', Ocpp: 'OCPP' };
  const onlinePiles = computed(() =>
    (selectedDevice.value?.chargers || []).filter((p: any) => p.hasDlmData && p.connectStatus !== 'offline')
  );

  // 单台切换：点击 badge 弹出选择弹窗
  const showWorkModeModal = ref(false);
  const workModePileSn = ref('');
  const workModeOldValue = ref('');
  const workModeNewValue = ref('Plc');

  function onWorkModeClick(pile: any) {
    workModePileSn.value = pile.sn;
    workModeOldValue.value = pile.workMode;
    workModeNewValue.value = pile.workMode !== 'unknown' ? pile.workMode : 'Plc';
    showWorkModeModal.value = true;
  }

  async function confirmWorkModeChange() {
    if (workModeNewValue.value === workModeOldValue.value) {
      showWorkModeModal.value = false;
      return;
    }
    try {
      await http.post(`/device/${selectedSn.value}/workmode`, {
        deviceList: [{ sn: workModePileSn.value, workMode: workModeNewValue.value }],
      });
      showWorkModeModal.value = false;
      message.success(t('device.workModeSwitched', { mode: workModeLabels[workModeNewValue.value] }));
      setTimeout(() => loadDetail(selectedSn.value!), 500);
    } catch (e: any) {
      message.error(t('device.workModeFailed'));
    }
  }

  // 批量设置工作模式
  const showBatchWorkMode = ref(false);
  const batchWorkModeValue = ref('Plc');
  function openBatchWorkMode() {
    batchWorkModeValue.value = 'Plc';
    showBatchWorkMode.value = true;
  }
  async function confirmBatchWorkMode() {
    const piles = onlinePiles.value;
    if (piles.length === 0) { return; }
    try {
      await http.post(`/device/${selectedSn.value}/workmode`, {
        deviceList: piles.map((p: any) => ({ sn: p.sn, workMode: batchWorkModeValue.value })),
      });
      showBatchWorkMode.value = false;
      message.success(t('device.batchWorkModeSwitched', { mode: workModeLabels[batchWorkModeValue.value] }));
      setTimeout(() => loadDetail(selectedSn.value!), 500);
    } catch (e: any) {
      message.error(t('device.batchWorkModeFailed'));
    }
  }

  // ==================== DLM 历史图表 ====================
  const showDlmChart = ref(false);
  const chartRange = ref('1h');
  const chartPhase = ref('total');
  const chartLoading = ref(false);
  const chartEmpty = ref(false);
  let chartPoints: any[] = [];
  const chartRef = ref<HTMLElement>();
  const powerChartRef = ref<HTMLElement>();
  const voltageChartRef = ref<HTMLElement>();
  let chartInstance: any = null;
  let powerChartInstance: any = null;
  let voltageChartInstance: any = null;

  async function openDlmChart() {
    if (!selectedDevice.value) {
      return;
    }
    showDlmChart.value = true;
    chartRange.value = '1h';
    chartPhase.value = 'total';
    await nextTick();
    loadChartData();
  }

  async function loadChartData() {
    if (!selectedDevice.value || !chartRef.value) {
      return;
    }
    chartLoading.value = true;
    chartEmpty.value = false;
    try {
      const res = await http.get(`/device/${selectedDevice.value.sn}/dlm/history`, {
        params: { range: chartRange.value },
      });
      chartPoints = res.result?.points || [];
      if (chartPoints.length === 0) {
        chartEmpty.value = true;
        if (chartInstance) {
          chartInstance.dispose();
          chartInstance = null;
        }
        return;
      }
      renderChart(chartPoints);
    } catch (e: any) {
      message.error(t('device.chartLoadFailed'));
    } finally {
      chartLoading.value = false;
    }
  }

  function onChartPhaseChange() {
    if (chartPoints.length > 0) {
      renderChart(chartPoints);
    }
  }

  async function renderChart(points: any[]) {
    const echarts = (await import('@/utils/echarts')).default;
    if (!chartRef.value) {
      return;
    }
    if (chartInstance) {
      chartInstance.dispose();
    }
    chartInstance = echarts.init(chartRef.value);

    const times = points.map((p: any) => p.time);
    // x 轴固定范围：从 rangeMs 前到当前
    const rangeMs: Record<string, number> = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
    const xMax = Date.now();
    const xMin = xMax - (rangeMs[chartRange.value] || 86400000);

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const t = new Date(params[0].value[0]);
          const timeStr = chartRange.value === '7d'
            ? `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
            : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
          let html = `<div style="font-weight:600;margin-bottom:4px">${timeStr}</div>`;
          for (const p of params) {
            html += `<div>${p.marker} ${p.seriesName}: <b>${p.value[1]}</b> A</div>`;
          }
          return html;
        },
      },
      legend: {
        data: [t('device.chartLoadPower'), t('device.chartChargingPower'), t('device.chartBreaker')],
        bottom: 0,
        textStyle: { color: '#64748b' },
      },
      grid: {
        top: 40,
        left: 50,
        right: 20,
        bottom: 50,
      },
      xAxis: {
        type: 'time',
        min: xMin,
        max: xMax,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: chartRange.value === '7d'
            ? '{M}/{d} {HH}:{mm}'
            : '{HH}:{mm}',
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        name: chartPhase.value === 'total' ? t('device.chartCurrentTotal') : t('device.chartCurrentPhase', { phase: chartPhase.value }),
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: t('device.chartLoadPower'),
          type: 'line',
          stack: 'total',
          areaStyle: { color: 'rgba(251, 146, 60, 0.5)' },
          lineStyle: { color: '#f97316', width: 1.5 },
          itemStyle: { color: '#f97316' },
          symbol: 'none',
          smooth: true,
          data: points.map((p: any) => [p.time, chartPhase.value === 'total'
            ? +((p.load_current_a || 0) + (p.load_current_b || 0) + (p.load_current_c || 0)).toFixed(1)
            : p[`load_current_${chartPhase.value.toLowerCase()}`]]),
        },
        {
          name: t('device.chartChargingPower'),
          type: 'line',
          stack: 'total',
          areaStyle: { color: 'rgba(34, 197, 94, 0.5)' },
          lineStyle: { color: '#22c55e', width: 1.5 },
          itemStyle: { color: '#22c55e' },
          symbol: 'none',
          smooth: true,
          data: points.map((p: any) => [p.time, chartPhase.value === 'total'
            ? +((p.total_charging_current_a || 0) + (p.total_charging_current_b || 0) + (p.total_charging_current_c || 0)).toFixed(1)
            : p[`total_charging_current_${chartPhase.value.toLowerCase()}`]]),
        },
        {
          name: t('device.chartBreaker'),
          type: 'line',
          lineStyle: { color: '#ef4444', width: 2, type: 'dashed' },
          itemStyle: { color: '#ef4444' },
          symbol: 'none',
          data: points.map((p: any) => [p.time, p.breaker_rating]),
        },
      ],
    };
    chartInstance.setOption(option);

    // // 迷你图：功率
    // await nextTick();
    // if (powerChartRef.value) {
    //   if (powerChartInstance) powerChartInstance.dispose();
    //   powerChartInstance = echarts.init(powerChartRef.value);
    //   powerChartInstance.setOption({
    //     grid: { top: 10, left: 45, right: 15, bottom: 24 },
    //     xAxis: { type: 'time', min: xMin, max: xMax, show: false },
    //     yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    //     tooltip: { trigger: 'axis', formatter: (p: any) => p[0] ? `${p[0].axisValue}<br/>${p[0].value} W` : '' },
    //     series: [{
    //       type: 'line', data: points.map((p: any) => [p.time, p.total_power]),
    //       lineStyle: { color: '#8b5cf6', width: 1.5 }, itemStyle: { color: '#8b5cf6' },
    //       areaStyle: { color: 'rgba(139, 92, 246, 0.15)' }, symbol: 'none', smooth: true,
    //     }],
    //   });
    // }

    // // 迷你图：电压
    // if (voltageChartRef.value) {
    //   if (voltageChartInstance) voltageChartInstance.dispose();
    //   voltageChartInstance = echarts.init(voltageChartRef.value);
    //   voltageChartInstance.setOption({
    //     grid: { top: 10, left: 45, right: 15, bottom: 24 },
    //     xAxis: { type: 'time', min: xMin, max: xMax, show: false },
    //     yAxis: { type: 'value', min: 'dataMin', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    //     tooltip: { trigger: 'axis', formatter: (p: any) => p[0] ? `${p[0].axisValue}<br/>${p[0].value} V` : '' },
    //     series: [{
    //       type: 'line', data: points.map((p: any) => [p.time, p.voltage]),
    //       lineStyle: { color: '#0ea5e9', width: 1.5 }, itemStyle: { color: '#0ea5e9' },
    //       areaStyle: { color: 'rgba(14, 165, 233, 0.15)' }, symbol: 'none', smooth: true,
    //     }],
    //   });
    // }
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
      subscribeDlm(queryId);
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
    height: 100%;
    overflow: hidden;
    background: #f5f7fa;
    color: #1a1a2e;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ========== Left Panel ========== */
  .left-panel {
    width: 320px;
    min-width: 320px;
    height: 100%;
    background: #f5f7fa;
    border-right: 1px solid #e8ecf1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .search-input :deep(.ant-input) {
    background: #fff !important;
    border-color: #e2e8f0 !important;
    color: #1a1a2e !important;
  }

  .search-input :deep(.ant-input::placeholder) {
    color: #94a3b8 !important;
  }

  .search-input :deep(.ant-input-search-button) {
    background: #fff !important;
    border-color: #e2e8f0 !important;
    color: #3b82f6 !important;
  }

  .search-input :deep(.ant-input-clear-icon) {
    color: #94a3b8 !important;
  }

  .status-filter {
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .filter-group {
    display: flex;
    width: 100%;
  }

  .filter-group :deep(.ant-radio-button-wrapper) {
    flex: 1;
    text-align: center;
    background: #fff;
    border-color: #e2e8f0;
    color: #64748b;
    font-size: 12px;
    padding: 0 6px;
  }

  .filter-group :deep(.ant-radio-button-wrapper-checked) {
    background: rgba(0, 212, 255, 0.08) !important;
    border-color: #3b82f6 !important;
    color: #3b82f6 !important;
  }

  .filter-group :deep(.ant-radio-button-wrapper:hover) {
    color: #3b82f6;
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
    background: #d0d8e0;
    border-radius: 2px;
  }

  .device-item {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    margin: 4px 8px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid transparent;
    border-radius: 8px;
    background: #fff;
  }

  .device-item:hover {
    background: #edf2f7;
  }

  .device-item.active {
    border-left-color: transparent;
    border-radius: 8px;
    margin: 2px 8px;
    padding: 12px 12px;
  }

  .device-item.active .device-sn,
  .device-item.active .status-text,
  .device-item.active .hb-time {
    color: #fff !important;
  }

  .device-item.active .device-meta .status-text {
    color: rgba(255,255,255,0.85) !important;
  }

  .device-item.active .hb-time {
    color: rgba(255,255,255,0.65) !important;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .status-dot.status-online {
    background: #2dd4bf;
    box-shadow: 0 0 6px rgba(45, 212, 191, 0.5);
  }

  .status-dot.status-offline {
    background: #a0aec0;
  }

  .status-dot.status-fault {
    background: #c96b6b;
    box-shadow: 0 0 6px rgba(201, 107, 107, 0.5);
    animation: pulse-fault 2s infinite;
  }

  .status-dot.status-unactivated {
    background: #7c9ab8;
    border: 1px dashed #7c9ab8;
  }

  .status-dot.status-charging {
    background: #3b82f6;
    box-shadow: 0 0 6px rgba(0, 212, 255, 0.5);
  }

  .status-dot.status-idle {
    background: #64748b;
  }

  .status-dot.status-preparing {
    background: #00BCD4;
  }

  .status-dot.status-suspended {
    background: #d97706;
  }

  .status-dot.status-finishing {
    background: #14B8A6;
  }

  .status-dot.status-unavailable {
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
    color: #1a1a2e;
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

  .text-online { color: #188a7e; }
  .text-offline { color: #5a6a7a; }
  .text-fault { color: #c96b6b; }
  .text-unactivated { color: #7c9ab8; }

  .hb-time {
    color: #94a3b8;
  }

  .group-divider {
    border-top: 1px dashed #e2e8f0;
    margin: 4px 16px;
  }

  .empty-list {
    text-align: center;
    color: #94a3b8;
    padding: 32px;
    font-size: 13px;
  }

  .pagination-bar {
    padding: 12px 16px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .pagination-bar :deep(.ant-pagination-item) {
    background: #fff;
    border-color: #e2e8f0;
  }

  .pagination-bar :deep(.ant-pagination-item a) {
    color: #64748b;
  }

  .pagination-bar :deep(.ant-pagination-item-active) {
    border-color: #3b82f6;
  }

  .pagination-bar :deep(.ant-pagination-item-active a) {
    color: #3b82f6;
  }

  .pagination-bar :deep(.ant-pagination-prev button),
  .pagination-bar :deep(.ant-pagination-next button) {
    color: #64748b !important;
  }

  .pagination-bar :deep(.ant-pagination-total-text) {
    color: #94a3b8;
  }

  /* ========== Right Panel ========== */
  .right-panel {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #f5f7fa;
  }

  .right-panel::-webkit-scrollbar {
    width: 6px;
  }

  .right-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .right-panel::-webkit-scrollbar-thumb {
    background: #d0d8e0;
    border-radius: 3px;
  }

  .empty-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 64px - 40px);
  }

  .empty-illustration {
    margin-bottom: 20px;
    opacity: 0.8;
  }

  .empty-text {
    font-size: 16px;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .empty-hint {
    font-size: 13px;
    color: #94a3b8;
  }

  /* ========== Detail Header ========== */
  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .detail-sn {
    display: inline-block;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
    padding: 8px 20px;
    border-radius: 20px;
    margin-bottom: 4px;
  }

  .detail-sub {
    font-size: 13px;
    color: #1a1a2e;
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .sub-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .sub-icon {
    color: #94a3b8;
    font-size: 14px;
  }

  .section-icon {
    font-size: 14px;
    color: inherit;
  }

  .sub-label {
    color: #94a3b8;
    font-size: 12px;
    margin-right: 2px;
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

  .status-badge-online { background: rgba(0,255,136,0.12); color: #2d9d78; }
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
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 20px;
  }

  .detail-section.full {
    grid-column: 1 / -1;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #e2e8f0;
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
    border-bottom: 1px solid #f0f0f0;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #94a3b8;
    font-size: 13px;
  }

  .info-value {
    color: #1a1a2e;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-value.highlight {
    color: #3b82f6;
    font-weight: 600;
    font-size: 15px;
  }

  .action-btn {
    color: #3b82f6 !important;
    font-size: 12px;
    padding: 0 4px;
    height: auto;
  }

  .action-btn:hover {
    color: #33dfff !important;
  }

  .reset-icon {
    color: #3b82f6;
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
  .ota-inline-pct { color: #3b82f6; font-weight: 600; }

  .ota-bar-bg {
    height: 6px;
    background: rgba(0, 212, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .ota-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #2d9d78);
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
    color: #3b82f6 !important;
  }

  /* Badge overrides */
  .badge-online :deep(.ant-badge-status-text) { color: #2d9d78; }
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

  /* ========== 充电桩卡片 ========== */
  .pile-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 10px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .pile-card-charging {
    border-color: #93c5fd;
    background: #f0f7ff;
    position: relative;
    overflow: hidden;
  }

  .pile-card-charging::after {
    content: '';
    position: absolute;
    top: 0;
    left: -80%;
    width: 80%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
    animation: charging-pulse 3s ease-in-out infinite;
    animation-delay: -999s;
    pointer-events: none;
  }

  @keyframes charging-pulse {
    0% { left: -50%; }
    100% { left: 100%; }
  }

  .pile-card-offline {
    opacity: 0.5;
  }

  .pile-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
  }

  .pile-card-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pile-card-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pile-current {
    font-size: 15px;
    font-weight: 700;
    color: #1a3a5c;
  }

  .pile-signal {
    font-size: 16px;
    cursor: help;
  }

  .pile-charge-info {
    padding: 4px 16px 8px;
    font-size: 13px;
    color: #475569;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  .workmode-badge {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, #188a7e, #2dd4bf);
    border-radius: 10px;
    padding: 2px 8px;
    cursor: pointer;
    gap: 2px;
    transition: box-shadow 0.2s;
  }
  .workmode-badge:hover {
    box-shadow: 0 0 6px rgba(45, 212, 191, 0.5);
  }
  .workmode-prefix {
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    font-weight: 500;
    letter-spacing: 0.5px;
    transform: scale(0.8);
    transform-origin: left center;
    display: inline-block;
    margin-right: -6px;
  }
  .workmode-value {
    font-size: 11px;
    color: #fff;
    font-weight: 700;
  }
  .workmode-arrow {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-left: 2px;
  }

  .pile-firmware {
    padding: 2px 16px 8px;
    font-size: 12px;
    color: #94a3b8;
  }

  .pile-connectors {
    border-top: 1px solid #f1f5f9;
    padding: 4px 16px 8px;
  }

  .pile-sn-badge {
    display: inline-block;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    padding: 4px 14px;
    border-radius: 14px;
  }

  .pile-model {
    font-size: 12px;
    color: #64748b;
  }

  .pile-version {
    font-size: 11px;
    color: #94a3b8;
    font-family: monospace;
  }

  .connector-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
  }

  .conn-indent {
    color: #94a3b8;
    font-size: 12px;
  }

  .conn-label {
    font-size: 12px;
    color: #94a3b8;
    width: 36px;
  }

  .conn-duration {
    margin-left: auto;
    font-size: 12px;
    color: #64748b;
  }

  .charger-tag {
    font-size: 11px;
  }

  .tag-preparing:deep(.ant-tag) ,
  :deep(.tag-preparing) {
    background: #00BCD4 !important;
    border: none !important;
    color: #fff !important;
  }

  .tag-finishing:deep(.ant-tag),
  :deep(.tag-finishing) {
    background: #14B8A6 !important;
    border: none !important;
    color: #fff !important;
  }

  /* ========== 电流进度条 ========== */
  .current-bar-wrapper {
    margin-bottom: 8px;
  }

  .current-bar-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .current-bar-label {
    color: #64748b;
  }

  .current-bar-value {
    font-weight: 600;
    color: #1a3a5c;
  }

  .current-bar-bg {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .current-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease, background 0.5s ease;
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
    color: #3b82f6 !important;
  }

  .dark-tabs :deep(.ant-tabs-ink-bar) {
    background: #3b82f6 !important;
  }

  .dark-tabs :deep(.ant-tabs-content-holder) {
    padding: 12px 20px 16px;
  }

  /* 充电记录表格：字小、灰色 */
  .dark-tabs :deep(.ant-table) {
    font-size: 12px;
    color: #64748b;
  }
  .dark-tabs :deep(.ant-table-thead > tr > th) {
    font-size: 12px;
    color: #94a3b8;
    background: #f8fafc;
    padding: 8px 12px;
    font-weight: 500;
  }
  .dark-tabs :deep(.ant-table-tbody > tr > td) {
    padding: 6px 12px;
    color: #64748b;
  }
  .dark-tabs :deep(.ant-table-pagination) {
    margin: 8px 0 0;
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
    color: #334155;
  }

  .alert-time {
    font-size: 11px;
    color: #94a3b8;
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
    color: #334155;
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

  .dlm-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .dlm-title {
    font-size: 16px;
    font-weight: 500;
    color: #94a3b8;
    margin-bottom: 12px;
  }

  .dlm-value-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
  }

  .dlm-value-num {
    font-size: 56px;
    font-weight: 700;
    line-height: 1;
    transition: color 0.3s;
  }

  .dlm-value-unit {
    font-size: 24px;
    font-weight: 600;
    color: #94a3b8;
  }

  .dlm-current-hint {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
  }

  .dlm-slider-wrapper {
    margin-bottom: 32px;
    padding: 0 8px;
  }

  .dlm-slider-track {
    position: relative;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    cursor: pointer;
  }

  .dlm-slider-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 4px;
    transition: width 0.15s;
  }

  .dlm-slider-thumb {
    position: absolute;
    top: 50%;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    cursor: grab;
    transition: left 0.15s, background 0.3s;
  }

  .dlm-slider-thumb:active {
    cursor: grabbing;
    transform: translate(-50%, -50%) scale(1.1);
  }

  .dlm-marks {
    position: relative;
    height: 30px;
    margin-top: 12px;
  }

  .dlm-mark {
    position: absolute;
    transform: translateX(-50%);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dlm-mark.active {
    font-weight: 700;
    font-size: 13px;
  }

  .dlm-confirm-btn {
    background: #3b82f6 !important;
    border-color: #3b82f6 !important;
    height: 44px;
    font-size: 15px;
    border-radius: 10px;
  }

  .dlm-confirm-btn:hover {
    background: #2563eb !important;
  }

  .dlm-confirm-btn:disabled {
    background: #e2e8f0 !important;
    border-color: #e2e8f0 !important;
    color: #94a3b8 !important;
  }

  /* ========== DLM Chart Icon ========== */
  .chart-icon {
    float: right;
    cursor: pointer;
    color: #94a3b8;
    font-size: 15px;
    transition: color 0.2s;
  }
  .chart-icon:hover {
    color: #3b82f6;
  }

  /* ========== DLM Chart Modal ========== */
  .dlm-chart-header {
    margin-bottom: 8px;
  }
  .dlm-chart-toolbar {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dlm-chart-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }
  .dlm-chart-container {
    position: relative;
    min-height: 360px;
  }
  .chart-empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #94a3b8;
    font-size: 14px;
  }

  .mini-charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }

  .mini-chart-box {
    background: #fafbfc;
    border-radius: 6px;
    padding: 8px;
  }

  .mini-chart-label {
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    margin-bottom: 4px;
  }
</style>
