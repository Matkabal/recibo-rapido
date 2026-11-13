// @vitest-environment node
import { decodePDFRawStream, PDFDocument, PDFRawStream } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { generateReceiptPdf, receiptPdfText } from '../src/services/pdf'
import type { IssuerSettings, Person } from '../src/types'

const person: Person = {
  id: 'person-1', name: 'João da Silva', searchName: 'joao da silva', cpf: '52998224725',
  defaultRentCents: 85000, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
}
const issuer: IssuerSettings = { id: 'issuer', name: 'José Recebedor', city: 'São Paulo', updatedAt: '2026-01-01T00:00:00.000Z' }

describe('PDF do recibo', () => {
  it('gera uma página legível com acentos usando fonte PDF compatível', async () => {
    const blob = await generateReceiptPdf({ number: '2026-0001', issuedAt: new Date('2026-11-13T12:00:00-03:00'), referenceYear: 2026, referenceMonth: 10, person, amountCents: 85000, issuer })
    const document = await PDFDocument.load(await blob.arrayBuffer())
    expect(document.getPageCount()).toBe(1)
    expect(blob.size).toBeGreaterThan(1_000)
    const content = document.context.enumerateIndirectObjects().flatMap(([, object]) => {
      if (!(object instanceof PDFRawStream)) return []
      try { return [new TextDecoder().decode(decodePDFRawStream(object).decode())] } catch { return [] }
    }).join('\n')
    expect(content).toContain('52454349424F20444520414C554755454C')
    expect(content).not.toContain('4465636C61726F')
    expect(content.match(/ Tj/g)?.length).toBeGreaterThan(8)
  })

  it('monta o conteúdo sem endereço e com o valor correto', () => {
    const text = receiptPdfText({ tenantName: person.name, tenantCpf: person.cpf, amountCents: 85000, referenceMonth: 10, referenceYear: 2026 })
    expect(text).toContain('R$ 850,00')
    expect(text).not.toContain('Rua')
  })
})
