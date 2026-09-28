# 📸 Photo Booth

A birthday photo booth that runs in the browser and installs as an app (PWA). Take or upload 3–4 photos,
pick a background, message, filters and props, then save a photo strip, or record a boomerang,
strobe, slow-mo or 360° clip and save it as a video or GIF. Everything happens on your device.

**Face props:** sunglasses, hats, mustaches, ears and other props snap onto faces and stay attached:
- **Photo strips:** a prop sticks to the person in that photo. Retake or replace the photo and it
  jumps onto the new face.
- **Video clips:** props follow the face frame by frame.
- In the sticker studio, 🔗 sticks or unsticks the selected sticker (emoji too), and 👥 copies it
  onto every face. Drag a stuck prop onto another face to move it there.

## Hosting on GitHub Pages

1. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main` (or run the **Deploy to GitHub Pages** workflow by hand). The site goes to
   `https://<user>.github.io/<repo>/`.
3. Open that link on a phone and use **Add to Home Screen** (iOS: Share → Add to Home Screen;
   Android/Chrome: Install app).

### Sharing one `github.io` site with other PWAs

Every project site on `<user>.github.io` shares one origin, so the app keeps to its own folder:
- The manifest `id`, `start_url` and `scope` are all `./`, so the installed app is tied to
  `/<repo>/` and doesn't clash with your other apps.
- The service worker is registered with scope `./`, ignores requests outside its folder, and only
  creates or deletes caches whose names start with `birthday-photobooth-`.
- Settings are saved in `localStorage` under `photobooth-settings-v1`. `localStorage` is shared
  across the origin, so no other app should use that key.
- All paths are relative, so renaming the repo or using a custom domain needs no changes.

### Updates

The workflow stamps `app/sw.js` with the commit hash, so each deploy gets a fresh cache. Open apps
show a **✨ New version ready → Update** bar instead of reloading on their own, so nobody loses a
half-made strip.

## Project layout

```
app/                  ← everything that gets published
  index.html
  manifest.json, sw.js
  css/app.css
  js/app.js           ← the app
  js/props.js         ← clip-art props (drawn in code) and where each sits on a face
  js/filters.js       ← photo filters
  js/encoders.js      ← GIF / animated PNG encoders
  js/face.js          ← face finder (MediaPipe BlazeFace, loaded only when needed)
  icons/              ← app icons
  vendor/             ← face-tracking runtime, downloaded at build time (not committed)
scripts/fetch-vendor.sh
.github/workflows/pages.yml
```

## Running locally

```sh
./scripts/fetch-vendor.sh      # optional: without it, face tracking loads from a CDN
npx http-server app -c-1       # or: python3 -m http.server -d app
```

The camera needs `https://` or `http://localhost`. When running locally the service worker cache
isn't versioned, so turn on DevTools → Application → *Update on reload* while you edit.

The face-tracking runtime (~11 MB of WebAssembly, plus a 230 KB model) is pinned to a version and
checked against a SHA-256 hash in `scripts/fetch-vendor.sh`. It only downloads the first time
someone opens the sticker studio, then stays cached for offline use.
