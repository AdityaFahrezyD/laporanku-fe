import Button from '../atoms/Button'
import Icon from '../atoms/Icon'

const variants = {
  info: 'border-primary/10 bg-white/60 text-primary',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

export default function Alert({ variant = 'info', title, children, onClose, className = '' }) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${variants[variant]} ${className}`}>
    <Icon name="info" className="mt-0.5 size-5 shrink-0" />
    <div className="min-w-0 flex-1">{title && <p className="font-semibold">{title}</p>}{children && <div className="mt-0.5 leading-relaxed opacity-85">{children}</div>}</div>
    {onClose && <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup pemberitahuan" className="-mr-2 -mt-1 text-inherit"><Icon name="close" className="size-4" /></Button>}
  </div>
}
