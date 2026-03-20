export type Theme = 'dark' | 'light'

export type AuthMode = 'login' | 'register' | 'forgot'

export type AuthForm = {
  name: string
  email: string
  password: string
}

export type DomainForm = {
  hostname: string
  protocol: string
  notes: string
}

export type User = {
  id?: number
  name: string
  email?: string
}

export type Domain = {
  id: number
  hostname: string
  protocol: string
  notes?: string
  last_status?: string
  last_http_code?: number
  last_error?: string
  last_checked_at?: string
  last_response_ms?: number
  registration_availability?: string
  registration_status?: string
  registration_details?: string
  registration_error?: string
  registration_checked_at?: string
  registration_expires_at?: string
  registrant?: string
  registrar?: string
  rdap_url?: string
}

export type StatItem = {
  label: string
  value: number | string
}
