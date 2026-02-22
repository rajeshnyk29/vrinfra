const CACHE_NAME = 'expense-manager-v1';

// Install – cache key pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json']);
    }).catch((err) => console.log('Cache install failed:', err))
  );
  self.skipWaiting();
});

// Activate – remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => (name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()))
      );
    })
  );
  self.clients.claim();
});

// Fetch – serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }
  // Don't cache or intercept app routes that need fresh server response
  const u = new URL(event.request.url);
  if (u.pathname.startsWith('/dashboard') || u.pathname.startsWith('/expenses')) {
    return;
  }
  // Only use cached '/' for page navigations, never for scripts (avoids "Unexpected token '<'")
  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (isNavigation) return caches.match('/');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});