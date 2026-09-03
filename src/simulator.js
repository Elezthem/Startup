const catalog = {
  esp32: { label: "ESP32", type: "Мікроконтролер", pins: ["3V3", "GND", "GPIO34"] },
  sensor: { label: "Сенсор", type: "Аналоговий сенсор", pins: ["VCC", "GND", "OUT"] },
  led: { label: "LED", type: "Вихід", pins: ["Анод", "Катод"] },
  resistor: { label: "Резистор", type: "220 Ом", pins: ["A", "B"] },
  power: { label: "Живлення", type: "Джерело 3.3V", pins: ["3V3"] },
  ground: { label: "Земля", type: "Спільна земля", pins: ["GND"] },
};

// This serializable definition can be reused by a future UniBox API validator.
export const sensorCircuitDefinition = {
  id: "sensor-to-esp32-v1",
  requiredConnections: [
    ["sensor:VCC", "power:3V3"],
    ["sensor:GND", "ground:GND"],
    ["sensor:OUT", "esp32:GPIO34"],
  ],
};

const state = {
  components: [], connections: [], selectedEndpoint: null, sensorValue: 48,
  status: "Готово", output: "Очікуємо коректну схему.", errors: [], checked: false, measurementCapturedAt: null,
};

const endpoint = (componentId, pin) => `${componentId}:${pin}`;
const normalize = ([first, second]) => [first, second].sort().join("|");
const connectionSet = () => new Set(state.connections.map(normalize));

function formatConnection(connection) {
  return connection.split("|").map((value) => {
    const [kind, pin] = value.split(":");
    return `${catalog[kind].label} ${pin}`;
  }).join(" — ");
}

function validateCircuit() {
  const placed = new Set(state.components.map((component) => component.kind));
  const current = connectionSet();
  const expected = sensorCircuitDefinition.requiredConnections.map(normalize);
  const missingComponents = ["esp32", "sensor", "power", "ground"].filter((kind) => !placed.has(kind));
  const missingConnections = expected.filter((item) => !current.has(item));
  const unexpectedConnections = [...current].filter((item) => !expected.includes(item));
  const errors = [
    ...missingComponents.map((kind) => `Додайте «${catalog[kind].label}» на робочу область.`),
    ...missingConnections.map((item) => `Відсутнє з'єднання: ${formatConnection(item)}.`),
    ...unexpectedConnections.map((item) => `Некоректне з'єднання: ${formatConnection(item)}.`),
  ];
  return { valid: errors.length === 0, errors };
}

function addComponent(kind, position) {
  if (state.components.some((component) => component.kind === kind)) {
    state.errors = [`«${catalog[kind].label}» уже є на робочій області.`];
    return;
  }
  const index = state.components.length;
  state.components.push({ id: kind, kind, left: Math.max(12, position?.left ?? 84 + (index % 3) * 270), top: Math.max(12, position?.top ?? 88 + Math.floor(index / 3) * 210) });
  state.errors = []; state.checked = false; state.status = "Схема збирається";
}

function resetSimulator() {
  Object.assign(state, { components: [], connections: [], selectedEndpoint: null, sensorValue: 48, status: "Готово", output: "Очікуємо коректну схему.", errors: [], checked: false, measurementCapturedAt: null });
}

export function getSimulatorSnapshot() {
  return {
    components: state.components.map((component) => ({ id: component.id, kind: component.kind })),
    connections: state.connections.map((connection) => [...connection]),
    measurement: state.status === "Запущено" ? { value: state.sensorValue, captured: true, capturedAt: state.measurementCapturedAt } : null,
  };
}

// The device transport is intentionally separate from circuit logic.
export function setExternalMeasurement(value, timestamp = new Date().toISOString()) {
  state.sensorValue = value;
  state.measurementCapturedAt = timestamp;
  state.status = "Запущено";
  state.output = `Отримано значення з фізичного пристрою: ${value}% на GPIO34.`;
}

