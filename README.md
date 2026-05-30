# Tiny Character Lab

Tiny Character Lab is a cozy, beginner-friendly drawing prompt PWA for practicing tiny object-soul characters inside Procreate.

The app is designed around the **Tiny Studio Desk** UI theme:

- **Today’s Practice** = pencil-tab goal picker
- **Tiny Warm-Up** = sticky note warm-up card
- **Main Doodle** = large sticky-note prompt
- **Tap-to-Learn** = sticker chips that explain parts of the prompt
- **Draw-Along Steps** = sketchbook checklist
- **Saved Doodles** = small local prompt shelf
- **Practice Trail** = simple skill progress and history

It is fully static, offline-capable, installable, and ready for GitHub Pages. It does not use AI models, APIs, accounts, servers, or build tools.

## Features

- 40 tiny character types
- 40 character + friend pairings
- 40 character + prop prompts
- Faces & Feelings prompts
- Brush Mini repetition prompts
- Tiny Scene prompts that only use one anchor object
- Learning goal selector:
  - Cute shapes
  - Faces
  - Props
  - Tiny poses
  - Line confidence
  - 3-color practice
  - Variations
- 60-second warm-ups matched to the selected goal
- Clickable prompt chips with beginner drawing instructions
- Draw-along checklist for each prompt
- Favorites / saved prompts
- Feedback buttons:
  - Done
  - Too simple
  - Too much
  - Skip
- Local skill progress tracking
- Reset app button
- Offline service worker

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
4. Go to **Application → Service Workers** and confirm the active cache is `tiny-character-lab-v8-studio-desk`.
5. Reload once.
6. Turn on offline mode in DevTools.
7. Reload again. The app should still load.

## Editing prompts

Prompt ingredients live in `prompts.js`.

Keep the app’s learning style focused:

```txt
One character, one friend, one prop, or one tiny anchor object.
No full background unless the prompt intentionally says Tiny Scene.
```

## Local storage

The app stores progress only in the browser on the current device. The reset button clears local history, saved prompts, streaks, and skill progress.


## v9 Simple iPad Update

This version shortens the prompt text so the main card stays calm and beginner-friendly. Drawing help now lives in the tap-to-learn chips and the draw steps instead of inside long prompt sentences.

Layout updates:
- iPad portrait uses a two-column learning layout with the main doodle on the left and controls on the right.
- iPad landscape uses a three-column desk layout: practice controls, main doodle, and progress/actions.
- The manifest orientation is set to `any`, so the installed PWA can rotate between portrait and landscape.
- Service worker cache version: `tiny-character-lab-v9-simple-ipad`.
