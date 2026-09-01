const catalog = {
  esp32: { label: "ESP32", type: "Microcontroller", pins: ["3V3", "GND", "GPIO34"] },
  sensor: { label: "Sensor", type: "Analog sensor", pins: ["VCC", "GND", "OUT"] },
  led: { label: "LED", type: "Output", pins: ["Anode", "Cathode"] },
  resistor: { label: "Resistor", type: "220 Ohm", pins: ["A", "B"] },
  power: { label: "Power", type: "3.3V supply", pins: ["3V3"] },
  ground: { label: "Ground", type: "Reference", pins: ["GND"] },
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
  status: "Ready", output: "Waiting for a valid circuit.", errors: [], checked: false, measurementCapturedAt: null,
};

const endpoint = (componentId, pin) => `${componentId}:${pin}`;
const normalize = ([first, second]) => [first, second].sort().join("|");
const connectionSet = () => new Set(state.connections.map(normalize));

function formatConnection(connection) {
  return connection.split("|").map((value) => {
    const [kind, pin] = value.split(":");
    return `${catalog[kind].label} ${pin}`;
  }).join(" to ");
}

function validateCircuit() {
  const placed = new Set(state.components.map((component) => component.kind));
  const current = connectionSet();
  const expected = sensorCircuitDefinition.requiredConnections.map(normalize);
  const missingComponents = ["esp32", "sensor", "power", "ground"].filter((kind) => !placed.has(kind));
  const missingConnections = expected.filter((item) => !current.has(item));
  const unexpectedConnections = [...current].filter((item) => !expected.includes(item));
  const errors = [
    ...missingComponents.map((kind) => `Add ${catalog[kind].label} to the workspace.`),
    ...missingConnections.map((item) => `Missing connection: ${formatConnection(item)}.`),
    ...unexpectedConnections.map((item) => `Incorrect connection: ${formatConnection(item)}.`),
  ];
  return { valid: errors.length === 0, errors };
}

function addComponent(kind, position) {
  if (state.components.some((component) => component.kind === kind)) {
    state.errors = [`${catalog[kind].label} is already on the workspace.`];
    return;
  }
  const index = state.components.length;
  state.components.push({ id: kind, kind, left: Math.max(12, position?.left ?? 70 + (index % 3) * 190), top: Math.max(12, position?.top ?? 70 + Math.floor(index / 3) * 170) });
  state.errors = []; state.checked = false; state.status = "Circuit in progress";
}

function resetSimulator() {
  Object.assign(state, { components: [], connections: [], selectedEndpoint: null, sensorValue: 48, status: "Ready", output: "Waiting for a valid circuit.", errors: [], checked: false, measurementCapturedAt: null });
}

export function getSimulatorSnapshot() {
  return {
    components: state.components.map((component) => ({ id: component.id, kind: component.kind })),
    connections: state.connections.map((connection) => [...connection]),
    measurement: state.status === "Running" ? { value: state.sensorValue, captured: true, capturedAt: state.measurementCapturedAt } : null,
  };
}

// The device transport is intentionally separate from circuit logic.
export function setExternalMeasurement(value, timestamp = new Date().toISOString()) {
  state.sensorValue = value;
  state.measurementCapturedAt = timestamp;
  state.status = "Running";
  state.output = `Live device reading: ${value}% received by GPIO34.`;
}

function nodeTemplate(component) {
  const item = catalog[component.kind];
  return `<article class="sim-node sim-node-${component.kind}" data-sim-node="${component.id}" style="left:${component.left}px;top:${component.top}px">
    <div class="sim-node-label"><strong>${item.label}</strong><span>${item.type}</span></div>
    <div class="sim-pins">${item.pins.map((pin, index) => `<button class="sim-pin ${index % 2 ? "right" : "left"} ${state.selectedEndpoint === endpoint(component.id, pin) ? "selected" : ""}" data-sim-pin data-endpoint="${endpoint(component.id, pin)}" title="Connect ${item.label} ${pin}"><i></i>${pin}</button>`).join("")}</div>
  </article>`;
}