function nodeTemplate(component) {
  const item = catalog[component.kind];
  const pinButton = (pin) => `<button class="sim-pin ${state.selectedEndpoint === endpoint(component.id, pin) ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, pin)}" title="З'єднати ${item.label} ${pin}"><i></i></button>`;
  if (component.kind === "esp32") {
    return `<article class="sim-node sim-node-${component.kind} esp32-board" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="esp32-usb" aria-hidden="true"></div><div class="esp32-antenna" aria-hidden="true"></div>
      <div class="esp32-header header-left" aria-hidden="true"></div><div class="esp32-header header-right" aria-hidden="true"></div>
      <span class="esp32-print" aria-hidden="true">ESP32 DEVKIT V1</span><i class="esp32-led" aria-hidden="true"></i><div class="esp32-chip"><span>ESP32</span><small>ESP32-WROOM-32</small></div><span class="esp32-button esp32-en" aria-hidden="true">EN</span><span class="esp32-button esp32-boot" aria-hidden="true">BOOT</span>
      <div class="esp32-pin-row left"><span>3V3</span><button class="sim-pin ${state.selectedEndpoint === endpoint(component.id, "3V3") ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, "3V3")}" title="З'єднати ESP32 3V3"><i></i></button></div>
      <div class="esp32-pin-row right"><button class="sim-pin ${state.selectedEndpoint === endpoint(component.id, "GPIO34") ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, "GPIO34")}" title="З'єднати ESP32 GPIO34"><i></i></button><span>GPIO34</span></div>
      <div class="esp32-pin-row left"><span>GND</span><button class="sim-pin ${state.selectedEndpoint === endpoint(component.id, "GND") ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, "GND")}" title="З'єднати ESP32 GND"><i></i></button></div>
      <span class="esp32-caption">ESP32 DevKit v1</span>
    </article>`;
  }
  if (component.kind === "sensor") {
    return `<article class="sim-node sensor-board" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="sensor-face"><span class="sensor-lens"></span><b>ANALOG</b><small>СЕНСОР</small></div>
      <div class="sensor-pin-strip"><div><span>VCC</span>${pinButton("VCC")}</div><div><span>GND</span>${pinButton("GND")}</div><div><span>OUT</span>${pinButton("OUT")}</div></div>
      <span class="module-caption">Модуль аналогового сенсора</span>
    </article>`;
  }
  if (component.kind === "led") {
    return `<article class="sim-node led-part" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="led-bulb"><span></span></div><div class="led-legs"><div>${pinButton("Анод")}<span>Анод</span></div><div>${pinButton("Катод")}<span>Катод</span></div></div><span class="module-caption">Червоний LED 5 мм</span>
    </article>`;
  }
  if (component.kind === "resistor") {
    return `<article class="sim-node resistor-part" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="resistor-body"><span></span><i></i><b></b><em></em><strong></strong></div><div class="resistor-ends"><div>${pinButton("A")}<span>A</span></div><div><span>B</span>${pinButton("B")}</div></div><span class="module-caption">Резистор 220 Ом</span>
    </article>`;
  }
  if (component.kind === "power") {
    return `<article class="sim-node power-part" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="power-module"><b>3.3V</b><span>DC ЖИВЛЕННЯ</span><i>+</i></div><div class="single-part-pin"><span>3V3</span>${pinButton("3V3")}</div><span class="module-caption">Джерело живлення</span>
    </article>`;
  }
  if (component.kind === "ground") {
    return `<article class="sim-node ground-part" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
      <div class="ground-symbol"><i></i><b></b><em></em></div><div class="single-part-pin"><span>GND</span>${pinButton("GND")}</div><span class="module-caption">Спільна земля</span>
    </article>`;
  }
  return `<article class="sim-node sim-node-${component.kind}" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
    <div class="sim-node-label"><strong>${item.label}</strong><span>${item.type}</span></div>
    <div class="sim-pins">${item.pins.map((pin, index) => `<button class="sim-pin ${index % 2 ? "right" : "left"} ${state.selectedEndpoint === endpoint(component.id, pin) ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, pin)}" title="З'єднати ${item.label} ${pin}"><i></i>${pin}</button>`).join("")}</div>
  </article>`;
}

