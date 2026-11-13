import Dexie, { type EntityTable } from 'dexie'
import type { AnnualCounter, IssuerSettings, Person, Receipt, Signature } from '../types'

class ReceiptDatabase extends Dexie {
  persons!: EntityTable<Person, 'id'>
  issuerSettings!: EntityTable<IssuerSettings, 'id'>
  signatures!: EntityTable<Signature, 'id'>
  receipts!: EntityTable<Receipt, 'id'>
  annualCounters!: EntityTable<AnnualCounter, 'year'>

  constructor() {
    super('recibo-rapido')
    this.version(1).stores({
      persons: 'id, searchName, createdAt, updatedAt',
      issuerSettings: 'id',
      signatures: 'id, updatedAt',
      receipts: 'id, &number, [referenceYear+referenceMonth], referenceYear, issuedAt, searchTenantName, personId',
      annualCounters: 'year'
    })
  }
}

export const db = new ReceiptDatabase()

export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined
  try {
    return await navigator.storage.persist()
  } catch {
    return undefined
  }
}

export async function savePerson(person: Omit<Person, 'createdAt' | 'updatedAt'> & Partial<Pick<Person, 'createdAt'>>): Promise<Person> {
  const now = new Date().toISOString()
  const record: Person = { ...person, createdAt: person.createdAt ?? now, updatedAt: now }
  await db.persons.put(record)
  return record
}

export async function deletePerson(id: string): Promise<void> {
  await db.persons.delete(id)
}

export async function getIssuer(): Promise<IssuerSettings | undefined> {
  return db.issuerSettings.get('issuer')
}

export async function getSignature(): Promise<Signature | undefined> {
  return db.signatures.get('current')
}
