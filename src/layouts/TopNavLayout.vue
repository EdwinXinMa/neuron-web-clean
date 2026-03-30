<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import http from '@/api/http'
import { useDeviceEvents } from '@/composables/useDeviceEvents'

const route = useRoute()
const router = useRouter()

const selectedKeys = computed(() => [route.path])
const alertCount = ref(0)

// 从 localStorage 读取用户信息
const userInfo = ref<any>({})
onMounted(() => {
  try {
    const raw = localStorage.getItem('userInfo') || '{}'
    userInfo.value = JSON.parse(raw)
  } catch {
    userInfo.value = {}
  }
  loadAlertBadge()
  // 每 60 秒刷新角标
  setInterval(loadAlertBadge, 60000)
})

// 收到告警事件时立即刷新角标
useDeviceEvents((event) => {
  if (event.type === 'ALERT') {
    loadAlertBadge()
  }
})

async function loadAlertBadge() {
  try {
    const res: any = await http.get('/alert/badge')
    alertCount.value = res.result ?? res ?? 0
  } catch { /* ignore */ }
}

const username = computed(() => userInfo.value.realname || userInfo.value.username || '用户')

const navItems = [
  { path: '/overview', label: '总览' },
  { path: '/devices', label: '设备' },
  { path: '/alerts', label: '告警', badgeKey: 'alert' },
  { path: '/oplog', label: '操作日志' },
  { path: '/management', label: '设备管理' },
]
const avatar = computed(() => userInfo.value.avatar || '')
const isAdmin = computed(() => userInfo.value.role === 'admin' || userInfo.value.role === 1)
const roleLabel = computed(() => {
  const role = userInfo.value.role
  if (!role && role !== 0) return ''
  if (role === 'admin' || role === 1) return '管理员'
  if (role === 'operator' || role === 2) return '运维'
  return ''
})

function onMenuClick({ key }: { key: string }) {
  router.push(key)
}

// 头像上传
const avatarInputRef = ref<HTMLInputElement>()

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

async function onAvatarSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    // 上传到 MinIO（neuron-avatar bucket）
    const formData = new FormData()
    formData.append('file', file)
    formData.append('biz', 'avatar')
    formData.append('bucket', 'neuron-avatar')
    const uploadRes: any = await http.post('/sys/upload/uploadMinio', formData)
    const avatarUrl = uploadRes.result || uploadRes.message || ''
    if (!avatarUrl) { message.error('上传失败'); return }
    // 更新头像
    await http.put('/sys/user/updateAvatar', { avatar: avatarUrl })
    userInfo.value.avatar = avatarUrl
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    message.success('头像已更新')
  } catch {
    message.error('头像上传失败')
  }
  // 清空 input 以便重复选择同一文件
  if (avatarInputRef.value) avatarInputRef.value.value = ''
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/login')
}

// 修改密码
const showPwdModal = ref(false)
const pwdLoading = ref(false)
const pwdForm = reactive({ oldpassword: '', password: '', confirmpassword: '' })

function openPwdModal() {
  pwdForm.oldpassword = ''
  pwdForm.password = ''
  pwdForm.confirmpassword = ''
  showPwdModal.value = true
}