function serialMonitorLines(validation) {
  if (state.status === "Запущено" && validation.valid) {
    return ["Ініціалізація WiFi...", "Налаштування завершено.", "Сканування...", "Сканування завершено.", "Знайдено мереж: 3", "1: UniBox-Lab (-42) *", "2: Campus-IoT (-61) *", "3: Guest-WiFi (-75)", `Сенсор GPIO34: ${state.sensorValue}%`];
  }
  if (state.checked && !validation.valid) return ["Збірка не пройшла: виправте з'єднання схеми."];
  if (state.checked) return ["Схему перевірено. Натисніть «Запустити», щоб виконати скетч ESP32."];
  return ["Очікуємо коректну схему."];
}

export function simulatorView({ embedded = false } = {}) {
  const validation = validateCircuit();
  const statusClass = validation.valid && state.checked ? "ok" : state.checked ? "error" : "idle";
  const header = embedded ? "" : `<section class="page-header"><span class="eyebrow">Симулятор</span><h2>Зберіть схему перед реальним експериментом</h2><p>Перетягніть компоненти, з'єднайте контакти та запустіть модель датчика.</p></section>`;
  return `${header}<section class="circuit-simulator wokwi-simulator" data-simulator>
    <aside class="sim-components"><div class="sim-panel-title"><span>01</span><div><b>КОМПОНЕНТИ</b><small>Перетягніть на схему</small></div></div>
      <div class="component-catalog">${Object.entries(catalog).map(([kind, item]) => `<button class="catalog-item" draggable="true" data-component-kind="${kind}" title="Перетягнути «${item.label}» на робочу область"><span class="catalog-symbol">${item.label.slice(0, 1)}</span><span><strong>${item.label}</strong><small>${item.type}</small></span></button>`).join("")}</div>
      <p class="sim-help">Натисніть компонент, щоб додати його, або перетягніть на сітку. Натисніть два контакти, щоб створити дріт.</p>
      <div class="sim-sketch"><div><span class="sketch-dot"></span><strong>wifi-scan.ino</strong></div><code>#include &lt;WiFi.h&gt;<br><br>WiFi.scanNetworks();<br>Serial.println("Scanning...");</code></div></aside>
    <div class="workspace-wrap"><div class="workspace-toolbar"><div><span>diagram.json</span><small>${state.components.length} компонентів · ${state.connections.length} дротів</small></div><div class="workspace-controls"><span class="sim-live-dot ${state.status === "Запущено" ? "running" : ""}"></span><button class="sim-icon-button" data-sim-action="run" title="Запустити симуляцію">▶</button><button class="sim-icon-button" data-sim-action="stop" title="Зупинити симуляцію">■</button></div></div><div class="sim-workspace" data-workspace><svg class="connection-layer" data-connections aria-hidden="true"></svg>${state.components.map(nodeTemplate).join("")}${state.components.length === 0 ? `<div class="workspace-empty"><strong>Додайте ESP32 і сенсор</strong><span>Потім з'єднайте живлення, землю та GPIO34.</span></div>` : ""}</div></div>
    <aside class="sim-status"><div class="sim-panel-title"><span>03</span><div><b>СИМУЛЯЦІЯ</b><small>Сканування WiFi ESP32</small></div></div><div class="status-indicator ${statusClass}"><i></i>${state.checked ? (validation.valid ? "Схема правильна" : "Некоректне з'єднання") : state.status}</div>
      <label class="sensor-control" for="sensor-input"><span>Значення сенсора <strong data-sensor-value>${state.sensorValue}%</strong></span><input id="sensor-input" data-sensor-input type="range" min="0" max="100" value="${state.sensorValue}" /></label>
      <div class="sim-readout"><span>Значення сенсора</span><strong data-sensor-value>${state.sensorValue}%</strong></div><div class="sim-readout"><span>Стан ESP32</span><strong>${validation.valid && state.status === "Запущено" ? "Сканування WiFi виконується" : "Очікуємо схему"}</strong></div><div class="serial-monitor"><div><span>Serial Monitor</span><small>115200 бод</small></div><code>${serialMonitorLines(validation).map((line) => `<span>${line}</span>`).join("")}</code></div><div class="sim-errors"><span>Помилки</span>${state.errors.length ? `<ul>${state.errors.map((error) => `<li>${error}</li>`).join("")}</ul>` : "<p>Помилок не виявлено.</p>"}</div>
      <div class="sim-actions"><button class="primary-button" data-sim-action="run">Запустити симуляцію</button><button class="ghost-button" data-sim-action="check">Перевірити підключення</button><button class="text-button" data-sim-action="reset">Очистити схему</button></div></aside>
  </section>`;
}

function drawConnections(simulator) {
  const workspace = simulator.querySelector("[data-workspace]");
  const svg = simulator.querySelector("[data-connections]");
  if (!workspace || !svg) return;
  const workspaceRect = workspace.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${workspaceRect.width} ${workspaceRect.height}`);
  svg.innerHTML = state.connections.map(([first, second]) => {
    const start = simulator.querySelector(`[data-endpoint="${first}"]`)?.getBoundingClientRect();
    const end = simulator.querySelector(`[data-endpoint="${second}"]`)?.getBoundingClientRect();
    if (!start || !end) return "";
    const x1 = start.left - workspaceRect.left + start.width / 2, y1 = start.top - workspaceRect.top + start.height / 2;
    const x2 = end.left - workspaceRect.left + end.width / 2, y2 = end.top - workspaceRect.top + end.height / 2;
    return `<g class="sim-wire"><path d="M ${x1} ${y1} C ${x1 + 42} ${y1}, ${x2 - 42} ${y2}, ${x2} ${y2}" /><circle cx="${x1}" cy="${y1}" r="5" /><circle cx="${x2}" cy="${y2}" r="5" /></g>`;
  }).join("");
}

