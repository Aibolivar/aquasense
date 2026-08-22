// ============================================================
//  CONFIGURACIÓN DE API
// ============================================================
function getAPIBaseURL() {
  if (window.location.hostname === 'aquasense-t0pf.onrender.com') {
    return 'https://aquasense-t0pf.onrender.com';
  }
  return `http://${window.location.hostname}:5000`;
}
 
const CONFIG = {
  API_BASE_URL: getAPIBaseURL(),
  REFRESH_INTERVAL_MS: 30000,
};
 
// Para cambiar IP: ejecuta cambiarIP() en la consola (F12)
function cambiarIP() {
  const actual = localStorage.getItem('aquasense_ip') || 'localhost';
  const nueva = prompt(`IP actual: ${actual}\n\nIngresa la nueva IP del servidor:`, actual);
  if (nueva && nueva.trim()) {
    localStorage.setItem('aquasense_ip', nueva.trim());
    location.reload();
  }
}
 
// ============================================================
//  RANGOS ÓPTIMOS
//  sensor 1=pH  2=temperatura  3=turbidez  4=oxigeno
// ============================================================
const RANGES = {
  temperatura: { min: 24,  max: 30,  absMin: 20, absMax: 35,  unit: '°C',   label: 'Temperatura' },
  ph:          { min: 6.5, max: 8.5, absMin: 0,  absMax: 14,  unit: 'pH',   label: 'pH' },
  oxigeno:     { min: 5,   max: 10,  absMin: 0,  absMax: 15,  unit: 'mg/L', label: 'Oxígeno Disuelto' },
  turbidez:    { min: 0,   max: 5,   absMin: 0,  absMax: 15,  unit: 'NTU',  label: 'Turbidez' },
};
 
// ============================================================
//  STATE
// ============================================================
let historyChart    = null;
let statusChart     = null;
let alertList       = [];
let readingHistory  = [];
let currentTimeRange = '1H';
let isLoading       = false;
let lastValues      = {};
 
