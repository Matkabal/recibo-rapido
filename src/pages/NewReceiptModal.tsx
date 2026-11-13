import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Download, ExternalLink, FileText, Share2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { db } from '../db/database'
import { issueReceipt } from '../services/receipts'
import { downloadBlob, openBlob, shareReceipt } from '../services/files'
import type { Person, Receipt } from '../types'
import { formatCpf, formatCurrency, formatCurrencyInput, filenameForReceipt, parseCurrencyToCents } from '../utils/format'
import { Button, ConfirmDialog, Modal, Spinner } from '../components/ui'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function NewReceiptModal({ initialPerson, onClose, onCreated, goSettings, notify }: { initialPerson?: Person; onClose: () => void; onCreated: (receipt: Receipt) => void; goSettings: () => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const people = useLiveQuery(() => db.persons.orderBy('searchName').toArray(), []) ?? []
  const issuer = useLiveQuery(() => db.issuerSettings.get('issuer'), [])
  const signature = useLiveQuery(() => db.signatures.get('current'), [])
  const [personId, setPersonId] = useState(initialPerson?.id ?? '')
  const person = people.find((entry) => entry.id === personId) ?? initialPerson
  const [amount, setAmount] = useState(initialPerson ? formatCurrencyInput(initialPerson.defaultRentCents) : '')
  const [month, setMonth] = useState(currentMonthValue())
  const [confirmed, setConfirmed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirmNoSignature, setConfirmNoSignature] = useState(false)
  const [result, setResult] = useState<Receipt | null>(null)

  useEffect(() => { if (person) setAmount(formatCurrencyInput(person.defaultRentCents)) }, [person?.id])
  const generate = async (allowWithoutSignature = false) => {
    if (!person) return notify('Escolha uma pessoa.', 'error')
    if (!issuer?.name || !issuer.city) return goSettings()
    if (!signature && !allowWithoutSignature) return setConfirmNoSignature(true)
    const [year, referenceMonth] = month.split('-').map(Number)
    setGenerating(true)
    try {
      const receipt = await issueReceipt({ person, amountCents: parseCurrencyToCents(amount), referenceYear: year, referenceMonth, paymentConfirmed: confirmed })
      setResult(receipt)
      onCreated(receipt)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível gerar o recibo.', 'error')
    } finally { setGenerating(false) }
  }

  if (result) return <ReceiptSuccess receipt={result} onClose={onClose} notify={notify}/>
  return <><Modal title="Gerar novo recibo" onClose={() => !generating && onClose()}><form onSubmit={(event) => { event.preventDefault(); void generate() }}>
    <label className="field"><span className="field-label">Pessoa</span><select className="input" value={personId} onChange={(event) => setPersonId(event.target.value)} required><option value="">Escolha uma pessoa</option>{people.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
    {person && <div className="card" style={{marginBottom:17}}><div className="person-row"><div className="row-icon"><UserRound size={20}/></div><div className="row-main"><span className="row-title">{person.name}</span><span className="row-subtitle">CPF {formatCpf(person.cpf)}</span><span className="row-subtitle">{person.propertyAddress}</span></div></div></div>}
    <label className="field"><span className="field-label">Mês do aluguel</span><input className="input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} required/></label>
    <label className="field"><span className="field-label">Valor recebido</span><input className="input" inputMode="numeric" value={amount} onChange={(event) => setAmount(formatCurrency(parseCurrencyToCents(event.target.value)))} required/></label>
    {!issuer?.name || !issuer.city ? <div className="notice">Antes do primeiro recibo, preencha seu nome e sua cidade em Configurações. <button type="button" className="text-button" onClick={goSettings}>Preencher agora</button></div> : <div className="detail"><small>Emitente</small><strong>{issuer.name} · {issuer.city}</strong></div>}
    <div className="confirm-box"><input id="payment-confirmed" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><label htmlFor="payment-confirmed">Confirmo que o pagamento acima foi realmente recebido.</label></div>
    <Button type="submit" className="full" disabled={!person || !month || !confirmed || generating || !issuer?.name || !issuer.city}>{generating ? <><Spinner/>Gerando PDF…</> : <><FileText size={20}/>Gerar recibo</>}</Button>
  </form></Modal>
  {confirmNoSignature && <ConfirmDialog title="Gerar sem assinatura?" confirmLabel="Gerar sem assinatura" onCancel={() => setConfirmNoSignature(false)} onConfirm={() => { setConfirmNoSignature(false); void generate(true) }}>Você ainda não cadastrou uma assinatura. O recibo será gerado com a linha de assinatura em branco.</ConfirmDialog>}</>
}

function ReceiptSuccess({ receipt, onClose, notify }: { receipt: Receipt; onClose: () => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const share = async () => {
    const result = await shareReceipt(receipt)
    if (result === 'downloaded') notify('Compartilhamento de arquivos indisponível. O PDF foi baixado.', 'success')
  }
  return <Modal title="Recibo pronto" onClose={onClose}><div className="empty-state" style={{paddingTop:10}}><div className="empty-icon" style={{background:'#dcfce7',color:'#16a34a'}}><CheckCircle2/></div><h3>Salvo no celular</h3><p>Recibo Nº {receipt.number} gerado e guardado no histórico.</p></div><div className="details-grid"><Button variant="secondary" onClick={() => openBlob(receipt.pdfBlob)}><ExternalLink size={19}/>Abrir PDF</Button><Button variant="secondary" onClick={() => downloadBlob(receipt.pdfBlob, filenameForReceipt(receipt.number))}><Download size={19}/>Baixar</Button></div><Button className="full" style={{marginTop:10}} onClick={() => void share()}><Share2 size={19}/>Compartilhar PDF</Button><Button variant="ghost" className="full" onClick={onClose}>Concluir</Button></Modal>
}
