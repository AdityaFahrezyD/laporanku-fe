import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (['/login', '/api/login'].includes(window.location.pathname.replace(/\/$/, ''))) {
  window.location.replace('/admin' + window.location.search + window.location.hash)
} else createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
