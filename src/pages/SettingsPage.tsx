import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, Download, FileArchive, PenLine, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, ConfirmDialog, Field, Modal, Spinner } from '../components/ui'
import { db } from '../db/database'
import { SignatureEditor } from '../features/signature/SignatureEditor'
import { createBackup, inspectBackup, type BackupSummary } from '../services/backup'
import { downloadBlob } from '../services/files'
import { formatCpf, isValidCpf, normalizeCpf, normalizeText } from '../utils/format'

export function SettingsPage({ notify }: { notify: (message: string, type?: 'success' | 'error') => void }) {
  const issuer = useLiveQuery(() => db.issuerSettings.get('issuer'), [])
  const signature = useLiveQuery(() => db.signatures.get('current'), [])
  const [form, setForm] = useState({name:'',cpf:'',city:''})
  const [errors,setErrors]=useState<{name?:string;cpf?:string;city?:string}>({})
  const [signatureOpen,setSignatureOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [backup,setBackup]=useState<BackupSummary|null>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const signatureUrl=useBlobUrl(signature?.blob)
  useEffect(()=>{if(issuer)setForm({name:issuer.name,cpf:issuer.cpf?formatCpf(issuer.cpf):'',city:issuer.city})},[issuer])
  const saveIssuer=async(event:React.FormEvent)=>{event.preventDefault();const name=normalizeText(form.name),city=normalizeText(form.city),cpf=normalizeCpf(form.cpf);const next:typeof errors={};if(!name)next.name='Informe seu nome completo.';if(!city)next.city='Informe a cidade de emissão.';if(cpf&&!isValidCpf(cpf))next.cpf='Informe um CPF válido ou deixe vazio.';setErrors(next);if(Object.keys(next).length)return;await db.issuerSettings.put({id:'issuer',name,city,cpf:cpf||undefined,updatedAt:new Date().toISOString()});notify('Dados do emitente salvos.','success')}
  const exportBackup=async()=>{setBusy(true);try{const blob=await createBackup();const date=new Date().toISOString().slice(0,10);downloadBlob(blob,`recibo-rapido-backup-${date}.zip`);notify('Backup criado e baixado.','success')}catch(error){notify(error instanceof Error?error.message:'Não foi possível criar o backup.','error')}finally{setBusy(false)}}
  const chooseBackup=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setBusy(true);try{setBackup(await inspectBackup(file))}catch(error){notify(error instanceof Error?error.message:'Backup inválido.','error')}finally{setBusy(false)}}
  const restore=async()=>{if(!backup)return;setBusy(true);try{await backup.restore();setBackup(null);notify('Backup restaurado com sucesso.','success')}catch{notify('A restauração não foi concluída. Seus dados anteriores foram preservados.','error')}finally{setBusy(false)}}
  return <section className="page"><header className="page-header"><div><h1>Configurações</h1><p>Seus dados ficam somente neste dispositivo.</p></div></header>
    <div className="settings-section"><h2>Dados do emitente</h2><form className="card" onSubmit={saveIssuer} noValidate><Field label="Nome completo" name="issuer-name" value={form.name} onChange={(event)=>setForm({...form,name:event.target.value})} error={errors.name}/><Field label="CPF (opcional)" name="issuer-cpf" inputMode="numeric" value={form.cpf} onChange={(event)=>setForm({...form,cpf:formatCpf(event.target.value)})} error={errors.cpf}/><Field label="Cidade de emissão" name="issuer-city" value={form.city} onChange={(event)=>setForm({...form,city:event.target.value})} error={errors.city}/><Button type="submit" className="full">Salvar dados</Button></form></div>
    <div className="settings-section"><h2>Minha assinatura</h2><div className="card"><div className="signature-preview">{signatureUrl?<img src={signatureUrl} alt="Assinatura atual"/>:<span>Nenhuma assinatura cadastrada</span>}</div><Button className="full" onClick={()=>setSignatureOpen(true)}><PenLine size={19}/>{signature?'Substituir assinatura':'Desenhar ou importar assinatura'}</Button></div></div>
    <div className="settings-section"><h2>Dados e backup</h2><div className="card"><div className="notice"><strong>Aviso importante:</strong><br/>Se você apagar os dados do aplicativo ou do navegador, seus recibos poderão ser perdidos. Faça backups regularmente.</div><Button variant="secondary" className="full" onClick={()=>void exportBackup()} disabled={busy}>{busy?<Spinner/>:<Download size={19}/>}Fazer backup</Button><Button variant="secondary" className="full" style={{marginTop:10}} onClick={()=>fileRef.current?.click()} disabled={busy}><Upload size={19}/>Restaurar backup</Button><input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(event)=>void chooseBackup(event)}/><div className="receipt-row" style={{marginTop:15}}><div className="row-icon"><ShieldCheck size={19}/></div><div className="row-main"><span className="row-title">Armazenamento local</span><span className="row-subtitle">Nada é enviado para servidores.</span></div></div></div></div>
    <div className="settings-section"><h2>Sobre</h2><div className="card"><div className="receipt-row"><div className="row-icon"><FileArchive size={19}/></div><div className="row-main"><span className="row-title">Recibo Rápido</span><span className="row-subtitle">Versão 1.0.0 · Feito para funcionar offline</span></div></div></div></div>
    {signatureOpen&&<SignatureEditor onClose={()=>setSignatureOpen(false)} onSaved={()=>setSignatureOpen(false)} notify={notify}/>} 
    {backup&&<ConfirmDialog title="Restaurar este backup?" confirmLabel="Substituir e restaurar" danger onCancel={()=>setBackup(null)} onConfirm={()=>void restore()}>Backup de {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(backup.createdAt))}, com {backup.people} pessoas e {backup.receipts} recibos. Os dados atuais serão substituídos somente após a validação completa.</ConfirmDialog>}
    {busy&&backup&&<Modal title="Restaurando…" onClose={()=>{}}><div className="empty-state"><ArchiveRestore/><p>Aguarde sem fechar o aplicativo.</p></div></Modal>}
  </section>
}

function useBlobUrl(blob?:Blob):string|undefined{const[url,setUrl]=useState<string>();useEffect(()=>{if(!blob){setUrl(undefined);return}const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next)},[blob]);return url}
