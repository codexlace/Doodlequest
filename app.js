const STORAGE_KEY = "tinyCharacterLab.v8-studio-desk";
const state = loadState();
let currentPrompt = null;
let deferredInstallPrompt = null;
let drawAlongIndex = 0;

const $ = (id) => document.getElementById(id);

const GOALS = [
  { id:"shapes", name:"Cute shapes", hint:"simple silhouettes", modes:["single","tiny"] },
  { id:"faces", name:"Faces", hint:"clear expressions", modes:["expression","brush"] },
  { id:"props", name:"Props", hint:"one readable object", modes:["prop","tiny"] },
  { id:"poses", name:"Tiny poses", hint:"lean, float, bounce", modes:["single","duo"] },
  { id:"line", name:"Line confidence", hint:"repeat small drawings", modes:["brush","single"] },
  { id:"color", name:"3-color practice", hint:"simple palettes", modes:["single","prop"] },
  { id:"variation", name:"Variations", hint:"same idea, tiny changes", modes:["brush","expression"] }
];

const WARMUPS = [
  { goal:"shapes", text:"Draw 8 tiny circles, then turn 3 into little faces.", why:"Round shapes make beginner characters feel soft and friendly." },
  { goal:"shapes", text:"Draw 5 wobbly blobs. Give each one a different bottom edge.", why:"Blobs build shape confidence without needing anatomy." },
  { goal:"faces", text:"Draw 6 tiny eyes: sleepy, surprised, nervous, proud, curious, grumpy.", why:"Changing the eyes is the fastest way to change a character’s mood." },
  { goal:"faces", text:"Draw 5 tiny mouths: dot, smile, frown, wiggle, little O.", why:"Small mouth changes can make object characters feel alive." },
  { goal:"props", text:"Draw 4 tiny props: key, stamp, spoon, lantern.", why:"Simple props add story without turning the prompt into a scene." },
  { goal:"poses", text:"Draw 4 leaning shapes: left, right, droopy, proud.", why:"Body tilt shows action before you add details." },
  { goal:"line", text:"Draw one ghost shape 5 times without erasing.", why:"Repeating one simple shape builds steadier lines." },
  { goal:"color", text:"Pick 3 colors. Draw 3 tiny dots, then make them into characters.", why:"A tiny palette keeps the drawing from getting overwhelming." },
  { goal:"variation", text:"Draw the same blob 4 times, changing only the face.", why:"Small variations teach you what actually changes the feeling." }
];

