import { useEffect, useState } from 'react'
import { Alert, Button, Icon, Label } from '../components'
import { login } from '../services/auth'

export default function LoginPage({ user, checking, sessionError, onAuthenticated, onLogout }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [now, setNow] = useState(Date.now)
  const retryAt = error?.retryAt || 0
  const retryIn = Math.max(0, Math.ceil((retryAt - now) / 1000))

  useEffect(() => {
    if (user?.role === 'admin') window.location.replace('/')
  }, [user])

  useEffect(() => {
    if (!retryAt) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= retryAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || Date.now() < retryAt) return
    const form = event.currentTarget
    const data = new FormData(form)
    setSubmitting(true)
    setError(null)
    try {
      const account = await login({ email: String(data.get('email')).trim().toLowerCase(), password: data.get('password'), remember: data.get('remember') === 'on' })
      form.reset()
      onAuthenticated(account)
    } catch (failure) {
      setNow(Date.now())
      setError(failure)
    } finally { setSubmitting(false) }
  }

  return <main className="grid min-h-dvh lg:grid-cols-2">
    <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-14 text-white lg:flex">
      <a href="/" className="flex items-center gap-3 text-xl font-semibold"><Icon name="leaf" className="size-8" />LaporanKu.</a>
      <div className="relative z-10 max-w-md"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#E7B780]">Pembukuan bersama</p><h1 className="text-5xl font-semibold leading-tight tracking-tight">Catatan rapi.<br />Pikiran lebih tenang.</h1><p className="mt-6 leading-relaxed text-white/65">Satu tempat untuk melihat dan mengelola perjalanan keuangan bersama.</p></div>
      <p className="text-xs text-white/50">LaporanKu · Ruang administrator</p>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-48 size-[36rem] rounded-full border-[70px] border-white/5" />
    </section>
    <section className="flex items-center justify-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-sm">
        <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted"><span aria-hidden="true">←</span>Kembali ke dashboard</a>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Administrator</p>
        <h2 className="text-3xl font-semibold tracking-tight">Selamat datang kembali</h2>
        <p className="mb-8 mt-3 text-sm leading-relaxed text-muted">Masuk dengan akun admin untuk melanjutkan.</p>
        {checking ? <p role="status" className="text-sm text-muted">Memeriksa sesi…</p> : user?.role === 'admin' ? <p role="status">Membuka dashboard…</p> : user ? <div className="space-y-4">
          <Alert variant="warning" title="Akun ini bukan administrator">Gunakan akun admin untuk mengakses halaman ini.</Alert>
          <Button onClick={onLogout}>Keluar dari akun ini</Button>
          {sessionError && <Alert variant="error">{sessionError.message}</Alert>}
        </div> : <form onSubmit={handleSubmit} className="space-y-5">
          {(error || sessionError) && <Alert variant="error" title="Belum bisa masuk">{error?.message || sessionError.message}</Alert>}
          <div><Label htmlFor="email" required>Email</Label><input id="email" name="email" type="email" autoComplete="username" required disabled={submitting} aria-invalid={Boolean(error?.errors?.email)} aria-describedby={error?.errors?.email ? 'email-error' : undefined} className="mt-2 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm disabled:opacity-60" placeholder="Email admin" />{error?.errors?.email && <p id="email-error" className="mt-2 text-xs text-red-700">{error.errors.email.join(' ')}</p>}</div>
          <div><Label htmlFor="password" required>Password</Label><div className="relative mt-2"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={submitting} aria-invalid={Boolean(error?.errors?.password)} aria-describedby={error?.errors?.password ? 'password-error' : undefined} className="w-full rounded-xl border border-primary/20 bg-white py-3 pl-4 pr-24 text-sm disabled:opacity-60" placeholder="Masukkan password" /><button type="button" aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 text-xs font-medium text-secondary">{showPassword ? 'Sembunyikan' : 'Tampilkan'}</button></div>{error?.errors?.password && <p id="password-error" className="mt-2 text-xs text-red-700">{error.errors.password.join(' ')}</p>}</div>
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="remember" disabled={submitting} className="size-4 accent-secondary" />Ingat saya</label>
          <Button type="submit" loading={submitting} disabled={retryIn > 0} className="w-full">{submitting ? 'Sedang masuk…' : retryIn > 0 ? `Coba lagi dalam ${retryIn} detik` : 'Masuk'}</Button>
        </form>}
      </div>
    </section>
  </main>
}
