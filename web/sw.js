/* Almanaque — service worker.
   El caso normal es estar adentro del súper sin señal, así que el shell se
   sirve siempre desde cache y los datos usan stale-while-revalidate: mostrás
   lo último que tenés al instante y se actualiza atrás si hay red. */

/* Bumpear en cada deploy: el shell es cache-first y si no cambia la constante
   la versión vieja se queda para siempre. */
const CACHE = 'almanaque-v3';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icon.svg',
  'fonts/archivo-latin.woff2',
  'fonts/archivo-latinext.woff2',
  // Sin esto, la primera visita nunca guarda los datos: instalás la app,
  // entrás al súper sin señal y no hay nada que mostrar.
  'promos.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // promos.json: stale-while-revalidate.
  if (url.pathname.endsWith('promos.json')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cacheado = await cache.match(request);
        const red = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cacheado);

        // Si servimos del cache, la revalidación queda huérfana y el navegador
        // puede matar al SW antes del cache.put. waitUntil la mantiene viva.
        if (cacheado) e.waitUntil(red.catch(() => {}));
        return cacheado ?? red;
      }),
    );
    return;
  }

  // Shell: cache primero.
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copia));
          }
          return res;
        }),
    ),
  );
});
