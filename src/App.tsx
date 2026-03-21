import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthCard } from './components/AuthCard'
import { DomainDashboard } from './components/DomainDashboard'
import { THEME_STORAGE_KEY, themeOptions } from './utils/theme'
import type { AuthForm, AuthMode, Domain, DomainFilter, DomainForm, User } from './types'

const API_BASE = '/api'
const POLL_INTERVAL = 30000

const emptyAuth: AuthForm = {
  name: '',
  email: '',
  password: ''
}

type RequestOptions = { token?: string; method?: string; body?: unknown }

async function request(path: string, { token, method = 'GET', body }: RequestOptions = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  if (response.status === 204) {
    return null
  }

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Erro inesperado.')
  }

  return data
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuth)
  const [token, setToken] = useState(() => localStorage.getItem('domain-checked-token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [activeFilter, setActiveFilter] = useState<DomainFilter>('all')

  const activeTheme = themeOptions[theme as keyof typeof themeOptions] ? theme : 'dark'

  const stats = useMemo(() => {
    const online = domains.filter((item) => item.last_status === 'online').length
    const warning = domains.filter((item) => item.last_status === 'warning').length
    const offline = domains.filter((item) => item.last_status === 'offline').length
    const available = domains.filter((item) => item.registration_availability === 'available').length
    const avgLatency = domains.filter((item) => item.last_response_ms).reduce((acc, item) => acc + (item.last_response_ms || 0), 0)
    const measured = domains.filter((item) => item.last_response_ms).length

    return [
      { label: 'Total de domínios', value: domains.length, filter: 'all' },
      { label: 'Online', value: online, filter: 'online' },
      { label: 'Instáveis/alerta', value: warning + offline, filter: 'attention' },
      { label: 'Disponíveis p/ registro', value: available, filter: 'available' },
      { label: 'Latência média', value: measured ? `${Math.round(avgLatency / measured)} ms` : '--' }
    ]
  }, [domains])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, activeTheme)
    document.documentElement.dataset.theme = activeTheme
  }, [activeTheme])

  async function loadSession(activeToken = token) {
    if (!activeToken) return
    try {
      const [me, domainList] = await Promise.all([
        request('/auth/me', { token: activeToken }),
        request('/domains', { token: activeToken })
      ])
      setUser(me.user)
      setDomains(domainList.domains)
      setError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sessão.'
      localStorage.removeItem('domain-checked-token')
      setToken('')
      setUser(null)
      setDomains([])
      setError(message)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  async function refreshAllDomains({ silent = false } = {}) {
    if (!token) return []

    try {
      if (!silent) setChecking(true)
      const data = await request('/domains/check-all', { method: 'POST', token })
      setDomains(data.domains)
      return data.domains
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Erro ao atualizar domínios.')
      throw err
    } finally {
      if (!silent) setChecking(false)
    }
  }

  const filteredDomains = useMemo(() => {
    switch (activeFilter) {
      case 'online':
        return domains.filter((item) => item.last_status === 'online')
      case 'attention':
        return domains.filter((item) => item.last_status === 'warning' || item.last_status === 'offline')
      case 'available':
        return domains.filter((item) => item.registration_availability === 'available')
      default:
        return domains
    }
  }, [activeFilter, domains])

  useEffect(() => {
    if (!token || !user) return undefined

    refreshAllDomains({ silent: true }).catch(() => {})
    const interval = setInterval(() => {
      refreshAllDomains({ silent: true }).catch(() => {})
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [token, user])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setResetToken('')

    try {
      if (mode === 'login') {
        const data = await request('/auth/login', { method: 'POST', body: authForm })
        localStorage.setItem('domain-checked-token', data.token)
        setToken(data.token)
        setUser(data.user)
        setAuthForm(emptyAuth)
        await loadSession(data.token)
      }

      if (mode === 'register') {
        const data = await request('/auth/register', { method: 'POST', body: authForm })
        localStorage.setItem('domain-checked-token', data.token)
        setToken(data.token)
        setUser(data.user)
        setAuthForm(emptyAuth)
        await loadSession(data.token)
      }

      if (mode === 'forgot') {
        const data = await request('/auth/forgot-password', { method: 'POST', body: { email: authForm.email } })
        setSuccess(data.message)
        setResetToken(data.resetToken || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de autenticação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    const tokenInput = globalThis.prompt('Cole o token de recuperação')
    const password = globalThis.prompt('Digite a nova senha')
    if (!tokenInput || !password) return

    try {
      setLoading(true)
      const data = await request('/auth/reset-password', { method: 'POST', body: { token: tokenInput, password } })
      setSuccess(data.message)
      setMode('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDomain(form: DomainForm, onDone: () => void) {
    try {
      setLoading(true)
      const data = await request('/domains', { method: 'POST', token, body: form })
      setDomains((current) => [data.domain, ...current.filter((item) => item.id !== data.domain.id)])
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar domínio.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDomain(id: number) {
    try {
      await request(`/domains/${id}`, { method: 'DELETE', token })
      setDomains((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover domínio.')
    }
  }

  async function handleRefreshOne(id: number) {
    try {
      setChecking(true)
      const data = await request(`/domains/${id}/check`, { method: 'POST', token })
      setDomains((current) => current.map((item) => (item.id === id ? data.domain : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar domínio.')
    } finally {
      setChecking(false)
    }
  }

  async function handleRefreshAll() {
    await refreshAllDomains()
  }

  function handleLogout() {
    localStorage.removeItem('domain-checked-token')
    setToken('')
    setUser(null)
    setDomains([])
    setMode('login')
  }

  function handleThemeToggle() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <main className={`min-h-screen transition-colors duration-300 ${themeOptions[activeTheme as keyof typeof themeOptions].shell}`}>
      {user ? (
        <DomainDashboard
          user={user}
          token={token}
          domains={filteredDomains}
          onAdd={handleAddDomain}
          onDelete={handleDeleteDomain}
          onRefreshOne={handleRefreshOne}
          onRefreshAll={handleRefreshAll}
          adding={loading}
          checking={checking}
          stats={stats}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          onLogout={handleLogout}
          error={error}
          theme={activeTheme as 'dark' | 'light'}
          onToggleTheme={handleThemeToggle}
        />
      ) : (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <AuthCard
            mode={mode}
            form={authForm}
            onChange={(field, value) => setAuthForm((current) => ({ ...current, [field]: value }))}
            onSubmit={handleAuthSubmit}
            loading={loading}
            error={error}
            success={success}
            resetToken={resetToken}
            onModeChange={(nextMode) => {
              setMode(nextMode)
              setError('')
              setSuccess('')
            }}
            onReset={handleResetPassword}
            theme={activeTheme as 'dark' | 'light'}
            onToggleTheme={handleThemeToggle}
          />
        </div>
      )}
    </main>
  )
}
