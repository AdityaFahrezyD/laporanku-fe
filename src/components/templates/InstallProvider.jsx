import { useEffect, useRef, useState } from 'react'
import { InstallContext } from '../../hooks/useInstall'

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export default function InstallProvider({ children }) {
  const [installed, setInstalled] = useState(standalone)
  const [prompt, setPrompt] = useState(null)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState('')
  const inFlight = useRef(false)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    const offerInstall = (event) => { event.preventDefault(); setPrompt(event); setMessage('') }
    const installedApp = () => { setInstalled(true); setPrompt(null); setMessage('') }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const changedMode = () => { if (standalone()) installedApp() }
    window.addEventListener('beforeinstallprompt', offerInstall)
    window.addEventListener('appinstalled', installedApp)
    displayMode.addEventListener('change', changedMode)
    return () => {
      window.removeEventListener('beforeinstallprompt', offerInstall)
      window.removeEventListener('appinstalled', installedApp)
      displayMode.removeEventListener('change', changedMode)
    }
  }, [])

  async function install() {
    if (!prompt || inFlight.current) return
    inFlight.current = true
    setInstalling(true)
    setMessage('')
    try {
      await prompt.prompt()
      await prompt.userChoice
      // Acceptance is not proof of installation; wait for appinstalled/standalone.
    } catch { setMessage('Pemasangan belum berhasil. Coba melalui menu browser.') }
    finally { setPrompt(null); setInstalling(false); inFlight.current = false }
  }

  return <InstallContext.Provider value={{ canInstall: !installed && Boolean(prompt || ios), hasPrompt: Boolean(prompt), installing, message: installed ? '' : message, install }}>{children}</InstallContext.Provider>
}
