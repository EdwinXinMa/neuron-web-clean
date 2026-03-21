<template>
  <div class="oplog-screen">
    <div class="page-header">
      <h2 class="page-title">操作日志</h2>
    </div>

    <!-- 筛选栏（一行） -->
    <div class="filter-bar">
      <div class="filter-group">
        <a-button
          v-for="item in typeOptions"
          :key="item.value"
          :class="['type-btn', { active: activeType === item.value }]"
          @click="activeType = item.value"
        >
          {{ item.label }}
        </a-button>
      </div>
      <div class="filter-right">
        <a-input-search
          v-model:value="snKeyword"
          placeholder="搜索设备序列号"
          class="sn-search dark-input-search"
          allow-clear
        />
        <a-range-picker
          v-model:value="dateRange"
          class="dark-picker"
          :placeholder="['开始时间', '结束时间']"
        />
      </div>
    </div>

    <!-- 操作日志表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="filteredLogs"
        :pagination="{ current: opPage, pageSize: 10, total: opTotal, showTotal: (t: number) => '共 ' + t + ' 条', onChange: onPageChange }"
        row-key="time"
        class="dark-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'time'">
            <span class="time-text">{{ record.time }}</span>
          </template>
          <template v-if="column.dataIndex === 'user'">
            <span class="user-text">{{ record.user }}</span>
          </template>
          <template v-if="column.dataIndex === 'device'">
            <span class="sn-link" @click="goDevice(record.device)">{{ record.device }}</span>
          </template>
          <template v-if="column.dataIndex === 'type'">
            <span class="type-cell">
              <span :class="['type-dot', typeDotClass(record.type)]"></span>
              <span class="type-text">{{ record.type }}</span>
            </span>
          </template>
          <template v-if="column.dataIndex === 'content'">
            <span class="content-text">{{ record.content }}</span>
          </template>
          <template v-if="column.dataIndex === 'result'">
            <span v-if="record.result === 'success'" class="result-success">✅ 成功</span>
            <span v-else class="result-fail">❌ 失败</span>
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

const activeType = ref<string>('all')
const snKeyword = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: 'OTA 升级', value: 'OTA 升级' },
  { label: 'DLM 修改', value: 'DLM 修改' },
  { label: '远程重启', value: '远程重启' },
  { label: '远程重置', value: '远程重置' },
]

// 不同操作类型对应的点颜色 class
function typeDotClass(type: string): string {
  switch (type) {
    case 'OTA 升级': return 'dot-ota'
    case 'DLM 修改': return 'dot-dlm'
    case '远程重启': return 'dot-reboot'
    case '远程重置': return 'dot-reset'
    default: return 'dot-default'
  }
}

const columns = [
  {
    title: '操作时间',
    dataIndex: 'time',
    width: 180,
    defaultSortOrder: 'descend' as const,
    sorter: (a: OpLog, b: OpLog) => a.time.localeCompare(b.time),
  },
  { title: '操作人', dataIndex: 'user', width: 90 },
  { title: '设备序列号', dataIndex: 'device', width: 220 },
  { title: '操作类型', dataIndex: 'type', width: 110 },
  { title: '操作内容', dataIndex: 'content' },
  { title: '结果', dataIndex: 'result', width: 90 },
]

// 操作日志真实数据
const opLogs = ref<any[]>([])
const opTotal = ref(0)
const opLoading = ref(false)
const opPage = ref(1)

async function loadOpLogs() {
  opLoading.value = true
  try {
    const params: any = { pageNo: opPage.value, pageSize: 10 }
    if (snKeyword.value.trim()) params.deviceSn = snKeyword.value.trim()
    if (activeType.value !== 'all') params.operateType = activeType.value
    if (dateRange.value) {
      params.startTime = dateRange.value[0].format('YYYY-MM-DD 00:00:00')
      params.endTime = dateRange.value[1].format('YYYY-MM-DD 23:59:59')
    }
    const res: any = await http.get('/oplog/list', { params })
    const data = res.result || res
    // 适配字段
    opLogs.value = (data.records || []).map((l: any) => ({
      time: l.opTime || l.createTime,
      user: l.opUser || '-',
      device: l.deviceSn || '-',
      type: opTypeLabel(l.opType),
      content: l.opContent || '-',
      result: l.opResult === 'SUCCESS' ? 'success' : 'fail',
    }))
    opTotal.value = data.total || 0
  } catch (e) {
    // fallback to empty
    opLogs.value = []
  } finally {
    opLoading.value = false
  }
}

function opTypeLabel(t: string): string {
  const map: Record<string, string> = {
    OTA_UPGRADE: 'OTA 升级',
    DLM_CONFIG: 'DLM 修改',
    REMOTE_REBOOT: '远程重启',
    REMOTE_RESET: '远程重置',
  }
  return map[t] || t || '其他'
}

function onPageChange(p: number) {
  opPage.value = p
  loadOpLogs()
}

onMounted(() => loadOpLogs())
watch([activeType, snKeyword, dateRange], () => { opPage.value = 1; loadOpLogs() })

// 过滤由后端处理，直接使用 opLogs
const filteredLogs = computed(() => opLogs.value)

function goDevice(sn: string) {
  router.push({ path: '/devices', query: { id: sn } })
}
</script>

<style scoped>
.oplog-screen {
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
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 20px;
  background: rgba(10, 18, 36, 0.9);
  border: 1px solid rgba(0, 212, 255, 0.08);
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-btn {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #94a3b8 !important;
  transition: all 0.25s;
}

.type-btn.active {
  background: rgba(0, 212, 255, 0.15) !important;
  border-color: #00d4ff !important;
  color: #00d4ff !important;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
}

.type-btn:hover:not(.active) {
  border-color: rgba(0, 212, 255, 0.4) !important;
  color: #e2e8f0 !important;
}

.sn-search {
  width: 260px;
}

/* ── 表格单元格内容 ── */
.time-text {
  color: #64748b;
  font-size: 13px;
}

.user-text {
  color: #e2e8f0;
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

.type-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-ota    { background: #00d4ff; }
.dot-dlm    { background: #f59e0b; }
.dot-reboot { background: #a78bfa; }
.dot-reset  { background: #f87171; }
.dot-default{ background: #64748b; }

.type-text {
  color: #e2e8f0;
}

.content-text {
  color: #64748b;
  font-size: 13px;
}

.result-success {
  color: #4ade80;
  font-size: 13px;
}

.result-fail {
  color: #f87171;
  font-size: 13px;
}

/* ── 表格容器 ── */
.table-wrapper {
  background: rgba(15, 25, 50, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
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

/* ── 输入框暗色覆盖 ── */
:deep(.dark-input-search .ant-input) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #e2e8f0 !important;
}

:deep(.dark-input-search .ant-input::placeholder) {
  color: #64748b !important;
}

:deep(.dark-input-search .ant-input-search-button) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #64748b !important;
}

:deep(.dark-input-search .ant-input-clear-icon) {
  color: #64748b !important;
}

:deep(.dark-input-search .ant-input-affix-wrapper) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
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
