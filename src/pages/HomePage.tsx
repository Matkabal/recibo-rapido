import { useLiveQuery } from 'dexie-react-hooks'
import { FilePlus2, FileText, ReceiptText, Users } from 'lucide-react'
import { db } from '../db/database'
import type { Receipt } from '../types'
import { formatCurrency, formatShortDate } from '../utils/format'
import { Button, EmptyState } from '../components/ui'

export function HomePage({ onNew, onHistory }: { onNew: () => void; onHistory: () => void }) {
  const peopleCount = useLiveQuery(() => db.persons.count(), []) ?? 0
  const receiptCount = useLiveQuery(() => db.receipts.count(), []) ?? 0
  const recent = useLiveQuery(() => db.receipts.orderBy('issuedAt').reverse().limit(3).toArray(), []) ?? []
  return <section className="page"><header className="brand"><div className="brand-mark"><ReceiptText size={27}/></div><div><h1>Recibo Rápido</h1><p>Simples, rápido e organizado</p></div></header>
    <div className="hero"><h2>Pronto para gerar?</h2><p>Escolha uma pessoa, confira o mês e gere o recibo em PDF.</p><Button onClick={onNew}><FilePlus2 size={20}/>Gerar novo recibo</Button></div>
    <div className="stats"><div className="stat"><strong>{peopleCount}</strong><span>{peopleCount === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}</span></div><div className="stat"><strong>{receiptCount}</strong><span>{receiptCount === 1 ? 'recibo emitido' : 'recibos emitidos'}</span></div></div>
    <div className="section-heading"><h2>Recibos recentes</h2>{recent.length > 0 && <button className="text-button" onClick={onHistory}>Ver histórico</button>}</div>
    <div className="card">{recent.length ? recent.map((receipt, index) => <ReceiptRow receipt={receipt} key={receipt.id} divided={index < recent.length - 1}/>) : <EmptyState icon={<FileText/>} title="Nenhum recibo ainda">Quando você gerar um recibo, ele aparecerá aqui.</EmptyState>}</div>
  </section>
}

function ReceiptRow({ receipt, divided }: { receipt: Receipt; divided?: boolean }) {
  return <div className="receipt-row" style={divided ? {borderBottom:'1px solid #edf1f5'} : undefined}><div className="row-icon"><FileText size={19}/></div><div className="row-main"><span className="row-title">{receipt.tenantName}</span><span className="row-subtitle">{formatShortDate(receipt.issuedAt)} · Nº {receipt.number}</span></div><span className="row-value">{formatCurrency(receipt.amountCents)}</span></div>
}
