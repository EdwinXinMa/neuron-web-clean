<template>
  <div class="accounts-view">
    <!-- 顶部栏 -->
    <div class="toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="按登录名搜索..."
        allow-clear
        class="search-input"
        @search="onSearch"
      />
      <a-button type="primary" class="add-btn" @click="openAddModal">+ 新增账号</a-button>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <a-table
        :columns="columns"
        :data-source="userList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <span :class="['status-badge', record.status === 2 ? 'status-disabled' : 'status-normal']">
              {{ record.status === 2 ? '已禁用' : '正常' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="action-link" @click="openEditModal(record)">维护</a-button>
            <a-divider type="vertical" style="border-color: rgba(0,212,255,0.15)" />
            <a-popconfirm
              title="确认重置密码为 123456？"
              ok-text="确认"
              cancel-text="取消"
              @confirm="handleResetPwd(record)"
            >
              <a-button type="link" size="small" class="action-link">重置密码</a-button>
            </a-popconfirm>
            <a-divider type="vertical" style="border-color: rgba(0,212,255,0.15)" />
            <a-popconfirm
              v-if="record.username !== 'admin'"
              :title="record.status === 2 ? '确认启用该账号？' : '确认禁用该账号？'"
              ok-text="确认"
              cancel-text="取消"
              @confirm="handleToggleStatus(record)"
            >
              <a-button type="link" size="small" :class="['action-link', record.status === 2 ? 'enable-link' : 'disable-link']">
                {{ record.status === 2 ? '启用' : '禁用' }}
              </a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增 Modal -->
    <a-modal
      v-model:open="showAddModal"
      title="新增账号"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleAdd"
      @cancel="resetAddForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="登录名" required>
          <a-input v-model:value="addForm.username" placeholder="请输入登录名" />
        </a-form-item>
        <a-form-item label="真实姓名" required>
          <a-input v-model:value="addForm.realname" placeholder="请输入真实姓名" />
        </a-form-item>
        <a-form-item label="密码" required>
          <a-input-password v-model:value="addForm.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model:value="addForm.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="addForm.email" placeholder="请输入邮箱" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 修改 Modal -->
    <a-modal
      v-model:open="showEditModal"
      title="修改账号"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleEdit"
      @cancel="resetEditForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="真实姓名">
          <a-input v-model:value="editForm.realname" placeholder="请输入真实姓名" />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model:value="editForm.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="editForm.email" placeholder="请输入邮箱" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import http from '@/api/http'

// ==================== 状态 ====================
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const userList = ref<any[]>([])
const total = ref(0)
const submitLoading = ref(false)

// 新增
const showAddModal = ref(false)
const addForm = reactive({
  username: '',
  realname: '',
  password: '',
  phone: '',
  email: '',
})

// 修改
const showEditModal = ref(false)
const editForm = reactive({
  id: '',
  realname: '',
  phone: '',
  email: '',
})

// ==================== 表格列 ====================
const columns = [
  { title: '登录名', dataIndex: 'username', width: 140 },
  { title: '真实姓名', dataIndex: 'realname', width: 130 },
  { title: '手机号', dataIndex: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', width: 240 },
]

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (t: number) => `共 ${t} 条`,
  showSizeChanger: false,
}))

// ==================== 数据加载 ====================
async function loadList() {
  loading.value = true
  try {
    const res: any = await http.get('/sys/user/list', {
      params: {
        pageNo: currentPage.value,
        pageSize: pageSize.value,
        username: searchText.value || undefined,
      },
    })
    const data = res.result || res
    userList.value = data.records || []
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

// ==================== 新增 ====================
function openAddModal() {
  resetAddForm()
  showAddModal.value = true
}

function resetAddForm() {
  addForm.username = ''
  addForm.realname = ''
  addForm.password = ''
  addForm.phone = ''
  addForm.email = ''
}

async function handleAdd() {
  if (!addForm.username) { message.warning('请填写登录名'); return }
  if (!addForm.realname) { message.warning('请填写真实姓名'); return }
  if (!addForm.password) { message.warning('请填写密码'); return }
  submitLoading.value = true
  try {
    await http.post('/sys/user/add', { ...addForm, role: 'operator' })
    message.success('新增成功')
    showAddModal.value = false
    resetAddForm()
    loadList()
  } catch {
    // http 拦截器已处理
  } finally {
    submitLoading.value = false
  }
}

// ==================== 修改 ====================
function openEditModal(record: any) {
  editForm.id = record.id
  editForm.realname = record.realname || ''
  editForm.phone = record.phone || ''
  editForm.email = record.email || ''
  showEditModal.value = true
}

function resetEditForm() {
  editForm.id = ''
  editForm.realname = ''
  editForm.phone = ''
  editForm.email = ''
}

async function handleEdit() {
  submitLoading.value = true
  try {
    await http.put('/sys/user/edit', { ...editForm })
    message.success('修改成功')
    showEditModal.value = false
    resetEditForm()
    loadList()
  } catch {
    // http 拦截器已处理
  } finally {
    submitLoading.value = false
  }
}

// ==================== 重置密码 ====================
async function handleResetPwd(record: any) {
  try {
    await http.put('/sys/user/resetPassword', null, { params: { id: record.id } })
    message.success('密码已重置为 123456')
  } catch {
    // http 拦截器已处理
  }
}

// ==================== 禁用/启用 ====================
async function handleToggleStatus(record: any) {
  const newStatus = record.status === 2 ? 1 : 2
  try {
    await http.put('/sys/user/freeze', null, { params: { id: record.id, status: newStatus } })
    message.success(newStatus === 2 ? '已禁用' : '已启用')
    loadList()
  } catch {
    // http 拦截器已处理
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  loadList()
})
</script>

<style scoped>
.accounts-view {
  padding: 20px 24px;
  min-height: 100%;
  background: #f5f7fa;
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

.add-btn {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
  flex-shrink: 0;
}
.add-btn:hover {
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

/* 状态 badge */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.status-normal {
  background: rgba(0, 255, 136, 0.12);
  color: #2d9d78;
}
.status-disabled {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

/* 操作链接 */
.action-link {
  color: #3b82f6 !important;
  padding: 0 4px;
}
.disable-link {
  color: #ff4757 !important;
}
.enable-link {
  color: #2d9d78 !important;
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
:deep(.dark-modal .ant-input-password .ant-input) {
  background: #fff;
  border-color: #e2e8f0;
  color: #1a1a2e;
}
:deep(.dark-modal .ant-input::placeholder) {
  color: #94a3b8;
}
:deep(.dark-modal .ant-input-password .ant-input-suffix) {
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
</style>
