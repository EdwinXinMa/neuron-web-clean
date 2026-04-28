<template>
  <div class="firmware-tab">
    <!-- 顶部栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-input-search
          v-model:value="searchVersion"
          placeholder="按版本号搜索..."
          allow-clear
          class="search-input"
          @search="onSearch"
        />
        <a-popover placement="bottomLeft" trigger="hover">
          <template #content>
            <div class="info-popover">
              <div class="info-section">
                <div class="info-title">上传注意事项</div>
                <ul class="info-list">
                  <li>版本号必须大于当前最新版本，不能倒退</li>
                  <li>同一版本号不能重复上传</li>
                  <li>版本说明为必填项</li>
                  <li>支持 .bin / .zip / .tar.gz 格式</li>
                  <li>上传后为草稿状态，需手动发布</li>
                </ul>
              </div>
              <a-divider style="margin: 8px 0;" />
              <div class="info-section">
                <div class="info-title">当前最新版本</div>
                <template v-if="latestInfo">
                  <div class="info-version">{{ latestInfo.latestVersion || '暂无' }}</div>
                  <div v-if="latestInfo.previousVersion" class="info-prev">上一版本: {{ latestInfo.previousVersion }}</div>
                  <div v-if="latestInfo.versionLog" class="info-log-title">更新日志:</div>
                  <pre v-if="latestInfo.versionLog" class="info-log">{{ latestInfo.versionLog }}</pre>
                </template>
                <div v-else class="info-empty">暂无已发布版本</div>
              </div>
            </div>
          </template>
          <span class="info-icon">
            <InfoCircleOutlined />
          </span>
        </a-popover>
      </div>
      <a-button type="primary" class="upload-btn" @click="showUploadModal = true">+ 上传固件</a-button>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1000 }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'fileSize'">
            {{ formatSize(record.fileSize) }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <span :class="['status-badge', `status-${record.status.toLowerCase()}`]">
              {{ statusLabel[record.status] || record.status }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? record.createTime.slice(0, 19).replace('T', ' ') : '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <!-- DRAFT -->
            <template v-if="record.status === 'DRAFT'">
              <a-popconfirm title="确认发布该固件？" @confirm="handleRelease(record.id)">
                <a-button type="link" size="small" class="action-link">发布</a-button>
              </a-popconfirm>
              <a-popconfirm title="确认删除该固件？" @confirm="handleDelete(record.id)">
                <a-button type="link" size="small" class="action-link danger">删除</a-button>
              </a-popconfirm>
            </template>
            <!-- RELEASED -->
            <template v-else-if="record.status === 'RELEASED'">
              <a-popconfirm title="确认废弃该固件？" @confirm="handleDeprecate(record.id)">
                <a-button type="link" size="small" class="action-link warning">废弃</a-button>
              </a-popconfirm>
              <a-button type="link" size="small" class="action-link" @click="handleDownload(record.id)">下载</a-button>
            </template>
            <!-- DEPRECATED -->
            <template v-else-if="record.status === 'DEPRECATED'">
              <a-popconfirm title="确认删除该废弃固件？" @confirm="handleDelete(record.id)">
                <a-button type="link" size="small" class="action-link danger">删除</a-button>
              </a-popconfirm>
              <a-button type="link" size="small" class="action-link" @click="handleDownload(record.id)">下载</a-button>
            </template>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 上传 Modal -->
    <a-modal
      v-model:open="showUploadModal"
      title="上传固件"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleUpload"
      @cancel="resetUploadForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="版本号" required>
          <a-input v-model:value="uploadForm.version" placeholder="如 v1.0.3" />
        </a-form-item>
        <a-form-item label="版本说明" required>
          <a-textarea v-model:value="uploadForm.releaseNotes" placeholder="请填写版本说明" :rows="3" />
        </a-form-item>
        <a-form-item label="固件文件" required>
          <a-upload
            :file-list="uploadForm.fileList"
            :before-upload="beforeUpload"
            :max-count="1"
            accept=".bin,.zip,.tar.gz"
            @remove="uploadForm.fileList = []"
          >
            <a-button class="choose-file-btn">选择文件</a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import type { UploadFile } from 'ant-design-vue'
import http from '@/api/http'

// ==================== 状态 ====================
const searchVersion = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)

const latestInfo = ref<any>(null)
const showUploadModal = ref(false)
const submitLoading = ref(false)
const uploadForm = reactive({
  version: '',
  releaseNotes: '',
  fileList: [] as UploadFile[],
})

const statusLabel: Record<string, string> = {
  DRAFT: '草稿',
  RELEASED: '已发布',
  DEPRECATED: '已废弃',
}

// ==================== 表格列 ====================
const columns = [
  { title: '版本号', dataIndex: 'version', width: 120 },
  { title: '设备类型', dataIndex: 'deviceType', width: 110 },
  { title: '文件名', dataIndex: 'fileName', width: 180, ellipsis: true },
  { title: '文件大小', dataIndex: 'fileSize', width: 100 },
  { title: '版本说明', dataIndex: 'releaseNotes', width: 200, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' as const },
]

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (t: number) => `共 ${t} 条`,
  showSizeChanger: false,
}))

