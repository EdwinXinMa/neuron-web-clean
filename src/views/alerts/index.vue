<template>
  <div class="alerts-screen">
    <div class="page-header">
      <h2 class="page-title">告警记录</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <a-button
          v-for="item in levelOptions"
          :key="item.value"
          :class="['level-btn', { active: activeLevel === item.value }]"
          @click="activeLevel = item.value"
        >
          {{ item.label }}
        </a-button>
      </div>
      <a-range-picker
        v-model:value="dateRange"
        class="dark-picker"
        :placeholder="['开始时间', '结束时间']"
      />
    </div>

    <!-- 告警表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="filteredAlerts"
        :pagination="{
        current: alertPage,
        pageSize: 10,
        total: alertTotal,
        showTotal: (t: number) => `共 ${t} 条`,
        onChange: onPageChange
      }"
        row-key="time"
        class="dark-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'level'">
            <span :class="['level-tag', `level-${record.level}`]">
              {{ levelLabelMap[record.level] }}
            </span>
          </template>
          <template v-if="column.dataIndex === 'device'">
            <span class="sn-link" @click="goDevice(record.device)">{{ record.device }}</span>
          </template>
          <template v-if="column.dataIndex === 'time'">
            <span class="time-text">{{ record.time }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import type { Dayjs } from 'dayjs'

const router = useRouter()

const activeLevel = ref<string>('all')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const levelOptions = [
  { label: '全部', value: 'all' },
  { label: '🔴 严重', value: 'critical' },
  { label: '🟠 重要', value: 'major' },
  { label: '🔵 一般', value: 'minor' },
  { label: '⚫ 信息', value: 'info' },
]

const levelLabelMap: Record<string, string> = {
  critical: '严重',
  major: '重要',
  minor: '一般',
  info: '信息',
}

const columns = [
  { title: '级别', dataIndex: 'level', width: 100 },
  { title: '设备序列号', dataIndex: 'device', width: 220 },
  { title: '告警内容', dataIndex: 'msg' },
  {
    title: '时间',
    dataIndex: 'time',
    width: 180,
    defaultSortOrder: 'descend' as const,
    sorter: (a: Alert, b: Alert) => a.time.localeCompare(b.time),
  },
]

// 真实告警数据
const alertList = ref<any[]>([])
const alertTotal = ref(0)
const alertPage = ref(1)
const alertLoading = ref(false)

async function loadAlerts() {
  alertLoading.value = true
  try {
    const params: any = { pageNo: alertPage.value, pageSize: 10 }
    // 级别映射：前端 critical/major/minor/info → 后端 CRITICAL/IMPORTANT/NORMAL/INFO
    const levelMap: Record<string, string> = { critical: 'CRITICAL', major: 'IMPORTANT', minor: 'NORMAL', info: 'INFO' }
    if (activeLevel.value !== 'all') params.alertLevel = levelMap[activeLevel.value] || activeLevel.value
    if (dateRange.value) {
      params.startTime = dateRange.value[0].format('YYYY-MM-DD 00:00:00')
      params.endTime = dateRange.value[1].format('YYYY-MM-DD 23:59:59')
    }
    const res: any = await http.get('/alert/list', { params })
    const data = res.result || res
    alertList.value = (data.records || []).map((a: any) => ({
      level: a.alertLevel === 'CRITICAL' ? 'critical' : a.alertLevel === 'IMPORTANT' ? 'major' : a.alertLevel === 'NORMAL' ? 'minor' : 'info',
      device: a.deviceSn,
      msg: a.description || a.errorCode,
      time: a.alertTime,
      errorCode: a.errorCode,
      vendorErrorCode: a.vendorErrorCode,
    }))
    alertTotal.value = data.total || 0
  } catch(e) {
    alertList.value = []
  } finally {
    alertLoading.value = false
  }
}

onMounted(() => loadAlerts())
watch([activeLevel, dateRange], () => { alertPage.value = 1; loadAlerts() })

const filteredAlerts = computed(() => alertList.value)

function onPageChange(page: number) {
  alertPage.value = page
  loadAlerts()
}

function goDevice(sn: string) {
  router.push({ path: '/devices', query: { id: sn } })
}
</script>

<style scoped>
.alerts-screen {
  padding: 24px;
  min-height: 100vh;
  background: #0a1628;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  color: #e2e8f0;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: rgba(10, 18, 36, 0.9);
  border: 1px solid rgba(0, 212, 255, 0.08);
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 8px;
}

.level-btn {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #94a3b8 !important;
  transition: all 0.25s;
}

.level-btn.active {
  background: rgba(0, 212, 255, 0.15) !important;
  border-color: #00d4ff !important;
  color: #00d4ff !important;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
}

.level-btn:hover:not(.active) {
  border-color: rgba(0, 212, 255, 0.4) !important;
  color: #e2e8f0 !important;
}

/* ── 告警级别 Tag ── */
.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 22px;
}

