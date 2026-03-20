import { useEffect, useMemo, useState } from 'react'

const API_BASE = '/api'
const POLL_INTERVAL = 30000

const emptyAuth = {
  name: '',
  email: '',
  password: ''
}

const emptyDomain = {
  hostname: '',
  protocol: 'https',
  notes: ''
}

function statusClasses(status) {
  switch (status) {
    case 'online':
      return 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
    case 'warning':
      return 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30'
    case 'offline':
      return 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30'
    default:
      return 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
  }
}

async function request(path, { token, method = 'GET', body } = {}) {
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

function AuthCard({ mode, form, onChange, onSubmit, loading, error, success, onModeChange, resetToken, onReset }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Domain Checked</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {mode === 'login' && 'Entrar na plataforma'}
          {mode === 'register' && 'Criar conta segura'}
          {mode === 'forgot' && 'Recuperar senha'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Monitore domínios em tempo real, com histórico do último status e autenticação simples.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === 'register' && (
          <input className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
            placeholder="Seu nome"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
          />
        )}
        <input className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
          placeholder="voce@empresa.com"
          type="email"
          value={form.email}
          onChange={(event) => onChange('email', event.target.value)}
        />
        {mode !== 'forgot' && (
          <input className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
            placeholder={mode === 'register' ? 'Crie uma senha forte' : 'Digite sua senha'}
            type="password"
            value={form.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        )}

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p>}
        {resetToken && (
          <div className="rounded-2xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <p className="font-medium">Token gerado para redefinição:</p>
            <p className="mt-2 break-all font-mono text-xs">{resetToken}</p>
          </div>
        )}

        <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}>
          {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Enviar recuperação'}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
        <button type="button" className="hover:text-white" onClick={() => onModeChange('login')}>Login</button>
        <button type="button" className="hover:text-white" onClick={() => onModeChange('register')}>Cadastro</button>
        <button type="button" className="hover:text-white" onClick={() => onModeChange('forgot')}>Esqueci a senha</button>
      </div>

      {mode === 'forgot' && (
        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <h2 className="font-medium text-white">Já possui um token?</h2>
          <p className="mt-1 text-sm text-slate-400">Use o token gerado para definir uma nova senha.</p>
          <button type="button" onClick={onReset} className="mt-3 rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">
            Redefinir senha com token
          </button>
        </div>
      )}
    </div>
  )
}

