import Icon from '../atoms/Icon'
import Modal from './Modal'

export default function Sidebar({ items, activeId, onNavigate, open = false, onClose }) {
  const content = <div className="flex h-full flex-col">
    <a href="#ringkasan" onClick={() => { onNavigate('ringkasan'); onClose() }} className="flex items-center gap-3 px-3 text-xl font-semibold tracking-tight">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon name="leaf" className="size-6" /></span>
      <span>Laporan<span className="text-[#E7B780]">Ku.</span></span>
    </a>
    <p className="mb-5 mt-14 px-4 text-[10px] font-semibold tracking-[0.2em] text-white/50">MENU UTAMA</p>
    <nav aria-label="Navigasi utama" className="space-y-2">
      {items.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={activeId === item.id ? 'location' : undefined}
        onClick={() => { onNavigate(item.id); onClose() }}
        className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-colors ${activeId === item.id ? 'bg-white/10 font-semibold text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
        <Icon name={item.icon} />{item.label}{activeId === item.id && <span className="ml-auto size-1.5 rounded-full bg-[#E7B780]" />}
      </a>)}
    </nav>
    <div className="mt-auto pt-12">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4"><Icon name="leaf" className="mb-3 size-6 text-[#E7B780]" /><p className="text-sm font-medium">Catatan kecil, langkah baik.</p><p className="mt-2 text-xs leading-relaxed text-white/60">Kenali arus keuanganmu, mulai dari hari ini.</p></div>
      <p className="mt-7 px-2 text-[11px] text-white/45">LaporanKu · Pembukuan bersama</p>
    </div>
  </div>
  return <>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-primary px-5 py-8 text-white lg:block">{content}</aside>
    <Modal open={open} onClose={onClose} title="Menu navigasi" className="!inset-y-0 !left-0 !right-auto !m-0 !h-dvh !max-h-dvh !w-80 !max-w-[90vw] !rounded-none [&>div:nth-child(2)]:bg-primary [&>div:nth-child(2)]:text-white">{content}</Modal>
  </>
}
