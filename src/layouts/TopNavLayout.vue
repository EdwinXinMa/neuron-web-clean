<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import http from '@/api/http'

const route = useRoute()
const router = useRouter()

const selectedKeys = computed(() => [route.path])
const alertCount = 3

// 从 localStorage 读取用户信息
const userInfo = ref<any>({})
onMounted(() => {
  try {
    const raw = localStorage.getItem('userInfo') || '{}'
    console.log('localStorage userInfo:', raw)
    userInfo.value = JSON.parse(raw)
    console.log('parsed role:', userInfo.value.role)
  } catch {
    userInfo.value = {}
  }
})

const username = computed(() => userInfo.value.realname || userInfo.value.username || '用户')

const navItems = [
  { path: '/overview', label: '总览' },
  { path: '/devices', label: '设备' },
  { path: '/alerts', label: '告警', badge: alertCount },
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
        <img src="/logo.png" alt="logo" style="height: 72px; object-fit: contain;" />
      </div>
      <nav class="nav-items">
        <div
          v-for="item in navItems"
          :key="item.path"
          :class="['nav-item', { active: route.path === item.path }]"
          @click="router.push(item.path)"
        >
          {{ item.label }}
          <a-badge v-if="item.badge" :count="item.badge" :offset="[6, -8]" />
          <span v-if="route.path === item.path" class="nav-bubble"></span>
        </div>
      </nav>
      <a-dropdown>
        <div class="nav-user">
          <a-avatar v-if="avatar" :src="avatar" :size="30" />
          <a-avatar v-else :size="30" class="nav-avatar">{{ username.charAt(0) }}</a-avatar>
          <span class="nav-username">{{ username }}</span>
          <span style="color: #64748b; font-size: 12px;">▾</span>
        </div>
        <template #overlay>
          <a-menu style="background: #0f1932; border: 1px solid rgba(0,212,255,0.15);">
            <div v-if="roleLabel" style="padding: 5px 12px; font-size: 12px; color: #64748b;">{{ roleLabel }}</div>
            <a-menu-divider v-if="roleLabel" style="border-color: rgba(0,212,255,0.1);" />
            <a-menu-item v-if="isAdmin" @click="$router.push('/accounts')" style="color: #e2e8f0;">账号管理</a-menu-item>
            <a-menu-item @click="openPwdModal" style="color: #e2e8f0;">修改密码</a-menu-item>
            <a-menu-divider style="border-color: rgba(0,212,255,0.1);" />
            <a-menu-item @click="handleLogout" style="color: #ff4757;">退出登录</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </header>
    <a-layout-content style="background: #0a1628;">
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
  height: 96px;
  display: grid;
  grid-template-columns: 220px 1fr 240px;
  align-items: center;
  padding: 0 48px;
  background: linear-gradient(180deg, rgba(4,10,22,0.99), rgba(8,18,36,0.97));
  border-bottom: 1px solid rgba(0, 212, 255, 0.18);
  backdrop-filter: blur(24px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(0,212,255,0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-logo {
  font-size: 24px;
  font-weight: 800;
  color: #00d4ff;
  letter-spacing: 1px;
  text-shadow: 0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.2);
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
  font-size: 17px;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.25s;
  user-select: none;
  letter-spacing: 2px;
  white-space: nowrap;
}

.nav-item:hover {
  color: #e2e8f0;
  background: rgba(0, 212, 255, 0.08);
  transform: translateY(-1px);
}

.nav-item.active {
  color: #00d4ff;
  font-weight: 700;
  background: rgba(0, 212, 255, 0.12);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}

/* 气泡效果 */
.nav-bubble {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: #00d4ff;
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.8), 0 0 20px rgba(0, 212, 255, 0.4);
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
  background: rgba(0, 212, 255, 0.3);
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
  color: #94a3b8;
  transition: color 0.2s;
}

.nav-user:hover {
  color: #e2e8f0;
}

.nav-avatar {
  background: linear-gradient(135deg, #0e7490, #00d4ff);
  font-size: 13px;
  font-weight: 600;
}

.nav-username {
  font-size: 15px;
  font-weight: 500;
  color: #e2e8f0;
}

.nav-avatar {
  background: linear-gradient(135deg, #0e7490, #00d4ff);
  font-size: 14px;
  font-weight: 700;
}
</style>