// ============================================================
//  CLOCK
// ============================================================
function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('es-CO', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();
 
// ============================================================
//  API CALLS
// ============================================================
async function fetchLatest() {
  const response = await axios.get(`${CONFIG.API_BASE_URL}/getDatos`);
  const rows = response.data; // [[tipo_sensor, valor, fecha_hora], ...]
 
  const latest = { uptime: 99.0, timestamp: new Date().toISOString() };
  // Toma el valor más reciente de cada sensor (rows viene ORDER BY fecha_hora DESC)
  rows.forEach(([tipo, valor, fecha]) => {
    const t = tipo.toLowerCase();
    if (t === 'temperatura' && latest.temperatura === undefined) latest.temperatura = +valor;
    if (t === 'ph'          && latest.ph          === undefined) latest.ph          = +valor;
    if (t === 'oxigeno'     && latest.oxigeno     === undefined) latest.oxigeno     = +valor;
    if (t === 'turbidez'    && latest.turbidez    === undefined) latest.turbidez    = +valor;
  });
  return latest;
}
 
async function fetchHistory() {
  const response = await axios.get(`${CONFIG.API_BASE_URL}/getDatos`);
  const rows = response.data;
 
  // Agrupa por timestamp
  const map = {};
  rows.forEach(([tipo, valor, fecha]) => {
    if (!map[fecha]) map[fecha] = { timestamp: fecha };
    const t = tipo.toLowerCase();
    if (t === 'temperatura') map[fecha].temperatura = +valor;
    if (t === 'ph')          map[fecha].ph          = +valor;
    if (t === 'oxigeno')     map[fecha].oxigeno     = +valor;
    if (t === 'turbidez')    map[fecha].turbidez    = +valor;
  });
  return Object.values(map).reverse();
}
 
async function fetchAlerts() {
  const response = await axios.get(`${CONFIG.API_BASE_URL}/getAlertas`);
  // [[mensaje, fecha_hora], ...]
  return response.data.map(([mensaje, timestamp]) => ({
    parametro: 'Sistema',
    mensaje,
    severidad: 'alta',
    timestamp,
  }));
}
 
// ============================================================
//  FUNCIÓN PARA FORZAR ACTUALIZACIÓN
// ============================================================
function forceRefresh() {
  refreshData();
  showToast('Actualizando datos...', 'info');
}
 
// ============================================================
//  STATUS HELPERS
// ============================================================
function getStatus(param, value) {
  const r = RANGES[param];
  if (!r || value === undefined) return 'ok';
  if (value < r.absMin || value > r.absMax) return 'alert';
  if (value < r.min    || value > r.max)    return 'warn';
  return 'ok';
}
 
function statusLabel(s)      { return { ok: 'NORMAL', warn: 'ALERTA', alert: 'CRÍTICO' }[s] || 'NORMAL'; }
function statusBadgeClass(s) { return { ok: 'badge-ok', warn: 'badge-warn', alert: 'badge-alert' }[s] || 'badge-ok'; }
function statusCardClass(s)  { return { ok: 'status-ok', warn: 'status-warn', alert: 'status-alert' }[s] || 'status-ok'; }
function statusGlowClass(s)  { return { ok: 'metric-ok-glow', warn: 'metric-warn-glow', alert: 'metric-alert-glow' }[s] || 'metric-ok-glow'; }
function statusColor(s)      { return { ok: 'var(--green)', warn: 'var(--yellow)', alert: 'var(--red)' }[s] || 'var(--green)'; }
function statusFillClass(s)  { return { ok: 'fill-ok', warn: 'fill-warn', alert: 'fill-alert' }[s] || 'fill-ok'; }
 
// ============================================================
//  UPDATE METRIC CARD
// ============================================================
function updateCard(id, param, value, range) {
  if (value === undefined || value === null) return;
  const status = getStatus(param, value);
  const clamp  = Math.max(5, Math.min(95, ((value - range.absMin) / (range.absMax - range.absMin)) * 100));
 
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.className = `metric-card ${statusCardClass(status)} fade-in`;
  card.querySelector('.metric-glow').className = `metric-glow ${statusGlowClass(status)}`;
 
  const badge = document.getElementById(`badge-${id}`);
  if (badge) { badge.className = `metric-status-badge ${statusBadgeClass(status)}`; badge.textContent = statusLabel(status); }
 
  const valEl = document.getElementById(`val-${id}`);
  if (valEl) valEl.textContent = value;
 
  const bar = document.getElementById(`bar-${id}`);
  if (bar) {
    bar.style.width = clamp + '%';
    bar.className   = `range-fill ${statusFillClass(status)}`;
    const dot = bar.querySelector('.range-dot');
    if (dot) dot.style.background = statusColor(status);
  }
 
  const prev    = lastValues[param];
  const trendEl = document.getElementById(`trend-${id}`);
  if (trendEl && prev !== undefined) {
    const diff = value - prev;
    if (Math.abs(diff) < 0.02) {
      trendEl.className   = 'metric-trend trend-flat';
      trendEl.textContent = '— Sin cambio significativo';
    } else if (diff > 0) {
      trendEl.className   = 'metric-trend trend-up';
      trendEl.textContent = `▲ +${Math.abs(diff).toFixed(2)} ${range.unit}`;
    } else {
      trendEl.className   = 'metric-trend trend-down';
      trendEl.textContent = `▼ −${Math.abs(diff).toFixed(2)} ${range.unit}`;
    }
  }
  lastValues[param] = value;
}
 
// ============================================================
//  REFRESH DATA (usado por index.html)
// ============================================================
async function refreshData() {
  if (isLoading) return;
  isLoading = true;
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.innerHTML = '<span class="spinner"></span>';
 
  try {
    const latest = await fetchLatest();
 
    updateCard('temp',  'temperatura', latest.temperatura, RANGES.temperatura);
    updateCard('ph',    'ph',          latest.ph,          RANGES.ph);
    updateCard('od',    'oxigeno',     latest.oxigeno,     RANGES.oxigeno);
    updateCard('turb',  'turbidez',    latest.turbidez,    RANGES.turbidez);
 
    // Uptime card (sin sensor real, se muestra estático)
    const uptimeEl = document.getElementById('val-uptime');
    const uptimeBar = document.getElementById('bar-uptime');
    if (uptimeEl)  uptimeEl.textContent    = '99.0';
    if (uptimeBar) uptimeBar.style.width   = '99%';
 
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
      lastUpdate.innerHTML = `<span class="mini-dot"></span> Actualizado ${new Date().toLocaleTimeString('es-CO', { hour12: false })}`;
    }
 
    // Tabla lecturas
    readingHistory.unshift({
      hora:   new Date().toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      temp:   latest.temperatura ?? '--',
      ph:     latest.ph          ?? '--',
      od:     latest.oxigeno     ?? '--',
      turb:   latest.turbidez    ?? '--',
      status: computeOverallStatus(latest),
    });
    if (readingHistory.length > 10) readingHistory.pop();
    renderReadingsTable();
 
    await refreshHistory();
 
    alertList = await fetchAlerts();
    renderAlerts();
 
    setConnectionStatus(true);
 
  } catch (err) {
    console.error('Error fetching data:', err);
    setConnectionStatus(false);
    showToast('Sin conexión con la API', 'warn');
  } finally {
    isLoading = false;
    if (refreshIcon) refreshIcon.textContent = '↻';
  }
}
 
