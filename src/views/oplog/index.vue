<template>
  <div class="oplog-screen">
    <!-- 筛选栏 -->
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
          :placeholder="t('oplog.searchSn')"
          class="sn-search dark-input-search"
          allow-clear
        />
        <a-range-picker
          v-model:value="dateRange"
          class="dark-picker"
          :placeholder="[t('common.startTime'), t('common.endTime')]"
        />
      </div>
    </div>

    <!-- 操作日志表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="filteredLogs"
        :pagination="{
          current: opPage,
          pageSize: 10,
          total: opTotal,
          showTotal: (n: number) => t('common.totalRecords', { n }),
          onChange: onPageChange
        }"
        row-key="time"
        size="middle"
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
              <span :class="['type-dot', typeDotClass(record.typeKey)]"></span>
              <span class="type-text">{{ record.type }}</span>
            </span>
          </template>
          <template v-if="column.dataIndex === 'content'">
            <span class="content-text">{{ record.content }}</span>
          </template>
          <template v-if="column.dataIndex === 'result'">
            <span v-if="record.result === 'success'" class="result-success">{{ t('oplog.success') }}</span>
            <span v-else class="result-fail">{{ t('oplog.fail') }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import http from '@/api/http'
import type { Dayjs } from 'dayjs'

const { t } = useI18n()
const router = useRouter()

const activeType = ref<string>('all')
const snKeyword = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const typeOptions = computed(() => [
  { label: t('oplog.typeAll'), value: 'all' },
  { label: t('oplog.typeOta'), value: 'OTA_UPGRADE' },
  { label: t('oplog.typeDlm'), value: 'DLM_CONFIG' },
  { label: t('oplog.typeReboot'), value: 'REMOTE_REBOOT' },
  // { label: t('oplog.typeReset'), value: 'REMOTE_RESET' }, // 暂未实现
])

function typeDotClass(typeKey: string): string {
  switch (typeKey) {
    case 'OTA_UPGRADE': return 'dot-ota'
    case 'DLM_CONFIG': return 'dot-dlm'
    case 'REMOTE_REBOOT': return 'dot-reboot'
    case 'REMOTE_RESET': return 'dot-reset'
    default: return 'dot-default'
  }
}

const columns = computed(() => [
  {
    title: t('oplog.colTime'),
    dataIndex: 'time',
    width: 180,
    defaultSortOrder: 'descend' as const,
    sorter: (a: any, b: any) => a.time.localeCompare(b.time),
  },
  { title: t('oplog.colUser'), dataIndex: 'user', width: 90 },
  { title: t('oplog.colDevice'), dataIndex: 'device', width: 220 },
  { title: t('oplog.colType'), dataIndex: 'type', width: 130 },
  { title: t('oplog.colContent'), dataIndex: 'content' },
  { title: t('oplog.colResult'), dataIndex: 'result', width: 90 },
])

const opLogs = ref<any[]>([])
const opTotal = ref(0)
const opLoading = ref(false)
const opPage = ref(1)

async function loadOpLogs() {
  opLoading.value = true
  try {
    const params: any = { pageNo: opPage.value, pageSize: 10 }
    if (snKeyword.value.trim()) params.deviceSn = snKeyword.value.trim()
    if (activeType.value !== 'all') params.opType = activeType.value
    if (dateRange.value) {
      params.startTime = dateRange.value[0].format('YYYY-MM-DD 00:00:00')
      params.endTime = dateRange.value[1].format('YYYY-MM-DD 23:59:59')
    }
    const res: any = await http.get('/oplog/list', { params })
    const data = res.result || res
    opLogs.value = (data.records || []).map((l: any) => ({
      time: l.opTime || l.createTime,
      user: l.opUser || '-',
      device: l.deviceSn || '-',
      typeKey: l.opType,
      type: opTypeLabel(l.opType),
      content: l.opContent || '-',
      result: l.opResult === 'SUCCESS' ? 'success' : 'fail',
    }))
    opTotal.value = data.total || 0
  } catch (e) {
    opLogs.value = []
  } finally {
    opLoading.value = false
  }
}

function opTypeLabel(key: string): string {
  const map: Record<string, string> = {
    OTA_UPGRADE: t('oplog.typeOta'),
    DLM_CONFIG: t('oplog.typeDlm'),
    REMOTE_REBOOT: t('oplog.typeReboot'),
    REMOTE_RESET: t('oplog.typeReset'),
  }
  return map[key] || key || t('oplog.typeOther')
}

function onPageChange(p: number) {
  opPage.value = p
  loadOpLogs()
}

onMounted(() => loadOpLogs())
watch([activeType, snKeyword, dateRange], () => { opPage.value = 1; loadOpLogs() })

const filteredLogs = computed(() => opLogs.value)

function goDevice(sn: string) {
  router.push({ path: '/devices', query: { id: sn } })
}
</script>

<style scoped>
.oplog-screen {
  padding: 24px;
  height: 100%;
  overflow: hidden;
  background: #f5f7fa;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
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
  background: #fff !important;
  border-color: #e2e8f0 !important;
  color: #64748b !important;
  transition: all 0.25s;
}

.type-btn.active {
  background: rgba(0, 212, 255, 0.08) !important;
  border-color: #3b82f6 !important;
  color: #3b82f6 !important;
}

.type-btn:hover:not(.active) {
  border-color: #3b82f6 !important;
  color: #1a1a2e !important;
}

.sn-search { width: 260px; }

.time-text { color: #94a3b8; font-size: 13px; }
.user-text { color: #1a1a2e; }

.sn-link {
  color: #3b82f6;
  cursor: pointer;
  transition: opacity 0.2s;
}
.sn-link:hover { opacity: 0.8; text-decoration: underline; }

.type-cell { display: flex; align-items: center; gap: 6px; }

.type-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-ota    { background: #3b82f6; }
.dot-dlm    { background: #f59e0b; }
.dot-reboot { background: #a78bfa; }
.dot-reset  { background: #f87171; }
.dot-default{ background: #64748b; }

.type-text { color: #1a1a2e; }
.content-text { color: #94a3b8; font-size: 13px; }
.result-success { color: #2d9d78; font-size: 13px; }
.result-fail { color: #f87171; font-size: 13px; }

.table-wrapper {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  flex: 1;
  overflow: hidden;
}

:deep(.dark-table) { background: transparent; }
:deep(.dark-table .ant-table) { background: #fff; color: #1a1a2e; }
:deep(.dark-table .ant-table-thead > tr > th) {
  background: #fafbfc !important; color: #64748b !important;
  border-bottom: 1px solid #e2e8f0 !important; font-weight: 500;
}
:deep(.dark-table .ant-table-thead > tr > th::before) { display: none !important; }
:deep(.dark-table .ant-table-tbody > tr > td) {
  background: #fff !important; color: #1a1a2e !important;
  border-bottom: 1px solid #f0f0f0 !important;
  padding-top: 16.5px !important; padding-bottom: 16.5px !important;
}
:deep(.dark-table .ant-table-tbody > tr:hover > td) { background: #f5f7fa !important; }
:deep(.dark-table .ant-table-cell-row-hover) { background: #f5f7fa !important; }
:deep(.dark-table .ant-pagination) { color: #64748b; }
:deep(.dark-table .ant-pagination .ant-pagination-item) { background: #fff; border-color: #e2e8f0; }
:deep(.dark-table .ant-pagination .ant-pagination-item a) { color: #64748b; }
:deep(.dark-table .ant-pagination .ant-pagination-item-active) { border-color: #3b82f6; }
:deep(.dark-table .ant-pagination .ant-pagination-item-active a) { color: #3b82f6; }
:deep(.dark-table .ant-pagination .ant-pagination-prev .ant-pagination-item-link),
:deep(.dark-table .ant-pagination .ant-pagination-next .ant-pagination-item-link) {
  color: #64748b; background: #fff; border-color: #e2e8f0;
}
:deep(.dark-table .ant-table-column-sorter) { color: #94a3b8; }
:deep(.dark-table .ant-select-selector) {
  background: #fff !important; border-color: #e2e8f0 !important; color: #64748b !important;
}
:deep(.dark-table .ant-pagination-total-text) { color: #94a3b8; }
:deep(.dark-table .ant-table-empty .ant-table-placeholder) {
  background: #fff !important; color: #94a3b8 !important;
}

:deep(.dark-input-search .ant-input) { background: #fff !important; border-color: #e2e8f0 !important; color: #1a1a2e !important; }
:deep(.dark-input-search .ant-input::placeholder) { color: #94a3b8 !important; }
:deep(.dark-input-search .ant-input-search-button) { background: #fff !important; border-color: #e2e8f0 !important; color: #94a3b8 !important; }
:deep(.dark-input-search .ant-input-clear-icon) { color: #94a3b8 !important; }
:deep(.dark-input-search .ant-input-affix-wrapper) { background: #fff !important; border-color: #e2e8f0 !important; }

:deep(.dark-picker) { background: #fff !important; border-color: #e2e8f0 !important; }
:deep(.dark-picker input) { color: #1a1a2e !important; }
:deep(.dark-picker .ant-picker-suffix) { color: #94a3b8 !important; }
:deep(.dark-picker .ant-picker-separator) { color: #94a3b8 !important; }
:deep(.dark-picker .ant-picker-clear) { background: #fff !important; color: #94a3b8 !important; }
</style>
