// ============================================================
//  AQUASENSE SERVICE WORKER
//  Estrategia:
//   - Páginas/CSS/JS/fuentes/CDN -> cache-first (funciona offline)
//   - API (getDatos, getAlertas)  -> network-first, cae a cache
//     con la última respuesta buena si no hay internet
//   - Peticiones que NO son GET (sendDato, login, etc.) -> nunca
//     se interceptan, van directo a la red como siempre
// ============================================================
 
const CACHE_VERSION = 'aquasense-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;
 
// Ajusta esta lista si agregas o renombras páginas
const STATIC_ASSETS = [
  './',
  './index.html',
  './Histórico.html',
  './alertas.html',
  './sensores.html',
  './umbrales.html',
  './reportes.html',
  './login.html',
  './registro.html',
  './css/style.css',
  './js/app.js',
  './js/pwa.js',
  './js/alertas-notif.js',
  './img/log.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
];
 
// Hosts que cuentan como "la API" — incluye producción y pruebas locales
const API_HOSTS = [
  'aquasense-t0pf.onrender.com',
  'localhost',
  '127.0.0.1',
];
 
// Rutas de la API que devuelven datos (network-first + cache de respaldo)
const API_GET_PATHS = ['/getDatos', '/getAlertas', '/getReportes', '/getSensores', '/estadoMedicion'];
 
// ── INSTALL: precachea el "app shell" ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('[SW] Error precacheando:', err))
  );
  self.skipWaiting();
});
 
// ── ACTIVATE: limpia caches viejos de versiones anteriores ──
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
 
// ── FETCH: enruta según método y tipo de recurso ──
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
 
  // Nunca interceptar peticiones que no son GET (POST, PUT, DELETE...).
  // sendDato, login, registro, generarReporte, iniciarMedicion, etc.
  // van directo a la red, tal cual, sin pasar por cache.
  if (request.method !== 'GET') {
    return; // deja que el navegador la maneje normalmente
  }
 
  const esHostAPI = API_HOSTS.some((h) => url.hostname === h);
  const esRutaAPI = API_GET_PATHS.some((p) => url.pathname === p || url.pathname.endsWith(p));
 
  if (esHostAPI && esRutaAPI) {
    event.respondWith(networkFirstAPI(request));
    return;
  }
 
  event.respondWith(cacheFirstStatic(request));
});
 
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
    // Sin cache y sin red: responde array vacío en vez de romper la app
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }
}
 
// App shell (HTML/CSS/JS/fuentes): cache primero, red de respaldo
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
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }
    throw err;
  }
}
