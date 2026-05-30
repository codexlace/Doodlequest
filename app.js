const STORAGE_KEY = "doodleQuest.v3-character-lab";
const state = loadState();
let currentPrompt = null;
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);

function loadState(){
  const fallback = {
    mode: "single",
    history: [],
    completed: 0,
    streak: 0,
    difficulty: "beginner",
    seenSubjects: []
  };
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
  } catch {
    return fallback;
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function recentHistory(count = 7){
  return state.history.slice(0, count);
}

function chooseDifficulty(){
  const recent = recentHistory(7);
  const done = recent.filter(item => item.status === "done").length;
  const tooHard = recent.filter(item => item.status === "too-hard").length;
  const tooEasy = recent.filter(item => item.status === "too-easy").length;

  if (tooHard >= 2) return "beginner";
  if (done >= 5 && tooEasy >= 2) return "stretch";
  if (done >= 3) return "easy-plus";
  return "beginner";
}

function getSkillForMode(mode){
  const map = {
    single:"Character",
    duo:"Duo",
    prop:"Prop",
    expression:"Expression",
    brush:"Brush",
    tiny:"Tiny"
  };
  return map[mode] || "Character";
}

function getTimeForDifficulty(difficulty){
  if (difficulty === "stretch") return 25;
  if (difficulty === "easy-plus") return 20;
  return 10;
}

function scoreSubject(subject, mode){
  let score = 50;
  const recent = recentHistory(8).map(item => item.subject);
  if (recent.includes(subject)) score -= 35;
  if (state.mode === mode) score += 12;
  if (!state.seenSubjects.includes(subject)) score += 10;
  return score + Math.random() * 8;
}

function chooseSubject(mode){
  const pool = window.DOODLE_DATA.subjects[mode] || window.DOODLE_DATA.subjects.single;
  return [...pool].sort((a,b) => scoreSubject(b, mode) - scoreSubject(a, mode))[0];
}

function buildPrompt(mode = state.mode){
  const difficulty = chooseDifficulty();
  const subject = chooseSubject(mode);
  const mood = pick(window.DOODLE_DATA.moods);
  const pose = pick(window.DOODLE_DATA.poses);
  const constraint = pick(window.DOODLE_DATA.constraints);
  const skill = getSkillForMode(mode);
  const time = getTimeForDifficulty(difficulty);

  let text;
  if (mode === "duo" && Array.isArray(subject)) {
    text = `Draw a ${mood} ${subject[0]} with a ${subject[1]}. ${constraint}`;
  } else if (mode === "prop") {
    text = `Draw a ${mood} ${subject}. ${constraint}`;
  } else if (mode === "expression") {
    text = `Draw a ${subject} ${pose}. Focus on the feeling, not the background.`;
  } else if (mode === "brush") {
    text = `Pick one Procreate brush and draw ${subject}. No scene needed.`;
  } else if (mode === "tiny") {
    text = `Draw a ${mood} ${subject}. Keep it tiny: character plus one object only.`;
  } else {
    text = `Draw a ${mood} ${subject} ${pose}. ${constraint}`;
  }

  const subjectName = Array.isArray(subject) ? subject.join(" + ") : subject;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode,
    subject: subjectName,
    text,
    difficulty,
    skill,
    time,
    hint: getHintForMode(mode),
    steps: window.DOODLE_DATA.steps[mode],
    challenge: getChallenge(difficulty, mode),
    createdAt: new Date().toISOString()
  };
}

function getHintForMode(mode){
  return window.DOODLE_DATA.hints[mode] || window.DOODLE_DATA.hints.single || window.DOODLE_DATA.hints.character || "";
}

function getChallenge(difficulty, mode){
  if (mode === "tiny") return "Keep it to one anchor object only, like a pillow, stamp, paperclip, saucer, or moon rock.";
  if (mode === "duo") return "Show the relationship with eye direction, spacing, or a tiny gesture.";
  if (mode === "expression") return "Draw the same face twice: one tiny version, then one cleaner version.";
  if (mode === "brush") return "Repeat the idea with small variations instead of adding more detail.";
  if (difficulty === "stretch") return "Add one small storytelling detail, not a whole scene.";
  return "Add one tiny detail, like a sparkle, patch, stamp, ribbon, or button.";
}

function renderPrompt(prompt){
  currentPrompt = prompt;
  $("difficultyTag").textContent = formatDifficulty(prompt.difficulty);
  $("timeTag").textContent = `${prompt.time} min`;
  $("skillTag").textContent = prompt.skill;
  $("promptText").textContent = prompt.text;
  $("hintText").textContent = prompt.hint;
  $("challengeText").textContent = prompt.challenge;
  $("stepsList").innerHTML = "";
  prompt.steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    $("stepsList").appendChild(li);
  });

  const card = document.querySelector(".hero-card");
  card.classList.remove("shuffle");
  requestAnimationFrame(() => card.classList.add("shuffle"));
}

