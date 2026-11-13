import { describe, expect, it } from 'vitest'
import { formatCpf, isValidCpf, parseCurrencyToCents } from '../src/utils/format'
import { moneyToWords } from '../src/utils/words'

describe('CPF', () => {
  it('valida e formata CPF', () => { expect(isValidCpf('529.982.247-25')).toBe(true); expect(formatCpf('52998224725')).toBe('529.982.247-25') })
  it('rejeita sequência e dígitos inválidos', () => { expect(isValidCpf('111.111.111-11')).toBe(false); expect(isValidCpf('529.982.247-24')).toBe(false) })
})

describe('valores', () => {
  it.each([['850',85000],['850,50',85050],['R$ 1.234,56',123456]])('interpreta %s como reais', (value, cents) => expect(parseCurrencyToCents(value)).toBe(cents))
  it.each([[0,'zero reais'],[1,'um centavo'],[100,'um real'],[85000,'oitocentos e cinquenta reais'],[123456,'mil duzentos e trinta e quatro reais e cinquenta e seis centavos']])('escreve %i por extenso', (cents,text) => expect(moneyToWords(cents)).toBe(text))
})