function loadState(){
  const fallback = {
    mode: "single",
    goal: "shapes",
    history: [],
    favorites: [],
    completed: 0,
    streak: 0,
    difficulty: "beginner",
    seenSubjects: [],
    skillCounts: {
      Character: 0,
      Duo: 0,
      Prop: 0,
      Expression: 0,
      Brush: 0,
      Tiny: 0
    },
    warmupIndex: 0
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
    "square", "glowy", "scribbly", "bubble", "chalk", "ribbon", "wandering"
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
      return { main: main.trim(), prop: rest.trim(), joiner: pattern.word.trim() };
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
  if (lower.includes("bag")) return "Use a soft rectangle with folded corners. Add little bat ears or wings.";
  if (lower.includes("zipper")) return "Draw a tiny rectangle or bean body. Add a zipper line as the main detail.";
  if (lower.includes("spoon")) return "Draw an oval spoon bowl and a skinny handle. Put the face in the bowl.";
  if (lower.includes("cookie")) return "Draw a crumbly circle. Add a few chips or bite marks, then a face.";
  if (lower.includes("snowglobe")) return "Draw a circle on a tiny base. Put the face inside the globe.";
  if (lower.includes("tape")) return "Draw a donut circle or roll shape. Add a little torn tape flap.";
  if (lower.includes("bottle")) return "Draw a small bottle silhouette. Put the face on the label area.";
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
      ],
      tryText: "Change only the eyes first. Then change the body tilt.",
      avoidText: "Do not explain the mood with extra scenery.",
      challengeText: "Redraw it with the same mood but one fewer detail."
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
    return {
      title: part.title,
      steps:[tip, "Keep this feature large enough to read.", "Avoid adding extra features that compete with it."],
      tryText: "Make the feature the first thing someone notices.",
      avoidText: "Do not add three more special features on top.",
      challengeText: "Draw the same character once with the feature bigger and once smaller."
    };
  }

  if (part.kind === "character") {
    return {
      title: part.title,
      steps: [
        getShapeTip(label),
        "Add two eyes and one mouth before accessories.",
        "Add tiny arms or feet only if they help the character read clearly."
      ],
      tryText: "Draw the silhouette first with no details.",
      avoidText: "Do not start with tiny decorations before the main shape works.",
      challengeText: "Redraw the character as a smaller sticker-sized version."
    };
  }

  if (part.kind === "friend") {
    return {
      title: part.title,
      steps: [
        "Make the friend about one-third the size of the main character.",
        "Use one simple shape and one tiny face.",
        "Place it close enough that the two feel connected."
      ],
      tryText: "Point the main character’s eyes toward the buddy.",
      avoidText: "Do not make the friend as detailed as the main character.",
      challengeText: "Make the friend read clearly with only a shape and two eyes."
    };
  }

  if (part.kind === "prop") {
    return {
      title: part.title,
      steps: [
        "Draw the prop as one clear silhouette.",
        "Make it slightly bigger than realistic so it is easy to see.",
        "Let the character hold, wear, or stand beside it — no extra clutter."
      ],
      tryText: "Use the prop to tell one tiny story.",
      avoidText: "Do not add a second prop unless the first one is unreadable.",
      challengeText: "Redraw the prop using only 3 lines or shapes."
    };
  }

  if (part.kind === "pose") {
    return {
      title: part.title,
      steps: [
        "Use body tilt before drawing details.",
        "Move the eyes in the same direction as the pose.",
        "Keep arms and feet tiny, simple, and optional."
      ],
      tryText: "Draw a center line through the body to show the lean.",
      avoidText: "Do not overcomplicate arms and legs.",
      challengeText: "Draw the same character standing still, then leaning."
    };
  }

  if (part.kind === "feeling") {
    return {
      title: part.title,
      steps: [
        "Pick the feeling before drawing the character details.",
        "Exaggerate the eyes or mouth just a little.",
        "Use a matching body tilt: droopy, proud, nervous, curious, or bouncy."
      ],
      tryText: "Make the face readable at thumbnail size.",
      avoidText: "Do not rely on words or scenery to show the feeling.",
      challengeText: "Try three face versions, then keep the clearest one."
    };
  }

  if (part.kind === "limit") {
    return {
      title: part.title,
      steps: [
        part.value || "Keep it small and simple.",
        "Use 1 big shape, 1 face, and 1 tiny detail.",
        "Stop when the character feels alive enough."
      ],
      tryText: "Set a timer and stop before adding extra clutter.",
      avoidText: "Do not add extra characters unless the prompt says friend.",
      challengeText: "Erase or hide one detail and see if the character still works."
    };
  }

  if (part.kind === "repeat") {
    return {
      title: part.title,
      steps: [
        "Draw the first one very simply.",
        "Repeat it several times with one change each time.",
        "Change only faces, hats, tails, stamps, or tiny details."
      ],
      tryText: "Keep the base shape almost the same each time.",
      avoidText: "Do not redesign the whole character every round.",
      challengeText: "Circle the strongest variation and redraw it cleaner."
    };
  }

  if (part.kind === "brush") {
    return {
      title: part.title,
      steps: [
        "Use one Procreate brush for the whole mini exercise.",
        "Change pressure and size instead of switching brushes.",
        "Let texture be the practice, not extra detail."
      ],
      tryText: "Make one light line and one heavy line with the same brush.",
      avoidText: "Do not switch brushes when the drawing feels awkward.",
      challengeText: "Draw one version small, one medium, and one large."
    };
  }

  if (part.kind === "tiny-scene") {
    return {
      title: part.title,
      steps: [
        "Draw the character first.",
        "Add only the named object or surface.",
        "Use one tiny shadow or grounding line. No full background."
      ],
      tryText: "Make the object support the character, not take over.",
      avoidText: "Do not add walls, landscapes, sky, or furniture.",
      challengeText: "Remove the object and see if the character still reads."
    };
  }

  if (part.kind === "anchor") {
    return {
      title: part.title,
      steps: [
        "The anchor object is just there to place the character.",
        "Keep it smaller or simpler than the character.",
        "Do not add walls, landscapes, or extra objects."
      ],
      tryText: "Use a tiny shadow or surface line as the anchor.",
      avoidText: "Do not build a whole environment around it.",
      challengeText: "Draw the anchor with one simple shape."
    };
  }

  return {
    title: part.title || label,
    steps: ["Start simple.", "Add the face early.", "Stop before it gets crowded."],
    tryText: "Use one big shape first.",
    avoidText: "Do not add clutter too early.",
    challengeText: "Redraw it smaller and cleaner."
  };
}

function recentHistory(count = 7){
  return state.history.slice(0, count);
}

