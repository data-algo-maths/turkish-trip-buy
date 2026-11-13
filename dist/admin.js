const $ = selector => document.querySelector(selector);

const demo = {
  insights: { orders: 47, open_orders: 5, revenue: 12640 },
  orders: [
    { id: 'TTB-1048', customer_name: 'Meera Kapoor', status: 'Out for delivery', eta_minutes: 6, total: 438, rider_id: 'rider-001' },
    { id: 'TTB-1047', customer_name: 'Rohan Malhotra', status: 'Cooking', eta_minutes: 11, total: 298, rider_id: '' },
    { id: 'TTB-1046', customer_name: 'Ananya Singh', status: 'Picked up', eta_minutes: 8, total: 517, rider_id: 'rider-003' },
    { id: 'TTB-1045', customer_name: 'Vikram Sethi', status: 'Assigned', eta_minutes: 13, total: 359, rider_id: 'rider-002' },
    { id: 'TTB-1044', customer_name: 'Ishita Verma', status: 'Delivered', eta_minutes: 0, total: 279, rider_id: 'rider-004' }
  ],
  riders: [
    { id: 'rider-001', name: 'Arjun Kumar', vehicle: 'E-bike · DL 3S 4821', rating: 4.9, availability: 'busy', current_order_id: 'TTB-1048', latitude: 28.6315, longitude: 77.2167 },
    { id: 'rider-002', name: 'Riya Sharma', vehicle: 'Scooter · HR 26 1198', rating: 4.8, availability: 'busy', current_order_id: 'TTB-1045', latitude: 28.4951, longitude: 77.0891 },
    { id: 'rider-003', name: 'Kabir Ali', vehicle: 'E-bike · UP 16 7330', rating: 4.9, availability: 'busy', current_order_id: 'TTB-1046', latitude: 28.5706, longitude: 77.3219 },
    { id: 'rider-004', name: 'Nisha Yadav', vehicle: 'Scooter · DL 12 6044', rating: 4.7, availability: 'online', current_order_id: '', latitude: 28.5244, longitude: 77.2066 }
  ],
  notifications: [
    { message: 'TTB-1048 left the Connaught Place kitchen', channel: 'push', created_at: new Date(Date.now() - 2 * 60000).toISOString() },
    { message: 'High demand forecast for Connaught Place', channel: 'insight', created_at: new Date(Date.now() - 8 * 60000).toISOString() },
    { message: 'Riya Sharma accepted delivery TTB-1045', channel: 'driver', created_at: new Date(Date.now() - 12 * 60000).toISOString() },
    { message: 'Daily operations snapshot is ready', channel: 'report', created_at: new Date(Date.now() - 25 * 60000).toISOString() }
  ]
};

// ---- Dummy analytics data (used for the heat maps and charts) ----
const MAP_BOUNDS = { north: 28.72, south: 28.40, west: 76.98, east: 77.40 };
const KITCHEN = { lat: 28.6050, lng: 77.2380 };

const zones = [
  { id: 'cp', name: 'Connaught Place', short: 'CP', lat: 28.6315, lng: 77.2167, base: 92 },
  { id: 'cyber', name: 'Gurugram Cyber Hub', short: 'Cyber Hub', lat: 28.4950, lng: 77.0890, base: 84 },
  { id: 'noida', name: 'Noida Sector 18', short: 'Noida 18', lat: 28.5706, lng: 77.3260, base: 73 },
  { id: 'saket', name: 'Saket', short: 'Saket', lat: 28.5245, lng: 77.2100, base: 61 },
  { id: 'lajpat', name: 'Lajpat Nagar', short: 'Lajpat', lat: 28.5677, lng: 77.2433, base: 48 },
  { id: 'dwarka', name: 'Dwarka Sector 10', short: 'Dwarka', lat: 28.5921, lng: 77.0460, base: 39 },
  { id: 'mayur', name: 'Mayur Vihar', short: 'Mayur Vihar', lat: 28.6090, lng: 77.2950, base: 32 }
];
const windowFactor = {
  now: { cp: 0.86, cyber: 0.80, noida: 0.92, saket: 0.88, lajpat: 1.05, dwarka: 0.95, mayur: 1.10, orders: 0.55 },
  '30m': { cp: 1, cyber: 1, noida: 1, saket: 1, lajpat: 1, dwarka: 1, mayur: 1, orders: 1 },
  '2h': { cp: 0.90, cyber: 1.08, noida: 1.12, saket: 1.18, lajpat: 1.20, dwarka: 1.35, mayur: 1.30, orders: 3.4 }
};
const windowLabel = { now: 'right now', '30m': 'in the next 30 minutes', '2h': 'in the next 2 hours' };

