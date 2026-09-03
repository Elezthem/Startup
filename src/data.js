export const navItems = [
  { label: "Огляд", path: "/" },
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
    shortTitle: "ЛР 01",
    description:
      "Підключення сенсора до ESP32, зчитування значення та автоматична перевірка вимірювання.",
    status: "Доступна",
    progress: 42,
    category: "ESP32 + сенсор",
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
  bridge: "WebSocket-міст готовий",
  sensors: ["DHT11", "Фоторезистор", "Потенціометр"],
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
      <section class="theory-section">
        <h4>Що ми вивчаємо</h4>
        <p>У цій лабораторній ви зберете простий вимірювальний вузол: аналоговий сенсор передає сигнал на ESP32, а мікроконтролер зчитує його через вхід GPIO34. Значення перетворюється на зрозумілий відсоток і надсилається до UniBox для відображення та перевірки.</p>
      </section>
      <section class="theory-section">
        <h4>ESP32 і аналоговий сигнал</h4>
        <p>ESP32 — це мікроконтролер, який виконує програму, керує підключеними модулями та обробляє їхні дані. Аналоговий сенсор не передає лише два стани «увімкнено» або «вимкнено»: його вихідна напруга плавно змінюється залежно від вимірюваної величини.</p>
        <p>Вбудований аналогово-цифровий перетворювач ESP32 зчитує цю напругу на GPIO34 і перетворює її на число. У нашому симуляторі це число показується у відсотках від 0 до 100, що допомагає легко контролювати діапазон вимірювання.</p>
      </section>
      <div class="details-grid theory-grid">
        <div class="detail-card"><span>VCC</span><strong>Живлення сенсора</strong><p>Подає напругу 3.3V, потрібну для роботи модуля.</p></div>
        <div class="detail-card"><span>GND</span><strong>Спільна земля</strong><p>Створює спільну точку відліку для ESP32 і сенсора.</p></div>
        <div class="detail-card"><span>OUT</span><strong>Сигнальний вихід</strong><p>Передає змінну напругу з сенсора на GPIO34 ESP32.</p></div>
      </div>
      <section class="theory-section">
        <h4>Як проходять дані</h4>
        <ol class="theory-list">
          <li>Сенсор реагує на фізичну величину, наприклад освітленість, температуру або вологість.</li>
          <li>На контакті OUT формується аналоговий сигнал.</li>
          <li>ESP32 зчитує сигнал через GPIO34 і перетворює його на числове значення.</li>
          <li>UniBox показує результат та порівнює його з допустимим діапазоном 45-55%.</li>
        </ol>
      </section>
      <section class="theory-section theory-note">
        <h4>Важливо перед підключенням</h4>
        <p>Спочатку з'єднайте VCC сенсора з 3.3V, а GND — зі спільною землею. Лише після цього підключайте OUT до GPIO34. Не подавайте на вхід ESP32 напругу вище 3.3V: це може пошкодити мікроконтролер.</p>
      </section>
    `,
  },
  {
    key: "task",
    title: "Завдання",
    eyebrow: "Крок 2",
    content: `
      <section class="task-intro">
        <p>Зберіть у симуляторі схему, у якій аналоговий сенсор живиться від ESP32 та передає свій сигнал на вхід GPIO34. Після перевірки схеми запустіть симуляцію й переконайтеся, що показник сенсора потрапляє у заданий діапазон.</p>
      </section>
      <div class="details-grid">
        <div class="detail-card">
          <span>1. Додайте компоненти</span>
          <strong>ESP32, аналоговий сенсор, живлення та землю</strong>
          <p>Додайте кожен компонент на робочу область симулятора. Макетна плата й дроти імітуються з'єднаннями між контактами.</p>
        </div>
        <div class="detail-card">
          <span>2. Зберіть схему</span>
          <strong>VCC → 3.3V, GND → GND, OUT → GPIO34</strong>
          <p>Створіть рівно три дроти. Переконайтеся, що OUT сенсора підключено саме до GPIO34, а не до контакту живлення.</p>
        </div>
        <div class="detail-card">
          <span>3. Перевірте результат</span>
          <strong>Отримайте значення в межах 45-55%</strong>
          <p>Натисніть «Перевірити схему», запустіть симуляцію та за потреби відрегулюйте повзунок сенсора до допустимого діапазону.</p>
        </div>
      </div>
      <section class="task-checklist">
        <h4>Критерії успішного виконання</h4>
        <ul>
          <li>На робочій області є ESP32, сенсор, живлення та земля.</li>
          <li>Усі три з'єднання виконані без зайвих дротів.</li>
          <li>Симулятор не показує помилок, а ESP32 отримує дані на GPIO34.</li>
          <li>Значення сенсора перебуває в інтервалі від 45% до 55%.</li>
        </ul>
      </section>
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
          <span class="placeholder-chip">Місце для симулятора</span>
          <strong>Зона інтерактивної збірки схеми</strong>
        </div>
      <p>На наступному етапі сюди підключимо canvas/WebGL або зовнішній рушій симуляції.</p>
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
          <strong>Демонстраційний потік готовий</strong>
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