.level-critical {
  background: rgba(255, 71, 87, 0.12);
  color: #ff4757;
}

.level-major {
  background: rgba(255, 159, 67, 0.12);
  color: #ff9f43;
}

.level-minor {
  background: rgba(0, 212, 255, 0.12);
  color: #00d4ff;
}

.level-info {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

/* ── 表格容器 ── */
.table-wrapper {
  background: rgba(15, 25, 50, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
}

.sn-link {
  color: #00d4ff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.sn-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.time-text {
  color: #64748b;
}

/* ── Ant Design 表格暗色覆盖 ── */
:deep(.dark-table) {
  background: transparent;
}

:deep(.dark-table .ant-table) {
  background: transparent;
  color: #e2e8f0;
}

:deep(.dark-table .ant-table-thead > tr > th) {
  background: rgba(0, 212, 255, 0.05) !important;
  color: #64748b !important;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08) !important;
  font-weight: 500;
}

:deep(.dark-table .ant-table-thead > tr > th::before) {
  display: none !important;
}

:deep(.dark-table .ant-table-tbody > tr > td) {
  background: transparent !important;
  color: #e2e8f0 !important;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08) !important;
}

:deep(.dark-table .ant-table-tbody > tr:hover > td) {
  background: rgba(0, 212, 255, 0.05) !important;
}

:deep(.dark-table .ant-table-cell-row-hover) {
  background: rgba(0, 212, 255, 0.05) !important;
}

/* 分页器 */
:deep(.dark-table .ant-pagination) {
  color: #94a3b8;
}

:deep(.dark-table .ant-pagination .ant-pagination-item) {
  background: transparent;
  border-color: rgba(0, 212, 255, 0.2);
}

:deep(.dark-table .ant-pagination .ant-pagination-item a) {
  color: #94a3b8;
}

:deep(.dark-table .ant-pagination .ant-pagination-item-active) {
  border-color: #00d4ff;
}

:deep(.dark-table .ant-pagination .ant-pagination-item-active a) {
  color: #00d4ff;
}

:deep(.dark-table .ant-pagination .ant-pagination-prev .ant-pagination-item-link),
:deep(.dark-table .ant-pagination .ant-pagination-next .ant-pagination-item-link) {
  color: #94a3b8;
  background: transparent;
  border-color: rgba(0, 212, 255, 0.2);
}

:deep(.dark-table .ant-table-column-sorter) {
  color: #64748b;
}

:deep(.dark-table .ant-select-selector) {
  background: transparent !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #94a3b8 !important;
}

:deep(.dark-table .ant-pagination-total-text) {
  color: #64748b;
}

:deep(.dark-table .ant-table-empty .ant-table-placeholder) {
  background: transparent !important;
  color: #64748b !important;
}

/* ── 日期选择器暗色覆盖 ── */
:deep(.dark-picker) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
}

:deep(.dark-picker input) {
  color: #e2e8f0 !important;
}

:deep(.dark-picker .ant-picker-suffix) {
  color: #64748b !important;
}

:deep(.dark-picker .ant-picker-separator) {
  color: #64748b !important;
}

:deep(.dark-picker .ant-picker-clear) {
  background: #0a1628 !important;
  color: #64748b !important;
}
</style>