// ==================== 工具 ====================
function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// ==================== 数据加载 ====================
async function loadLatest() {
  try {
    const res: any = await http.get('/firmware/latest')
    latestInfo.value = res.result || null
  } catch {
    // ignore
  }
}

async function loadList() {
  loading.value = true
  try {
    const res: any = await http.get('/firmware/list', {
      params: {
        version: searchVersion.value || undefined,
        pageNo: currentPage.value,
        pageSize: pageSize.value,
      },
    })
    const data = res.result || res
    list.value = data.records || []
    total.value = data.total || 0
  } catch {
    // http 拦截器已处理
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

// ==================== 操作 ====================
async function handleRelease(id: string) {
  try {
    await http.put('/firmware/release', null, { params: { id } })
    message.success('发布成功')
    loadList()
    loadLatest()
  } catch {
    // http 拦截器已处理
  }
}

async function handleDeprecate(id: string) {
  try {
    await http.put('/firmware/deprecate', null, { params: { id } })
    message.success('已废弃')
    loadList()
    loadLatest()
  } catch {
    // http 拦截器已处理
  }
}

async function handleDelete(id: string) {
  try {
    await http.delete('/firmware/delete', { params: { id } })
    message.success('删除成功')
    loadList()
    loadLatest()
  } catch {
    // http 拦截器已处理
  }
}

async function handleDownload(id: string) {
  try {
    const res: any = await http.get('/firmware/download', { params: { id } })
    const data = res.result || res
    if (data?.url) {
      window.open(data.url)
    } else {
      message.error('获取下载链接失败')
    }
  } catch {
    // http 拦截器已处理
  }
}

// ==================== 上传 ====================
function beforeUpload(file: UploadFile) {
  uploadForm.fileList = [file]
  return false
}

async function handleUpload() {
  if (!uploadForm.version.trim()) {
    message.warning('请填写版本号')
    return
  }
  if (!uploadForm.releaseNotes.trim()) {
    message.warning('请填写版本说明')
    return
  }
  if (uploadForm.fileList.length === 0) {
    message.warning('请选择固件文件')
    return
  }
  submitLoading.value = true
  try {
    const fd = new FormData()
    fd.append('file', uploadForm.fileList[0] as any)
    fd.append('version', uploadForm.version.trim())
    fd.append('deviceType', 'N3_LITE')
    if (uploadForm.releaseNotes.trim()) {
      fd.append('releaseNotes', uploadForm.releaseNotes.trim())
    }
    await http.post('/firmware/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    message.success('上传成功')
    showUploadModal.value = false
    resetUploadForm()
    loadList()
    loadLatest()
  } catch {
    // http 拦截器已处理
  } finally {
    submitLoading.value = false
  }
}

function resetUploadForm() {
  uploadForm.version = ''
  uploadForm.releaseNotes = ''
  uploadForm.fileList = []
}

// ==================== 初始化 ====================
onMounted(() => {
  loadList()
  loadLatest()
})
</script>

<style scoped>
/* ---- 信息图标 & 弹出层 ---- */
.info-icon {
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.info-icon:hover {
  color: #3b82f6;
}

.firmware-tab {
  color: #1a1a2e;
}

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 280px;
}

:deep(.search-input .ant-input) {
  background: #fff;
  border-color: #e2e8f0;
  color: #1a1a2e;
}
:deep(.search-input .ant-input::placeholder) {
  color: #94a3b8;
}
:deep(.search-input .ant-input-search-button) {
  background: #fff;
  border-color: #e2e8f0;
  color: #3b82f6;
}

.upload-btn {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
  flex-shrink: 0;
}
.upload-btn:hover {
  background: #00bfe6 !important;
}

/* ---- 表格 ---- */
.table-wrapper {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ant-table) {
  background: #fff;
  color: #1a1a2e;
}
:deep(.ant-table-thead > tr > th) {
  background: #fafbfc !important;
  color: #64748b !important;
  border-bottom: 1px solid #e2e8f0 !important;
  font-weight: 500;
}
:deep(.ant-table-tbody > tr > td) {
  background: #fff !important;
  border-bottom: 1px solid #f0f0f0 !important;
  color: #1a1a2e;
}
:deep(.ant-table-tbody > tr:hover > td) {
  background: #f5f7fa !important;
}
:deep(.ant-table-cell-fix-right) {
  background: #fff !important;
}
:deep(.ant-table-tbody > tr:hover .ant-table-cell-fix-right) {
  background: #f5f7fa !important;
}
:deep(.ant-pagination) {
  padding: 12px 16px;
}
:deep(.ant-pagination .ant-pagination-item) {
  background: #fff;
  border-color: #e2e8f0;
}
:deep(.ant-pagination .ant-pagination-item a) {
  color: #64748b;
}
:deep(.ant-pagination .ant-pagination-item-active) {
  border-color: #3b82f6;
}
:deep(.ant-pagination .ant-pagination-item-active a) {
  color: #3b82f6;
}
:deep(.ant-pagination .ant-pagination-prev .ant-pagination-item-link),
:deep(.ant-pagination .ant-pagination-next .ant-pagination-item-link) {
  color: #64748b;
  background: #fff;
  border-color: #e2e8f0;
}
:deep(.ant-pagination .ant-pagination-total-text) {
  color: #94a3b8;
}
:deep(.ant-table-empty .ant-empty-description) {
  color: #94a3b8;
}

/* ---- 状态 ---- */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.status-draft {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
.status-released {
  background: rgba(0, 255, 136, 0.12);
  color: #2d9d78;
}
.status-deprecated {
  background: rgba(255, 71, 87, 0.12);
  color: #ff4757;
}

/* ---- 操作按钮 ---- */
.action-link {
  color: #3b82f6 !important;
  padding: 0 4px;
}
.action-link.danger {
  color: #ff4757 !important;
}
.action-link.warning {
  color: #ff9f43 !important;
}

/* ---- Modal 主题 ---- */
:deep(.dark-modal .ant-modal-content) {
  background: #fff;
  border: 1px solid #e2e8f0;
}
:deep(.dark-modal .ant-modal-header) {
  background: transparent;
  border-bottom: 1px solid #e2e8f0;
}
:deep(.dark-modal .ant-modal-title) {
  color: #1a1a2e;
}
:deep(.dark-modal .ant-modal-close-x) {
  color: #94a3b8;
}
:deep(.dark-modal .ant-form-item-label > label) {
  color: #64748b;
}
:deep(.dark-modal .ant-input),
:deep(.dark-modal textarea.ant-input) {
  background: #fff;
  border-color: #e2e8f0;
  color: #1a1a2e;
}
:deep(.dark-modal .ant-input::placeholder) {
  color: #94a3b8;
}
:deep(.dark-modal .ant-modal-footer) {
  border-top: 1px solid #e2e8f0;
}
:deep(.dark-modal .ant-btn-default) {
  background: #fff;
  border-color: #e2e8f0;
  color: #64748b;
}
:deep(.dark-modal .ant-btn-primary) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.choose-file-btn {
  background: #fff !important;
  border-color: #e2e8f0 !important;
  color: #1a1a2e !important;
}
.choose-file-btn:hover {
  border-color: #3b82f6 !important;
  color: #3b82f6 !important;
}

:deep(.ant-upload-list-item) {
  color: #1a1a2e !important;
}
:deep(.ant-upload-list-item-name) {
  color: #1a1a2e !important;
}
</style>

<style>
.info-popover {
  max-width: 320px;
  color: #1a1a2e;
}
.info-section .info-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: #334155;
}
.info-section .info-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.8;
}
.info-section .info-version {
  font-size: 16px;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 4px;
}
.info-section .info-prev {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}
.info-section .info-log-title {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}
.info-section .info-log {
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
}
.info-section .info-empty {
  font-size: 12px;
  color: #94a3b8;
}
</style>
