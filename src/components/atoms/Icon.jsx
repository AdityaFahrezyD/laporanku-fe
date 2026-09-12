const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  wallet: 'M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v11H5a3 3 0 0 1-3-3V6 M21 12h-6v5h6 M17 14.5h.01',
  arrows: 'M4 7h15l-4-4 M20 17H5l4 4 M19 7l-4 4 M5 17l4-4',
  up: 'M7 17 17 7 M7 7h10v10',
  down: 'M7 7l10 10 M7 17h10V7',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  chevron: 'm9 5 7 7-7 7',
  info: 'M12 11v6 M12 7h.01',
  bank: 'm3 8 9-5 9 5H3 M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18',
  leaf: 'M20 4C7 1 1 10 7 16s15 0 13-12Z M5 20 16 9',
}

export default function Icon({ name, className = 'size-5', ...props }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
    {name === 'info' && <circle cx="12" cy="12" r="9" />}
    <path d={paths[name] || paths.grid} />
  </svg>
}
