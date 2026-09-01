import { sensorCircuitDefinition } from "./simulator.js";

export const sensorLabDefinition = {
  id: "sensor-lab",
  title: "Laboratory work No. 1 - Sensor connection",
  requiredComponents: ["esp32", "sensor", "power", "ground"],
  requiredConnections: sensorCircuitDefinition.requiredConnections,
  expectedMeasurements: { key: "sensorValue", unit: "%", target: 50, min: 45, max: 55 },
  tolerance: 5,
  tasks: ["Connect the sensor to ESP32 and read its value."],
  passingConditions: ["circuitCorrect", "measurementAvailable", "measurementCorrect"],
};

export function definitionFromLaboratory(laboratory) {
  return {
    id: laboratory.id, title: laboratory.title, requiredComponents: laboratory.components,
    requiredConnections: laboratory.validationRules.requiredConnections,
    expectedMeasurements: laboratory.validationRules.expectedMeasurements,
    tolerance: laboratory.validationRules.tolerance, tasks: laboratory.tasks,
    passingConditions: laboratory.validationRules.passingConditions,
  };
}

const normalize = ([first, second]) => [first, second].sort().join("|");

export function evaluateLaboratory(definition, snapshot) {
  const placed = new Set(snapshot.components.map((component) => component.kind));
  const missingComponents = definition.requiredComponents.filter((kind) => !placed.has(kind));
  const connections = new Set(snapshot.connections.map(normalize));
  const expected = definition.requiredConnections.map(normalize);
  const missingConnections = expected.filter((connection) => !connections.has(connection));
  const unexpectedConnections = [...connections].filter((connection) => !expected.includes(connection));
  const circuitCorrect = !missingComponents.length && !missingConnections.length && !unexpectedConnections.length;
  const measurement = snapshot.measurement?.value;
  const measurementAvailable = Number.isFinite(measurement) && snapshot.measurement?.captured === true;
  const range = definition.expectedMeasurements;
  const measurementCorrect = measurementAvailable && measurement >= range.min && measurement <= range.max;
  const feedback = [];
  if (missingComponents.includes("sensor") || missingConnections.some((connection) => connection.includes("sensor:OUT"))) feedback.push("Перевірте підключення виходу сенсора до входу GPIO34 ESP32.");
  if (missingConnections.some((connection) => connection.includes("sensor:VCC"))) feedback.push("Підключіть VCC сенсора до живлення 3.3V.");
  if (missingConnections.some((connection) => connection.includes("sensor:GND"))) feedback.push("Підключіть GND сенсора до спільної землі.");
  if (unexpectedConnections.length) feedback.push("Приберіть некоректні з'єднання та залиште лише схему з умов завдання.");
  if (!measurementAvailable) feedback.push("Запустіть симуляцію, щоб система отримала вимірювання сенсора.");
  else if (!measurementCorrect) feedback.push(`Отримане значення не відповідає заданому діапазону ${range.min}-${range.max}${range.unit}.`);
  if (circuitCorrect && measurementCorrect) feedback.push("Схема та вимірювання відповідають усім умовам лабораторної.");
  const checks = {
    circuit: { passed: circuitCorrect, label: circuitCorrect ? "Correct" : "Needs correction" },
    measurement: { passed: measurementCorrect, label: measurementCorrect ? "Correct" : measurementAvailable ? "Out of range" : "Not received" },
    task: { passed: circuitCorrect && measurementCorrect, label: circuitCorrect && measurementCorrect ? "Completed" : "Not completed" },
  };
  const passed = definition.passingConditions.every((condition) => ({ circuitCorrect, measurementAvailable, measurementCorrect })[condition]);
  return { labId: definition.id, passed, score: [circuitCorrect, measurementAvailable, measurementCorrect].filter(Boolean).length * 33 + (passed ? 1 : 0), checks, measurement: measurementAvailable ? { value: measurement, unit: range.unit, expected: `${range.min}-${range.max}${range.unit}`, tolerance: definition.tolerance } : null, feedback, evaluatedAt: new Date().toISOString() };
}

export function summarizeAttempts(attempts) {
  const latest = attempts.at(-1) || null;
  const durationSeconds = latest?.endTime ? Math.max(0, Math.round((new Date(latest.endTime) - new Date(latest.startTime)) / 1000)) : 0;
  return { attempts: attempts.length, latest: latest ? { ...latest, durationSeconds } : null, bestScore: attempts.reduce((best, attempt) => Math.max(best, attempt.score || 0), 0) };
}
