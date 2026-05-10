<template>
  <div class="accounts-view">
    <!-- 顶部栏 -->
    <div class="toolbar">
      <a-input-search
        v-model:value="searchText"
        :placeholder="t('account.searchPlaceholder')"
        allow-clear
        class="search-input"
        @search="onSearch"
      />
      <a-button type="primary" class="add-btn" @click="openAddModal">{{ t('account.addAccount') }}</a-button>
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
              {{ record.status === 2 ? t('common.disabled') : t('common.normal') }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="action-link" @click="openEditModal(record)">{{ t('common.edit') }}</a-button>
            <a-divider type="vertical" style="border-color: rgba(0,212,255,0.15)" />
            <a-popconfirm
              :title="t('account.confirmResetPwd')"
              :ok-text="t('common.confirm')"
              :cancel-text="t('common.cancel')"
              @confirm="handleResetPwd(record)"
            >
              <a-button type="link" size="small" class="action-link">{{ t('account.resetPwd') }}</a-button>
            </a-popconfirm>
            <a-divider type="vertical" style="border-color: rgba(0,212,255,0.15)" />
            <a-popconfirm
              v-if="record.username !== 'admin'"
              :title="record.status === 2 ? t('account.confirmEnable') : t('account.confirmDisable')"
              :ok-text="t('common.confirm')"
              :cancel-text="t('common.cancel')"
              @confirm="handleToggleStatus(record)"
            >
              <a-button type="link" size="small" :class="['action-link', record.status === 2 ? 'enable-link' : 'disable-link']">
                {{ record.status === 2 ? t('common.enable') : t('common.disable') }}
              </a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增 Modal -->
    <a-modal
      v-model:open="showAddModal"
      :title="t('account.addTitle')"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleAdd"
      @cancel="resetAddForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item :label="t('account.username')" required>
          <a-input v-model:value="addForm.username" :placeholder="t('account.usernamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('account.realname')" required>
          <a-input v-model:value="addForm.realname" :placeholder="t('account.realnamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('common.password')" required>
          <a-input-password v-model:value="addForm.password" :placeholder="t('account.passwordPlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('account.phone')">
          <a-input v-model:value="addForm.phone" :placeholder="t('account.phonePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('account.email')">
          <a-input v-model:value="addForm.email" :placeholder="t('account.emailPlaceholder')" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 修改 Modal -->
    <a-modal
      v-model:open="showEditModal"
      :title="t('account.editTitle')"
      :confirm-loading="submitLoading"
      class="dark-modal"
      @ok="handleEdit"
      @cancel="resetEditForm"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item :label="t('account.realname')">
          <a-input v-model:value="editForm.realname" :placeholder="t('account.realnamePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('account.phone')">
          <a-input v-model:value="editForm.phone" :placeholder="t('account.phonePlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('account.email')">
          <a-input v-model:value="editForm.email" :placeholder="t('account.emailPlaceholder')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import http from '@/api/http'

const { t } = useI18n()

const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const userList = ref<any[]>([])
const total = ref(0)
const submitLoading = ref(false)

const showAddModal = ref(false)
const addForm = reactive({ username: '', realname: '', password: '', phone: '', email: '' })

const showEditModal = ref(false)
const editForm = reactive({ id: '', realname: '', phone: '', email: '' })

const columns = computed(() => [
  { title: t('account.username'), dataIndex: 'username', width: 140 },
  { title: t('account.realname'), dataIndex: 'realname', width: 130 },
  { title: t('account.phone'), dataIndex: 'phone', width: 140 },
  { title: t('account.email'), dataIndex: 'email', width: 200 },
  { title: t('account.status'), dataIndex: 'status', width: 100 },
  { title: t('account.action'), dataIndex: 'action', width: 240 },
])

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (n: number) => t('account.totalCount', { n }),
  showSizeChanger: false,
}))

