<template>
  <div class="management-view">
    <a-tabs v-model:activeKey="activeTab" class="management-tabs">
      <a-tab-pane key="ledger" tab="设备台账" />
      <a-tab-pane key="firmware" tab="固件库" />
    </a-tabs>

    <FirmwareTab v-if="activeTab === 'firmware'" />

    <template v-if="activeTab === 'ledger'">
    <!-- 顶部栏：搜索 + 操作按钮一行 -->
    <div class="toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="按序列号搜索..."
        allow-clear
        class="search-input"
        @search="onSearch"
      />
      <div class="toolbar-actions">
        <span v-if="importResult" class="import-result">
          <span class="import-success">成功 {{ importResult.success }} 条</span>
          <span v-if="importResult.fail > 0" class="import-fail"> / 失败 {{ importResult.fail }} 条</span>
        </span>
        <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls">
          <a-button class="import-btn">批量导入 Excel</a-button>
        </a-upload>
        <a-button type="primary" class="add-btn" @click="openAddModal">+ 新增设备</a-button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="deviceList"
        :loading="loading"
        :pagination="pagination"
        row-key="sn"
        size="middle"
        :scroll="{ x: 900 }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'sn'">
            <a class="sn-link" @click="goDevice(record.sn)">{{ record.sn }}</a>
          </template>
          <template v-else-if="column.dataIndex === 'shipDate'">
            {{ record.shipDate ? record.shipDate.slice(0, 10) : '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'onlineStatus'">
            <span :class="['status-badge', `status-${(record.onlineStatus || 'UNACTIVATED').toLowerCase()}`]">
              {{ onlineStatusLabel(record.onlineStatus) }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="edit-btn" @click="openEditModal(record)">维护</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/修改设备 Modal -->
    <a-modal
      v-model:open="showModal"
      :title="isEdit ? '修改设备' : '新增设备'"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleSubmit"
      @cancel="resetForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="SN" :required="!isEdit">
          <a-input
            v-model:value="formData.sn"
            placeholder="设备序列号"
            :disabled="isEdit"
            @blur="formData.sn = formData.sn.toUpperCase().replace(/\s/g, '')"
          />
        </a-form-item>

        <a-form-item label="经销商" required>
          <a-input v-model:value="formData.dealer" placeholder="经销商名称" />
        </a-form-item>
        <a-form-item label="批次号">
          <a-input v-model:value="formData.batchNo" placeholder="选填" />
        </a-form-item>
        <a-form-item label="出货日期">
          <a-date-picker v-model:value="formData.shipDate" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
    </template><!-- end ledger -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import http from '@/api/http'
import FirmwareTab from './FirmwareTab.vue'
import { getDeviceList } from '@/api/device'

const router = useRouter()

// ==================== 状态 ====================
const activeTab = ref('ledger')
const searchText = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const deviceList = ref<any[]>([])
const total = ref(0)

// Modal
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref<string>('')
const submitLoading = ref(false)
const formData = reactive({
  sn: '',
  deviceType: undefined as string | undefined,
  dealer: '',
  batchNo: '',
  shipDate: null as any,
})

// 导入结果
const importResult = ref<{ success: number; fail: number } | null>(null)

// ==================== 表格列 ====================
const columns = [
  { title: '序列号', dataIndex: 'sn', width: 160, fixed: 'left' as const },
  { title: '设备类型', dataIndex: 'deviceType', width: 110 },
  { title: '经销商', dataIndex: 'dealer', width: 120 },
  { title: '批次号', dataIndex: 'batchNo', width: 110 },
  { title: '出货日期', dataIndex: 'shipDate', width: 120 },
  { title: '在线状态', dataIndex: 'onlineStatus', width: 100 },
  { title: '操作', dataIndex: 'action', width: 90, fixed: 'right' as const },
]

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (t: number) => `共 ${t} 台`,
  showSizeChanger: false,
}))

// ==================== 数据加载 ====================
async function loadList() {
  loading.value = true
  try {
    const res: any = await getDeviceList({
      sn: searchText.value || undefined,
      onlineStatus: statusFilter.value === 'all' ? undefined : statusFilter.value,
      pageNo: currentPage.value,
      pageSize: pageSize.value,
    })
    const data = res.result || res
    deviceList.value = data.records || []
    total.value = data.total || 0
  } catch {
    message.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  currentPage.value = 1
  loadList()
}

function onTableChange(pag: any) {
  currentPage.value = pag.current
  pageSize.value = pag.pageSize
  loadList()
}

// 状态筛选变化
watch(statusFilter, () => {
  currentPage.value = 1
  loadList()
})

// ==================== 在线状态 ====================
function onlineStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ONLINE: '在线',
    OFFLINE: '离线',
    FAULT: '故障',
    UNACTIVATED: '未激活',
  }
  return map[status] || '未激活'
}

