import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = fileURLToPath(new URL(".", import.meta.url));
const databasePath = join(serverDir, "..", "data", "unibox.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS laboratories (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, theory TEXT NOT NULL, tasks_json TEXT NOT NULL, components_json TEXT NOT NULL, validation_rules_json TEXT NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, laboratory_id TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT, result_json TEXT, score INTEGER, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(laboratory_id) REFERENCES laboratories(id)) STRICT;
  CREATE TABLE IF NOT EXISTS measurements (id TEXT PRIMARY KEY, laboratory_id TEXT NOT NULL, user_id TEXT NOT NULL, sensor TEXT NOT NULL, value REAL NOT NULL, timestamp TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(laboratory_id) REFERENCES laboratories(id)) STRICT;
  CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, device_name TEXT NOT NULL, esp32_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, last_seen TEXT NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS device_readings (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, sensor TEXT NOT NULL, value REAL NOT NULL, timestamp TEXT NOT NULL, source TEXT NOT NULL, FOREIGN KEY(device_id) REFERENCES devices(id)) STRICT;
  CREATE TABLE IF NOT EXISTS teacher_subscriptions (teacher_id TEXT PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, FOREIGN KEY(teacher_id) REFERENCES users(id)) STRICT;
  CREATE TABLE IF NOT EXISTS lab_assignments (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, student_id TEXT NOT NULL, laboratory_id TEXT NOT NULL, due_date TEXT, created_at TEXT NOT NULL, UNIQUE(teacher_id, student_id, laboratory_id), FOREIGN KEY(teacher_id) REFERENCES users(id), FOREIGN KEY(student_id) REFERENCES users(id), FOREIGN KEY(laboratory_id) REFERENCES laboratories(id)) STRICT;
  CREATE TABLE IF NOT EXISTS student_live_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, laboratory_id TEXT NOT NULL, stage TEXT NOT NULL, circuit_status TEXT NOT NULL, measurement_value REAL, updated_at TEXT NOT NULL, UNIQUE(user_id, laboratory_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(laboratory_id) REFERENCES laboratories(id)) STRICT;
`);

// Existing local databases predate authentication, so add the credential column once.
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((column) => column.name === "password_hash")) {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';");
}

const sensorLab = {
  id: "sensor-lab", title: "Лабораторна робота №1 — Підключення сенсора",
  description: "Підключіть аналоговий сенсор до ESP32, зчитайте його значення та пройдіть автоматичну перевірку.",
  theory: "ESP32 зчитує аналоговий сигнал сенсора через GPIO34 за допомогою аналогово-цифрового перетворювача. Підключіть VCC сенсора до 3.3V, GND до спільної землі, а OUT до GPIO34. У UniBox значення відображається у відсотках і має потрапити в діапазон 45-55%.",
  tasks: ["Підключіть сенсор до ESP32 та отримайте значення в діапазоні 45-55%."], components: ["esp32", "sensor", "power", "ground"],
  validationRules: { requiredConnections: [["sensor:VCC", "power:3V3"], ["sensor:GND", "ground:GND"], ["sensor:OUT", "esp32:GPIO34"]], expectedMeasurements: { key: "sensorValue", unit: "%", target: 50, min: 45, max: 55 }, tolerance: 5, passingConditions: ["circuitCorrect", "measurementAvailable", "measurementCorrect"] },
};

function seed() {
  db.prepare("INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)").run("demo-student", "Maria", "maria@unibox.local", "student");
  db.prepare("INSERT OR IGNORE INTO laboratories (id, title, description, theory, tasks_json, components_json, validation_rules_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(sensorLab.id, sensorLab.title, sensorLab.description, sensorLab.theory, JSON.stringify(sensorLab.tasks), JSON.stringify(sensorLab.components), JSON.stringify(sensorLab.validationRules));
  db.prepare("UPDATE laboratories SET title = ?, description = ?, theory = ?, tasks_json = ? WHERE id = ?").run(sensorLab.title, sensorLab.description, sensorLab.theory, JSON.stringify(sensorLab.tasks), sensorLab.id);
  db.prepare("INSERT OR IGNORE INTO devices (id, device_name, esp32_id, status, last_seen) VALUES (?, ?, ?, ?, ?)").run("unibox-01", "UniBox Demo", "ESP32-UNIBOX-01", "online", new Date().toISOString());
  db.prepare("UPDATE devices SET device_name = ?, esp32_id = ? WHERE id = ?").run("UniBox ESP32", "UNIBOX-001", "unibox-01");
}
seed();

export function serializeLaboratory(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, description: row.description, theory: row.theory, tasks: JSON.parse(row.tasks_json), components: JSON.parse(row.components_json), validationRules: JSON.parse(row.validation_rules_json) };
}

export function serializeAttempt(row) {
  return { id: row.id, userId: row.user_id, laboratoryId: row.laboratory_id, startTime: row.start_time, endTime: row.end_time, result: row.result_json ? JSON.parse(row.result_json) : null, score: row.score };
}

export function serializeUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}
