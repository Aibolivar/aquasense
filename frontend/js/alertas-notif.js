// ============================================================
//  NOTIFICACIONES DE ALERTAS TEMPRANAS
//  Revisa /getAlertas cada 30s. Si aparece una alerta nueva
//  que no se había visto antes, muestra una notificación
//  nativa del sistema operativo (aunque estés en otra pestaña).
//
//  Limitación: solo funciona mientras la app/pestaña sigue
//  abierta en el navegador. Para avisos que lleguen incluso
//  con la app cerrada, se usa el correo (siguiente paso).
// ============================================================
 
(function () {
  const API_ALERTAS = (window.location.hostname !== 'aquasense-t0pf.onrender.com')
    ? `http://${window.location.hostname}:5000`
    : 'https://aquasense-t0pf.onrender.com';
 
  const STORAGE_KEY = 'aq_alertas_vistas';
  const INIT_KEY = 'aq_alertas_notif_inicializado';
 
  function getVistas() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
 
  function guardarVistas(lista) {
    // Solo guarda las últimas 2000 para que no crezca sin límite
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(-2000)));
  }
 
  function pedirPermiso() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
 
  function notificar(mensaje, fecha) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification('🚨 AquaSense — Alerta', {
      body: mensaje,
      icon: './img/log.png',
      tag: mensaje + fecha, // evita que se repita la misma notificación
    });
    n.onclick = () => { window.focus(); n.close(); };
  }
 
  async function revisarAlertas() {
    try {
      const res = await fetch(`${API_ALERTAS}/getAlertas`);
      const data = await res.json(); // [[mensaje, fecha], ...]
 
      const esPrimeraVez = localStorage.getItem(INIT_KEY) !== '1';
 
      const vistas = getVistas();
      const clavesVistas = new Set(vistas);
 
      if (esPrimeraVez) {
        // Primera carga en este navegador: solo "aprende" cuáles
        // alertas ya existen, sin notificar ninguna de golpe.
        guardarVistas(data.map(([msg, fecha]) => msg + fecha));
        localStorage.setItem(INIT_KEY, '1');
        return;
      }
 
      const nuevas = data.filter(([msg, fecha]) => !clavesVistas.has(msg + fecha));
      nuevas.forEach(([msg, fecha]) => notificar(msg, fecha));
 
      guardarVistas(data.map(([msg, fecha]) => msg + fecha));
    } catch (e) {
      // Silencioso: si falla la conexión, simplemente no notifica esta vez
    }
  }
 
  window.addEventListener('DOMContentLoaded', () => {
    pedirPermiso();
    revisarAlertas();
    setInterval(revisarAlertas, 30000);
  });
})();
