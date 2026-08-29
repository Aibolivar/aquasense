// ============================================================
//  AQUASENSE SERVICE WORKER
//  Estrategia:
//   - Navegación (páginas HTML) -> network-first, cae a cache
//     si no hay internet. Así nunca queda pegada una versión
//     vieja en caché cuando se corrige un bug y se despliega.
//   - CSS/JS/fuentes/CDN (no cambian tan seguido) -> cache-first
//   - API (getDatos, getAlertas)  -> network-first, cae a cache
//     con la última respuesta buena si no hay internet
//   - Peticiones que NO son GET (sendDato, login, etc.) -> nunca
//     se interceptan, van directo a la red como siempre
// ============================================================
 
const CACHE_VERSION = 'aquasense-v9';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;
 
const STATIC_ASSETS = [
  './',
  './index.html',
  './Histórico.html',
  './alertas.html',
  './recomendaciones.html',
  './sensores.html',
  './umbrales.html',
  './reportes.html',
  './login.html',
  './registro.html',
  './css/style.css',
  './js/app.js',
  './js/pwa.js',
  './js/alertas-notif.js',
  './js/recomendaciones.js',
  './img/log.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
];
 
const API_HOSTS = [
  'aquasense-t0pf.onrender.com',
  'localhost',
  '127.0.0.1',
];
 
const API_GET_PATHS = ['/getDatos', '/getAlertas', '/getReportes', '/getSensores', '/estadoMedicion'];
 
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('[SW] Error precacheando:', err))
  );
  self.skipWaiting();
});
 
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});
 
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
 
  // Nunca interceptar peticiones que no son GET.
  if (request.method !== 'GET') {
    return;
  }
 
  // Navegación (cargar una página HTML): SIEMPRE intenta la red
  // primero. Esto evita que quede pegada una versión vieja rota
  // en caché después de corregir un bug y desplegar de nuevo.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
 
  const esHostAPI = API_HOSTS.some((h) => url.hostname === h);
  const esRutaAPI = API_GET_PATHS.some((p) => url.pathname === p || url.pathname.endsWith(p));
 
  if (esHostAPI && esRutaAPI) {
    event.respondWith(networkFirstAPI(request));
    return;
  }
 
  // CSS/JS/fuentes/íconos: cambian poco, cache-first está bien aquí.
  event.respondWith(cacheFirstStatic(request));
});
 
// Páginas HTML: red primero (siempre la versión más nueva), cae a
// la copia cacheada solo si no hay conexión (modo offline real).
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('./index.html');
  }
}
 
// Datos de sensores/alertas: intenta red primero, si falla usa la última copia cacheada
async function networkFirstAPI(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }
}
 
// CSS/JS/fuentes/imágenes: cache primero, red de respaldo
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
 
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    throw err;
  }
}

