# Roadmap

Everything in the app today runs as a static site (GitHub Pages): photos, videos, face tracking,
stickers and the party gallery all stay on the device. The ideas below need somewhere to store
photos, so they're parked until the app moves to a host with a backend.

## Bonus: if it moves to Cloudflare

Cloudflare Pages can host the same `app/` folder. Pages Functions (Workers), R2 (file storage) and
D1 or KV (a small database) would add a backend without running a server.

- **Shared event gallery.** One link per party (e.g. `/e/sams-30th`). Every strip and video taken
  at the event is uploaded to R2 and shows up on a live gallery page that guests can browse and
  download from. The host gets a "download all" zip afterwards.
- **"Send to my phone" by QR.** In party mode, show a QR code for this strip only. The guest
  scans it and saves the strip on their own phone. No AirDrop, no typing numbers. Links expire
  after a few days.
- **Slideshow screen.** A TV or laptop at the party shows new strips as they're taken
  (the gallery page in auto-play mode).
- **Short share links for designs.** Design links (`#d=…`) work today, but they're long. With KV
  they could be short (`/d/abc123`) and show a preview image when pasted into Messages.
- **Guest book.** Guests add a message with their strip, collected into the event gallery.
- **Host controls.** A PIN to open or close uploads, remove photos, and set how long the gallery
  stays up.

Things to decide before building it:
- **Privacy:** galleries are unlisted by default, with an optional PIN, and photos auto-delete
  after N days.
- **Size limits:** cap uploads (the JPEG strips are about 1 MB and videos about 5 MB) and resize
  on the device first.
- **Keep it working offline:** the app queues uploads while offline and sends them when the
  connection comes back.

## Could still be done on a static site

- **Head-turn-aware props.** The detailed face model already runs for face paint. Using its 3D
  points would let glasses and hats turn with the head.
- **More face paint and masks,** and live background swap in the camera preview (it's too slow
  on older phones for now).
- **Burst / GIF booth mode** in the camera: 4 quick shots straight into an animated GIF.
