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