export function bindSimulator(root, rerender) {
  const simulator = root.querySelector("[data-simulator]");
  if (!simulator) return;
  const refreshSimulator = () => {
    const template = document.createElement("template");
    template.innerHTML = simulatorView({ embedded: true }).trim();
    const replacement = template.content.querySelector("[data-simulator]");
    if (!replacement) return;
    simulator.replaceWith(replacement);
    bindSimulator(root, rerender);
    root.ownerDocument.defaultView.dispatchEvent(new Event("unibox:simulator-updated"));
  };
  requestAnimationFrame(() => drawConnections(simulator));
  simulator.querySelectorAll("[data-component-kind]").forEach((item) => {
    item.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", item.dataset.componentKind));
    item.addEventListener("click", () => { addComponent(item.dataset.componentKind); refreshSimulator(); });
  });
  const workspace = simulator.querySelector("[data-workspace]");
  workspace.addEventListener("dragover", (event) => event.preventDefault());
  workspace.addEventListener("drop", (event) => { event.preventDefault(); const kind = event.dataTransfer.getData("text/plain"); if (!catalog[kind]) return; const rect = workspace.getBoundingClientRect(); addComponent(kind, { left: event.clientX - rect.left - 78, top: event.clientY - rect.top - 32 }); refreshSimulator(); });
  const syncWireInteraction = () => {
    simulator.querySelectorAll("[data-sim-pin]").forEach((item) => {
      item.classList.toggle("selected", item.dataset.endpoint === state.selectedEndpoint);
    });
    drawConnections(simulator);
  };
  const connectPins = (first, second) => {
    const wire = [first, second];
    if (connectionSet().has(normalize(wire))) state.errors = ["Цей дріт уже існує."];
    else state.connections.push(wire);
    state.selectedEndpoint = null;
    state.checked = false;
    state.status = "Схема збирається";
    syncWireInteraction();
    windowRef.dispatchEvent(new Event("unibox:simulator-updated"));
  };
  const documentRef = root.ownerDocument;
  const windowRef = documentRef.defaultView;
  let previewWire = null;
  let previewMove = null;
  const clearWirePreview = () => {
    previewWire?.remove();
    previewWire = null;
    if (previewMove) windowRef.removeEventListener("pointermove", previewMove);
    previewMove = null;
  };
  const startWirePreview = (pin) => {
    clearWirePreview();
    state.selectedEndpoint = pin.dataset.endpoint;
    state.errors = [];
    syncWireInteraction();
    const svg = simulator.querySelector("[data-connections]");
    previewWire = documentRef.createElementNS("http://www.w3.org/2000/svg", "path");
    previewWire.classList.add("sim-wire-preview");
    svg.append(previewWire);
    previewMove = (moveEvent) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();
      const x1 = pinRect.left - workspaceRect.left + pinRect.width / 2;
      const y1 = pinRect.top - workspaceRect.top + pinRect.height / 2;
      const x2 = moveEvent.clientX - workspaceRect.left;
      const y2 = moveEvent.clientY - workspaceRect.top;
      previewWire.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
    };
    windowRef.addEventListener("pointermove", previewMove);
  };
  workspace.addEventListener("click", (event) => {
    if (event.target === workspace) {
      state.selectedEndpoint = null;
      clearWirePreview();
      syncWireInteraction();
    }
  });
  simulator.querySelectorAll("[data-sim-pin]").forEach((pin) => pin.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = pin.dataset.endpoint;
    if (!state.selectedEndpoint) startWirePreview(pin);
    else if (state.selectedEndpoint === current) {
      state.selectedEndpoint = null;
      clearWirePreview();
      syncWireInteraction();
    } else {
      const first = state.selectedEndpoint;
      clearWirePreview();
      connectPins(first, current);
    }
  }));
  const sensorInput = simulator.querySelector("[data-sensor-input]");
  sensorInput?.addEventListener("input", (event) => {
    state.sensorValue = Number(event.target.value);
    if (state.status === "Запущено") state.output = `GPIO34 отримав ${state.sensorValue}% від сенсора.`;
    simulator.querySelectorAll("[data-sensor-value]").forEach((node) => {
      node.textContent = `${state.sensorValue}%`;
    });
  });
  sensorInput?.addEventListener("change", refreshSimulator);
  simulator.querySelectorAll("[data-sim-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.simAction;
    if (action === "reset") resetSimulator();
    if (action === "stop") { state.status = "Готово"; state.output = "Симуляцію зупинено."; }
    if (action === "check" || action === "run") { const result = validateCircuit(); state.checked = true; state.errors = result.errors; state.status = result.valid && action === "run" ? "Запущено" : result.valid ? "Схема правильна" : "Некоректне з'єднання"; if (result.valid && action === "run") state.measurementCapturedAt = new Date().toISOString(); state.output = result.valid ? action === "run" ? `GPIO34 отримав ${state.sensorValue}% від сенсора.` : "Схему перевірено. Можна запускати." : action === "run" ? "Симуляцію неможливо запустити, доки схема некоректна." : "Виправте вказані з'єднання."; }
    refreshSimulator();
  }));
  simulator.querySelectorAll("[data-sim-node]").forEach((node) => node.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-sim-pin]")) return;
    const component = state.components.find((item) => item.id === node.dataset.simNode); if (!component) return;
    const workspaceRect = workspace.getBoundingClientRect(), nodeRect = node.getBoundingClientRect(), offsetX = event.clientX - nodeRect.left, offsetY = event.clientY - nodeRect.top;
    node.setPointerCapture(event.pointerId);
    const move = (moveEvent) => { component.left = Math.max(6, Math.min(workspaceRect.width - node.offsetWidth - 6, moveEvent.clientX - workspaceRect.left - offsetX)); component.top = Math.max(6, Math.min(workspaceRect.height - node.offsetHeight - 6, moveEvent.clientY - workspaceRect.top - offsetY)); node.style.left = `${component.left}px`; node.style.top = `${component.top}px`; drawConnections(simulator); };
    const end = () => { node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", end); node.removeEventListener("pointercancel", end); windowRef.dispatchEvent(new Event("unibox:simulator-updated")); };
    node.addEventListener("pointermove", move); node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
  }));
}
