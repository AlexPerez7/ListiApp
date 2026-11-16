// Preferencias del dispositivo (tema y moneda), guardadas en localStorage.
import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

export interface CurrencyOption {
  code: string
  label: string
  locale: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'CLP', label: 'Peso chileno (CLP)', locale: 'es-CL' },
  { code: 'ARS', label: 'Peso argentino (ARS)', locale: 'es-AR' },
  { code: 'MXN', label: 'Peso mexicano (MXN)', locale: 'es-MX' },
  { code: 'COP', label: 'Peso colombiano (COP)', locale: 'es-CO' },
  { code: 'PEN', label: 'Sol peruano (PEN)', locale: 'es-PE' },
  { code: 'UYU', label: 'Peso uruguayo (UYU)', locale: 'es-UY' },
  { code: 'USD', label: 'Dólar (USD)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (EUR)', locale: 'es-ES' },
]

const REGION_CURRENCY: Record<string, string> = {
  CL: 'CLP',
  AR: 'ARS',
  MX: 'MXN',
  CO: 'COP',
  PE: 'PEN',
  UY: 'UYU',
  US: 'USD',
  ES: 'EUR',
}

export interface Prefs {
  theme: ThemePref
  currency: string
}

const THEME_KEY = 'listiapp-theme'
const CURRENCY_KEY = 'listiapp-currency'
const THEME_COLORS = { light: '#f5f7f3', dark: '#0f1417' }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // preferencia solo para esta sesión
  }
}

function defaultCurrency(): string {
  const region = navigator.language.split('-')[1]?.toUpperCase()
  return (region && REGION_CURRENCY[region]) || 'CLP'
}

function load(): Prefs {
  const storedTheme = read(THEME_KEY)
  const storedCurrency = read(CURRENCY_KEY)
  return {
    theme: storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system',
    currency: CURRENCIES.some((c) => c.code === storedCurrency) ? storedCurrency! : defaultCurrency(),
  }
}

let prefs: Prefs = load()
const listeners = new Set<() => void>()
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

export function resolveTheme(theme: ThemePref): 'light' | 'dark' {
  if (theme === 'system') return darkQuery.matches ? 'dark' : 'light'
  return theme
}

export function applyTheme() {
  const resolved = resolveTheme(prefs.theme)
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved])
}

darkQuery.addEventListener('change', () => {
  if (prefs.theme === 'system') applyTheme()
})

function update(next: Prefs) {
  prefs = next
  for (const listener of listeners) listener()
}

export function setTheme(theme: ThemePref) {
  if (theme === 'system') {
    try {
      localStorage.removeItem(THEME_KEY)
    } catch {
      // nada que limpiar
    }
  } else {
    write(THEME_KEY, theme)
  }
  update({ ...prefs, theme })
  applyTheme()
}

export function setCurrency(currency: string) {
  write(CURRENCY_KEY, currency)
  update({ ...prefs, currency })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => prefs)
}
