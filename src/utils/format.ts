const cpfDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11)

export function normalizeCpf(value: string): string {
  return cpfDigits(value)
}

export function formatCpf(value: string): string {
  const digits = cpfDigits(value)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function isValidCpf(value: string): boolean {
  const cpf = cpfDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i)
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function parseCurrencyToCents(value: string): number {
  const normalized = value.trim().replace(/R\$/gi, '').replace(/\s/g, '')
  if (!normalized) return 0
  if (normalized.includes(',')) {
    const [wholePart, decimalPart = '', ...extra] = normalized.replace(/\./g, '').split(',')
    if (extra.length || !/^\d*$/.test(wholePart) || !/^\d{0,2}$/.test(decimalPart)) return 0
    const whole = Number(wholePart || '0')
    const decimals = Number(decimalPart.padEnd(2, '0'))
    const cents = whole * 100 + decimals
    return Number.isSafeInteger(cents) ? cents : 0
  }
  const whole = normalized.replace(/\./g, '')
  if (!/^\d+$/.test(whole)) return 0
  const cents = Number(whole) * 100
  return Number.isSafeInteger(cents) ? cents : 0
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function formatCurrencyInput(cents: number): string {
  return formatCurrency(cents).replace(/\s/g, ' ')
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function searchText(value: string): string {
  return normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function monthName(month: number): string {
  return months[month - 1] ?? ''
}

export function formatLongDate(date: Date): string {
  return `${date.getDate()} de ${monthName(date.getMonth() + 1)} de ${date.getFullYear()}`
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
}

export function filenameForReceipt(number: string): string {
  return `recibo-${number}.pdf`
}
