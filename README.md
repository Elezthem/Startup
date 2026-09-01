# UniBox MVP

Interactive ESP32 laboratory platform: simulator, automatic validation, SQLite backend and real-time UniBox telemetry with demo mode.

## Run locally

Requires Node.js 24 or newer.

```sh
npm start
```

Open `http://localhost:4173`.

## ESP32 telemetry

```json
POST /api/devices/telemetry
{
  "deviceId": "UNIBOX-001",
  "sensor": "sensor_01",
  "value": 52,
  "timestamp": "2026-09-01T12:00:00.000Z"
}
```

`render.yaml` deploys the full application to Render. The GitHub Pages workflow publishes the frontend and uses the configured Render API URL.
