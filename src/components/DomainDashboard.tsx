import { useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import {
  formatDate,
  formatExpirationCountdown,
  httpDetails,
  httpSummary,
  registrationAvailabilityClasses,
  registrationAvailabilityDescription,
  registrationAvailabilityLabel,
  registrationCardClasses,
  registrationCardTextClasses,
  registrationCardTitleClasses,
  registrationDetails,
  registrationExpirationLabel,
  registrationOwnerLabel,
  registrationStatusTone,
  statusClasses
} from '../utils/domain'
import { themeOptions } from '../utils/theme'
import type { Domain, DomainFilter, DomainForm, StatItem, Theme, User } from '../types'

const emptyDomain: DomainForm = {
  hostname: '',
  protocol: 'https',
  notes: ''
}

type DomainDashboardProps = {
  user: User
  token: string
  domains: Domain[]
  onAdd: (form: DomainForm, onDone: () => void) => void
  onDelete: (id: number) => void
  onRefreshOne: (id: number) => void
  onRefreshAll: () => void
  adding: boolean
  checking: boolean
  stats: StatItem[]
  activeFilter: DomainFilter
  onSelectFilter: (filter: DomainFilter) => void
  onLogout: () => void
  error: string
  theme: Theme
  onToggleTheme: () => void
}

export function DomainDashboard({ user, token, domains, onAdd, onDelete, onRefreshOne, onRefreshAll, adding, checking, stats, activeFilter, onSelectFilter, onLogout, error, theme, onToggleTheme }: DomainDashboardProps) {
  const [form, setForm] = useState<DomainForm>(emptyDomain)
  const colors = themeOptions[theme]
  const detailCardClass = theme === 'light' ? 'border-slate-200/80 bg-white/85' : 'border-white/10 bg-slate-950/40'

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

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const isClickable = Boolean(item.filter)
          const isActive = item.filter === activeFilter

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => item.filter && onSelectFilter(item.filter)}
              disabled={!isClickable}
              className={`rounded-3xl border p-5 text-left transition ${colors.panel} ${isClickable ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'} ${isActive ? 'ring-2 ring-cyan-400/70' : ''} disabled:opacity-100`}
            >
              <div className="flex flex-col items-start justify-between gap-3">

                  <p className={`text-sm ${colors.statMuted}`}>{item.label}</p>
                  <p className={`flex items-end w-[100%] justify-between mt-3 text-3xl font-semibold ${colors.statText}`}>
                    {item.value}
                    {item.filter && (
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${isActive ? 'bg-cyan-500/20 text-cyan-200' : colors.statMuted}`}>
                        {isActive ? 'Filtro ativo' : 'Filtrar'}
                      </span>
                    )}
                  </p>
              </div>
            </button>
          )
        })}
      </section>

      {error && <div className="mb-8 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">{error}</div>}

      <section className="mb-8 grid gap-6 lg:grid-cols-[360px,1fr]">
        <form onSubmit={(event) => {
          event.preventDefault()
          onAdd(form, () => setForm(emptyDomain))
        }} className={`rounded-3xl border p-6 ${colors.panel}`}>
          <h2 className={`text-xl font-semibold ${colors.statText}`}>Cadastrar domínio</h2>
          <div className="mt-5 space-y-4">
            <input value={form.hostname} onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))} placeholder="exemplo.com.br" className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`} />
            <select value={form.protocol} onChange={(event) => setForm((current) => ({ ...current, protocol: event.target.value }))} className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`}>
              <option value="https">https</option>
              <option value="http">http</option>
            </select>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Observações internas" rows={4} className={`w-full rounded-2xl border px-4 py-3 outline-none ${colors.input}`} />
            <button disabled={adding} className={`w-full rounded-2xl px-4 py-3 font-semibold disabled:opacity-60 ${colors.accentButton}`}>
              {adding ? 'Salvando...' : 'Salvar domínio'}
            </button>
          </div>
        </form>

        <div className={`rounded-3xl border p-6 ${colors.panel}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-semibold ${colors.statText}`}>Domínios monitorados</h2>
              <p className={`mt-1 text-sm ${colors.pageText}`}>Clique em Total de domínios, Online, Instáveis/alerta ou Disponíveis p/ registro para filtrar a lista.</p>
            </div>
            <span className={`text-sm ${colors.pageText}`}>Autenticação via JWT</span>
          </div>
          <div className="space-y-4">
            {domains.length === 0 && <div className={`rounded-2xl border border-dashed p-8 text-center ${colors.pageText}`}>Nenhum domínio encontrado para o filtro selecionado.</div>}
            {domains.map((domain) => {
              const registrationTone = registrationStatusTone(domain)

              return (
                <article key={domain.id} className={`rounded-3xl border p-5 ${colors.panelMuted}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className={`text-lg font-semibold ${colors.statText}`}>{domain.hostname}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses(domain.last_status)}`}>
                          {domain.last_status || 'pendente'}
                        </span>
                      </div>

                      <p className={`mt-2 text-sm ${colors.pageText}`}>
                        {domain.protocol}://{domain.hostname}
                        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${registrationAvailabilityClasses(domain)}`}>
                          {registrationAvailabilityLabel(domain)}
                        </span>
                      </p>
                      {domain.notes && <p className={`mt-2 text-sm ${colors.infoText}`}>Observações Internas: {domain.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onRefreshOne(domain.id)} className={`rounded-xl border px-3 py-2 text-sm ${colors.secondaryButton}`}>
                        Atualizar
                      </button>
                      <button type="button" onClick={() => onDelete(domain.id)} className={`rounded-xl border px-3 py-2 text-sm ${colors.dangerButton}`}>
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className={`mt-5 rounded-3xl border p-5 ${registrationCardClasses(registrationTone)}`}>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 lg:flex-row lg:items-start lg:justify-items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className={`text-xs uppercase tracking-[0.2em] ${registrationCardTextClasses(registrationTone)}`}>
                          Observações de registro
                        </p>
                        <p className={`text-sm ${registrationCardTextClasses(registrationTone)}`}>
                          {registrationAvailabilityDescription(domain)}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs uppercase tracking-[0.2em] ${registrationCardTextClasses(registrationTone)}`}>
                          Expiração do registro
                        </p>
                        <p className={`mt-2 text-sm font-semibold ${registrationCardTitleClasses(registrationTone)}`}>
                          {registrationExpirationLabel(domain)}
                        </p>
                        <p className={`mt-2 text-sm ${registrationCardTextClasses(registrationTone)}`}>
                          {formatExpirationCountdown(domain)}
                        </p>
                      </div>
                    </div>


                  </div>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>HTTP</dt>
                      <dd className={`mt-2 text-lg ${colors.statText}`}>{httpSummary(domain)}</dd>
                      <p className={`mt-2 text-xs ${colors.infoText}`}>{httpDetails(domain)}</p>
                    </div>
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Latência
                      </dt>
                      <dd className={`mt-2 text-lg ${colors.statText}`}>
                        {domain.last_response_ms ? `${domain.last_response_ms} ms` : '--'}
                      </dd>
                    </div>
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Última checagem
                      </dt>
                      <dd className={`mt-2 text-sm ${colors.statText}`}>
                        {domain.last_checked_at ? new Date(domain.last_checked_at).toLocaleString('pt-BR') : 'Nunca'}
                      </dd>
                    </div>
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Consulta RDAP
                      </dt>
                      <dd className={`mt-2 text-sm ${colors.statText}`}>
                        {formatDate(domain.registration_checked_at)}
                      </dd>
                    </div>
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Titular
                      </dt>
                      <dd className={`mt-2 text-sm ${colors.statText}`}>
                        {registrationOwnerLabel(domain)}
                      </dd>
                    </div>
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Registrador
                      </dt>
                      <dd className={`mt-2 text-sm ${colors.statText}`}>
                        {domain.registrar || 'Não informado'}
                      </dd>
                    </div>

                    {/* <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Detalhes do registro
                      </dt>
                      <dd className={`mt-2 text-sm leading-6 ${colors.statText}`}>
                        {registrationDetails(domain)}
                      </dd>
                    </div> */}
                    <div className={`rounded-2xl p-4 ${colors.panel}`}>
                      <dt className={`text-xs uppercase tracking-wide ${colors.statMuted}`}>
                        Disponibilidade
                      </dt>
                      <dt className={`mt-2 text-sm font-semibold ${registrationCardTitleClasses(registrationTone)}`}>
                        {registrationAvailabilityLabel(domain)}
                      </dt>
                      <dd className={`mt-2 text-sm leading-6 ${colors.statText}`}>
                        {registrationAvailabilityDescription(domain)}
                      </dd>

                    </div>
                  </dl>

                  {domain.rdap_url && (
                    <p className={`mt-3 text-xs ${colors.infoText}`}>
                      Fonte da consulta: <a className={`underline underline-offset-2 ${colors.link}`} href={domain.rdap_url} target="_blank" rel="noreferrer">{domain.rdap_url}</a>
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className={`text-center text-sm ${colors.footer}`}>Token em uso: {token.slice(0, 18)}...</footer>
    </div>
  )
}
