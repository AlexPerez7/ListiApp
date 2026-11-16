import { CURRENCIES } from './currencies'

const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency)
  if (!formatter) {
    const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? 'es-CL'
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
    formatters.set(currency, formatter)
  }
  return formatter
}

export function currencyDecimals(currency: string): number {
  return formatterFor(currency).resolvedOptions().maximumFractionDigits ?? 2
}

export function formatPrice(value: number, currency: string): string {
  return formatterFor(currency).format(value)
}

/**
 * Interpreta lo que el usuario escribió como precio. Acepta coma o punto
 * decimal y separadores de miles ("1.490", "1.490,50", "12,5"). En monedas
 * sin decimales (ej: CLP) puntos y comas son siempre separadores de miles.
 */
export function parsePrice(text: string, currency: string): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, '')
  if (!cleaned) return undefined

  let normalized: string
  if (currencyDecimals(currency) === 0) {
    normalized = cleaned.replace(/[.,]/g, '')
  } else {
    const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','))
    if (lastSeparator === -1) {
      normalized = cleaned
    } else {
      const integerPart = cleaned.slice(0, lastSeparator).replace(/[.,]/g, '')
      const decimalPart = cleaned.slice(lastSeparator + 1)
      // "1.490" o "12,000": tres dígitos tras el único separador son miles.
      const isThousands = decimalPart.length === 3 && integerPart.length > 0
      normalized = isThousands ? `${integerPart}${decimalPart}` : `${integerPart || '0'}.${decimalPart}`
    }
  }

  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0 || value >= 100_000_000) return undefined
  return Math.round(value * 100) / 100
}

/** Texto para precargar el campo de precio al editar. */
export function priceToInput(value: number | undefined, currency: string): string {
  if (value == null) return ''
  const decimals = currencyDecimals(currency)
  const fixed = decimals === 0 ? String(Math.round(value)) : String(value)
  return fixed.replace('.', ',')
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