export function simulatorView({ embedded = false } = {}) {
  const validation = validateCircuit();
  const statusClass = validation.valid && state.checked ? "ok" : state.checked ? "error" : "idle";
  const header = embedded ? "" : `<section class="page-header"><span class="eyebrow">Simulator</span><h2>Зберіть схему перед реальним експериментом</h2><p>Перетягніть компоненти, з'єднайте контакти та запустіть MVP-модель датчика.</p></section>`;
  return `${header}<section class="circuit-simulator" data-simulator>
    <aside class="sim-components"><div class="sim-panel-title"><span>01</span><div><b>COMPONENTS</b><small>Drag to workspace</small></div></div>
      <div class="component-catalog">${Object.entries(catalog).map(([kind, item]) => `<button class="catalog-item" draggable="true" data-component-kind="${kind}" title="Drag ${item.label} into workspace"><span class="catalog-symbol">${item.label.slice(0, 1)}</span><span><strong>${item.label}</strong><small>${item.type}</small></span></button>`).join("")}</div>
      <p class="sim-help">Click a component to add it, or drag it to a position. Click two pins to create a wire.</p></aside>
    <div class="workspace-wrap"><div class="workspace-toolbar"><span>WORKSPACE</span><small>${state.components.length} component(s) · ${state.connections.length} wire(s)</small></div><div class="sim-workspace" data-workspace><svg class="connection-layer" data-connections aria-hidden="true"></svg>${state.components.map(nodeTemplate).join("")}${state.components.length === 0 ? `<div class="workspace-empty"><strong>Start with ESP32 and Sensor</strong><span>Then add Power and Ground to complete this circuit.</span></div>` : ""}</div></div>
    <aside class="sim-status"><div class="sim-panel-title"><span>03</span><div><b>SIMULATION</b><small>Lab 01 model</small></div></div><div class="status-indicator ${statusClass}"><i></i>${state.checked ? (validation.valid ? "Circuit correct" : "Incorrect connection") : state.status}</div>
      <label class="sensor-control" for="sensor-input"><span>Sensor input <strong>${state.sensorValue}%</strong></span><input id="sensor-input" data-sensor-input type="range" min="0" max="100" value="${state.sensorValue}" /></label>
      <div class="sim-readout"><span>Sensor value</span><strong>${state.sensorValue}%</strong></div><div class="sim-readout"><span>ESP32 status</span><strong>${validation.valid && state.status === "Running" ? "Reading GPIO34" : "Awaiting circuit"}</strong></div><div class="sim-output"><span>Output</span><code>${state.output}</code></div><div class="sim-errors"><span>Errors</span>${state.errors.length ? `<ul>${state.errors.map((error) => `<li>${error}</li>`).join("")}</ul>` : "<p>No errors reported.</p>"}</div>
      <div class="sim-actions"><button class="primary-button" data-sim-action="run">Run simulation</button><button class="ghost-button" data-sim-action="check">Check circuit</button><button class="text-button" data-sim-action="reset">Reset</button></div></aside>
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
    return `<path d="M ${x1} ${y1} C ${x1 + 42} ${y1}, ${x2 - 42} ${y2}, ${x2} ${y2}" />`;
  }).join("");
}

export function bindSimulator(root, rerender) {
  const simulator = root.querySelector("[data-simulator]");
  if (!simulator) return;
  requestAnimationFrame(() => drawConnections(simulator));
  simulator.querySelectorAll("[data-component-kind]").forEach((item) => {
    item.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", item.dataset.componentKind));
    item.addEventListener("click", () => { addComponent(item.dataset.componentKind); rerender(); });
  });
  const workspace = simulator.querySelector("[data-workspace]");
  workspace.addEventListener("dragover", (event) => event.preventDefault());
  workspace.addEventListener("drop", (event) => { event.preventDefault(); const kind = event.dataTransfer.getData("text/plain"); if (!catalog[kind]) return; const rect = workspace.getBoundingClientRect(); addComponent(kind, { left: event.clientX - rect.left - 78, top: event.clientY - rect.top - 32 }); rerender(); });
  simulator.querySelectorAll("[data-sim-pin]").forEach((pin) => pin.addEventListener("click", (event) => {
    event.stopPropagation(); const current = pin.dataset.endpoint;
    if (!state.selectedEndpoint) { state.selectedEndpoint = current; state.errors = []; }
    else if (state.selectedEndpoint === current) state.selectedEndpoint = null;
    else { const wire = [state.selectedEndpoint, current]; if (connectionSet().has(normalize(wire))) state.errors = ["This wire already exists."]; else state.connections.push(wire); state.selectedEndpoint = null; state.checked = false; state.status = "Circuit in progress"; }
    rerender();
  }));
  simulator.querySelector("[data-sensor-input]")?.addEventListener("input", (event) => { state.sensorValue = Number(event.target.value); if (state.status === "Running") state.output = `GPIO34 received ${state.sensorValue}% from Sensor.`; rerender(); });
  simulator.querySelectorAll("[data-sim-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.simAction;
    if (action === "reset") resetSimulator();
    if (action === "check" || action === "run") { const result = validateCircuit(); state.checked = true; state.errors = result.errors; state.status = result.valid && action === "run" ? "Running" : result.valid ? "Circuit correct" : "Incorrect connection"; if (result.valid && action === "run") state.measurementCapturedAt = new Date().toISOString(); state.output = result.valid ? action === "run" ? `GPIO34 received ${state.sensorValue}% from Sensor.` : "Circuit verified. Ready to run." : action === "run" ? "Simulation cannot start until the circuit is correct." : "Correct the connections listed below."; }
    rerender();
  }));
  simulator.querySelectorAll("[data-sim-node]").forEach((node) => node.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-sim-pin]")) return;
    const component = state.components.find((item) => item.id === node.dataset.simNode); if (!component) return;
    const workspaceRect = workspace.getBoundingClientRect(), nodeRect = node.getBoundingClientRect(), offsetX = event.clientX - nodeRect.left, offsetY = event.clientY - nodeRect.top;
    node.setPointerCapture(event.pointerId);
    const move = (moveEvent) => { component.left = Math.max(6, Math.min(workspaceRect.width - node.offsetWidth - 6, moveEvent.clientX - workspaceRect.left - offsetX)); component.top = Math.max(6, Math.min(workspaceRect.height - node.offsetHeight - 6, moveEvent.clientY - workspaceRect.top - offsetY)); node.style.left = `${component.left}px`; node.style.top = `${component.top}px`; drawConnections(simulator); };
    const end = () => { node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", end); node.removeEventListener("pointercancel", end); };
    node.addEventListener("pointermove", move); node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
  }));
}