function chooseDifficulty(){
  const recent = recentHistory(7);
  const done = recent.filter(item => item.status === "done").length;
  const tooMuch = recent.filter(item => item.status === "too-much" || item.status === "too-hard").length;
  const tooSimple = recent.filter(item => item.status === "too-simple" || item.status === "too-easy").length;

  if (tooMuch >= 2) return "beginner";
  if (done >= 5 && tooSimple >= 2) return "stretch";
  if (done >= 3) return "easy-plus";
  return "beginner";
}

function getGoal(){
  return GOALS.find(goal => goal.id === state.goal) || GOALS[0];
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
  const subjectName = Array.isArray(subject) ? subject.join(" + ") : subject;
  const recent = recentHistory(8).map(item => item.subject);
  const recentTooMuch = recentHistory(4).some(item => item.status === "too-much" || item.status === "too-hard");
  const goal = getGoal();

  if (recent.includes(subjectName)) score -= 35;
  if (state.mode === mode) score += 12;
  if (!state.seenSubjects.includes(subjectName)) score += 10;
  if (goal.modes.includes(mode)) score += 18;
  if (recentTooMuch && (mode === "single" || mode === "expression")) score += 18;
  if (recentTooMuch && (mode === "duo" || mode === "tiny")) score -= 15;

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
  const constraint = getGoalLimit(pick(window.DOODLE_DATA.constraints));
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
    drawAlong: getDrawAlongSteps(mode, subjectName, mood, pose),
    why: getWhyThisHelps(mode, skill),
    challenge: getChallenge(difficulty, mode),
    createdAt: new Date().toISOString()
  };
}

function getGoalLimit(fallback){
  const map = {
    shapes: "Use one main shape first. No full background needed.",
    faces: "Make the face readable before adding details.",
    props: "Add one prop only. Make it big enough to read.",
    poses: "Show the pose with a simple lean or float.",
    line: "Keep the lines confident and redraw once if needed.",
    color: "Use 3 colors or fewer.",
    variation: "Change only one thing from version to version."
  };
  return map[state.goal] || fallback;
}

function getHintForMode(mode){
  return window.DOODLE_DATA.hints[mode] || window.DOODLE_DATA.hints.single || window.DOODLE_DATA.hints.character || "";
}

function getChallenge(difficulty, mode){
  const goalChallenges = {
    shapes:"Redraw it once with a rounder shape and once with a pointier shape.",
    faces:"Draw three tiny face options before choosing one.",
    props:"Make the prop readable even if the drawing is very small.",
    poses:"Draw the pose once stiff, then once with more tilt.",
    line:"Trace over only the best lines on a new layer.",
    color:"Use one main color, one shadow color, and one accent.",
    variation:"Draw three versions and change only the expression."
  };
  if (goalChallenges[state.goal]) return goalChallenges[state.goal];
  if (mode === "tiny") return "Keep it to one anchor object only, like a pillow, stamp, paperclip, saucer, or moon rock.";
  if (mode === "duo") return "Show the relationship with eye direction, spacing, or a tiny gesture.";
  if (mode === "expression") return "Draw the same face twice: one tiny version, then one cleaner version.";
  if (mode === "brush") return "Repeat the idea with small variations instead of adding more detail.";
  if (difficulty === "stretch") return "Add one small storytelling detail, not a whole scene.";
  return "Add one tiny detail, like a sparkle, patch, stamp, ribbon, or button.";
}

function getWhyThisHelps(mode, skill){
  const goal = getGoal();
  const modeWhy = {
    single:"One-character prompts train silhouette, expression, and stopping before clutter.",
    duo:"Tiny friends teach scale and relationship without needing a full scene.",
    prop:"One prop teaches visual storytelling while keeping the drawing manageable.",
    expression:"Expression practice helps object characters feel alive without anatomy.",
    brush:"Repetition builds line confidence and helps you learn one Procreate brush at a time.",
    tiny:"Tiny anchor objects teach context without turning the drawing into a background."
  };
  return `${modeWhy[mode] || "This teaches one small drawing skill at a time."} Today’s goal is ${goal.name.toLowerCase()}, so focus on ${goal.hint}.`;
}

function getDrawAlongSteps(mode, subject, mood, pose){
  const base = [];
  if (mode === "brush") {
    return [
      "Open Procreate and choose one brush.",
      "Draw the first tiny version with the simplest possible shape.",
      "Repeat it several times, changing only one small thing each time.",
      "Circle or mark the version that reads best.",
      "Redraw that version once cleaner."
    ];
  }
  base.push("Draw the biggest simple shape first.");
  base.push("Add the face before any decorations.");
  if (mode === "duo") base.push("Add the tiny friend at about one-third the main character’s size.");
  else if (mode === "prop") base.push("Add the one prop as a clear, slightly oversized silhouette.");
  else if (mode === "tiny") base.push("Add only the tiny anchor object or surface.");
  else base.push(`Show the ${pose || "pose"} with a simple lean, float, or tiny feet.`);
  base.push("Add one tiny detail that supports the idea.");
  base.push("Do a clean-up pass: keep the best lines and remove clutter.");
  return base;
}

