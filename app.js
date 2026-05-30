const STORAGE_KEY = "doodleQuest.v4-clickable-guides";
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

function splitCharacterTraits(label){
  const traits = [];
  if (!label) return traits;
  const knownTraits = [
    "button-eyed", "star-shaped", "sock-shaped", "crumpled", "floating",
    "sleepy", "wobbly", "melty", "round", "shy", "tiny", "little",
    "soft", "paper", "moonlit", "crumbly", "lost", "puddle", "magic",
    "square", "glowy", "scribbly"
  ];
  knownTraits.forEach(trait => {
    const pattern = new RegExp(`\\b${trait}\\b`, "i");
    if (pattern.test(label)) traits.push(trait);
  });
  return [...new Set(traits)];
}

function cleanMainCharacter(label){
  return label
    .replace(/\b(nervous|sleepy|proud|confused|dramatic|grumpy|excited|shy|worried|curious|brave|awkward|smug|lonely|zoomy|suspicious|cheerful|surprised|peaceful|cozy|silly|haunted-cute|gentle|sparkly|soft|wobbly|dreamy|tiny-dramatic|glowy|melty|floaty|storybook|scribbly|quietly magical)\b/gi, "")
    .replace(/\bfeeling embarrassed\b/gi, "sticker blob")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPropSubject(subject){
  const patterns = [
    { word: " with ", kind: "prop" },
    { word: " holding ", kind: "prop" },
    { word: " wearing ", kind: "prop" }
  ];

  for (const pattern of patterns) {
    if (subject.includes(pattern.word)) {
      const [main, rest] = subject.split(pattern.word);
      return {
        main: main.trim(),
        prop: rest.trim(),
        joiner: pattern.word.trim()
      };
    }
  }

  return { main: subject, prop: null, joiner: null };
}

function findKnownCharacter(text){
  const chars = window.DOODLE_DATA.doodleQuestCharacters || [];
  return chars.find(character => text.includes(character)) || cleanMainCharacter(text);
}

function getFeelingFromExpression(text, character){
  let feeling = text.replace(character, "").replace("feeling ", "").trim();
  return feeling || "expression";
}

function buildPromptParts(mode, subject, mood, pose, constraint){
  const parts = [];

  const addMood = () => parts.push({ kind:"mood", label:mood, title:`Mood: ${mood}` });
  const addRule = () => parts.push({ kind:"limit", label:"simple limit", value:constraint, title:"Simple limit" });
  const addPose = () => parts.push({ kind:"pose", label:pose, title:`Pose: ${pose}` });

  if (mode === "duo" && Array.isArray(subject)) {
    addMood();
    parts.push({ kind:"character", label:subject[0], title:`Character: ${subject[0]}` });
    splitCharacterTraits(subject[0]).forEach(trait => parts.push({ kind:"feature", label:trait, title:`Feature: ${trait}` }));
    parts.push({ kind:"friend", label:subject[1], title:`Friend: ${subject[1]}` });
    addRule();
    return parts;
  }

  if (mode === "prop") {
    addMood();
    const split = splitPropSubject(subject);
    parts.push({ kind:"character", label:split.main, title:`Character: ${split.main}` });
    splitCharacterTraits(split.main).forEach(trait => parts.push({ kind:"feature", label:trait, title:`Feature: ${trait}` }));
    if (split.prop) parts.push({ kind:"prop", label:split.prop, title:`Prop: ${split.prop}` });
    addRule();
    return parts;
  }

  if (mode === "expression") {
    const character = findKnownCharacter(subject);
    const feeling = getFeelingFromExpression(subject, character);
    parts.push({ kind:"feeling", label:feeling, title:`Feeling: ${feeling}` });
    parts.push({ kind:"character", label:character, title:`Character: ${character}` });
    splitCharacterTraits(character).forEach(trait => parts.push({ kind:"feature", label:trait, title:`Feature: ${trait}` }));
    addPose();
    return parts;
  }

  if (mode === "brush") {
    parts.push({ kind:"repeat", label:subject, title:"Repetition practice" });
    parts.push({ kind:"brush", label:"one brush", title:"Brush rule" });
    return parts;
  }

  if (mode === "tiny") {
    addMood();
    parts.push({ kind:"tiny-scene", label:subject, title:"Tiny setup" });
    parts.push({ kind:"anchor", label:"one anchor object", title:"Anchor object" });
    return parts;
  }

  addMood();
  parts.push({ kind:"character", label:subject, title:`Character: ${subject}` });
  splitCharacterTraits(subject).forEach(trait => parts.push({ kind:"feature", label:trait, title:`Feature: ${trait}` }));
  addPose();
  addRule();
  return parts;
}

function getShapeTip(label){
  const lower = label.toLowerCase();
  if (lower.includes("ghost")) return "Start with a soft upside-down U or teardrop. Add a wavy bottom and a tiny face.";
  if (lower.includes("moon")) return "Draw a banana-shaped crescent first. Put the face near the thickest part.";
  if (lower.includes("envelope")) return "Start with a small rectangle. Add a triangle flap and tiny floating arms.";
  if (lower.includes("pencil")) return "Use a long rounded rectangle. Add a point, eraser end, tiny legs, and a simple face.";
  if (lower.includes("ink") || lower.includes("blob") || lower.includes("puddle")) return "Draw one wobbly oval first. Push one edge out so it feels melty or alive.";
  if (lower.includes("book") || lower.includes("spellbook")) return "Use a rounded rectangle. Add a spine line, little feet, and a face on the cover.";
  if (lower.includes("star")) return "Draw a soft star with rounded points. Keep the face small and centered.";
  if (lower.includes("paper") || lower.includes("receipt")) return "Start with a rectangle, then bend or wrinkle the corners to give it personality.";
  if (lower.includes("candle")) return "Use a short rounded rectangle. Add a tiny flame above the face.";
  if (lower.includes("cloud")) return "Stack three or four round bumps. Add button eyes low on the biggest puff.";
  if (lower.includes("planet")) return "Draw a circle with one ring. Add shoes underneath so it reads as a character.";
  if (lower.includes("triangle")) return "Draw a soft triangle, not a sharp one. Put the face slightly low to make it cute.";
  if (lower.includes("bookmark")) return "Use a skinny rectangle with a notch or tassel. Add small wings only if you want fairy energy.";
  if (lower.includes("teacup")) return "Draw a cup shape, one handle, and a ghost face floating on the front.";
  if (lower.includes("comet")) return "Start with a round head. Add a simple tail swoosh behind it.";
  if (lower.includes("sock") || lower.includes("mitten")) return "Draw a soft bent tube shape. Add tiny feet or little nubs for arms.";
  if (lower.includes("eraser")) return "Use a rounded rectangle. Add dusty edges and a tiny face.";
  if (lower.includes("window")) return "Draw a square with a cross in it. Put the face inside one pane.";
  if (lower.includes("acorn")) return "Draw an oval with a little cap. Add leaf-like feet or a sleepy face.";
  if (lower.includes("tea")) return "Start with a cup circle or rounded rectangle. Add a straw or bubbles as tiny details.";
  if (lower.includes("cactus")) return "Draw a rounded cactus column. Add tiny arms and very few spikes.";
  return "Start with one big simple shape. Add the face before adding details.";
}

function getPartGuide(part){
  const label = part.label || "";
  const lower = label.toLowerCase();

  if (part.kind === "mood") {
    const moodTips = {
      "curious":"Tilt the head or body toward one small thing. Use wide eyes and one raised brow.",
      "sleepy":"Use half-closed eyes, a droopy body, and one soft curve.",
      "wobbly":"Make the outline uneven on purpose. Let it lean like jelly.",
      "glowy":"Draw a small light shape first, then add a soft halo around it.",
      "haunted-cute":"Use ghosty shapes, but keep the face round and friendly.",
      "tiny-dramatic":"Use a big expression on a very small body. Add one dramatic eyebrow or pose.",
      "melty":"Let the bottom edge drip or sag. Keep the face simple so it stays readable.",
      "awkward":"Make the pose slightly tilted, with tiny arms close to the body.",
      "sparkly":"Add only two or three sparkles so it does not get busy.",
      "storybook":"Use simple shapes with one charming detail, like a ribbon, patch, or tiny hat."
    };
    return {
      title: part.title,
      steps: [
        moodTips[lower] || "Show the mood with the face first, then the body tilt.",
        "Use the eyes, mouth, and one body angle.",
        "Do not add a background to explain the mood."
      ]
    };
  }

  if (part.kind === "feature") {
    let tip = "Turn this into one visible detail, not a lot of decorations.";
    if (lower === "button-eyed") tip = "Draw two round button eyes. Add two tiny holes or a little cross in each eye.";
    if (lower === "star-shaped") tip = "Use a soft star body with rounded points. Keep the face in the middle.";
    if (lower === "sock-shaped") tip = "Draw a bent sock silhouette. Add the face near the toe or heel area.";
    if (lower === "crumpled") tip = "Use a boxy paper shape, then add a few wrinkle lines. Three wrinkles is enough.";
    if (lower === "wobbly") tip = "Make the outline uneven and soft. Avoid perfect circles.";
    if (lower === "melty") tip = "Add one or two drips at the bottom. Keep the top shape simple.";
    if (lower === "floating") tip = "Leave space under it and add a tiny shadow or sparkle below.";
    if (lower === "round") tip = "Start with a circle or oval. Add details only after the face works.";
    return { title: part.title, steps:[tip, "Keep this feature large enough to read.", "Avoid adding extra features that compete with it."] };
  }

  if (part.kind === "character") {
    return {
      title: part.title,
      steps: [
        getShapeTip(label),
        "Add two eyes and one mouth before accessories.",
        "Add tiny arms or feet only if they help the character read clearly."
      ]
    };
  }

  if (part.kind === "friend") {
    return {
      title: part.title,
      steps: [
        "Make the friend about one-third the size of the main character.",
        "Use one simple shape and one tiny face.",
        "Place it close enough that the two feel connected."
      ]
    };
  }

  if (part.kind === "prop") {
    return {
      title: part.title,
      steps: [
        "Draw the prop as one clear silhouette.",
        "Make it slightly bigger than realistic so it is easy to see.",
        "Let the character hold, wear, or stand beside it — no extra clutter."
      ]
    };
  }

  if (part.kind === "pose") {
    return {
      title: part.title,
      steps: [
        "Use body tilt before drawing details.",
        "Move the eyes in the same direction as the pose.",
        "Keep arms and feet tiny, simple, and optional."
      ]
    };
  }

  if (part.kind === "feeling") {
    return {
      title: part.title,
      steps: [
        "Pick the feeling before drawing the character details.",
        "Exaggerate the eyes or mouth just a little.",
        "Use a matching body tilt: droopy, proud, nervous, curious, or bouncy."
      ]
    };
  }

  if (part.kind === "limit") {
    return {
      title: part.title,
      steps: [
        part.value || "Keep it small and simple.",
        "Use 1 big shape, 1 face, and 1 tiny detail.",
        "Stop when the character feels alive enough."
      ]
    };
  }

  if (part.kind === "repeat") {
    return {
      title: part.title,
      steps: [
        "Draw the first one very simply.",
        "Repeat it several times with one change each time.",
        "Change only faces, hats, tails, stamps, or tiny details."
      ]
    };
  }

  if (part.kind === "brush") {
    return {
      title: part.title,
      steps: [
        "Use one Procreate brush for the whole mini exercise.",
        "Change pressure and size instead of switching brushes.",
        "Let texture be the practice, not extra detail."
      ]
    };
  }

  if (part.kind === "tiny-scene") {
    return {
      title: part.title,
      steps: [
        "Draw the character first.",
        "Add only the named object or surface.",
        "Use one tiny shadow or grounding line. No full background."
      ]
    };
  }

  if (part.kind === "anchor") {
    return {
      title: part.title,
      steps: [
        "The anchor object is just there to place the character.",
        "Keep it smaller or simpler than the character.",
        "Do not add walls, landscapes, or extra objects."
      ]
    };
  }

  return {
    title: part.title || label,
    steps: ["Start simple.", "Add the face early.", "Stop before it gets crowded."]
  };
}

function renderPromptParts(parts){
  const box = $("promptParts");
  if (!box) return;
  box.innerHTML = "";
  parts.forEach((part, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `part-chip part-${part.kind}`;
    btn.textContent = part.label;
    btn.addEventListener("click", () => renderDrawingGuide(part));
    box.appendChild(btn);
    if (index === 0) renderDrawingGuide(part);
  });
}

function renderDrawingGuide(part){
  const guide = getPartGuide(part);
  $("guideTitle").textContent = guide.title;
  $("guideList").innerHTML = "";
  guide.steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    $("guideList").appendChild(li);
  });
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
    parts: buildPromptParts(mode, subject, mood, pose, constraint),
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
  renderPromptParts(prompt.parts || []);
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
