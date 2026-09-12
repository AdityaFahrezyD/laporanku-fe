import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

// The build list contains public static assets only, never application/API responses.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

registerRoute(
  ({ request, url }) => request.mode === 'navigate'
    && url.origin === self.location.origin
    && !/^\/(api|sanctum)(\/|$)/.test(url.pathname),
  async ({ request }) => {
    try {
      return await fetch(request, { cache: 'no-store' })
    } catch {
      return await matchPrecache('/offline.html') || Response.error()
    }
  },
)

// Activate an update only after the user chooses to refresh.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
