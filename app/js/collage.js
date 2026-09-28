/* Collages cut with straight or angled lines. Everything works in a unit box (0…1 × 0…1); the app scales
   it to the picture. A "cut" is a line segment: it splits every piece it passes through, all the way across
   that piece (like a knife), so a full-width line cuts everything and a short one only its own piece. */
(function () {
  'use strict';

  const EPS = 1e-7;
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;

  // split a convex polygon by the infinite line through a→b; returns [left, right] (either may be empty)
  function splitPoly(poly, a, b) {
    const L = [], R = [], dx = b[0] - a[0], dy = b[1] - a[1];
    const sideOf = (p) => cross(dx, dy, p[0] - a[0], p[1] - a[1]);
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], sp = sideOf(p), sq = sideOf(q);
      if (sp >= -EPS) L.push(p); if (sp <= EPS) R.push(p);
      if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) {
        const t = sp / (sp - sq), x = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        L.push(x); R.push(x);
      }
    }
    const clean = (P) => P.filter((p, i) => { const q = P[(i + 1) % P.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; });
    return [clean(L), clean(R)];
  }
  const area = (poly) => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + cross(p[0], p[1], q[0], q[1]); }, 0)) / 2;
  const centroid = (poly) => { let x = 0, y = 0; poly.forEach(p => { x += p[0]; y += p[1]; }); return [x / poly.length, y / poly.length]; };

  // does segment a→b pass through the inside of this convex polygon?
  function crosses(poly, a, b) {
    const [l, r] = splitPoly(poly, a, b);
    if (area(l) < 1e-5 || area(r) < 1e-5) return false;
    // the segment must actually overlap the polygon (not just its infinite line)
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (inside(poly, p)) return true;
    }
    return false;
  }
  function inside(poly, p) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], c = cross(b[0] - a[0], b[1] - a[1], p[0] - a[0], p[1] - a[1]);
      if (Math.abs(c) < 1e-9) continue;
      if (!s) s = Math.sign(c); else if (Math.sign(c) !== s) return false;
    }
    return true;
  }
  function cut(pieces, a, b) {
    const out = [];
    pieces.forEach(poly => {
      if (!crosses(poly, a, b)) { out.push(poly); return; }
      const [l, r] = splitPoly(poly, a, b);
      out.push(l, r);
    });
    return out;
  }
  // reading order: top to bottom, then left to right
  function order(pieces) {
    return pieces.map(p => ({ p, c: centroid(p) })).sort((u, v) => (Math.abs(u.c[1] - v.c[1]) > .12 ? u.c[1] - v.c[1] : u.c[0] - v.c[0])).map(o => o.p);
  }
  function fromCuts(lines) {
    let pieces = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    lines.forEach(([x0, y0, x1, y1]) => { pieces = cut(pieces, [x0, y0], [x1, y1]); });
    return order(pieces.filter(p => area(p) > 1e-4));
  }

  // pieces spreading out from one point (fan / pinwheel), walking round the box's edge
  function sectors(cx, cy, angles) {
    const ray = (a) => {
      const dx = Math.cos(a), dy = Math.sin(a); let t = Infinity;
      if (dx > EPS) t = Math.min(t, (1 - cx) / dx); if (dx < -EPS) t = Math.min(t, -cx / dx);
      if (dy > EPS) t = Math.min(t, (1 - cy) / dy); if (dy < -EPS) t = Math.min(t, -cy / dy);
      return [cx + dx * t, cy + dy * t];
    };
    const corners = [[1, 0], [1, 1], [0, 1], [0, 0]].map(p => ({ p, a: Math.atan2(p[1] - cy, p[0] - cx) }));
    const norm = (a) => { while (a < angles[0] - EPS) a += Math.PI * 2; return a; };
    const out = [];
    for (let i = 0; i < angles.length; i++) {
      const a0 = angles[i], a1 = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
      const poly = [[cx, cy], ray(a0)];
      corners.map(c => ({ ...c, a: norm(c.a) })).filter(c => c.a > a0 + EPS && c.a < a1 - EPS).sort((u, v) => u.a - v.a).forEach(c => poly.push(c.p));
      poly.push(ray(a1));
      out.push(poly);
    }
    return order(out);
  }

  const T = .07;   // how much the angled lines lean
  const TEMPLATES = [
    { id: 'p-slant', label: '⟋ Slanted', cuts: (n) => Array.from({ length: n - 1 }, (_, i) => { const x = (i + 1) / n; return [x + T, 0, x - T, 1]; }) },
    { id: 'p-zigzag', label: '⩘ Zigzag', cuts: (n) => Array.from({ length: n - 1 }, (_, i) => { const x = (i + 1) / n, t = (i % 2 ? -1 : 1) * Math.min(T, .45 / n); return [x + t, 0, x - t, 1]; }) },
    { id: 'p-rows', label: '▱ Tilted rows', cuts: (n) => Array.from({ length: n - 1 }, (_, i) => { const y = (i + 1) / n; return [0, y - T * .8, 1, y + T * .8]; }) },
    { id: 'p-waves', label: '≋ Zigzag rows', cuts: (n) => Array.from({ length: n - 1 }, (_, i) => { const y = (i + 1) / n, t = (i % 2 ? -1 : 1) * Math.min(T, .45 / n); return [0, y - t, 1, y + t]; }) },
    { id: 'p-diag', label: '⧄ Tilted grid', cuts: (n, rows) => {
      const out = [], r = rows(n), R = r.length;
      for (let i = 1; i < R; i++) out.push([0, i / R - T * .6, 1, i / R + T * .6]);
      r.forEach((c, i) => { const y0 = i / R + .06, y1 = (i + 1) / R - .06; for (let j = 1; j < c; j++) { const x = j / c; out.push([x + T * (i % 2 ? -1 : 1), y0, x - T * (i % 2 ? -1 : 1), y1]); } });
      return out;
    } },
    { id: 'p-shards', label: '💎 Shards', pieces: (n) => {
      // keep cutting the biggest piece through its middle at a jaunty angle
      const r = mulberry(n * 7 + 3);
      let pcs = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
      for (let i = 0; i < n - 1; i++) {
        pcs.sort((a, b) => area(b) - area(a));
        const big = pcs[0], c = centroid(big), vert = i % 2 === 0, a = (vert ? Math.PI / 2 : 0) + (r() - .5) * .9;
        const d = [Math.cos(a) * .01, Math.sin(a) * .01];
        pcs = cut(pcs, [c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]]);
      }
      return order(pcs);
    } },
    { id: 'p-fan', label: '🪭 Fan', pieces: (n) => { const a = []; for (let i = 0; i <= n; i++) a.push(Math.PI + i * Math.PI / n); return sectors(.5, 1.001, a).filter(p => area(p) > 1e-3); } },
    { id: 'p-pinwheel', label: '🌀 Pinwheel', pieces: (n) => { const a = []; for (let i = 0; i < n; i++) a.push(-Math.PI / 2 + .35 + i * Math.PI * 2 / n); return sectors(.5, .5, a); } },
    { id: 'p-diamond', label: '🔶 Diamond', pieces: (n) => {
      if (n !== 5) return null;                              // a diamond in the middle, a photo in each corner
      const d = [[.5, .12], [.88, .5], [.5, .88], [.12, .5]];
      const corners = [[[0, 0], [.5, 0], [.5, .12], [.12, .5], [0, .5]], [[.5, 0], [1, 0], [1, .5], [.88, .5], [.5, .12]],
        [[1, .5], [1, 1], [.5, 1], [.5, .88], [.88, .5]], [[.5, 1], [0, 1], [0, .5], [.12, .5], [.5, .88]]];
      return [d].concat(corners);
    } }
  ];

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // the pieces for a template (or the user's own cuts); null if the template can't do that many photos
  function pieces(kind, n, rowsFor, userCuts) {
    if (kind === 'c-custom') return fromCuts(userCuts || []);
    const t = TEMPLATES.find(x => x.id === kind);
    if (!t) return null;
    if (n === 1) return [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    if (t.pieces) return t.pieces(n);
    return fromCuts(t.cuts(n, rowsFor));
  }
  const cutsOf = (kind, n, rowsFor) => { const t = TEMPLATES.find(x => x.id === kind); return t && t.cuts ? t.cuts(n, rowsFor) : null; };

  // shrink a convex polygon: edges inside the box move in by `inner`, edges on the box edge by `outer`
  const dedupe = (P) => P.filter((p, i) => { const q = P[(i + 1) % P.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; });
  function shrink(poly, inner, outer, onEdge) {
    poly = dedupe(poly);
    const n = poly.length, cw = poly.reduce((acc, p, i) => { const q = poly[(i + 1) % n]; return acc + cross(p[0], p[1], q[0], q[1]); }, 0) > 0;
    const lines = poly.map((a, i) => {
      const b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const d = onEdge(a, b) ? outer : inner, nx = (cw ? -dy : dy) / L, ny = (cw ? dx : -dx) / L;   // inward normal
      return { a: [a[0] + nx * d, a[1] + ny * d], d: [dx, dy] };
    });
    return lines.map((l2, i) => {
      const l1 = lines[(i + n - 1) % n], den = cross(l1.d[0], l1.d[1], l2.d[0], l2.d[1]);
      if (Math.abs(den) < 1e-12) return l2.a;
      const t = cross(l2.a[0] - l1.a[0], l2.a[1] - l1.a[1], l2.d[0], l2.d[1]) / den;
      return [l1.a[0] + l1.d[0] * t, l1.a[1] + l1.d[1] * t];
    });
  }

  window.PBCollage = { TEMPLATES, pieces, cutsOf, cut, fromCuts, shrink, area, centroid };
})();
