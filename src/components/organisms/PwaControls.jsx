import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Button from '../atoms/Button'

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export default function PwaControls() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installed, setInstalled] = useState(standalone)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [iosHelp, setIosHelp] = useState(false)
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
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine)
    const offerInstall = (event) => { event.preventDefault(); setInstallPrompt(event) }
    const installedApp = () => { setInstalled(true); setInstallPrompt(null) }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const changedMode = () => setInstalled(standalone())
    const changedWorker = () => { if (reloadApproved.current) window.location.reload() }
    const checkUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') registration.current?.update().catch(() => {})
    }
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    window.addEventListener('online', checkUpdate)
    window.addEventListener('beforeinstallprompt', offerInstall)
    window.addEventListener('appinstalled', installedApp)
    document.addEventListener('visibilitychange', checkUpdate)
    displayMode.addEventListener('change', changedMode)
    navigator.serviceWorker?.addEventListener('controllerchange', changedWorker)
    return () => {
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
      window.removeEventListener('online', checkUpdate)
      window.removeEventListener('beforeinstallprompt', offerInstall)
      window.removeEventListener('appinstalled', installedApp)
      document.removeEventListener('visibilitychange', checkUpdate)
      displayMode.removeEventListener('change', changedMode)
      navigator.serviceWorker?.removeEventListener('controllerchange', changedWorker)
    }
  }, [])

  async function install() {
    setMessage('')
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
    } catch { setMessage('Pemasangan belum berhasil. Coba melalui menu browser.') }
    finally { setInstallPrompt(null) }
  }

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

  const canInstall = !installed && (installPrompt || ios)
  if (online && !canInstall && !needRefresh && !message) return null
  return <aside aria-label="Status aplikasi" className="fixed inset-x-3 bottom-3 z-30 max-h-[40dvh] overflow-auto rounded-xl border border-primary/20 bg-white p-4 text-sm text-primary shadow-lg sm:left-auto sm:w-96" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
    {!online && <p role="status" className="mb-2">Koneksi terputus. Data yang tampil mungkin belum terbaru. Menyimpan transaksi membutuhkan internet.</p>}
    {canInstall && <div>
      <Button size="sm" variant="outline" onClick={installPrompt ? install : () => setIosHelp((open) => !open)}>{installPrompt ? 'Pasang aplikasi' : 'Cara memasang aplikasi'}</Button>
      {iosHelp && <p className="mt-2">Di Safari, buka menu Bagikan, lalu pilih Tambahkan ke Layar Utama.</p>}
    </div>}
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
