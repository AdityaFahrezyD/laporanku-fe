export default function Card({ title, description, action, children, className = '', ...props }) {
  return <div {...props} className={`min-w-0 max-w-full [overflow-wrap:anywhere] rounded-2xl border border-primary/5 bg-white p-5 shadow-[0_4px_24px_-16px_rgba(31,68,76,0.2)] sm:p-6 ${className}`}>
    {(title || description || action) && <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>{title && <h3 className="text-base font-semibold">{title}</h3>}{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
      {action}
    </div>}
    {children}
  </div>
}