const trend = (() => {
  const orders = [312, 298, 341, 356, 402, 468, 431];
  const aov = [262, 259, 268, 271, 276, 284, 279];
  return orders.map((count, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000);
    return { label: date.toLocaleDateString([], { weekday: 'short' }), orders: count, revenue: count * aov[index] };
  });
})();

const weekly = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayFactor = [0.82, 0.78, 0.85, 0.9, 1.12, 1.3, 1.18];
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00 – 23:00
  const hourCurve = hour => 4 + 26 * Math.exp(-((hour - 13) ** 2) / 2.2) + 34 * Math.exp(-((hour - 20.5) ** 2) / 3.2) + (hour < 11 ? 6 : 0);
  const values = days.map((day, d) => hours.map((hour, h) => Math.round(hourCurve(hour) * dayFactor[d] + ((d * 7 + h * 3) % 5))));
  return { days, hours, values };
})();

let heatWindow = '30m';
let selectedZone = 'cp';
let zoneScores = {};

let dispatch = { orders: [], riders: [] };
let notifications = [];
let mode = 'unknown';

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2200);
}

// GitHub Pages (and file://) serve only static files – there is no /api there,
// so skip the network round-trip unless an API base has been configured.
const hasApi = Boolean(window.TTB?.apiBase) || !(location.protocol === 'file:' || /\.github\.io$/.test(location.hostname));

