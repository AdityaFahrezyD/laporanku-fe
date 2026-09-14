// Dashboard-owned memory only. Nothing is persisted or shared between sessions.
export function createQueryStore({ scope = 'guest', now = Date.now, staleTime = 60000, maxPages = 30 } = {}) {
  const entries = new Map()
  const listeners = new Set()
  let revision = 0
  let generation = 0
  let access = 0
  let retryAt = 0
  let observedAt = 0
  let cooldownError = null
  const publish = () => { revision++; listeners.forEach(listener => listener()) }
  const clear = () => {
    generation++
    entries.clear()
    retryAt = 0
    observedAt = 0
    cooldownError = null
    publish()
  }
  const trim = (activeKey) => {
    const pages = [...entries].filter(([, entry]) => entry.page)
    pages.sort((a, b) => a[1].access - b[1].access)
    let count = pages.length
    for (const [key] of pages) {
      if (count <= maxPages) break
      if (key === activeKey) continue
      entries.delete(key)
      count--
    }
  }
  const block = (error) => {
    if (error?.retryAt) {
      retryAt = Math.max(retryAt, error.retryAt)
      observedAt = now()
      cooldownError = error
      publish()
    }
  }
  return {
    scope,
    getSnapshot: () => revision,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        // React StrictMode resubscribes synchronously; a real unmount clears data.
        queueMicrotask(() => { if (!listeners.size) clear() })
      }
    },
    peek: key => entries.get(key),
    cooldown: () => ({ retryAt, observedAt, error: cooldownError }),
    clear,
    block,
    invalidate() {
      generation++
      for (const [key, entry] of entries) entries.set(key, { ...entry, invalidated: true, fetching: false, pending: null, error: null })
      publish()
    },
    ensure(key, loader, { force = false, page = false } = {}) {
      let entry = entries.get(key)
      if (entry) entry.access = ++access
      if (entry?.pending) return entry.pending
      if (now() < retryAt) return Promise.resolve()
      if (!force && entry?.data !== undefined && !entry.invalidated && now() - entry.updatedAt < staleTime) return Promise.resolve(entry.data)
      const epoch = generation
      entry = { ...entry, access: ++access, page, fetching: true, error: null }
      entries.set(key, entry)
      const current = () => epoch === generation && entries.get(key) === entry
      entry.pending = Promise.resolve().then(loader).then(data => {
        if (!current()) return
        entries.set(key, { ...entry, data, updatedAt: now(), invalidated: false, fetching: false, pending: null, error: null })
        if (now() >= retryAt) cooldownError = null
        trim(key)
        publish()
        return data
      }, error => {
        if (!current()) return
        entries.set(key, { ...entry, fetching: false, pending: null, error })
        block(error)
        publish()
      })
      trim(key)
      publish()
      return entry.pending
    },
  }
}
