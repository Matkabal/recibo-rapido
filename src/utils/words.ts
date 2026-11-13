const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function underThousand(value: number): string {
  if (value === 100) return 'cem'
  const parts: string[] = []
  const h = Math.floor(value / 100)
  const rest = value % 100
  if (h) parts.push(hundreds[h])
  if (rest) {
    if (h) parts.push('e')
    if (rest < 10) parts.push(units[rest])
    else if (rest < 20) parts.push(teens[rest - 10])
    else {
      parts.push(tens[Math.floor(rest / 10)])
      if (rest % 10) parts.push('e', units[rest % 10])
    }
  }
  return parts.join(' ')
}

function integerToWords(value: number): string {
  if (value === 0) return 'zero'
  const groups = [
    { size: 1_000_000_000, one: 'bilhão', many: 'bilhões' },
    { size: 1_000_000, one: 'milhão', many: 'milhões' },
    { size: 1_000, one: 'mil', many: 'mil' }
  ]
  let remaining = value
  const parts: string[] = []
  for (const group of groups) {
    const amount = Math.floor(remaining / group.size)
    if (!amount) continue
    parts.push(group.size === 1_000 && amount === 1 ? 'mil' : `${integerToWords(amount)} ${amount === 1 ? group.one : group.many}`)
    remaining %= group.size
  }
  if (remaining) parts.push(underThousand(remaining))
  return parts.join(remaining > 0 && remaining < 100 ? ' e ' : ' ')
}

export function moneyToWords(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Valor inválido')
  const reais = Math.floor(cents / 100)
  const centavos = cents % 100
  const parts: string[] = []
  if (reais) parts.push(`${integerToWords(reais)} ${reais === 1 ? 'real' : 'reais'}`)
  if (centavos) parts.push(`${integerToWords(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  return parts.length ? parts.join(' e ') : 'zero reais'
}