async function api(path, options = {}) {
  if (!hasApi) throw new Error('No API configured');
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function money(value) { return `₹${Math.round(value).toLocaleString('en-IN')}`; }
function initials(name) { return name.split(' ').map(part => part[0]).join('').slice(0, 2); }

function riderOptions(selected) {
  return dispatch.riders
    .filter(rider => rider.availability !== 'offline' || rider.id === selected)
    .map(rider => `<option value="${rider.id}" ${rider.id === selected ? 'selected' : ''}>${rider.name} · ${rider.availability}</option>`)
    .join('');
}

function renderNotifications() {
  $('#eventList').innerHTML = notifications.slice(0, 8).map(item => `
    <div class="notice">${item.message}<small>${item.channel.toUpperCase()} · ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
  `).join('') || '<p class="subtle">No notifications yet.</p>';
}

function render() {
  const online = dispatch.riders.filter(rider => rider.availability !== 'offline').length;
  $('#ridersKpi').textContent = online;
  $('#dispatchTable').innerHTML = dispatch.orders.length ? dispatch.orders.map(order => `
    <tr>
      <td><b>${order.id}</b></td><td>${order.customer_name}</td>
      <td><span class="status ${order.status === 'Delivered' ? 'delivered' : ''}">${order.status}</span></td>
      <td>${order.eta_minutes ? `${order.eta_minutes} min` : 'Complete'}</td><td>${money(order.total)}</td>
      <td><div class="assign-row"><select data-rider-for="${order.id}"><option value="">Choose driver</option>${riderOptions(order.rider_id)}</select><button data-assign="${order.id}">${order.rider_id ? 'Reassign' : 'Assign'}</button></div></td>
    </tr>`).join('') : '<tr><td colspan="6">No open orders.</td></tr>';

  $('#riderList').innerHTML = dispatch.riders.map(rider => `
    <div class="rider-row"><div class="avatar">${initials(rider.name)}</div><div><b>${rider.name}</b><small>${rider.vehicle} · ★ ${rider.rating}${rider.current_order_id ? ` · ${rider.current_order_id}` : ''}</small></div><span class="availability ${rider.availability}">${rider.availability}</span></div>
  `).join('');
  renderNotifications();
  renderDriverMap();
  renderHeatmap();
}

function project(lat, lng) {
  const x = (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west) * 100;
  const y = (MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south) * 100;
  return { x: Math.min(94, Math.max(6, x)), y: Math.min(92, Math.max(8, y)) };
}

function renderDriverMap() {
  const kitchen = project(KITCHEN.lat, KITCHEN.lng);
  const pins = dispatch.riders
    .filter(rider => rider.latitude && rider.longitude && rider.availability !== 'offline')
    .map(rider => {
      const { x, y } = project(rider.latitude, rider.longitude);
      return `<span class="driver-pin ${rider.availability}" style="left:${x}%;top:${y}%" title="${rider.name} · ${rider.availability}${rider.current_order_id ? ' · ' + rider.current_order_id : ''}">${initials(rider.name)}</span>`;
    }).join('');
  $('#driverPins').innerHTML = `<span class="kitchen-pin" style="left:${kitchen.x}%;top:${kitchen.y}%" title="Connaught Place kitchen">T</span>${pins}`;
  $('#mapTime').textContent = `${mode === 'live' ? 'Live' : 'Demo'} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function heatLevel(score) {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 55) return 'warm';
  return 'medium';
}

function computeZoneScores(jitter = false) {
  const factor = windowFactor[heatWindow];
  zones.forEach(zone => {
    const previous = zoneScores[zone.id] ?? zone.base * factor[zone.id];
    const target = zone.base * factor[zone.id];
    const next = jitter ? previous + (target - previous) * 0.4 + (Math.random() - 0.5) * 6 : target;
    zoneScores[zone.id] = Math.round(Math.min(99, Math.max(12, next)));
  });
}

function renderHeatmap() {
  const factor = windowFactor[heatWindow];
  const ranked = zones.map(zone => ({ ...zone, score: zoneScores[zone.id] }))
    .map(zone => ({ ...zone, predicted: Math.max(1, Math.round(zone.score / 5.1 * factor.orders)) }))
    .sort((a, b) => b.score - a.score);

  $('#heatSpots').innerHTML = ranked.map((zone, index) => {
    const { x, y } = project(zone.lat, zone.lng);
    const size = Math.round(44 + zone.score * 0.62);
    return `<button class="heat-spot ${heatLevel(zone.score)} ${zone.id === selectedZone ? 'selected' : ''}" data-zone="${zone.id}" style="--x:${x}%;--y:${y}%;--size:${size}px;z-index:${20 - index}" aria-label="${zone.name} demand ${zone.score} percent"><b>${zone.score}%</b><small>${zone.short}</small></button>`;
  }).join('');

  $('#zoneRows').innerHTML = ranked.map(zone => `
    <div class="zone-row ${zone.id === selectedZone ? 'selected' : ''}" data-zone="${zone.id}"><div><b>${zone.name}</b><small>${zone.predicted} predicted orders ${windowLabel[heatWindow]}</small></div><span>${zone.score}%</span><i><em style="width:${zone.score}%"></em></i></div>
  `).join('');

  const top = ranked[0];
  const idle = dispatch.riders.filter(rider => rider.availability === 'online');
  const zone = ranked.find(item => item.id === selectedZone) || top;
  const suggestion = idle.length
    ? `Move ${idle.length === 1 ? idle[0].name : `${idle.length} available riders`} toward ${top.name} — ${top.predicted} orders expected ${windowLabel[heatWindow]}.`
    : `All riders are busy. Consider surge incentives in ${top.name} (${top.score}% demand).`;
  $('#heatAction').textContent = zone.id === top.id ? suggestion : `${suggestion} Selected: ${zone.name} at ${zone.score}% with ${zone.predicted} predicted orders.`;
}

function renderTrend() {
  const width = 360, height = 190, pad = { l: 30, r: 34, t: 14, b: 26 };
  const innerW = width - pad.l - pad.r, innerH = height - pad.t - pad.b;
  const maxOrders = Math.ceil(Math.max(...trend.map(d => d.orders)) / 100) * 100;
  const maxRevenue = Math.ceil(Math.max(...trend.map(d => d.revenue)) / 50000) * 50000;
  const step = innerW / trend.length, barW = step * 0.56;
  const grid = [0, 0.5, 1].map(f => {
    const y = pad.t + innerH * (1 - f);
    return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" class="grid"/><text x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${Math.round(maxOrders * f)}</text><text x="${width - pad.r + 6}" y="${y + 3}">${f ? '₹' + Math.round(maxRevenue * f / 1000) + 'k' : '0'}</text>`;
  }).join('');
  const bars = trend.map((d, i) => {
    const h = d.orders / maxOrders * innerH, x = pad.l + step * i + (step - barW) / 2;
    return `<rect x="${x}" y="${pad.t + innerH - h}" width="${barW}" height="${h}" rx="4" class="${i === trend.length - 1 ? 'bar today' : 'bar'}"><title>${d.label}: ${d.orders} orders · ${money(d.revenue)}</title></rect><text x="${x + barW / 2}" y="${height - 8}" text-anchor="middle">${d.label}</text>`;
  }).join('');
  const points = trend.map((d, i) => [pad.l + step * i + step / 2, pad.t + innerH - d.revenue / maxRevenue * innerH]);
  const line = `<polyline points="${points.map(p => p.join(',')).join(' ')}" class="line"/>` + points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" class="dot"/>`).join('');
  $('#trendChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img">${grid}${bars}${line}</svg>`;
  const week = trend.reduce((sum, d) => sum + d.revenue, 0);
  $('#trendTotal').textContent = `${trend.reduce((s, d) => s + d.orders, 0).toLocaleString('en-IN')} orders · ${money(week)}`;
}

