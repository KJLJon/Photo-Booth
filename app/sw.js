// Every app on you.github.io shares one origin, so everything here is scoped to this folder:
// the worker is registered with scope './', and it only ever touches caches with its own prefix.
// __BUILD__ is replaced with the commit hash on deploy, so each release gets a fresh cache.
const PREFIX = 'birthday-photobooth-';
const CACHE = PREFIX + '__BUILD__';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/filters.js',
  './js/props.js',
  './js/encoders.js',
  './js/face.js',
  './js/lib/qrcode.js',
  './js/music.js',
  './js/facepaint.js',
  './js/holidays.js',
  './js/datestamp.js',
  './js/collage.js',
  './js/emoji-data.js',
  './js/app.js',
  './stickers/stickers.js'
];
// every SVG sticker, so the whole pack works offline
importScripts('./stickers/stickers.js');
(self.PBStickers || []).forEach((st) => ASSETS.push(`./stickers/${st.id}.svg`));
// Face-tracking files are large (the WASM runtime is ~11 MB) so they aren't pre-cached;
// they go in their own cache the first time someone uses face props, and survive app updates
// (their folder name carries the library version, so a new version is a new URL).
const VENDOR = PREFIX + 'vendor';
const SCOPE = new URL('./', self.location).pathname;

// Updates install in the background and take over straight away; the page reloads itself when
// that's safe (see app.js), so people always end up on the newest version.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE && k !== VENDOR).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const vendor = url.pathname.startsWith(SCOPE + 'vendor/');
  e.respondWith(
    caches.open(vendor ? VENDOR : CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (req.mode === 'navigate') return cache.match('./index.html');
        throw err;
      }
    })
  );
});