function DomainDashboard({ user, token, domains, onAdd, onDelete, onRefreshOne, onRefreshAll, adding, checking, stats, onLogout, error }) {
  const [form, setForm] = useState(emptyDomain)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Painel de monitoramento</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Olá, {user.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Cadastre domínios, acompanhe o status HTTP, latência e últimos erros detectados em uma única visão.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onRefreshAll} disabled={checking} className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">Verificar tudo</button>
          <button onClick={onLogout} className="rounded-2xl border border-white/10 px-4 py-3 text-white hover:bg-white/5">Sair</button>
        </div>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="mb-8 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      <section className="mb-8 grid gap-6 lg:grid-cols-[360px,1fr]">
        <form onSubmit={(event) => {
          event.preventDefault()
          onAdd(form, () => setForm(emptyDomain))
        }} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-white">Cadastrar domínio</h2>
          <div className="mt-5 space-y-4">
            <input value={form.hostname} onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))}
              placeholder="exemplo.com.br"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none" />
            <select value={form.protocol} onChange={(event) => setForm((current) => ({ ...current, protocol: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none">
              <option value="https">https</option>
              <option value="http">http</option>
            </select>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Observações internas"
              rows="4"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none" />
            <button disabled={adding} className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60">
              {adding ? 'Salvando...' : 'Salvar domínio'}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Domínios monitorados</h2>
            <span className="text-sm text-slate-400">Autenticação via JWT</span>
          </div>
          <div className="space-y-4">
            {domains.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">Nenhum domínio cadastrado ainda.</div>
            )}
            {domains.map((domain) => (
              <article key={domain.id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{domain.hostname}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses(domain.last_status)}`}>{domain.last_status || 'pendente'}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{domain.protocol}://{domain.hostname}</p>
                    {domain.notes && <p className="mt-2 text-sm text-slate-500">{domain.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onRefreshOne(domain.id)} className="rounded-xl border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">Atualizar</button>
                    <button type="button" onClick={() => onDelete(domain.id)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm text-rose-200 hover:bg-rose-400/10">Remover</button>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-900 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">HTTP</dt><dd className="mt-2 text-lg text-white">{domain.last_http_code ?? '--'}</dd></div>
                  <div className="rounded-2xl bg-slate-900 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Latência</dt><dd className="mt-2 text-lg text-white">{domain.last_response_ms ? `${domain.last_response_ms} ms` : '--'}</dd></div>
                  <div className="rounded-2xl bg-slate-900 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Última checagem</dt><dd className="mt-2 text-sm text-white">{domain.last_checked_at ? new Date(domain.last_checked_at).toLocaleString('pt-BR') : 'Nunca'}</dd></div>
                  <div className="rounded-2xl bg-slate-900 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Erro</dt><dd className="mt-2 text-sm text-white">{domain.last_error || 'Sem erros'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-slate-500">Token em uso: {token.slice(0, 18)}...</footer>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('login')
  const [authForm, setAuthForm] = useState(emptyAuth)
  const [token, setToken] = useState(() => localStorage.getItem('domain-checked-token') || '')
  const [user, setUser] = useState(null)
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetToken, setResetToken] = useState('')

  const stats = useMemo(() => {
    const online = domains.filter((item) => item.last_status === 'online').length
    const warning = domains.filter((item) => item.last_status === 'warning').length
    const offline = domains.filter((item) => item.last_status === 'offline').length
    const avgLatency = domains.filter((item) => item.last_response_ms).reduce((acc, item) => acc + item.last_response_ms, 0)
    const measured = domains.filter((item) => item.last_response_ms).length

    return [
      { label: 'Total de domínios', value: domains.length },
      { label: 'Online', value: online },
      { label: 'Instáveis/alerta', value: warning + offline },
      { label: 'Latência média', value: measured ? `${Math.round(avgLatency / measured)} ms` : '--' }
    ]
  }, [domains])

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
      localStorage.removeItem('domain-checked-token')
      setToken('')
      setUser(null)
      setDomains([])
      setError(err.message)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  useEffect(() => {
    if (!token || !user) return undefined
    const interval = setInterval(() => {
      request('/domains/check-all', { method: 'POST', token })
        .then((data) => setDomains(data.domains))
        .catch(() => {})
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [token, user])

  async function handleAuthSubmit(event) {
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    const tokenInput = window.prompt('Cole o token de recuperação')
    const password = window.prompt('Digite a nova senha')
    if (!tokenInput || !password) return

    try {
      setLoading(true)
      const data = await request('/auth/reset-password', { method: 'POST', body: { token: tokenInput, password } })
      setSuccess(data.message)
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDomain(form, onDone) {
    try {
      setLoading(true)
      await request('/domains', { method: 'POST', token, body: form })
      const data = await request('/domains', { token })
      setDomains(data.domains)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDomain(id) {
    try {
      await request(`/domains/${id}`, { method: 'DELETE', token })
      setDomains((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRefreshOne(id) {
    try {
      setChecking(true)
      const data = await request(`/domains/${id}/check`, { method: 'POST', token })
      setDomains((current) => current.map((item) => (item.id === id ? data.domain : item)))
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleRefreshAll() {
    try {
      setChecking(true)
      const data = await request('/domains/check-all', { method: 'POST', token })
      setDomains(data.domains)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('domain-checked-token')
    setToken('')
    setUser(null)
    setDomains([])
    setMode('login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {!user ? (
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
          />
        </div>
      ) : (
        <DomainDashboard
          user={user}
          token={token}
          domains={domains}
          onAdd={handleAddDomain}
          onDelete={handleDeleteDomain}
          onRefreshOne={handleRefreshOne}
          onRefreshAll={handleRefreshAll}
          adding={loading}
          checking={checking}
          stats={stats}
          onLogout={handleLogout}
          error={error}
        />
      )}
    </main>
  )
}