async function loadList() {
  loading.value = true
  try {
    const res: any = await http.get('/sys/user/list', {
      params: { pageNo: currentPage.value, pageSize: pageSize.value, username: searchText.value || undefined },
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

function onSearch() { currentPage.value = 1; loadList() }

function onTableChange(pag: any) {
  currentPage.value = pag.current
  pageSize.value = pag.pageSize
  loadList()
}

function openAddModal() { resetAddForm(); showAddModal.value = true }

function resetAddForm() {
  addForm.username = ''; addForm.realname = ''; addForm.password = ''
  addForm.phone = ''; addForm.email = ''
}

async function handleAdd() {
  if (!addForm.username) { message.warning(t('account.requiredUsername')); return }
  if (!addForm.realname) { message.warning(t('account.requiredRealname')); return }
  if (!addForm.password) { message.warning(t('account.requiredPassword')); return }
  submitLoading.value = true
  try {
    await http.post('/sys/user/add', { ...addForm, role: 'operator' })
    message.success(t('common.addSuccess'))
    showAddModal.value = false; resetAddForm(); loadList()
  } catch {
    // http 拦截器已处理
  } finally {
    submitLoading.value = false
  }
}

function openEditModal(record: any) {
  editForm.id = record.id; editForm.realname = record.realname || ''
  editForm.phone = record.phone || ''; editForm.email = record.email || ''
  showEditModal.value = true
}

function resetEditForm() { editForm.id = ''; editForm.realname = ''; editForm.phone = ''; editForm.email = '' }

async function handleEdit() {
  submitLoading.value = true
  try {
    await http.put('/sys/user/edit', { ...editForm })
    message.success(t('common.editSuccess'))
    showEditModal.value = false; resetEditForm(); loadList()
  } catch {
    // http 拦截器已处理
  } finally {
    submitLoading.value = false
  }
}

async function handleResetPwd(record: any) {
  try {
    await http.put('/sys/user/resetPassword', null, { params: { id: record.id } })
    message.success(t('account.pwdReset'))
  } catch {
    // http 拦截器已处理
  }
}

async function handleToggleStatus(record: any) {
  const newStatus = record.status === 2 ? 1 : 2
  try {
    await http.put('/sys/user/freeze', null, { params: { id: record.id, status: newStatus } })
    message.success(newStatus === 2 ? t('account.disabledMsg') : t('account.enabled'))
    loadList()
  } catch {
    // http 拦截器已处理
  }
}

onMounted(() => { loadList() })
</script>

<style scoped>
.accounts-view {
  padding: 20px 24px;
  min-height: 100%;
  background: #f5f7fa;
  color: #1a1a2e;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.search-input { width: 280px; }

:deep(.search-input .ant-input) { background: #fff; border-color: #e2e8f0; color: #1a1a2e; }
:deep(.search-input .ant-input::placeholder) { color: #94a3b8; }
:deep(.search-input .ant-input-search-button) { background: #fff; border-color: #e2e8f0; color: #3b82f6; }

.add-btn { background: #3b82f6 !important; border-color: #3b82f6 !important; color: #fff !important; flex-shrink: 0; }
.add-btn:hover { background: #00bfe6 !important; }

.table-wrapper { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }

:deep(.ant-table) { background: #fff; color: #1a1a2e; }
:deep(.ant-table-thead > tr > th) { background: #fafbfc !important; color: #64748b !important; border-bottom: 1px solid #e2e8f0 !important; font-weight: 500; }
:deep(.ant-table-tbody > tr > td) { background: #fff !important; border-bottom: 1px solid #f0f0f0 !important; color: #1a1a2e; }
:deep(.ant-table-tbody > tr:hover > td) { background: #f5f7fa !important; }
:deep(.ant-pagination) { padding: 12px 16px; }
:deep(.ant-pagination .ant-pagination-item) { background: #fff; border-color: #e2e8f0; }
:deep(.ant-pagination .ant-pagination-item a) { color: #64748b; }
:deep(.ant-pagination .ant-pagination-item-active) { border-color: #3b82f6; }
:deep(.ant-pagination .ant-pagination-item-active a) { color: #3b82f6; }
:deep(.ant-pagination .ant-pagination-prev .ant-pagination-item-link),
:deep(.ant-pagination .ant-pagination-next .ant-pagination-item-link) { color: #64748b; background: #fff; border-color: #e2e8f0; }
:deep(.ant-pagination .ant-pagination-total-text) { color: #94a3b8; }
:deep(.ant-table-empty .ant-empty-description) { color: #94a3b8; }

.status-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.status-normal { background: rgba(0, 255, 136, 0.12); color: #2d9d78; }
.status-disabled { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }

.action-link { color: #3b82f6 !important; padding: 0 4px; }
.disable-link { color: #ff4757 !important; }
.enable-link { color: #2d9d78 !important; }

:deep(.dark-modal .ant-modal-content) { background: #fff; border: 1px solid #e2e8f0; }
:deep(.dark-modal .ant-modal-header) { background: transparent; border-bottom: 1px solid #e2e8f0; }
:deep(.dark-modal .ant-modal-title) { color: #1a1a2e; }
:deep(.dark-modal .ant-modal-close-x) { color: #94a3b8; }
:deep(.dark-modal .ant-form-item-label > label) { color: #64748b; }
:deep(.dark-modal .ant-input),
:deep(.dark-modal .ant-input-password .ant-input) { background: #fff; border-color: #e2e8f0; color: #1a1a2e; }
:deep(.dark-modal .ant-input::placeholder) { color: #94a3b8; }
:deep(.dark-modal .ant-input-password .ant-input-suffix) { color: #94a3b8; }
:deep(.dark-modal .ant-modal-footer) { border-top: 1px solid #e2e8f0; }
:deep(.dark-modal .ant-btn-default) { background: #fff; border-color: #e2e8f0; color: #64748b; }
:deep(.dark-modal .ant-btn-primary) { background: #3b82f6; border-color: #3b82f6; color: #fff; }
</style>
