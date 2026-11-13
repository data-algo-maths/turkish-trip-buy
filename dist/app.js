let products = [
  {id:'food-001',category:'Bowls',name:'Paneer Tikka Rice Bowl',description:'Smoky paneer, fragrant rice, mint yogurt and crunchy onions.',price:179,minutes:8,veg:true,icon:'🍛',bg:'#f2d4a8',color:'#d77b35',badge:'Bestseller'},
  {id:'food-002',category:'Wraps',name:'Spicy Paneer Wrap',description:'Charred paneer, crisp vegetables and our fiery house sauce.',price:129,minutes:6,veg:true,icon:'🌯',bg:'#f4c9a2',color:'#cb6737',badge:'Hot'},
  {id:'food-003',category:'Drinks',name:'Mango Lassi',description:'A chilled, creamy blend of ripe mango and yogurt.',price:79,minutes:2,veg:true,icon:'🥭',bg:'#f8dea0',color:'#f0ab2c'},
  {id:'food-004',category:'Bowls',name:'Butter Chicken Bowl',description:'Tandoori chicken in silky tomato gravy with cumin rice.',price:219,minutes:9,veg:false,icon:'🍲',bg:'#efb095',color:'#bb4d30',badge:'Popular'},
  {id:'food-005',category:'Sides',name:'Loaded Masala Fries',description:'Crispy fries, chaat masala, chilli and cooling mint mayo.',price:99,minutes:5,veg:true,icon:'🍟',bg:'#f5d892',color:'#e9a82c'},
  {id:'food-006',category:'Wraps',name:'Tandoori Chicken Wrap',description:'Juicy tandoori chicken, slaw and coriander chutney.',price:159,minutes:7,veg:false,icon:'🌮',bg:'#f2b99c',color:'#d06039'},
  {id:'food-007',category:'Sides',name:'Samosa Chaat',description:'Crunchy samosa, chickpeas, yogurt and tamarind chutney.',price:119,minutes:6,veg:true,icon:'🥟',bg:'#e7d1aa',color:'#c78a3e'},
  {id:'food-008',category:'Drinks',name:'Nimbu Fizz',description:'Fresh lime, mint and sparkling soda over crushed ice.',price:69,minutes:2,veg:true,icon:'🍋',bg:'#d8e7b5',color:'#96b946'}
];

const state = {category:'All',search:'',veg:false,quick:false,cart:JSON.parse(localStorage.getItem('ttb-cart')||localStorage.getItem('swiftbite-cart')||'[]'),selected:null,qty:1,promo:false,trackStep:0,orderId:localStorage.getItem('ttb-last-order')||localStorage.getItem('swiftbite-last-order'),paymentMethod:'stripe',address:'145 Lygon Street, Carlton VIC'};
const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
const money = n => `₹${Math.round(n)}`;

