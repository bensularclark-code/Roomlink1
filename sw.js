// RoomLink service worker — deliberately minimal.
// This only caches the static app shell (this HTML file + icons) so the app
// can install as a PWA and show something if briefly offline. It does NOT
// intercept or cache Supabase API calls, Paystack, or any other network
// request — this app is data-driven and must always show fresh data.

const CACHE_NAME = 'roomlink-shell-v1';
const SHELL_FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // don't fail install if a shell file is briefly unreachable
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isShellFile = SHELL_FILES.includes(url.pathname);

  // Only handle the app shell itself, network-first with a cache fallback.
  // Everything else (Supabase, Paystack, CDN scripts, uploaded photos) is
  // left completely untouched and goes straight to the network as normal.
  if (event.request.method === 'GET' && isSameOrigin && isShellFile) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
