export interface Person {
  id: string
  name: string
  searchName: string
  cpf: string
  propertyAddress: string
  defaultRentCents: number
  createdAt: string
  updatedAt: string
}

export interface IssuerSettings {
  id: 'issuer'
  name: string
  cpf?: string
  city: string
  updatedAt: string
}

export interface Signature {
  id: 'current'
  blob: Blob
  width: number
  height: number
  updatedAt: string
}

export interface Receipt {
  id: string
  number: string
  sequence: number
  issuedAt: string
  referenceYear: number
  referenceMonth: number
  personId: string | null
  tenantName: string
  searchTenantName: string
  tenantCpf: string
  propertyAddress: string
  amountCents: number
  issuerName: string
  issuerCpf?: string
  issuerCity: string
  signatureBlob?: Blob
  pdfBlob: Blob
}

export interface AnnualCounter {
  year: number
  lastSequence: number
}

export type TabId = 'home' | 'people' | 'history' | 'settings' | 'help'

export interface ReceiptDraft {
  person: Person
  amountCents: number
  referenceYear: number
  referenceMonth: number
  paymentConfirmed: boolean
}
