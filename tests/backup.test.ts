// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/database'
import { createBackup, inspectBackup } from '../src/services/backup'

afterEach(async()=>{await db.delete();await db.open()})

describe('backup',()=>{
  it('exporta e restaura pessoas e contadores',async()=>{
    await db.persons.add({id:'p1',name:'Maria',searchName:'maria',cpf:'52998224725',propertyAddress:'Rua A, 1',defaultRentCents:100000,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'})
    await db.annualCounters.add({year:2026,lastSequence:4})
    const blob=await createBackup();await db.persons.clear();await db.annualCounters.clear()
    const summary=await inspectBackup(Object.assign(blob,{name:'backup.zip',lastModified:Date.now()}) as File);await summary.restore()
    expect(await db.persons.count()).toBe(1);expect((await db.annualCounters.get(2026))?.lastSequence).toBe(4)
  })
  it('rejeita arquivo inválido',async()=>{await expect(inspectBackup(new File(['x'],'x.zip'))).rejects.toThrow('backup válido')})
})
