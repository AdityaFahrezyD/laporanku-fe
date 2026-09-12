import { useEffect } from 'react'
import Icon from '../atoms/Icon'
import Modal from './Modal'
import InstallMenuItem from '../molecules/InstallMenuItem'

export default function Sidebar({ items, activeId, onNavigate, open = false, onClose }) {
  useEffect(() => {
    if (!open) return
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) onClose() }
    closeOnDesktop()
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [open, onClose])
  const content = <div className="sidebar-content">
    <a href="#ringkasan" onClick={() => { onNavigate('ringkasan'); onClose() }} className="flex items-center gap-3 px-3 text-xl font-semibold tracking-tight">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon name="leaf" className="size-6" /></span>
      <span>Laporan<span className="text-[#E7B780]">Ku.</span></span>
    </a>
    <p className="sidebar-menu-heading px-4 text-[10px] font-semibold tracking-[0.2em] text-white/50">MENU UTAMA</p>
    <nav aria-label="Navigasi utama" className="sidebar-menu space-y-2">
      {items.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={activeId === item.id ? 'location' : undefined}
        onClick={() => { onNavigate(item.id); onClose() }}
        className={`sidebar-menu-item ${activeId === item.id ? 'bg-white/10 font-semibold text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
        <Icon name={item.icon} />{item.label}{activeId === item.id && <span className="ml-auto size-1.5 rounded-full bg-[#E7B780]" />}
      </a>)}
      <InstallMenuItem />
    </nav>
    <footer className="sidebar-footer">
      <div className="sidebar-blessing rounded-xl border border-white/10 bg-white/5 p-4"><Icon name="leaf" className="mb-3 size-6 text-[#E7B780]" /><p className="text-sm font-medium">Bismillah.</p><p className="mt-2 text-xs leading-relaxed text-white/60">Pencatatan keuangan (masih manual).</p></div>
      <p className="sidebar-credit px-2 text-[11px] text-white/45">LaporanKu · Pembukuan</p>
    </footer>
  </div>
  return <>
    <aside className="fixed inset-y-0 left-0 z-20 hidden h-dvh w-64 overflow-hidden bg-primary text-white lg:block">{content}</aside>
    <Modal open={open} onClose={onClose} title="Menu navigasi" variant="drawer">{content}</Modal>
  </>
}
