const STORAGE_KEYS = {
  current: "scribblenest.currentLesson",
  stash: "scribblenest.stash",
  history: "scribblenest.drawnHistory"
};

const lessons = window.SCRIBBLENEST_LESSONS;
const practiceCards = window.SCRIBBLENEST_PRACTICE;

let deferredInstallPrompt = null;
let currentLesson = loadCurrentLesson() || pickTinyBuild();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadCurrentLesson() {
  const savedId = readJson(STORAGE_KEYS.current, null);
  return lessons.find((lesson) => lesson.id === savedId) || null;
}

function saveCurrentLesson() {
  writeJson(STORAGE_KEYS.current, currentLesson.id);
}

function getStash() {
  return readJson(STORAGE_KEYS.stash, []);
}

function setStash(stash) {
  writeJson(STORAGE_KEYS.stash, stash);
}

function getHistory() {
  return readJson(STORAGE_KEYS.history, {});
}

function setHistory(history) {
  writeJson(STORAGE_KEYS.history, history);
}

function pickTinyBuild() {
  const stash = getStash();
  const history = getHistory();
  const savedIds = new Set(stash.map((item) => item.lessonId));

  const scored = lessons.map((lesson) => {
    const record = history[lesson.id] || {};
    let score = 10;

    if (!record.seen) score += 5;
    if (savedIds.has(lesson.id) && !record.drawn) score -= 2;
    if (record.drawn) score -= 3;
    if (record.lastSeen && Date.now() - record.lastSeen < 1000 * 60 * 10) score -= 5;

    score += Math.random() * 2;

    return { lesson, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored[0].lesson;

  history[picked.id] = {
    ...(history[picked.id] || {}),
    seen: true,
    lastSeen: Date.now()
  };
  setHistory(history);

  return picked;
}

function createList(items, type = "ul") {
  const list = document.createElement(type);
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  return list;
}

function renderLesson() {
  $("#homeTitle").textContent = currentLesson.name;
  $("#startShape").innerHTML = `Start with: <strong>${currentLesson.baseShape}</strong>`;
  $("#lessonCard").innerHTML = "";

  const title = document.createElement("div");
  title.className = "lesson-section wide";
  title.innerHTML = `
    <p class="eyebrow">Draw With Me Card</p>
    <h2>${currentLesson.name}</h2>
    <p><strong>Face zone:</strong> ${currentLesson.faceZone}</p>
  `;

  const grid = document.createElement("div");
  grid.className = "lesson-grid";

  const start = section("Start Here", currentLesson.startHere);
  const build = section("Build Order");
  build.append(createList(currentLesson.buildSteps, "ol"));

  const setup = section("Procreate Setup");
  setup.append(createList(currentLesson.procreateSetup));

  const trap = section("Beginner Trap", currentLesson.beginnerTrap, "warning");
  const lesson = section("Tiny Lesson", currentLesson.tinyLesson);
  const dont = section("Don’t Add Yet");
  dont.append(createList(currentLesson.dontAddYet));
  const redraw = section("Redraw Spell", chooseRedrawTwist(currentLesson), "spell");

  grid.append(title, start, build, setup, trap, lesson, dont, redraw);
  $("#lessonCard").append(grid);
}

function section(titleText, bodyText = "", extraClass = "") {
  const node = document.createElement("section");
  node.className = `lesson-section ${extraClass}`.trim();
  const heading = document.createElement("h3");
  heading.textContent = titleText;
  node.append(heading);
  if (bodyText) {
    const p = document.createElement("p");
    p.textContent = bodyText;
    node.append(p);
  }
  return node;
}

function chooseRedrawTwist(lesson) {
  const stashItem = getStash().find((item) => item.lessonId === lesson.id);
  const count = stashItem?.redrawCount || 0;
  const index = Math.min(count, lesson.redrawTwists.length - 1);
  return lesson.redrawTwists[index];
}

function saveToStash() {
  const stash = getStash();
  const existing = stash.find((item) => item.lessonId === currentLesson.id);

  if (existing) {
    announce("Already saved in your stash.");
    return;
  }

  stash.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    lessonId: currentLesson.id,
    savedAt: new Date().toISOString(),
    drawn: false,
    redrawCount: 0,
    lastRedrawTwist: chooseRedrawTwist(currentLesson)
  });

  setStash(stash);
  renderStash();
  announce("Saved to your stash.");
}

function markDrawn(lessonId) {
  const stash = getStash().map((item) => {
    if (item.lessonId !== lessonId) return item;
    return { ...item, drawn: !item.drawn };
  });
  setStash(stash);

  const history = getHistory();
  history[lessonId] = {
    ...(history[lessonId] || {}),
    drawn: stash.find((item) => item.lessonId === lessonId)?.drawn || false,
    lastDrawn: Date.now()
  };
  setHistory(history);

  renderStash();
}

function bumpRedraw(lessonId) {
  const stash = getStash().map((item) => {
    if (item.lessonId !== lessonId) return item;
    const lesson = lessons.find((entry) => entry.id === lessonId);
    const redrawCount = item.redrawCount + 1;
    return {
      ...item,
      redrawCount,
      lastRedrawTwist: lesson.redrawTwists[Math.min(redrawCount, lesson.redrawTwists.length - 1)]
    };
  });
  setStash(stash);
  renderStash();

  if (currentLesson.id === lessonId) renderLesson();
}

function removeStashItem(id) {
  setStash(getStash().filter((item) => item.id !== id));
  renderStash();
}

function openLesson(lessonId) {
  const lesson = lessons.find((entry) => entry.id === lessonId);
  if (!lesson) return;

  currentLesson = lesson;
  saveCurrentLesson();
  renderLesson();
  showView("homeView");
}

function renderPractice() {
  const target = $("#practiceList");
  target.innerHTML = "";

  practiceCards.forEach((card) => {
    const node = document.createElement("article");
    node.className = "paper-card practice-card";
    node.innerHTML = `
      <p class="eyebrow">Practice</p>
      <h2>${card.title}</h2>
      <p><strong>${card.base}</strong></p>
      <p>${card.tip}</p>
    `;

    const prompts = document.createElement("div");
    prompts.className = "practice-prompts";
    card.prompts.forEach((prompt) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = prompt;
      prompts.append(pill);
    });

    node.append(prompts);
    target.append(node);
  });
}

