import { cloneElement, useId, useState } from 'react'
import { Alert, Button, Modal, Placeholder } from '../index'
import AttachmentPicker from './AttachmentPicker'
import MoneyInput from '../atoms/MoneyInput'
import { FETCH_BASE_URL } from '../../services/api'
import { dateInput, isTransaction, mutate, payload, resources, saveRecord, uploadAttachment } from '../../services/admin'

const inputClass = 'mt-2 w-full rounded-xl border border-primary/20 bg-white px-3 py-2.5 text-sm disabled:bg-base disabled:text-muted'
function Field({ label, name, errors, children }) {
  const id = useId()
  return <div className="text-sm font-medium"><label htmlFor={id}>{label}</label>{cloneElement(children, { id, 'aria-describedby': errors?.[name] ? id + '-error' : undefined })}{errors?.[name] && <p id={id + '-error'} role="alert" className="mt-1 text-xs text-red-700">{errors[name].join(' ')}</p>}</div>
}
export default function RecordEditor({ resource, record, data, onClose, onChanged, onCooldown, blocked }) {
  const meta = resources.find((r) => r.id === resource)
  const transaction = isTransaction(resource)
  const [values, setValues] = useState(() => ({
    name: record?.name || '', type: record?.type || (resource === 'wallets' ? 'bank' : 'income'),
    balance: '0.00', is_active: record?.is_active ?? true,
    amount: record?.amount || '', description: record?.description || '',
    transaction_date: dateInput(record?.transaction_date),
    wallet_id: record?.wallet_id || '', from_wallet_id: record?.from_wallet_id || '', to_wallet_id: record?.to_wallet_id || '', category_id: record?.category_id || '',
  }))
  const [slots, setSlots] = useState([{ id: crypto.randomUUID(), file: null }])
  const [attachments, setAttachments] = useState(record?.attachments || [])
  const [preparing, setPreparing] = useState(0)
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const [progress, setProgress] = useState('')
  const change = (name, value) => setValues((old) => ({ ...old, [name]: value }))
  const locked = busy || preparing > 0 || Boolean(saved)
  function fail(failure) {
    setError(failure)
    onCooldown(failure)
  }
  async function submit(event) {
    event.preventDefault()
    if (busy || preparing > 0 || blocked || uncertain) return
    setBusy(true); setError(null)
    let current = saved
    try {
      if (!current) {
        setProgress('Menyimpan data…')
        current = await saveRecord(resource, record?.[meta.key], payload(resource, values, Boolean(record)))
        setSaved(current)
        setAttachments(current.attachments || [])
      }
      const pending = slots.filter((slot) => slot.file)
      for (let i = 0; i < pending.length; i++) {
        setProgress('Mengunggah gambar ' + (i + 1) + ' dari ' + pending.length + '…')
        const attachment = await uploadAttachment(resource, current[meta.key], pending[i].file)
        setAttachments((old) => [...old, attachment])
        setSlots((old) => old.filter((slot) => slot.id !== pending[i].id))
      }
      onClose()
    } catch (failure) {
      fail(failure)
      if (!failure.status || failure.status >= 500) setUncertain(true)
    } finally { setBusy(false); setProgress(''); if (current) onChanged() }
  }
  async function removeAttachment(attachment) {
    if (busy || blocked || !window.confirm('Hapus gambar ini secara permanen?')) return
    setBusy(true); setError(null)
    try {
      await mutate('/api/' + resource + '/' + (saved || record)[meta.key] + '/attachments/' + attachment.attachment_id, 'DELETE')
      setAttachments((old) => old.filter((a) => a.attachment_id !== attachment.attachment_id))
      onChanged()
    } catch (failure) { fail(failure) } finally { setBusy(false) }
  }
  const props = (name) => ({ name, value: values[name], onChange: (e) => change(name, e.target.value), className: inputClass, disabled: locked, 'aria-invalid': Boolean(error?.errors?.[name]) })
  function walletField(name, label) {
    return <Field label={label} name={name} errors={error?.errors}><select {...props(name)} required><option value="">Pilih dompet</option>{data.wallets.filter((wallet) => wallet.is_active || wallet.wallet_id === values[name]).map((wallet) => <option key={wallet.wallet_id} value={wallet.wallet_id} disabled={!wallet.is_active || (name === 'to_wallet_id' && wallet.wallet_id === values.from_wallet_id)}>{wallet.name}{!wallet.is_active ? ' (nonaktif)' : ''}</option>)}</select></Field>
  }
  return <Modal open onClose={() => { if (!busy && !preparing) onClose() }} title={(record ? 'Edit ' : 'Tambah ') + meta.singular} className="!max-w-2xl">
    <form onSubmit={submit} className="space-y-5">
      {saved && <Alert variant="warning">Data transaksi sudah tersimpan. Gambar yang belum berhasil diunggah dapat dilanjutkan tanpa membuat transaksi baru.</Alert>}
      {error && <Alert variant="error" title="Belum berhasil">{error.message}{Object.entries(error.errors || {}).filter(([key]) => !Object.hasOwn(values, key)).map(([key, messages]) => <p key={key}>{messages.join(' ')}</p>)}</Alert>}
      {uncertain && <Alert variant="warning">Hasil permintaan terakhir belum dapat dipastikan. Tutup form dan muat ulang daftar/detail sebelum mencoba kembali agar data atau gambar tidak tersimpan dua kali.</Alert>}
      {blocked && <p role="status" className="text-sm text-secondary">Batas permintaan tercapai. Tunggu hitungan waktu pada dashboard.</p>}
      {!transaction ? <>
        <Field label="Nama" name="name" errors={error?.errors}><input {...props('name')} required maxLength={resource === 'wallets' ? 50 : 100} /></Field>
        <Field label="Jenis" name="type" errors={error?.errors}><select {...props('type')}>{(resource === 'wallets' ? [['bank', 'Rekening bank'], ['cash', 'Tunai'], ['ewallet', 'E-wallet']] : [['income', 'Income'], ['expense', 'Expenses']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        {resource === 'wallets' && <>
          {!record ? <Field label="Saldo awal (Rp)" name="balance" errors={error?.errors}><MoneyInput {...props('balance')} onValueChange={(value) => change('balance', value)} min="0" required /></Field> : <p className="text-sm text-muted">Saldo berubah melalui transaksi. Dompet dapat dinonaktifkan, tanpa menghapus riwayatnya.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_active} disabled={locked} onChange={(e) => change('is_active', e.target.checked)} />Dompet aktif</label>
        </>}
      </> : <>
        <div className="grid gap-5 sm:grid-cols-2">{resource === 'transfers' ? <>{walletField('from_wallet_id', 'Dompet asal')}{walletField('to_wallet_id', 'Dompet tujuan')}</> : walletField('wallet_id', 'Dompet')}
          <Field label="Nominal (Rp)" name="amount" errors={error?.errors}><MoneyInput {...props('amount')} onValueChange={(value) => change('amount', value)} min="0.01" required /></Field>
          <Field label="Tanggal dan waktu (WIB)" name="transaction_date" errors={error?.errors}><input {...props('transaction_date')} type="datetime-local" required /></Field>
          {resource !== 'transfers' && <Field label="Kategori (opsional)" name="category_id" errors={error?.errors}><select {...props('category_id')}><option value="">Tanpa kategori</option>{data.categories.filter((category) => category.type === meta.singular).map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select></Field>}
        </div>
        {error?.errors?.wallet && <p role="alert" className="text-sm text-red-700">{error.errors.wallet.join(' ')}</p>}
        <Field label="Deskripsi (opsional)" name="description" errors={error?.errors}><textarea {...props('description')} maxLength={255} rows={3} /></Field>
        <section aria-label="Attachment transaksi" className="border-t border-primary/10 pt-5">
          <h3 className="font-semibold">Bukti transaksi <span className="text-xs font-normal text-muted">(opsional)</span></h3>
          <p className="mt-1 mb-4 text-xs text-muted">Gambar dapat dilihat publik. Gambar diunggah satu per satu setelah transaksi tersimpan.</p>
          {attachments.length > 0 && <div className="mb-4 grid gap-3 sm:grid-cols-2">{attachments.map((a) => <div key={a.attachment_id} className="rounded-xl border border-primary/10 p-3">{a.url ? <a href={FETCH_BASE_URL + a.url} target="_blank" rel="noreferrer"><Placeholder src={FETCH_BASE_URL + a.url} alt="Bukti transaksi tersimpan" imageClassName="!object-contain" /></a> : <p className="text-xs">Pratinjau tidak tersedia.</p>}<Button size="sm" variant="ghost" disabled={busy || blocked} onClick={() => removeAttachment(a)}>Hapus gambar tersimpan</Button></div>)}</div>}
          <div className="grid gap-3 sm:grid-cols-2">{slots.map((slot, index) => <AttachmentPicker key={slot.id} index={index} file={slot.file} onPreparing={(active) => setPreparing((count) => count + (active ? 1 : -1))} disabled={busy || preparing > 0 || uncertain} onChange={(file) => setSlots((old) => old.map((s) => s.id === slot.id ? { ...s, file } : s))} onRemove={() => setSlots((old) => old.length === 1 ? [{ id: crypto.randomUUID(), file: null }] : old.filter((s) => s.id !== slot.id))} />)}</div>
          <Button variant="outline" className="mt-3" disabled={busy || preparing > 0 || uncertain} onClick={() => setSlots((old) => [...old, { id: crypto.randomUUID(), file: null }])}>+ Tambah gambar</Button>
        </section>
      </>}
      {preparing > 0 && <p role="status" className="text-sm text-muted">Memeriksa gambar…</p>}{progress && <p role="status" className="text-sm text-muted">{progress}</p>}
      <div className="flex justify-end gap-3 border-t border-primary/10 pt-5"><Button variant="outline" disabled={busy || preparing > 0} onClick={onClose}>{saved || uncertain ? 'Tutup' : 'Batal'}</Button><Button type="submit" loading={busy} disabled={blocked || uncertain || preparing > 0}>{saved ? 'Lanjutkan upload' : 'Simpan'}</Button></div>
    </form>
  </Modal>
}
