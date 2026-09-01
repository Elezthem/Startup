async function request(path, options = {}) {
  const response = await fetch(`${window.UNIBOX_API_BASE || ""}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "API request failed.");
  return payload.data;
}

export const api = {
  listLaboratories: () => request("/labs"),
  getLaboratory: (id) => request(`/labs/${id}`),
  startLaboratory: (laboratoryId, userId) => request(`/labs/${laboratoryId}/start`, { method: "POST", body: JSON.stringify({ userId }) }),
  saveMeasurement: (measurement) => request("/measurements", { method: "POST", body: JSON.stringify(measurement) }),
  getMeasurements: (laboratoryId, userId) => request(`/measurements?laboratoryId=${encodeURIComponent(laboratoryId)}&userId=${encodeURIComponent(userId)}`),
  saveResult: (attemptId, result, score) => request(`/attempts/${attemptId}/result`, { method: "POST", body: JSON.stringify({ result, score }) }),
  getAttempts: (laboratoryId, userId) => request(`/labs/${laboratoryId}/attempts?userId=${encodeURIComponent(userId)}`),
  getUniBoxStatus: () => request("/devices/unibox"),
};

export function subscribeToUniBox({ onStatus, onTelemetry, onError }) {
  const stream = new EventSource(`${window.UNIBOX_API_BASE || ""}/api/devices/unibox/stream`);
  stream.addEventListener("device-status", (event) => onStatus(JSON.parse(event.data)));
  stream.addEventListener("telemetry", (event) => onTelemetry(JSON.parse(event.data)));
  stream.onerror = () => onError?.();
  return stream;
}