function formatDifficulty(value){
  return {
    "beginner":"Beginner",
    "easy-plus":"Easy+",
    "stretch":"Stretch"
  }[value] || "Beginner";
}

function renderModes(){
  const grid = $("modeGrid");
  grid.innerHTML = "";
  window.DOODLE_DATA.modes.forEach(mode => {
    const btn = document.createElement("button");
    btn.className = "mode-btn";
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(state.mode === mode.id));
    btn.innerHTML = `<strong>${mode.name}</strong><span>${mode.desc}</span>`;
    btn.addEventListener("click", () => {
      state.mode = mode.id;
      saveState();
      renderModes();
      renderPrompt(buildPrompt(mode.id));
    });
    grid.appendChild(btn);
  });
}

function recordFeedback(status){
  if (!currentPrompt) return;

  const item = {
    ...currentPrompt,
    status,
    completedAt: new Date().toISOString()
  };

  state.history.unshift(item);
  state.history = state.history.slice(0, 30);

  if (!state.seenSubjects.includes(currentPrompt.subject)) {
    state.seenSubjects.push(currentPrompt.subject);
    state.seenSubjects = state.seenSubjects.slice(-60);
  }

  if (status === "done" || status === "too-easy") {
    state.completed += 1;
    state.streak += 1;
  } else if (status === "too-hard") {
    state.streak = 0;
  }

  state.difficulty = chooseDifficulty();
  saveState();
  renderProgress();
  $("feedbackMessage").textContent = getFeedbackMessage(status);
  renderPrompt(buildPrompt(state.mode));
}

function getFeedbackMessage(status){
  const map = {
    done:"Nice. Your sketchbook trail grew by one!",
    "too-easy":"Good signal. I’ll gently raise the challenge.",
    "too-hard":"No problem. I’ll make the next one softer.",
    skip:"Skipped. I’ll avoid repeats and try a fresher idea."
  };
  return map[status] || "Saved.";
}

function renderProgress(){
  $("doneCount").textContent = state.completed;
  $("streakCount").textContent = state.streak;
  $("levelText").textContent = getLevelName(state.completed);

  const list = $("historyList");
  list.innerHTML = "";
  const recent = state.history.slice(0, 5);
  if (!recent.length) {
    const li = document.createElement("li");
    li.textContent = "No prompts yet. Try one tiny drawing today.";
    list.appendChild(li);
    return;
  }
  recent.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${formatStatus(item.status)} · ${item.text}`;
    list.appendChild(li);
  });
}

function formatStatus(status){
  return {
    done:"Done",
    "too-easy":"Too easy",
    "too-hard":"Too hard",
    skip:"Skipped"
  }[status] || "Saved";
}

function getLevelName(done){
  if (done >= 30) return "Quest Artist";
  if (done >= 15) return "Sketch Scout";
  if (done >= 6) return "Line Learner";
  return "Sprout";
}

function resetApp(){
  const shouldReset = window.confirm("Reset Doodle Quest? This clears your local prompt history, streak, and progress.");
  if (!shouldReset) return;

  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, loadState());
  saveState();
  renderModes();
  renderProgress();
  renderPrompt(buildPrompt(state.mode));
  $("feedbackMessage").textContent = "Reset complete. Fresh page!";
}

function copyPrompt(){
  const text = `${currentPrompt.text}\n\nHint: ${currentPrompt.hint}\nSkill: ${currentPrompt.skill} · ${currentPrompt.time} min · ${formatDifficulty(currentPrompt.difficulty)}`;
  navigator.clipboard?.writeText(text).then(() => {
    $("feedbackMessage").textContent = "Prompt copied. Paste it into a Procreate reference note.";
  }).catch(() => {
    $("feedbackMessage").textContent = "Use this prompt in Procreate when you are ready.";
  });
}

function setupInstall(){
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("installBtn").classList.remove("hidden");
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("installBtn").classList.add("hidden");
  });
}

function registerServiceWorker(){
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js");
    });
  }
}

$("shuffleBtn").addEventListener("click", () => renderPrompt(buildPrompt(state.mode)));
$("drawBtn").addEventListener("click", copyPrompt);
$("resetBtn").addEventListener("click", resetApp);
document.querySelectorAll(".feedback-btn").forEach(btn => {
  btn.addEventListener("click", () => recordFeedback(btn.dataset.status));
});

renderModes();
renderProgress();
renderPrompt(buildPrompt(state.mode));
setupInstall();
registerServiceWorker();
