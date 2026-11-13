(function () {
  const configuredBase = localStorage.getItem('ttb-api-base') || window.TTB_API_BASE || '';
  const apiBase = configuredBase.replace(/\/$/, '');
  const nativeBridge = window.TTBNative;
  const originalFetch = window.fetch.bind(window);
  let configPromise;
  let mapsPromise;

  function apiUrl(value) {
    if (typeof value === 'string' && value.startsWith('/api/') && apiBase) return `${apiBase}${value}`;
    return value;
  }

  window.fetch = function (input, init) {
    if (typeof input === 'string') return originalFetch(apiUrl(input), init);
    return originalFetch(input, init);
  };

  async function config() {
    if (!configPromise) {
      configPromise = originalFetch(apiUrl('/api/v1/config'))
        .then(response => response.ok ? response.json() : Promise.reject(new Error('Configuration unavailable')))
        .catch(() => ({
          app_name: 'Turkish Trip Buy',
          payments: { provider: 'mock', currency: 'inr', country: 'IN', cash_on_delivery: true },
          maps: { provider: 'demo', browser_key: '' },
        }));
    }
    return configPromise;
  }

  async function pay(orderId) {
    const response = await window.fetch('/api/v1/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    const intent = await response.json();
    if (!response.ok) throw new Error(intent.error || 'Payment could not be started');
    if (intent.mode === 'mock') return { status: 'succeeded', mode: 'mock' };

    const stripe = nativeBridge?.Stripe;
    if (!stripe) throw new Error('Native Stripe PaymentSheet is available in the Customer APK only');
    await stripe.initialize({ publishableKey: intent.publishable_key });
    await stripe.createPaymentSheet({
      paymentIntentClientSecret: intent.payment_intent_client_secret,
      merchantDisplayName: 'Turkish Trip Buy',
      enableGooglePay: true,
      GooglePayIsTesting: true,
      countryCode: intent.country,
      currencyCode: intent.currency.toUpperCase(),
    });
    return stripe.presentPaymentSheet();
  }

  async function requestLocation(options = {}) {
    const geolocation = nativeBridge?.Geolocation;
    if (geolocation) {
      const permission = await geolocation.requestPermissions({ permissions: ['location'] });
      if (permission.location !== 'granted') throw new Error('Precise location permission was not granted');
      return geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, ...options });
    }
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Location is unavailable on this device'));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, ...options });
    });
  }

  async function loadMaps() {
    const appConfig = await config();
    const key = appConfig.maps?.browser_key;
    if (!key) return null;
    if (window.google?.maps) return window.google.maps;
    if (!mapsPromise) {
      mapsPromise = new Promise((resolve, reject) => {
        const callback = `ttbMapsReady${Date.now()}`;
        window[callback] = () => {
          resolve(window.google.maps);
          delete window[callback];
        };
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callback}`;
        script.async = true;
        script.onerror = () => reject(new Error('Google Maps could not be loaded'));
        document.head.appendChild(script);
      });
    }
    return mapsPromise;
  }

  async function renderMap(elementOrId, points = []) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element || !points.length) return;
    if (nativeBridge?.isNative && nativeBridge.GoogleMap) {
      element.classList.remove('demo-map');
      if (!element._ttbNativeMap) {
        element._ttbNativeMap = await nativeBridge.GoogleMap.create({
          id: `ttb-${element.id}`,
          element,
          apiKey: '',
          config: { center: points[0], zoom: 14 },
        });
      }
      if (element._ttbMarkerIds?.length) await element._ttbNativeMap.removeMarkers(element._ttbMarkerIds);
      element._ttbMarkerIds = await element._ttbNativeMap.addMarkers(points.map(point => ({
        coordinate: { lat: point.lat, lng: point.lng },
        title: point.title || '',
      })));
      await element._ttbNativeMap.setCamera({ coordinate: points[0], zoom: points.length > 1 ? 13 : 15 });
      return;
    }
    const maps = await loadMaps().catch(() => null);
    if (!maps) {
      element.classList.add('demo-map');
      return;
    }
    element.classList.remove('demo-map');
    if (!element._ttbMap) element._ttbMap = new maps.Map(element, { center: points[0], zoom: 14, disableDefaultUI: true });
    (element._ttbMarkers || []).forEach(marker => marker.setMap(null));
    element._ttbMarkers = points.map((point, index) => new maps.Marker({
      map: element._ttbMap,
      position: point,
      label: point.label || String(index + 1),
      title: point.title || '',
    }));
    const bounds = new maps.LatLngBounds();
    points.forEach(point => bounds.extend(point));
    if (points.length > 1) element._ttbMap.fitBounds(bounds, 54);
    else element._ttbMap.setCenter(points[0]);
  }

  window.TTB = { apiBase, config, pay, requestLocation, renderMap };
})();
