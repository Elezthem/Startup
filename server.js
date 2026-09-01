import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, serializeAttempt, serializeLaboratory } from "./server/database.js";
import { DeviceGateway } from "./server/device-gateway.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const deviceGateway = new DeviceGateway(db);
const json = (res, status, data) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(data)); };
const fail = (res, status, message) => json(res, status, { error: message });

async function requestBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw new Error("Request body must be valid JSON."); }
}
const userExists = (id) => db.prepare("SELECT id FROM users WHERE id = ?").get(id);
const laboratory = (id) => db.prepare("SELECT * FROM laboratories WHERE id = ?").get(id);

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  if (req.method === "GET" && pathname === "/api/health") return json(res, 200, { data: { status: "ok" } });
  if (req.method === "GET" && pathname === "/api/labs") return json(res, 200, { data: db.prepare("SELECT * FROM laboratories ORDER BY title").all().map(serializeLaboratory) });
  const labMatch = pathname.match(/^\/api\/labs\/([^/]+)$/);
  if (req.method === "GET" && labMatch) { const data = serializeLaboratory(laboratory(labMatch[1])); return data ? json(res, 200, { data }) : fail(res, 404, "Laboratory not found."); }
  const startMatch = pathname.match(/^\/api\/labs\/([^/]+)\/start$/);
  if (req.method === "POST" && startMatch) {
    const body = await requestBody(req), lab = laboratory(startMatch[1]);
    if (!lab) return fail(res, 404, "Laboratory not found.");
    if (!userExists(body.userId)) return fail(res, 400, "Unknown user.");
    const data = { id: randomUUID(), userId: body.userId, laboratoryId: lab.id, startTime: new Date().toISOString() };
    db.prepare("INSERT INTO attempts (id, user_id, laboratory_id, start_time) VALUES (?, ?, ?, ?)").run(data.id, data.userId, data.laboratoryId, data.startTime);
    return json(res, 201, { data });
  }
  const resultMatch = pathname.match(/^\/api\/attempts\/([^/]+)\/result$/);
  if (req.method === "POST" && resultMatch) {
    const body = await requestBody(req), attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(resultMatch[1]);
    if (!attempt) return fail(res, 404, "Attempt not found.");
    if (!Number.isInteger(body.score) || body.score < 0 || body.score > 100 || !body.result || typeof body.result !== "object") return fail(res, 400, "Result and score from 0 to 100 are required.");
    const endTime = new Date().toISOString(), result = JSON.stringify(body.result);
    db.prepare("UPDATE attempts SET end_time = ?, result_json = ?, score = ? WHERE id = ?").run(endTime, result, body.score, attempt.id);
    return json(res, 200, { data: serializeAttempt({ ...attempt, end_time: endTime, result_json: result, score: body.score }) });
  }
  if (req.method === "POST" && pathname === "/api/measurements") {
    const body = await requestBody(req);
    if (!laboratory(body.laboratoryId) || !userExists(body.userId)) return fail(res, 400, "Unknown laboratory or user.");
    if (typeof body.sensor !== "string" || !Number.isFinite(body.value)) return fail(res, 400, "Sensor and numeric value are required.");
    const data = { id: randomUUID(), laboratoryId: body.laboratoryId, userId: body.userId, sensor: body.sensor, value: body.value, timestamp: body.timestamp || new Date().toISOString() };
    db.prepare("INSERT INTO measurements (id, laboratory_id, user_id, sensor, value, timestamp) VALUES (?, ?, ?, ?, ?, ?)").run(data.id, data.laboratoryId, data.userId, data.sensor, data.value, data.timestamp);
    return json(res, 201, { data });
  }
  if (req.method === "GET" && pathname === "/api/measurements") {
    const laboratoryId = searchParams.get("laboratoryId"), userId = searchParams.get("userId");
    if (!laboratoryId || !userId) return fail(res, 400, "laboratoryId and userId are required.");
    const data = db.prepare("SELECT id, laboratory_id AS laboratoryId, user_id AS userId, sensor, value, timestamp FROM measurements WHERE laboratory_id = ? AND user_id = ? ORDER BY timestamp DESC").all(laboratoryId, userId);
    return json(res, 200, { data });
  }
  const attemptsMatch = pathname.match(/^\/api\/labs\/([^/]+)\/attempts$/);
  if (req.method === "GET" && attemptsMatch) {
    const userId = searchParams.get("userId");
    if (!userId) return fail(res, 400, "userId is required.");
    return json(res, 200, { data: db.prepare("SELECT * FROM attempts WHERE laboratory_id = ? AND user_id = ? ORDER BY start_time").all(attemptsMatch[1], userId).map(serializeAttempt) });
  }
  if (req.method === "GET" && pathname === "/api/devices/unibox") {
    const data = deviceGateway.getStatus();
    return data ? json(res, 200, { data }) : fail(res, 404, "UniBox device not found.");
  }
  if (req.method === "GET" && pathname === "/api/devices/unibox/stream") return deviceGateway.connect(res);
  if (req.method === "POST" && pathname === "/api/devices/telemetry") {
    try {
      const data = deviceGateway.receive(await requestBody(req));
      return json(res, 202, { data });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  return fail(res, 404, "API endpoint not found.");
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requestPath).replace(/^([.][.][/\\])+/, "");
    let filePath = join(rootDir, safePath);
    if (!extname(filePath)) filePath = join(rootDir, "index.html");
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "text/plain; charset=utf-8" });
    res.end(content);
  } catch (error) {
    if (error instanceof Error && error.message === "Request body must be valid JSON.") return fail(res, 400, error.message);
    console.error(error);
    fail(res, 500, "Internal server error.");
  }
}).listen(port, () => console.log(`UniBox app and API running at http://localhost:${port}`));
