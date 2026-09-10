import { useState } from 'react'

export default function Placeholder({ src, alt = '', label = 'Belum ada gambar', description = 'Pratinjau gambar akan tampil di sini.', className = '', imageClassName = '', ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src

  return <div {...props} className={`flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-primary/20 bg-base/50 ${className}`}>
    {showImage ? <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={`h-full w-full object-cover ${imageClassName}`} /> : <div className="p-5 text-center">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 size-9 text-primary/45"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></svg>
      <p className="text-sm font-medium text-primary">{src ? 'Gambar tidak dapat dimuat' : label}</p>
      {description && <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>}
    </div>}
  </div>
}
