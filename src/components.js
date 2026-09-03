import { labFlow, labs, navItems, results, uniboxStatus } from "./data.js";
import { simulatorView as circuitSimulatorView } from "./simulator.js";

export function shellLayout({ currentPath, content, user }) {
  const roleNavItems = user?.role === "teacher"
    ? [{ label: "Кабінет викладача", path: "/teacher" }]
    : navItems;
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div class="brand-mark">U</div>
          <div>
            <span class="eyebrow">Інтерактивна IoT-лабораторія</span>
            <h1>UniBox</h1>
          </div>
        </div>
        <nav class="nav-list">
          ${roleNavItems
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
          <span class="eyebrow">${user?.role === "teacher" ? "Викладач" : "Студент"}</span>
          <strong>${user?.name || "Гість"}</strong>
          <p>${user?.email || ""}</p>
          <button class="sidebar-logout" data-action="logout">Вийти</button>
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

export function authView({ mode = "register", error = "", pending = false } = {}) {
  const isLogin = mode === "login";
  return `<main class="auth-page"><section class="auth-card"><div class="auth-brand"><div class="brand-mark">U</div><div><span>SMART LAB PLATFORM</span><h1>UniBox</h1></div></div><div class="auth-copy"><span class="eyebrow">${isLogin ? "Вхід" : "Створення профілю"}</span><h2>${isLogin ? "Повернімося до лабораторії" : "Почнімо роботу в UniBox"}</h2><p>${isLogin ? "Увійдіть як студент або викладач." : "Оберіть роль, щоб отримати відповідний робочий простір."}</p></div>${error ? `<p class="auth-error">${error}</p>` : ""}<form class="auth-form" data-auth-form data-auth-mode="${mode}">${isLogin ? "" : `<label>Ім'я<input name="name" required minlength="2" placeholder="Ім'я та прізвище" /></label>`}<label>Email<input name="email" type="email" required placeholder="name@example.com" /></label><label>Пароль<input name="password" type="password" required minlength="6" placeholder="Щонайменше 6 символів" /></label>${isLogin ? "" : `<fieldset><legend>Роль у платформі</legend><label class="role-option"><input type="radio" name="role" value="student" checked /><span><b>Студент</b><small>Лабораторні, симуляції та результати</small></span></label><label class="role-option"><input type="radio" name="role" value="teacher" /><span><b>Викладач</b><small>Перегляд прогресу та результатів групи</small></span></label></fieldset>`}<button class="primary-button" type="submit" ${pending ? "disabled" : ""}>${pending ? "Зачекайте..." : isLogin ? "Увійти" : "Зареєструватися"}</button></form><button class="auth-switch" data-action="switch-auth">${isLogin ? "Немає облікового запису? Зареєструватися" : "Вже є обліковий запис? Увійти"}</button><button class="auth-back" data-action="show-landing">← Про платформу</button></section></main>`;
}

export function landingView() {
  return `<main class="landing-page"><section class="landing-hero"><div class="landing-nav"><div class="auth-brand"><div class="brand-mark">U</div><div><span>SMART LAB PLATFORM</span><h1>UniBox</h1></div></div><button class="landing-login" data-action="show-auth" data-auth-mode="login">Увійти</button></div><div class="landing-copy"><span class="landing-kicker">Інтерактивна IoT-лабораторія</span><h2>Збирайте схеми, експериментуйте та бачте результат одразу</h2><p>UniBox поєднує в одному середовищі ESP32-симулятор, лабораторні завдання, вимірювання з фізичного набору та автоматичну перевірку.</p><div class="landing-actions"><button class="landing-primary" data-action="show-auth" data-auth-mode="register">Створити обліковий запис</button><button class="landing-secondary" data-action="show-auth" data-auth-mode="login">У мене вже є акаунт</button></div></div><div class="landing-board" aria-hidden="true"><img class="landing-esp32-image" src="./src/assets/esp32-devkit-hero.png" alt="" /><span class="landing-wire wire-one"></span><span class="landing-wire wire-two"></span><span class="landing-sensor">SENSOR</span></div></section><section class="landing-features"><article><span>01</span><h3>Для студентів</h3><p>Покрокові лабораторні, збірка схем та історія результатів.</p></article><article><span>02</span><h3>Симуляція</h3><p>З'єднуйте ESP32 і модулі проводами та перевіряйте схему до експерименту.</p></article><article><span>03</span><h3>Для викладачів</h3><p>Окремий кабінет для контролю активності й прогресу групи.</p></article></section></main>`;
}

function teacherDashboardLegacyView(overview = {}, user) {
  const students = overview.students || [];
  return `<section class="page-header"><span class="eyebrow">Кабінет викладача</span><h2>Вітаю, ${user?.name || "викладачу"}</h2><p>Переглядайте активність студентів та результати виконання лабораторних робіт.</p></section><section class="teacher-stats"><article><span>Студентів</span><strong>${overview.totalStudents || 0}</strong></article><article><span>Середній бал</span><strong>${overview.averageScore || 0}%</strong></article><article><span>Виконано на 100%</span><strong>${overview.completed || 0}</strong></article></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">Група</span><h3>Прогрес студентів</h3></div><span class="teacher-refresh">Оновлюється після здачі роботи</span></div><div class="teacher-table"><div class="teacher-row teacher-row-head"><span>Студент</span><span>Спроби</span><span>Найкращий бал</span><span>Остання активність</span></div>${students.length ? students.map((student) => `<div class="teacher-row"><div><strong>${student.name}</strong><small>${student.email}</small></div><span>${student.attempts}</span><strong>${student.bestScore ?? "-"}${student.bestScore == null ? "" : "%"}</strong><span>${student.lastActivity ? new Date(student.lastActivity).toLocaleDateString("uk-UA") : "Ще немає"}</span></div>`).join("") : `<p class="empty-teacher-state">Студентів ще немає. Після реєстрації вони з'являться в цій таблиці.</p>`}</div></section>`;
}

function teacherStudentStatus(student) {
  const score = Number(student.bestScore);
  if (!student.attempts) return { label: "Не починав", tone: "idle" };
  if (score >= 100) return { label: "Виконано", tone: "complete" };
  if (score >= 70) return { label: "У роботі", tone: "progress" };
  return { label: "Потрібна увага", tone: "attention" };
}

export function teacherDashboardView(overview = {}, user) {
  const students = overview.students || [];
  const assignments = overview.assignments || [];
  const liveSessions = overview.liveSessions || [];
  const laboratories = overview.laboratories || [];
  const subscription = overview.subscription || { plan: "Пробний доступ", status: "trial", expiresAt: "" };
  const subscriptionActive = ["trial", "active"].includes(subscription.status) && (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date());
  const subscriptionLabel = subscription.status === "active" ? "Підписка активна" : subscriptionActive ? "Пробний доступ активний" : "Підписка неактивна";
  const needsAttention = students.filter((student) => teacherStudentStatus(student).tone === "attention").length;
  const inactive = students.filter((student) => !student.attempts).length;
  return `
    <section class="teacher-hero">
      <div><span class="eyebrow">Кабінет викладача</span><h2>Керування навчальною групою</h2><p>Відстежуйте активність, швидко знаходьте студентів і вчасно помічайте тих, кому потрібна допомога.</p></div>
      <div class="teacher-hero-actions"><button class="ghost-button" data-action="teacher-export">Експорт CSV</button><button class="primary-button" data-action="teacher-refresh">Оновити дані</button></div>
    </section>
    <section class="teacher-stats teacher-stats-expanded">
      <article><span>Усього студентів</span><strong>${overview.totalStudents || 0}</strong><small>У поточній групі</small></article>
      <article><span>Середній бал</span><strong>${overview.averageScore || 0}%</strong><small>За найкращими спробами</small></article>
      <article><span>Виконано на 100%</span><strong>${overview.completed || 0}</strong><small>Повністю завершили</small></article>
      <article class="teacher-attention-card"><span>Потребують уваги</span><strong>${needsAttention + inactive}</strong><small>${inactive ? `${inactive} ще не починали` : "Усі вже почали роботу"}</small></article>
    </section>
    <section class="teacher-operations-grid">
      <article class="subscription-card">
        <span class="eyebrow">Доступ викладача</span>
        <div class="subscription-heading"><div><h3>${subscription.plan}</h3><p>${subscriptionLabel}${subscription.expiresAt ? ` до ${new Date(subscription.expiresAt).toLocaleDateString("uk-UA")}` : ""}.</p></div><span class="subscription-state ${subscriptionActive ? "active" : "inactive"}">${subscriptionActive ? "Активно" : "Потрібне продовження"}</span></div>
        <p class="subscription-copy">Підписка відкриває призначення лабораторних, моніторинг роботи в симуляторі та контроль фізичних експериментів з ESP32.</p>
        <button class="${subscription.status === "active" ? "ghost-button" : "primary-button"}" data-action="activate-subscription">${subscription.status === "active" ? "Продовжити UniBox Pro" : "Активувати UniBox Pro"}</button>
        <small class="subscription-note">Демо-активація на 30 днів. Платіжний провайдер можна підключити окремо.</small>
      </article>
      <article class="assignment-card panel">
        <span class="eyebrow">Призначення роботи</span><h3>Надати лабораторну студенту</h3><p>Студент спершу пройде методичку та симуляцію, а потім перейде до реального складання за тією ж схемою.</p>
        <form class="assignment-form" data-teacher-assignment>
          <label>Студент<select name="studentId" required ${subscriptionActive ? "" : "disabled"}><option value="">Оберіть студента</option>${students.map((student) => `<option value="${student.id}">${student.name} · ${student.email}</option>`).join("")}</select></label>
          <label>Лабораторна<select name="laboratoryId" required ${subscriptionActive ? "" : "disabled"}><option value="">Оберіть роботу</option>${laboratories.map((lab) => `<option value="${lab.id}">${lab.title}</option>`).join("")}</select></label>
          <label>Термін виконання<input name="dueDate" type="date" ${subscriptionActive ? "" : "disabled"} /></label>
          <button class="primary-button" type="submit" ${subscriptionActive && students.length && laboratories.length ? "" : "disabled"}>Призначити лабораторну</button>
        </form>
        <div class="assignment-summary"><strong>${assignments.length}</strong><span>активних призначень</span></div>
        ${assignments.length ? `<div class="assignment-list">${assignments.slice(0, 3).map((assignment) => `<div><span>${assignment.studentName}</span><strong>${assignment.laboratoryTitle}</strong><small>${assignment.dueDate ? `до ${new Date(assignment.dueDate).toLocaleDateString("uk-UA")}` : "без терміну"}</small></div>`).join("")}${assignments.length > 3 ? `<small>Ще призначень: ${assignments.length - 3}</small>` : ""}</div>` : ""}
      </article>
    </section>
    <section class="live-monitor panel">
      <div class="teacher-workspace-heading"><div><span class="eyebrow">Онлайн-нагляд</span><h3>Робота студентів у симуляторі та з ESP32</h3><p>Статус оновлюється, коли студент переходить між етапами, збирає схему або отримує показник з фізичного пристрою.</p></div><button class="ghost-button" data-action="teacher-refresh">Оновити монітор</button></div>
      <div class="live-session-list">${liveSessions.length ? liveSessions.map((session) => `<article class="live-session-card"><div class="live-session-top"><div><strong>${session.studentName}</strong><span>${session.laboratoryTitle}</span></div><span class="live-pulse">Онлайн</span></div><dl><div><dt>Етап</dt><dd>${session.stage}</dd></div><div><dt>Стан схеми</dt><dd>${session.circuitStatus}</dd></div><div><dt>Значення</dt><dd>${session.measurementValue == null ? "Очікуємо" : `${session.measurementValue}%`}</dd></div></dl><small>Оновлено: ${new Date(session.updatedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</small></article>`).join("") : `<div class="live-monitor-empty"><strong>Ще немає активних сесій</strong><p>Призначте лабораторну, після чого тут з'являться етапи роботи студентів у симуляторі та з реальним UniBox.</p></div>`}</div>
    </section>
    <section class="teacher-workspace panel">
      <div class="teacher-workspace-heading"><div><span class="eyebrow">Прогрес групи</span><h3>Студенти та результати</h3><p>Скористайтеся пошуком або фільтром, щоб швидше знайти потрібний запис.</p></div><span class="teacher-refresh">Дані оновлюються після здачі лабораторної</span></div>
      <div class="teacher-tools"><label class="teacher-search"><span>Пошук</span><input type="search" data-teacher-search placeholder="Ім'я або email" /></label><label class="teacher-filter"><span>Статус</span><select data-teacher-filter><option value="all">Усі студенти</option><option value="complete">Виконано</option><option value="progress">У роботі</option><option value="attention">Потрібна увага</option><option value="idle">Не починали</option></select></label><span class="teacher-count" data-teacher-count>Показано: ${students.length}</span></div>
      <div class="teacher-table"><div class="teacher-row teacher-row-head"><span>Студент</span><span>Спроби</span><span>Найкращий бал</span><span>Статус</span><span>Остання активність</span></div>${students.length ? students.map((student) => { const status = teacherStudentStatus(student); return `<div class="teacher-row" data-teacher-row data-name="${`${student.name} ${student.email}`.toLowerCase()}" data-status="${status.tone}"><div><strong>${student.name}</strong><small>${student.email}</small></div><span>${student.attempts}</span><strong>${student.bestScore == null ? "-" : `${student.bestScore}%`}</strong><span class="teacher-status ${status.tone}">${status.label}</span><span>${student.lastActivity ? new Date(student.lastActivity).toLocaleDateString("uk-UA") : "Ще немає"}</span></div>`; }).join("") : `<p class="empty-teacher-state">Студентів ще немає. Після реєстрації вони з'являться в цій таблиці.</p>`}</div>
      <p class="teacher-empty-filter" data-teacher-empty hidden>За цими умовами студентів не знайдено.</p>
    </section>
  `;
}

export function studentAssignmentsView(assignments = []) {
  if (!assignments.length) return "";
  return `<section class="student-assignments panel"><div class="panel-heading"><div><span class="eyebrow">План від викладача</span><h3>Призначені лабораторні</h3></div><span class="teacher-refresh">Почніть з методички, далі зберіть схему у симуляторі та повторіть її на ESP32.</span></div><div class="student-assignment-list">${assignments.map((assignment) => `<article class="student-assignment-card"><div><span class="assignment-teacher">Викладач: ${assignment.teacherName}</span><h4>${assignment.laboratoryTitle}</h4><p>${assignment.laboratoryDescription}</p></div><div class="assignment-actions"><small>${assignment.dueDate ? `Здати до ${new Date(assignment.dueDate).toLocaleDateString("uk-UA")}` : "Без встановленого терміну"}</small><button class="primary-button" data-link="${assignment.laboratoryId === "sensor-lab" ? "/labs/lab-1-sensor" : "/labs"}">Відкрити роботу</button></div></article>`).join("")}</div></section>`;
}

export function dashboardView({ studentName, completion, connected, streak, lastResults }) {
  return `
    <section class="hero-card">
      <div>
        <span class="eyebrow">Огляд</span>
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
          <strong>${connected ? "Підключено" : "Не підключено"}</strong>
        </div>
        <div class="metric-card">
          <span>Серія занять</span>
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
      <p>Тут буде інтерактивна зона складання схеми. Для початкової версії залишаємо робоче місце та точку інтеграції.</p>
    </section>
    <section class="panel simulator-panel">
      <div class="sim-placeholder large">
        <div>
          <span class="placeholder-chip">Майбутній модуль</span>
          <strong>Вбудований симулятор схем</strong>
        </div>
        <p>Маршрут уже виділено окремо, тож на наступному етапі сюди можна вмонтувати рушій без перебудови решти продукту.</p>
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
      <p>Оцінка, спроби та дати збережені у форматі, готовому до підключення серверного API.</p>
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
      <p>Початкова версія поки використовує демонстраційні дані, але структура вже готова для Serial bridge, WebSocket або серверного API.</p>
    </section>
    <section class="panel-grid">
      <article class="panel">
        <div class="status-stack">
          <div><span>Статус підключення</span><strong>${uniboxStatus.connection}</strong></div>
          <div><span>ESP32</span><strong>${uniboxStatus.board}</strong></div>
          <div><span>Міст</span><strong>${uniboxStatus.bridge}</strong></div>
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
    <section class="page-header"><span class="eyebrow">Профіль студента</span><h2>Мої результати</h2><p>Збережені спроби лабораторних робіт.</p></section>
    <section class="panel"><div class="panel-heading"><h3>Лабораторна №1</h3><span class="status-pill">${rows.length} спроб</span></div><div class="results-table">${rows.length ? rows.map((attempt, index) => `<div class="table-row"><div><strong>Спроба №${rows.length - index}</strong><span>${new Date(attempt.endTime || attempt.startTime).toLocaleString("uk-UA")}</span></div><div class="table-meta results-meta"><span>${attempt.result?.passed ? "Лабораторну виконано" : "Потрібна перевірка"}</span><strong>${attempt.score ?? 0}%</strong></div></div>`).join("") : `<p>Ще немає збережених результатів.</p>`}</div></section>
  `;
}

function connectionLabel(connection) {
  if (connection === "connected") return "Підключено";
  if (connection === "connecting") return "Підключення";
  return "Не підключено";
}

function realtimeDeviceView(device = {}) {
  const reading = device.latestReading;
  const value = reading ? `${reading.value}%` : "--";
  return `
    <section class="page-header">
      <span class="eyebrow">Пристрій UniBox</span>
      <h2>Підключення фізичного набору</h2>
      <p>ESP32 передає стандартизовану телеметрію через сервер; інтерфейс оновлюється без перезавантаження.</p>
    </section>
    <section class="realtime-device-card">
      <div class="device-live-heading"><div><span class="eyebrow">${device.mode === "live" ? "Фізичний ESP32" : "Демонстраційний режим"}</span><h3>UniBox: ${connectionLabel(device.connection)}</h3></div><span class="connection-badge ${device.connection || "offline"}"><i></i>${connectionLabel(device.connection)}</span></div>
      <div class="device-live-grid"><div><span>ESP32</span><strong>${device.esp32Id || "UNIBOX-001"}</strong><small>${device.status === "online" ? "У МЕРЕЖІ" : "НЕ В МЕРЕЖІ"}</small></div><div class="sensor-live-card"><div class="sensor-orb" aria-hidden="true"><i></i></div><div><span>Аналоговий сенсор</span><strong>${reading?.sensor || "sensor_01"}</strong><small data-device-reading-source>${reading?.source === "esp32" ? "Фізичний пристрій" : "Демонстраційна телеметрія"}</small></div><div class="sensor-signal" aria-label="Сигнал активний"><i></i><i></i><i></i><i></i></div></div><div><span>Поточне значення</span><strong data-device-reading-value>${value}</strong><small data-device-reading-time>${reading?.timestamp ? new Date(reading.timestamp).toLocaleTimeString("uk-UA") : "Очікуємо значення"}</small></div></div>
      <button class="primary-button" data-action="connect-device">${device.connection === "connected" ? "Перепідключити UniBox" : "Підключити UniBox"}</button>
    </section>
  `;
}

function realExperimentView(device = {}) {
  const reading = device.latestReading;
  return `
    <div class="live-experiment">
      <div class="live-experiment-top"><div><span class="eyebrow">Експеримент у реальному часі</span><h4>Підключіть фізичний UniBox</h4></div><span class="connection-badge ${device.connection || "offline"}"><i></i>${connectionLabel(device.connection)}</span></div>
      <div class="experiment-grid"><div class="detail-card"><span>ESP32</span><strong>${device.status === "online" ? "У МЕРЕЖІ" : "Очікує підключення"}</strong></div><div class="detail-card"><span>Сенсор</span><strong>${reading ? `${reading.value}%` : "--"}</strong></div><div class="detail-card"><span>Джерело</span><strong>${reading?.source === "esp32" ? "Фізичний ESP32" : "ДЕМОНСТРАЦІЙНИЙ РЕЖИМ"}</strong></div></div>
      <p>Після першого нового показника система автоматично переходить до перевірки лабораторної.</p>
      <button class="primary-button" data-action="connect-device">Підключити UniBox</button>
    </div>
  `;
}

function laboratoryResultView(evaluation, attemptStats, state = {}) {
  if (state.isSaving) {
    return `<div class="laboratory-result pending-result"><span class="eyebrow">Автоматична перевірка</span><h4>Зберігаємо результат...</h4><p>Створюємо спробу, зберігаємо вимірювання та результат у профілі студента.</p><span class="loading-state">Обробка</span></div>`;
  }
  if (state.error) {
    return `<div class="laboratory-result failed-result"><span class="eyebrow">Помилка збереження</span><h4>Не вдалося завершити лабораторну</h4><p>${state.error}</p><button class="primary-button" data-action="evaluate-lab">Повторити збереження</button></div>`;
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
        <div><span class="eyebrow">Результат лабораторної</span><h4>${evaluation.passed ? "ЛАБОРАТОРНУ ВИКОНАНО" : "ЛАБОРАТОРНА ПОТРЕБУЄ ПЕРЕВІРКИ"}</h4></div>
        <strong class="score-badge">${evaluation.score}%</strong>
      </div>
      <div class="result-rows">
        <div><span>Схема</span>${status(evaluation.checks.circuit)}</div>
        <div><span>Вимірювання</span>${status(evaluation.checks.measurement)}</div>
        <div><span>Завдання</span>${status(evaluation.checks.task)}</div>
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
      <button class="primary-button" data-link="/">До огляду</button>
    </section>
  `;
}
