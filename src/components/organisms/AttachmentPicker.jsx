import { useEffect, useState } from 'react'
import { Button, Placeholder } from '../index'
import { ApiError } from '../../services/api'

export default function AttachmentPicker({ file, disabled, onChange, onRemove, onPreparing, index }) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  async function choose(event) {
    const chosen = event.target.files[0]
    if (!chosen) return
    setError('')
    onPreparing(true)
    try {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(chosen.type)) throw new ApiError('Pilih gambar JPG, PNG, WebP, atau AVIF.')
      if (chosen.size > 5 * 1024 * 1024) throw new ApiError('Ukuran gambar maksimal 5 MB.')
      // The backend validates file content, animation and pixel count again.
      const bitmap = await createImageBitmap(chosen)
      const pixels = bitmap.width * bitmap.height
      bitmap.close()
      if (pixels > 4000000) throw new ApiError('Gambar maksimal 4 juta piksel. Perkecil resolusinya sebelum memilih.')
      setPreview(URL.createObjectURL(chosen))
      onChange(chosen)
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'Gambar tidak dapat dibaca oleh browser.') }
    onPreparing(false)
    event.target.value = ''
  }
  return <div className="rounded-xl border border-primary/10 p-3">
    <Placeholder src={file ? preview : ''} alt={file?.name || ''} label={'Bukti transaksi ' + (index + 1)} description="JPG, PNG, WebP, AVIF · maksimal 5 MB / 4 juta piksel" imageClassName="!object-contain" />
    <label className="mt-3 block text-xs font-medium">Pilih gambar {index + 1}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled} onChange={choose} className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-base file:p-2" /></label>
    {file && <p className="mt-2 break-all text-xs text-muted">{file.name}</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    <Button className="mt-2" size="sm" variant="ghost" disabled={disabled} onClick={onRemove}>Hapus slot</Button>
  </div>
}