function renderCategories(){
  const cats=['All',...new Set(products.map(p=>p.category))];
  $('#categories').innerHTML=cats.map(c=>`<button class="category-button ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('');
}
function filtered(){return products.filter(p=>(state.category==='All'||p.category===state.category)&&(!state.veg||p.veg)&&(!state.quick||p.minutes<10)&&(`${p.name} ${p.description}`.toLowerCase().includes(state.search.toLowerCase())))}
function renderProducts(){
  const list=filtered(); $('#productGrid').innerHTML=list.map(p=>`<article class="product-card">
    <div class="food-art" style="--food-bg:${p.bg};--food-color:${p.color}" data-icon="${p.icon}"><span class="time-tag">⚡ ${p.minutes} MIN</span></div>
    <div class="card-copy"><div><span class="veg-dot" title="${p.veg?'Vegetarian':'Contains meat'}" style="${p.veg?'':'--green:#b74b38'}"></span>${p.badge?`<span class="overline">${p.badge}</span>`:''}</div><h3>${p.name}</h3><p>${p.description}</p><div class="card-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">ADD +</button></div></div>
  </article>`).join('');
  $('#emptyState').hidden=!!list.length; $('#productGrid').hidden=!list.length;
}
function renderCart(){
  localStorage.setItem('ttb-cart',JSON.stringify(state.cart)); const count=state.cart.reduce((a,i)=>a+i.qty,0); const subtotal=state.cart.reduce((a,i)=>a+(i.price*i.qty),0); const discount=state.promo?Math.min(50,subtotal):0; const total=subtotal-discount;
  $('#cartCount').textContent=count; $('#drawerCount').textContent=`${count} item${count===1?'':'s'}`; $('#emptyCart').hidden=!!count; $('#cartSummary').hidden=!count;
  $('#cartItems').innerHTML=state.cart.map((item,index)=>`<article class="cart-item"><div class="cart-thumb" style="--food-bg:${item.bg};background:${item.bg}">${item.icon}</div><div><h4>${item.name}</h4><small>${item.spice}${item.extra?', extra paneer':''}</small><div class="mini-stepper"><button data-dec="${index}">−</button><b>${item.qty}</b><button data-inc="${index}">＋</button></div></div><strong>${money(item.price*item.qty)}</strong></article>`).join('');
  $('#subtotal').textContent=money(subtotal); $('#discount').textContent=`−${money(discount)}`; $('#discountRow').hidden=!state.promo; $('#total').textContent=money(total); $('#checkoutTotal').textContent=money(total); $('#placeOrderTotal').textContent=money(total); $('#promoText').textContent=state.promo?'FAST50 applied':'Apply promo code';
}
function showLayer(el){$('#overlay').hidden=false;el.classList.add('open');el.setAttribute('aria-hidden','false')}
function closeLayers(){ $$('.open').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')}); $('#overlay').hidden=true }
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function openProduct(id){const p=products.find(x=>x.id===id);state.selected=p;state.qty=1;$('#extraPaneer').checked=false;$('#modalFood').textContent=p.icon;$('#modalFood').style.background=p.bg;$('#modalName').textContent=p.name;$('#modalDescription').textContent=p.description;$('#modalTime').textContent=`${p.minutes} MIN`;$('#modalVeg').textContent=p.veg?'VEG':'NON-VEG';updateModalPrice();showLayer($('#productModal'))}
function updateModalPrice(){const extra=$('#extraPaneer').checked?49:0;$('#modalQty').textContent=state.qty;$('#modalPrice').textContent=money((state.selected.price+extra)*state.qty)}
function addSelected(){const p=state.selected,extra=$('#extraPaneer').checked,spice=$('input[name="spice"]:checked').value,price=p.price+(extra?49:0);const match=state.cart.find(i=>i.id===p.id&&i.extra===extra&&i.spice===spice);if(match)match.qty+=state.qty;else state.cart.push({...p,extra,spice,price,qty:state.qty});renderCart();closeLayers();toast(`${p.name} added to your bag`)}
function openCart(){closeLayers();showLayer($('#cartDrawer'))}
function checkout(){closeLayers();showLayer($('#checkoutModal'))}
async function placeOrder(){
  const orderItems=[...state.cart];
  const button=$('#placeOrder');button.disabled=true;
  try{
    const res=await fetch('/api/v1/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_name:'Demo Customer',address:state.address,promo:state.promo,payment_method:state.paymentMethod,items:orderItems})});
    if(!res.ok)throw new Error('Order API unavailable');
    const order=await res.json();state.orderId=order.id;localStorage.setItem('ttb-last-order',order.id);localStorage.setItem('ttb-ordered','1');
    if(state.paymentMethod==='stripe'){await TTB.pay(order.id);toast(`Test payment accepted for ${order.id}`)}else toast(`Order ${order.id} placed with cash on delivery`);
  }catch(err){toast(err.message||'Order could not be placed');button.disabled=false;return}
  closeLayers();state.cart=[];state.promo=false;renderCart();state.trackStep=0;renderTracking();$('#orderScreen').hidden=false;document.body.style.overflow='hidden';
  button.disabled=false;
}
function renderTracking(){const steps=$$('#timeline article');steps.forEach((s,i)=>s.classList.toggle('active',i<=state.trackStep));const pct=[10,38,72,100][state.trackStep];$('#routeProgress').style.width=pct+'%';$('#riderDot').style.left=pct+'%';$('#etaNumber').textContent=[10,7,3,0][state.trackStep];$('#advanceOrder').textContent=state.trackStep===3?'Demo order delivered':'Advance demo tracking'}
function trackingStep(status){if(status==='Delivered')return 3;if(['Picked up','Out for delivery','Arrived'].includes(status))return 2;if(['Cooking','Assigned','Accepted','At kitchen'].includes(status))return 1;return 0}
async function refreshCustomerTracking(){if(!state.orderId||state.orderId==='LOCAL-DEMO')return;try{const r=await fetch(`/api/v1/orders/${state.orderId}/tracking`);if(!r.ok)return;const d=await r.json();state.trackStep=trackingStep(d.order.status);renderTracking();$('#etaNumber').textContent=d.order.eta_minutes;if(d.rider){const initials=d.rider.name.split(' ').map(x=>x[0]).join('').slice(0,2);$('#customerRiderAvatar').textContent=initials;$('#customerRiderName').textContent=d.rider.name;$('#customerRiderMeta').textContent=`★ ${d.rider.rating} · ${d.rider.vehicle}${d.rider.last_location_at?' · location updated '+new Date(d.rider.last_location_at).toLocaleTimeString():''}`;if(d.rider.latitude!=null)TTB.renderMap('customerMap',[{lat:Number(d.rider.latitude),lng:Number(d.rider.longitude),label:'D',title:d.rider.name},{lat:-37.8007,lng:144.9658,label:'C',title:'Customer'}])}else{$('#customerRiderAvatar').textContent='?';$('#customerRiderName').textContent='Waiting for assignment';$('#customerRiderMeta').textContent='The dispatcher is finding a driver'}}catch{}}

document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add]');if(add)openProduct(add.dataset.add);
  const cat=e.target.closest('[data-category]');if(cat){state.category=cat.dataset.category;renderCategories();renderProducts()}
  const dec=e.target.closest('[data-dec]');if(dec){const i=+dec.dataset.dec;state.cart[i].qty--;if(state.cart[i].qty<1)state.cart.splice(i,1);renderCart()}
  const inc=e.target.closest('[data-inc]');if(inc){state.cart[+inc.dataset.inc].qty++;renderCart()}
  const msg=e.target.closest('[data-toast]');if(msg)toast(msg.dataset.toast);
  if(e.target.closest('[data-close]')||e.target===$('#overlay'))closeLayers();
});
$('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderProducts()});
$('#vegOnly').addEventListener('change',e=>{state.veg=e.target.checked;renderProducts()});
$('#quickOnly').addEventListener('change',e=>{state.quick=e.target.checked;renderProducts()});
$('#clearFilters').onclick=()=>{state.category='All';state.search='';state.veg=false;state.quick=false;$('#searchInput').value='';$('#vegOnly').checked=false;$('#quickOnly').checked=false;renderCategories();renderProducts()};
$('#cartButton').onclick=openCart;$('#modalMinus').onclick=()=>{state.qty=Math.max(1,state.qty-1);updateModalPrice()};$('#modalPlus').onclick=()=>{state.qty++;updateModalPrice()};$('#extraPaneer').onchange=updateModalPrice;$('#addConfigured').onclick=addSelected;
$('#promoButton').onclick=()=>{state.promo=!state.promo;renderCart();toast(state.promo?'FAST50 applied — ₹50 off':'Promo removed')};$('#checkoutButton').onclick=checkout;$('#placeOrder').onclick=placeOrder;
$('#closeOrder').onclick=()=>{$('#orderScreen').hidden=true;document.body.style.overflow=''};$('#ordersButton').onclick=()=>{if(localStorage.getItem('ttb-ordered')||localStorage.getItem('swiftbite-ordered')){$('#orderScreen').hidden=false;refreshCustomerTracking()}else toast('Place a demo order to see tracking')};
$('#advanceOrder').onclick=async()=>{if(state.trackStep<3){if(state.orderId&&state.orderId!=='LOCAL-DEMO'){try{await fetch(`/api/v1/orders/${state.orderId}/advance`,{method:'POST'})}catch{}}state.trackStep++;renderTracking()}else toast('Delivered — enjoy your meal!')};
document.querySelectorAll('[data-payment]').forEach(button=>button.onclick=()=>{state.paymentMethod=button.dataset.payment;document.querySelectorAll('[data-payment]').forEach(choice=>{const selected=choice===button;choice.classList.toggle('selected',selected);choice.querySelector('i').textContent=selected?'✓':''});$('#placeOrder span').textContent=state.paymentMethod==='stripe'?'Pay & place order':'Place COD order'});
$('#locationButton').onclick=async()=>{try{const position=await TTB.requestLocation();const lat=position.coords.latitude.toFixed(5),lng=position.coords.longitude.toFixed(5);state.address=`Current location (${lat}, ${lng})`;$('#locationLabel').textContent='Current location selected';toast('Precise delivery location added')}catch(error){toast(error.message||'Location permission was not granted')}};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();$('#searchInput').focus()}if(e.key==='Escape')closeLayers()});
async function loadCatalog(){try{const res=await fetch('/api/v1/catalog');if(!res.ok)throw new Error();const data=await res.json();if(data.products?.length){products=data.products;renderCategories();renderProducts()}}catch{}}
async function loadAdmin(){
  let healthy=false;
  try{const [health,insightRes,orderRes,noticeRes]=await Promise.all([fetch('/api/v1/health'),fetch('/api/v1/insights'),fetch('/api/v1/orders'),fetch('/api/v1/notifications')]);healthy=health.ok;const insight=await insightRes.json(),orders=(await orderRes.json()).orders||[],notices=(await noticeRes.json()).notifications||[];
    $('#kpiOrders').textContent=insight.orders;$('#kpiRevenue').textContent=money(insight.revenue);$('#kpiAov').textContent=money(insight.average_order_value);$('#kpiOpen').textContent=insight.open_orders;
    $('#ordersTable').innerHTML=orders.length?orders.map(o=>`<tr><td><b>${o.id}</b></td><td>${new Date(o.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td><td><span class="status-pill ${o.status==='Delivered'?'delivered':''}">${o.status}</span></td><td>${money(o.total)}</td><td>${o.eta_minutes} min</td></tr>`).join(''):'<tr><td colspan="5">Place a demo order to start the live feed.</td></tr>';
    const max=Math.max(...(insight.top_products||[]).map(x=>x.quantity),1);$('#topProducts').innerHTML=insight.top_products?.length?insight.top_products.map(x=>`<div class="bar-item"><div><b>${x.product_name}</b><span>${x.quantity}</span></div><div class="bar-track"><i style="width:${x.quantity/max*100}%"></i></div></div>`).join(''):'<p class="empty-admin">No product activity yet.</p>';
    $('#notificationFeed').innerHTML=notices.length?notices.map(n=>`<div class="notice-row"><p>${n.message}</p><small>${n.channel.toUpperCase()} · ${n.status} · ${new Date(n.created_at).toLocaleTimeString()}</small></div>`).join(''):'<p class="empty-admin">The notification outbox is empty.</p>';
  }catch(err){$('#ordersTable').innerHTML='<tr><td colspan="5">Start backend/server.py to enable live operations.</td></tr>'}
  $('#apiStatus').textContent=healthy?'API connected':'API offline';$('#apiStatus').classList.toggle('live',healthy);
}
$('#adminButton').onclick=()=>location.href='admin.html';$('#riderButton').onclick=()=>location.href='rider.html';
$('#closeAdmin').onclick=()=>{$('#adminScreen').hidden=true;document.body.style.overflow=''};$('#refreshAdmin').onclick=loadAdmin;
$('#testNotification').onclick=async()=>{try{await fetch('/api/v1/notifications/test',{method:'POST'});if('Notification'in window){const permission=await Notification.requestPermission();if(permission==='granted')new Notification('Turkish Trip Buy live demo',{body:'Test notification delivered successfully.'})}toast('Test notification added to the outbox');loadAdmin()}catch{toast('Start the API server to test notifications')}};
$('#dailyReport').onclick=e=>{if(!TTB.apiBase){e.preventDefault();return toast('Connect the hosted API to download live reports')}e.currentTarget.href=`${TTB.apiBase}/api/v1/reports/daily.csv`};
renderCategories();renderProducts();renderCart();loadCatalog();setInterval(refreshCustomerTracking,5000);