function heatColor(t) {
  const stops = [[250, 243, 226], [244, 200, 75], [255, 90, 54], [181, 44, 25]];
  const scaled = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(scaled), f = scaled - i;
  return `rgb(${stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f)).join(',')})`;
}

function renderWeekly() {
  const max = Math.max(...weekly.values.flat());
  const today = (new Date().getDay() + 6) % 7, hour = new Date().getHours();
  let html = '<span></span>' + weekly.hours.map(h => `<span class="hour">${h % 3 === 2 || h === 8 ? String(h).padStart(2, '0') : ''}</span>`).join('');
  weekly.days.forEach((day, d) => {
    html += `<span class="day">${day}</span>` + weekly.values[d].map((value, h) => {
      const now = d === today && weekly.hours[h] === hour;
      return `<i class="${now ? 'now' : ''}" style="background:${heatColor(value / max)}" title="${day} ${String(weekly.hours[h]).padStart(2, '0')}:00 · ~${value} orders/hr"></i>`;
    }).join('');
  });
  $('#weeklyHeatmap').innerHTML = html;
}

function applyInsights(insights) {
  $('#ordersKpi').textContent = insights.orders;
  $('#openKpi').textContent = insights.open_orders;
  $('#revenueKpi').textContent = money(insights.revenue);
}

