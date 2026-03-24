import type { FormEvent } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { themeOptions } from '../utils/theme'
import type { AuthForm, AuthMode, Theme } from '../types'

type AuthCardProps = {
  mode: AuthMode
  form: AuthForm
  onChange: (field: keyof AuthForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  loading: boolean
  error: string
  success: string
  onModeChange: (mode: AuthMode) => void
  onReset: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function AuthCard({ mode, form, onChange, onSubmit, loading, error, success, onModeChange, onReset, theme, onToggleTheme }: AuthCardProps) {
  const colors = themeOptions[theme]

  let buttonText = 'Enviar recuperação'
  if (mode === 'login') buttonText = 'Entrar'
  if (mode === 'register') buttonText = 'Cadastrar'
  if (mode === 'reset') buttonText = 'Salvar nova senha'

  return (
    <div className={`mx-auto w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur ${colors.card}`}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Domain Checked</p>
          <h1 className={`mt-3 text-3xl font-semibold ${colors.statText}`}>
            {mode === 'login' && 'Entrar na plataforma'}
            {mode === 'register' && 'Criar conta segura'}
            {mode === 'forgot' && 'Recuperar senha'}
            {mode === 'reset' && 'Redefinir com token'}
          </h1>
          <p className={`mt-2 text-sm ${colors.pageText}`}>
            Monitore domínios em tempo real, com histórico do último status e autenticação simples.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === 'register' && (
          <input
            className={`w-full rounded-2xl border px-4 py-3 outline-none ring-0 ${colors.input}`}
            placeholder="Seu nome"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
          />
        )}
        {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
          <input
            className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
            placeholder="voce@empresa.com"
            type="email"
            value={form.email}
            onChange={(event) => onChange('email', event.target.value)}
          />
        )}
        {(mode === 'login' || mode === 'register') && (
          <input
            className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
            placeholder={mode === 'register' ? 'Crie uma senha forte' : 'Digite sua senha'}
            type="password"
            value={form.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        )}
        {mode === 'reset' && (
          <>
            <input
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
              placeholder="Token de 6 dígitos"
              inputMode="numeric"
              maxLength={6}
              value={form.name}
              onChange={(event) => onChange('name', event.target.value.replace(/\D/g, ''))}
            />
            <input
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}
              placeholder="Digite sua nova senha"
              type="password"
              value={form.password}
              onChange={(event) => onChange('password', event.target.value)}
            />
          </>
        )}

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p>}

        <button className={`w-full rounded-2xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${colors.accentButton}`} disabled={loading}>
          {loading ? 'Processando...' : buttonText}
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
          <p className={`mt-1 text-sm ${colors.pageText}`}>Use o token recebido por e-mail para definir uma nova senha.</p>
          <button type="button" onClick={onReset} className="mt-3 rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">
            Redefinir senha com token
          </button>
        </div>
      )}
      {mode === 'reset' && (
        <div className={`mt-6 rounded-2xl border p-4 ${colors.panel}`}>
          <h2 className={`font-medium ${colors.statText}`}>Fluxo seguro de recuperação</h2>
          <p className={`mt-1 text-sm ${colors.pageText}`}>
            Se o e-mail estiver cadastrado no banco, o token já foi enviado. Informe o código e escolha uma nova senha.
          </p>
        </div>
      )}
    </div>
  )
}
