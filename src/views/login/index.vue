<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { login } from '../../api/sys/user'

const router = useRouter()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  if (!form.username || !form.password) {
    message.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res: any = await login(form)
    // axios 拦截器返回的是完整的 { success, result, ... }
    const result = res.result || res
    const token = result.token || ''
    const userInfo = result.userInfo || {}
    localStorage.setItem('token', token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
    message.success('登录成功，欢迎 ' + (userInfo.realname || form.username))
    router.push('/overview')
  } catch (e: any) {
    message.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #001529;">
    <a-card style="width: 400px;" title="⚡ N3 Lite 云平台">
      <a-form layout="vertical">
        <a-form-item label="用户名">
          <a-input v-model:value="form.username" placeholder="请输入用户名" size="large" @pressEnter="handleLogin" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model:value="form.password" placeholder="请输入密码" size="large" @pressEnter="handleLogin" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" block size="large" @click="handleLogin">
            登 录
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>
