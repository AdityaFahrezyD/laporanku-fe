import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (window.location.pathname.replace(/\/$/, '') === '/login') {
  window.location.replace('/api/login' + window.location.search + window.location.hash)
} else createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