function setDataMode(nextMode) {
  mode = nextMode;
  $('#dataMode span').textContent = mode === 'live' ? 'Live API connected' : 'Demo dataset';
  $('#lastUpdated').textContent = `${mode === 'live' ? 'Live data' : 'Demo data'} · updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function loadDemo() {
  dispatch = { orders: demo.orders.map(order => ({ ...order })), riders: demo.riders.map(rider => ({ ...rider })) };
  notifications = demo.notifications.map(item => ({ ...item }));
  applyInsights(demo.insights);
  setDataMode('demo');
  render();
}

async function load(force = false) {
  if (mode === 'demo' && !force) return;
  try {
    const [data, insights, notices] = await Promise.all([
      api('/api/v1/dispatch'), api('/api/v1/insights'), api('/api/v1/notifications')
    ]);
    dispatch = data;
    notifications = notices.notifications || [];
    applyInsights(insights);
    setDataMode('live');
    render();
  } catch (error) {
    loadDemo();
    if (force) toast('Live API unavailable — refreshed demo data');
  }
}

function assignDemo(orderId, riderId) {
  const order = dispatch.orders.find(item => item.id === orderId);
  const rider = dispatch.riders.find(item => item.id === riderId);
  if (!order || !rider) return;
  dispatch.riders.forEach(item => {
    if (item.current_order_id === orderId) { item.current_order_id = ''; item.availability = 'online'; }
  });
  order.rider_id = riderId;
  if (order.status === 'Cooking') order.status = 'Assigned';
  rider.current_order_id = orderId;
  rider.availability = 'busy';
  notifications.unshift({ message: `${rider.name} assigned to ${orderId}`, channel: 'dispatch', created_at: new Date().toISOString() });
  render();
  toast('Demo delivery assigned');
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-assign]');
  if (!button) return;
  const select = document.querySelector(`[data-rider-for="${button.dataset.assign}"]`);
  if (!select.value) return toast('Choose an online driver');
  if (mode === 'demo') return assignDemo(button.dataset.assign, select.value);
  try {
    await api(`/api/v1/orders/${button.dataset.assign}/assign`, { method: 'POST', body: JSON.stringify({ rider_id: select.value }) });
    toast('Delivery assigned');
    load(true);
  } catch (error) { toast(error.message); }
});

$('#refresh').onclick = () => load(true);
$('#testNotice').onclick = async () => {
  if (mode === 'demo') {
    notifications.unshift({ message: 'Test notification delivered to the safe demo outbox', channel: 'push', created_at: new Date().toISOString() });
    renderNotifications();
    return toast('Demo notification added');
  }
  try { await api('/api/v1/notifications/test', { method: 'POST' }); toast('Test notification queued'); load(true); }
  catch (error) { toast(error.message); }
};

$('#dailyReport').onclick = event => {
  if (mode === 'live' && TTB.apiBase) {
    event.currentTarget.href = `${TTB.apiBase}/api/v1/reports/daily.csv`;
    return;
  }
  event.preventDefault();
  const rows = [['Order', 'Customer', 'Status', 'ETA minutes', 'Total', 'Driver']];
  dispatch.orders.forEach(order => {
    const rider = dispatch.riders.find(item => item.id === order.rider_id);
    rows.push([order.id, order.customer_name, order.status, order.eta_minutes, order.total, rider?.name || 'Unassigned']);
  });
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'turkish-trip-buy-demo-report.csv';
  link.click();
  URL.revokeObjectURL(url);
  toast('Demo CSV report downloaded');
};

function tickDemo() {
  if (mode !== 'demo') return;
  dispatch.riders.forEach(rider => {
    if (rider.availability === 'offline') return;
    const drift = rider.availability === 'busy' ? 0.004 : 0.0015;
    rider.latitude += (Math.random() - 0.5) * drift;
    rider.longitude += (Math.random() - 0.5) * drift;
  });
  dispatch.orders.forEach(order => { if (order.eta_minutes > 1 && Math.random() < 0.35) order.eta_minutes -= 1; });
  computeZoneScores(true);
  render();
  setDataMode('demo');
}

document.addEventListener('click', event => {
  const zone = event.target.closest('[data-zone]');
  if (zone) { selectedZone = zone.dataset.zone; renderHeatmap(); return; }
  const tab = event.target.closest('[data-window]');
  if (tab) {
    heatWindow = tab.dataset.window;
    document.querySelectorAll('[data-window]').forEach(item => item.classList.toggle('active', item === tab));
    computeZoneScores(false);
    renderHeatmap();
  }
});

computeZoneScores(false);
renderTrend();
renderWeekly();
loadDemo(); // paint immediately with dummy data; replaced if a live API answers
if (hasApi) { mode = 'unknown'; load(); }
if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
setInterval(() => (mode === 'live' ? load(true) : tickDemo()), 8000);
