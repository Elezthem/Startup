import { dashboard, labFlow } from "./data.js";
import { bindSimulator, getSimulatorSnapshot, setExternalMeasurement } from "./simulator.js";
import { api, subscribeToUniBox } from "./api.js";
import { definitionFromLaboratory, evaluateLaboratory, sensorLabDefinition, summarizeAttempts } from "./lab-validation.js";
import {
  dashboardView,
  labDetailView,
  labsView,
  notFoundView,
  resultsView,
  shellLayout,
  simulatorView,
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

export function createApp(root) {
  registerRoute("/", () => dashboardView(dashboard));
  registerRoute("/labs", () => labsView());
  registerRoute("/labs/:slug", () => labDetailView(currentLabStep, latestLabEvaluation, attemptStats, deviceRealtime, { isSaving: isSavingResult, error: workflowError }));
  registerRoute("/simulator", () => simulatorView());
  registerRoute("/results", () => resultsView(studentAttempts));
  registerRoute("/unibox", () => uniboxView(deviceRealtime));
  registerRoute("/404", () => notFoundView());

  function render() {
    const path = currentRoutePath();
    const route = resolveRoute(path);
    root.innerHTML = shellLayout({
      currentPath: path,
      content: `${backendNotice()}${route.render()}`,
    });
    bindEvents();
    bindSimulator(root, render);
  }

  function bindEvents() {
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
        physicalControl.replaceChildren(hasLiveSensor ? "Start measurement" : deviceRealtime.connection === "offline" ? "UniBox offline" : "Sensor unavailable");
        physicalControl.disabled = !hasLiveSensor;
      }
      const experimentHint = root.querySelector(".live-experiment p");
      if (experimentHint) experimentHint.textContent = hasLiveSensor ? "Поточне значення отримано. Натисніть Start measurement для автоматичної перевірки." : deviceRealtime.connection === "offline" ? "UniBox offline. Перевірте ESP32 або використайте DEMO MODE після відновлення з'єднання." : "Очікуємо перше значення сенсора від UniBox або DEMO MODE.";
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
      const attempt = await api.startLaboratory(activeLabDefinition.id, "demo-student");
      if (snapshot.measurement) {
        await api.saveMeasurement({ laboratoryId: activeLabDefinition.id, userId: "demo-student", sensor: "Sensor", value: snapshot.measurement.value, timestamp: snapshot.measurement.capturedAt });
      }
      latestLabEvaluation = evaluateLaboratory(activeLabDefinition, snapshot);
      await api.saveResult(attempt.id, { ...latestLabEvaluation, clientStartedAt: new Date(labSessionStartedAt).toISOString() }, latestLabEvaluation.score);
      studentAttempts = await api.getAttempts(activeLabDefinition.id, "demo-student");
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
  render();
  void loadBackendData();

  async function loadBackendData() {
    try {
      const laboratory = await api.getLaboratory(sensorLabDefinition.id);
      activeLabDefinition = definitionFromLaboratory(laboratory);
      studentAttempts = await api.getAttempts(activeLabDefinition.id, "demo-student");
      attemptStats = summarizeAttempts(studentAttempts);
      deviceRealtime = { ...deviceRealtime, ...await api.getUniBoxStatus(), connection: "connecting" };
      backendState = "ready";
      render();
      connectDeviceStream();
    } catch (error) {
      console.warn("UniBox API is unavailable", error);
      backendState = "offline";
      render();
    }
  }

  function backendNotice() {
    if (backendState === "loading") return `<div class="app-notice loading">Завантажуємо лабораторію та статус UniBox...</div>`;
    if (backendState === "offline") return `<div class="app-notice error">Backend недоступний. Перевірте локальний сервер UniBox і повторіть спробу.</div>`;
    return "";
  }

  function connectDeviceStream() {
    deviceStream?.close();
    deviceRealtime = { ...deviceRealtime, connection: "connecting" };
    render();
    deviceStream = subscribeToUniBox({
      onStatus: (status) => {
        deviceRealtime = { ...deviceRealtime, ...status, connection: "connected" };
        render();
      },
      onTelemetry: (telemetry) => {
        deviceRealtime = { ...deviceRealtime, status: "online", connection: "connected", latestReading: { sensor: telemetry.sensor, value: telemetry.value, timestamp: telemetry.timestamp, source: telemetry.source }, mode: telemetry.source === "esp32" ? "live" : "demo" };
        setExternalMeasurement(telemetry.value, telemetry.timestamp);
        if (currentRoutePath().startsWith("/labs/") && currentLabStep === 3 && measurementStarted && !automaticValidationStarted) {
          automaticValidationStarted = true;
          currentLabStep = 4;
          void submitLabForValidation();
          return;
        }
        render();
      },
      onError: () => {
        deviceRealtime = { ...deviceRealtime, connection: "offline", status: "offline" };
        render();
      },
    });
  }
}
