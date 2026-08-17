// ============================================================
//  REGISTRO DEL SERVICE WORKER + PROMPT DE INSTALACIÓN
//  Incluir este script en TODAS las páginas, antes de </body>
// ============================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => console.log('[PWA] Service worker registrado:', reg.scope))
      .catch((err) => console.warn('[PWA] Error registrando service worker:', err));
  });
}

let deferredPrompt = null;

// Chrome/Edge disparan este evento cuando la app es instalable
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'flex';
});

// Llamar desde un botón: onclick="instalarApp()"
function instalarApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    const btn = document.getElementById('install-btn');
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
  console.log('[PWA] AquaSense instalada correctamente');
});
