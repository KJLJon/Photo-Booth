/* Photo Booth filters — pure pixel processing, works offline, no libraries. */
(function () {
  'use strict';

  const LIST = [
    { id: 'none', name: 'Original' },
    { id: 'bw', name: 'B&W' },
    { id: 'sepia', name: 'Sepia' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'warm', name: 'Warm' },
    { id: 'cool', name: 'Cool' },
    { id: 'vivid', name: 'Vivid' },
    { id: 'fade', name: 'Faded' },
    { id: 'noir', name: 'Noir' },
    { id: 'glam', name: 'Glam' },
    { id: 'glambw', name: 'Glam B&W' },
    { id: 'dreamy', name: 'Dreamy' },
    { id: 'cartoon', name: 'Cartoon', adv: true },
    { id: 'comic', name: 'Comic', adv: true },
    { id: 'sketch', name: 'Sketch', adv: true },
    { id: 'popart', name: 'Pop Art', adv: true },
    { id: 'pixel', name: 'Pixel', adv: true },
    { id: 'y2k', name: '2000s Digicam', adv: true }
  ];
  const byId = Object.fromEntries(LIST.map(f => [f.id, f]));

  // Approximations used for the live camera preview (CSS filters are GPU-fast on video).
  const CSS = {
    none: '', bw: 'grayscale(1)', sepia: 'sepia(1)', vintage: 'sepia(.45) contrast(.88) brightness(1.06) saturate(.9)',
    warm: 'sepia(.22) saturate(1.2) brightness(1.03)', cool: 'saturate(1.05) hue-rotate(-12deg) brightness(1.03)',
    vivid: 'saturate(1.5) contrast(1.1)', fade: 'contrast(.82) brightness(1.1) saturate(.8)',
    noir: 'grayscale(1) contrast(1.55)', glam: 'brightness(1.12) contrast(1.05) saturate(.95) blur(.4px)',
    glambw: 'grayscale(1) brightness(1.16) contrast(1.15) blur(.4px)', dreamy: 'brightness(1.1) saturate(1.2) contrast(.92) blur(.6px)',
    cartoon: 'saturate(1.6) contrast(1.25)', comic: 'saturate(1.6) contrast(1.35)', sketch: 'grayscale(1) contrast(1.6) brightness(1.2)',
    popart: 'saturate(2) contrast(1.6)', pixel: '', y2k: 'saturate(1.3) contrast(1.15) brightness(1.06) sepia(.12)'
  };

  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const c8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  // ---------- building blocks ----------
  function boxBlur(src, w, h, r) {
    r = Math.max(0, Math.round(r));
    if (r < 1) return new Uint8ClampedArray(src);
    const tmp = new Float32Array(w * h * 3), out = new Uint8ClampedArray(w * h * 4), div = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sr = 0, sg = 0, sb = 0;
      for (let k = -r; k <= r; k++) {
        const i = (row + Math.min(w - 1, Math.max(0, k))) * 4;
        sr += src[i]; sg += src[i + 1]; sb += src[i + 2];
      }
      for (let x = 0; x < w; x++) {
        const o = (row + x) * 3;
        tmp[o] = sr / div; tmp[o + 1] = sg / div; tmp[o + 2] = sb / div;
        const ia = (row + Math.min(w - 1, x + r + 1)) * 4, is = (row + Math.max(0, x - r)) * 4;
        sr += src[ia] - src[is]; sg += src[ia + 1] - src[is + 1]; sb += src[ia + 2] - src[is + 2];
      }
    }
    for (let x = 0; x < w; x++) {
      let sr = 0, sg = 0, sb = 0;
      for (let k = -r; k <= r; k++) {
        const o = (Math.min(h - 1, Math.max(0, k)) * w + x) * 3;
        sr += tmp[o]; sg += tmp[o + 1]; sb += tmp[o + 2];
      }
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        out[i] = sr / div; out[i + 1] = sg / div; out[i + 2] = sb / div; out[i + 3] = 255;
        const oa = (Math.min(h - 1, y + r + 1) * w + x) * 3, os = (Math.max(0, y - r) * w + x) * 3;
        sr += tmp[oa] - tmp[os]; sg += tmp[oa + 1] - tmp[os + 1]; sb += tmp[oa + 2] - tmp[os + 2];
      }
    }
    return out;
  }
  const blur2 = (d, w, h, r) => boxBlur(boxBlur(d, w, h, r), w, h, r); // ≈ gaussian

  // smooth skin / flat areas but keep edges (cheap bilateral-style blend)
  function smoothKeepEdges(d, w, h, r, thresh, amount) {
    const b = blur2(d, w, h, r);
    for (let i = 0; i < d.length; i += 4) {
      const diff = Math.abs(d[i] - b[i]) + Math.abs(d[i + 1] - b[i + 1]) + Math.abs(d[i + 2] - b[i + 2]);
      const a = Math.max(0, 1 - diff / thresh) * amount;
      d[i] += (b[i] - d[i]) * a; d[i + 1] += (b[i + 1] - d[i + 1]) * a; d[i + 2] += (b[i + 2] - d[i + 2]) * a;
    }
  }

  function grayOf(d, w, h) {
    const g = new Float32Array(w * h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = lum(d[i], d[i + 1], d[i + 2]);
    return g;
  }
  function sobel(g, w, h) {
    const m = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
        const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
        m[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return m;
  }
  // edge strength 0..1 from a slightly blurred copy, optionally thickened
  // lo/hi are percentiles of edge strength, so the amount of "ink" adapts to each photo
  function inkMask(d, w, h, blurR, loPct, hiPct, thick) {
    const g = grayOf(blur2(d, w, h, blurR), w, h);
    const m = sobel(g, w, h);
    const sample = [];
    for (let i = 0; i < m.length; i += 7) sample.push(m[i]);
    sample.sort((a, b) => a - b);
    const lo = Math.max(20, sample[Math.floor(sample.length * loPct)]);
    const hi = Math.max(lo + 20, sample[Math.floor(sample.length * hiPct)]);
    const out = new Float32Array(w * h);
    for (let i = 0; i < m.length; i++) out[i] = Math.min(1, Math.max(0, (m[i] - lo) / (hi - lo)));
    if (thick) { // grow lines by 1px
      const t = new Float32Array(out);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        t[i] = Math.max(out[i], out[i - 1] * .8, out[i + 1] * .8, out[i - w] * .8, out[i + w] * .8);
      }
      return t;
    }
    return out;
  }

  function adjust(d, sat, con, bright) {
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const l = lum(r, g, b);
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
      d[i] = (r - 128) * con + 128 + bright; d[i + 1] = (g - 128) * con + 128 + bright; d[i + 2] = (b - 128) * con + 128 + bright;
    }
  }
  function vignette(d, w, h, strength) {
    const cx = w / 2, cy = h / 2, md = cx * cx + cy * cy;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const f = 1 - strength * Math.pow(((x - cx) ** 2 + (y - cy) ** 2) / md, 1.4);
      const i = (y * w + x) * 4;
      d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    }
  }
  function screenBlend(d, glow, amount) {
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) {
      const s = 255 - ((255 - d[i + c]) * (255 - glow[i + c])) / 255;
      d[i + c] += (s - d[i + c]) * amount;
    }
  }
  function toGray(d) {
    for (let i = 0; i < d.length; i += 4) { const l = lum(d[i], d[i + 1], d[i + 2]); d[i] = d[i + 1] = d[i + 2] = l; }
  }

  // ---------- simple (fast) filters: also used per-frame for video ----------
  function simple(d, w, h, id) {
    switch (id) {
      case 'bw': toGray(d); adjust(d, 1, 1.05, 0); break;
      case 'sepia':
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          d[i] = .393 * r + .769 * g + .189 * b; d[i + 1] = .349 * r + .686 * g + .168 * b; d[i + 2] = .272 * r + .534 * g + .131 * b;
        }
        break;
      case 'vintage':
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b;
          d[i] = r * .55 + sr * .45 + 8; d[i + 1] = g * .55 + sg * .45 + 2; d[i + 2] = b * .55 + sb * .45 - 6;
        }
        adjust(d, .9, .85, 14);
        if (w && h) vignette(d, w, h, .35);
        break;
      case 'warm':
        for (let i = 0; i < d.length; i += 4) { d[i] = d[i] * 1.08 + 8; d[i + 1] *= 1.02; d[i + 2] *= .88; }
        break;
      case 'cool':
        for (let i = 0; i < d.length; i += 4) { d[i] *= .9; d[i + 1] = d[i + 1] * 1.01 + 2; d[i + 2] = d[i + 2] * 1.08 + 12; }
        break;
      case 'vivid': adjust(d, 1.45, 1.1, 0); break;
      case 'fade': adjust(d, .78, .82, 18); break;
      case 'noir': toGray(d); adjust(d, 1, 1.55, -6); if (w && h) vignette(d, w, h, .3); break;
    }
  }

  // ---------- advanced filters ----------
  function glam(d, w, h, bw) {
    const m = Math.min(w, h);
    smoothKeepEdges(d, w, h, m / 180, 70, .85);
    screenBlend(d, blur2(d, w, h, m / 45), .22);
    if (bw) { toGray(d); adjust(d, 1, 1.15, 12); }
    else {
      adjust(d, .95, 1.04, 10);
      for (let i = 0; i < d.length; i += 4) { d[i] += 5; d[i + 2] -= 3; }
    }
    vignette(d, w, h, .18);
  }
  function dreamy(d, w, h) {
    const m = Math.min(w, h);
    screenBlend(d, blur2(d, w, h, m / 30), .45);
    adjust(d, 1.15, .95, 4);
    for (let i = 0; i < d.length; i += 4) { d[i] += 8; d[i + 2] += 6; }
  }
  function cartoon(d, w, h) {
    const m = Math.min(w, h);
    smoothKeepEdges(d, w, h, Math.max(2, m / 140), 90, 1);
    smoothKeepEdges(d, w, h, Math.max(2, m / 140), 90, 1);
    const ink = inkMask(d, w, h, Math.max(1, m / 300), .9, .975, true);
    adjust(d, 1.35, 1.08, 4);
    const step = 255 / 6;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const k = 1 - ink[j] * .9;
      d[i] = Math.round(c8(d[i]) / step) * step * k;
      d[i + 1] = Math.round(c8(d[i + 1]) / step) * step * k;
      d[i + 2] = Math.round(c8(d[i + 2]) / step) * step * k;
    }
  }
  function comic(d, w, h) {
    const m = Math.min(w, h);
    smoothKeepEdges(d, w, h, Math.max(2, m / 160), 90, 1);
    const ink = inkMask(d, w, h, Math.max(1, m / 300), .88, .97, true);
    adjust(d, 1.6, 1.15, 6);
    const step = 255 / 3;
    const src = new Uint8ClampedArray(d);
    const cell = Math.max(4, Math.round(m / 95));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // posterize
      let r = Math.round(src[i] / step) * step, g = Math.round(src[i + 1] / step) * step, b = Math.round(src[i + 2] / step) * step;
      // halftone dots on a 45° grid, bigger in darker areas
      const u = (x + y) / Math.SQRT2, v = (x - y) / Math.SQRT2;
      const cu = (Math.floor(u / cell) + .5) * cell, cv = (Math.floor(v / cell) + .5) * cell;
      const dist = Math.hypot(u - cu, v - cv);
      const dark = 1 - lum(src[i], src[i + 1], src[i + 2]) / 255;
      if (dist < cell * .6 * Math.sqrt(dark)) { r *= .68; g *= .68; b *= .72; }
      else { r = r * .9 + 26; g = g * .9 + 24; b = b * .9 + 14; } // paper
      const k = 1 - ink[y * w + x];
      d[i] = r * k; d[i + 1] = g * k; d[i + 2] = b * k;
    }
  }
  function sketch(d, w, h) {
    const m = Math.min(w, h);
    toGray(d);
    const inv = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) { inv[i] = inv[i + 1] = inv[i + 2] = 255 - d[i]; inv[i + 3] = 255; }
    const bl = blur2(inv, w, h, Math.max(2, m / 110));
    for (let i = 0; i < d.length; i += 4) {
      let v = Math.min(255, (d[i] * 256) / (256 - bl[i]));
      v = 255 - (255 - v) * 1.35;
      d[i] = v * .98; d[i + 1] = v * .95; d[i + 2] = v * .9;
    }
  }
  function popart(d, w, h) {
    const m = Math.min(w, h);
    const ink = inkMask(d, w, h, Math.max(1, m / 250), .9, .975, true);
    const b = blur2(d, w, h, Math.max(1, m / 250));
    const pal = [[29, 26, 74], [228, 0, 124], [255, 204, 0], [253, 253, 253]];
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const l = lum(b[i], b[i + 1], b[i + 2]);
      const c = pal[l < 70 ? 0 : l < 125 ? 1 : l < 185 ? 2 : 3];
      const k = 1 - ink[j] * .9;
      d[i] = c[0] * k; d[i + 1] = c[1] * k; d[i + 2] = c[2] * k;
    }
  }
  function pixel(d, w, h) {
    const bs = Math.max(6, Math.round(Math.min(w, h) / 48));
    for (let by = 0; by < h; by += bs) for (let bx = 0; bx < w; bx += bs) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = by; y < Math.min(h, by + bs); y++) for (let x = bx; x < Math.min(w, bx + bs); x++) {
        const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
      const s = 255 / 7;
      r = Math.round(r / n / s) * s; g = Math.round(g / n / s) * s; b = Math.round(b / n / s) * s;
      for (let y = by; y < Math.min(h, by + bs); y++) for (let x = bx; x < Math.min(w, bx + bs); x++) {
        const i = (y * w + x) * 4;
        const edge = (x === bx || y === by) ? .88 : 1;
        d[i] = r * edge; d[i + 1] = g * edge; d[i + 2] = b * edge;
      }
    }
  }

  // A little early-2000s point-and-shoot: punchy colour, blown highlights, on-camera flash falloff,
  // a warm cast, sensor noise and slightly soft, low-megapixel detail.
  function y2k(d, w, h) {
    const soft = boxBlur(d, w, h, Math.max(1, Math.round(Math.min(w, h) / 600)));
    const cx = w / 2, cy = h * .45, R = Math.hypot(cx, cy);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = soft[i], g = soft[i + 1], b = soft[i + 2];
      const l = lum(r, g, b);
      r = l + (r - l) * 1.35; g = l + (g - l) * 1.3; b = l + (b - l) * 1.2;               // saturated
      r = (r - 128) * 1.18 + 136; g = (g - 128) * 1.15 + 130; b = (b - 128) * 1.12 + 118; // contrast + warm
      const fall = 1.12 - .5 * Math.pow(Math.hypot(x - cx, y - cy) / R, 1.8);           // flash hot-spot
      const n = (rnd() - .5) * 18;
      d[i] = c8(r * fall + n); d[i + 1] = c8(g * fall + n * .9); d[i + 2] = c8(b * fall + n * 1.2);
    }
  }

  function run(d, w, h, id) {
    switch (id) {
      case 'glam': glam(d, w, h, false); break;
      case 'glambw': glam(d, w, h, true); break;
      case 'dreamy': dreamy(d, w, h); break;
      case 'cartoon': cartoon(d, w, h); break;
      case 'comic': comic(d, w, h); break;
      case 'sketch': sketch(d, w, h); break;
      case 'popart': popart(d, w, h); break;
      case 'pixel': pixel(d, w, h); break;
      case 'y2k': y2k(d, w, h); break;
      default: simple(d, w, h, id);
    }
  }

  // Brightness / contrast / colour sliders, each -1…1 (0 = unchanged).
  const hasAdj = (a) => !!a && (a.b || a.c || a.s);
  function adjust(d, a) {
    const bo = (a.b || 0) * 90, cf = Math.pow(2, (a.c || 0) * 1.3), sf = 1 + (a.s || 0);
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (sf !== 1) { const l = .299 * r + .587 * g + .114 * b; r = l + (r - l) * sf; g = l + (g - l) * sf; b = l + (b - l) * sf; }
      d[i] = (r - 128) * cf + 128 + bo; d[i + 1] = (g - 128) * cf + 128 + bo; d[i + 2] = (b - 128) * cf + 128 + bo;
    }
  }

  // Returns a new canvas with the filter applied (advanced filters work on a smaller copy for speed).
  function apply(src, id, maxSize, adj) {
    const heavy = byId[id] && (byId[id].adv || id === 'glam' || id === 'glambw' || id === 'dreamy');
    const max = maxSize || (heavy ? 1200 : 1800);
    const s = Math.min(1, max / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    const f = id && id !== 'none' && byId[id];
    if (!f && !hasAdj(adj)) return c;
    const img = ctx.getImageData(0, 0, w, h);
    if (f) run(img.data, w, h, id);
    if (hasAdj(adj)) adjust(img.data, adj);
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // In-place, fast enough for live video frames (simple filters only; others fall back to CSS look-alikes).
  function applyFrame(ctx, w, h, id, adj) {
    if (id && id !== 'none' && byId[id] && (byId[id].adv || id === 'glam' || id === 'glambw' || id === 'dreamy')) {
      if ('filter' in ctx) {
        const c = ctx.canvas, tmp = applyFrame._tmp || (applyFrame._tmp = document.createElement('canvas'));
        tmp.width = w; tmp.height = h;
        const t = tmp.getContext('2d'); t.drawImage(c, 0, 0);
        ctx.save(); ctx.filter = CSS[id] || 'none'; ctx.drawImage(tmp, 0, 0); ctx.restore();
      }
      id = null;
    }
    const simpleF = id && id !== 'none';
    if (!simpleF && !hasAdj(adj)) return;
    const img = ctx.getImageData(0, 0, w, h);
    if (simpleF) simple(img.data, w, h, id);
    if (hasAdj(adj)) adjust(img.data, adj);
    ctx.putImageData(img, 0, 0);
  }
  // the same sliders as a CSS filter, for the live camera preview
  const adjCss = (a) => !hasAdj(a) ? '' : `brightness(${1 + (a.b || 0) * .45}) contrast(${Math.pow(2, (a.c || 0) * 1.3)}) saturate(${1 + (a.s || 0)})`;

  window.PBFilters = { LIST, byId, css: (id) => CSS[id] || '', apply, applyFrame, hasAdj, adjCss };
})();