// ==================== 跳转设备视图 ====================
function goDevice(sn: string) {
  router.push({ path: '/devices', query: { id: sn } })
}

// ==================== 新增 / 修改 Modal ====================
function openAddModal() {
  isEdit.value = false
  resetForm()
  showModal.value = true
}

function openEditModal(record: any) {
  isEdit.value = true
  editId.value = record.id || record.sn
  formData.sn = record.sn
  formData.deviceType = record.deviceType
  formData.dealer = record.dealer || ''
  formData.batchNo = record.batchNo || ''
  formData.shipDate = record.shipDate ? dayjs(record.shipDate) : null
  showModal.value = true
}

async function handleSubmit() {
  if (!isEdit.value && !formData.sn) {
    message.warning('请填写 SN')
    return
  }
  if (!formData.dealer) {
    message.warning('请填写经销商')
    return
  }
  submitLoading.value = true
  try {
    const body: any = {
      id: isEdit.value ? editId.value : undefined,
      sn: formData.sn.toUpperCase().replace(/\s/g, ''),
      deviceType: 'N3_LITE',
      dealer: formData.dealer,
      batchNo: formData.batchNo || undefined,
      shipDate: formData.shipDate ? dayjs(formData.shipDate).format('YYYY-MM-DD') : undefined,
    }
    if (isEdit.value) {
      await http.put('/device/edit', body)
    } else {
      await http.post('/device/add', body)
    }
    message.success(isEdit.value ? '修改成功' : '新增设备成功')
    showModal.value = false
    resetForm()
    loadList()
  } catch {
    // http 拦截器已处理错误提示
  } finally {
    submitLoading.value = false
  }
}

function resetForm() {
  formData.sn = ''
  formData.deviceType = undefined
  formData.dealer = ''
  formData.batchNo = ''
  formData.shipDate = null
}

// ==================== 批量导入 ====================
async function handleImport(file: File) {
  const formDataUpload = new FormData()
  formDataUpload.append('file', file)
  importResult.value = null
  try {
    const res: any = await http.post('/device/importExcel', formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const data = res.result || res
    importResult.value = {
      success: data.success ?? data.successCount ?? 0,
      fail: data.fail ?? data.failCount ?? 0,
    }
    message.success(`导入完成：成功 ${importResult.value.success} 条`)
    loadList()
  } catch {
    message.error('导入失败')
  }
  return false // 阻止 ant-upload 自动上传
}

// ==================== 初始化 ====================
onMounted(() => {
  loadList()
})
</script>

<style scoped>
.management-view {
  padding: 20px 24px;
  min-height: 100vh;
  background: #0a1628;
  color: #e2e8f0;
}

:deep(.management-tabs .ant-tabs-nav) {
  margin-bottom: 20px;
}
:deep(.management-tabs .ant-tabs-tab) {
  color: #64748b !important;
}
:deep(.management-tabs .ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #00d4ff !important;
}
:deep(.management-tabs .ant-tabs-ink-bar) {
  background: #00d4ff !important;
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #475569;
  gap: 12px;
}
.empty-icon { font-size: 48px; opacity: 0.5; }
.empty-text { font-size: 15px; }

/* ---- 筛选栏 ---- */
/* ---- 一体工具栏 ---- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-input {
  width: 280px;
}

:deep(.search-input .ant-input) {
  background: rgba(15, 25, 50, 0.85);
  border-color: rgba(0, 212, 255, 0.2);
  color: #e2e8f0;
}
:deep(.search-input .ant-input::placeholder) {
  color: #64748b;
}
:deep(.search-input .ant-input-search-button) {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.3);
  color: #00d4ff;
}

.import-btn {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #e2e8f0 !important;
}
.import-btn:hover {
  border-color: #00d4ff !important;
  color: #00d4ff !important;
}

.add-btn {
  background: rgba(0, 212, 255, 0.15) !important;
  border-color: #00d4ff !important;
  color: #00d4ff !important;
}
.add-btn:hover {
  background: rgba(0, 212, 255, 0.3) !important;
}

.import-result {
  font-size: 13px;
  margin-left: 4px;
}
.import-success {
  color: #00ff88;
}
.import-fail {
  color: #ff4757;
}

/* ---- 表格 ---- */
.table-wrapper {
  background: rgba(15, 25, 50, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ant-table) {
  background: transparent;
  color: #e2e8f0;
}
:deep(.ant-table-thead > tr > th) {
  background: rgba(0, 212, 255, 0.06) !important;
  color: #94a3b8 !important;
  border-bottom: 1px solid rgba(0, 212, 255, 0.12) !important;
  font-weight: 500;
}
:deep(.ant-table-tbody > tr > td) {
  background: transparent !important;
  border-bottom: 1px solid rgba(0, 212, 255, 0.06) !important;
  color: #e2e8f0;
}
:deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(0, 212, 255, 0.05) !important;
}
:deep(.ant-table-cell-fix-left, .ant-table-cell-fix-right) {
  background: rgba(15, 25, 50, 0.95) !important;
}
:deep(.ant-table-tbody > tr:hover .ant-table-cell-fix-left),
:deep(.ant-table-tbody > tr:hover .ant-table-cell-fix-right) {
  background: rgba(15, 25, 50, 0.98) !important;
}
:deep(.ant-pagination) {
  padding: 12px 16px;
}
:deep(.ant-pagination .ant-pagination-item) {
  background: transparent;
  border-color: rgba(0, 212, 255, 0.15);
}
:deep(.ant-pagination .ant-pagination-item a) {
  color: #94a3b8;
}
:deep(.ant-pagination .ant-pagination-item-active) {
  border-color: #00d4ff;
}
:deep(.ant-pagination .ant-pagination-item-active a) {
  color: #00d4ff;
}
:deep(.ant-pagination .ant-pagination-prev .ant-pagination-item-link),
:deep(.ant-pagination .ant-pagination-next .ant-pagination-item-link) {
  color: #94a3b8;
  background: transparent;
  border-color: rgba(0, 212, 255, 0.15);
}
:deep(.ant-pagination .ant-pagination-total-text) {
  color: #64748b;
}
:deep(.ant-select-selector) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #e2e8f0 !important;
}
:deep(.ant-table-empty .ant-empty-description) {
  color: #64748b;
}

