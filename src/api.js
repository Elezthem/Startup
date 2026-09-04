async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${window.UNIBOX_API_BASE || ""}/api${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch {
    const target = window.UNIBOX_API_BASE ? "віддаленим сервером" : "локальним сервером";
    throw new Error(`Не вдалося підключитися до сервера. Перевірте з'єднання з ${target} і повторіть спробу.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Не вдалося виконати API-запит.");
  return payload.data;
}

export const api = {
  register: (account) => request("/auth/register", { method: "POST", body: JSON.stringify(account) }),
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  getTeacherOverview: (teacherId) => request(`/teacher/overview?teacherId=${encodeURIComponent(teacherId)}`),
  activateTeacherSubscription: (teacherId) => request("/teacher/subscription/activate", { method: "POST", body: JSON.stringify({ teacherId }) }),
  assignLaboratory: (assignment) => request("/teacher/assignments", { method: "POST", body: JSON.stringify(assignment) }),
  getStudentAssignments: (userId) => request(`/student/assignments?userId=${encodeURIComponent(userId)}`),
  updateStudentLiveSession: (session) => request("/student/live-session", { method: "POST", body: JSON.stringify(session) }),
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
