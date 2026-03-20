import { useEffect, useMemo, useState } from 'react'

const API_BASE = '/api'
const POLL_INTERVAL = 30000
const THEME_STORAGE_KEY = 'domain-checked-theme'

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

const themeOptions = {
  dark: {
    label: 'Dark',
    icon: '🌙',
    shell: 'theme-dark bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
    pageText: 'text-slate-400',
    card: 'border-white/10 bg-slate-900/80 shadow-slate-950/50',
    panel: 'border-white/10 bg-slate-900/70',
    panelMuted: 'border-white/10 bg-slate-950/80',
    input: 'border-white/10 bg-slate-950 text-white placeholder:text-slate-500',
    subtleButton: 'border-white/10 text-white hover:bg-white/5',
    accentButton: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
    secondaryButton: 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10',
    dangerButton: 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10',
    statText: 'text-white',
    statMuted: 'text-slate-400',
    infoText: 'text-slate-500',
    link: 'text-cyan-300',
    footer: 'text-slate-500'
  },
  light: {
    label: 'Light',
    icon: '☀️',
    shell: 'theme-light bg-gradient-to-br from-slate-100 via-white to-cyan-50 text-slate-950',
    pageText: 'text-slate-600',
    card: 'border-slate-200 bg-white/95 shadow-cyan-100/70',
    panel: 'border-slate-200 bg-white/90',
    panelMuted: 'border-slate-200 bg-slate-50/95',
    input: 'border-slate-200 bg-white text-slate-950 placeholder:text-slate-400',
    subtleButton: 'border-slate-300 text-slate-700 hover:bg-slate-100',
    accentButton: 'bg-slate-950 text-white hover:bg-slate-800',
    secondaryButton: 'border-cyan-500/30 text-cyan-700 hover:bg-cyan-50',
    dangerButton: 'border-rose-500/30 text-rose-700 hover:bg-rose-50',
    statText: 'text-slate-950',
    statMuted: 'text-slate-500',
    infoText: 'text-slate-600',
    link: 'text-cyan-700',
    footer: 'text-slate-600'
  }
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

function registrationStatusClasses(status) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
    case 'expiring_soon':
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20'
    case 'expired':
      return 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20'
    default:
      return 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
  }
}

function registrationStatusLabel(status) {
  switch (status) {
    case 'active':
      return 'registro ativo'
    case 'expiring_soon':
      return 'expira em breve'
    case 'expired':
      return 'registro expirado'
    default:
      return 'dados de registro indisponíveis'
  }
}

function formatDate(value) {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString('pt-BR')
}

function formatExpirationCountdown(domain) {
  if (!domain.registration_expires_at) {
    if (domain.registration_error) {
      return 'O serviço consultado não informou a data de expiração.'
    }

    if (domain.registration_checked_at) {
      return 'A consulta foi concluída, mas sem data de expiração retornada.'
    }

    return 'Aguardando a primeira consulta RDAP.'
  }

  const diffMs = new Date(domain.registration_expires_at).getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `expirou há ${Math.abs(diffDays)} dia(s)`
  }

  if (diffDays === 0) {
    return 'expira hoje'
  }

  return `expira em ${diffDays} dia(s)`
}

function registrationDetails(domain) {
  if (domain.registration_details) {
    return domain.registration_details
  }

  if (domain.registration_error) {
    return domain.registration_error
  }

  if (domain.registration_checked_at) {
    return 'A consulta RDAP retornou dados parciais para este domínio.'
  }

  return 'Sem detalhes disponíveis'
}

function registrationAvailabilityLabel(domain) {
  switch (domain.registration_availability) {
    case 'registered':
      return 'Indisponível para registro'
    case 'available':
      return 'Disponível para registro'
    default:
      if (domain.registration_checked_at) {
        return 'Disponibilidade não informada'
      }

      return 'Aguardando consulta'
  }
}

function registrationOwnerLabel(domain) {
  if (domain.registrant) {
    return domain.registrant
  }

  if (domain.registration_availability === 'available') {
    return 'Sem titular: domínio livre para registro'
  }

  if (domain.registration_checked_at) {
    return 'Titular não informado no RDAP'
  }

  return 'Aguardando consulta'
}

function httpSummary(domain) {
  if (domain.last_http_code) {
    return String(domain.last_http_code)
  }

  if (domain.last_error) {
    return 'sem resposta'
  }

  return '--'
}

