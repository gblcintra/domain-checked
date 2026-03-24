import type { Domain } from '../types'

export function statusClasses(status?: string) {
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

export function registrationAvailabilityClasses(domain: Domain) {
  switch (domain.registration_availability) {
    case 'registered':
      return 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/20'
    case 'available':
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
    default:
      if (domain.registration_status === 'expiring_soon') {
        return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20'
      }

      if (domain.registration_status === 'expired') {
        return 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20'
      }

      return 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
  }
}

export function formatDate(value?: string) {
  if (!value) return '--'
  return new Date(value).toLocaleString('pt-BR')
}

export function formatExpirationCountdown(domain: Domain) {
  if (!domain.registration_expires_at) {
    if (domain.registration_error) return 'O serviço consultado não informou a data de expiração.'
    if (domain.registration_checked_at) return 'A consulta foi concluída, mas sem data de expiração retornada.'
    return 'Aguardando a primeira consulta RDAP.'
  }

  const diffMs = new Date(domain.registration_expires_at).getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `a data de expiração passou há ${Math.abs(diffDays)} dia(s)`
  if (diffDays === 0) return 'expira hoje'
  return `expira em ${diffDays} dia(s)`
}

export function registrationDetails(domain: Domain) {
  if (domain.registration_details) return domain.registration_details
  if (domain.registration_error) return domain.registration_error
  if (domain.registration_checked_at) {
    if (domain.registration_status === 'expired') {
      return 'A data de expiração informada pelo RDAP já passou, mas a disponibilidade real depende do campo de disponibilidade retornado na consulta RDAP.'
    }

    return 'A consulta RDAP retornou dados parciais para este domínio.'
  }

  return 'Sem detalhes disponíveis'
}

export function registrationAvailabilityLabel(domain: Domain) {
  switch (domain.registration_availability) {
    case 'registered':
      return 'Indisponível para registro'
    case 'available':
      return 'Disponível para registro'
    default:
      if (domain.registration_checked_at) return 'Erro no retorno da disponibilidade (RDAP)'
      return 'Aguardando consulta'
  }
}

export function registrationAvailabilityDescription(domain: Domain) {
  if (domain.registration_availability === 'available') {
    return 'Nenhum bloqueio de registro foi retornado pelo RDAP nesta consulta.'
  }

  if (domain.registration_availability === 'registered') {
    return 'O domínio aparece como registrado e não está livre para novo cadastro.'
  }

  if (domain.registration_checked_at) {
    return 'O RDAP respondeu, mas houve erro no retorno do campo de disponibilidade.'
  }

  return 'Assim que a consulta RDAP terminar, este status será atualizado aqui.'
}

export function registrationStatusTone(domain: Domain) {
  if (domain.registration_availability === 'available') return 'emerald'
  if (domain.registration_availability === 'registered') return 'cyan'
  if (domain.registration_status === 'expired') return 'rose'
  if (domain.registration_status === 'expiring_soon') return 'amber'
  return 'slate'
}

export function registrationCardClasses(tone: string) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-400/20 bg-emerald-500/10'
    case 'cyan':
      return 'border-cyan-400/20 bg-cyan-500/10'
    case 'amber':
      return 'border-amber-400/20 bg-amber-500/10'
    case 'rose':
      return 'border-rose-400/20 bg-rose-500/10'
    default:
      return 'border-white/10 bg-white/5'
  }
}

export function registrationCardTitleClasses(tone: string) {
  switch (tone) {
    case 'emerald':
      return 'text-emerald-100'
    case 'cyan':
      return 'text-cyan-100'
    case 'amber':
      return 'text-amber-100'
    case 'rose':
      return 'text-rose-100'
    default:
      return 'text-slate-100'
  }
}

export function registrationCardTextClasses(tone: string) {
  switch (tone) {
    case 'emerald':
      return 'text-emerald-50/80'
    case 'cyan':
      return 'text-cyan-50/80'
    case 'amber':
      return 'text-amber-50/80'
    case 'rose':
      return 'text-rose-50/80'
    default:
      return 'text-slate-300'
  }
}

export function registrationExpirationLabel(domain: Domain) {
  if (domain.registration_expires_at) return formatDate(domain.registration_expires_at)
  if (domain.registration_checked_at) return 'Não informada'
  return '--'
}

export function registrationOwnerLabel(domain: Domain) {
  if (domain.registrant) return domain.registrant
  if (domain.registration_availability === 'available') return 'Sem titular: domínio livre para registro'
  if (domain.registration_checked_at) return 'Erro no retorno do titular (RDAP)'
  return 'Aguardando consulta'
}

export function httpSummary(domain: Domain) {
  if (domain.last_http_code) return String(domain.last_http_code)
  if (domain.last_error) return 'sem resposta'
  return '--'
}

export function httpDetails(domain: Domain) {
  if (domain.last_error) return domain.last_error
  if (domain.last_checked_at) return 'Última checagem concluída sem código HTTP disponível.'
  return 'Aguardando a primeira checagem HTTP.'
}
