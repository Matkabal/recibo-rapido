// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db/database'
import type { Person } from '../src/types'

vi.mock('../src/services/pdf', () => ({
  generateReceiptPdf: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' }))
}))

const person: Person = {
  id: 'person-1', name: 'João da Silva', searchName: 'joao da silva', cpf: '52998224725',
  propertyAddress: 'Rua Exemplo, 100', defaultRentCents: 85000,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  await db.issuerSettings.put({ id: 'issuer', name: 'Maria Emitente', city: 'Salvador', updatedAt: '2026-01-01T00:00:00.000Z' })
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
  await db.open()
})

describe('emissão de recibos', () => {
  it('separa emissão da referência e reinicia a sequência no ano seguinte', async () => {
    const { issueReceipt } = await import('../src/services/receipts')
    vi.setSystemTime(new Date('2026-11-13T15:30:00-03:00'))
    const first = await issueReceipt({ person, amountCents: 85000, referenceMonth: 10, referenceYear: 2026, paymentConfirmed: true })
    const second = await issueReceipt({ person, amountCents: 90000, referenceMonth: 11, referenceYear: 2026, paymentConfirmed: true })
    expect(first.number).toBe('2026-0001')
    expect(second.number).toBe('2026-0002')
    expect(first.referenceMonth).toBe(10)
    expect(new Date(first.issuedAt).getMonth()).toBe(10)
    vi.setSystemTime(new Date('2027-01-02T10:00:00-03:00'))
    const nextYear = await issueReceipt({ person, amountCents: 85000, referenceMonth: 12, referenceYear: 2026, paymentConfirmed: true })
    expect(nextYear.number).toBe('2027-0001')
  })

  it('evita números duplicados em emissões concorrentes', async () => {
    const { issueReceipt } = await import('../src/services/receipts')
    vi.setSystemTime(new Date('2026-06-10T12:00:00-03:00'))
    const draft = { person, amountCents: 85000, referenceMonth: 6, referenceYear: 2026, paymentConfirmed: true }
    const receipts = await Promise.all([issueReceipt(draft), issueReceipt(draft), issueReceipt(draft)])
    expect(new Set(receipts.map((receipt) => receipt.number)).size).toBe(3)
    expect((await db.annualCounters.get(2026))?.lastSequence).toBe(3)
  })

  it('preserva os dados usados na emissão', async () => {
    const { issueReceipt } = await import('../src/services/receipts')
    vi.setSystemTime(new Date('2026-05-01T12:00:00-03:00'))
    const receipt = await issueReceipt({ person, amountCents: 85000, referenceMonth: 5, referenceYear: 2026, paymentConfirmed: true })
    await db.issuerSettings.put({ id: 'issuer', name: 'Outro nome', city: 'Recife', updatedAt: new Date().toISOString() })
    expect((await db.receipts.get(receipt.id))?.issuerName).toBe('Maria Emitente')
    expect(receipt.tenantName).toBe('João da Silva')
  })
})
