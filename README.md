# Doodle Quest

Doodle Quest is a beginner-friendly drawing prompt Progressive Web App for people practicing in Procreate.

It is fully static, offline-capable, installable, and ready for GitHub Pages. It does not use AI models, APIs, accounts, servers, or build tools.

## Features

- Playful beginner drawing prompts
- Practice modes: Warm-Up, Cute Character, Tiny Scene, Color Practice, Procreate Brush, Gentle Challenge
- Tiny hints, simple steps, and extra challenges
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

You can add more subjects, moods, actions, constraints, hints, or steps without touching the main app logic.

## Notes

This app is designed to help you practice inside Procreate. The “Draw this” button copies the prompt and hint to your clipboard when supported by the browser.


## Icon routing update

The app icons are stored at the project root as `icon-192.png` and `icon-512.png`, alongside `index.html`, so the manifest and service worker use the same relative route style as the other app files.
