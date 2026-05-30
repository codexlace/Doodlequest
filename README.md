# Doodle Quest

Doodle Quest is a beginner-friendly drawing prompt Progressive Web App for people practicing simple character drawings in Procreate.

This simplified version is intentionally **not scene-heavy**. Most prompts are one character, a character with a tiny friend, or a character with one prop. Tiny Scene mode exists, but it only suggests a character plus one small object.

It is fully static, offline-capable, installable, and ready for GitHub Pages. It does not use AI models, APIs, accounts, servers, or build tools.

## Features

- Simple character-focused drawing prompts
- Practice modes:
  - Just a Character
  - Character + Friend
  - Character + Prop
  - Faces & Feelings
  - Brush Mini
  - Tiny Scene
- Tiny hints, simple steps, and optional extra challenges
- Local progress tracking
- Deterministic smart logic:
  - avoids recent repeated subjects
  - adjusts difficulty based on feedback
  - tracks completed prompts and streaks
- Works offline after first visit
- Installable PWA manifest and service worker
- Uses only vanilla HTML, CSS, and JavaScript

## Files

```txt
index.html
styles.css
app.js
prompts.js
manifest.webmanifest
service-worker.js
icon-192.png
icon-512.png
README.md
```

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. Open the GitHub Pages URL after deployment completes.

## Test the PWA

In Chrome or Edge:

1. Open the deployed site.
2. Open DevTools.
3. Go to **Application → Manifest** and check that icons and manifest load.
4. Go to **Application → Service Workers** and check that the service worker is active.
5. Reload the page once.
6. Turn on offline mode in DevTools.
7. Reload again. The app should still load.

## Editing prompts

Prompt ingredients live in `prompts.js`.

To keep the app simple, add prompts that follow this rule:

```txt
One character, one friend, one prop, or one tiny object.
No full scene unless it is intentionally tiny.
```

## Notes

This app is designed to help you practice inside Procreate. The “Draw this” button copies the prompt and hint to your clipboard when supported by the browser.

The app icons are stored at the project root as `icon-192.png` and `icon-512.png`, alongside `index.html`, so the manifest and service worker use the same relative route style as the other app files.


## Updated Prompt Set

This version uses the newer object-soul and ghosty prompt system: pocket ghosts, envelope spirits, pencil kids, ink blobs, sleepy moons, tiny planets, sticker blobs, window spirits, spellbooks, and other beginner-friendly little weirdos. The prompt engine is intentionally simple: one character, one buddy, one prop, or one tiny anchor object.

## Character Lab Expansion

This build adds 20 more character types plus matching tiny friends and simple props in the same object-soul style.

New examples include:
- tiny receipt goblin + coupon scrap friend
- sleepy acorn sprite + leaf blanket buddy
- bubble tea ghost + tapioca pet
- paper bag bat + sticker moon friend
- soft cactus kid + pebble pal
- tiny snowglobe spirit + snowflake friend

The app now has 40 main character types, 40 friend pairings, 40 prop prompts, expanded faces/feelings, expanded brush minis, and expanded tiny scene anchors.

## Reset App

Use the **Reset app** button in the sketchbook trail section to clear local progress, streak, and prompt history. This only affects data stored in the browser on that device.


## Clickable Drawing Guides

This version turns prompt parts into tappable chips. For example, a prompt like “Draw a curious button-eyed cloud” can expose separate tips for:

- the mood, such as curious
- the feature, such as button-eyed
- the character base shape, such as cloud
- the pose or simple limit

The guides are deterministic and local. They use beginner-friendly rules and shape heuristics, not AI.


## v7 Learning Coach

This build turns Doodle Quest from a prompt generator into a small offline learning coach.

New learning-tool features:

- **Learning goal selector** for faces, cute shapes, props, tiny poses, line confidence, color, and variations.
- **60-second warm-up** matched to the chosen learning goal.
- **Draw-along mode** that breaks every prompt into beginner-friendly steps.
- **Clickable guide chips** with steps, Try, Avoid, and Mini challenge guidance.
- **Favorites / saved prompts** for drawing later.
- **Feedback changed to Done / Too simple / Too much / Skip** so the app can reduce clutter when prompts feel overwhelming.
- **Skill progress tracking** for Character, Expression, Prop, Brush, Duo, and Tiny practice.
- **Reset app** clears local history, saved prompts, streaks, and skill progress.
- Service worker cache updated to `doodle-quest-v7-learning-coach`.

All logic is deterministic and browser-only. No AI models, APIs, accounts, servers, build tools, or environment variables are used.
