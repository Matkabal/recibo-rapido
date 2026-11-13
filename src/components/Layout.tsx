import { CircleHelp, History, Home, Settings, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TabId } from '../types'

const tabs: Array<{ id: TabId; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'help', label: 'Ajuda', icon: CircleHelp }
]

export function Layout({ active, onChange, children }: { active: TabId; onChange: (tab: TabId) => void; children: ReactNode }) {
  return <div className="app-shell"><main className="main-content">{children}</main><nav className="bottom-nav" aria-label="Navegação principal">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined}><Icon size={21} strokeWidth={active === id ? 2.5 : 2} /><span>{label}</span></button>)}</nav></div>
}
