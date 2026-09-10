import { ApiError, getJson, requestJson } from './api.js'

export function readCsrfToken(cookie = document.cookie) {
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('XSRF-TOKEN='))
  if (!token) return null
  try { return decodeURIComponent(token.slice('XSRF-TOKEN='.length)) } catch { return null }
}

export async function fetchSession(options) {
  try {
    const user = await getJson('/api/user', options)
    if (!user || typeof user.id !== 'string' || typeof user.role !== 'string') throw new ApiError('Respons sesi tidak valid.')
    return user
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}

let pendingSession
export function loadSession() {
  if (!pendingSession) pendingSession = fetchSession().finally(() => { pendingSession = undefined })
  return pendingSession
}

async function csrfRequest(path, body, options = {}) {
  await requestJson('/sanctum/csrf-cookie', options)
  const csrfToken = readCsrfToken(options.cookie ?? document.cookie)
  if (!csrfToken) throw new ApiError('Cookie sesi tidak tersedia. Periksa pengaturan cookie dan alamat aplikasi.')
  return requestJson(path, { ...options, method: 'POST', csrfToken, body })
}

export async function login(credentials, options) {
  await csrfRequest('/api/login', credentials, options)
  const user = await fetchSession(options)
  if (!user) throw new ApiError('Sesi login tidak terbaca. Periksa konfigurasi domain Sanctum.', 401)
  return user
}

export async function logout(options) {
  try { await csrfRequest('/api/logout', undefined, options) } catch (error) {
    if (error.status !== 401) throw error
  }
}
