<template>
  <div>
    <!-- 工具栏 -->
    <div class="toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="按邮箱搜索..."
        allow-clear
        class="search-input"
        @search="onSearch"
      />
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
            <span :class="['status-badge', record.status === 1 ? 'status-online' : 'status-offline']">
              {{ record.status === 1 ? '正常' : '已禁用' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? record.createTime.slice(0, 16).replace('T', ' ') : '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openBindings(record)">绑定列表</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 绑定设备弹窗 -->
    <a-modal
      v-model:open="showBindModal"
      :title="`${currentUser?.name || ''} 的绑定设备`"
      :footer="null"
      class="dark-modal"
      width="560px"
      :style="{ top: '22%' }"
    >
      <a-table
        :columns="bindColumns"
        :data-source="bindList"
        :loading="bindLoading"
        row-key="deviceSn"
        size="small"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'deviceSn'">
            <span class="sn-link" @click="goDevice(record.deviceSn)">{{ record.deviceSn }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'online'">
            <span :class="['status-badge', record.online ? 'status-online' : 'status-offline']">
              {{ record.online ? '在线' : '离线' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'bindTime'">
            {{ record.bindTime ? record.bindTime.slice(0, 16).replace('T', ' ') : '-' }}
          </template>
        </template>
      </a-table>
      <div v-if="!bindLoading && bindList.length === 0" class="bind-empty">暂无绑定设备</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import http from '@/api/http'

const router = useRouter()

const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const userList = ref<any[]>([])
const total = ref(0)

// 绑定弹窗
const showBindModal = ref(false)
const currentUser = ref<any>(null)
const bindList = ref<any[]>([])
const bindLoading = ref(false)

const columns = [
  { title: '邮箱', dataIndex: 'email', width: 200 },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '状态', dataIndex: 'status', width: 80 },
  { title: '绑定设备', dataIndex: 'bindCount', width: 90, align: 'center' as const, customRender: ({ text }: any) => (text || 0) + ' 台' },
  { title: '注册时间', dataIndex: 'createTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 120 },
]

const bindColumns = [
  { title: '设备序列号', dataIndex: 'deviceSn', width: 180 },
  { title: '型号', dataIndex: 'deviceModel', width: 120 },
  { title: '在线状态', dataIndex: 'online', width: 80 },
  { title: '绑定时间', dataIndex: 'bindTime', width: 150 },
]

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (t: number) => `共 ${t} 个账号`,
  showSizeChanger: false,
}))

async function loadList() {
  loading.value = true
  try {
    const res: any = await http.get('/device/appUsers', {
      params: {
        pageNo: currentPage.value,
        pageSize: pageSize.value,
        email: searchText.value || undefined,
      },
    })
    const data = res.result || res
    userList.value = data.records || []
    total.value = data.total || 0
  } catch {
    message.error('加载 App 账号列表失败')
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

async function openBindings(user: any) {
  currentUser.value = user
  showBindModal.value = true
  bindLoading.value = true
  bindList.value = []
  try {
    const res: any = await http.get(`/device/appUsers/${user.id}/bindings`)
    bindList.value = res.result || res || []
  } catch {
    message.error('加载绑定列表失败')
  } finally {
    bindLoading.value = false
  }
}

function goDevice(sn: string) {
  showBindModal.value = false
  router.push({ path: '/devices', query: { id: sn } })
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
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
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.status-online {
  background: rgba(0, 255, 136, 0.12);
  color: #2d9d78;
}
.status-offline {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
.sn-link {
  color: #3b82f6;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}
.sn-link:hover {
  text-decoration: underline;
}
.bind-empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
  font-size: 13px;
}
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
</style>
