import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Search, Trash2, UserPlus, FilePlus2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, deletePerson, savePerson } from '../db/database'
import type { Person } from '../types'
import { formatCpf, formatCurrency, isValidCpf, normalizeCpf, normalizeText, parseCurrencyToCents, searchText } from '../utils/format'
import { Button, ConfirmDialog, EmptyState, Field, Modal } from '../components/ui'

interface PersonFormState { name: string; cpf: string; propertyAddress: string; rent: string }
const emptyForm: PersonFormState = { name: '', cpf: '', propertyAddress: '', rent: '' }

export function PeoplePage({ onGenerate, notify }: { onGenerate: (person: Person) => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const people = useLiveQuery(() => db.persons.orderBy('searchName').toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Person | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)
  const filtered = useMemo(() => people.filter((person) => person.searchName.includes(searchText(query))), [people, query])

  return <section className="page"><header className="page-header"><div><h1>Pessoas</h1><p>Cadastre quem paga o aluguel.</p></div><Button className="fab" onClick={() => setEditing('new')} aria-label="Adicionar pessoa"><Plus /></Button></header>
    {people.length > 0 && <div className="search-wrap"><Search size={20}/><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar pelo nome" aria-label="Pesquisar pessoas" /></div>}
    {filtered.length ? filtered.map((person) => <article className="card person-card" key={person.id}><div className="person-row"><div className="row-icon"><span>{person.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</span></div><div className="row-main"><span className="row-title">{person.name}</span><span className="row-subtitle">{formatCpf(person.cpf)} · {formatCurrency(person.defaultRentCents)}</span><span className="row-subtitle">{person.propertyAddress}</span></div><div className="person-actions"><button className="icon-button" onClick={() => setEditing(person)} aria-label={`Editar ${person.name}`}><Pencil size={19}/></button><button className="icon-button" onClick={() => setDeleting(person)} aria-label={`Excluir ${person.name}`}><Trash2 size={19}/></button></div></div><Button variant="secondary" className="full" onClick={() => onGenerate(person)}><FilePlus2 size={19}/>Gerar recibo</Button></article>) : <div className="card"><EmptyState icon={<UserPlus/>} title={query ? 'Nenhuma pessoa encontrada' : 'Cadastre a primeira pessoa'}>{query ? 'Tente pesquisar por outro nome.' : 'Depois do cadastro, gerar um recibo leva poucos toques.'}</EmptyState></div>}
    {editing && <PersonForm person={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); notify('Pessoa salva com sucesso.', 'success') }} />}
    {deleting && <ConfirmDialog title="Excluir pessoa?" confirmLabel="Excluir pessoa" danger onCancel={() => setDeleting(null)} onConfirm={async () => { await deletePerson(deleting.id); setDeleting(null); notify('Pessoa excluída. Os recibos antigos foram preservados.', 'success') }}>Os recibos já emitidos para {deleting.name} continuarão no histórico.</ConfirmDialog>}
  </section>
}

function PersonForm({ person, onCancel, onSaved }: { person?: Person; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PersonFormState>(person ? { name: person.name, cpf: formatCpf(person.cpf), propertyAddress: person.propertyAddress, rent: formatCurrency(person.defaultRentCents) } : emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof PersonFormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const update = (key: keyof PersonFormState, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    const name = normalizeText(form.name)
    const address = normalizeText(form.propertyAddress)
    const cpf = normalizeCpf(form.cpf)
    const cents = parseCurrencyToCents(form.rent)
    if (!name) nextErrors.name = 'Informe o nome completo.'
    if (!isValidCpf(cpf)) nextErrors.cpf = 'Informe um CPF válido.'
    if (!address) nextErrors.propertyAddress = 'Informe o endereço do imóvel.'
    if (cents <= 0 || !Number.isSafeInteger(cents)) nextErrors.rent = 'Informe um valor maior que zero.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    try {
      await savePerson({ id: person?.id ?? crypto.randomUUID(), name, searchName: searchText(name), cpf, propertyAddress: address, defaultRentCents: cents, createdAt: person?.createdAt })
      onSaved()
    } finally { setSaving(false) }
  }
  return <Modal title={person ? 'Editar pessoa' : 'Nova pessoa'} onClose={onCancel}><form onSubmit={submit} noValidate><Field label="Nome completo" name="name" autoComplete="name" maxLength={150} value={form.name} onChange={(event) => update('name', event.target.value)} error={errors.name}/><Field label="CPF" name="cpf" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(event) => update('cpf', formatCpf(event.target.value))} error={errors.cpf}/><label className="field"><span className="field-label">Endereço do imóvel alugado</span><textarea className={errors.propertyAddress ? 'input input-error' : 'input'} name="address" maxLength={300} value={form.propertyAddress} onChange={(event) => update('propertyAddress', event.target.value)} aria-invalid={Boolean(errors.propertyAddress)}/>{errors.propertyAddress && <span className="field-error">{errors.propertyAddress}</span>}</label><Field label="Valor padrão do aluguel" name="rent" inputMode="numeric" value={form.rent} onChange={(event) => update('rent', formatCurrency(parseCurrencyToCents(event.target.value)))} error={errors.rent}/><div className="button-row"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button></div></form></Modal>
}
