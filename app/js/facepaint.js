/* Face paint — drawn onto faces using MediaPipe's 478 face points, so it follows the face's shape.
   The paint is drawn on its own layer, its edges softened, and then the face's own shading is brought
   back through it so it looks painted on rather than pasted on.
   PBPaint.draw(ctx, points, id): `points` are in ctx's (possibly transformed) coordinates. */
(function () {
  'use strict';

  const EFFECTS = [
    { id: 'none', label: '🚫 None' },
    { id: 'tiger', label: '🐯 Tiger' }, { id: 'kitty', label: '🐱 Kitty' }, { id: 'leopard', label: '🐆 Leopard' },
    { id: 'panda', label: '🐼 Panda' }, { id: 'puppy', label: '🐶 Puppy' },
    { id: 'skull', label: '💀 Sugar skull' }, { id: 'clown', label: '🤡 Clown' }, { id: 'zombie', label: '🧟 Zombie' },
    { id: 'vampire', label: '🧛 Vampire' }, { id: 'hero', label: '🦸 Hero mask' },
    { id: 'butterfly', label: '🦋 Butterfly' }, { id: 'unicorn', label: '🦄 Unicorn' }, { id: 'mermaid', label: '🧜 Mermaid' },
    { id: 'galaxy', label: '🌌 Galaxy' }, { id: 'neon', label: '💡 Neon' }, { id: 'glitter', label: '✨ Glitter' },
    { id: 'hearts', label: '❤️ Hearts' }, { id: 'freckles', label: '🟤 Freckles' },
    { id: 'eyeblack', label: '🏈 Game day' }, { id: 'flag', label: '🇺🇸 Team spirit' }
  ];

  // standard face-mesh point numbers
  const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
  const LIPS_IN = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
  const EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
  const EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
  const BROW_R = [70, 63, 105, 66, 107], BROW_L = [300, 293, 334, 296, 336];
  const P = { top: 10, chin: 152, noseTip: 4, noseBase: 2, bridge: 6, brows: 168, upperLip: 0, lowerLip: 17, mouthR: 61, mouthL: 291,
    cheekR: 205, cheekL: 425, boneR: 116, boneL: 345, sideR: 234, sideL: 454, alarR: 98, alarL: 327, templeR: 127, templeL: 356,
    lidR: 145, lidL: 374, jawR: 172, jawL: 397, foreR: 54, foreL: 284 };

  const TAU = Math.PI * 2;
  const mid = (a, b, k = .5) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const center = (p, idx) => { let x = 0, y = 0; idx.forEach(i => { x += p[i].x; y += p[i].y; }); return { x: x / idx.length, y: y / idx.length }; };
  const away = (a, from, k) => ({ x: a.x + (a.x - from.x) * k, y: a.y + (a.y - from.y) * k });
  function poly(ctx, p, idx, scale, c) {
    idx.forEach((i, k) => { let q = p[i]; if (scale && c) q = { x: c.x + (q.x - c.x) * scale, y: c.y + (q.y - c.y) * scale }; k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.closePath();
  }
  // a smooth closed curve through the points (for soft, rounded shapes)
  function smooth(ctx, pts) {
    const n = pts.length;
    ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2); }
    ctx.closePath();
  }
  const ptsOf = (p, idx, scale, c) => idx.map(i => (scale && c ? { x: c.x + (p[i].x - c.x) * scale, y: c.y + (p[i].y - c.y) * scale } : p[i]));
  // the face, with the forehead raised a little (the mesh stops at the hairline)
  function faceOutline(p, lift) {
    const c = center(p, OVAL), up = { x: p[P.top].x - p[P.chin].x, y: p[P.top].y - p[P.chin].y }, L = Math.hypot(up.x, up.y);
    return OVAL.map(i => {
      const q = p[i], t = Math.max(0, ((q.x - c.x) * up.x + (q.y - c.y) * up.y) / (L * L) * 2);   // 0 at the middle → 1 at the top
      return { x: q.x + up.x / L * t * L * (lift || 0), y: q.y + up.y / L * t * L * (lift || 0) };
    });
  }
  function eyeHoles(ctx, p, k) {
    for (const e of [EYE_R, EYE_L]) { const c = center(p, e); smooth(ctx, ptsOf(p, e, k || 1.35, c)); }
  }
  function mouthHole(ctx, p, k) { const c = center(p, LIPS); smooth(ctx, ptsOf(p, LIPS, k || 1.05, c)); }
  function heart(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.beginPath(); ctx.moveTo(0, s * .8);
    ctx.bezierCurveTo(-s * 1.25, -s * .05, -s * .65, -s * .95, 0, -s * .35); ctx.bezierCurveTo(s * .65, -s * .95, s * 1.25, -s * .05, 0, s * .8); ctx.fill(); ctx.restore();
  }
  function sparkle(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }
  function star(ctx, x, y, R, rot) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? R * .45 : R; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
  }
  // tapered brush stroke from a to b
  function stroke(ctx, a, b, w, bend) {
    const d = { x: b.x - a.x, y: b.y - a.y }, L = Math.hypot(d.x, d.y) || 1, n = { x: -d.y / L, y: d.x / L }, m = mid(a, b);
    const c = { x: m.x + n.x * (bend || 0) * L, y: m.y + n.y * (bend || 0) * L };
    ctx.beginPath(); ctx.moveTo(a.x + n.x * w, a.y + n.y * w);
    ctx.quadraticCurveTo(c.x + n.x * w * .5, c.y + n.y * w * .5, b.x, b.y);
    ctx.quadraticCurveTo(c.x - n.x * w * .5, c.y - n.y * w * .5, a.x - n.x * w, a.y - n.y * w); ctx.closePath(); ctx.fill();
  }
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const side = (p, i) => Math.sign(p[i].x - p[P.noseTip].x) || 1;

  // each design: how much of the skin's shading shows back through (tex), then the drawing
  const DRAW = {
    tiger: { tex: .5, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .08)); mouthHole(c, p, 1.05); c.clip('evenodd');
      const g = c.createRadialGradient(p[P.noseTip].x, p[P.noseTip].y, W * .1, p[P.noseTip].x, p[P.noseTip].y, W * .8);
      g.addColorStop(0, '#ffb13b'); g.addColorStop(1, '#e8590c'); c.fillStyle = g; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4);
      c.fillStyle = '#fff8ec';                                              // muzzle, chin and brows
      const m = mid(p[P.noseBase], p[P.upperLip], .45);
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(m.x + s * W * .09, m.y, W * .11, W * .06, s * .25, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(p[P.chin].x, p[P.chin].y - W * .08, W * .16, W * .1, 0, 0, TAU); c.fill();
      for (const b of [BROW_R, BROW_L]) { c.beginPath(); smooth(c, ptsOf(p, b, 1.6, center(p, b)).concat(ptsOf(p, b, 1.6, center(p, b)).reverse().map(q => ({ x: q.x, y: q.y - W * .07 })))); c.fill(); }
      c.fillStyle = '#1a0d05'; const cc = center(p, OVAL);
      [103, 67, 109, 338, 297, 332].forEach((i, k) => stroke(c, away(p[i], cc, .06), mid(p[i], cc, .3 + (k % 2) * .08), W * .028, .1));
      [234, 93, 132, 58, 454, 323, 361, 288, 127, 356].forEach((i, k) => stroke(c, away(p[i], cc, .05), mid(p[i], cc, .22 + (k % 3) * .05), W * .024, k % 2 ? .12 : -.12));
      c.restore();
      const n = p[P.noseTip]; c.fillStyle = '#1a0d05';
      c.beginPath(); c.moveTo(n.x - W * .07, n.y - W * .04); c.quadraticCurveTo(n.x, n.y - W * .07, n.x + W * .07, n.y - W * .04); c.quadraticCurveTo(n.x, n.y + W * .07, n.x - W * .07, n.y - W * .04); c.fill();
      c.lineWidth = W * .012; c.strokeStyle = '#1a0d05'; c.beginPath(); c.moveTo(n.x, n.y + W * .03); c.lineTo(p[P.upperLip].x, p[P.upperLip].y); c.stroke();
    } },
    leopard: { tex: .5, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .06)); c.clip();
      c.fillStyle = '#e9b872'; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4);
      const r = rng(11), cc = center(p, OVAL);
      for (let k = 0; k < 42; k++) {
        const i = OVAL[Math.floor(r() * OVAL.length)], q = mid(p[i], cc, .05 + r() * .35), s = W * (.025 + r() * .025);
        c.fillStyle = '#3b2412'; c.beginPath();
        for (let a = 0; a < 5; a++) { const t = a / 5 * TAU + r(); c.arc(q.x + Math.cos(t) * s, q.y + Math.sin(t) * s, s * (.35 + r() * .2), 0, TAU); }
        c.fill(); c.fillStyle = '#c8873b'; c.beginPath(); c.arc(q.x, q.y, s * .6, 0, TAU); c.fill();
      }
      c.restore();
      const n = p[P.noseTip]; c.fillStyle = '#2b1a0c'; c.beginPath(); c.ellipse(n.x, n.y - W * .01, W * .06, W * .04, 0, 0, TAU); c.fill();
      c.lineWidth = W * .01; c.strokeStyle = '#2b1a0c';
      for (const ci of [P.cheekR, P.cheekL]) { const ch = p[ci], s = side(p, ci); for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(ch.x, ch.y + k * W * .03); c.quadraticCurveTo(ch.x + s * W * .12, ch.y + k * W * .04, ch.x + s * W * .24, ch.y + k * W * .08); c.stroke(); } }
    } },
    kitty: { tex: .35, fn(c, p, W) {
      const n = p[P.noseTip];
      c.fillStyle = '#ff8fb8';
      c.beginPath(); c.moveTo(n.x - W * .06, n.y - W * .035); c.quadraticCurveTo(n.x, n.y - W * .065, n.x + W * .06, n.y - W * .035); c.quadraticCurveTo(n.x, n.y + W * .065, n.x - W * .06, n.y - W * .035); c.fill();
      c.strokeStyle = '#2a1c1c'; c.lineWidth = W * .012; c.lineCap = 'round';
      c.beginPath(); c.moveTo(n.x, n.y + W * .02); c.lineTo(p[P.upperLip].x, p[P.upperLip].y);
      c.moveTo(p[P.upperLip].x, p[P.upperLip].y); c.quadraticCurveTo(p[P.upperLip].x - W * .04, p[P.upperLip].y + W * .04, p[P.mouthR].x, p[P.mouthR].y);
      c.moveTo(p[P.upperLip].x, p[P.upperLip].y); c.quadraticCurveTo(p[P.upperLip].x + W * .04, p[P.upperLip].y + W * .04, p[P.mouthL].x, p[P.mouthL].y); c.stroke();
      c.lineWidth = W * .007;
      for (const ci of [P.cheekR, P.cheekL]) {
        const ch = p[ci], s = side(p, ci);
        for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(ch.x - s * W * .03, ch.y + k * W * .03); c.quadraticCurveTo(ch.x + s * W * .15, ch.y + k * W * .045 - W * .02, ch.x + s * W * .32, ch.y + k * W * .1); c.stroke(); }
        c.fillStyle = '#2a1c1c'; for (let d = 0; d < 3; d++) { c.beginPath(); c.arc(ch.x - s * W * (.07 + d * .03), ch.y - W * (.02 - (d % 2) * .03), W * .008, 0, TAU); c.fill(); }
        const g = c.createRadialGradient(ch.x, ch.y - W * .05, 0, ch.x, ch.y - W * .05, W * .1); g.addColorStop(0, 'rgba(255,120,160,.55)'); g.addColorStop(1, 'rgba(255,120,160,0)');
        c.fillStyle = g; c.beginPath(); c.arc(ch.x, ch.y - W * .05, W * .1, 0, TAU); c.fill();
      }
    } },
    panda: { tex: .5, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .05)); c.clip();
      c.fillStyle = '#f7f7f5'; c.globalAlpha = .9; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4); c.globalAlpha = 1;
      c.restore();
      c.fillStyle = '#161616';
      for (const e of [EYE_R, EYE_L]) { const ce = center(p, e), s = Math.sign(ce.x - p[P.noseTip].x); c.beginPath(); c.ellipse(ce.x + s * W * .02, ce.y + W * .02, W * .17, W * .12, s * .5, 0, TAU); c.fill(); }
      const n = p[P.noseTip]; c.beginPath(); c.ellipse(n.x, n.y - W * .01, W * .08, W * .055, 0, 0, TAU); c.fill();
      c.lineWidth = W * .014; c.strokeStyle = '#161616'; c.beginPath(); c.moveTo(n.x, n.y + W * .03); c.lineTo(p[P.upperLip].x, p[P.upperLip].y); c.stroke();
    } },
    puppy: { tex: .4, fn(c, p, W) {
      const eR = center(p, EYE_R), s = side(p, P.cheekR);
      c.fillStyle = '#6b3e1e'; c.beginPath(); c.ellipse(eR.x + s * W * .03, eR.y, W * .15, W * .13, .3, 0, TAU); smooth(c, ptsOf(p, EYE_R, 1.3, eR)); c.fill('evenodd');
      const n = p[P.noseTip]; const g = c.createRadialGradient(n.x - W * .02, n.y - W * .03, W * .005, n.x, n.y, W * .09);
      g.addColorStop(0, '#555'); g.addColorStop(1, '#111'); c.fillStyle = g;
      c.beginPath(); c.moveTo(n.x - W * .085, n.y - W * .03); c.quadraticCurveTo(n.x, n.y - W * .09, n.x + W * .085, n.y - W * .03); c.quadraticCurveTo(n.x + W * .06, n.y + W * .06, n.x, n.y + W * .05); c.quadraticCurveTo(n.x - W * .06, n.y + W * .06, n.x - W * .085, n.y - W * .03); c.fill();
      c.lineWidth = W * .012; c.strokeStyle = '#111'; c.beginPath(); c.moveTo(n.x, n.y + W * .05); c.lineTo(p[P.upperLip].x, p[P.upperLip].y); c.stroke();
      c.fillStyle = '#3a2210'; for (const ci of [P.cheekR, P.cheekL]) { const ch = p[ci]; for (let d = 0; d < 4; d++) { c.beginPath(); c.arc(ch.x + (d - 1.5) * W * .025 * side(p, ci), ch.y - W * .02 + (d % 2) * W * .02, W * .009, 0, TAU); c.fill(); } }
    } },
    skull: { tex: .45, fn(c, p, W) {
      // white face (eyes and mouth left open so they don't look blank)
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .12)); eyeHoles(c, p, 1.2); c.clip('evenodd');
      const cc = center(p, OVAL), g = c.createRadialGradient(cc.x, cc.y - W * .2, W * .1, cc.x, cc.y, W * .9);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8e4ef'); c.fillStyle = g; c.fillRect(cc.x - W * 2, cc.y - W * 2, W * 4, W * 4);
      c.restore();
      // eye sockets: black, ringed with a petal flower and dots
      for (const e of [EYE_R, EYE_L]) {
        const ce = center(p, e), R = W * .13, petals = e === EYE_R ? '#ff4fa3' : '#2ec4b6';
        c.fillStyle = petals;
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; c.beginPath(); c.ellipse(ce.x + Math.cos(a) * R * 1.25, ce.y + Math.sin(a) * R * 1.2, R * .34, R * .2, a, 0, TAU); c.fill(); }
        c.fillStyle = '#ffd23f'; for (let k = 0; k < 10; k++) { const a = (k + .5) / 10 * TAU; c.beginPath(); c.arc(ce.x + Math.cos(a) * R * 1.62, ce.y + Math.sin(a) * R * 1.56, R * .07, 0, TAU); c.fill(); }
        c.fillStyle = '#15101c'; c.beginPath(); c.ellipse(ce.x, ce.y, R * 1.05, R * .98, 0, 0, TAU); c.fill();
      }
      // nose: an upside-down heart (spade) with a highlight
      const n = p[P.noseTip]; c.fillStyle = '#15101c';
      c.save(); c.translate(n.x, n.y - W * .01); c.rotate(Math.PI); heart(c, 0, 0, W * .06); c.restore();
      // teeth over the lips out to the cheeks
      const a = p[P.mouthR], b = p[P.mouthL];
      const L0 = away(a, b, .35), L1 = away(b, a, .35);
      c.strokeStyle = '#15101c'; c.lineWidth = W * .012; c.lineCap = 'round';
      c.beginPath(); c.moveTo(L0.x, L0.y); c.quadraticCurveTo(p[P.upperLip].x, (a.y + b.y) / 2 + W * .05, L1.x, L1.y); c.stroke();
      const steps = 10;
      for (let k = 1; k < steps; k++) {
        const t = k / steps, q = { x: L0.x + (L1.x - L0.x) * t, y: L0.y + (L1.y - L0.y) * t + Math.sin(t * Math.PI) * W * .05 }, h = W * (.045 + Math.sin(t * Math.PI) * .03);
        c.beginPath(); c.moveTo(q.x, q.y - h); c.lineTo(q.x, q.y + h * .9); c.stroke();
      }
      // forehead flower and cheek swirls
      const f = mid(p[P.top], p[P.brows], .45), fr = W * .045;
      for (let k = 0; k < 6; k++) { const aa = k / 6 * TAU; c.fillStyle = k % 2 ? '#ff4fa3' : '#9b5de5'; c.beginPath(); c.ellipse(f.x + Math.cos(aa) * fr, f.y + Math.sin(aa) * fr, fr * .7, fr * .42, aa, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(f.x, f.y, fr * .5, 0, TAU); c.fill();
      c.strokeStyle = '#2ec4b6'; c.lineWidth = W * .01;
      for (const ci of [P.cheekR, P.cheekL]) { const ch = p[ci], sg = side(p, ci); c.beginPath(); for (let t = 0; t < 2.2 * Math.PI; t += .2) { const r2 = W * .012 * t; c.lineTo(ch.x + sg * W * .03 + Math.cos(t * sg) * r2, ch.y - W * .03 + Math.sin(t * sg) * r2); } c.stroke(); }
      c.fillStyle = '#15101c'; const ch2 = p[P.chin]; for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(ch2.x + k * W * .04, ch2.y - W * .06 - Math.abs(k) * W * .01, W * .012, 0, TAU); c.fill(); }
    } },
    clown: { tex: .45, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .1)); eyeHoles(c, p, 1.2); c.clip('evenodd');
      c.fillStyle = '#fbfbfb'; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4); c.restore();
      for (const e of [EYE_R, EYE_L]) {
        const ce = center(p, e), h = W * .12;
        c.fillStyle = '#1e88ff';
        c.beginPath(); c.moveTo(ce.x, ce.y - h * 1.5); c.lineTo(ce.x + h * .35, ce.y - h * .55); c.lineTo(ce.x - h * .35, ce.y - h * .55); c.fill();
        c.beginPath(); c.moveTo(ce.x, ce.y + h * 1.4); c.lineTo(ce.x + h * .3, ce.y + h * .55); c.lineTo(ce.x - h * .3, ce.y + h * .55); c.fill();
      }
      for (const b of [BROW_R, BROW_L]) { c.strokeStyle = '#222'; c.lineWidth = W * .02; c.lineCap = 'round'; c.beginPath(); ptsOf(p, b, 1.3, center(p, b)).forEach((q, i) => (i ? c.lineTo(q.x, q.y - W * .04) : c.moveTo(q.x, q.y - W * .04))); c.stroke(); }
      const mc = center(p, LIPS), a = p[P.mouthR], b = p[P.mouthL];
      c.fillStyle = '#e8112d';
      c.beginPath(); c.moveTo(away(a, b, .25).x, away(a, b, .25).y - W * .03);
      c.quadraticCurveTo(mc.x, mc.y - W * .09, away(b, a, .25).x, away(b, a, .25).y - W * .03);
      c.quadraticCurveTo(mc.x, mc.y + W * .2, away(a, b, .25).x, away(a, b, .25).y - W * .03); c.fill();
      const n = p[P.noseTip], R = W * .08, g = c.createRadialGradient(n.x - R * .35, n.y - R * .4, R * .1, n.x, n.y, R);
      g.addColorStop(0, '#ff9a9a'); g.addColorStop(.5, '#e60023'); g.addColorStop(1, '#8f0016'); c.fillStyle = g; c.beginPath(); c.arc(n.x, n.y, R, 0, TAU); c.fill();
    } },
    zombie: { tex: .6, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .1)); c.clip();
      c.fillStyle = 'rgba(126,160,110,.85)'; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4);
      for (const e of [EYE_R, EYE_L]) { const ce = center(p, e), g = c.createRadialGradient(ce.x, ce.y + W * .02, W * .03, ce.x, ce.y + W * .02, W * .17); g.addColorStop(0, 'rgba(50,30,50,.9)'); g.addColorStop(1, 'rgba(50,30,50,0)'); c.fillStyle = g; c.fillRect(ce.x - W * .2, ce.y - W * .2, W * .4, W * .4); }
      c.restore();
      c.strokeStyle = '#2b1d1d'; c.lineWidth = W * .01; c.lineCap = 'round';
      const ch = p[P.cheekL], s = side(p, P.cheekL), a0 = { x: ch.x - s * W * .05, y: ch.y - W * .12 }, a1 = { x: ch.x + s * W * .08, y: ch.y + W * .08 };
      c.beginPath(); c.moveTo(a0.x, a0.y); c.lineTo(a1.x, a1.y); c.stroke();
      for (let k = 1; k < 6; k++) { const q = mid(a0, a1, k / 6); c.beginPath(); c.moveTo(q.x - W * .025, q.y + W * .012 * s); c.lineTo(q.x + W * .025, q.y - W * .012 * s); c.stroke(); }
      c.lineWidth = W * .006; c.strokeStyle = 'rgba(60,40,40,.7)'; const f = mid(p[P.top], p[P.brows], .4);
      c.beginPath(); c.moveTo(f.x - W * .1, f.y); c.lineTo(f.x - W * .03, f.y + W * .03); c.lineTo(f.x + W * .02, f.y - W * .02); c.lineTo(f.x + W * .09, f.y + W * .02); c.stroke();
      c.fillStyle = 'rgba(90,20,30,.55)'; c.beginPath(); smooth(c, ptsOf(p, LIPS, 1.05, center(p, LIPS))); c.fill();
    } },
    vampire: { tex: .55, fn(c, p, W) {
      c.save(); c.beginPath(); smooth(c, faceOutline(p, .08)); c.clip();
      c.fillStyle = 'rgba(245,240,248,.55)'; c.fillRect(p[P.noseTip].x - W * 2, p[P.noseTip].y - W * 2, W * 4, W * 4);
      for (const e of [EYE_R, EYE_L]) { const ce = center(p, e), g = c.createRadialGradient(ce.x, ce.y - W * .02, W * .03, ce.x, ce.y - W * .02, W * .16); g.addColorStop(0, 'rgba(70,0,40,.75)'); g.addColorStop(1, 'rgba(70,0,40,0)'); c.fillStyle = g; c.fillRect(ce.x - W * .2, ce.y - W * .22, W * .4, W * .4); }
      for (const ci of [P.boneR, P.boneL]) { const q = p[ci], g = c.createRadialGradient(q.x, q.y + W * .05, 0, q.x, q.y + W * .05, W * .12); g.addColorStop(0, 'rgba(90,60,90,.35)'); g.addColorStop(1, 'rgba(90,60,90,0)'); c.fillStyle = g; c.fillRect(q.x - W * .15, q.y - W * .1, W * .3, W * .3); }
      c.restore();
      c.fillStyle = 'rgba(150,0,30,.85)'; c.beginPath(); smooth(c, ptsOf(p, LIPS, 1.02, center(p, LIPS))); smooth(c, ptsOf(p, LIPS_IN, 1, center(p, LIPS_IN))); c.fill('evenodd');
      c.fillStyle = '#ffffff'; const ul = p[13];
      for (const s of [-1, 1]) { const x = ul.x + s * W * .06; c.beginPath(); c.moveTo(x - W * .015, ul.y); c.lineTo(x + W * .015, ul.y); c.lineTo(x, ul.y + W * .06); c.fill(); }
      c.fillStyle = '#b3001b'; for (const s of [-1, 1]) { c.beginPath(); c.arc(ul.x + s * W * .06, ul.y + W * .075, W * .008, 0, TAU); c.fill(); }
    } },
    hero: { tex: .35, fn(c, p, W) {
      const eR = center(p, EYE_R), eL = center(p, EYE_L), d = { x: eL.x - eR.x, y: eL.y - eR.y }, L = Math.hypot(d.x, d.y), u = { x: d.x / L, y: d.y / L }, n = { x: -u.y, y: u.x };
      const o = (q, a, b) => ({ x: q.x + u.x * a + n.x * b, y: q.y + u.y * a + n.y * b });
      const A = o(eR, -L * .75, -L * .1), B = o(eL, L * .75, -L * .1);
      c.fillStyle = '#d7263d'; c.beginPath();
      c.moveTo(A.x, A.y); c.quadraticCurveTo(o(eR, -L * .3, -L * .55).x, o(eR, -L * .3, -L * .55).y, o(mid(eR, eL), 0, -L * .32).x, o(mid(eR, eL), 0, -L * .32).y);
      c.quadraticCurveTo(o(eL, L * .3, -L * .55).x, o(eL, L * .3, -L * .55).y, B.x, B.y);
      c.quadraticCurveTo(o(eL, L * .45, L * .5).x, o(eL, L * .45, L * .5).y, o(mid(eR, eL), 0, L * .22).x, o(mid(eR, eL), 0, L * .22).y);
      c.quadraticCurveTo(o(eR, -L * .45, L * .5).x, o(eR, -L * .45, L * .5).y, A.x, A.y);
      eyeHoles(c, p, 1.25); c.fill('evenodd');
      c.strokeStyle = '#7a0010'; c.lineWidth = W * .01; c.stroke();
    } },
    butterfly: { tex: .35, fn(c, p, W) {
      const br = p[P.bridge];
      for (const e of [EYE_R, EYE_L]) {
        const ce = center(p, e), s = Math.sign(ce.x - br.x) || 1;
        c.save(); c.beginPath(); c.rect(ce.x - W, ce.y - W, W * 2, W * 2); smooth(c, ptsOf(p, e, 1.3, ce)); c.clip('evenodd');
        const up = c.createRadialGradient(br.x, br.y, W * .02, br.x, br.y, W * .45);
        up.addColorStop(0, '#ffd23f'); up.addColorStop(.35, '#ff5fa2'); up.addColorStop(1, '#7b2ff7');
        c.fillStyle = up; c.beginPath(); c.moveTo(br.x, br.y);
        c.bezierCurveTo(br.x + s * W * .05, ce.y - W * .38, ce.x + s * W * .42, ce.y - W * .34, ce.x + s * W * .28, ce.y + W * .02);
        c.bezierCurveTo(ce.x + s * W * .12, ce.y + W * .06, br.x + s * W * .05, br.y + W * .04, br.x, br.y); c.fill();
        c.strokeStyle = 'rgba(40,10,60,.8)'; c.lineWidth = W * .008; c.stroke();
        const lo = c.createRadialGradient(br.x, br.y + W * .05, W * .02, br.x, br.y + W * .05, W * .3); lo.addColorStop(0, '#80ffdb'); lo.addColorStop(1, '#3a86ff');
        c.fillStyle = lo; c.beginPath(); c.moveTo(br.x, br.y + W * .03);
        c.bezierCurveTo(ce.x, ce.y + W * .14, ce.x + s * W * .27, ce.y + W * .24, ce.x + s * W * .14, ce.y + W * .28);
        c.bezierCurveTo(ce.x - s * W * .02, ce.y + W * .28, br.x + s * W * .03, br.y + W * .14, br.x, br.y + W * .03); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.9)'; for (const k of [0, 1, 2, 3]) { c.beginPath(); c.arc(ce.x + s * W * (.1 + k * .055), ce.y - W * (.18 - k * .05), W * .012, 0, TAU); c.fill(); }
        c.restore();
      }
      c.strokeStyle = 'rgba(40,10,60,.9)'; c.lineWidth = W * .016; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p[P.brows].x, p[P.brows].y); c.lineTo(p[P.noseTip].x, p[P.noseTip].y - W * .04); c.stroke();
    } },
    unicorn: { tex: .35, fn(c, p, W) {
      const cols = ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc'];
      for (const e of [EYE_R, EYE_L]) {
        const ce = center(p, e), s = side(p, e === EYE_R ? P.boneR : P.boneL);
        c.save(); c.beginPath(); c.rect(ce.x - W, ce.y - W, W * 2, W * 2); smooth(c, ptsOf(p, e, 1.25, ce)); c.clip('evenodd');
        cols.forEach((col, k) => { c.strokeStyle = col; c.globalAlpha = .75; c.lineWidth = W * .035; c.beginPath(); c.arc(ce.x + s * W * .02, ce.y + W * .02, W * (.11 + k * .03), Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
        c.restore();
        c.globalAlpha = 1; c.fillStyle = '#ffffff';
        for (let k = 0; k < 4; k++) sparkle(c, ce.x + s * W * (.2 + k * .03), ce.y - W * (.1 - k * .07), W * (.025 - k * .004));
      }
      c.fillStyle = '#ff8fab'; for (const ci of [P.cheekR, P.cheekL]) heart(c, p[ci].x, p[ci].y - W * .04, W * .035);
      c.fillStyle = '#ffd166'; const f = mid(p[P.top], p[P.brows], .35); star(c, f.x, f.y, W * .045, 0);
    } },
    mermaid: { tex: .4, fn(c, p, W) {
      for (const ti of [P.templeR, P.templeL]) {
        const t = p[ti], s = side(p, ti), R = W * .035;
        for (let row = 0; row < 5; row++) for (let k = 0; k < 4; k++) {
          const x = t.x - s * (k * R * 1.5 + (row % 2) * R * .75) - s * R, y = t.y - W * .15 + row * R * 1.1;
          const g = c.createLinearGradient(x, y - R, x, y + R); g.addColorStop(0, '#80ffdb'); g.addColorStop(1, '#5390d9');
          c.fillStyle = g; c.globalAlpha = .85 - k * .15; c.beginPath(); c.arc(x, y, R, 0, Math.PI); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = W * .004; c.stroke();
        }
      }
      c.globalAlpha = 1; c.fillStyle = '#ffffff';
      for (const e of [EYE_R, EYE_L]) { const ce = center(p, e); for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(ce.x + (k - 2) * W * .03, ce.y - W * .07 - Math.abs(k - 2) * -W * .008, W * .007, 0, TAU); c.fill(); } }
    } },
    galaxy: { tex: .3, fn(c, p, W) {
      for (const ci of [P.boneR, P.boneL]) {
        const q = p[ci], s = side(p, ci);
        const g = c.createLinearGradient(q.x - s * W * .05, q.y - W * .1, q.x + s * W * .2, q.y + W * .05);
        g.addColorStop(0, 'rgba(123,47,247,.85)'); g.addColorStop(.5, 'rgba(58,134,255,.8)'); g.addColorStop(1, 'rgba(255,95,162,.7)');
        c.fillStyle = g; c.beginPath();
        c.moveTo(q.x - s * W * .06, q.y - W * .06); c.quadraticCurveTo(q.x + s * W * .12, q.y - W * .12, q.x + s * W * .24, q.y - W * .04);
        c.quadraticCurveTo(q.x + s * W * .12, q.y + W * .06, q.x - s * W * .04, q.y + W * .04); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; const r = rng(ci);
        for (let k = 0; k < 9; k++) { const x = q.x + s * W * (.0 + r() * .2), y = q.y - W * .06 + r() * W * .08; k % 3 ? (c.beginPath(), c.arc(x, y, W * .004, 0, TAU), c.fill()) : sparkle(c, x, y, W * .014); }
      }
    } },
    neon: { tex: 0, soft: false, fn(c, p, W) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      const glow = (col, fn) => { c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = W * .04; c.lineWidth = W * .012; fn(); c.shadowBlur = 0; };
      glow('#39ff14', () => { for (const e of [EYE_R, EYE_L]) { const ce = center(p, e); c.beginPath(); smooth(c, ptsOf(p, e, 1.9, ce)); c.stroke(); } });
      glow('#ff2bd6', () => { for (const ci of [P.cheekR, P.cheekL]) { const q = p[ci], s = side(p, ci); c.beginPath(); c.moveTo(q.x - s * W * .02, q.y - W * .08); c.lineTo(q.x + s * W * .08, q.y); c.lineTo(q.x - s * W * .02, q.y + W * .06); c.stroke(); } });
      glow('#00e5ff', () => { const f = mid(p[P.top], p[P.brows], .5); c.beginPath(); c.moveTo(f.x - W * .12, f.y); c.lineTo(f.x, f.y - W * .05); c.lineTo(f.x + W * .12, f.y); c.stroke(); });
    } },
    glitter: { tex: .2, fn(c, p, W) {
      for (const ci of [P.cheekR, P.cheekL]) {
        const ch = p[ci], g = c.createRadialGradient(ch.x, ch.y - W * .04, 0, ch.x, ch.y - W * .04, W * .13);
        g.addColorStop(0, 'rgba(255,100,160,.55)'); g.addColorStop(1, 'rgba(255,100,160,0)');
        c.fillStyle = g; c.beginPath(); c.arc(ch.x, ch.y - W * .04, W * .13, 0, TAU); c.fill();
      }
      const r = rng(7);
      for (const oi of [33, 263]) {
        const o = p[oi], s = Math.sign(o.x - p[P.noseTip].x) || 1;
        for (let k = 0; k < 18; k++) {
          const a = (r() - .5) * 2.4, rr = W * (.03 + r() * .17), x = o.x + s * Math.cos(a) * rr, y = o.y + Math.sin(a) * rr + W * .03;
          c.fillStyle = ['#fff6a8', '#ffffff', '#ffc2e6', '#b8f1ff'][k % 4]; c.shadowColor = '#fff'; c.shadowBlur = W * .01;
          k % 3 ? sparkle(c, x, y, W * (.012 + r() * .02)) : (c.beginPath(), c.arc(x, y, W * .007, 0, TAU), c.fill());
        }
        c.shadowBlur = 0;
        const gem = { x: o.x + s * W * .05, y: o.y + W * .01 }, gg = c.createLinearGradient(gem.x, gem.y - W * .02, gem.x, gem.y + W * .02);
        gg.addColorStop(0, '#e0f7ff'); gg.addColorStop(1, '#8a4dff'); c.fillStyle = gg;
        c.beginPath(); c.moveTo(gem.x, gem.y - W * .022); c.lineTo(gem.x + W * .016, gem.y); c.lineTo(gem.x, gem.y + W * .022); c.lineTo(gem.x - W * .016, gem.y); c.fill();
      }
    } },
    hearts: { tex: .3, fn(c, p, W) {
      c.fillStyle = '#eb1446'; heart(c, p[P.cheekR].x, p[P.cheekR].y - W * .03, W * .065, -.2); heart(c, p[P.cheekL].x, p[P.cheekL].y - W * .03, W * .065, .2);
      c.fillStyle = '#ff8fb8';
      for (const e of [EYE_R, EYE_L]) { const ce = center(p, e), s = Math.sign(ce.x - p[P.noseTip].x); heart(c, ce.x + s * W * .09, ce.y + W * .1, W * .024, s * .3); heart(c, ce.x + s * W * .13, ce.y + W * .05, W * .017, s * .4); }
    } },
    freckles: { tex: .5, fn(c, p, W) {
      const r = rng(5), n = p[P.noseTip], br = p[P.bridge];
      for (let k = 0; k < 60; k++) {
        const s = r() < .5 ? -1 : 1, t = r(), x = mid(br, n, .6).x + s * W * (.02 + t * .23), y = mid(br, n, .6).y + (r() - .5) * W * .1 + t * t * W * .06;
        c.fillStyle = `rgba(${120 + r() * 30},${70 + r() * 20},${40},${.35 + r() * .35})`;
        c.beginPath(); c.ellipse(x, y, W * (.006 + r() * .006), W * (.005 + r() * .005), r() * 3, 0, TAU); c.fill();
      }
    } },
    eyeblack: { tex: .4, fn(c, p, W) {
      c.fillStyle = '#141414';
      for (const [li, bi] of [[P.lidR, P.boneR], [P.lidL, P.boneL]]) {
        const a = p[li], b = p[bi], m = mid(a, b, .8), s = Math.sign(m.x - p[P.noseTip].x);
        c.save(); c.translate(m.x, m.y + W * .04); c.rotate(s * .08);
        c.beginPath(); c.moveTo(-W * .1, -W * .02); c.lineTo(W * .1, -W * .03); c.lineTo(W * .09, W * .025); c.lineTo(-W * .09, W * .03); c.closePath(); c.fill(); c.restore();
      }
    } },
    flag: { tex: .35, fn(c, p, W) {
      for (const ci of [P.cheekR, P.cheekL]) {
        const q = p[ci], w = W * .2, h = W * .13, s = side(p, ci);
        c.save(); c.translate(q.x + s * W * .01, q.y - W * .03); c.rotate(s * .12);
        for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#c1121f'; c.fillRect(-w / 2, -h / 2 + k * h / 7, w, h / 7 + .5); }
        c.fillStyle = '#1d3557'; c.fillRect(-w / 2, -h / 2, w * .42, h * .54);
        c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) star(c, -w / 2 + w * (.07 + i * .14), -h / 2 + h * (.13 + j * .26), W * .008, 0);
        c.restore();
      }
    } }
  };

  // shared scratch canvases
  const layer = document.createElement('canvas'), under = document.createElement('canvas');
  function draw(ctx, pts, id) {
    const d = DRAW[id];
    if (!d || !pts || pts.length < 468) return;
    // work in device pixels so the layers line up with whatever transform ctx has
    const m = ctx.getTransform();
    const p = pts.map(q => ({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f }));
    const W = dist(p[P.sideR], p[P.sideL]);
    if (W < 12) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    OVAL.forEach(i => { x0 = Math.min(x0, p[i].x); y0 = Math.min(y0, p[i].y); x1 = Math.max(x1, p[i].x); y1 = Math.max(y1, p[i].y); });
    const pad = W * .45;
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(ctx.canvas.width, Math.ceil(x1 + pad)); y1 = Math.min(ctx.canvas.height, Math.ceil(y1 + pad));
    const w = x1 - x0, h = y1 - y0;
    if (w < 4 || h < 4) return;
    layer.width = w; layer.height = h;
    const L = layer.getContext('2d');
    L.setTransform(1, 0, 0, 1, -x0, -y0);
    d.fn(L, p, W);
    L.setTransform(1, 0, 0, 1, 0, 0);
    // bring the skin's shading back through the paint: a grey copy of what's underneath, multiplied in
    if (d.tex) {
      under.width = w; under.height = h;
      const U = under.getContext('2d');
      if ('filter' in U) U.filter = 'grayscale(1) contrast(1.35) brightness(1.18)';
      U.drawImage(ctx.canvas, x0, y0, w, h, 0, 0, w, h);
      U.filter = 'none';
      U.globalCompositeOperation = 'destination-in'; U.drawImage(layer, 0, 0);
      L.globalCompositeOperation = 'multiply'; L.globalAlpha = d.tex; L.drawImage(under, 0, 0);
      L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (d.soft !== false && 'filter' in ctx) ctx.filter = `blur(${Math.max(.5, W * .0035).toFixed(2)}px)`;
    ctx.drawImage(layer, x0, y0);
    ctx.restore();
  }

  window.PBPaint = { EFFECTS, draw };
})();
