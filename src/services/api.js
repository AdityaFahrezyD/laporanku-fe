export class ApiError extends Error {
  constructor(message, status = 0, retryAt = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAt = retryAt
  }
}

export async function getJson(path, { fetcher = fetch, baseUrl = import.meta.env?.VITE_API_BASE_URL || '' } = {}) {
  let response
  try {
    response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'GET', credentials: 'include', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.')
  }

  if (!response.ok) {
    if (response.status === 429) {
      const header = response.headers.get('Retry-After')
      const seconds = header && /^\d+$/.test(header) ? Number(header) : null
      const parsedDate = header ? Date.parse(header) : NaN
      const retryAt = seconds !== null ? Date.now() + seconds * 1000 : Number.isFinite(parsedDate) ? parsedDate : Date.now() + 60000
      throw new ApiError('Terlalu banyak permintaan. Tunggu sebelum memuat ulang.', 429, retryAt)
    }
    const messages = {
      401: 'Sesi tidak tersedia. Muat ulang untuk mencoba kembali.',
      403: 'Akses ke data ini tidak diizinkan.',
      404: 'Layanan data tidak ditemukan. Periksa alamat backend.',
      422: 'Permintaan data tidak dapat diproses oleh server.',
    }
    // Never show Laravel debug responses, SQL, or stack traces in the interface.
    throw new ApiError(messages[response.status] || 'Server sedang mengalami gangguan. Silakan coba lagi nanti.', response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('Respons server tidak valid. Periksa alamat backend.')
  }
}
