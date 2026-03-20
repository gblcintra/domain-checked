import type { Theme } from '../types'

export const THEME_STORAGE_KEY = 'domain-checked-theme'

export const themeOptions: Record<Theme, Record<string, string>> = {
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