function renderStash() {
  const target = $("#stashList");
  const stash = getStash();
  target.innerHTML = "";

  if (!stash.length) {
    const empty = document.createElement("div");
    empty.className = "paper-card empty-state";
    empty.innerHTML = `
      <h2>No scraps saved yet</h2>
      <p>Save a Tiny Build to keep it here for redraw practice.</p>
    `;
    target.append(empty);
    return;
  }

  stash.forEach((item) => {
    const lesson = lessons.find((entry) => entry.id === item.lessonId);
    if (!lesson) return;

    const node = document.createElement("article");
    node.className = "paper-card stash-card";
    node.innerHTML = `
      <p class="eyebrow">${item.drawn ? "Drawn" : "Not Drawn Yet"}</p>
      <h2>${lesson.name}</h2>
      <p class="stash-meta">Base shape: ${lesson.baseShape}</p>
      <p><strong>Current redraw:</strong> ${item.lastRedrawTwist || chooseRedrawTwist(lesson)}</p>
      <p class="stash-meta">Redraw count: ${item.redrawCount}</p>
      <div class="action-row">
        <button class="secondary-button" data-action="open" data-id="${lesson.id}" type="button">Open Lesson</button>
        <button class="secondary-button" data-action="drawn" data-id="${lesson.id}" type="button">${item.drawn ? "Mark Not Drawn" : "Mark Drawn"}</button>
        <button class="primary-button" data-action="redraw" data-id="${lesson.id}" type="button">Redraw Version</button>
        <button class="ghost-button" data-action="delete" data-id="${item.id}" type="button">Delete</button>
      </div>
    `;

    target.append(node);
  });
}

function announce(message) {
  const original = $("#saveBtn").textContent;
  $("#saveBtn").textContent = message;
  setTimeout(() => {
    $("#saveBtn").textContent = original;
  }, 1200);
}

function showView(viewId) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  $("#main").focus({ preventScroll: true });
}

function resetApp() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  currentLesson = pickTinyBuild();
  saveCurrentLesson();
  renderLesson();
  renderStash();
  showView("homeView");
}

$("#newBuildBtn").addEventListener("click", () => {
  currentLesson = pickTinyBuild();
  saveCurrentLesson();
  renderLesson();
});

$("#saveBtn").addEventListener("click", saveToStash);
$("#resetBtn").addEventListener("click", resetApp);

$(".bottom-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  showView(button.dataset.view);
});

$("#stashList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "open") openLesson(id);
  if (action === "drawn") markDrawn(id);
  if (action === "redraw") bumpRedraw(id);
  if (action === "delete") removeStashItem(id);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("#installBtn").classList.remove("hidden");
});

$("#installBtn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("#installBtn").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

saveCurrentLesson();
renderLesson();
renderPractice();
renderStash();