.sn-link {
  color: #00d4ff;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}
.sn-link:hover {
  text-decoration: underline;
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
}

/* 在线状态 badge */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.status-online {
  background: rgba(0, 255, 136, 0.12);
  color: #00ff88;
}
.status-offline {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
.status-fault {
  background: rgba(255, 159, 67, 0.12);
  color: #ff9f43;
}
.status-unactivated {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

.edit-btn {
  color: #00d4ff !important;
}

/* ---- Modal 深色主题 ---- */
:deep(.dark-modal .ant-modal-content) {
  background: #0f1932;
  border: 1px solid rgba(0, 212, 255, 0.15);
}
:deep(.dark-modal .ant-modal-header) {
  background: transparent;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}
:deep(.dark-modal .ant-modal-title) {
  color: #e2e8f0;
}
:deep(.dark-modal .ant-modal-close-x) {
  color: #94a3b8;
}
:deep(.dark-modal .ant-form-item-label > label) {
  color: #94a3b8;
}
:deep(.dark-modal .ant-input) {
  background: rgba(15, 25, 50, 0.85);
  border-color: rgba(0, 212, 255, 0.2);
  color: #e2e8f0;
}
:deep(.dark-modal .ant-input::placeholder) {
  color: #475569;
}
:deep(.dark-modal .ant-select-selector) {
  background: rgba(15, 25, 50, 0.85) !important;
  border-color: rgba(0, 212, 255, 0.2) !important;
  color: #e2e8f0 !important;
}
:deep(.dark-modal .ant-select-arrow) {
  color: #64748b;
}
:deep(.dark-modal .ant-picker) {
  background: rgba(15, 25, 50, 0.85);
  border-color: rgba(0, 212, 255, 0.2);
}
:deep(.dark-modal .ant-picker-input > input) {
  color: #e2e8f0;
}
:deep(.dark-modal .ant-picker-suffix) {
  color: #64748b;
}
:deep(.dark-modal .ant-modal-footer) {
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}
:deep(.dark-modal .ant-btn-default) {
  background: transparent;
  border-color: rgba(0, 212, 255, 0.2);
  color: #94a3b8;
}
:deep(.dark-modal .ant-btn-primary) {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  color: #00d4ff;
}
</style>
