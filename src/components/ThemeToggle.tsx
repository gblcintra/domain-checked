import { themeOptions } from '../utils/theme'
import type { Theme } from '../types'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
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
