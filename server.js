import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, serializeAttempt, serializeLaboratory, serializeUser } from "./server/database.js";
import { DeviceGateway } from "./server/device-gateway.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const deviceGateway = new DeviceGateway(db);
const json = (res, status, data) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(data)); };
const fail = (res, status, message) => json(res, status, { error: message });

async function requestBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw new Error("Тіло запиту має містити коректний JSON."); }
}
const userExists = (id) => db.prepare("SELECT id FROM users WHERE id = ?").get(id);
const laboratory = (id) => db.prepare("SELECT * FROM laboratories WHERE id = ?").get(id);
const teacherSubscription = (teacherId) => {
  db.prepare("INSERT OR IGNORE INTO teacher_subscriptions (teacher_id, plan, status, expires_at) VALUES (?, ?, ?, ?)").run(teacherId, "Пробний доступ", "trial", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
  return db.prepare("SELECT plan, status, expires_at AS expiresAt FROM teacher_subscriptions WHERE teacher_id = ?").get(teacherId);
};
const activeTeacherSubscription = (teacherId) => {
  const subscription = teacherSubscription(teacherId);
  return subscription.status !== "expired" && new Date(subscription.expiresAt) > new Date();
};
const passwordHash = (password, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const passwordMatches = (password, stored) => {
  const [salt, expected] = (stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  if (req.method === "GET" && pathname === "/api/health") return json(res, 200, { data: { status: "ok" } });
  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await requestBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role === "teacher" ? "teacher" : body.role === "student" ? "student" : "";
    if (name.length < 2 || !email.includes("@") || typeof body.password !== "string" || body.password.length < 6 || !role) return fail(res, 400, "Вкажіть ім'я, коректний email, роль і пароль щонайменше з 6 символів.");
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return fail(res, 409, "Обліковий запис із цим email уже існує.");
    const user = { id: `user-${randomUUID()}`, name, email, role };
    db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)").run(user.id, user.name, user.email, user.role, passwordHash(body.password));
    if (user.role === "teacher") teacherSubscription(user.id);
    return json(res, 201, { data: user });
  }
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await requestBody(req), email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || typeof body.password !== "string" || !passwordMatches(body.password, user.password_hash)) return fail(res, 401, "Неправильний email або пароль.");
    return json(res, 200, { data: serializeUser(user) });
  }
  if (req.method === "GET" && pathname === "/api/teacher/overview") {
    const teacherId = searchParams.get("teacherId");
    const teacher = db.prepare("SELECT role FROM users WHERE id = ?").get(teacherId);
    if (!teacher || teacher.role !== "teacher") return fail(res, 403, "Потрібен обліковий запис викладача.");
    const students = db.prepare("SELECT u.id, u.name, u.email, COUNT(a.id) AS attempts, MAX(a.score) AS bestScore, MAX(a.end_time) AS lastActivity FROM users u LEFT JOIN attempts a ON a.user_id = u.id WHERE u.role = 'student' GROUP BY u.id ORDER BY u.name").all();
    const completed = students.filter((student) => Number(student.bestScore) >= 100).length;
    const scores = students.map((student) => Number(student.bestScore)).filter(Number.isFinite);
    const assignments = db.prepare("SELECT a.id, a.student_id AS studentId, u.name AS studentName, a.laboratory_id AS laboratoryId, l.title AS laboratoryTitle, a.due_date AS dueDate, a.created_at AS createdAt FROM lab_assignments a JOIN users u ON u.id = a.student_id JOIN laboratories l ON l.id = a.laboratory_id WHERE a.teacher_id = ? ORDER BY a.created_at DESC").all(teacherId);
    const liveSessions = db.prepare("SELECT s.user_id AS userId, u.name AS studentName, s.laboratory_id AS laboratoryId, l.title AS laboratoryTitle, s.stage, s.circuit_status AS circuitStatus, s.measurement_value AS measurementValue, s.updated_at AS updatedAt FROM student_live_sessions s JOIN lab_assignments a ON a.student_id = s.user_id AND a.laboratory_id = s.laboratory_id JOIN users u ON u.id = s.user_id JOIN laboratories l ON l.id = s.laboratory_id WHERE a.teacher_id = ? ORDER BY s.updated_at DESC").all(teacherId);
    const laboratories = db.prepare("SELECT id, title, description FROM laboratories ORDER BY title").all().map(serializeLaboratory);
    return json(res, 200, { data: { students, totalStudents: students.length, completed, averageScore: scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0, subscription: teacherSubscription(teacherId), assignments, liveSessions, laboratories } });
  }
  if (req.method === "POST" && pathname === "/api/teacher/subscription/activate") {
    const body = await requestBody(req);
    const teacher = db.prepare("SELECT role FROM users WHERE id = ?").get(body.teacherId);
    if (!teacher || teacher.role !== "teacher") return fail(res, 403, "Потрібен обліковий запис викладача.");
    const subscription = { plan: "UniBox Pro", status: "active", expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
    db.prepare("INSERT INTO teacher_subscriptions (teacher_id, plan, status, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(teacher_id) DO UPDATE SET plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at").run(body.teacherId, subscription.plan, subscription.status, subscription.expiresAt);
    return json(res, 200, { data: subscription });
  }
  if (req.method === "POST" && pathname === "/api/teacher/assignments") {
    const body = await requestBody(req);
    const teacher = db.prepare("SELECT role FROM users WHERE id = ?").get(body.teacherId);
    const student = db.prepare("SELECT role FROM users WHERE id = ?").get(body.studentId);
    if (!teacher || teacher.role !== "teacher" || !activeTeacherSubscription(body.teacherId)) return fail(res, 403, "Потрібна активна підписка викладача.");
    if (!student || student.role !== "student" || !laboratory(body.laboratoryId)) return fail(res, 400, "Оберіть коректного студента та лабораторну роботу.");
    const assignment = { id: randomUUID(), teacherId: body.teacherId, studentId: body.studentId, laboratoryId: body.laboratoryId, dueDate: typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null, createdAt: new Date().toISOString() };
    db.prepare("INSERT INTO lab_assignments (id, teacher_id, student_id, laboratory_id, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(teacher_id, student_id, laboratory_id) DO UPDATE SET due_date = excluded.due_date, created_at = excluded.created_at").run(assignment.id, assignment.teacherId, assignment.studentId, assignment.laboratoryId, assignment.dueDate, assignment.createdAt);
    return json(res, 201, { data: assignment });
  }
  if (req.method === "GET" && pathname === "/api/student/assignments") {
    const userId = searchParams.get("userId");
    const student = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    if (!student || student.role !== "student") return fail(res, 403, "Потрібен обліковий запис студента.");
    const assignments = db.prepare("SELECT a.id, a.laboratory_id AS laboratoryId, l.title AS laboratoryTitle, l.description AS laboratoryDescription, a.due_date AS dueDate, t.name AS teacherName FROM lab_assignments a JOIN laboratories l ON l.id = a.laboratory_id JOIN users t ON t.id = a.teacher_id WHERE a.student_id = ? ORDER BY a.created_at DESC").all(userId);
    return json(res, 200, { data: assignments });
  }
  if (req.method === "POST" && pathname === "/api/student/live-session") {
    const body = await requestBody(req);
    const student = db.prepare("SELECT role FROM users WHERE id = ?").get(body.userId);
    if (!student || student.role !== "student" || !laboratory(body.laboratoryId)) return fail(res, 400, "Некоректні дані сесії студента.");
    const session = { id: randomUUID(), userId: body.userId, laboratoryId: body.laboratoryId, stage: typeof body.stage === "string" ? body.stage : "Підготовка", circuitStatus: typeof body.circuitStatus === "string" ? body.circuitStatus : "Очікує схему", measurementValue: Number.isFinite(body.measurementValue) ? body.measurementValue : null, updatedAt: new Date().toISOString() };
    db.prepare("INSERT INTO student_live_sessions (id, user_id, laboratory_id, stage, circuit_status, measurement_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, laboratory_id) DO UPDATE SET stage = excluded.stage, circuit_status = excluded.circuit_status, measurement_value = excluded.measurement_value, updated_at = excluded.updated_at").run(session.id, session.userId, session.laboratoryId, session.stage, session.circuitStatus, session.measurementValue, session.updatedAt);
    return json(res, 200, { data: session });
  }
  if (req.method === "GET" && pathname === "/api/labs") return json(res, 200, { data: db.prepare("SELECT * FROM laboratories ORDER BY title").all().map(serializeLaboratory) });
  const labMatch = pathname.match(/^\/api\/labs\/([^/]+)$/);
  if (req.method === "GET" && labMatch) { const data = serializeLaboratory(laboratory(labMatch[1])); return data ? json(res, 200, { data }) : fail(res, 404, "Лабораторну роботу не знайдено."); }
  const startMatch = pathname.match(/^\/api\/labs\/([^/]+)\/start$/);
  if (req.method === "POST" && startMatch) {
    const body = await requestBody(req), lab = laboratory(startMatch[1]);
    if (!lab) return fail(res, 404, "Лабораторну роботу не знайдено.");
    if (!userExists(body.userId)) return fail(res, 400, "Користувача не знайдено.");
    const data = { id: randomUUID(), userId: body.userId, laboratoryId: lab.id, startTime: new Date().toISOString() };
    db.prepare("INSERT INTO attempts (id, user_id, laboratory_id, start_time) VALUES (?, ?, ?, ?)").run(data.id, data.userId, data.laboratoryId, data.startTime);
    return json(res, 201, { data });
  }
  const resultMatch = pathname.match(/^\/api\/attempts\/([^/]+)\/result$/);
  if (req.method === "POST" && resultMatch) {
    const body = await requestBody(req), attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(resultMatch[1]);
    if (!attempt) return fail(res, 404, "Спробу не знайдено.");
    if (!Number.isInteger(body.score) || body.score < 0 || body.score > 100 || !body.result || typeof body.result !== "object") return fail(res, 400, "Потрібні результат і бал від 0 до 100.");
    const endTime = new Date().toISOString(), result = JSON.stringify(body.result);
    db.prepare("UPDATE attempts SET end_time = ?, result_json = ?, score = ? WHERE id = ?").run(endTime, result, body.score, attempt.id);
    return json(res, 200, { data: serializeAttempt({ ...attempt, end_time: endTime, result_json: result, score: body.score }) });
  }
  if (req.method === "POST" && pathname === "/api/measurements") {
    const body = await requestBody(req);
    if (!laboratory(body.laboratoryId) || !userExists(body.userId)) return fail(res, 400, "Лабораторну роботу або користувача не знайдено.");
    if (typeof body.sensor !== "string" || !Number.isFinite(body.value)) return fail(res, 400, "Потрібні сенсор і числове значення.");
    const data = { id: randomUUID(), laboratoryId: body.laboratoryId, userId: body.userId, sensor: body.sensor, value: body.value, timestamp: body.timestamp || new Date().toISOString() };
    db.prepare("INSERT INTO measurements (id, laboratory_id, user_id, sensor, value, timestamp) VALUES (?, ?, ?, ?, ?, ?)").run(data.id, data.laboratoryId, data.userId, data.sensor, data.value, data.timestamp);
    return json(res, 201, { data });
  }
  if (req.method === "GET" && pathname === "/api/measurements") {
    const laboratoryId = searchParams.get("laboratoryId"), userId = searchParams.get("userId");
    if (!laboratoryId || !userId) return fail(res, 400, "Потрібні laboratoryId та userId.");
    const data = db.prepare("SELECT id, laboratory_id AS laboratoryId, user_id AS userId, sensor, value, timestamp FROM measurements WHERE laboratory_id = ? AND user_id = ? ORDER BY timestamp DESC").all(laboratoryId, userId);
    return json(res, 200, { data });
  }
  const attemptsMatch = pathname.match(/^\/api\/labs\/([^/]+)\/attempts$/);
  if (req.method === "GET" && attemptsMatch) {
    const userId = searchParams.get("userId");
    if (!userId) return fail(res, 400, "Потрібен userId.");
    return json(res, 200, { data: db.prepare("SELECT * FROM attempts WHERE laboratory_id = ? AND user_id = ? ORDER BY start_time").all(attemptsMatch[1], userId).map(serializeAttempt) });
  }
  if (req.method === "GET" && pathname === "/api/devices/unibox") {
    const data = deviceGateway.getStatus();
    return data ? json(res, 200, { data }) : fail(res, 404, "Пристрій UniBox не знайдено.");
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
  return fail(res, 404, "API-адресу не знайдено.");
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
    if (error instanceof Error && error.message === "Тіло запиту має містити коректний JSON.") return fail(res, 400, error.message);
    console.error(error);
    fail(res, 500, "Внутрішня помилка сервера.");
  }
}).listen(port, () => console.log(`UniBox app and API running at http://localhost:${port}`));
