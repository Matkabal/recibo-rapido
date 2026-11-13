import { useLiveQuery } from 'dexie-react-hooks'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Layout } from './components/Layout'
import { Button } from './components/ui'
import { db, requestPersistentStorage } from './db/database'
import { HelpPage } from './pages/HelpPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { NewReceiptModal } from './pages/NewReceiptModal'
import { PeoplePage } from './pages/PeoplePage'
import { SettingsPage } from './pages/SettingsPage'
import type { Person, TabId } from './types'

type ToastState = { message: string; type?: 'success' | 'error' }

export default function App() {
  const [tab,setTab]=useState<TabId>('home')
  const [receiptPerson,setReceiptPerson]=useState<Person|null|undefined>(undefined)
  const [toast,setToast]=useState<ToastState|null>(null)
  const timer=useRef<number>()
  const peopleCount=useLiveQuery(()=>db.persons.count(),[])??0
  const notify=(message:string,type?:'success'|'error')=>{window.clearTimeout(timer.current);setToast({message,type});timer.current=window.setTimeout(()=>setToast(null),4000)}
  const openReceipt=(person?:Person)=>{if(peopleCount===0){setTab('people');notify('Cadastre uma pessoa antes de gerar o primeiro recibo.');return}setReceiptPerson(person??null)}
  useEffect(()=>{void requestPersistentStorage()},[])
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW({onRegisterError:()=>notify('Não foi possível preparar o uso offline.','error')})
  return <><Layout active={tab} onChange={setTab}>{tab==='home'&&<HomePage onNew={()=>openReceipt()} onHistory={()=>setTab('history')}/>} {tab==='people'&&<PeoplePage onGenerate={(person)=>openReceipt(person)} notify={notify}/>} {tab==='history'&&<HistoryPage notify={notify}/>} {tab==='settings'&&<SettingsPage notify={notify}/>} {tab==='help'&&<HelpPage/>}</Layout>
    {receiptPerson!==undefined&&<NewReceiptModal initialPerson={receiptPerson??undefined} onClose={()=>setReceiptPerson(undefined)} onCreated={()=>notify('Recibo gerado e salvo.','success')} goSettings={()=>{setReceiptPerson(undefined);setTab('settings');notify('Preencha os dados do emitente para continuar.')}} notify={notify}/>} 
    {toast&&<div className={`toast ${toast.type??''}`} role="status">{toast.message}</div>}
    {needRefresh&&<div className="update-banner"><RefreshCw size={20}/><p>Uma atualização está pronta. Atualize quando não estiver preenchendo um formulário.</p><Button onClick={()=>void updateServiceWorker(true)}>Atualizar</Button></div>}
  </>
}