function httpDetails(domain) {
  if (domain.last_error) {
    return domain.last_error
  }

  if (domain.last_checked_at) {
    return 'Última checagem concluída sem código HTTP disponível.'
  }

  return 'Aguardando a primeira checagem HTTP.'
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

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition theme-toggle"
      aria-label={`Ativar tema ${themeOptions[nextTheme].label.toLowerCase()}`}
      title={`Ativar tema ${themeOptions[nextTheme].label.toLowerCase()}`}
    >
      <span aria-hidden="true">{themeOptions[theme].icon}</span>
      <span>Tema {themeOptions[theme].label}</span>
    </button>
  )
}

function AuthCard({ mode, form, onChange, onSubmit, loading, error, success, onModeChange, resetToken, onReset, theme, onToggleTheme }) {
  const colors = themeOptions[theme]

  return (
    <div className={`mx-auto w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur ${colors.card}`}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Domain Checked</p>
          <h1 className={`mt-3 text-3xl font-semibold ${colors.statText}`}>
            {mode === 'login' && 'Entrar na plataforma'}
            {mode === 'register' && 'Criar conta segura'}
            {mode === 'forgot' && 'Recuperar senha'}
          </h1>
          <p className={`mt-2 text-sm ${colors.pageText}`}>
            Monitore domínios em tempo real, com histórico do último status e autenticação simples.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === 'register' && (
          <input className={`w-full rounded-2xl border px-4 py-3 outline-none ring-0 ${colors.input}`}
            placeholder="Seu nome"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
          />
        )}
        <input className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
          placeholder="voce@empresa.com"
          type="email"
          value={form.email}
          onChange={(event) => onChange('email', event.target.value)}
        />
        {mode !== 'forgot' && (
          <input className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
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

        <button className={`w-full rounded-2xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${colors.accentButton}`}
          disabled={loading}>
          {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Enviar recuperação'}
        </button>
      </form>

      <div className={`mt-6 flex flex-wrap gap-3 text-sm ${colors.pageText}`}>
        <button type="button" className="hover:text-cyan-400" onClick={() => onModeChange('login')}>Login</button>
        <button type="button" className="hover:text-cyan-400" onClick={() => onModeChange('register')}>Cadastro</button>
        <button type="button" className="hover:text-cyan-400" onClick={() => onModeChange('forgot')}>Esqueci a senha</button>
      </div>

      {mode === 'forgot' && (
        <div className={`mt-6 rounded-2xl border p-4 ${colors.panel}`}>
          <h2 className={`font-medium ${colors.statText}`}>Já possui um token?</h2>
          <p className={`mt-1 text-sm ${colors.pageText}`}>Use o token gerado para definir uma nova senha.</p>
          <button type="button" onClick={onReset} className="mt-3 rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">
            Redefinir senha com token
          </button>
        </div>
      )}
    </div>
  )
}

function DomainDashboard({ user, token, domains, onAdd, onDelete, onRefreshOne, onRefreshAll, adding, checking, stats, onLogout, error, theme, onToggleTheme }) {
  const [form, setForm] = useState(emptyDomain)
  const colors = themeOptions[theme]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className={`mb-8 flex flex-col gap-4 rounded-3xl border p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between ${colors.panel}`}>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Painel de monitoramento</p>
          <h1 className={`mt-2 text-3xl font-semibold ${colors.statText}`}>Olá, {user.name}</h1>
          <p className={`mt-2 max-w-2xl text-sm ${colors.pageText}`}>Cadastre domínios, acompanhe o status HTTP, latência, últimos erros e a expiração estimada do registro em uma única visão.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button onClick={onRefreshAll} disabled={checking} className={`rounded-2xl px-4 py-3 font-semibold disabled:opacity-60 ${colors.accentButton}`}>Verificar tudo</button>
          <button onClick={onLogout} className={`rounded-2xl border px-4 py-3 ${colors.subtleButton}`}>Sair</button>
        </div>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className={`rounded-3xl border p-5 ${colors.panel}`}>
            <p className={`text-sm ${colors.statMuted}`}>{item.label}</p>
            <p className={`mt-3 text-3xl font-semibold ${colors.statText}`}>{item.value}</p>
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
        }} className={`rounded-3xl border p-6 ${colors.panel}`}>
          <h2 className={`text-xl font-semibold ${colors.statText}`}>Cadastrar domínio</h2>
          <div className="mt-5 space-y-4">
            <input value={form.hostname} onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))}
              placeholder="exemplo.com.br"
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`} />
            <select value={form.protocol} onChange={(event) => setForm((current) => ({ ...current, protocol: event.target.value }))}
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}>
              <option value="https">https</option>
              <option value="http">http</option>
            </select>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Observações internas"
              rows={4}
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`} />
            <button disabled={adding} className={`w-full rounded-2xl px-4 py-3 font-semibold disabled:opacity-60 ${colors.accentButton}`}>
              {adding ? 'Salvando...' : 'Salvar domínio'}
            </button>
          </div>
        </form>

        <div className={`rounded-3xl border p-6 ${colors.panel}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${colors.statText}`}>Domínios monitorados</h2>
            <span className={`text-sm ${colors.pageText}`}>Autenticação via JWT</span>
          </div>
          <div className="space-y-4">
            {domains.length === 0 && (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${colors.pageText}`}>Nenhum domínio cadastrado ainda.</div>
            )}
            {domains.map((domain) => (
              <article key={domain.id} className={`rounded-3xl border p-5 ${colors.panelMuted}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className={`text-lg font-semibold ${colors.statText}`}>{domain.hostname}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses(domain.last_status)}`}>{domain.last_status || 'pendente'}</span>
                    </div>
                    <p className={`mt-2 text-sm ${colors.pageText}`}>{domain.protocol}://{domain.hostname}</p>
                    {domain.notes && <p className={`mt-2 text-sm ${colors.infoText}`}>{domain.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onRefreshOne(domain.id)} className={`rounded-xl border px-3 py-2 text-sm ${colors.secondaryButton}`}>Atualizar</button>
                    <button type="button" onClick={() => onDelete(domain.id)} className={`rounded-xl border px-3 py-2 text-sm ${colors.dangerButton}`}>Remover</button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${registrationStatusClasses(domain.registration_status)}`}>{registrationStatusLabel(domain.registration_status)}</span>
                  <div className="text-sm text-cyan-50 theme-registration-text">
                    <p className="font-medium">Expiração do registro: {formatDate(domain.registration_expires_at)}</p>
                    <p className="theme-registration-subtext">{formatExpirationCountdown(domain)}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className={`rounded-2xl p-4 ${colors.panel}`}>
                    <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>HTTP</dt>
                    <dd className={`mt-2 text-lg ${colors.statText}`}>{httpSummary(domain)}</dd>
                    <p className={`mt-2 text-xs ${colors.infoText}`}>{httpDetails(domain)}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Latência</dt><dd className={`mt-2 text-lg ${colors.statText}`}>{domain.last_response_ms ? `${domain.last_response_ms} ms` : '--'}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Última checagem</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{domain.last_checked_at ? new Date(domain.last_checked_at).toLocaleString('pt-BR') : 'Nunca'}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Consulta RDAP</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{formatDate(domain.registration_checked_at)}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Disponibilidade</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{registrationAvailabilityLabel(domain)}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Titular</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{registrationOwnerLabel(domain)}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Registrador</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{domain.registrar || 'Não informado'}</dd></div>
                  <div className={`rounded-2xl p-4 ${colors.panel}`}><dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>Detalhes do registro</dt><dd className={`mt-2 text-sm ${colors.statText}`}>{registrationDetails(domain)}</dd></div>
                </dl>

                {domain.rdap_url && (
                  <p className={`mt-3 text-xs ${colors.infoText}`}>
                    Fonte da consulta: <a className={`underline underline-offset-2 ${colors.link}`} href={domain.rdap_url} target="_blank" rel="noreferrer">{domain.rdap_url}</a>
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className={`text-center text-sm ${colors.footer}`}>Token em uso: {token.slice(0, 18)}...</footer>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('login')
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark')
  const [authForm, setAuthForm] = useState(emptyAuth)
  const [token, setToken] = useState(() => localStorage.getItem('domain-checked-token') || '')
  const [user, setUser] = useState(null)
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetToken, setResetToken] = useState('')

  const activeTheme = themeOptions[theme] ? theme : 'dark'

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

  async function refreshAllDomains({ silent = false } = {}) {
    if (!token) return []

    try {
      if (!silent) {
        setChecking(true)
      }

      const data = await request('/domains/check-all', { method: 'POST', token })
      setDomains(data.domains)
      return data.domains
    } catch (err) {
      if (!silent) {
        setError(err.message)
      }
      throw err
    } finally {
      if (!silent) {
        setChecking(false)
      }
    }
  }

  useEffect(() => {
    if (!token || !user) return undefined

    refreshAllDomains({ silent: true }).catch(() => {})

    const interval = setInterval(() => {
      refreshAllDomains({ silent: true }).catch(() => {})
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
      const data = await request('/domains', { method: 'POST', token, body: form })
      setDomains((current) => [data.domain, ...current.filter((item) => item.id !== data.domain.id)])
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
    <main className={`min-h-screen transition-colors duration-300 ${themeOptions[activeTheme].shell}`}>
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
            theme={activeTheme}
            onToggleTheme={handleThemeToggle}
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
          theme={activeTheme}
          onToggleTheme={handleThemeToggle}
        />
      )}
    </main>
  )
}
