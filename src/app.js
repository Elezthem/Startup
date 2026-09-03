import { dashboard, labFlow } from "./data.js";
import { bindSimulator, getSimulatorSnapshot, setExternalMeasurement } from "./simulator.js";
import { api, subscribeToUniBox } from "./api.js";
import { definitionFromLaboratory, evaluateLaboratory, sensorLabDefinition, summarizeAttempts } from "./lab-validation.js";
import {
  dashboardView,
  authView,
  labDetailView,
  landingView,
  labsView,
  notFoundView,
  resultsView,
  shellLayout,
  simulatorView,
  studentAssignmentsView,
  teacherDashboardView,
  uniboxView,
} from "./components.js";
import { currentRoutePath, navigate, registerRoute, resolveRoute } from "./router.js";

let currentLabStep = 0;
let labSessionStartedAt = Date.now();
let latestLabEvaluation = null;
let activeLabDefinition = sensorLabDefinition;
let attemptStats = { attempts: 0, latest: null, bestScore: 0 };
let deviceRealtime = { connection: "connecting", status: "offline", mode: "demo", latestReading: null };
let deviceStream = null;
let automaticValidationStarted = false;
let measurementStarted = false;
let isSavingResult = false;
let workflowError = "";
let studentAttempts = [];
let backendState = "loading";
let currentUser = readStoredUser();
let authMode = "register";
let authError = "";
let authPending = false;
let teacherOverview = null;
let studentAssignments = [];
let lastLiveSessionSignature = "";
let publicScreen = "landing";

function readStoredUser() {
  try { return JSON.parse(window.localStorage.getItem("unibox-user")); } catch { return null; }
}

const activeUserId = () => currentUser?.id || "demo-student";

