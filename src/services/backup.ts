import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { db } from '../db/database'
import type { AnnualCounter, IssuerSettings, Person, Receipt, Signature } from '../types'

const BACKUP_VERSION = 1

interface ManifestFile {
  path: string
  size: number
  sha256: string
}

interface BackupManifest {
  app: 'recibo-rapido'
  version: number
  createdAt: string
  files: ManifestFile[]
}

interface BackupData {
  persons: Person[]
  issuerSettings: IssuerSettings[]
  signatures: Array<Omit<Signature, 'blob'> & { blobPath: string }>
  receipts: Array<Omit<Receipt, 'pdfBlob' | 'signatureBlob'> & { pdfPath: string; signaturePath?: string }>
  annualCounters: AnnualCounter[]
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createBackup(): Promise<Blob> {
  const [persons, issuerSettings, signatures, receipts, annualCounters] = await Promise.all([
    db.persons.toArray(), db.issuerSettings.toArray(), db.signatures.toArray(), db.receipts.toArray(), db.annualCounters.toArray()
  ])
  const files: Record<string, Uint8Array> = {}
  const signatureData: BackupData['signatures'] = []
  for (const signature of signatures) {
    const path = `binary/signatures/${signature.id}.png`
    files[path] = new Uint8Array(await signature.blob.arrayBuffer())
    signatureData.push({ id: signature.id, width: signature.width, height: signature.height, updatedAt: signature.updatedAt, blobPath: path })
  }
  const receiptData: BackupData['receipts'] = []
  for (const receipt of receipts) {
    const pdfPath = `binary/receipts/${receipt.id}.pdf`
    files[pdfPath] = new Uint8Array(await receipt.pdfBlob.arrayBuffer())
    let signaturePath: string | undefined
    if (receipt.signatureBlob) {
      signaturePath = `binary/receipts/${receipt.id}-signature.png`
      files[signaturePath] = new Uint8Array(await receipt.signatureBlob.arrayBuffer())
    }
    const { pdfBlob: _pdf, signatureBlob: _signature, ...plain } = receipt
    receiptData.push({ ...plain, pdfPath, signaturePath })
  }
  const data: BackupData = { persons, issuerSettings, signatures: signatureData, receipts: receiptData, annualCounters }
  files['data.json'] = strToU8(JSON.stringify(data))
  const manifestFiles: ManifestFile[] = []
  for (const [path, bytes] of Object.entries(files)) manifestFiles.push({ path, size: bytes.length, sha256: await sha256(bytes) })
  const manifest: BackupManifest = { app: 'recibo-rapido', version: BACKUP_VERSION, createdAt: new Date().toISOString(), files: manifestFiles }
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' })
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export interface BackupSummary {
  createdAt: string
  people: number
  receipts: number
  restore: () => Promise<void>
}

export async function inspectBackup(file: File): Promise<BackupSummary> {
  if (file.size > 500 * 1024 * 1024) throw new Error('O arquivo de backup é grande demais para este dispositivo.')
  let archive: Record<string, Uint8Array>
  try {
    archive = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error('Este arquivo não é um backup válido do Recibo Rápido.')
  }
  assert(archive['manifest.json'] && archive['data.json'], 'O backup está incompleto.')
  const manifest = JSON.parse(strFromU8(archive['manifest.json'])) as BackupManifest
  assert(manifest.app === 'recibo-rapido', 'Este arquivo não pertence ao Recibo Rápido.')
  assert(manifest.version === BACKUP_VERSION, 'Esta versão de backup ainda não é compatível.')
  for (const entry of manifest.files) {
    const bytes = archive[entry.path]
    assert(bytes && bytes.length === entry.size, `Arquivo ausente ou incompleto: ${entry.path}`)
    assert((await sha256(bytes)) === entry.sha256, `Falha de integridade em ${entry.path}`)
  }
  const data = JSON.parse(strFromU8(archive['data.json'])) as BackupData
  assert(Array.isArray(data.persons) && Array.isArray(data.receipts) && Array.isArray(data.annualCounters), 'Os dados do backup são inválidos.')
  const people = data.persons.map((record) => {
    const { propertyAddress: _legacyAddress, ...person } = record as Person & { propertyAddress?: string }
    return person
  })
  const receipts: Receipt[] = data.receipts.map((record) => {
    const pdf = archive[record.pdfPath]
    assert(pdf, `PDF ausente no recibo ${record.number}`)
    const signature = record.signaturePath ? archive[record.signaturePath] : undefined
    const { pdfPath: _pdfPath, signaturePath: _signaturePath, ...plain } = record
    return { ...plain, pdfBlob: new Blob([pdf], { type: 'application/pdf' }), signatureBlob: signature ? new Blob([signature], { type: 'image/png' }) : undefined }
  })
  const signatures: Signature[] = data.signatures.map((record) => {
    const bytes = archive[record.blobPath]
    assert(bytes, 'A assinatura do backup está ausente.')
    const { blobPath: _blobPath, ...plain } = record
    return { ...plain, blob: new Blob([bytes], { type: 'image/png' }) }
  })
  const seen = new Set<string>()
  for (const receipt of receipts) {
    assert(!seen.has(receipt.number), `Número duplicado no backup: ${receipt.number}`)
    seen.add(receipt.number)
  }
  const counters = new Map(data.annualCounters.map((item) => [item.year, item.lastSequence]))
  for (const receipt of receipts) counters.set(Number(receipt.number.slice(0, 4)), Math.max(counters.get(Number(receipt.number.slice(0, 4))) ?? 0, receipt.sequence))
  const reconciledCounters = Array.from(counters, ([year, lastSequence]) => ({ year, lastSequence }))

  return {
    createdAt: manifest.createdAt,
    people: data.persons.length,
    receipts: receipts.length,
    restore: async () => {
      await db.transaction('rw', db.persons, db.issuerSettings, db.signatures, db.receipts, db.annualCounters, async () => {
        await Promise.all([db.persons.clear(), db.issuerSettings.clear(), db.signatures.clear(), db.receipts.clear(), db.annualCounters.clear()])
        if (people.length) await db.persons.bulkAdd(people)
        if (data.issuerSettings.length) await db.issuerSettings.bulkAdd(data.issuerSettings)
        if (signatures.length) await db.signatures.bulkAdd(signatures)
        if (receipts.length) await db.receipts.bulkAdd(receipts)
        if (reconciledCounters.length) await db.annualCounters.bulkAdd(reconciledCounters)
      })
    }
  }
}