function computeOverallStatus(d) {
  const statuses = [
    getStatus('temperatura', d.temperatura),
    getStatus('ph',          d.ph),
    getStatus('oxigeno',     d.oxigeno),
    getStatus('turbidez',    d.turbidez),
  ];
  if (statuses.includes('alert')) return 'alert';
  if (statuses.includes('warn'))  return 'warn';
  return 'ok';
}
 
// ============================================================
//  HISTORY CHART
// ============================================================
async function refreshHistory() {
  const data = await fetchHistory();
 
  const labels = data.map(d =>
    new Date(d.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
 
  if (historyChart) {
    historyChart.data.labels           = labels;
    historyChart.data.datasets[0].data = data.map(d => d.temperatura);
    historyChart.data.datasets[1].data = data.map(d => d.ph);
    historyChart.data.datasets[2].data = data.map(d => d.oxigeno);
    historyChart.data.datasets[3].data = data.map(d => d.turbidez);
    historyChart.update('none');
  }
}
 
function initHistoryChart() {
  const canvas = document.getElementById('chart-history');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Temperatura (°C)', data: [], borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: true,  yAxisID: 'y'  },
        { label: 'pH',               data: [], borderColor: '#00e5a0', backgroundColor: 'rgba(0,229,160,0.06)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: false, yAxisID: 'y1' },
        { label: 'O₂ (mg/L)',        data: [], borderColor: '#f5c842', backgroundColor: 'rgba(245,200,66,0.06)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: false, yAxisID: 'y2' },
        { label: 'Turbidez (NTU)',   data: [], borderColor: '#ff4d6a', backgroundColor: 'rgba(255,77,106,0.06)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: false, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#7aa5c5', font: { family: 'Space Mono', size: 10 }, boxWidth: 10, padding: 14 } },
        tooltip: { backgroundColor: '#0e1d2d', borderColor: '#1a3148', borderWidth: 1, titleColor: '#d4e8f5', bodyColor: '#7aa5c5', titleFont: { family: 'Space Mono', size: 10 }, bodyFont: { family: 'Space Mono', size: 10 }, padding: 10 },
      },
      scales: {
        x:  { grid: { color: 'rgba(26,49,72,0.5)' }, ticks: { color: '#3d6b8a', font: { family: 'Space Mono', size: 9 }, maxTicksLimit: 8 }, border: { color: 'rgba(26,49,72,0.8)' } },
        y:  { position: 'left',  title: { display: true, text: '°C', color: '#00d4ff', font: { family: 'Space Mono', size: 9 } }, grid: { color: 'rgba(26,49,72,0.4)' }, ticks: { color: '#3d6b8a', font: { family: 'Space Mono', size: 9 }, maxTicksLimit: 5 }, border: { color: 'rgba(26,49,72,0.8)' } },
        y1: { position: 'right', title: { display: true, text: 'pH', color: '#00e5a0', font: { family: 'Space Mono', size: 9 } }, grid: { drawOnChartArea: false }, ticks: { color: '#3d6b8a', font: { family: 'Space Mono', size: 9 }, maxTicksLimit: 5 }, border: { color: 'rgba(26,49,72,0.8)' }, min: 0, max: 14 },
        y2: { display: false, min: 0, max: 15 },
      },
    },
  });
}
 