export function createApp(root) {
  registerRoute("/", () => `${studentAssignmentsView(studentAssignments)}${dashboardView({ ...dashboard, studentName: currentUser?.name || dashboard.studentName })}`);
  registerRoute("/auth", () => authView({ mode: authMode, error: authError, pending: authPending }));
  registerRoute("/teacher", () => teacherDashboardView(teacherOverview || {}, currentUser));
  registerRoute("/labs", () => labsView());
  registerRoute("/labs/:slug", () => labDetailView(currentLabStep, latestLabEvaluation, attemptStats, deviceRealtime, { isSaving: isSavingResult, error: workflowError }));
  registerRoute("/simulator", () => simulatorView());
  registerRoute("/results", () => resultsView(studentAttempts));
  registerRoute("/unibox", () => uniboxView(deviceRealtime));
  registerRoute("/404", () => notFoundView());

  function render() {
    const path = currentRoutePath();
    const route = resolveRoute(path);
    if (!currentUser) {
      root.innerHTML = publicScreen === "auth" ? authView({ mode: authMode, error: authError, pending: authPending }) : landingView();
      bindEvents();
      return;
    }
    const isTeacher = currentUser.role === "teacher";
    root.innerHTML = shellLayout({
      currentPath: path,
      user: currentUser,
      content: isTeacher ? teacherDashboardView(teacherOverview || {}, currentUser) : `${backendNotice()}${route.render()}`,
    });
    bindEvents();
    if (!isTeacher) {
      bindSimulator(root, render);
      syncStudentLiveSession();
    }
  }

  function bindEvents() {
    const landingLogin = root.querySelector(".landing-nav .landing-login");
    if (landingLogin) {
      const registerButton = document.createElement("button");
      registerButton.className = "landing-register";
      registerButton.dataset.action = "show-auth";
      registerButton.dataset.authMode = "register";
      registerButton.textContent = "Зареєструватися";
      landingLogin.before(registerButton);
    }
    root.querySelectorAll('[data-action="show-auth"]').forEach((button) => button.addEventListener("click", () => {
      authMode = button.dataset.authMode === "login" ? "login" : "register";
      authError = "";
      publicScreen = "auth";
      render();
    }));
    root.querySelector('[data-action="show-landing"]')?.addEventListener("click", () => {
      publicScreen = "landing";
      authError = "";
      render();
    });
    root.querySelector('[data-action="switch-auth"]')?.addEventListener("click", () => {
      authMode = authMode === "login" ? "register" : "login";
      authError = "";
      render();
    });
    root.querySelector("[data-auth-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      authPending = true;
      authError = "";
      render();
      try {
        currentUser = authMode === "login" ? await api.login(values) : await api.register(values);
        window.localStorage.setItem("unibox-user", JSON.stringify(currentUser));
        authPending = false;
        if (currentUser.role === "teacher") await loadTeacherOverview();
        else await loadStudentAssignments();
        navigate(currentUser.role === "teacher" ? "/teacher" : "/");
      } catch (error) {
        authPending = false;
        authError = error.message;
        render();
      }
    });
    root.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
      deviceStream?.close();
      currentUser = null;
      teacherOverview = null;
      studentAssignments = [];
      lastLiveSessionSignature = "";
      publicScreen = "landing";
      authMode = "login";
      authError = "";
      window.localStorage.removeItem("unibox-user");
      navigate("/");
    });
    const teacherSearch = root.querySelector("[data-teacher-search]");
    const teacherFilter = root.querySelector("[data-teacher-filter]");
    const applyTeacherFilters = () => {
      const query = teacherSearch?.value.trim().toLowerCase() || "";
      const filter = teacherFilter?.value || "all";
      const rows = [...root.querySelectorAll("[data-teacher-row]")];
      let visible = 0;
      rows.forEach((row) => {
        const matches = (!query || row.dataset.name.includes(query)) && (filter === "all" || row.dataset.status === filter);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      const count = root.querySelector("[data-teacher-count]");
      if (count) count.textContent = `Показано: ${visible}`;
      const empty = root.querySelector("[data-teacher-empty]");
      if (empty) empty.hidden = visible !== 0;
    };
    teacherSearch?.addEventListener("input", applyTeacherFilters);
    teacherFilter?.addEventListener("change", applyTeacherFilters);
    root.querySelector('[data-action="teacher-refresh"]')?.addEventListener("click", async () => {
      await loadTeacherOverview();
      render();
    });
    root.querySelector('[data-action="activate-subscription"]')?.addEventListener("click", async () => {
      try {
        await api.activateTeacherSubscription(currentUser.id);
        await loadTeacherOverview();
        render();
      } catch (error) {
        window.alert(`Не вдалося активувати підписку: ${error.message}`);
      }
    });
    root.querySelector("[data-teacher-assignment]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await api.assignLaboratory({ ...values, teacherId: currentUser.id });
        await loadTeacherOverview();
        render();
      } catch (error) {
        window.alert(`Не вдалося призначити лабораторну: ${error.message}`);
      }
    });
    root.querySelector('[data-action="teacher-export"]')?.addEventListener("click", () => {
      const rows = teacherOverview?.students || [];
      const csv = ["Студент,Email,Спроби,Найкращий бал,Остання активність", ...rows.map((student) => [student.name, student.email, student.attempts, student.bestScore ?? "", student.lastActivity ? new Date(student.lastActivity).toLocaleDateString("uk-UA") : ""].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "unibox-progress.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
    const startLiveMeasurement = () => {
      if (!deviceRealtime.latestReading || deviceRealtime.connection !== "connected") {
        workflowError = "UniBox ще не передав вимірювання. Перевірте підключення та спробуйте ще раз.";
        render();
        return;
      }
      workflowError = "";
      measurementStarted = true;
      setExternalMeasurement(deviceRealtime.latestReading.value, deviceRealtime.latestReading.timestamp);
      automaticValidationStarted = true;
      currentLabStep = 4;
      void submitLabForValidation();
    };
    if (currentRoutePath().startsWith("/labs/") && currentLabStep === 3) {
      const physicalControl = root.querySelector('[data-action="connect-device"]');
      const hasLiveSensor = Boolean(deviceRealtime.latestReading) && deviceRealtime.connection === "connected";
      if (physicalControl) {
        physicalControl.replaceChildren(hasLiveSensor ? "Почати вимірювання" : deviceRealtime.connection === "offline" ? "UniBox не підключено" : "Сенсор недоступний");
        physicalControl.disabled = !hasLiveSensor;
      }
      const experimentHint = root.querySelector(".live-experiment p");
      if (experimentHint) experimentHint.textContent = hasLiveSensor ? "Поточне значення отримано. Натисніть «Почати вимірювання» для автоматичної перевірки." : deviceRealtime.connection === "offline" ? "UniBox не підключено. Перевірте ESP32 або скористайтеся демонстраційним режимом після відновлення з'єднання." : "Очікуємо перше значення сенсора від UniBox або демонстраційного режиму.";
    }
    const nextStepControl = root.querySelector('[data-action="next-step"]');
    if (nextStepControl && currentLabStep === 0) nextStepControl.replaceChildren("Перейти до завдання");
    if (nextStepControl && currentLabStep === 1) nextStepControl.replaceChildren("Відкрити симулятор");
    if (nextStepControl && currentLabStep === 2) nextStepControl.replaceChildren("Перейти до UniBox");
    root.querySelectorAll("[data-link]").forEach((node) => {
      if (node.dataset.link.startsWith("/labs/")) node.textContent = "Почати";
      node.addEventListener("click", () => {
        if (node.dataset.link.startsWith("/labs/")) {
          currentLabStep = 0;
          latestLabEvaluation = null;
          automaticValidationStarted = false;
          measurementStarted = false;
          workflowError = "";
          labSessionStartedAt = Date.now();
        }
        navigate(node.dataset.link);
      });
    });

    root.querySelectorAll('[data-action="start-lab"]').forEach((node) => {
      node.addEventListener("click", () => {
        currentLabStep = 0;
        latestLabEvaluation = null;
        automaticValidationStarted = false;
        measurementStarted = false;
        workflowError = "";
        labSessionStartedAt = Date.now();
        navigate(`/labs/${node.dataset.labSlug || "lab-1-sensor"}`);
      });
    });

    root.querySelectorAll("[data-step]").forEach((node) => {
      node.addEventListener("click", () => {
        currentLabStep = Number(node.dataset.step);
        if (currentLabStep === 3) { automaticValidationStarted = false; measurementStarted = false; }
        render();
      });
    });

    root.querySelector('[data-action="next-step"]')?.addEventListener("click", () => {
      currentLabStep = Math.min(currentLabStep + 1, labFlow.length - 1);
      if (currentLabStep === 3) { automaticValidationStarted = false; measurementStarted = false; }
      render();
    });

    root.querySelector('[data-action="prev-step"]')?.addEventListener("click", () => {
      currentLabStep = Math.max(currentLabStep - 1, 0);
      render();
    });

    root.querySelector('[data-action="jump-simulation"]')?.addEventListener("click", () => {
      currentLabStep = 2;
      render();
    });

    root.querySelector('[data-action="finish-lab"]')?.addEventListener("click", () => {
      if (!latestLabEvaluation) {
        void submitLabForValidation();
        return;
      }
      if (latestLabEvaluation.passed) navigate("/results");
    });

    root.querySelector('[data-action="evaluate-lab"]')?.addEventListener("click", () => {
      void submitLabForValidation();
    });

    root.querySelector('[data-action="connect-device"]')?.addEventListener("click", (event) => {
      if (currentRoutePath().startsWith("/labs/") && currentLabStep === 3) {
        startLiveMeasurement();
        return;
      }
      connectDeviceStream();
    });

    root.querySelector('[data-action="start-live-measurement"]')?.addEventListener("click", () => {
      startLiveMeasurement();
    });

    root.querySelector('[data-action="connect"]')?.addEventListener("click", () => {
      window.alert("MVP mock: канал підключення підготуємо на наступному етапі через WebSocket або Serial bridge.");
    });

    root.querySelector('[data-action="measure"]')?.addEventListener("click", () => {
      window.alert("MVP mock: вимірювання отримано, наступним етапом підключимо live stream з ESP32.");
    });
  }

  async function submitLabForValidation() {
    isSavingResult = true;
    workflowError = "";
    render();
    try {
      const snapshot = getSimulatorSnapshot();
      const attempt = await api.startLaboratory(activeLabDefinition.id, activeUserId());
      if (snapshot.measurement) {
        await api.saveMeasurement({ laboratoryId: activeLabDefinition.id, userId: activeUserId(), sensor: "Сенсор", value: snapshot.measurement.value, timestamp: snapshot.measurement.capturedAt });
      }
      latestLabEvaluation = evaluateLaboratory(activeLabDefinition, snapshot);
      await api.saveResult(attempt.id, { ...latestLabEvaluation, clientStartedAt: new Date(labSessionStartedAt).toISOString() }, latestLabEvaluation.score);
      studentAttempts = await api.getAttempts(activeLabDefinition.id, activeUserId());
      attemptStats = summarizeAttempts(studentAttempts);
      labSessionStartedAt = Date.now();
      isSavingResult = false;
      render();
    } catch (error) {
      isSavingResult = false;
      workflowError = `Не вдалося зберегти результат: ${error.message}`;
      render();
    }
  }

  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);
  window.addEventListener("unibox:navigate", render);
  window.addEventListener("unibox:simulator-updated", syncStudentLiveSession);
  render();
  void loadBackendData();
  if (currentUser?.role === "teacher") void loadTeacherOverview().then(render).catch(() => render());

  async function loadBackendData() {
    try {
      const laboratory = await api.getLaboratory(sensorLabDefinition.id);
      activeLabDefinition = definitionFromLaboratory(laboratory);
      studentAttempts = await api.getAttempts(activeLabDefinition.id, activeUserId());
      attemptStats = summarizeAttempts(studentAttempts);
      await loadStudentAssignments();
      deviceRealtime = { ...deviceRealtime, ...await api.getUniBoxStatus(), connection: "connecting" };
      backendState = "ready";
      if (currentUser) render();
      connectDeviceStream();
    } catch (error) {
      console.warn("UniBox API is unavailable", error);
      backendState = "offline";
      if (currentUser) render();
    }
  }

  async function loadTeacherOverview() {
    if (currentUser?.role !== "teacher") return;
    teacherOverview = await api.getTeacherOverview(currentUser.id);
  }

  async function loadStudentAssignments() {
    if (currentUser?.role !== "student") return;
    studentAssignments = await api.getStudentAssignments(currentUser.id);
  }

  function syncStudentLiveSession() {
    if (currentUser?.role !== "student" || !currentRoutePath().startsWith("/labs/")) return;
    const snapshot = getSimulatorSnapshot();
    const stage = labFlow[currentLabStep]?.title || "Підготовка";
    const circuitStatus = snapshot.components.length === 0
      ? "Очікує компоненти"
      : snapshot.connections.length === 0
        ? "Компоненти додано"
        : `${snapshot.connections.length} з'єднання в схемі`;
    const measurementValue = snapshot.measurement?.value ?? deviceRealtime.latestReading?.value ?? null;
    const session = { userId: currentUser.id, laboratoryId: activeLabDefinition.id, stage, circuitStatus, measurementValue };
    const signature = JSON.stringify(session);
    if (signature === lastLiveSessionSignature) return;
    lastLiveSessionSignature = signature;
    void api.updateStudentLiveSession(session).catch((error) => {
      // A network failure must not interrupt the student's laboratory work.
      console.warn("Не вдалося оновити живий статус студента", error);
    });
  }

  function backendNotice() {
    if (backendState === "loading") return `<div class="app-notice loading">Завантажуємо лабораторію та статус UniBox...</div>`;
    if (backendState === "offline") return `<div class="app-notice error">Сервер недоступний. Перевірте локальний сервер UniBox і повторіть спробу.</div>`;
    return "";
  }

  function connectDeviceStream() {
    deviceStream?.close();
    deviceRealtime = { ...deviceRealtime, connection: "connecting" };
    if (currentUser) render();
    deviceStream = subscribeToUniBox({
      onStatus: (status) => {
        const stateChanged = deviceRealtime.connection !== "connected"
          || deviceRealtime.status !== status.status
          || deviceRealtime.mode !== status.mode
          || deviceRealtime.esp32Id !== status.esp32Id;
        deviceRealtime = { ...deviceRealtime, ...status, connection: "connected" };
        if (currentUser && stateChanged) render();
      },
      onTelemetry: (telemetry) => {
        deviceRealtime = { ...deviceRealtime, status: "online", connection: "connected", latestReading: { sensor: telemetry.sensor, value: telemetry.value, timestamp: telemetry.timestamp, source: telemetry.source }, mode: telemetry.source === "esp32" ? "live" : "demo" };
        setExternalMeasurement(telemetry.value, telemetry.timestamp);
        syncStudentLiveSession();
        if (currentRoutePath().startsWith("/labs/") && currentLabStep === 3 && measurementStarted && !automaticValidationStarted) {
          automaticValidationStarted = true;
          currentLabStep = 4;
          void submitLabForValidation();
          return;
        }
        refreshTelemetryDisplay();
      },
      onError: () => {
        deviceRealtime = { ...deviceRealtime, connection: "offline", status: "offline" };
        if (currentUser) render();
      },
    });
  }

  function refreshTelemetryDisplay() {
    const reading = deviceRealtime.latestReading;
    if (!reading) return;
    const timestamp = new Date(reading.timestamp).toLocaleTimeString("uk-UA");
    root.querySelectorAll("[data-device-reading-value]").forEach((node) => {
      node.textContent = `${reading.value}%`;
    });
    root.querySelectorAll("[data-device-reading-time]").forEach((node) => {
      node.textContent = timestamp;
    });
    root.querySelectorAll("[data-device-reading-source]").forEach((node) => {
      node.textContent = reading.source === "esp32" ? "Фізичний пристрій" : "Демонстраційна телеметрія";
    });
  }
}
