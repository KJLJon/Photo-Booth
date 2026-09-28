/* Face paint — drawn onto faces using MediaPipe's 478 face points, so it follows the face's shape.
   PBPaint.draw(ctx, points, id): `points` are in the canvas's pixel coordinates. */
(function () {
  'use strict';

  const EFFECTS = [
    { id: 'none', label: '🚫 None' },
    { id: 'tiger', label: '🐯 Tiger' },
    { id: 'kitty', label: '🐱 Kitty' },
    { id: 'clown', label: '🤡 Clown' },
    { id: 'glitter', label: '✨ Glitter' },
    { id: 'skull', label: '💀 Sugar skull' },
    { id: 'butterfly', label: '🦋 Butterfly' },
    { id: 'hearts', label: '❤️ Hearts' }
  ];

  // standard face-mesh point numbers
  const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
  const EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];   // the person's right eye
  const EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
  const P = { top: 10, chin: 152, noseTip: 4, noseBase: 2, bridge: 6, upperLip: 0, lowerLip: 17, mouthR: 61, mouthL: 291,
    cheekR: 205, cheekL: 425, sideR: 234, sideL: 454, eyeOutR: 33, eyeOutL: 263, eyeInR: 133, eyeInL: 362, browR: 105, browL: 334 };

  const mid = (a, b, k = .5) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const center = (pts, idx) => { let x = 0, y = 0; idx.forEach(i => { x += pts[i].x; y += pts[i].y; }); return { x: x / idx.length, y: y / idx.length }; };
  function poly(ctx, pts, idx, scale, c) {
    idx.forEach((i, k) => {
      let p = pts[i];
      if (scale && c) p = { x: c.x + (p.x - c.x) * scale, y: c.y + (p.y - c.y) * scale };
      k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
  }
  // whole face minus eyes (and optionally mouth), for face-covering paints
  function faceMask(ctx, pts, keepMouth) {
    ctx.beginPath(); poly(ctx, pts, OVAL);
    poly(ctx, pts, EYE_R, 1.25, center(pts, EYE_R)); poly(ctx, pts, EYE_L, 1.25, center(pts, EYE_L));
    if (keepMouth) poly(ctx, pts, LIPS);
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * .8);
    ctx.bezierCurveTo(x - s * 1.25, y - s * .05, x - s * .65, y - s * .95, x, y - s * .35);
    ctx.bezierCurveTo(x + s * .65, y - s * .95, x + s * 1.25, y - s * .05, x, y + s * .8); ctx.fill();
  }
  function sparkle(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }
  // a stripe from a point on the face edge, tapering towards the middle of the face
  function stripe(ctx, pts, i, toward, len, w) {
    const a = pts[i], d = { x: toward.x - a.x, y: toward.y - a.y }, L = Math.hypot(d.x, d.y) || 1;
    const ux = d.x / L, uy = d.y / L, nx = -uy, ny = ux;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * w, a.y + ny * w);
    ctx.quadraticCurveTo(a.x + ux * len * .5 + nx * w * .6, a.y + uy * len * .5 + ny * w * .6, a.x + ux * len, a.y + uy * len);
    ctx.quadraticCurveTo(a.x + ux * len * .5 - nx * w * .6, a.y + uy * len * .5 - ny * w * .6, a.x - nx * w, a.y - ny * w);
    ctx.fill();
  }

  const DRAW = {
    tiger(ctx, p, W) {
      const c = center(p, OVAL);
      ctx.save(); faceMask(ctx, p, true); ctx.clip('evenodd');
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,140,20,.75)'; ctx.fillRect(c.x - W, c.y - W * 1.5, W * 2, W * 3);
      ctx.globalCompositeOperation = 'source-over';
      // white muzzle
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      const m = mid(p[P.noseBase], p[P.upperLip]);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(m.x + s * W * .09, m.y + W * .02, W * .12, W * .09, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(20,10,0,.85)';
      [103, 67, 109, 338, 297, 332].forEach(i => stripe(ctx, p, i, c, W * .28, W * .025));
      [234, 93, 132, 58, 454, 323, 361, 288].forEach(i => stripe(ctx, p, i, c, W * .22, W * .02));
      ctx.restore();
      // nose
      const n = p[P.noseTip]; ctx.fillStyle = '#1b0f05';
      ctx.beginPath(); ctx.moveTo(n.x - W * .06, n.y - W * .03); ctx.lineTo(n.x + W * .06, n.y - W * .03); ctx.lineTo(n.x, n.y + W * .04); ctx.fill();
    },
    kitty(ctx, p, W) {
      const n = p[P.noseTip];
      ctx.fillStyle = 'rgba(255,120,170,.95)';
      ctx.beginPath(); ctx.moveTo(n.x - W * .055, n.y - W * .035); ctx.quadraticCurveTo(n.x, n.y - W * .06, n.x + W * .055, n.y - W * .035);
      ctx.quadraticCurveTo(n.x, n.y + W * .06, n.x - W * .055, n.y - W * .035); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,20,.85)'; ctx.lineWidth = W * .012; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(n.x, n.y + W * .02); ctx.lineTo(p[P.upperLip].x, p[P.upperLip].y); ctx.stroke();
      for (const ci of [P.cheekR, P.cheekL]) {
        const ch = p[ci], s = Math.sign(ch.x - n.x) || 1;             // outward, whichever way the photo is mirrored
        for (const k of [-1, 0, 1]) {
          ctx.beginPath(); ctx.moveTo(ch.x - s * W * .02, ch.y + k * W * .035);
          ctx.quadraticCurveTo(ch.x + s * W * .15, ch.y + k * W * .05 - W * .02, ch.x + s * W * .3, ch.y + k * W * .09); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,130,170,.35)'; ctx.beginPath(); ctx.ellipse(ch.x - s * W * .03, ch.y - W * .06, W * .08, W * .05, 0, 0, 7); ctx.fill();
      }
    },
    clown(ctx, p, W) {
      ctx.save(); faceMask(ctx, p, true); ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fill('evenodd'); ctx.restore();
      for (const [e, b] of [[EYE_R, P.browR], [EYE_L, P.browL]]) {
        const c = center(p, e), h = W * .09;
        ctx.fillStyle = 'rgba(40,110,255,.85)';
        ctx.beginPath(); ctx.moveTo(c.x, c.y - h * 1.6); ctx.lineTo(c.x + h * .45, c.y); ctx.lineTo(c.x, c.y + h * 1.6); ctx.lineTo(c.x - h * .45, c.y); ctx.closePath();
        ctx.save(); ctx.beginPath(); poly(ctx, p, e, 1.3, c); ctx.rect(c.x - W, c.y - W, W * 2, W * 2); ctx.clip('evenodd');
        ctx.beginPath(); ctx.moveTo(c.x, c.y - h * 1.6); ctx.lineTo(c.x + h * .45, c.y); ctx.lineTo(c.x, c.y + h * 1.6); ctx.lineTo(c.x - h * .45, c.y); ctx.fill();
        ctx.restore();
      }
      const mc = center(p, LIPS);
      ctx.fillStyle = 'rgba(230,0,40,.85)'; ctx.beginPath(); poly(ctx, p, LIPS, 1.45, mc); ctx.fill();
      const n = p[P.noseTip], r = W * .085;
      const g = ctx.createRadialGradient(n.x - r * .35, n.y - r * .35, r * .1, n.x, n.y, r);
      g.addColorStop(0, '#ff8a8a'); g.addColorStop(.5, '#e60023'); g.addColorStop(1, '#8f0016');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill();
    },
    glitter(ctx, p, W) {
      for (const ci of [P.cheekR, P.cheekL]) {
        const ch = p[ci], g = ctx.createRadialGradient(ch.x, ch.y - W * .04, 0, ch.x, ch.y - W * .04, W * .13);
        g.addColorStop(0, 'rgba(255,100,160,.5)'); g.addColorStop(1, 'rgba(255,100,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ch.x, ch.y - W * .04, W * .13, 0, 7); ctx.fill();
      }
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const oi of [P.eyeOutR, P.eyeOutL]) {
        const o = p[oi], s = Math.sign(o.x - p[P.noseTip].x) || 1;
        for (let k = 0; k < 14; k++) {
          const a = (rnd() - .5) * 2.2, r = W * (.03 + rnd() * .16);
          const x = o.x + s * Math.cos(a) * r, y = o.y + Math.sin(a) * r + W * .03;
          ctx.fillStyle = ['#fff6a8', '#ffffff', '#ffc2e6', '#b8f1ff'][k % 4];
          k % 3 ? sparkle(ctx, x, y, W * (.012 + rnd() * .02)) : (ctx.beginPath(), ctx.arc(x, y, W * .007, 0, 7), ctx.fill());
        }
      }
    },
    skull(ctx, p, W) {
      ctx.save(); faceMask(ctx, p, false); ctx.fillStyle = 'rgba(250,250,245,.8)'; ctx.fill('evenodd'); ctx.restore();
      for (const e of [EYE_R, EYE_L]) {
        const c = center(p, e), r = W * .1;
        ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.55, 0, 7); poly(ctx, p, e, 1.25, c); ctx.clip('evenodd');
        ctx.fillStyle = '#ff5fa2';
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * r * 1.2, c.y + Math.sin(a) * r * 1.2, r * .38, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(20,10,30,.92)'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.05, 0, 7); ctx.fill();
        ctx.restore();
      }
      const n = p[P.noseTip]; ctx.fillStyle = 'rgba(20,10,30,.92)';
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(Math.PI); heart(ctx, 0, 0, W * .05); ctx.restore();
      const a = p[P.mouthR], b = p[P.mouthL];
      ctx.strokeStyle = 'rgba(20,10,30,.9)'; ctx.lineWidth = W * .008;
      ctx.beginPath(); ctx.moveTo(a.x - W * .05, a.y); ctx.lineTo(b.x + W * .05, b.y); ctx.stroke();
      for (let k = 0; k <= 8; k++) { const q = mid({ x: a.x - W * .05, y: a.y }, { x: b.x + W * .05, y: b.y }, k / 8); ctx.beginPath(); ctx.moveTo(q.x, q.y - W * .03); ctx.lineTo(q.x, q.y + W * .03); ctx.stroke(); }
      const f = mid(p[P.top], p[P.bridge], .35); ctx.fillStyle = '#3bceac';
      for (let k = 0; k < 5; k++) { const a2 = k / 5 * 6.28; ctx.beginPath(); ctx.arc(f.x + Math.cos(a2) * W * .03, f.y + Math.sin(a2) * W * .03, W * .022, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(f.x, f.y, W * .018, 0, 7); ctx.fill();
    },
    butterfly(ctx, p, W) {
      const br = p[P.bridge];
      for (const e of [EYE_R, EYE_L]) {
        const c = center(p, e), s = Math.sign(c.x - br.x) || 1;
        const up = ctx.createLinearGradient(br.x, br.y, c.x + s * W * .3, c.y);
        up.addColorStop(0, 'rgba(255,95,162,.8)'); up.addColorStop(1, 'rgba(138,77,255,.8)');
        ctx.save(); ctx.beginPath(); ctx.rect(c.x - W, c.y - W, W * 2, W * 2); poly(ctx, p, e, 1.3, c); ctx.clip('evenodd');
        ctx.fillStyle = up;
        ctx.beginPath(); ctx.moveTo(br.x, br.y);
        ctx.bezierCurveTo(br.x + s * W * .1, c.y - W * .35, c.x + s * W * .35, c.y - W * .3, c.x + s * W * .22, c.y + W * .02);
        ctx.bezierCurveTo(c.x + s * W * .1, c.y + W * .06, br.x + s * W * .05, br.y + W * .04, br.x, br.y); ctx.fill();
        ctx.fillStyle = 'rgba(59,206,172,.75)';
        ctx.beginPath(); ctx.moveTo(br.x, br.y + W * .03);
        ctx.bezierCurveTo(c.x + s * W * .02, c.y + W * .12, c.x + s * W * .25, c.y + W * .2, c.x + s * W * .12, c.y + W * .24);
        ctx.bezierCurveTo(c.x - s * W * .02, c.y + W * .24, br.x + s * W * .03, br.y + W * .12, br.x, br.y + W * .03); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.arc(c.x + s * W * (.1 + k * .06), c.y - W * (.14 - k * .04), W * .012, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(40,20,60,.85)'; ctx.lineWidth = W * .015; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(br.x, br.y - W * .06); ctx.lineTo(p[P.noseTip].x, p[P.noseTip].y - W * .03); ctx.stroke();
    },
    hearts(ctx, p, W) {
      ctx.fillStyle = 'rgba(235,20,70,.85)';
      heart(ctx, p[P.cheekR].x, p[P.cheekR].y - W * .03, W * .06);
      heart(ctx, p[P.cheekL].x, p[P.cheekL].y - W * .03, W * .06);
      ctx.fillStyle = 'rgba(255,120,170,.85)';
      for (const e of [EYE_R, EYE_L]) { const c = center(p, e); heart(ctx, c.x + W * .02, c.y + W * .11, W * .022); heart(ctx, c.x - W * .03, c.y + W * .13, W * .016); }
    }
  };

  function draw(ctx, pts, id) {
    const fn = DRAW[id];
    if (!fn || !pts || pts.length < 468) return;
    const W = dist(pts[P.sideR], pts[P.sideL]);                 // face width in pixels
    if (W < 8) return;
    ctx.save(); fn(ctx, pts, W); ctx.restore();
  }

  window.PBPaint = { EFFECTS, draw };
})();
