import http from '../http'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  userInfo: {
    username: string
    realname: string
  }
}

// Mock 模式：后端未启动时用模拟数据登录，后端跑起来后改为 false
const USE_MOCK = false
const MOCK_ACCOUNTS = [
  { username: 'admin', password: '123456', realname: 'Admin', role: 'admin' },
  { username: 'edwin', password: '123456', realname: 'Edwin', role: 'admin' },
  { username: 'support01', password: '123456', realname: '张伟', role: 'operator' },
  { username: 'support02', password: '123456', realname: '李明', role: 'operator' },
]

/** 登录 */
export async function login(params: LoginParams): Promise<any> {
  if (USE_MOCK) {
    const user = MOCK_ACCOUNTS.find(
      (u) => u.username === params.username && u.password === params.password
    )
    if (user) {
      return {
        success: true,
        result: {
          token: 'mock-token-' + user.username + '-' + Date.now(),
          userInfo: { username: user.username, realname: user.realname, role: user.role },
        },
      }
    }
    throw new Error('用户名或密码错误')
  }
  return http.post<LoginResult>('/sys/login', params)
}

/** 退出登录 */
export function logout() {
  if (USE_MOCK) {
    localStorage.removeItem('token')
    return Promise.resolve()
  }
  return http.post('/sys/logout')
}
