export default function Label({ htmlFor, required = false, className = '', children, ...props }) {
  return <label {...props} htmlFor={htmlFor} className={`block text-sm font-medium text-primary ${className}`}>
    {children}{required && <><span aria-hidden="true" className="ml-1 text-secondary">*</span><span className="sr-only"> (wajib)</span></>}
  </label>
}
