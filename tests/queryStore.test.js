import test from 'node:test'
import assert from 'node:assert/strict'
import { createQueryStore } from '../src/services/queryStore.js'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('fresh results are reused for 60 seconds and stale results remain during revalidation', async () => {
  let time = 1000, requests = 0
  const store = createQueryStore({ now: () => time })
  await store.ensure('page', async () => { requests++; return { rows: ['old'], total: '100.00' } }, { page: true })
  time += 59999
  await store.ensure('page', async () => { requests++; return 'unexpected' })
  assert.equal(requests, 1)
  time++
  const next = deferred()
  const loading = store.ensure('page', () => { requests++; return next.promise }, { page: true })
  assert.deepEqual(store.peek('page').data, { rows: ['old'], total: '100.00' })
  assert.equal(store.peek('page').fetching, true)
  next.resolve({ rows: ['new'], total: '200.00' })
  await loading
  assert.deepEqual(store.peek('page').data, { rows: ['new'], total: '200.00' })
  assert.equal(requests, 2)
})

test('concurrent readers share a request; force refresh bypasses age but also deduplicates', async () => {
  const store = createQueryStore()
  const next = deferred()
  let calls = 0
  const loader = () => { calls++; return next.promise }
  const one = store.ensure('summary', loader)
  const two = store.ensure('summary', loader, { force: true })
  assert.equal(one, two)
  next.resolve('first')
  await one
  assert.equal(calls, 1)
  await store.ensure('summary', async () => 'second', { force: true })
  assert.equal(store.peek('summary').data, 'second')
})

test('page LRU is limited to 30 and does not evict master data', async () => {
  const store = createQueryStore()
  await store.ensure('wallets', async () => [])
  for (let i = 0; i < 30; i++) await store.ensure('page' + i, async () => i, { page: true })
  await store.ensure('page0', async () => 0, { page: true })
  await store.ensure('page30', async () => 30, { page: true })
  assert.equal(store.peek('page1'), undefined)
  assert.equal(store.peek('page0').data, 0)
  assert.equal(store.peek('page30').data, 30)
  assert.deepEqual(store.peek('wallets').data, [])
})

test('mutations invalidate every result and superseded responses cannot refill the cache', async () => {
  const store = createQueryStore()
  await store.ensure('page', async () => 'previous')
  await store.ensure('otherPage', async () => 'other')
  const old = deferred()
  const first = store.ensure('page', () => old.promise, { force: true })
  await Promise.resolve()
  store.invalidate()
  assert.equal(store.peek('page').data, 'previous')
  assert.equal(store.peek('otherPage').invalidated, true)
  await store.ensure('page', async () => 'after mutation')
  old.resolve('before mutation')
  await first
  assert.equal(store.peek('page').data, 'after mutation')
})

test('cooldown allows cached reads, blocks requests and expires without automatic retry', async () => {
  let time = 1000, calls = 0
  const store = createQueryStore({ now: () => time })
  await store.ensure('page', async () => ['saved'])
  const error = { status: 429, retryAt: 61000 }
  await store.ensure('page', async () => { throw error }, { force: true })
  assert.deepEqual(store.peek('page').data, ['saved'])
  assert.equal(store.peek('page').error, error)
  await store.ensure('unseen', async () => { calls++ })
  assert.equal(store.peek('unseen'), undefined)
  time = 62000
  assert.equal(calls, 0)
  await store.ensure('unseen', async () => { calls++; return [] })
  assert.equal(calls, 1)
})

test('errors preserve existing results but never manufacture a zero for an unseen query', async () => {
  const store = createQueryStore()
  await store.ensure('existing', async () => ({ total: '99.00' }))
  const failure = new Error('offline')
  for (const key of ['existing', 'new']) await store.ensure(key, async () => { throw failure }, { force: true })
  assert.equal(store.peek('existing').data.total, '99.00')
  assert.equal(store.peek('new').data, undefined)
})

test('dashboard unmount clears memory and rejects pending old-session writes; StrictMode reattach keeps requests', async () => {
  const store = createQueryStore()
  let unsubscribe = store.subscribe(() => {})
  const request = deferred()
  const pending = store.ensure('page', () => request.promise)
  unsubscribe()
  unsubscribe = store.subscribe(() => {})
  await Promise.resolve()
  assert.equal(store.peek('page').pending, pending)
  unsubscribe()
  await Promise.resolve()
  request.resolve('old session')
  await pending
  assert.equal(store.peek('page'), undefined)
  const otherUser = createQueryStore()
  assert.equal(otherUser.peek('page'), undefined)
})
