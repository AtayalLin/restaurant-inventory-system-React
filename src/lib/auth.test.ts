// 登入與 token：後端登入、json-server 退回、請求自動帶 token、401 通知登出、4xx 不重試
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { login } from './authApi'
import { apiFetch, setAuth, UNAUTHORIZED_EVENT } from './auth'
import { fetchJSON } from './fetchJSON'

const owner = { id: 'u-owner', name: '林老闆', role: 'OWNER' as const, storeId: null }

afterEach(() => {
  setAuth(null)
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('帳密正確時回傳 token 與使用者', async () => {
    const auth = await login('manager', 'demo1234')
    expect(auth.token).toBeTruthy()
    expect(auth.user).toMatchObject({ name: '王店長', role: 'MANAGER', storeId: 'st1' })
  })

  it('密碼錯誤時顯示統一訊息', async () => {
    await expect(login('owner', 'wrong')).rejects.toThrow('帳號或密碼錯誤')
  })

  it('json-server 沒有登入 API 時，改用本機示範帳號（token 為 null）', async () => {
    server.use(http.post('*/api/auth/login', () => new HttpResponse('Not Found', { status: 404 })))
    const auth = await login('staff', 'demo1234')
    expect(auth.token).toBeNull()
    expect(auth.user.role).toBe('STAFF')
  })
})

describe('apiFetch', () => {
  it('登入後的請求自動帶 Authorization 標頭', async () => {
    let received: string | null = null
    server.use(http.get('*/api/echo', ({ request }) => {
      received = request.headers.get('authorization')
      return HttpResponse.json({})
    }))
    setAuth({ token: 'abc123', user: owner })
    await apiFetch('http://localhost/api/echo')
    expect(received).toBe('Bearer abc123')
  })

  it('收到 401 時發出登出事件', async () => {
    const target = new EventTarget()
    vi.stubGlobal('window', target) // Node 沒有 window，用 EventTarget 模擬
    const onUnauthorized = vi.fn()
    target.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    server.use(http.get('*/api/echo', () => new HttpResponse(null, { status: 401 })))
    setAuth({ token: 'expired', user: owner })

    await apiFetch('http://localhost/api/echo')
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})

describe('fetchJSON 錯誤處理', () => {
  it('403 沒權限時不重試，直接顯示中文訊息', async () => {
    let calls = 0
    server.use(http.get('*/api/echo', () => { calls++; return new HttpResponse(null, { status: 403 }) }))
    await expect(fetchJSON('http://localhost/api/echo')).rejects.toThrow('沒有權限執行這個操作')
    expect(calls).toBe(1)
  })
})