function renderPrompt(prompt){
  currentPrompt = prompt;
  drawAlongIndex = 0;
  $("difficultyTag").textContent = formatDifficulty(prompt.difficulty);
  $("timeTag").textContent = `${prompt.time} min`;
  $("skillTag").textContent = prompt.skill;
  $("promptText").textContent = prompt.text;
  renderPromptParts(prompt.parts || []);
  renderDrawAlong(prompt.drawAlong || prompt.steps || []);
  $("hintText").textContent = prompt.hint;
  $("challengeText").textContent = prompt.challenge;
  $("whyText").textContent = prompt.why;
  $("stepsList").innerHTML = "";
  prompt.steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    $("stepsList").appendChild(li);
  });
  renderFavoriteButton();

  const card = document.querySelector(".hero-card");
  card.classList.remove("shuffle");
  requestAnimationFrame(() => card.classList.add("shuffle"));
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
  $("guideTry").textContent = guide.tryText || "Draw the simplest version first.";
  $("guideAvoid").textContent = guide.avoidText || "Do not add clutter too early.";
  $("guideChallenge").textContent = guide.challengeText || "Redraw it smaller and clearer.";
}

function renderDrawAlong(steps){
  const list = $("drawAlongList");
  list.innerHTML = "";
  steps.forEach((step, index) => {
    const li = document.createElement("li");
    li.textContent = step;
    if (index < drawAlongIndex) li.classList.add("done-step");
    if (index === drawAlongIndex) li.classList.add("current-step");
    list.appendChild(li);
  });
  $("nextStepBtn").textContent = drawAlongIndex >= steps.length - 1 ? "Finish steps" : "Next step";
}

function nextDrawAlongStep(){
  if (!currentPrompt) return;
  const steps = currentPrompt.drawAlong || [];
  drawAlongIndex = Math.min(drawAlongIndex + 1, steps.length - 1);
  renderDrawAlong(steps);
}

function restartDrawAlong(){
  drawAlongIndex = 0;
  renderDrawAlong(currentPrompt?.drawAlong || []);
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

function renderGoals(){
  const grid = $("goalGrid");
  grid.innerHTML = "";
  GOALS.forEach(goal => {
    const btn = document.createElement("button");
    btn.className = "goal-btn";
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(state.goal === goal.id));
    btn.innerHTML = `<strong>${goal.name}</strong><span>${goal.hint}</span>`;
    btn.addEventListener("click", () => {
      state.goal = goal.id;
      saveState();
      renderGoals();
      renderWarmup();
      renderPrompt(buildPrompt(state.mode));
    });
    grid.appendChild(btn);
  });
}

function getWarmupsForGoal(){
  const filtered = WARMUPS.filter(item => item.goal === state.goal);
  return filtered.length ? filtered : WARMUPS;
}

function renderWarmup(){
  const pool = getWarmupsForGoal();
  const warmup = pool[state.warmupIndex % pool.length];
  $("warmupText").textContent = warmup.text;
  $("warmupWhy").textContent = warmup.why;
}

function nextWarmup(){
  state.warmupIndex += 1;
  saveState();
  renderWarmup();
}

function recordFeedback(status){
  if (!currentPrompt) return;

  const item = {
    ...currentPrompt,
    status,
    completedAt: new Date().toISOString()
  };

  state.history.unshift(item);
  state.history = state.history.slice(0, 40);

  if (!state.seenSubjects.includes(currentPrompt.subject)) {
    state.seenSubjects.push(currentPrompt.subject);
    state.seenSubjects = state.seenSubjects.slice(-80);
  }

  if (status === "done" || status === "too-simple") {
    state.completed += 1;
    state.streak += 1;
    state.skillCounts[currentPrompt.skill] = (state.skillCounts[currentPrompt.skill] || 0) + 1;
  } else if (status === "too-much") {
    state.streak = 0;
    if (state.mode === "duo" || state.mode === "tiny") state.mode = "single";
  }

  state.difficulty = chooseDifficulty();
  saveState();
  renderModes();
  renderProgress();
  $("feedbackMessage").textContent = getFeedbackMessage(status);
  renderPrompt(buildPrompt(state.mode));
}

