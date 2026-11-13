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

async function api(path, options = {}) {
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

load();
setInterval(() => load(false), 8000);