// ============================================================
//  STATUS DONUT CHART
// ============================================================
function initStatusChart() {
  const canvas = document.getElementById('chart-status');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'Alerta', 'Crítico'],
      datasets: [{ data: [1, 0, 0], backgroundColor: ['rgba(0,229,160,0.8)', 'rgba(245,200,66,0.8)', 'rgba(255,77,106,0.8)'], borderColor: ['#00e5a0', '#f5c842', '#ff4d6a'], borderWidth: 1, hoverOffset: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0e1d2d', borderColor: '#1a3148', borderWidth: 1, titleColor: '#d4e8f5', bodyColor: '#7aa5c5' } },
    },
    plugins: [{
      id: 'center-text',
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, top, left } } = chart;
        ctx.save();
        const cx = left + width / 2, cy = top + height / 2;
        ctx.font = 'bold 28px Space Mono'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('1', cx, cy - 8);
        ctx.font = '10px Space Mono'; ctx.fillStyle = '#3d6b8a';
        ctx.fillText('PISCINA', cx, cy + 14);
        ctx.restore();
      }
    }],
  });
}
 
// ============================================================
//  ALERTS RENDER
// ============================================================
function renderAlerts() {
  const el    = document.getElementById('alerts-list');
  if (!el) return;
  const count = alertList.length;
  const ac = document.getElementById('alert-count');
  const nc = document.getElementById('notif-count');
  if (ac) ac.textContent = count;
  if (nc) nc.textContent = count;
 
  if (!count) { el.innerHTML = '<div class="empty-state">✅ Sin alertas activas</div>'; return; }
 
  el.innerHTML = alertList.map(a => {
    const ts       = new Date(a.timestamp);
    const timeDiff = Math.round((Date.now() - ts) / 60000);
    const timeStr  = timeDiff < 60 ? `hace ${timeDiff}min` : `hace ${Math.round(timeDiff/60)}h`;
    return `
      <div class="alert-item">
        <span class="alert-dot" style="background:var(--red);box-shadow:0 0 6px var(--red)"></span>
        <span class="alert-msg">${a.mensaje}</span>
        <span class="alert-time">${timeStr}</span>
        <span class="alert-sev sev-high">ALTA</span>
      </div>`;
  }).join('');
}
 
// ============================================================
//  READINGS TABLE
// ============================================================
function renderReadingsTable() {
  const tbody = document.getElementById('readings-tbody');
  if (!tbody) return;
  if (!readingHistory.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin datos</td></tr>'; return; }
  tbody.innerHTML = readingHistory.map(r => {
    const sc = statusColor(r.status);
    return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text3);">${r.hora}</td>
        <td style="color:var(--accent);">${r.temp}<span style="color:var(--text3);font-size:0.7rem;"> °C</span></td>
        <td style="color:var(--green);">${r.ph}<span style="color:var(--text3);font-size:0.7rem;"> pH</span></td>
        <td style="color:var(--yellow);">${r.od}<span style="color:var(--text3);font-size:0.7rem;"> mg/L</span></td>
        <td><span style="color:${sc};font-size:0.72rem;font-weight:700;">● ${statusLabel(r.status)}</span></td>
      </tr>
    `;
  }).join('');
}
 
// ============================================================
//  UI HELPERS
// ============================================================
function setConnectionStatus(ok) {
  const dot  = document.getElementById('conn-dot');
  const text = document.getElementById('conn-text');
  if (dot)  dot.className = 'mini-dot' + (ok ? '' : ' offline');
  if (text) text.textContent = ok ? 'Conectado' : 'Sin conexión';
}
 
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-icon').textContent = type === 'warn' ? '⚠️' : type === 'error' ? '❌' : type === 'ok' ? '✅' : 'ℹ️';
  document.getElementById('toast-msg').textContent  = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
 
function setTimeRange(range, el) {
  currentTimeRange = range;
  document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  refreshHistory();
}
 
function exportCSV() {
  if (!readingHistory.length) { showToast('Sin datos para exportar', 'warn'); return; }
  const rows = [['Hora', 'Temperatura (°C)', 'pH', 'Oxígeno (mg/L)', 'Turbidez (NTU)', 'Estado']];
  readingHistory.forEach(r => rows.push([r.hora, r.temp, r.ph, r.od, r.turb, statusLabel(r.status)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `aquasense_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('CSV descargado', 'ok');
}
 
// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initHistoryChart();
  initStatusChart();
  refreshData();
  setInterval(refreshData, CONFIG.REFRESH_INTERVAL_MS);
  setTimeout(() => showToast('Sistema AquaSense inicializado', 'ok'), 800);
});
