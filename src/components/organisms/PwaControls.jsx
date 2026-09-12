import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Button from '../atoms/Button'

export default function PwaControls() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [deferred, setDeferred] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const registration = useRef(null)
  const reloadApproved = useRef(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, worker) { registration.current = worker },
    // Updating in another tab must never reload this tab's unfinished form.
    onNeedReload() {},
  })
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine)
    const changedWorker = () => { if (reloadApproved.current) window.location.reload() }
    const checkUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') registration.current?.update().catch(() => {})
    }
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    window.addEventListener('online', checkUpdate)
    document.addEventListener('visibilitychange', checkUpdate)
    navigator.serviceWorker?.addEventListener('controllerchange', changedWorker)
    return () => {
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
      window.removeEventListener('online', checkUpdate)
      document.removeEventListener('visibilitychange', checkUpdate)
      navigator.serviceWorker?.removeEventListener('controllerchange', changedWorker)
    }
  }, [])

  async function update() {
    setUpdating(true)
    setMessage('')
    reloadApproved.current = true
    try {
      // Another tab may already have activated the waiting worker.
      if (!registration.current?.waiting) window.location.reload()
      else await updateServiceWorker(true)
    } catch {
      reloadApproved.current = false
      setUpdating(false)
      setMessage('Pembaruan belum berhasil. Periksa koneksi dan coba lagi.')
    }
  }

  if (online && !needRefresh && !message) return null
  return <aside aria-label="Status aplikasi" className="fixed inset-x-3 bottom-3 z-30 max-h-[40dvh] overflow-auto rounded-xl border border-primary/20 bg-white p-4 text-sm text-primary shadow-lg sm:left-auto sm:w-96" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
    {!online && <p role="status" className="mb-2">Koneksi terputus. Data yang tampil mungkin belum terbaru. Menyimpan transaksi membutuhkan internet.</p>}
    {needRefresh && (deferred
      ? <Button size="sm" variant="ghost" onClick={() => setDeferred(false)}>Pembaruan tersedia</Button>
      : <div className="mt-2" role="status">
        <p className="font-medium">Versi baru tersedia</p>
        <p className="mt-1">Memperbarui akan memuat ulang halaman. Selesaikan dan simpan isian form terlebih dahulu.</p>
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={update} loading={updating} disabled={!online}>Perbarui</Button><Button size="sm" variant="outline" onClick={() => setDeferred(true)} disabled={updating}>Nanti</Button></div>
      </div>)}
    {message && <p role="alert" className="mt-2">{message}</p>}
  </aside>
}
