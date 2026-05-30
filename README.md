# ScribbleNest

A cozy, static, offline-first PWA for beginner Procreate drawing practice.

ScribbleNest is not a prompt machine. It is a tiny drawing teacher: each idea becomes a micro-lesson card with a starting shape, build order, Procreate setup, beginner trap, and redraw challenge.

## Files

All app files live in the same route/folder:

```text
index.html
styles.css
lessons.js
app.js
manifest.webmanifest
service-worker.js
icon-192.png
icon-512.png
README.md
```

The icons are intentionally in the same root route as the rest of the files and are referenced as:

```json
"./icon-192.png"
"./icon-512.png"
```

## Run locally

Because service workers require a server context, use a local static server instead of opening `index.html` directly.

With Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages**.
4. Set source to **Deploy from a branch**.
5. Choose the `main` branch and `/root`.
6. Save.
7. Visit the GitHub Pages URL.

## Test PWA installability

In Chrome or Edge:

1. Open the deployed site.
2. Open DevTools.
3. Go to **Application**.
4. Check **Manifest** and **Service Workers**.
5. Reload once after the service worker installs.
6. Turn on offline mode and refresh.
7. The app should still load.

## Local data

ScribbleNest uses `localStorage`:

```text
scribblenest.currentLesson
scribblenest.stash
scribblenest.drawnHistory
```

The Reset screen clears all saved app data from the current browser.

## Smart logic, no AI

The app uses deterministic scoring to avoid immediate repeats and prefer lessons the user has not drawn recently. Redraw challenges progress through expression, pose/detail, texture, and simplification ideas based on redraw count.

No backend, no API keys, no models, no build tools.
