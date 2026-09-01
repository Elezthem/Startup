import { labFlow, labs, navItems, results, uniboxStatus } from "./data.js";
import { simulatorView as circuitSimulatorView } from "./simulator.js";

export function shellLayout({ currentPath, content }) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div class="brand-mark">U</div>
          <div>
            <span class="eyebrow">Smart Lab Platform</span>
            <h1>UniBox</h1>
          </div>
        </div>
        <nav class="nav-list">
          ${navItems
            .map(
              (item) => `
                <button class="nav-item ${isActive(currentPath, item.path) ? "active" : ""}" data-link="${item.path}">
                  <span>${item.label}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
        <div class="sidebar-card">
          <span class="eyebrow">MVP Ready</span>
          <strong>Один сценарій лабораторної вже зібраний end-to-end.</strong>
          <p>Наступним кроком можна додати реальний API вимірювань та симулятор.</p>
        </div>
      </aside>
      <main class="content-area">${content}</main>
    </div>
  `;
}

function isActive(currentPath, itemPath) {
  if (itemPath === "/") return currentPath === "/";
  return currentPath.startsWith(itemPath);
}

export function dashboardView({ studentName, completion, connected, streak, lastResults }) {
  return `
    <section class="hero-card">
      <div>
        <span class="eyebrow">Dashboard</span>
        <h2>Вітаю, ${studentName}</h2>
        <p>Працюємо з лабораторією як з єдиним потоком: теорія, симуляція, експеримент і автоматична перевірка.</p>
      </div>
      <div class="hero-stats">
        <div class="metric-card">
          <span>Прогрес</span>
          <strong>${completion}%</strong>
        </div>
        <div class="metric-card">
          <span>UniBox</span>
          <strong>${connected ? "Підключено" : "Offline"}</strong>
        </div>
        <div class="metric-card">
          <span>Streak</span>
          <strong>${streak} дні</strong>
        </div>
      </div>
    </section>

    <section class="panel-grid">
      <article class="panel">
        <div class="panel-heading">
          <h3>Доступні лабораторні</h3>
          <button class="ghost-button" data-link="/labs">Усі роботи</button>
        </div>
        <div class="lab-list">
          ${labs.map(labCard).join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <h3>Останні результати</h3>
          <button class="ghost-button" data-link="/results">Мої результати</button>
        </div>
        <div class="table-list">
          ${lastResults
            .map(
              (item) => `
                <div class="table-row">
                  <div>
                    <strong>${item.lab}</strong>
                    <span>${item.date}</span>
                  </div>
                  <div class="table-meta">
                    <span>${item.status}</span>
                    <strong>${item.score}%</strong>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel compact">
        <div class="panel-heading">
          <h3>Статус UniBox</h3>
        </div>
        <div class="status-stack">
          <div><span>Плата</span><strong>${uniboxStatus.board}</strong></div>
          <div><span>Підключення</span><strong>${uniboxStatus.connection}</strong></div>
          <div><span>Останнє значення</span><strong>${uniboxStatus.lastValue}</strong></div>
        </div>
      </article>
      <article class="panel compact">
        <div class="panel-heading">
          <h3>Готовність MVP</h3>
        </div>
        <p>Архітектура вже розділена на сторінки, дані, компоненти та окремий сценарій лабораторної.</p>
      </article>
    </section>
  `;
}

export function labsView() {
  return `
    <section class="page-header">
      <span class="eyebrow">Лабораторні роботи</span>
      <h2>Практика, прив'язана до реального обладнання</h2>
      <p>Кожна робота поєднує коротку теорію, симуляцію, вимірювання та автоматичну перевірку.</p>
    </section>
    <section class="card-grid">
      ${labs.map(labCard).join("")}
    </section>
  `;
}

function labCard(lab) {
  return `
    <article class="lab-card">
      <div class="lab-card-top">
        <span class="pill">${lab.category}</span>
        <span class="status-pill">${lab.status}</span>
      </div>
      <h3>${lab.title}</h3>
      <p>${lab.description}</p>
      <div class="progress-block">
        <div class="progress-meta">
          <span>Прогрес</span>
          <strong>${lab.progress}%</strong>
        </div>
        <div class="progress-bar"><div style="width: ${lab.progress}%"></div></div>
      </div>
      <div class="lab-card-bottom">
        <span>${lab.duration}</span>
        <button class="primary-button" data-link="/labs/${lab.slug}">Відкрити</button>
      </div>
    </article>
  `;
}

export function simulatorView() {
  return circuitSimulatorView();
  return `
    <section class="page-header">
      <span class="eyebrow">Симулятор</span>
      <h2>Підготовка перед реальним експериментом</h2>
      <p>Тут буде інтерактивна зона складання схеми. Для MVP залишаємо живий placeholder і точку інтеграції.</p>
    </section>
    <section class="panel simulator-panel">
      <div class="sim-placeholder large">
        <div>
          <span class="placeholder-chip">Future Module</span>
          <strong>Embedded circuit simulator</strong>
        </div>
        <p>Маршрут уже виділено окремо, тож на наступному етапі сюди можна вмонтувати engine без перебудови решти продукту.</p>
      </div>
    </section>
  `;
}

export function resultsView(attempts = []) {
  return resultHistoryView(attempts);
  return `
    <section class="page-header">
      <span class="eyebrow">Мої результати</span>
      <h2>Історія виконання лабораторних</h2>
      <p>Оцінка, спроби та дати збережені у форматі, готовому до заміни на backend API.</p>
    </section>
    <section class="panel">
      <div class="results-table">
        ${results
          .map(
            (item) => `
              <div class="table-row table-headerish">
                <div>
                  <strong>${item.lab}</strong>
                  <span>${item.date}</span>
                </div>
                <div class="table-meta results-meta">
                  <span>${item.result}</span>
                  <strong>${item.score}% · ${item.attempts} спроби</strong>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

export function uniboxView(device) {
  return realtimeDeviceView(device);
  return `
    <section class="page-header">
      <span class="eyebrow">UniBox</span>
      <h2>Підключення фізичного набору</h2>
      <p>MVP поки використовує mock data, але структура вже готова для Serial bridge, WebSocket або backend API.</p>
    </section>
    <section class="panel-grid">
      <article class="panel">
        <div class="status-stack">
          <div><span>Статус підключення</span><strong>${uniboxStatus.connection}</strong></div>
          <div><span>ESP32</span><strong>${uniboxStatus.board}</strong></div>
          <div><span>Bridge</span><strong>${uniboxStatus.bridge}</strong></div>
          <div><span>Останнє значення</span><strong>${uniboxStatus.lastValue}</strong></div>
        </div>
        <button class="primary-button" data-action="connect">Підключити</button>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <h3>Сенсори</h3>
          <span class="eyebrow">${uniboxStatus.lastSync}</span>
        </div>
        <div class="sensor-list">
          ${uniboxStatus.sensors.map((sensor) => `<div class="sensor-chip">${sensor}</div>`).join("")}
        </div>
      </article>
    </section>
  `;
}

export function labDetailView(stepIndex, evaluation, attemptStats, device, state = {}) {
  const currentStep = labFlow[stepIndex];

  return `
    <section class="page-header lab-header">
      <div>
        <span class="eyebrow">Лабораторна №1</span>
        <h2>Робота з датчиком</h2>
        <p>Послідовний сценарій: студент рухається по етапах і в кожній точці бачить тільки релевантний крок.</p>
      </div>
      <button class="ghost-button" data-link="/labs">До списку лабораторних</button>
    </section>

    <section class="stepper">
      ${labFlow
        .map(
          (step, index) => `
            <button class="step ${index === stepIndex ? "current" : index < stepIndex ? "done" : ""}" data-step="${index}">
              <span>${index + 1}</span>
              <strong>${step.title}</strong>
            </button>
          `,
        )
        .join("")}
    </section>

    <section class="panel lab-stage">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">${currentStep.eyebrow}</span>
          <h3>${currentStep.title}</h3>
        </div>
      </div>
      <div class="stage-content">
        ${currentStep.key === "simulation" ? circuitSimulatorView({ embedded: true }) : currentStep.key === "experiment" ? realExperimentView(device) : currentStep.key === "validation" ? laboratoryResultView(evaluation, attemptStats, state) : currentStep.content}
      </div>
      <div class="stage-actions">
        <button class="ghost-button" data-action="prev-step" ${stepIndex === 0 ? "disabled" : ""}>Назад</button>
        <div class="stage-actions-right">
          ${""}
          ${
            stepIndex < labFlow.length - 1
              ? `<button class="primary-button" data-action="next-step">Далі</button>`
              : `<button class="primary-button" data-action="finish-lab">${evaluation?.passed ? "Завершити лабораторну" : "Перевірити лабораторну"}</button>`
          }
        </div>
      </div>
    </section>
  `;
}

function resultHistoryView(attempts) {
  const rows = [...attempts].reverse();
  return `
    <section class="page-header"><span class="eyebrow">Student profile</span><h2>Мої результати</h2><p>Збережені backend-спроби лабораторних робіт.</p></section>
    <section class="panel"><div class="panel-heading"><h3>Laboratory №1</h3><span class="status-pill">${rows.length} спроб</span></div><div class="results-table">${rows.length ? rows.map((attempt, index) => `<div class="table-row"><div><strong>Спроба №${rows.length - index}</strong><span>${new Date(attempt.endTime || attempt.startTime).toLocaleString("uk-UA")}</span></div><div class="table-meta results-meta"><span>${attempt.result?.passed ? "Laboratory completed" : "Needs review"}</span><strong>${attempt.score ?? 0}%</strong></div></div>`).join("") : `<p>Ще немає збережених результатів.</p>`}</div></section>
  `;
}

function connectionLabel(connection) {
  if (connection === "connected") return "Connected";
  if (connection === "connecting") return "Connecting";
  return "Offline";
}

function realtimeDeviceView(device = {}) {
  const reading = device.latestReading;
  const value = reading ? `${reading.value}%` : "--";
  return `
    <section class="page-header">
      <span class="eyebrow">UniBox device</span>
      <h2>Підключення фізичного набору</h2>
      <p>ESP32 передає стандартизовану телеметрію через backend; інтерфейс оновлюється без перезавантаження.</p>
    </section>
    <section class="realtime-device-card">
      <div class="device-live-heading"><div><span class="eyebrow">${device.mode === "live" ? "Live ESP32" : "Demo mode"}</span><h3>UniBox ${connectionLabel(device.connection)}</h3></div><span class="connection-badge ${device.connection || "offline"}"><i></i>${connectionLabel(device.connection)}</span></div>
      <div class="device-live-grid"><div><span>ESP32</span><strong>${device.esp32Id || "UNIBOX-001"}</strong><small>${device.status === "online" ? "ONLINE" : "OFFLINE"}</small></div><div><span>Sensor</span><strong>${reading?.sensor || "sensor_01"}</strong><small>${reading?.source === "esp32" ? "Physical device" : "Demo telemetry"}</small></div><div><span>Current value</span><strong>${value}</strong><small>${reading?.timestamp ? new Date(reading.timestamp).toLocaleTimeString("uk-UA") : "Waiting for reading"}</small></div></div>
      <button class="primary-button" data-action="connect-device">${device.connection === "connected" ? "Reconnect UniBox" : "Connect UniBox"}</button>
    </section>
  `;
}

function realExperimentView(device = {}) {
  const reading = device.latestReading;
  return `
    <div class="live-experiment">
      <div class="live-experiment-top"><div><span class="eyebrow">Real-time experiment</span><h4>Підключіть фізичний UniBox</h4></div><span class="connection-badge ${device.connection || "offline"}"><i></i>${connectionLabel(device.connection)}</span></div>
      <div class="experiment-grid"><div class="detail-card"><span>ESP32</span><strong>${device.status === "online" ? "ONLINE" : "Очікує підключення"}</strong></div><div class="detail-card"><span>Сенсор</span><strong>${reading ? `${reading.value}%` : "--"}</strong></div><div class="detail-card"><span>Джерело</span><strong>${reading?.source === "esp32" ? "Фізичний ESP32" : "DEMO MODE"}</strong></div></div>
      <p>Після першого нового показника система автоматично переходить до перевірки лабораторної.</p>
      <button class="primary-button" data-action="connect-device">Підключити UniBox</button>
    </div>
  `;
}

function laboratoryResultView(evaluation, attemptStats, state = {}) {
  if (state.isSaving) {
    return `<div class="laboratory-result pending-result"><span class="eyebrow">Automatic check</span><h4>Зберігаємо результат...</h4><p>Створюємо спробу, зберігаємо вимірювання та результат у профілі студента.</p><span class="loading-state">Processing</span></div>`;
  }
  if (state.error) {
    return `<div class="laboratory-result failed-result"><span class="eyebrow">Save error</span><h4>Не вдалося завершити лабораторну</h4><p>${state.error}</p><button class="primary-button" data-action="evaluate-lab">Повторити збереження</button></div>`;
  }
  if (!evaluation) {
    return `
      <div class="laboratory-result pending-result">
        <span class="eyebrow">Результат лабораторної</span>
        <h4>Готово до автоматичної перевірки</h4>
        <p>Після запуску симуляції система перевірить схему, наявність вимірювання та діапазон 45-55%.</p>
        <button class="primary-button" data-action="evaluate-lab">Перевірити лабораторну</button>
      </div>
    `;
  }

  const status = (check) => `<span class="result-check ${check.passed ? "passed" : "failed"}"><i>${check.passed ? "✓" : "×"}</i><span>${check.label}</span></span>`;
  const duration = attemptStats.latest?.durationSeconds ?? 0;
  return `
    <div class="laboratory-result ${evaluation.passed ? "passed-result" : "failed-result"}">
      <div class="result-heading">
        <div><span class="eyebrow">Результат лабораторної</span><h4>${evaluation.passed ? "LABORATORY PASSED" : "LABORATORY NEEDS REVIEW"}</h4></div>
        <strong class="score-badge">${evaluation.score}%</strong>
      </div>
      <div class="result-rows">
        <div><span>Circuit</span>${status(evaluation.checks.circuit)}</div>
        <div><span>Measurement</span>${status(evaluation.checks.measurement)}</div>
        <div><span>Task</span>${status(evaluation.checks.task)}</div>
      </div>
      <div class="result-measurement"><span>Виміряно</span><strong>${evaluation.measurement ? `${evaluation.measurement.value}${evaluation.measurement.unit}` : "Немає даних"}</strong><span>Очікується ${evaluation.measurement?.expected ?? "45-55%"}, похибка ±${evaluation.measurement?.tolerance ?? 5}%</span></div>
      <div class="feedback-list">${evaluation.feedback.map((item) => `<p>${item}</p>`).join("")}</div>
      <div class="attempt-summary"><span>Спроби: <strong>${attemptStats.attempts}</strong></span><span>Останній результат: <strong>${attemptStats.latest?.score ?? 0}%</strong></span><span>Найкращий результат: <strong>${attemptStats.bestScore}%</strong></span><span>Час: <strong>${duration} с</strong></span></div>
      ${evaluation.passed ? "" : `<button class="ghost-button" data-action="evaluate-lab">Перевірити ще раз</button>`}
    </div>
  `;
}

export function notFoundView() {
  return `
    <section class="panel">
      <span class="eyebrow">404</span>
      <h2>Сторінку не знайдено</h2>
      <p>Перейдімо назад до робочого маршруту UniBox.</p>
      <button class="primary-button" data-link="/">На Dashboard</button>
    </section>
  `;
}
