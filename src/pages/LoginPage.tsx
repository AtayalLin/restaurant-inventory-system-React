// 登入頁 - 對應路由 /login
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, UtensilsCrossed } from 'lucide-react'
import { useSession } from '../session/SessionProvider'
import { DEMO_PASSWORD, DEMO_USERS } from '../session/demoUsers'
import { ROLE_LABEL } from '../lib/permissions'
import { Button, Card, Field, inputClass } from '../components/ui'

function LoginPage() {
  const { user, login } = useSession()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={from} replace /> // 已登入就不用再看到登入頁

  async function submit(u: string, p: string) {
    setError('')
    setLoading(true)
    try {
      await login(u, p)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void submit(username.trim(), password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold text-brand-800">
          <UtensilsCrossed size={22} aria-hidden="true" />
          智慧餐飲進銷存
        </div>

        <Card className="p-6">
          <h1 className="mb-5 text-lg font-semibold text-ink">登入</h1>
          <form onSubmit={handleSubmit} noValidate>
            <Field label="帳號" required>
              <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus className={inputClass()} />
            </Field>
            <Field label="密碼" required>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={inputClass()} />
            </Field>
            {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <Button type="submit" className="w-full" loading={loading} disabled={!username || !password}
              icon={<LogIn size={16} aria-hidden="true" />}>
              登入
            </Button>
          </form>
        </Card>

        {/* 示範帳號：讓面試官一鍵體驗三種角色 */}
        <div className="mt-5">
          <p className="mb-2 text-center text-xs text-ink-3">示範帳號（密碼皆為 {DEMO_PASSWORD}），點一下直接登入</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map(u => (
              <button
                key={u.id}
                type="button"
                disabled={loading}
                onClick={() => void submit(u.username, DEMO_PASSWORD)}
                className="rounded-lg border border-line bg-white px-2 py-2 text-xs text-ink-2 hover:border-brand-500 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-50"
              >
                <span className="block font-semibold text-ink">{ROLE_LABEL[u.role]}</span>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
