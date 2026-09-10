import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchSession, login, logout, readCsrfToken } from '../src/services/auth.js'

test('login initializes CSRF, submits credentials and checks the server session', async () => {
  const calls = []
  const user = { id: 'admin-id', name: 'Admin', role: 'admin' }
  const result = await login({ email: 'admin@example.test', password: 'test-password', remember: true }, {
    cookie: 'another=value; XSRF-TOKEN=encoded%2Btoken%3D',
    fetcher: async (url, options) => {
      calls.push(url)
      assert.equal(options.credentials, 'include')
      if (url === '/login') {
        assert.equal(options.method, 'POST')
        assert.equal(options.headers['X-XSRF-TOKEN'], 'encoded+token=')
        assert.equal(JSON.parse(options.body).remember, true)
      }
      return url === '/api/user' ? new Response(JSON.stringify(user)) : new Response(null, { status: 204 })
    },
  })
  assert.deepEqual(result, user)
  assert.deepEqual(calls, ['/sanctum/csrf-cookie', '/login', '/api/user'])
})

test('guest sessions are null and non-admin roles are preserved', async () => {
  assert.equal(await fetchSession({ fetcher: async () => new Response(null, { status: 401 }) }), null)
  assert.equal((await fetchSession({ fetcher: async () => new Response(JSON.stringify({ id: 'reader', role: 'user' })) })).role, 'user')
})

test('validation errors and expired CSRF are reported without retrying passwords', async () => {
  for (const status of [422, 419, 429]) {
    let attempts = 0
    await assert.rejects(login({ email: 'bad@example.test', password: 'wrong' }, {
      cookie: 'XSRF-TOKEN=token', fetcher: async (url) => {
        if (url === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
        attempts++
        return new Response(JSON.stringify({ errors: { email: ['Email atau password salah.'] } }), { status, headers: { 'Retry-After': '30' } })
      },
    }), (error) => error.status === status && (status !== 422 || error.errors.email[0] === 'Email atau password salah.'))
    assert.equal(attempts, 1)
  }
})

test('missing cookies stop login and malformed cookie values do not throw', async () => {
  assert.equal(readCsrfToken('XSRF-TOKEN=%invalid'), null)
  let requests = 0
  await assert.rejects(login({}, { cookie: '', fetcher: async () => { requests++; return new Response(null, { status: 204 }) } }), /Cookie sesi/)
  assert.equal(requests, 1)
})

test('logout sends CSRF and handles already expired sessions', async () => {
  for (const status of [204, 401]) {
    const requests = []
    await logout({ cookie: 'XSRF-TOKEN=token', fetcher: async (url, options) => {
      requests.push(url)
      if (url === '/logout') { assert.equal(options.method, 'POST'); assert.equal(options.headers['X-XSRF-TOKEN'], 'token') }
      return new Response(null, { status: url === '/logout' ? status : 204 })
    } })
    assert.deepEqual(requests, ['/sanctum/csrf-cookie', '/logout'])
  }
})
