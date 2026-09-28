# 📸 Photo Booth

A birthday photo booth that runs in the browser and installs as an app (PWA). Take or upload 3–4 photos,
pick a background, message, filters and props, then save a photo strip, or record a boomerang,
strobe, slow-mo or 360° clip and save it as a video or GIF. Everything happens on your device.

**Camera:** pick face props with 😎 and see them on everyone's face live. Props and face paint
come along onto the photos and videos you take.

**Face props:** sunglasses, hats, mustaches, ears and other props snap onto faces and stay attached:
- **Photo strips:** a prop sticks to the person in that photo. Retake or replace the photo and it
  jumps onto the new face.
- **Video clips:** props follow the face frame by frame.
- In the sticker studio, 🔗 sticks or unsticks the selected sticker (emoji too), and 👥 copies it
  onto every face. Drag a stuck prop onto another face to move it there.

**Stickers & text** (on photo strips and videos):
- Built-in props, 30 SVG stickers (googly eyes, dog/cat/pig noses, hats, food, party) and every
  emoji up to Emoji 15, with categories and search.
- Your own text: several lines, curved up or down, any colour, a choice of fonts. Change the words
  with ✏️ or by double-clicking.
- In videos, stickers can wiggle, pulse, bounce, spin, float or flash.
- Stickers get a die-cut outline (white by default, any colour, or none).
- Drag to move. Pinch, or drag the round corner handle, to resize and turn. With a mouse,
  scroll to resize and shift+scroll to turn.
- Undo and redo (Ctrl/Cmd+Z). Delete removes a sticker, arrow keys nudge it.

**Looks:** filters plus brightness, contrast and colour sliders. **Face paint** (tiger, kitty,
clown, glitter, sugar skull, butterfly, hearts) follows each face's shape. **Background swap** cuts
people out and puts them on a beach, in space, at a disco, on your own picture, or on a blur.

**Videos:** add background music (Happy Birthday, party, chill, drumroll). It's synthesized
in the browser, so there are no audio files and it works offline.

**Party mode 🎉:** hand a phone or tablet to your guests. It goes full screen with one big button,
counts down the shots, then shows the strip to share or print with a QR code to the app. Hold ✕
to leave. Every strip is kept in the party gallery on the device.

**Designs:** save favourite designs (everything but the photos) and re-apply them, or send one
to a friend as a link.

**Printing:** 4×6 prints at 300 dpi (strips are doubled with a cut line) and a Print button.

**Your work is kept:** photos stay on the device, so a reload, crash or update doesn't lose them
(**Start over** clears them).

**Saving without the booth design:** the save screen has **🎉 Design / 📷 Photos / 🖨️ 4×6 print**
options. Just the photos saves each photo on its own (pick one, or share them all) with its filter,
stickers and text, but no background, frame or message. Videos have the same switch
(**🎥 Just the video**), which keeps the whole camera frame. A photo you zoomed or moved keeps that
framing; otherwise the whole photo is saved.

To add a sticker, drop an SVG into `app/stickers/` and add a line to `app/stickers/stickers.js`
(add a `face` entry if it should snap onto faces). `scripts/build-emoji.mjs` rebuilds the emoji list.

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

### Updates & offline

The workflow stamps `app/sw.js` with the commit hash, so each deploy gets a fresh cache. The app
checks for a new version when it's opened or brought back to the screen (and every 30 minutes).
New versions install in the background and switch over by themselves. If photos are loaded, a
**Reload** bar appears instead, so nobody loses a half-made strip. The app and all stickers
work offline after the first visit.

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
  js/face.js          ← MediaPipe: face finder, background cutter, detailed face shape (loaded when needed)
  js/facepaint.js     ← face paint designs
  js/music.js         ← synthesized video music
  js/lib/qrcode.js    ← QR codes (qrcode-generator, MIT)
  js/emoji-data.js    ← emoji list (generated)
  stickers/           ← SVG sticker pack + stickers.js catalog
  icons/              ← app icons
  vendor/             ← face-tracking runtime, downloaded at build time (not committed)
scripts/fetch-vendor.sh
.github/workflows/pages.yml
ROADMAP.md            ← ideas that need a backend (e.g. a shared party gallery on Cloudflare)
```

## Running locally

```sh
./scripts/fetch-vendor.sh      # optional: without it, face tracking loads from a CDN
npx http-server app -c-1       # or: python3 -m http.server -d app
```

The camera needs `https://` or `http://localhost`. When running locally the service worker cache
isn't versioned, so turn on DevTools → Application → *Update on reload* while you edit.

The face-tracking runtime (~11 MB of WebAssembly, plus models: face finder 230 KB,
background cutter 250 KB, face shape 3.7 MB) is pinned to a version and
checked against a SHA-256 hash in `scripts/fetch-vendor.sh`. It downloads quietly in the background
a couple of seconds after the app opens (unless the phone is in data-saver mode), then stays cached
for offline use. Nothing waits for it: stickers work straight away, the sticker studio shows a
progress bar, and face props start snapping on once it's ready. The background cutter and the
face-shape model are only downloaded when someone turns on background swap or face paint.
