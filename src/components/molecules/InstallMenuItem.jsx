import { useId, useState } from 'react'
import useInstall from '../../hooks/useInstall'
import Icon from '../atoms/Icon'

export default function InstallMenuItem() {
  const installation = useInstall()
  const [helpOpen, setHelpOpen] = useState(false)
  const helpId = useId()
  if (!installation) return null
  const { canInstall, hasPrompt, installing, message, install } = installation
  return <>
    {canInstall && <div>
      <button type="button" className="sidebar-menu-item w-full text-left text-white/65 hover:bg-white/5 hover:text-white disabled:opacity-50"
        disabled={installing} onClick={hasPrompt ? install : () => setHelpOpen((open) => !open)}
        aria-expanded={hasPrompt ? undefined : helpOpen} aria-controls={hasPrompt ? undefined : helpId}>
        <Icon name="download" className="size-5 shrink-0" />
        {hasPrompt ? 'Pasang aplikasi' : 'Cara memasang aplikasi'}
      </button>
      {!hasPrompt && helpOpen && <p id={helpId} className="px-4 py-2 text-xs leading-relaxed text-white/70">Di Safari, buka menu Bagikan, lalu pilih Tambahkan ke Layar Utama.</p>}
    </div>}
    {message && <p role="alert" className="px-4 py-2 text-xs text-white/80">{message}</p>}
  </>
}
