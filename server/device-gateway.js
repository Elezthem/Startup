import { randomUUID } from "node:crypto";

export class DeviceGateway {
  constructor(database) {
    this.db = database;
    this.clients = new Set();
    this.lastPhysicalMessageAt = 0;
    this.startDemoMode();
  }

  getStatus() {
    const device = this.db.prepare("SELECT id, device_name AS deviceName, esp32_id AS esp32Id, status, last_seen AS lastSeen FROM devices ORDER BY last_seen DESC LIMIT 1").get();
    if (!device) return null;
    const latestReading = this.db.prepare("SELECT sensor, value, timestamp, source FROM device_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1").get(device.id) || null;
    return { ...device, mode: latestReading?.source === "esp32" ? "live" : "demo", latestReading };
  }

  connect(res) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
    res.write(`event: device-status\ndata: ${JSON.stringify(this.getStatus())}\n\n`);
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }

  broadcast(event, payload) {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach((client) => client.write(message));
  }

  receive(payload, source = "esp32") {
    if (!payload || typeof payload.deviceId !== "string" || typeof payload.sensor !== "string" || !Number.isFinite(payload.value)) {
      throw new Error("Потрібні deviceId, сенсор і числове значення.");
    }
    const device = this.db.prepare("SELECT id FROM devices WHERE esp32_id = ?").get(payload.deviceId);
    if (!device) throw new Error("Ідентифікатор пристрою не знайдено.");
    const reading = { id: randomUUID(), deviceId: device.id, deviceIdExternal: payload.deviceId, sensor: payload.sensor, value: payload.value, timestamp: payload.timestamp || new Date().toISOString(), source };
    this.db.prepare("INSERT INTO device_readings (id, device_id, sensor, value, timestamp, source) VALUES (?, ?, ?, ?, ?, ?)").run(reading.id, reading.deviceId, reading.sensor, reading.value, reading.timestamp, source);
    this.db.prepare("UPDATE devices SET status = ?, last_seen = ? WHERE id = ?").run("online", reading.timestamp, device.id);
    if (source === "esp32") this.lastPhysicalMessageAt = Date.now();
    const status = this.getStatus();
    this.broadcast("telemetry", { deviceId: reading.deviceIdExternal, sensor: reading.sensor, value: reading.value, timestamp: reading.timestamp, source });
    this.broadcast("device-status", status);
    return { ...reading, status };
  }

  startDemoMode() {
    setInterval(() => {
      // Demo readings pause shortly after physical telemetry so the live device remains authoritative.
      if (Date.now() - this.lastPhysicalMessageAt < 12000) return;
      this.receive({ deviceId: "UNIBOX-001", sensor: "sensor_01", value: 45 + Math.round(Math.random() * 10), timestamp: new Date().toISOString() }, "demo");
    }, 4000).unref();
  }
}
