import Dexie from 'dexie'
import { db, getIssuer, getSignature } from '../db/database'
import type { ReceiptDraft, Receipt } from '../types'
import { searchText } from '../utils/format'
import { generateReceiptPdf } from './pdf'

export async function issueReceipt(draft: ReceiptDraft): Promise<Receipt> {
  const issuedAt = new Date()
  const year = issuedAt.getFullYear()
  const issuer = await getIssuer()
  const signature = await getSignature()
  if (!issuer?.name.trim() || !issuer.city.trim()) throw new Error('Preencha o nome e a cidade do emitente antes de gerar o recibo.')
  if (!draft.paymentConfirmed) throw new Error('Confirme que o pagamento foi recebido.')
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0) throw new Error('Informe um valor válido para o aluguel.')

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const observed = await db.annualCounters.get(year)
    const sequence = (observed?.lastSequence ?? 0) + 1
    const number = `${year}-${String(sequence).padStart(4, '0')}`
    const pdfBlob = await generateReceiptPdf({
      number,
      issuedAt,
      referenceYear: draft.referenceYear,
      referenceMonth: draft.referenceMonth,
      person: draft.person,
      amountCents: draft.amountCents,
      issuer,
      signature
    })
    const receipt: Receipt = {
      id: crypto.randomUUID(),
      number,
      sequence,
      issuedAt: issuedAt.toISOString(),
      referenceYear: draft.referenceYear,
      referenceMonth: draft.referenceMonth,
      personId: draft.person.id,
      tenantName: draft.person.name,
      searchTenantName: searchText(draft.person.name),
      tenantCpf: draft.person.cpf,
      propertyAddress: draft.person.propertyAddress,
      amountCents: draft.amountCents,
      issuerName: issuer.name,
      issuerCpf: issuer.cpf,
      issuerCity: issuer.city,
      signatureBlob: signature?.blob,
      pdfBlob
    }
    try {
      await db.transaction('rw', db.annualCounters, db.receipts, async () => {
        const current = await db.annualCounters.get(year)
        if ((current?.lastSequence ?? 0) !== (observed?.lastSequence ?? 0)) throw new Dexie.AbortError('Número atualizado por outra emissão.')
        await db.receipts.add(receipt)
        await db.annualCounters.put({ year, lastSequence: sequence })
      })
      return receipt
    } catch (error) {
      if (error instanceof Dexie.AbortError || (error instanceof DOMException && error.name === 'ConstraintError')) continue
      throw error
    }
  }
  throw new Error('Não foi possível reservar o número do recibo. Tente novamente.')
}
