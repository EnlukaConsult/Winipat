// Service worker — keep this defensive. A buggy SW silently breaks
// every fetch on the site for users who already installed it; bumping
// CACHE_NAME is the only way to force them onto a new version.
const CACHE_NAME = "winipat-v2";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) — Cache API rejects chrome-extension://, blob:, data:.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Skip cross-origin entirely. Supabase auth, Resend, Paystack, Vercel CDN
  // all live on other origins; intercepting them just adds a failure point.
  if (url.origin !== self.location.origin) return;

  // Skip non-GET — POST/PUT/PATCH/DELETE can't be cached, intercepting
  // them only risks rejecting the request. Was the root cause of an iOS
  // "TypeError: Load failed" surfaced from auth signup POSTs.
  if (request.method !== "GET") return;

  // Navigation requests: network-first, offline-page fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Static GET assets: cache-first with network fallback. Crucially, the
  // network branch has a .catch() so a transient fetch failure doesn't
  // reject respondWith and surface as a TypeError to the page.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (
            response.status === 200 &&
            request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2?)$/)
          ) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {
                /* cache write failures are non-fatal */
              });
          }
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