async function handleChangePwd() {
  if (!pwdForm.oldpassword || !pwdForm.password || !pwdForm.confirmpassword) {
    message.warning('请填写所有密码字段')
    return
  }
  if (pwdForm.password !== pwdForm.confirmpassword) {
    message.warning('两次密码不一致')
    return
  }
  pwdLoading.value = true
  try {
    await http.put('/sys/user/changePassword', { ...pwdForm })
    message.success('密码修改成功，请重新登录')
    showPwdModal.value = false
    setTimeout(() => handleLogout(), 1200)
  } catch {
  } finally {
    pwdLoading.value = false
  }
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <header class="top-nav">
      <div class="nav-logo" @click="router.push('/overview')" style="cursor: pointer;">
        <img src="/logo.png" alt="logo" style="height: 56px; object-fit: contain;" />
      </div>
      <nav class="nav-items">
        <div
          v-for="item in navItems"
          :key="item.path"
          :class="['nav-item', { active: route.path === item.path }]"
          @click="router.push(item.path)"
        >
          {{ item.label }}
          <a-badge v-if="item.badgeKey === 'alert' && alertCount > 0" :count="alertCount" :offset="[6, -8]" />
          <span v-if="route.path === item.path" class="nav-bubble"></span>
        </div>
      </nav>
      <a-dropdown>
        <div class="nav-user">
          <a-tooltip title="点击更换头像">
            <a-avatar v-if="avatar" :src="avatar" :size="30" class="nav-avatar-clickable" @click.stop="triggerAvatarUpload" />
            <a-avatar v-else :size="30" class="nav-avatar nav-avatar-clickable" @click.stop="triggerAvatarUpload">{{ username.charAt(0) }}</a-avatar>
          </a-tooltip>
          <span class="nav-username">{{ username }}</span>
          <span style="color: #64748b; font-size: 12px;">▾</span>
        </div>
        <template #overlay>
          <a-menu style="background: #fff; border: 1px solid #e2e8f0;">
            <div v-if="roleLabel" style="padding: 5px 12px; font-size: 12px; color: #94a3b8;">{{ roleLabel }}</div>
            <a-menu-divider v-if="roleLabel" style="border-color: #e2e8f0;" />
            <a-menu-item v-if="isAdmin" @click="$router.push('/accounts')" style="color: #1a1a2e;">账号管理</a-menu-item>
            <a-menu-item @click="openPwdModal" style="color: #1a1a2e;">修改密码</a-menu-item>
            <a-menu-divider style="border-color: #e2e8f0;" />
            <a-menu-item @click="handleLogout" style="color: #ff4757;">退出登录</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <input ref="avatarInputRef" type="file" accept="image/*" style="display:none" @change="onAvatarSelected" />
    </header>
    <a-layout-content style="background: #f5f7fa; flex: 1; overflow: auto;">
      <slot />
    </a-layout-content>
  </a-layout>

  <!-- 修改密码 Modal -->
  <a-modal
    v-model:open="showPwdModal"
    title="修改密码"
    ok-text="确认修改"
    cancel-text="取消"
    :confirm-loading="pwdLoading"
    @ok="handleChangePwd"
  >
    <div style="padding: 8px 0;">
      <a-form layout="vertical">
        <a-form-item label="当前密码">
          <a-input-password v-model:value="pwdForm.oldpassword" placeholder="请输入当前密码" />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model:value="pwdForm.password" placeholder="请输入新密码" />
        </a-form-item>
        <a-form-item label="确认新密码">
          <a-input-password v-model:value="pwdForm.confirmpassword" placeholder="请再次输入新密码" />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.top-nav {
  height: 64px;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  align-items: center;
  padding: 0 16px 0 48px;
  background: linear-gradient(180deg, #ffffff, #f0f2f5);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-logo {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.nav-items {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.nav-item {
  position: relative;
  padding: 14px 52px;
  font-size: 15px;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.25s;
  user-select: none;
  letter-spacing: 1px;
  white-space: nowrap;
}

.nav-item:hover {
  color: #1a1a2e;
  background: rgba(59, 130, 246, 0.06);
  transform: translateY(-1px);
}

.nav-item.active {
  color: #3b82f6;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(59, 130, 246, 0.06) 50%, rgba(59, 130, 246, 0.12) 100%);
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.18),
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 3px 5px rgba(255, 255, 255, 1),
    inset 0 -3px 6px rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-top-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-1px);
}

/* 下划线 */
.nav-bubble {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: #3b82f6;
  border-radius: 2px;
  animation: bubbleIn 0.25s ease;
}

.nav-bubble::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  filter: blur(4px);
}

@keyframes bubbleIn {
  from { width: 0; opacity: 0; }
  to { width: 60%; opacity: 1; }
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  justify-content: flex-end;
  color: #64748b;
  transition: color 0.2s;
}

.nav-avatar-clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.nav-avatar-clickable:hover {
  opacity: 0.7;
}

.nav-user:hover {
  color: #1a1a2e;
}

.nav-avatar {
  background: linear-gradient(135deg, #0e7490, #3b82f6);
  font-size: 13px;
  font-weight: 600;
}

.nav-username {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

.nav-avatar {
  background: linear-gradient(135deg, #0e7490, #3b82f6);
  font-size: 14px;
  font-weight: 700;
}
</style>
