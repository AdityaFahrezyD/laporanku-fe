const variants = {
  primary: 'bg-secondary text-white hover:bg-secondary/90',
  secondary: 'bg-primary text-white hover:bg-primary/90',
  outline: 'border border-primary/20 text-primary hover:bg-primary/5',
  ghost: 'text-primary hover:bg-primary/5',
}

export default function Button({ variant = 'primary', size = 'md', loading = false, disabled = false, type = 'button', className = '', children, ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} ${variants[variant]} ${className}`}>
    {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}
    {children}
  </button>
}
