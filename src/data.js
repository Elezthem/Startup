export const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Лабораторні роботи", path: "/labs" },
  { label: "Симулятор", path: "/simulator" },
  { label: "Мої результати", path: "/results" },
  { label: "UniBox", path: "/unibox" },
];

export const labs = [
  {
    id: "sensor-lab",
    slug: "lab-1-sensor",
    title: "Лабораторна робота №1 — Робота з датчиком",
    shortTitle: "Lab 01",
    description:
      "Підключення сенсора до ESP32, зчитування значення та автоматична перевірка вимірювання.",
    status: "Доступна",
    progress: 42,
    category: "ESP32 + Sensor",
    duration: "25 хв",
    expectedRange: "45-55",
    attempts: 2,
    updatedAt: "01.09.2026",
  },
];

export const dashboard = {
  studentName: "Марія",
  connected: false,
  completion: 42,
  streak: 3,
  lastResults: [
    { lab: "Робота з датчиком", score: 92, status: "Успішно", date: "01.09.2026" },
    { lab: "Тестова перевірка каналу", score: 78, status: "Повторити", date: "30.08.2026" },
  ],
};

export const uniboxStatus = {
  connection: "Не підключено",
  board: "ESP32 DevKit v1",
  bridge: "WebSocket bridge ready",
  sensors: ["DHT11", "Photoresistor", "Potentiometer"],
  lastValue: "48",
  lastSync: "2 хв тому",
};

export const results = [
  {
    lab: "Лабораторна №1 — Робота з датчиком",
    score: 92,
    result: "Завдання виконано",
    date: "01.09.2026",
    attempts: 2,
  },
  {
    lab: "Тестове підключення UniBox",
    score: 78,
    result: "Потрібна повторна перевірка",
    date: "30.08.2026",
    attempts: 1,
  },
];

export const labFlow = [
  {
    key: "theory",
    title: "Теорія",
    eyebrow: "Крок 1",
    ctaLabel: "Перейти до симулятора",
    content: `
      <p>ESP32 — це мікроконтролер, який читає сигнали з датчиків і передає їх у вебплатформу.</p>
      <p>Сенсор вимірює фізичну величину, наприклад температуру, освітленість або вологість.</p>
      <p>Після підключення сигнал з сенсора зчитується через GPIO, обробляється ESP32 і надсилається на платформу UniBox.</p>
    `,
  },
  {
    key: "task",
    title: "Завдання",
    eyebrow: "Крок 2",
    content: `
      <p>Підключіть сенсор до ESP32 та отримайте його показник.</p>
      <div class="details-grid">
        <div class="detail-card">
          <span>Компоненти</span>
          <strong>ESP32, сенсор, breadboard, jumper wires</strong>
        </div>
        <div class="detail-card">
          <span>Схема</span>
          <strong>VCC -> 3.3V, GND -> GND, DATA -> GPIO 34</strong>
        </div>
        <div class="detail-card">
          <span>Очікування</span>
          <strong>Отримати значення сенсора у межах 45-55</strong>
        </div>
      </div>
    `,
  },
  {
    key: "simulation",
    title: "Симуляція",
    eyebrow: "Крок 3",
    content: `
      <p>Майбутній симулятор буде вбудований тут без виходу зі сценарію лабораторної.</p>
      <div class="sim-placeholder">
        <div>
          <span class="placeholder-chip">Simulator Placeholder</span>
          <strong>Зона інтерактивної збірки схеми</strong>
        </div>
        <p>На наступному етапі сюди підключимо canvas/WebGL або зовнішній engine симуляції.</p>
      </div>
    `,
  },
  {
    key: "experiment",
    title: "Експеримент",
    eyebrow: "Крок 4",
    content: `
      <p>Підключіть фізичний UniBox і запустіть вимірювання.</p>
      <div class="experiment-grid">
        <div class="detail-card">
          <span>Статус ESP32</span>
          <strong>Очікує підключення</strong>
        </div>
        <div class="detail-card">
          <span>Поточне значення</span>
          <strong>48</strong>
        </div>
        <div class="detail-card">
          <span>Графік</span>
          <strong>Mock stream ready</strong>
        </div>
      </div>
      <div class="chart">
        <div style="height: 58%"></div>
        <div style="height: 72%"></div>
        <div style="height: 66%"></div>
        <div style="height: 84%"></div>
        <div style="height: 70%"></div>
        <div style="height: 76%"></div>
      </div>
      <button class="primary-button" data-action="measure">Почати вимірювання</button>
    `,
  },
  {
    key: "validation",
    title: "Перевірка",
    eyebrow: "Крок 5",
    content: `
      <div class="validation-grid">
        <div class="metric-card">
          <span>Виміряно</span>
          <strong>48</strong>
        </div>
        <div class="metric-card">
          <span>Очікується</span>
          <strong>45-55</strong>
        </div>
        <div class="metric-card">
          <span>Похибка</span>
          <strong>±5</strong>
        </div>
      </div>
      <div class="success-banner">✓ Завдання виконано. Значення потрапляє в допустимий діапазон.</div>
    `,
  },
];
