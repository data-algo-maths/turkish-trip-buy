# Turkish Trip Buy live demo

Turkish Trip Buy includes separate customer, admin and driver interfaces connected to one Python HTTP API and SQLite database. It supports dispatch, driver availability, GPS sharing, customer tracking, operational insights, CSV reports and a notification outbox.

## Run the web demo

```bash
PORT=8002 python3 backend/server.py
```

- Customer: `http://127.0.0.1:8002/`
- Admin: `http://127.0.0.1:8002/admin.html`
- Driver: `http://127.0.0.1:8002/rider.html`

For temporary same-Wi-Fi phone testing, start with `HOST=0.0.0.0`. Use a hosted HTTPS API for normal Android testing and production.

## Payments and maps

Copy `.env.example` to `.env` or export the values through the deployment provider. The server does not automatically read `.env`; production hosting should provide environment variables securely.

- `PAYMENT_PROVIDER=mock` keeps payment in a safe test adapter.
- `PAYMENT_PROVIDER=stripe` plus `pk_test_`, `sk_test_` and webhook values enables Stripe PaymentIntent creation.
- `GOOGLE_MAPS_BROWSER_KEY` enables the current web map experience.
- Each Android project contains `google_maps_key` with a placeholder. Replace it at build time with an Android-restricted Google Maps key.

Stripe secrets must remain on the backend. Only the publishable key and PaymentIntent client secret are returned to the Customer APK.

## Android projects

Three Capacitor Android projects are provided:

- `mobile/customer/android` — `com.turkishtripbuy.customer`
- `mobile/admin/android` — `com.turkishtripbuy.admin`
- `mobile/driver/android` — `com.turkishtripbuy.driver`

The generated APKs require Android Studio and an Android SDK. Before building:

1. Run `scripts/prepare-mobile.mjs` after changing files in `dist/`.
2. Run `scripts/sync-mobile.mjs` to copy web assets and sync native plugins.
3. Add each Firebase `google-services.json` to its Android app folder when push notifications are enabled.
4. Replace the Google Maps placeholder using a build secret; do not commit unrestricted keys.

See `mobile/PERMISSIONS.md` for the role-by-role Android permission list.

## Key API endpoints

- `GET /api/v1/health`
- `GET /api/v1/config`
- `GET /api/v1/catalog`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{order_id}/tracking`
- `POST /api/v1/payments/create-intent`
- `POST /api/v1/payments/webhook`
- `GET /api/v1/dispatch`
- `POST /api/v1/riders/{rider_id}/location`
- `GET /api/v1/insights`
- `GET /api/v1/reports/daily.csv`

The database is created at `data/swiftbite.db`. Existing prototype data is intentionally preserved.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes `dist/` to GitHub Pages after each push to `main`. The public static URLs are:

- Customer: `https://<github-user>.github.io/<repository>/`
- Admin: `https://<github-user>.github.io/<repository>/admin.html`
- Driver: `https://<github-user>.github.io/<repository>/rider.html`

GitHub Pages hosts only the static interface. For shared orders, dispatch, driver tracking, notifications and daily reports, host `backend/server.py` on an HTTPS Python service and set `localStorage['ttb-api-base']` to that API origin. Keep database files and API secrets out of the Pages deployment.
