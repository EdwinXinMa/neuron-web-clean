<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { login } from '../../api/sys/user'
import AnimatedCharacters from '../../components/AnimatedCharacters.vue'

const router = useRouter()
const loading = ref(false)
const isTyping = ref(false)
const showPassword = ref(false)
const loginFailed = ref(false)
const form = reactive({
  username: '',
  password: '',
})

let typingTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  isTyping.value = true
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => { isTyping.value = false }, 300)
}

async function handleLogin() {
  if (!form.username || !form.password) {
    message.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res: any = await login(form)
    const result = res.result || res
    const token = result.token || ''
    const userInfo = result.userInfo || {}
    localStorage.setItem('token', token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
    message.success('登录成功，欢迎 ' + (userInfo.realname || form.username))
    router.push('/overview')
  } catch {
    loginFailed.value = true
    setTimeout(() => { loginFailed.value = false }, 2500)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <!-- 左侧：动画角色 -->
    <div class="login-left">
      <span class="left-brand">NeuronCloud</span>
      <AnimatedCharacters
        :isTyping="isTyping"
        :showPassword="showPassword"
        :passwordLength="form.password.length"
        :loginFailed="loginFailed"
      />
    </div>

    <!-- 右侧：登录表单 -->
    <div class="login-right">
      <div class="login-form-wrapper">
        <img src="/logo.png" alt="AlwaysControl" class="login-logo" />

        <a-form layout="vertical" class="login-form">
          <a-form-item>
            <a-input
              v-model:value="form.username"
              placeholder="用户名"
              size="large"
              @input="onInput"
              @pressEnter="handleLogin"
            >
              <template #prefix><UserOutlined style="color: #94a3b8" /></template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <a-input-password
              v-model:value="form.password"
              placeholder="密码"
              size="large"
              :visibilityToggle="true"
              @input="onInput"
              @update:visible="(v: boolean) => showPassword = v"
              @pressEnter="handleLogin"
            >
              <template #prefix><LockOutlined style="color: #94a3b8" /></template>
            </a-input-password>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="loading" block size="large" @click="handleLogin">
              登录
            </a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  display: flex;
  min-height: 100vh;
}

.login-left {
  flex: 1;
  background: #6b7b8d;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.left-brand {
  position: absolute;
  top: 32px;
  left: 32px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.login-right {
  flex: 1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form-wrapper {
  width: 460px;
  padding: 60px 50px;
}

.login-logo {
  width: 320px;
  margin-bottom: 40px;
}


.login-form :deep(.ant-form-item-label > label) {
  color: #334155;
}

.login-form :deep(.ant-input),
.login-form :deep(.ant-input-password) {
  background: #fff !important;
  border-color: #e2e8f0 !important;
  color: #1a1a2e !important;
}

.login-form :deep(.ant-input::placeholder) {
  color: #94a3b8 !important;
}

.login-form :deep(.ant-btn-primary) {
  background: #1a1a2e;
  border-color: #1a1a2e;
  height: 44px;
  font-size: 15px;
}

.login-form :deep(.ant-btn-primary:hover) {
  background: #2d2d4e;
  border-color: #2d2d4e;
}
</style>