function getFeedbackMessage(status){
  const map = {
    done:"Nice. Now try one tiny improvement: redraw it with one cleaner shape.",
    "too-simple":"Good signal. I’ll gently add a little challenge.",
    "too-much":"Got it. I’ll make the next one smaller and less cluttered.",
    skip:"Skipped. I’ll avoid repeats and try a fresher little weirdo."
  };
  return map[status] || "Saved.";
}

function renderProgress(){
  $("doneCount").textContent = state.completed;
  $("streakCount").textContent = state.streak;
  $("levelText").textContent = getLevelName(state.completed);
  renderSkillProgress();
  renderFavorites();

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

function renderSkillProgress(){
  const box = $("skillProgress");
  box.innerHTML = "";
  const skills = ["Character","Expression","Prop","Brush","Duo","Tiny"];
  skills.forEach(skill => {
    const count = state.skillCounts[skill] || 0;
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `<span>${skill}</span><strong>${count}</strong>`;
    box.appendChild(row);
  });
}

function formatStatus(status){
  return {
    done:"Done",
    "too-simple":"Too simple",
    "too-easy":"Too simple",
    "too-much":"Too much",
    "too-hard":"Too much",
    skip:"Skipped"
  }[status] || "Saved";
}

function getLevelName(done){
  if (done >= 40) return "Little Weirdo Collector";
  if (done >= 20) return "Ghost Friend";
  if (done >= 10) return "Tiny Shape Tamer";
  if (done >= 5) return "Blob Beginner";
  return "Sprout";
}

function isFavorite(prompt = currentPrompt){
  if (!prompt) return false;
  return state.favorites.some(item => item.text === prompt.text);
}

function toggleFavorite(){
  if (!currentPrompt) return;
  if (isFavorite()) {
    state.favorites = state.favorites.filter(item => item.text !== currentPrompt.text);
    $("feedbackMessage").textContent = "Removed from saved prompts.";
  } else {
    state.favorites.unshift({
      id: currentPrompt.id,
      text: currentPrompt.text,
      skill: currentPrompt.skill,
      savedAt: new Date().toISOString()
    });
    state.favorites = state.favorites.slice(0, 20);
    $("feedbackMessage").textContent = "Saved for later.";
  }
  saveState();
  renderFavoriteButton();
  renderFavorites();
}

function renderFavoriteButton(){
  const saved = isFavorite();
  $("favoriteBtn").textContent = saved ? "♥ Saved" : "♡ Save";
  $("favoriteBtn").setAttribute("aria-pressed", String(saved));
}

function renderFavorites(){
  const list = $("favoritesList");
  list.innerHTML = "";
  const favs = state.favorites.slice(0, 5);
  if (!favs.length) {
    const li = document.createElement("li");
    li.textContent = "No saved prompts yet. Tap ♡ Save when one feels good.";
    list.appendChild(li);
    return;
  }
  favs.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.skill} · ${item.text}`;
    list.appendChild(li);
  });
}

function resetApp(){
  const shouldReset = window.confirm("Reset Tiny Character Lab? This clears your local prompt history, streak, saved prompts, and progress.");
  if (!shouldReset) return;

  localStorage.removeItem(STORAGE_KEY);
  const fresh = loadState();
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  saveState();
  renderGoals();
  renderModes();
  renderWarmup();
  renderProgress();
  renderPrompt(buildPrompt(state.mode));
  $("feedbackMessage").textContent = "Reset complete. Fresh page!";
}

function copyPrompt(){
  const steps = (currentPrompt.drawAlong || []).map((step, index) => `${index + 1}. ${step}`).join("\n");
  const text = `Tiny Character Lab Prompt\n\n${currentPrompt.text}\n\nWarm-up:\n${$("warmupText").textContent}\n\nDraw-along:\n${steps}\n\nHint: ${currentPrompt.hint}\nSkill: ${currentPrompt.skill} · ${currentPrompt.time} min · ${formatDifficulty(currentPrompt.difficulty)}\nLimit: 3 colors or fewer. No full background needed.`;
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
$("favoriteBtn").addEventListener("click", toggleFavorite);
$("resetBtn").addEventListener("click", resetApp);
$("newWarmupBtn").addEventListener("click", nextWarmup);
$("nextStepBtn").addEventListener("click", nextDrawAlongStep);
$("restartDrawAlongBtn").addEventListener("click", restartDrawAlong);
document.querySelectorAll(".feedback-btn").forEach(btn => {
  btn.addEventListener("click", () => recordFeedback(btn.dataset.status));
});

renderGoals();
renderModes();
renderWarmup();
renderProgress();
renderPrompt(buildPrompt(state.mode));
setupInstall();
registerServiceWorker();
