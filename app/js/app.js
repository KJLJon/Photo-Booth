(() => {
  'use strict';

  // ================= helpers =================
  const $ = (id) => document.getElementById(id);
  const ROUNDED = '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI",system-ui,-apple-system,sans-serif';
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // photo shapes (path only; caller calls beginPath)
  function shapePath(ctx, shape, x, y, w, h, rr) {
    const cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);
    const polyPts = (pts) => { pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
    if (shape === 'circle') {
      ctx.moveTo(cx + m / 2, cy); ctx.arc(cx, cy, m / 2, 0, Math.PI * 2);
    } else if (shape === 'arch') {
      const R = w / 2;
      ctx.moveTo(x, y + h); ctx.lineTo(x, y + Math.min(R, h)); ctx.arc(cx, y + Math.min(R, h), R, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
    } else if (shape === 'hexagon') {
      polyPts([[x + w * .25, y], [x + w * .75, y], [x + w, cy], [x + w * .75, y + h], [x + w * .25, y + h], [x, cy]]);
    } else if (shape === 'diamond') {
      polyPts([[cx, y], [x + w, cy], [cx, y + h], [x, cy]]);
    } else if (shape === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? .48 : 1; pts.push([cx + Math.cos(a) * w / 2 * k, cy + Math.sin(a) * h / 2 * k * 1.05 + h * .04]); }
      polyPts(pts);
    } else if (shape === 'scallop' || shape === 'stamp') {
      // bumpy edge all the way round (scallops point out, a postage stamp's bites point in)
      const R0 = m * (shape === 'stamp' ? .035 : .05), inset = shape === 'stamp' ? 0 : R0;
      const X0 = x + inset, Y0 = y + inset, X1 = x + w - inset, Y1 = y + h - inset;
      const edge = (ax, ay, bx, by) => {
        const L = Math.hypot(bx - ax, by - ay), k = Math.max(3, Math.round(L / (R0 * 2.2))), r = L / k / 2, ang = Math.atan2(by - ay, bx - ax);
        for (let i = 0; i < k; i++) {
          const t = (i + .5) / k;
          ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, r, ang + Math.PI, ang, shape === 'stamp');
        }
      };
      ctx.moveTo(X0, Y0); edge(X0, Y0, X1, Y0); edge(X1, Y0, X1, Y1); edge(X1, Y1, X0, Y1); edge(X0, Y1, X0, Y0); ctx.closePath();
    } else if (shape === 'oval') {
      ctx.moveTo(x + w, y + h / 2);
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'heart') {
      // x = 16 sin³t, y = -(13cos t - 5cos 2t - 2cos 3t - cos 4t): spans 32 wide × 29 tall
      const hw = Math.min(w, h * 32 / 29), hh = hw * 29 / 32;
      const cx = x + w / 2, cy = y + h / 2;
      for (let k = 0; k <= 120; k++) {
        const t = (k / 120) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const X = cx + (hx / 16) * (hw / 2), Y = cy + ((hy - 2.5) / 14.5) * (hh / 2);
        k === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.closePath();
    } else {
      const r = Math.max(0, Math.min(rr, w / 2, h / 2));
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }
  function vGrad(ctx, W, H, stops, diag) {
    const g = diag ? ctx.createLinearGradient(0, 0, W, H) : ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach((c, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ================= shapes =================
  function star(ctx, x, y, R, rot) {
    const r = R * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = rot + (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  }
  function sparkle(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  function heartPath(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.bezierCurveTo(-s * 1.25, -s * 0.05, -s * 0.65, -s * 0.95, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.65, -s * 0.95, s * 1.25, -s * 0.05, 0, s * 0.8);
    ctx.closePath();
    ctx.restore();
  }
  function heart(ctx, x, y, s, rot) { heartPath(ctx, x, y, s, rot); ctx.fill(); }
  function snowflake(ctx, x, y, s, lw) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      ctx.moveTo(0, 0); ctx.lineTo(ca * s, sa * s);
      const bx = ca * s * 0.55, by = sa * s * 0.55;
      for (const d of [-1, 1]) {
        const b = a + d * Math.PI / 4;
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(b) * s * 0.3, by + Math.sin(b) * s * 0.3);
      }
    }
    ctx.stroke(); ctx.restore();
  }
  function balloon(ctx, x, y, rw, color) {
    const rh = rw * 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1, rw * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y + rh * 1.1);
    ctx.bezierCurveTo(x - rw * .4, y + rh * 1.7, x + rw * .4, y + rh * 2.2, x, y + rh * 2.9);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + rh * .95); ctx.lineTo(x - rw * .13, y + rh * 1.13); ctx.lineTo(x + rw * .13, y + rh * 1.13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.beginPath(); ctx.ellipse(x - rw * .38, y - rh * .35, rw * .18, rh * .3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  function bat(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(0, -s * 0.15);
      ctx.quadraticCurveTo(d * s * 0.5, -s * 0.6, d * s * 1.2, -s * 0.2);
      ctx.quadraticCurveTo(d * s * 0.95, -s * 0.05, d * s * 0.9, s * 0.25);
      ctx.quadraticCurveTo(d * s * 0.7, s * 0.05, d * s * 0.5, s * 0.3);
      ctx.quadraticCurveTo(d * s * 0.35, s * 0.1, 0, s * 0.3);
      ctx.closePath();
    }
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.18, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * .14, -s * .2); ctx.lineTo(-s * .1, -s * .42); ctx.lineTo(0, -s * .25);
    ctx.lineTo(s * .1, -s * .42); ctx.lineTo(s * .14, -s * .2); ctx.fill();
    ctx.restore();
  }
  function gradCap(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.moveTo(-s * .5, s * .05); ctx.lineTo(s * .5, s * .05); ctx.lineTo(s * .45, s * .5);
    ctx.quadraticCurveTo(0, s * .62, -s * .45, s * .5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath(); ctx.moveTo(0, -s * .45); ctx.lineTo(s, 0); ctx.lineTo(0, s * .35); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -s * .05); ctx.lineTo(s * .7, s * .12); ctx.lineTo(s * .7, s * .6); ctx.stroke();
    ctx.fillStyle = '#f5c542'; ctx.fillRect(s * .63, s * .55, s * .14, s * .22);
    ctx.restore();
  }
  function cloud(ctx, x, y, s) {
    for (const [dx, dy, rr] of [[0, 0, .5], [.5, -.25, .6], [1.1, 0, .45], [.55, .15, .55]]) {
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  function firework(ctx, x, y, R, color, lw) {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = lw * 4;
    const n = 18;
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n, ca = Math.cos(a), sa = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(x + ca * R * .25, y + sa * R * .25); ctx.lineTo(x + ca * R * .85, y + sa * R * .85); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ca * R, y + sa * R, lw * .9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function flower(ctx, x, y, s, color, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    for (let k = 0; k < 5; k++) {
      ctx.rotate(Math.PI * 2 / 5);
      ctx.beginPath(); ctx.ellipse(0, -s * .55, s * .33, s * .55, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#f6bd60'; ctx.beginPath(); ctx.arc(0, 0, s * .3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function leaf(ctx, x, y, s, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .75, -s * .2, 0, s); ctx.quadraticCurveTo(-s * .75, -s * .2, 0, -s); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = s * .08;
    ctx.beginPath(); ctx.moveTo(0, -s * .8); ctx.lineTo(0, s * 1.25); ctx.stroke();
    ctx.restore();
  }
  function confettiPieces(ctx, W, H, r, count, colors, scale) {
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = r() * H;
      ctx.fillStyle = pick(r, colors);
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * Math.PI);
      const s = (6 + r() * 12) * scale;
      const kind = r();
      if (kind < 0.45) ctx.fillRect(-s, -s * 0.35, s * 2, s * 0.7);
      else if (kind < 0.8) { ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill(); }
      else star(ctx, 0, 0, s, 0);
      ctx.restore();
    }
  }
  function diagStripes(ctx, W, H, colors, sw) {
    const diag = Math.hypot(W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 5);
    const n = Math.ceil(diag / sw) + 2;
    for (let i = -n; i <= n; i++) {
      ctx.fillStyle = colors[((i % colors.length) + colors.length) % colors.length];
      ctx.fillRect(i * sw, -diag, sw + 1, diag * 2);
    }
    ctx.restore();
  }

  // decorations shared by several themes and by "Custom colors"
  const DECO_COLORS = {
    bright: ['#ffd23f', '#3bceac', '#ffffff', '#4cc9f0', '#ff9f1c', '#f15bb5', '#fee440'],
    pastel: ['#ffd6e8', '#cdeffd', '#fff3a3', '#c8f7dc', '#e0c3fc', '#ffffff'],
    white: ['#ffffff', 'rgba(255,255,255,.75)', 'rgba(255,255,255,.5)'],
    gold: ['#f5d06f', '#d4a017', '#fff3c4', '#e8b923'],
    dark: ['#1f1f1f', '#3a3a3a', '#555555']
  };
  // 2–3 colour fades for "Your Colors"
  const FADE_DIRS = [{ id: 'down', label: '⬇️ Down' }, { id: 'diag', label: '↘️ Corner' }, { id: 'diag2', label: '↙️ Other corner' },
    { id: 'across', label: '➡️ Across' }, { id: 'radial', label: '🔘 From the middle' }];
  function fade(ctx, W, H, cols, dir) {
    let g;
    if (dir === 'radial') g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    else if (dir === 'across') g = ctx.createLinearGradient(0, 0, W, 0);
    else if (dir === 'diag2') g = ctx.createLinearGradient(W, 0, 0, H);
    else if (dir === 'diag') g = ctx.createLinearGradient(0, 0, W, H);
    else g = ctx.createLinearGradient(0, 0, 0, H);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const PALETTES = [
    { name: 'Sunset', c: ['#ff9a8b', '#ff6a88', '#ffc796'] }, { name: 'Ocean', c: ['#2193b0', '#6dd5ed'] },
    { name: 'Candy', c: ['#ff9a9e', '#fad0c4', '#fbc2eb'] }, { name: 'Mint', c: ['#a8edea', '#fed6e3'] },
    { name: 'Lavender', c: ['#8ec5fc', '#e0c3fc'] }, { name: 'Peach', c: ['#ffecd2', '#fcb69f'] },
    { name: 'Galaxy', c: ['#0f0c29', '#302b63', '#7a3d9c'] }, { name: 'Forest', c: ['#134e5e', '#71b280'] },
    { name: 'Gold', c: ['#f7971e', '#ffd200'] }, { name: 'Berry', c: ['#8e2de2', '#4a00e0'] },
    { name: 'Fire', c: ['#f12711', '#f5af19'] }, { name: 'Sky', c: ['#89f7fe', '#66a6ff'] },
    { name: 'Blush', c: ['#ffdde1', '#ee9ca7'] }, { name: 'Night', c: ['#141e30', '#243b55'] },
    { name: 'Rose gold', c: ['#b76e79', '#eacda3', '#e6b8a2'] }, { name: 'Pastel rainbow', c: ['#ff9a9e', '#fecfef', '#a1c4fd'] },
    { name: 'Lemonade', c: ['#fff6b7', '#f6416c'] }, { name: 'Aqua', c: ['#13547a', '#80d0c7'] },
    { name: 'Grape', c: ['#654ea3', '#eaafc8'] }, { name: 'Mono', c: ['#e0e0e0', '#8e8e8e'] }
  ];
  const DECOS = [
    { id: 'none', label: 'Nothing' }, { id: 'confetti', label: '🎊 Confetti' }, { id: 'dots', label: '• Dots' }, { id: 'polka', label: '⚪ Polka' },
    { id: 'stars', label: '⭐ Stars' }, { id: 'sparkles', label: '✨ Sparkles' }, { id: 'hearts', label: '💕 Hearts' }, { id: 'bokeh', label: '🔆 Bokeh' },
    { id: 'bubbles', label: '🫧 Bubbles' }, { id: 'balloons', label: '🎈 Balloons' }, { id: 'snow', label: '❄️ Snow' }, { id: 'flowers', label: '🌸 Flowers' },
    { id: 'stripes', label: '▧ Stripes' }, { id: 'rays', label: '☀️ Rays' }, { id: 'zigzag', label: '〰 Zigzag' }, { id: 'waves', label: '🌊 Waves' }
  ];
  function decorate(ctx, W, H, r, kind, colors, density) {
    const s = W / 900, dn = density || 1;
    const N = (k) => Math.max(1, Math.round(k * dn));
    const col = () => pick(r, colors);
    switch (kind) {
      case 'confetti': confettiPieces(ctx, W, H, r, N(W * H / 5500), colors, s); break;
      case 'dots':
        for (let i = 0; i < N(W * H / 9000); i++) {
          ctx.fillStyle = col(); ctx.beginPath(); ctx.arc(r() * W, r() * H, (6 + r() * 16) * s, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'stars':
        for (let i = 0; i < N(W * H / 16000); i++) { ctx.fillStyle = col(); star(ctx, r() * W, r() * H, (10 + r() * 22) * s, r() * Math.PI); }
        break;
      case 'hearts':
        for (let i = 0; i < N(W * H / 14000); i++) { ctx.fillStyle = col(); heart(ctx, r() * W, r() * H, (12 + r() * 26) * s, (r() - .5) * .8); }
        break;
      case 'balloons':
        for (let i = 0; i < N(H / 110); i++) {
          const edge = r() < 0.5 ? r() * W * 0.14 : W - r() * W * 0.14;
          balloon(ctx, r() < 0.75 ? edge : r() * W, r() * H, (34 + r() * 36) * s, col());
        }
        break;
      case 'snow':
        for (let i = 0; i < N(W * H / 4000); i++) {
          ctx.fillStyle = col(); ctx.beginPath(); ctx.arc(r() * W, r() * H, (1.5 + r() * 3) * s, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < N(W * H / 20000); i++) { ctx.strokeStyle = col(); snowflake(ctx, r() * W, r() * H, (12 + r() * 24) * s, 3 * s); }
        break;
      case 'sparkles':
        for (let i = 0; i < N(W * H / 12000); i++) { ctx.fillStyle = col(); sparkle(ctx, r() * W, r() * H, (6 + r() * 16) * s); }
        break;
      case 'polka': {
        const step = W / Math.max(3, Math.round(7 * dn)), rad = step * .22; let row = 0;
        for (let y = step / 2; y < H + step; y += step * .866, row++) for (let x = (row % 2 ? step / 2 : 0); x < W + step; x += step) {
          ctx.fillStyle = col(); ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case 'bokeh':
        for (let i = 0; i < N(W * H / 30000); i++) {
          const x = r() * W, y = r() * H, R = (20 + r() * 70) * s, g = ctx.createRadialGradient(x, y, 0, x, y, R), c = col();
          g.addColorStop(0, c); g.addColorStop(.7, c); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = .18 + r() * .3; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      case 'bubbles':
        for (let i = 0; i < N(W * H / 22000); i++) {
          const x = r() * W, y = r() * H, R = (10 + r() * 40) * s;
          ctx.strokeStyle = col(); ctx.globalAlpha = .7; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .6; ctx.beginPath(); ctx.ellipse(x - R * .35, y - R * .4, R * .2, R * .12, -.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      case 'stripes': {
        const sw = W / Math.max(4, Math.round(10 * dn));
        ctx.save(); ctx.globalAlpha = .22; ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 4);
        const L = Math.hypot(W, H);
        for (let x = -L, i = 0; x < L; x += sw * 2, i++) { ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x, -L, sw, L * 2); }
        ctx.restore(); break;
      }
      case 'rays': {
        const n = Math.max(8, Math.round(24 * dn)), cx = W / 2, cy = H * .35, R = Math.hypot(W, H);
        ctx.globalAlpha = .18;
        for (let k = 0; k < n; k++) { const a0 = k * Math.PI * 2 / n, a1 = a0 + Math.PI / n; ctx.fillStyle = colors[k % colors.length];
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.fill(); }
        ctx.globalAlpha = 1; break;
      }
      case 'zigzag': case 'waves': {
        const gap = H / Math.max(4, Math.round(12 * dn)), amp = gap * .28, wl = W / 10;
        ctx.lineWidth = 7 * s; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = .45;
        for (let y = gap / 2, i = 0; y < H + gap; y += gap, i++) {
          ctx.strokeStyle = colors[i % colors.length]; ctx.beginPath();
          for (let x = -wl; x <= W + wl; x += kind === 'zigzag' ? wl / 2 : wl / 8) {
            const yy = kind === 'zigzag' ? y + ((Math.round(x / (wl / 2)) % 2) ? amp : -amp) : y + Math.sin(x / wl * Math.PI * 2) * amp;
            x === -wl ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1; break;
      }
      case 'flowers':
        for (let i = 0; i < N(W * H / 20000); i++) flower(ctx, r() * W, r() * H, (14 + r() * 20) * s, col(), r() * 6);
        break;
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255);
    const rr = f(n >> 16), gg = f((n >> 8) & 255), bb = f(n & 255);
    return '#' + ((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1);
  }
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  // ================= backgrounds =================
  // accent = default outline colour, text = default text colour (white if omitted)
  const THEMES = {
    confetti: { name: 'Confetti', accent: '#540d6e',
      draw(ctx, W, H, r) { vGrad(ctx, W, H, ['#ff5fa2', '#c04dff', '#6a3dff'], true); decorate(ctx, W, H, r, 'confetti', DECO_COLORS.bright); } },
    balloons: { name: 'Balloons', accent: '#d61f69',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#3ab7ea', '#bff3ff']);
        confettiPieces(ctx, W, H, r, Math.round(W * H / 16000), ['#ffffff', '#fff3a3'], W / 900 * 0.7);
        decorate(ctx, W, H, r, 'balloons', ['#f72585', '#ffd23f', '#7209b7', '#06d6a0', '#ff6b35', '#4361ee', '#ff85c0']);
      } },
    rainbow: { name: 'Rainbow', accent: '#3a0ca3',
      draw(ctx, W, H, r) {
        diagStripes(ctx, W, H, ['#ff8fab', '#ffb86b', '#ffe66d', '#8ce99a', '#74c0fc', '#b197fc'], W / 7);
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < Math.round(W * H / 40000); i++) star(ctx, r() * W, r() * H, (10 + r() * 18) * W / 900, r() * Math.PI);
      } },
    neon: { name: 'Neon Party', accent: '#ff3cac',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#231a5c', '#0b0a24']);
        const s = W / 900, neon = ['#ff3cac', '#2bd2ff', '#fee440', '#00f5d4', '#b388ff', '#ff9f1c'];
        ctx.lineCap = 'round';
        for (let k = 0; k < 9; k++) {
          const c = pick(r, neon);
          ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 18 * s; ctx.lineWidth = (10 + r() * 8) * s;
          const x0 = r() * W, amp = (30 + r() * 60) * s, freq = 4 + r() * 8, ph = r() * 6;
          ctx.beginPath();
          for (let t = 0; t <= 1.001; t += 0.01) {
            const x = x0 + Math.sin(t * freq + ph) * amp, y = -40 + t * (H + 80);
            t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (let i = 0; i < Math.round(W * H / 14000); i++) {
          const c = pick(r, neon.concat(['#ffffff', '#ffffff']));
          ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10 * s;
          sparkle(ctx, r() * W, r() * H, (5 + r() * 14) * s);
        }
        ctx.shadowBlur = 0;
      } },
    sprinkles: { name: 'Sprinkles', accent: '#e8308a',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#fff0f6', '#ffc2d9'], true);
        const s = W / 900, colors = ['#ff4d6d', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0', '#fb5607', '#ffffff'];
        ctx.lineCap = 'round'; ctx.lineWidth = 7 * s;
        for (let i = 0; i < Math.round(W * H / 3000); i++) {
          ctx.strokeStyle = pick(r, colors);
          const x = r() * W, y = r() * H, a = r() * Math.PI, l = (8 + r() * 8) * s;
          ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
        }
      } },
    polka: { name: 'Polka Dots', accent: '#7b2cbf',
      draw(ctx, W, H, r) {
        ctx.fillStyle = '#ffe066'; ctx.fillRect(0, 0, W, H);
        const colors = ['#ff5fa2', '#4cc9f0', '#06d6a0', '#8338ec', '#ff6b35', '#ffffff'];
        const step = W / 7, rad = step * 0.28;
        let row = 0;
        for (let y = step / 2; y < H + step; y += step * 0.866, row++) {
          for (let x = (row % 2 ? step / 2 : 0); x < W + step; x += step) {
            ctx.fillStyle = pick(r, colors);
            ctx.beginPath(); ctx.arc(x, y, rad * (0.85 + r() * 0.3), 0, Math.PI * 2); ctx.fill();
          }
        }
      } },
    bunting: { name: 'Banners', accent: '#ef476f',
      draw(ctx, W, H, r) {
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, W, H);
        const s = W / 900, colors = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#ff6b35'];
        confettiPieces(ctx, W, H, r, Math.round(W * H / 9000), colors, s);
        const rows = Math.max(3, Math.round(H / 520));
        for (let k = 0; k < rows; k++) {
          const y0 = (k + 0.15) * H / rows, sag = 40 * s, fw = 70 * s, fh = 90 * s;
          const yAt = (x) => y0 + Math.sin((x / W) * Math.PI) * sag;
          ctx.strokeStyle = '#6c584c'; ctx.lineWidth = 3 * s;
          ctx.beginPath();
          for (let x = 0; x <= W; x += 10) x === 0 ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x));
          ctx.stroke();
          let i = Math.floor(r() * colors.length);
          for (let x = fw * 0.2; x < W; x += fw * 1.15, i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath(); ctx.moveTo(x, yAt(x)); ctx.lineTo(x + fw, yAt(x + fw)); ctx.lineTo(x + fw / 2, yAt(x + fw / 2) + fh);
            ctx.closePath(); ctx.fill();
          }
        }
      } },
    gold: { name: 'Gold Glam', accent: '#8a6400',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#1c1c1c', '#050505'], true);
        const s = W / 900, golds = DECO_COLORS.gold;
        for (let i = 0; i < Math.round(W * H / 2600); i++) {
          ctx.fillStyle = pick(r, golds); ctx.globalAlpha = 0.5 + r() * 0.5;
          ctx.beginPath(); ctx.arc(r() * W, r() * H, (2 + r() * 7) * s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < Math.round(W * H / 30000); i++) {
          const c = pick(r, golds); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12 * s;
          sparkle(ctx, r() * W, r() * H, (8 + r() * 18) * s);
        }
        ctx.shadowBlur = 0;
      } },
    blush: { name: 'Blush & Gold', accent: '#b5838d',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#fff5f0', '#f6d5d8', '#e8b4bc'], true);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 6000); i++) {
          ctx.fillStyle = pick(r, ['#d4af37', '#e6c874', '#ffffff']); ctx.globalAlpha = 0.5 + r() * 0.5;
          ctx.beginPath(); ctx.arc(r() * W, r() * H, (2 + r() * 5) * s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3 * s;
        for (let i = 0; i < Math.round(H / 200); i++) { heartPath(ctx, r() * W, r() * H, (18 + r() * 26) * s, (r() - .5) * .6); ctx.stroke(); }
        ctx.fillStyle = '#d4af37';
        for (let i = 0; i < Math.round(W * H / 50000); i++) sparkle(ctx, r() * W, r() * H, (8 + r() * 12) * s);
      } },
    hearts: { name: 'Hearts', accent: '#800f2f',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#ff758f', '#c9184a'], true);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 9000); i++) {
          ctx.fillStyle = pick(r, ['#ffffff', '#ffb3c1', '#ff4d6d', '#ffccd5', '#800f2f']); ctx.globalAlpha = 0.6 + r() * 0.4;
          heart(ctx, r() * W, r() * H, (10 + r() * 30) * s, (r() - .5) * .8);
        }
        ctx.globalAlpha = 1;
      } },
    grad: { name: 'Graduation', accent: '#b8860b',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#0b1d51', '#1d3a8a']);
        const s = W / 900;
        confettiPieces(ctx, W, H, r, Math.round(W * H / 9000), ['#f5c542', '#ffffff', '#d4a017'], s * 0.8);
        for (let i = 0; i < Math.round(H / 260); i++) {
          const x = r() < 0.5 ? r() * W * 0.12 : W - r() * W * 0.12;
          gradCap(ctx, x, r() * H, (40 + r() * 30) * s, (r() - .5) * .8);
        }
        ctx.fillStyle = '#f5c542';
        for (let i = 0; i < Math.round(W * H / 40000); i++) star(ctx, r() * W, r() * H, (10 + r() * 14) * s, r());
      } },
    baby: { name: 'Baby Pastel', accent: '#6b9bd1',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#cdeffd', '#fde2f1']);
        const s = W / 900;
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < Math.round(H / 180); i++) cloud(ctx, r() * W, r() * H, (40 + r() * 40) * s);
        decorate(ctx, W, H, r, 'stars', ['#fff3a3', '#ffd6e8', '#c8f7dc']);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < Math.round(W * H / 12000); i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, (2 + r() * 4) * s, 0, Math.PI * 2); ctx.fill(); }
      } },
    holiday: { name: 'Holiday', accent: '#9d0208',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#146c43', '#08351f']);
        const s = W / 900;
        decorate(ctx, W, H, r, 'snow', DECO_COLORS.white);
        for (let i = 0; i < Math.round(W * H / 15000); i++) {
          const x = r() * W, y = r() * H, rr = (6 + r() * 10) * s;
          ctx.fillStyle = pick(r, ['#d62828', '#f4c430', '#d62828']);
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.beginPath(); ctx.arc(x - rr * .35, y - rr * .35, rr * .3, 0, Math.PI * 2); ctx.fill();
        }
      } },
    winter: { name: 'Winter Snow', accent: '#1d4e89',
      draw(ctx, W, H, r) { vGrad(ctx, W, H, ['#8ecae6', '#e8f6ff']); decorate(ctx, W, H, r, 'snow', ['#ffffff', '#ffffff', '#d6efff']); } },
    spooky: { name: 'Spooky', accent: '#ff7518',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#3c096c', '#10002b']);
        const s = W / 900;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < Math.round(W * H / 5000); i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, (1 + r() * 2) * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#ffe8a3'; ctx.shadowColor = '#ffe8a3'; ctx.shadowBlur = 40 * s;
        ctx.beginPath(); ctx.arc(W * 0.82, H * 0.05, W * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff7518';
        for (let i = 0; i < Math.round(W * H / 20000); i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, (3 + r() * 6) * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#050008';
        for (let i = 0; i < Math.round(H / 200); i++) bat(ctx, r() * W, r() * H, (22 + r() * 26) * s);
      } },
    fireworks: { name: 'Fireworks', accent: '#b8860b',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#050a24', '#1b1446']);
        const s = W / 900;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < Math.round(W * H / 6000); i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, (0.8 + r() * 1.8) * s, 0, Math.PI * 2); ctx.fill(); }
        for (let i = 0; i < Math.max(5, Math.round(H / 260)); i++) {
          firework(ctx, r() * W, r() * H, (60 + r() * 90) * s, pick(r, ['#f5d06f', '#e5e5e5', '#ff5fa2', '#4cc9f0', '#fee440']), 3.5 * s);
        }
      } },
    usa: { name: 'Stars & Stripes', accent: '#003049',
      draw(ctx, W, H, r) {
        diagStripes(ctx, W, H, ['#c1121f', '#ffffff'], W / 9);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 22000); i++) {
          ctx.fillStyle = pick(r, ['#003049', '#003049', '#ffffff']);
          star(ctx, r() * W, r() * H, (14 + r() * 20) * s, r());
        }
      } },
    autumn: { name: 'Autumn', accent: '#9c3d00',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#fff4e0', '#ffd6a5']);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 9000); i++) {
          leaf(ctx, r() * W, r() * H, (14 + r() * 22) * s, r() * Math.PI * 2, pick(r, ['#d9480f', '#f08c00', '#a61e4d', '#8f5b34', '#e8a33d']));
        }
      } },
    garden: { name: 'Garden', accent: '#4f6d4a',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#e3ecd9', '#b7cfa4']);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 14000); i++) leaf(ctx, r() * W, r() * H, (10 + r() * 14) * s, r() * 6, pick(r, ['#6a994e', '#90a955', '#4f772d']));
        for (let i = 0; i < Math.round(W * H / 20000); i++) flower(ctx, r() * W, r() * H, (16 + r() * 20) * s, pick(r, ['#ffffff', '#ffc8dd', '#ffafcc', '#fff3b0', '#cdb4db']), r() * 6);
      } },
    sunset: { name: 'Sunset', accent: '#6a3093',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#ffb347', '#ff5f6d', '#6a3093']);
        const s = W / 900, cx = W / 2, cy = H * 0.1;
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 16 * s;
        for (let k = 0; k < 24; k++) {
          const a = k * Math.PI / 12;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * W * .2, cy + Math.sin(a) * W * .2); ctx.lineTo(cx + Math.cos(a) * H, cy + Math.sin(a) * H); ctx.stroke();
        }
        ctx.fillStyle = '#ffe29a'; ctx.beginPath(); ctx.arc(cx, cy, W * 0.16, 0, Math.PI * 2); ctx.fill();
        decorate(ctx, W, H, r, 'sparkles', ['#ffffff', '#ffe29a']);
      } },
    space: { name: 'Outer Space', accent: '#5a189a',
      draw(ctx, W, H, r) {
        vGrad(ctx, W, H, ['#10002b', '#3c096c', '#240046'], true);
        const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 1500); i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
          ctx.beginPath(); ctx.arc(r() * W, r() * H, (0.8 + r() * 2.2) * s, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < Math.round(H / 350); i++) {
          const x = r() < 0.5 ? r() * W * 0.12 : W - r() * W * 0.12, y = r() * H, R = (30 + r() * 45) * s;
          ctx.fillStyle = pick(r, ['#ff9e00', '#4cc9f0', '#f72585', '#80ffdb', '#ffd60a']);
          ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(x + R * .3, y + R * .25, R * .8, 0, Math.PI * 2); ctx.fill();
          if (r() < 0.6) {
            ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 5 * s;
            ctx.beginPath(); ctx.ellipse(x, y, R * 1.7, R * .45, -0.35, 0, Math.PI * 2); ctx.stroke();
          }
        }
      } },
    minwhite: { name: 'Simple White', accent: '#ffffff', text: '#1f1f1f',
      draw(ctx, W, H) { ctx.fillStyle = '#fbfbfb'; ctx.fillRect(0, 0, W, H); } },
    action: { name: 'Comic Action', accent: '#1b1b1b',
      draw(ctx, W, H, r) {
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * 0.42, R = Math.hypot(W, H);
        for (let k = 0; k < 36; k++) {
          const a0 = k * Math.PI * 2 / 36, a1 = a0 + Math.PI / 36;
          ctx.fillStyle = k % 2 ? '#ff9f1c' : '#ffbf1f';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.fill();
        }
        const cell = W / 38;
        ctx.fillStyle = 'rgba(220,20,60,.55)';
        for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
          const d = Math.hypot(x - cx, (y - cy) * 0.6) / (Math.max(W, H) * 0.6);
          const rad = cell * 0.42 * Math.max(0, Math.min(1, (d - 0.35) * 1.8));
          if (rad > 0.5) { ctx.beginPath(); ctx.arc(x + ((y / cell) % 2 ? cell / 2 : 0), y, rad, 0, Math.PI * 2); ctx.fill(); }
        }
      } },
    minblack: { name: 'Simple Black', accent: '#000000',
      draw(ctx, W, H) { ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H); } },
    custom: { name: 'Your Colors & Fade', custom: true,
      get accent() { return shade(state.custom.c2, -0.45); },
      draw(ctx, W, H, r) {
        const c = state.custom, cols = c.use3 && c.c3 ? [c.c1, c.c2, c.c3] : [c.c1, c.c2];
        fade(ctx, W, H, cols, c.dir || 'diag');
        const dc = c.decoColor === 'match' ? cols.map(x => shade(x, .35)).concat(['#ffffff']) : (DECO_COLORS[c.decoColor] || DECO_COLORS.bright);
        if (c.deco !== 'none') decorate(ctx, W, H, r, c.deco, dc, c.density || 1);
      } },
    photo: { name: 'Your Photo', accent: '#000000',
      draw(ctx, W, H) {
        const img = bgImage;
        if (!img) {
          vGrad(ctx, W, H, ['#d9d2e0', '#a99bb8']);
          ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `${W * 0.3}px ${EMOJI}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🖼️', W / 2, H / 2);
          return;
        }
        const sr = img.width / img.height, dr = W / H;
        let sw, sh;
        if (sr > dr) { sh = img.height; sw = sh * dr; } else { sw = img.width; sh = sw / dr; }
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
        if (state.bgDim > 0) { ctx.fillStyle = `rgba(0,0,0,${state.bgDim})`; ctx.fillRect(0, 0, W, H); }
      } }
  };

  // holiday backgrounds (js/holidays.js) go before "Your Colors" and "Your Photo"
  if (window.PBHolidays) {
    const tail = {}; ['custom', 'photo'].forEach(k => { tail[k] = THEMES[k]; delete THEMES[k]; });
    Object.assign(THEMES, window.PBHolidays.themes, tail);
  }

  const FONTS = {
    playful: { label: 'Playful', main: '900', sub: '800', fam: ROUNDED, k: .2 },
    bold: { label: 'Bold', main: '900', sub: '700', fam: 'Impact,"Arial Black","Franklin Gothic Heavy",sans-serif', k: .16 },
    classic: { label: 'Classic', main: '700', sub: '600', fam: '"Helvetica Neue",Helvetica,Arial,system-ui,sans-serif', k: .18 },
    elegant: { label: 'Elegant', main: 'italic 700', sub: 'italic 600', fam: 'Didot,"Bodoni 72","Bodoni MT",Georgia,"Times New Roman",serif', k: .14 },
    script: { label: 'Script', main: '700', sub: '600', fam: '"Snell Roundhand","Brush Script MT","Segoe Script","Apple Chancery","Dancing Script",cursive', k: .12 }
  };

  const PRESETS_BASE = [
    { name: '🎂 Birthday', theme: 'confetti', line1: 'Happy Birthday!', left: '🎈', right: '🎂', font: 'playful' },
    { name: '💍 Wedding', theme: 'blush', line1: 'Just Married', left: '💍', right: '🥂', font: 'script' },
    { name: '🥂 Anniversary', theme: 'gold', line1: 'Happy Anniversary', left: '🥂', right: '💕', font: 'elegant', frame: 'gold' },
    { name: '🎓 Graduation', theme: 'grad', line1: 'Congrats, Grad!', left: '🎓', right: '⭐', font: 'bold' },
    { name: '🍼 Baby Shower', theme: 'baby', line1: 'Oh Baby!', left: '🍼', right: '👶', font: 'playful' },
    { name: '🎄 Holidays', theme: 'holiday', line1: 'Merry Christmas', left: '🎄', right: '🎁', font: 'elegant' },
    { name: '🎃 Halloween', theme: 'spooky', line1: 'Happy Halloween', left: '🎃', right: '👻', font: 'bold', frame: 'black' },
    { name: '🎆 New Year', theme: 'fireworks', line1: 'Happy New Year!', left: '🎆', right: '🥂', font: 'classic' },
    { name: '❤️ Valentine’s', theme: 'hearts', line1: 'Be Mine', left: '❤️', right: '💘', font: 'script' },
    { name: '🇺🇸 4th of July', theme: 'usa', line1: 'Happy 4th!', left: '🎆', right: '🇺🇸', font: 'bold' },
    { name: '🍂 Thanksgiving', theme: 'autumn', line1: 'Give Thanks', left: '🍂', right: '🥧', font: 'elegant' },
    { name: '☀️ Summer', theme: 'sunset', line1: 'Summer Vibes', left: '☀️', right: '🌴', font: 'playful' },
    { name: '🏖️ Retirement', theme: 'sunset', line1: 'Happy Retirement', left: '🏖️', right: '🎉', font: 'classic' },
    { name: '🌻 Family', theme: 'garden', line1: 'Family Reunion', left: '🌻', right: '❤️', font: 'classic' },
    { name: '🪩 Party', theme: 'neon', line1: "Let's Party!", left: '🎉', right: '🪩', font: 'bold' },
    { name: '💥 Comic book', theme: 'action', line1: 'KA-POW!', left: '💥', right: '⚡', font: 'bold', frame: 'black' },
    { name: '✏️ Blank', theme: 'minwhite', line1: '', left: '', right: '', font: 'classic' }
  ];

  // everyday occasions, then the year's holidays in calendar order, then Blank
  const PRESETS = PRESETS_BASE.slice(0, -1).concat((window.PBHolidays && window.PBHolidays.presets) || [], PRESETS_BASE.slice(-1));

  const EMOJIS = ['🎉', '🎈', '🎂', '🎁', '🥳', '🎊', '✨', '⭐', '❤️', '💕', '💍', '🥂', '🍾', '💐', '🎓', '🏆',
    '🍼', '👶', '🎄', '❄️', '☃️', '🎃', '👻', '🦇', '🎆', '🇺🇸', '🍂', '🦃', '🥧', '🌻', '🌸', '🌈',
    '☀️', '🌴', '🏖️', '🪩', '🎵', '🎤', '📸', '⚽', '🏀', '🏈', '⚾', '🐶', '🐱', '🦄', '🍀', '🐣'];

  const FRAME_COLORS = { white: '#ffffff', black: '#111111', gold: '#d4af37', pink: '#ffc2d9' };

  // ================= state =================
  const MAX_PHOTOS = 9;
  function noPhotos() { return Array(MAX_PHOTOS).fill(null); }
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const state = {
    photos: noPhotos(),
    count: 3, theme: 'confetti', layout: 'strip', style: 'tilt', shape: 'rect', seed: 20260927,
    line1: 'Happy Birthday!', line2: today, font: 'playful',
    textMode: 'auto', textColor: '#ffffff', outlineMode: 'auto', outlineColor: '#540d6e',
    iconLeft: '🎈', iconRight: '🎂', iconPos: 'sub',
    frame: 'white', frameColor: '#ffffff', frameSize: 1, shadow: true,
    edge: 'none', edgeColor: '#ffffff', edgeSize: 2,
    custom: { c1: '#ff9a8b', c2: '#7f53ac', c3: '#ffd6a5', use3: false, dir: 'diag', deco: 'confetti', decoColor: 'bright', density: 1 },
    bgDim: 0.2, preset: 0,
    filter: 'none', stickerSets: {}, vstickers: [], vplain: false, camProps: [], adj: { b: 0, c: 0, s: 0 }, tone: '', bgSwap: 'none', music: 'none', facePaint: 'none',
    collageSize: 'square', collageGap: .025, caption: false, boothStash: null,
    saveSize: 'orig', saveFit: 'blur', vidSize: 'orig', vidFit: 'blur', appMode: 'photo', stamp: 'off', stampDate: '', cuts: []
  };
  let bgImage = null;

  const SETTINGS_KEY = 'photobooth-settings-v1';
  const SAVED_KEYS = ['count', 'theme', 'layout', 'style', 'shape', 'seed', 'line1', 'line2', 'font', 'textMode', 'textColor',
    'outlineMode', 'outlineColor', 'iconLeft', 'iconRight', 'iconPos', 'frame', 'frameColor', 'frameSize', 'shadow',
    'edge', 'edgeColor', 'edgeSize', 'custom', 'bgDim', 'preset', 'filter', 'stickerSets', 'vstickers', 'vplain', 'camProps', 'adj', 'tone', 'bgSwap', 'music', 'facePaint', 'collageSize', 'collageGap', 'caption', 'boothStash', 'lastCollage', 'lastBooth', 'saveSize', 'saveFit', 'vidSize', 'vidFit', 'appMode', 'stamp', 'stampDate', 'cuts'];
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!saved) return;
      SAVED_KEYS.forEach(k => { if (saved[k] !== undefined) state[k] = saved[k]; });
      if (saved._date && saved.line2 === saved._date) state.line2 = today; // keep the date current
      if (!THEMES[state.theme]) state.theme = 'confetti';
      if (!PBFilters.byId[state.filter]) state.filter = 'none';
      if (!state.stickerSets || typeof state.stickerSets !== 'object' || Array.isArray(state.stickerSets)) state.stickerSets = {};
      if (!Array.isArray(state.vstickers)) state.vstickers = [];
      if (!LAYOUTS.concat(COLLAGES).some(l => l.id === state.layout)) state.layout = 'strip';
      state.count = clamp(Math.round(state.count) || 3, 1, MAX_PHOTOS);
      if (!isCollage() && state.count > 4) state.count = 4;
      if (state.frame === 'none') { state.frame = 'white'; state.frameSize = 0; }
      if (!FONTS[state.font]) state.font = 'playful';
      if (state.theme === 'photo') state.theme = 'confetti'; // background photo isn't stored
      if (state.bgSwap === 'custom') state.bgSwap = 'none';  // nor is the swap picture
    } catch (e) { /* storage unavailable */ }
  }
  function saveSettings() {
    try {
      const out = { _date: today };
      SAVED_KEYS.forEach(k => { out[k] = state[k]; });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
    } catch (e) { /* storage unavailable */ }
  }

  // ================= layout =================
  // Picture sizes for social media (also used when saving). Ratios are width / height.
  const SIZES = [
    { id: 'square', label: '◻️ Square 1:1', hint: 'Instagram & Facebook posts', w: 1080, h: 1080 },
    { id: 'portrait', label: '▯ Portrait 4:5', hint: 'Instagram feed (tallest it allows)', w: 1080, h: 1350 },
    { id: 'story', label: '📱 Story 9:16', hint: 'Stories, Reels, TikTok, Snapchat, Shorts', w: 1080, h: 1920 },
    { id: 'pin', label: '📌 Tall 2:3', hint: 'Pinterest, 4×6 portrait prints', w: 1000, h: 1500 },
    { id: 'land', label: '▭ Landscape 1.91:1', hint: 'Instagram landscape, Facebook & link previews', w: 1200, h: 628 },
    { id: 'wide', label: '🖥️ Wide 16:9', hint: 'X/Twitter, YouTube, TVs', w: 1920, h: 1080 },
    { id: 'print', label: '🖼️ Landscape 3:2', hint: '4×6 landscape prints', w: 1800, h: 1200 }
  ];
  const sizeOf = (id) => SIZES.find(z => z.id === id) || SIZES[0];

  const COLLAGES = [
    { id: 'c-grid', label: '▦ Grid' },
    { id: 'c-hero', label: '🌟 Big + small' },
    { id: 'c-mosaic', label: '🧱 Mosaic' },
    { id: 'c-columns', label: '🏙️ Columns' },
    { id: 'c-center', label: '🎯 Center' },
    { id: 'c-film', label: '🎞️ Film' },
    { id: 'c-scatter', label: '📷 Scattered' }
  ].concat((window.PBCollage ? PBCollage.TEMPLATES : []).map(t => ({ id: t.id, label: t.label })), [{ id: 'c-custom', label: '✂️ Your own cuts' }]);
  const isCollage = (id) => /^[cp]-/.test(id || state.layout);

  const LAYOUTS = [
    { id: 'strip', label: '📏 Strip' },
    { id: 'grid', label: '🔲 Collage' },
    { id: 'row', label: '↔️ Side by side' },
    { id: 'hero', label: '🌟 Big + small' },
    { id: 'scrap', label: '📒 Scrapbook' },
    { id: 'postcard', label: '💌 Postcard' }
  ];
  const STYLES = [
    { id: 'straight', label: '▭ Straight' },
    { id: 'tilt', label: '🙃 Tilted' },
    { id: 'scatter', label: '🎲 Scattered' },
    { id: 'polaroid', label: '📷 Polaroid' },
    { id: 'tape', label: '🩹 Taped' },
    { id: 'film', label: '🎞️ Film' }
  ];
  const SHAPES = [
    { id: 'rect', label: '⬛ Square' },
    { id: 'rounded', label: '▢ Rounded' },
    { id: 'oval', label: '⚪ Oval' },
    { id: 'circle', label: '🔵 Circle' },
    { id: 'arch', label: '🌈 Arch' },
    { id: 'hexagon', label: '⬢ Hexagon' },
    { id: 'diamond', label: '🔷 Diamond' },
    { id: 'star', label: '⭐ Star' },
    { id: 'scallop', label: '🌸 Scalloped' },
    { id: 'stamp', label: '📮 Stamp' },
    { id: 'heart', label: '❤️ Heart' }
  ];

  // Every layout returns the canvas size, one rect per photo (optional fixed rotation),
  // a base frame thickness, and the caption box.
  // Collages: photos tiled on a canvas of a social-media size, with even white gaps (or any background).
  // Cells are laid out in a unit box first, then scaled into the picture.
  function rowsFor(n, tall) {
    const T = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [2, 3], 6: [3, 3], 7: [2, 3, 2], 8: [3, 2, 3], 9: [3, 3, 3] };
    const TALL = { 1: [1], 2: [1, 1], 3: [1, 1, 1], 4: [2, 2], 5: [2, 1, 2], 6: [2, 2, 2], 7: [2, 3, 2], 8: [2, 2, 2, 2], 9: [3, 3, 3] };
    return (tall ? TALL : T)[n];
  }
  function cellsFor(kind, n, ar) {            // ar = box width / height
    const tall = ar < .8, wide = ar > 1.35, out = [];
    const rowsLayout = (counts, rowWeights, cellWeights) => {
      const rw = rowWeights || counts.map(() => 1), tot = rw.reduce((a, b) => a + b, 0);
      let y = 0, k = 0;
      counts.forEach((c, i) => {
        const h = rw[i] / tot, ws = (cellWeights && cellWeights(i, c)) || Array(c).fill(1), wt = ws.reduce((a, b) => a + b, 0);
        let x = 0;
        for (let j = 0; j < c; j++) { out.push({ x, y, w: ws[j] / wt, h }); x += ws[j] / wt; k++; }
        y += h;
      });
    };
    const colsLayout = (counts, cellWeights) => {
      let x = 0;
      counts.forEach((c, i) => {
        const w = 1 / counts.length, hs = (cellWeights && cellWeights(i, c)) || Array(c).fill(1), ht = hs.reduce((a, b) => a + b, 0);
        let y = 0;
        for (let j = 0; j < c; j++) { out.push({ x, y, w, h: hs[j] / ht }); y += hs[j] / ht; }
        x += w;
      });
    };
    if (n === 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
    switch (kind) {
      case 'c-hero': {
        const rest = n - 1;
        if (wide) {                               // big one on the left, the rest in a grid on the right
          const cols = rest > 4 ? 2 : 1, per = Math.ceil(rest / cols);
          out.push({ x: 0, y: 0, w: .6, h: 1 });
          for (let i = 0; i < rest; i++) { const c = Math.floor(i / per), r = i % per, inCol = Math.min(per, rest - c * per); out.push({ x: .6 + c * .4 / cols, y: r / inCol, w: .4 / cols, h: 1 / inCol }); }
        } else {
          const rows = rest > 4 ? [Math.ceil(rest / 2), Math.floor(rest / 2)] : [rest];
          out.push({ x: 0, y: 0, w: 1, h: rows.length > 1 ? .56 : .66 });
          const top = out[0].h, rh = (1 - top) / rows.length;
          rows.forEach((c, i) => { for (let j = 0; j < c; j++) out.push({ x: j / c, y: top + i * rh, w: 1 / c, h: rh }); });
        }
        return out;
      }
      case 'c-mosaic':
        rowsLayout(rowsFor(n, tall), rowsFor(n, tall).map((_, i) => (i % 2 ? .8 : 1.2)),
          (i, c) => Array.from({ length: c }, (_, j) => ((i + j) % 2 ? 1 : 1.7)));
        return out;
      case 'c-columns': {
        const counts = rowsFor(n, !tall);         // columns of stacked photos, staggered heights
        colsLayout(counts, (i, c) => Array.from({ length: c }, (_, j) => ((i + j) % 2 ? 1.35 : 1)));
        return out;
      }
      case 'c-center': {
        if (n < 3) break;
        const rest = n - 1, left = Math.ceil(rest / 2), right = rest - left, side = .25;
        out.push({ x: side, y: 0, w: 1 - 2 * side, h: 1 });
        for (let i = 0; i < left; i++) out.push({ x: 0, y: i / left, w: side, h: 1 / left });
        for (let i = 0; i < right; i++) out.push({ x: 1 - side, y: i / right, w: side, h: 1 / right });
        return out;
      }
      case 'c-film': {                              // one line of photos, the way the canvas is longest
        for (let i = 0; i < n; i++) out.push(ar >= 1 ? { x: i / n, y: 0, w: 1 / n, h: 1 } : { x: 0, y: i / n, w: 1, h: 1 / n });
        return out;
      }
      case 'c-scatter': {
        const r = mulberry32(state.seed + n), cols = Math.ceil(Math.sqrt(n * ar)), rows = Math.ceil(n / cols);
        for (let i = 0; i < n; i++) {
          const c = i % cols, rr = Math.floor(i / cols), cw = 1 / cols, ch = 1 / rows;
          // slightly overlapping prints, kept inside the canvas
          const w = cw * 1.08, h = ch * 1.08;
          out.push({ x: clamp(c * cw - cw * .04 + (r() - .5) * cw * .1, .02, 1 - w - .02), y: clamp(rr * ch - ch * .04 + (r() - .5) * ch * .1, .02, 1 - h - .02),
            w: w * .96, h: h * .96, rot: (r() - .5) * 12 });
        }
        return out;
      }
    }
    rowsLayout(rowsFor(n, tall));
    return out;
  }
  function collageLayout(kind, n) {
    const Z = sizeOf(state.collageSize), k = 1800 / Math.max(Z.w, Z.h);
    const W = Math.round(Z.w * k), H = Math.round(Z.h * k), m = Math.min(W, H);
    const gap = m * (state.collageGap == null ? .025 : state.collageGap), cap = state.caption ? Math.round(H * (H > W ? .14 : .2)) : 0;
    const box = { x: gap, y: gap, w: W - 2 * gap, h: H - 2 * gap - cap };
    // angled pieces (js/collage.js): polygons cut from the box, each shrunk to leave the gaps
    const pcs = window.PBCollage && PBCollage.pieces(kind, n, rowsFor, state.cuts);
    if (pcs && pcs.length) {
      const toPx = ([x, y]) => [box.x + x * box.w, box.y + y * box.h];
      const onEdge = (a, b) => ['x', 'y'].some((k, d) => [box[k], box[k] + (d ? box.h : box.w)].some(v => Math.abs(a[d] - v) < .5 && Math.abs(b[d] - v) < .5));
      const rects = pcs.slice(0, Math.max(n, 1)).map(poly => {
        const pts = PBCollage.shrink(poly.map(toPx), gap / 2, 0, onEdge);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, poly: pts };
      });
      return { W, H, rects, box, border: m * .012, cap: cap ? { x: 0, y: H - cap - gap / 2, w: W, h: cap } : null, collage: true };
    }
    const scatter = kind === 'c-scatter';
    // cells touching the edge keep the full outer margin; shared edges get half a gap each side
    const rects = cellsFor(kind, n, box.w / box.h).map(c => {
      let x0 = box.x + c.x * box.w, y0 = box.y + c.y * box.h, x1 = x0 + c.w * box.w, y1 = y0 + c.h * box.h;
      if (!scatter) {
        if (x0 > box.x + .5) x0 += gap / 2;
        if (y0 > box.y + .5) y0 += gap / 2;
        if (x1 < box.x + box.w - .5) x1 -= gap / 2;
        if (y1 < box.y + box.h - .5) y1 -= gap / 2;
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, rot: c.rot };
    });
    return { W, H, rects, border: m * .012, cap: cap ? { x: 0, y: H - cap - gap / 2, w: W, h: cap } : null, collage: true };
  }

  function computeLayout(kind, n) {
    if (isCollage(kind)) return collageLayout(kind, n);
    if (kind === 'grid') {
      const W = 1600, m = 90, gap = 60, top = 90, cap = 400;
      const p = (W - 2 * m - gap) / 2;
      const H = top + 2 * p + gap + cap;
      const rects = n === 3
        ? [{ x: m, y: top, w: W - 2 * m, h: p }].concat([0, 1].map(i => ({ x: m + i * (p + gap), y: top + p + gap, w: p, h: p })))
        : [0, 1, 2, 3].map(i => ({ x: m + (i % 2) * (p + gap), y: top + Math.floor(i / 2) * (p + gap), w: p, h: p }));
      return { W, H, rects, border: 20, cap: { x: 0, y: top + 2 * p + gap, w: W, h: cap } };
    }
    if (kind === 'row') {
      const pw = 520, ph = 650, m = 70, gap = 50, top = 70, cap = 330;
      const W = 2 * m + n * pw + (n - 1) * gap, H = top + ph + cap;
      const rects = Array.from({ length: n }, (_, i) => ({ x: m + i * (pw + gap), y: top, w: pw, h: ph }));
      return { W, H, rects, border: 16, cap: { x: 0, y: top + ph, w: W, h: cap } };
    }
    if (kind === 'hero') {
      const W = 1400, m = 80, gap = 50, top = 80, cap = 380;
      const hw = W - 2 * m, hh = Math.round(hw * 0.72), k = n - 1;
      const tw = (hw - (k - 1) * gap) / k, th = Math.round(tw * 0.78);
      const H = top + hh + gap + th + cap;
      const rects = [{ x: m, y: top, w: hw, h: hh }].concat(
        Array.from({ length: k }, (_, i) => ({ x: m + i * (tw + gap), y: top + hh + gap, w: tw, h: th })));
      return { W, H, rects, border: 18, cap: { x: 0, y: top + hh + gap + th, w: W, h: cap } };
    }
    if (kind === 'scrap') {
      const W = 1600, H = 2000, cap = 380, area = H - cap;
      const T = n === 3
        ? [[.07, .05, .6, .36, -6], [.36, .33, .58, .34, 5], [.08, .6, .56, .34, -3]]
        : [[.06, .05, .48, .4, -5], [.47, .07, .47, .36, 4], [.09, .52, .46, .38, 3], [.46, .5, .48, .42, -4]];
      const rects = T.map(([x, y, w, h, rot]) => ({ x: x * W, y: y * area + 20, w: w * W, h: h * area, rot }));
      return { W, H, rects, border: 22, cap: { x: 0, y: area, w: W, h: cap } };
    }
    if (kind === 'postcard') {
      const W = 2000, H = 1250, m = 70, gap = 40, split = 1260;
      const aw = split - m - gap / 2, ah = H - 2 * m;
      const cw = (aw - gap) / 2, chh = (ah - gap) / 2;
      const rects = n === 3
        ? [{ x: m, y: m, w: aw, h: chh }].concat([0, 1].map(i => ({ x: m + i * (cw + gap), y: m + chh + gap, w: cw, h: chh })))
        : [0, 1, 2, 3].map(i => ({ x: m + (i % 2) * (cw + gap), y: m + Math.floor(i / 2) * (chh + gap), w: cw, h: chh }));
      return { W, H, rects, border: 16, cap: { x: split, y: m, w: W - split - m / 2, h: ah, side: true } };
    }
    const W = 900, pw = 760, ph = 570, top = 70, gap = 48, cap = 360;
    const H = top + n * ph + (n - 1) * gap + cap;
    const rects = Array.from({ length: n }, (_, i) => ({ x: (W - pw) / 2, y: top + i * (ph + gap), w: pw, h: ph }));
    return { W, H, rects, border: 16, cap: { x: 0, y: top + n * ph + (n - 1) * gap, w: W, h: cap } };
  }

  // area of a slot that actually shows the photo (Polaroids lose a strip at the bottom)
  const usesCard = () => (state.style === 'polaroid' || state.style === 'film') && (state.shape === 'rect' || state.shape === 'rounded');
  function innerRect(rect, border) {
    if (state.style === 'polaroid' && usesCard()) {
      const extra = border * 3;
      return { w: rect.w, h: rect.h - extra, oy: -extra / 2 };
    }
    return { w: rect.w, h: rect.h, oy: 0 };
  }

  // per-photo random placement for the fun styles (always consumes the same random numbers)
  function jitterFor(rect, tr) {
    const a = tr() * 2 - 1, b = tr() * 2 - 1, c = tr() * 2 - 1;
    let deg = 0, dx = 0, dy = 0;
    switch (state.style) {
      case 'tilt': deg = a * 2.2; break;
      case 'scatter': deg = a * 6; dx = b * rect.w * 0.035; dy = c * rect.h * 0.035; break;
      case 'polaroid': deg = a * 3; break;
      case 'tape': deg = a * 1.5; break;
    }
    return { deg: deg + (rect.rot || 0), dx, dy };
  }

  // ================= crop model =================
  const ZMAX = 5;
  function cropFor(p, dr) {
    const W = p.canvas.width, H = p.canvas.height, sr = W / H;
    let sw, sh;
    if (sr > dr) { sh = H; sw = sh * dr; } else { sw = W; sh = sw / dr; }
    const z = p.zoom || 1;
    sw /= z; sh /= z;
    let cx = p.cx == null ? 0.5 : p.cx;
    let cy = p.cy == null ? ((H - sh) * 0.15 + sh / 2) / H : p.cy; // default: favour the top (heads)
    cx = clamp(cx, sw / 2 / W, 1 - sw / 2 / W);
    cy = clamp(cy, sh / 2 / H, 1 - sh / 2 / H);
    return { sx: cx * W - sw / 2, sy: cy * H - sh / 2, sw, sh, cx, cy };
  }

  // ================= filters =================
  // the filtered copy is cached on the photo so each filter is only computed once
  function photoSource(p) {
    if (p.raw) return p.canvas;
    const id = p.filter || state.filter, adj = state.adj, key = id + '|' + JSON.stringify(adj);
    let out = p.canvas;
    if ((id && id !== 'none') || PBFilters.hasAdj(adj)) {
      if (!p._f || p._f.key !== key) p._f = { key, canvas: PBFilters.apply(p.canvas, id, null, adj) };
      out = p._f.canvas;
    }
    return paintFaces(p, swapBackground(p, out, key), key);
  }

  // ================= background swap =================
  // People are cut out with MediaPipe's selfie segmenter and put in front of a new scene.
  const SCENES = [
    { id: 'none', label: '🖼️ Original' }, { id: 'blur', label: '💨 Blur' }, { id: 'booth', label: '🎉 Booth design' },
    { id: 'beach', label: '🏖️ Beach' }, { id: 'space', label: '🚀 Space' }, { id: 'disco', label: '🪩 Disco' },
    { id: 'rainbow', label: '🌈 Rainbow' }, { id: 'studio', label: '📷 Studio' }, { id: 'custom', label: '🖼️ Your picture' }
  ];
  let swapImage = null, swapImageId = 0;
  function lin(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function drawScene(ctx, w, h, id, src) {
    const r = mulberry32(state.seed + 5);
    if (id === 'blur') {
      // tiny copy stretched back up = a soft blur that works in every browser
      const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w / 24)); t.height = Math.max(1, Math.round(h / 24));
      t.getContext('2d').drawImage(src, 0, 0, t.width, t.height);
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t, 0, 0, w, h);
    } else if (id === 'booth') {
      THEMES[state.theme].draw(ctx, w, h, themeRng(state.theme + 'swap'));
    } else if (id === 'custom' && swapImage) {
      const k = Math.max(w / swapImage.width, h / swapImage.height), dw = swapImage.width * k, dh = swapImage.height * k;
      ctx.drawImage(swapImage, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else if (id === 'beach') {
      ctx.fillStyle = lin(ctx, 0, h * .62, [[0, '#4fb3ff'], [1, '#bfe6ff']]); ctx.fillRect(0, 0, w, h * .62);
      ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.arc(w * .78, h * .2, Math.min(w, h) * .09, 0, 7); ctx.fill();
      ctx.fillStyle = lin(ctx, h * .55, h * .75, [[0, '#1c8fd6'], [1, '#48c1e8']]); ctx.fillRect(0, h * .55, w, h * .2);
      ctx.fillStyle = lin(ctx, h * .72, h, [[0, '#f7dc9c'], [1, '#e9c27a']]); ctx.fillRect(0, h * .72, w, h * .28);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(2, h * .006);
      for (let i = 0; i < 6; i++) { const y = h * (.58 + i * .025); ctx.beginPath(); ctx.moveTo(w * r(), y); ctx.lineTo(w * r(), y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      for (let i = 0; i < 3; i++) cloud(ctx, w * (.08 + .22 * i + r() * .06), h * (.07 + r() * .14), Math.min(w, h) * .05);
    } else if (id === 'space') {
      ctx.fillStyle = lin(ctx, 0, h, [[0, '#07031a'], [.6, '#1b0b45'], [1, '#3a1070']]); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + r() * .7})`; ctx.fillRect(w * r(), h * r(), 1 + r() * 2.5, 1 + r() * 2.5); }
      const R = Math.min(w, h) * .16;
      const g = ctx.createRadialGradient(w * .2 - R * .3, h * .75 - R * .3, R * .2, w * .2, h * .75, R);
      g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#c2410c'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(w * .2, h * .75, R, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,180,.8)'; ctx.lineWidth = R * .08;
      ctx.beginPath(); ctx.ellipse(w * .2, h * .75, R * 1.6, R * .35, -.3, 0, 7); ctx.stroke();
    } else if (id === 'disco') {
      ctx.fillStyle = lin(ctx, 0, h, [[0, '#1a0633'], [1, '#4a0d67']]); ctx.fillRect(0, 0, w, h);
      const cols = ['#ff5fa2', '#7ad7ff', '#ffd23f', '#8ac926', '#b388ff'];
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = cols[i % cols.length] + '40'; ctx.beginPath();
        ctx.moveTo(w / 2, 0); const a = -1.2 + i * .4;
        ctx.lineTo(w / 2 + Math.sin(a - .07) * h * 1.5, Math.cos(a - .07) * h * 1.5); ctx.lineTo(w / 2 + Math.sin(a + .07) * h * 1.5, Math.cos(a + .07) * h * 1.5); ctx.fill();
      }
      for (let i = 0; i < 70; i++) { ctx.fillStyle = cols[i % cols.length] + 'aa'; ctx.beginPath(); ctx.arc(w * r(), h * r(), 2 + r() * Math.min(w, h) * .012, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    } else if (id === 'rainbow') {
      ctx.fillStyle = lin(ctx, 0, h, [[0, '#fff1f7'], [1, '#e8f4ff']]); ctx.fillRect(0, 0, w, h);
      const cols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'], R = Math.max(w, h) * .75, lw = R * .07;
      ctx.lineWidth = lw; cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(w / 2, h * 1.05, R - i * lw, Math.PI, 0); ctx.stroke(); });
    } else {
      const g = ctx.createRadialGradient(w / 2, h * .4, Math.min(w, h) * .1, w / 2, h * .5, Math.max(w, h) * .8);
      g.addColorStop(0, '#9aa3b5'); g.addColorStop(1, '#2d3240'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }
  // person (from `src`, already filtered) in front of the chosen scene; `mask` is the person cut-out
  function composeSwap(src, mask, out) {
    const w = src.width, h = src.height;
    out = out || document.createElement('canvas');
    if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
    const ctx = out.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    drawScene(ctx, w, h, state.bgSwap, src);
    const person = composeSwap.tmp || (composeSwap.tmp = document.createElement('canvas'));
    person.width = w; person.height = h;
    const pc = person.getContext('2d');
    pc.drawImage(src, 0, 0);
    pc.globalCompositeOperation = 'destination-in'; pc.imageSmoothingQuality = 'high';
    pc.drawImage(mask, 0, 0, w, h);
    pc.globalCompositeOperation = 'source-over';
    ctx.drawImage(person, 0, 0);
    return out;
  }
  function swapBackground(p, src, key) {
    const id = state.bgSwap;
    if (!id || id === 'none' || (id === 'custom' && !swapImage)) return src;
    if (p._mask === undefined) {
      p._mask = null;                                            // working on it
      PBFace.loadSegmenter().then(ok => { p._mask = ok ? PBFace.personMask(p.canvas) : false; schedule(); });
    }
    if (!p._mask) return src;
    const k = [key, id, state.theme, state.seed, swapImageId].join('|');
    if (!p._sw || p._sw.key !== k) p._sw = { key: k, canvas: composeSwap(src, p._mask) };
    return p._sw.canvas;
  }
  // ---- the orange 2000s date stamp (js/datestamp.js) ----
  function stampText() {
    if (!state.stamp || state.stamp === 'off') return '';
    const d = state.stampDate ? new Date(state.stampDate + 'T' + new Date().toTimeString().slice(0, 8)) : new Date();
    return PBStamp.text(state.stamp, isNaN(d) ? new Date() : d);
  }
  function buildStampChips() {
    chipGroup($('stampChips'), PBStamp.STYLES, s => (state.stamp || 'off') === s.id, s => { state.stamp = s.id; buildStampChips(); schedule(); });
    $('stampDateRow').hidden = !state.stamp || state.stamp === 'off';
    $('stampDate').value = state.stampDate || '';
  }

  // ---- face paint (js/facepaint.js), placed with the detailed face finder ----
  const paintOn = () => state.facePaint && state.facePaint !== 'none';
  function paintFaces(p, src, key) {
    if (!paintOn()) return src;
    if (p._mesh === undefined) {
      p._mesh = null;
      PBFace.loadMesh().then(ok => { p._mesh = ok ? PBFace.meshes(p.canvas) || [] : false; schedule(); });
    }
    if (!p._mesh || !p._mesh.length) return src;
    const k = [key, state.bgSwap, state.theme, swapImageId, state.facePaint].join('|');
    if (!p._fpc || p._fpc.key !== k) {
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
      p._mesh.forEach(m => PBPaint.draw(ctx, m.map(q => ({ x: q.x * c.width, y: q.y * c.height })), state.facePaint));
      p._fpc = { key: k, canvas: c };
    }
    return p._fpc.canvas;
  }
  function setPaint(id) {
    state.facePaint = id; schedule(); buildPaintChips();
    if (id !== 'none') { PBFace.loadMesh(); if (!PBFace.meshReady()) toast('🎨 Getting face paint ready…'); }
  }
  function buildPaintChips() {
    chipGroup($('paintChips'), PBPaint.EFFECTS, e => (state.facePaint || 'none') === e.id, e => setPaint(e.id));
  }
  $('stampDate').addEventListener('change', (e) => { state.stampDate = e.target.value; schedule(); });
  $('stampToday').addEventListener('click', () => { state.stampDate = ''; buildStampChips(); schedule(); });
  function buildSwapChips() {
    chipGroup($('swapChips'), SCENES, s => state.bgSwap === s.id, s => {
      if (s.id === 'custom' && !swapImage) { $('swapFile').click(); return; }
      state.bgSwap = s.id; buildSwapChips(); schedule();
      if (s.id !== 'none') { PBFace.loadSegmenter(); toast('✂️ Cutting people out… (first time downloads the tools)'); }
    });
    $('swapNote').textContent = state.bgSwap !== 'none' && PBFace.status === 'loading' ? `Getting ready… ${Math.round(PBFace.progress * 100)}%` : '';
  }
  $('swapFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { const p = await loadFile(f, 1800); swapImage = p.canvas; swapImageId++; state.bgSwap = 'custom'; buildSwapChips(); schedule(); PBFace.loadSegmenter(); }
    catch (err) { toast("Couldn't open that picture"); }
  });

  // ================= drawing =================
  const EDGE_COLORS = FRAME_COLORS;
  function frameFill() {
    if (state.frameSize <= 0) return null;
    if (state.frame === 'custom') return state.frameColor;
    return FRAME_COLORS[state.frame] || '#ffffff';
  }

  function drawPhoto(ctx, p, rect, jit, border, idx, rng) {
    const style = state.style;
    const card = usesCard() && !rect.poly;
    const shape = state.shape;
    // angled collage pieces: the photo is clipped to the polygon (in coordinates around the photo's centre)
    const polyL = rect.poly ? rect.poly.map(([x, y]) => [x - rect.x - rect.w / 2, y - rect.y - rect.h / 2]) : null;
    const polyPath = () => { polyL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    let fill = frameFill();
    let b = fill ? border * state.frameSize : 0;
    if (card && style === 'polaroid') { fill = fill || '#ffffff'; b = Math.max(b, border); }
    if (card && style === 'film') { fill = (state.frame === 'white' || !fill) ? '#111111' : fill; b = Math.max(b, border * 0.8); }
    const ir = innerRect(rect, border);
    const px = -ir.w / 2, py = -rect.h / 2;              // photo box, top-left
    const photoR = shape === 'rounded' ? Math.min(ir.w, ir.h) * 0.08 : 0;
    const curvy = !!polyL || (shape !== 'rect' && shape !== 'rounded');     // frame follows the outline instead of a box

    ctx.save();
    ctx.translate(rect.x + rect.w / 2 + jit.dx, rect.y + rect.h / 2 + jit.dy);
    ctx.rotate(jit.deg * Math.PI / 180);
    if (state.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = border * 2;
      ctx.shadowOffsetY = border * .6;
    }

    // frame / card behind the photo
    ctx.fillStyle = fill || 'rgba(0,0,0,1)';
    ctx.beginPath();
    if (card) {
      const side = style === 'film' ? b + border * 2.2 : b;
      const cardR = style === 'film' ? border * 0.4 : border * 0.5;
      shapePath(ctx, 'rect', -rect.w / 2 - side, -rect.h / 2 - b, rect.w + 2 * side, rect.h + 2 * b, cardR);
    } else if (polyL) {
      polyPath();
    } else if (curvy) {
      shapePath(ctx, shape, px, py, ir.w, ir.h, 0);
    } else {
      const rr = shape === 'rounded' ? photoR + b : (b ? b * 0.8 : 0);
      shapePath(ctx, shape, px - b, py - b, ir.w + 2 * b, ir.h + 2 * b, rr);
    }
    if (fill || state.shadow) ctx.fill();
    if (!card && b && curvy) {
      // even-width outline that follows the curve (drawn after the fill so the shadow sits underneath)
      ctx.strokeStyle = fill; ctx.lineWidth = b * 2; ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    if (card && style === 'film') {
      // sprocket holes down both sides
      const band = border * 2.2, hw = band * 0.5, hh = band * 0.36, stepY = band * 0.85;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const sx of [-rect.w / 2 - b - band / 2, rect.w / 2 + b + band / 2]) {
        for (let y = -rect.h / 2 - b + stepY / 2; y < rect.h / 2 + b - hh; y += stepY) {
          ctx.beginPath(); shapePath(ctx, 'rect', sx - hw / 2, y, hw, hh, hh * 0.25); ctx.fill();
        }
      }
    }

    // the photo, clipped to its shape
    ctx.save();
    ctx.beginPath();
    if (polyL) polyPath(); else shapePath(ctx, card ? 'rect' : shape, px, py, ir.w, ir.h, photoR);
    ctx.clip();
    if (p) {
      const c = cropFor(p, ir.w / ir.h);
      const src = photoSource(p), k = src.width / p.canvas.width;
      ctx.drawImage(src, c.sx * k, c.sy * k, c.sw * k, c.sh * k, px, py, ir.w, ir.h);
      const st = stampText();                                  // in the corner of the part that shows
      if (st) { ctx.save(); ctx.translate(px, py); PBStamp.draw(ctx, ir.w, ir.h, st); ctx.restore(); }
    } else {
      ctx.fillStyle = '#efe6f7';
      ctx.fillRect(px, py, ir.w, ir.h);
      ctx.fillStyle = '#a58fbd';
      ctx.font = `700 ${Math.min(ir.w, ir.h * 1.3) * 0.08}px ${ROUNDED}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Photo ' + (idx + 1), 0, py + ir.h / 2);
    }
    ctx.restore();

    if (style === 'tape') {
      const colors = ['rgba(255,214,232,.8)', 'rgba(205,239,253,.8)', 'rgba(255,243,163,.8)', 'rgba(200,247,220,.8)', 'rgba(224,195,252,.8)'];
      const tw = Math.min(rect.w, rect.h) * 0.32, th = border * 2.6;
      const spots = rng() < 0.5
        ? [[-rect.w / 2, -rect.h / 2, -40], [rect.w / 2, -rect.h / 2, 40]]
        : [[0, -rect.h / 2 - b, (rng() - .5) * 10]];
      spots.forEach(([x, y, a]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a * Math.PI / 180);
        ctx.fillStyle = pick(rng, colors);
        ctx.fillRect(-tw / 2, -th / 2, tw, th);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  function drawEdge(ctx, W, H) {
    if (state.edge === 'none') return;
    const color = state.edge === 'custom' ? state.edgeColor : (EDGE_COLORS[state.edge] || '#ffffff');
    const w = Math.min(W, H) * state.edgeSize / 100;
    ctx.strokeStyle = color;
    ctx.lineWidth = w * 2;
    ctx.strokeRect(0, 0, W, H);
  }

  // measure a caption line plus its optional icons
  function measureLine(ctx, text, weight, fam, size, icons) {
    ctx.font = `${weight} ${size}px ${fam}`;
    const tw = ctx.measureText(text).width;
    let wl = 0, wr = 0;
    const is = size * 1.05, gap = size * 0.35;
    if (icons) {
      ctx.font = `${is}px ${EMOJI}`;
      if (icons[0]) wl = ctx.measureText(icons[0]).width;
      if (icons[1]) wr = ctx.measureText(icons[1]).width;
    }
    return { tw, wl, wr, is, gap, total: tw + (wl ? wl + gap : 0) + (wr ? wr + gap : 0) };
  }
  function fitLine(ctx, text, weight, fam, start, maxW, icons) {
    let s = start;
    while (s > start * 0.3 && measureLine(ctx, text, weight, fam, s, icons).total > maxW) s -= 2;
    return s;
  }
  function drawLine(ctx, text, cx, y, size, weight, F, fill, outline, icons) {
    const m = measureLine(ctx, text, weight, F.fam, size, icons);
    const x0 = cx - m.total / 2;
    const tx = x0 + (m.wl ? m.wl + m.gap : 0) + m.tw / 2;
    if (text) {
      ctx.font = `${weight} ${size}px ${F.fam}`;
      if (outline) {
        ctx.lineJoin = 'round'; ctx.lineWidth = size * F.k; ctx.strokeStyle = outline;
        ctx.strokeText(text, tx, y);
      }
      ctx.fillStyle = fill;
      ctx.fillText(text, tx, y);
    }
    if (icons) {
      ctx.font = `${m.is}px ${EMOJI}`;
      ctx.fillStyle = '#000';
      if (m.wl) ctx.fillText(icons[0], x0 + m.wl / 2, y);
      if (m.wr) ctx.fillText(icons[1], x0 + m.total - m.wr / 2, y);
    }
  }

  function drawCaption(ctx, L, theme) {
    if (!L.cap) return;
    const F = FONTS[state.font] || FONTS.playful;
    const fill = state.textMode === 'custom' ? state.textColor : (theme.text || '#ffffff');
    const outline = state.outlineMode === 'none' ? null : state.outlineMode === 'custom' ? state.outlineColor : theme.accent;
    const l1 = state.line1.trim(), l2 = state.line2.trim();
    const icons = [state.iconLeft.trim(), state.iconRight.trim()];
    const hasIcons = icons[0] || icons[1];
    let iconLine = state.iconPos === 'main' ? 1 : 2;
    if (iconLine === 2 && !l2) iconLine = 1;
    if (iconLine === 1 && !l1) iconLine = 2;
    if (!l1 && !l2) iconLine = hasIcons ? 1 : 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const C = L.cap;
    const cx = C.x + C.w / 2, maxW = C.w * 0.88;
    const base = C.side ? Math.min(C.w * 0.15, C.h * 0.2) : Math.min(L.W * 0.105, C.h * 0.42);
    const show1 = l1 || iconLine === 1;
    const s1 = show1 ? fitLine(ctx, l1, F.main, F.fam, base, maxW, iconLine === 1 ? icons : null) : 0;
    const s2 = l2 ? fitLine(ctx, l2, F.sub, F.fam, (s1 || base) * 0.5, maxW, iconLine === 2 ? icons : null) : 0;
    const gap = s1 && s2 ? s1 * 0.35 : 0;
    const blockH = s1 + gap + s2 * 1.1;
    let y = C.y + (C.h - blockH) / 2;
    if (s1) { drawLine(ctx, l1, cx, y + s1 / 2, s1, F.main, F, fill, outline, iconLine === 1 ? icons : null); y += s1 + gap; }
    if (s2) drawLine(ctx, l2, cx, y + s2 * 0.55, s2, F.sub, F, fill, outline, iconLine === 2 ? icons : null);
  }

  function themeRng(id) { return mulberry32(state.seed + id.length * 1000 + id.charCodeAt(0)); }

  const canvas = $('preview');
  function composeInto(cv, withStickers) {
    const L = computeLayout(state.layout, state.count);
    cv.width = L.W; cv.height = L.H;
    const ctx = cv.getContext('2d');
    const theme = THEMES[state.theme];
    ctx.clearRect(0, 0, L.W, L.H);
    theme.draw(ctx, L.W, L.H, themeRng(state.theme + state.layout));
    const tr = mulberry32(state.seed * 3 + 11);
    L.rects.forEach((rect, i) => {
      drawPhoto(ctx, state.photos[i], rect, jitterFor(rect, tr), L.border, i, mulberry32(state.seed + i * 97));
    });
    drawCaption(ctx, L, theme);
    if (withStickers) { const list = curStickers(); drawStickers(ctx, list, L.W, L.H, list.some(st => st.face) ? stripFaces() : null); }
    drawEdge(ctx, L.W, L.H);
  }
  function render() {
    composeInto(canvas, true);
    const missing = state.photos.slice(0, state.count).filter(p => !p).length;
    const btn = $('save');
    btn.disabled = missing > 0;
    btn.textContent = missing ? `Add ${missing} more photo${missing === 1 ? '' : 's'} to save` : '💾 Save photo';
    if (typeof updateSummaries === 'function') updateSummaries();
    saveSettings();
    keepPhotosSoon();
    videoPreviewSoon();
  }

  // ================= keep photos across reloads =================
  // Photos live in IndexedDB on this device, so closing the app, a crash or an update never loses them.
  // IndexedDB is shared by every app on the same github.io site, hence the app-specific database name.
  const PDB = 'birthday-photobooth', PSTORE = 'photos';
  let pdb = null;
  function photoDB() {
    if (!pdb) pdb = new Promise((res, rej) => {
      const r = indexedDB.open(PDB, 2);
      r.onupgradeneeded = () => {
        for (const n of [PSTORE, 'strips']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, n === 'strips' ? { autoIncrement: true } : undefined);
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return pdb;
  }
  function photoTx(mode, fn, store) {
    return photoDB().then(d => new Promise((res, rej) => {
      const tx = d.transaction(store || PSTORE, mode), req = fn(tx.objectStore(store || PSTORE));
      tx.oncomplete = () => res(req && req.result); tx.onerror = tx.onabort = () => rej(tx.error);
    }));
  }
  const keptSig = [];
  let keepTimer = 0;
  function keepPhotosSoon() { clearTimeout(keepTimer); keepTimer = setTimeout(keepPhotos, 600); }
  async function keepPhotos() {
    if (!window.indexedDB) return;
    try {
      for (let i = 0; i < MAX_PHOTOS; i++) {
        const p = state.photos[i];
        const sig = p ? [p.url, p.zoom, p.cx, p.cy, p.filter].join('|') : '';
        if (keptSig[i] === sig) continue;
        keptSig[i] = sig;
        if (!p) { await photoTx('readwrite', s => s.delete('slot' + i)); continue; }
        if (!p._blob) p._blob = await new Promise(r => p.canvas.toBlob(r, 'image/jpeg', 0.92));
        const rec = { blob: p._blob, zoom: p.zoom, cx: p.cx, cy: p.cy, filter: p.filter };
        await photoTx('readwrite', s => s.put(rec, 'slot' + i));
      }
    } catch (e) { /* storage full or blocked (private mode): photos just won't survive a reload */ }
  }
  async function restorePhotos() {
    if (!window.indexedDB) return 0;
    let n = 0;
    try {
      for (let i = 0; i < MAX_PHOTOS; i++) {
        const rec = await photoTx('readonly', s => s.get('slot' + i));
        if (!rec || !rec.blob || state.photos[i]) continue;
        const bmp = await createImageBitmap(rec.blob);
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        c.getContext('2d').drawImage(bmp, 0, 0); if (bmp.close) bmp.close();
        const p = { canvas: c, url: URL.createObjectURL(rec.blob), zoom: rec.zoom || 1, cx: rec.cx, cy: rec.cy, filter: rec.filter || null, _blob: rec.blob };
        state.photos[i] = p;
        keptSig[i] = [p.url, p.zoom, p.cx, p.cy, p.filter].join('|');
        n++;
      }
    } catch (e) { /* nothing saved, or storage blocked */ }
    return n;
  }
  $('startOver').addEventListener('click', () => {
    if (!state.photos.some(Boolean)) { toast('Nothing to clear'); return; }
    if (!confirm('Remove all photos and start a new strip? (Your design and stickers stay.)')) return;
    state.photos.forEach(p => p && URL.revokeObjectURL(p.url));
    state.photos = noPhotos();
    buildSlots(); schedule();
  });

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; render(); });
  }

  // ================= photo loading =================
  function loadFile(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve({ canvas: c, url, zoom: 1, cx: null, cy: null, filter: null });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  }
  async function setPhoto(i, file) {
    try {
      const p = await loadFile(file, 1800);
      if (state.photos[i]) URL.revokeObjectURL(state.photos[i].url);
      state.photos[i] = p;
    } catch (e) {
      toast("Couldn't open that photo — try a JPG or PNG");
    }
  }

  // ================= UI builders =================
  function chipGroup(el, items, isOn, onPick, styleFn) {
    el.innerHTML = '';
    items.forEach((it, idx) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.setAttribute('aria-pressed', String(isOn(it, idx)));
      b.textContent = it.label || it.name;
      if (styleFn) styleFn(b, it);
      b.addEventListener('click', () => onPick(it, idx));
      if (it.k) b.dataset.k = it.k;
      el.appendChild(b);
    });
    if (el._search) el._search();
  }
  // a search box above a long list of options; matches the label, tooltip and extra keywords
  function addSearch(listEl, placeholder) {
    const inp = document.createElement('input');
    inp.type = 'search'; inp.className = 'opt-search'; inp.placeholder = placeholder; inp.setAttribute('aria-label', placeholder);
    listEl.parentNode.insertBefore(inp, listEl);
    const empty = document.createElement('p'); empty.className = 'hint'; empty.hidden = true; empty.textContent = 'Nothing matches — try another word';
    listEl.parentNode.insertBefore(empty, listEl.nextSibling);
    listEl._search = () => {
      const words = inp.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      [...listEl.children].forEach(c => {
        const text = (c.textContent + ' ' + (c.title || '') + ' ' + (c.dataset.k || '')).toLowerCase();
        c.hidden = !words.every(w => text.includes(w));
        if (!c.hidden) shown++;
      });
      empty.hidden = shown > 0;
    };
    inp.addEventListener('input', () => { listEl._search(); listEl.scrollLeft = 0; });
  }

  function buildPresets() {
    chipGroup($('presets'), PRESETS.map(p => ({ ...p, k: [p.k, THEMES[p.theme] && THEMES[p.theme].name, p.line1].join(' ') })), (_, i) => state.preset === i, (p, i) => {
      state.preset = i;
      state.theme = p.theme; state.line1 = p.line1;
      state.iconLeft = p.left; state.iconRight = p.right; state.font = p.font;
      state.textMode = 'auto'; state.outlineMode = 'auto';
      state.frame = p.frame || 'white';
      if (!state.line2.trim()) state.line2 = today;
      syncUI(); schedule();
    });
  }

  // ---- brightness / contrast / colour ----
  ['b', 'c', 's'].forEach(k => $('adj-' + k).addEventListener('input', (e) => {
    state.adj = { ...state.adj, [k]: +e.target.value }; schedule();
  }));
  $('adjReset').addEventListener('click', () => { state.adj = { b: 0, c: 0, s: 0 }; syncAdj(); schedule(); });
  function syncAdj() { ['b', 'c', 's'].forEach(k => { $('adj-' + k).value = (state.adj && state.adj[k]) || 0; }); }

  // ---- my designs: everything except the photos, saved on this device ----
  const DESIGNS_KEY = 'photobooth-designs-v1';
  const DESIGN_KEYS = SAVED_KEYS.filter(k => !['vplain', 'camProps', 'tone', 'lastCollage', 'lastBooth', 'boothStash'].includes(k)).concat('camProps');
  function designOf() { const d = {}; DESIGN_KEYS.forEach(k => { if (state[k] !== undefined) d[k] = JSON.parse(JSON.stringify(state[k])); }); return d; }
  function applyDesign(d) {
    DESIGN_KEYS.forEach(k => { if (d[k] !== undefined) state[k] = JSON.parse(JSON.stringify(d[k])); });
    if (!THEMES[state.theme] || state.theme === 'photo') state.theme = 'confetti';
    syncUI(); syncAdj(); markFilters(); buildSlots(); buildSwapChips(); buildPaintChips(); schedule();
  }
  function loadDesigns() { try { return JSON.parse(localStorage.getItem(DESIGNS_KEY) || '[]'); } catch (e) { return []; } }
  function storeDesigns(list) { try { localStorage.setItem(DESIGNS_KEY, JSON.stringify(list)); return true; } catch (e) { toast('Not enough space to save designs'); return false; } }
  function buildDesigns() {
    const el = $('designs'), list = loadDesigns(); el.innerHTML = '';
    list.forEach((d, i) => {
      const wrap = document.createElement('span'); wrap.className = 'design-chip';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = '⭐ ' + d.name;
      b.addEventListener('click', () => { applyDesign(d.d); toast(`“${d.name}” applied`); });
      const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '✕';
      x.setAttribute('aria-label', 'Delete ' + d.name);
      x.addEventListener('click', () => { if (!confirm(`Delete the design “${d.name}”?`)) return; list.splice(i, 1); storeDesigns(list); buildDesigns(); });
      wrap.append(b, x); el.appendChild(wrap);
    });
  }
  // ---- design links: the design (no photos) packed into the address after "#d=" ----
  const b64u = (bytes) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer()); }
  async function designLink() {
    const d = designOf(), k = state.layout + state.count;
    d.stickerSets = { [k]: JSON.parse(JSON.stringify(curStickers())) };   // just this layout's stickers
    d.stickerSets[k].forEach(st => { delete st._hidden; });
    const json = new TextEncoder().encode(JSON.stringify(d));
    const packed = window.CompressionStream ? 'z' + b64u(await pipe(json, CompressionStream)) : 'j' + b64u(json);
    return location.href.split('#')[0] + '#d=' + packed;
  }
  async function readDesignLink() {
    const m = /[#&]d=([zj])([\w-]+)/.exec(location.hash);
    if (!m) return;
    history.replaceState(null, '', location.href.split('#')[0]);
    try {
      const bytes = unb64u(m[2]);
      const d = JSON.parse(new TextDecoder().decode(m[1] === 'z' ? await pipe(bytes, DecompressionStream) : bytes));
      if (!confirm(`Use the design that was shared with you?${d.line1 ? `\n“${d.line1}”` : ''}\n(Your photos stay; save your current design first if you want to keep it.)`)) return;
      applyDesign(d); toast('🎨 Shared design applied');
    } catch (e) { toast("That design link didn't work"); }
  }
  $('designShare').addEventListener('click', async () => {
    const url = await designLink();
    if (navigator.share) { try { await navigator.share({ title: 'My photo booth design', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('🔗 Link copied — send it to a friend'); }
    catch (e) { prompt('Copy this link:', url); }
  });
  window.addEventListener('hashchange', readDesignLink);

  $('designSave').addEventListener('click', () => {
    const name = askText('Name this design:', state.line1 || 'My design', 30);
    if (!name) return;
    const list = loadDesigns().filter(d => d.name !== name);
    list.unshift({ name, at: Date.now(), d: designOf() });
    if (storeDesigns(list.slice(0, 20))) { buildDesigns(); toast('⭐ Design saved'); }
  });

  const slotsEl = $('slots');
  function buildSlots() {
    slotsEl.innerHTML = '';
    const n = state.count;
    const full = state.photos.slice(0, n).every(Boolean);
    $('multiLabel').textContent = full ? 'Replace' : 'Upload';
    queueFilterThumbs();
    slotsEl.style.gridTemplateColumns = `repeat(${n <= 4 ? n : n === 9 ? 3 : Math.ceil(n / 2)}, 1fr)`;
    state.photos.slice(0, n).forEach((p, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'slot' + (p ? ' filled' : '');
      el.setAttribute('aria-label', p ? `Photo ${i + 1} options` : `Add photo ${i + 1}`);
      el.innerHTML = `<span class="num">${i + 1}</span>` +
        (p ? `<img alt="" src="${p.url}"><span class="adj">✏️ Edit</span>`
           : `<span class="plus">＋</span><span>Add photo</span>`);
      el.addEventListener('click', () => p ? openPhotoMenu(i) : pickReplace(i));
      slotsEl.appendChild(el);
    });
  }

  // one hidden file input serves every "replace" / "add to this slot" action
  let replaceTarget = -1, reopenEditor = false;
  function pickReplace(i, fromEditor) {
    replaceTarget = i; reopenEditor = !!fromEditor;
    $('replaceInput').click();
  }
  $('replaceInput').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f || replaceTarget < 0) return;
    await setPhoto(replaceTarget, f);
    buildSlots(); schedule();
    if (reopenEditor && !$('editor').hidden) openEditor(replaceTarget);
    else toast(`Photo ${replaceTarget + 1} replaced`);
  });

  let menuIdx = -1;
  function openPhotoMenu(i) {
    const p = state.photos[i];
    if (!p) { pickReplace(i); return; }
    menuIdx = i;
    $('pmNum').textContent = i + 1;
    buildPhotoFilterChips();
    $('pmLeft').disabled = i === 0;
    $('pmRight').disabled = i === state.count - 1;
    $('photoMenu').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closePhotoMenu() { $('photoMenu').hidden = true; document.body.style.overflow = ''; }
  function movePhoto(dir) {
    const j = menuIdx + dir;
    if (j < 0 || j >= state.count) return;
    [state.photos[menuIdx], state.photos[j]] = [state.photos[j], state.photos[menuIdx]];
    buildSlots(); schedule();
    openPhotoMenu(j);           // keep the menu on the same photo so you can keep nudging it
  }
  $('pmReplace').addEventListener('click', () => { const i = menuIdx; closePhotoMenu(); pickReplace(i); });
  $('pmCamera').addEventListener('click', () => { const i = menuIdx; closePhotoMenu(); openCamera({ slot: i }); });
  function buildPhotoFilterChips() {
    const p = state.photos[menuIdx];
    if (!p) return;
    const shown = p.filter || state.filter;
    $('pmImg').src = shown === 'none' ? p.url : photoSource(p).toDataURL('image/jpeg', .85);
    const items = [{ id: null, name: 'Same as all' }].concat(PBFilters.LIST);
    chipGroup($('pmFilters'), items.map(f => ({ ...f, label: f.name })), it => (p.filter || null) === it.id, it => {
      p.filter = it.id;
      if (it.id && PBFilters.byId[it.id].adv) toast('Applying filter…');
      setTimeout(() => { buildPhotoFilterChips(); schedule(); }, 30);
    });
  }
  $('pmAdjust').addEventListener('click', () => { const i = menuIdx; closePhotoMenu(); openEditor(i); });
  $('pmLeft').addEventListener('click', () => movePhoto(-1));
  $('pmRight').addEventListener('click', () => movePhoto(1));
  $('pmRemove').addEventListener('click', () => {
    const p = state.photos[menuIdx];
    if (p) URL.revokeObjectURL(p.url);
    state.photos[menuIdx] = null;
    closePhotoMenu(); buildSlots(); schedule();
  });
  $('pmCancel').addEventListener('click', closePhotoMenu);
  $('photoMenu').addEventListener('click', (e) => { if (e.target.id === 'photoMenu') closePhotoMenu(); });

  function buildCounts() {
    const col = isCollage();
    chipGroup($('boothMode'), [{ id: false, label: '🎞️ Photo booth' }, { id: true, label: '▦ Collage' }], m => col === m.id,
      m => selectLayout(m.id ? (state.lastCollage || 'c-grid') : (state.lastBooth || 'strip')));
    const opts = state.layout === 'c-custom' ? [{ label: `${state.count} (from your cuts)`, n: state.count }]
      : col ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: String(n), n })) : [{ label: '3 photos', n: 3 }, { label: '4 photos', n: 4 }];
    chipGroup($('counts'), opts, it => state.count === it.n, it => {
      state.count = it.n; buildCounts(); buildSlots(); schedule();
    });
    $('counts').classList.toggle('nums', col);
    $('countsLabel').hidden = !col;
  }
  // Switching between photo-booth layouts and collages: collages start clean (white, straight, no frame,
  // no message) and the booth look comes back when you switch back.
  const STASH_KEYS = ['theme', 'style', 'shape', 'frameSize', 'shadow'];
  function selectLayout(id) {
    const was = isCollage(), now = isCollage(id);
    if (!was && now) {
      state.boothStash = {}; STASH_KEYS.forEach(k => { state.boothStash[k] = state[k]; });
      Object.assign(state, { theme: 'minwhite', style: 'straight', shape: 'rect', frameSize: 0, shadow: false });
      const filled = state.photos.filter(Boolean).length;
      if (filled > state.count) state.count = Math.min(MAX_PHOTOS, filled);
    } else if (was && !now) {
      if (state.boothStash) Object.assign(state, state.boothStash);
      state.count = clamp(state.count, 3, 4);
    }
    // the scattered collage looks like a pile of prints: white borders and shadows
    if (now && id === 'c-scatter' && state.layout !== 'c-scatter') Object.assign(state, { frame: 'white', frameSize: 1.4, shadow: true });
    else if (now && id !== 'c-scatter' && state.layout === 'c-scatter') Object.assign(state, { frameSize: 0, shadow: false });
    state.layout = id;
    if (now) state.lastCollage = id; else state.lastBooth = id;
    markThemes(); syncUI(); schedule();
  }
  function buildLayouts() {
    chipGroup($('layouts'), LAYOUTS, it => state.layout === it.id, it => selectLayout(it.id));
    chipGroup($('collages'), COLLAGES.filter(c => c.id !== 'p-diamond' || state.count === 5 || state.layout === c.id), it => state.layout === it.id, it => {
      if (it.id === 'c-custom') { openCutEditor(); return; }
      selectLayout(it.id);
    });
    $('collageOpts').hidden = !isCollage();
    chipGroup($('collageSizes'), SIZES, z => state.collageSize === z.id, z => { state.collageSize = z.id; buildLayouts(); schedule(); });
    [...$('collageSizes').children].forEach((b, i) => { b.title = SIZES[i].hint; });
    $('collageSizeHint').textContent = sizeOf(state.collageSize).hint + ` · ${sizeOf(state.collageSize).w}×${sizeOf(state.collageSize).h}`;
    $('collageGap').value = state.collageGap; $('collageCaption').checked = !!state.caption;
    chipGroup($('styles'), STYLES, it => state.style === it.id, it => { state.style = it.id; buildLayouts(); schedule(); });
    chipGroup($('shapes'), SHAPES, it => state.shape === it.id, it => { state.shape = it.id; buildLayouts(); schedule(); });
  }
  // ---- ✂️ cut editor: drag lines across the collage; each cut splits the pieces it crosses ----
  const cutEd = { cuts: [], drag: null, view: null };
  const cutCv = $('cutCanvas');
  function openCutEditor() {
    if (!isCollage()) selectLayout('c-grid');
    cutEd.cuts = state.layout === 'c-custom' ? state.cuts.slice() : [];
    if (!cutEd.cuts.length) fromCurrent();
    applyCuts();                                               // the collage becomes "your own cuts" straight away
    $('cutEd').hidden = false; syncScroll();
    requestAnimationFrame(drawCutEd);
  }
  function fromCurrent() {
    const cuts = PBCollage.cutsOf(state.layout, state.count, rowsFor);
    if (cuts) { cutEd.cuts = cuts.map(c => c.slice()); return; }
    // grid-style layouts: rebuild them from straight cuts (rows, then columns in each row)
    const r = rowsFor(Math.max(1, state.count), false), R = r.length, out = [];
    for (let i = 1; i < R; i++) out.push([-.1, i / R, 1.1, i / R]);
    r.forEach((c, i) => { for (let j = 1; j < c; j++) out.push([j / c, i / R + .02, j / c, (i + 1) / R - .02]); });
    cutEd.cuts = out;
  }
  function applyCuts() {
    state.cuts = cutEd.cuts.map(c => c.map(v => Math.round(v * 1e4) / 1e4));
    const n = PBCollage.fromCuts(state.cuts).length;
    if (state.layout !== 'c-custom') selectLayout('c-custom');
    state.count = clamp(n, 1, MAX_PHOTOS); buildCounts(); buildSlots(); buildLayouts(); schedule();
  }
  function cutView() {
    const dpr = window.devicePixelRatio || 1, cw = cutCv.clientWidth, ch = cutCv.clientHeight;
    if (cutCv.width !== Math.round(cw * dpr) || cutCv.height !== Math.round(ch * dpr)) { cutCv.width = Math.round(cw * dpr); cutCv.height = Math.round(ch * dpr); }
    const L = computeLayout(state.layout, state.count), k = Math.min((cw - 24) / L.W, (ch - 24) / L.H);
    return { dpr, cw, ch, L, k, x: (cw - L.W * k) / 2, y: (ch - L.H * k) / 2 };
  }
  function drawCutEd() {
    if ($('cutEd').hidden) return;
    const V = cutEd.view = cutView(), ctx = cutCv.getContext('2d');
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); ctx.clearRect(0, 0, V.cw, V.ch);
    const base = document.createElement('canvas'); composeInto(base, false);
    ctx.drawImage(base, V.x, V.y, V.L.W * V.k, V.L.H * V.k);
    // the pieces these cuts make, outlined and numbered
    const box = V.L.box || { x: 0, y: 0, w: V.L.W, h: V.L.H };
    const toV = ([x, y]) => [V.x + (box.x + x * box.w) * V.k, V.y + (box.y + y * box.h) * V.k];
    const pcs = PBCollage.fromCuts(cutEd.cuts);
    ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.strokeStyle = '#ff5fa2';
    pcs.forEach((poly, i) => {
      ctx.beginPath(); poly.map(toV).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      const [cx, cy] = toV(PBCollage.centroid(poly));
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(20,10,31,.75)'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, cx, cy);
      ctx.setLineDash([6, 5]);
    });
    if (cutEd.drag) {
      const [a, b] = cutEd.drag.map(toV);
      ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = '#ffd23f';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.setLineDash([]);
    $('cutSub').textContent = `${pcs.length} piece${pcs.length === 1 ? '' : 's'} · drag across to cut · up to 9`;
    $('cutUndo').disabled = !cutEd.cuts.length;
  }
  function cutPoint(e) {
    const V = cutEd.view, b = cutCv.getBoundingClientRect(), box = V.L.box || { x: 0, y: 0, w: V.L.W, h: V.L.H };
    return [((e.clientX - b.left - V.x) / V.k - box.x) / box.w, ((e.clientY - b.top - V.y) / V.k - box.y) / box.h];
  }
  function snapped(a, b) {
    if (!$('cutSnap').checked) return b;
    const box = cutEd.view.L.box || { w: 1, h: 1 }, dx = (b[0] - a[0]) * box.w, dy = (b[1] - a[1]) * box.h, L = Math.hypot(dx, dy);
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
    return [a[0] + Math.cos(ang) * L / box.w, a[1] + Math.sin(ang) * L / box.h];
  }
  cutCv.addEventListener('pointerdown', (e) => { cutCv.setPointerCapture(e.pointerId); const p = cutPoint(e); cutEd.drag = [p, p]; drawCutEd(); });
  cutCv.addEventListener('pointermove', (e) => { if (!cutEd.drag) return; cutEd.drag[1] = snapped(cutEd.drag[0], cutPoint(e)); drawCutEd(); });
  cutCv.addEventListener('pointerup', () => {
    const d = cutEd.drag; cutEd.drag = null;
    if (!d) return;
    const [a, b] = d, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < .04) { drawCutEd(); return; }
    // stretch the drawn line a little past its ends so a cut from edge to edge goes all the way
    const ex = (b[0] - a[0]) / L * .03, ey = (b[1] - a[1]) / L * .03;
    const next = cutEd.cuts.concat([[a[0] - ex, a[1] - ey, b[0] + ex, b[1] + ey]]);
    if (PBCollage.fromCuts(next).length > MAX_PHOTOS) { toast('That would make more than 9 pieces'); drawCutEd(); return; }
    cutEd.cuts = next; applyCuts(); drawCutEd();
  });
  $('cutUndo').addEventListener('click', () => { cutEd.cuts.pop(); applyCuts(); drawCutEd(); });
  $('cutClear').addEventListener('click', () => { cutEd.cuts = []; applyCuts(); drawCutEd(); });
  $('cutFrom').addEventListener('click', () => {
    const was = state.layout; if (was === 'c-custom') { toast('Pick a layout first, then start from it'); return; }
    fromCurrent(); applyCuts(); drawCutEd();
  });
  $('cutDone').addEventListener('click', () => { $('cutEd').hidden = true; syncScroll(); applyCuts(); });
  $('cutOpen').addEventListener('click', openCutEditor);
  window.addEventListener('resize', () => requestAnimationFrame(drawCutEd));

  $('collageGap').addEventListener('input', (e) => { state.collageGap = +e.target.value; schedule(); });
  $('collageCaption').addEventListener('change', (e) => { state.caption = e.target.checked; schedule(); });
  function buildFonts() {
    chipGroup($('fonts'), Object.entries(FONTS).map(([id, f]) => ({ ...f, id })), it => state.font === it.id, it => {
      state.font = it.id; buildFonts(); schedule();
    }, (b, it) => { b.style.fontFamily = it.fam; b.style.fontStyle = it.main.includes('italic') ? 'italic' : 'normal'; });
  }

  // background tiles with live miniature previews
  const thumbs = {};
  function drawThumb(id) {
    const cv = thumbs[id];
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.scale(cv.width / 900, cv.width / 900);
    THEMES[id].draw(ctx, 900, 1200, mulberry32(42 + id.length));
  }
  function buildThemes() {
    const el = $('themes');
    el.innerHTML = '';
    Object.entries(THEMES).forEach(([id, t]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.dataset.id = id;
      const cv = document.createElement('canvas');
      cv.width = 150; cv.height = 200;
      thumbs[id] = cv;
      const label = document.createElement('span');
      label.textContent = t.name;
      b.append(cv, label);
      b.addEventListener('click', () => { state.theme = id; markThemes(); schedule(); });
      b.dataset.k = id + ' ' + (PRESETS.filter(p => p.theme === id).map(p => p.name + ' ' + (p.k || '')).join(' '));
      el.appendChild(b);
      drawThumb(id);
    });
    markThemes();
    if (el._search) el._search();
  }
  function markThemes() {
    document.querySelectorAll('#themes .tile').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === state.theme)));
    $('customPanel').hidden = state.theme !== 'custom';
    $('photoPanel').hidden = state.theme !== 'photo';
    // theme picked by hand → presets no longer "exactly" apply, but keep the highlight simple
  }

  function buildEmojis() {
    const el = $('emojis');
    el.innerHTML = '';
    const none = document.createElement('button');
    none.type = 'button'; none.className = 'none'; none.textContent = 'None';
    none.addEventListener('click', () => setIcon(''));
    el.appendChild(none);
    EMOJIS.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = e;
      b.addEventListener('click', () => setIcon(e));
      el.appendChild(b);
    });
  }
  let activeIcon = 'left';
  function markIconBox() {
    $('boxLeft').classList.toggle('active', activeIcon === 'left');
    $('boxRight').classList.toggle('active', activeIcon === 'right');
  }
  function setIcon(e) {
    if (activeIcon === 'left') { state.iconLeft = e; activeIcon = 'right'; }
    else { state.iconRight = e; activeIcon = 'left'; }
    $('iconLeft').value = state.iconLeft; $('iconRight').value = state.iconRight;
    markIconBox(); schedule();
  }

  // push state into every control (after loading settings or applying a preset)
  function syncUI() {
    $('line1').value = state.line1; $('line2').value = state.line2;
    $('iconLeft').value = state.iconLeft; $('iconRight').value = state.iconRight;
    $('iconPos').value = state.iconPos;
    $('textMode').value = state.textMode;
    $('outlineMode').value = state.outlineMode;
    const theme = THEMES[state.theme];
    $('textColor').value = state.textMode === 'custom' ? state.textColor : (theme.text || '#ffffff');
    $('outlineColor').value = state.outlineMode === 'custom' ? state.outlineColor : theme.accent;
    $('frame').value = state.frame;
    $('frameColor').value = state.frame === 'custom' ? state.frameColor : (FRAME_COLORS[state.frame] || '#ffffff');
    $('frameSize').value = state.frameSize; $('frameSizeVal').textContent = frameLabel();
    $('shadow').checked = state.shadow;
    $('edge').value = state.edge;
    $('edgeColor').value = state.edge === 'custom' ? state.edgeColor : (EDGE_COLORS[state.edge] || '#ffffff');
    $('edgeSize').value = state.edgeSize;
    syncCustom();
    $('bgDim').value = state.bgDim;
    buildPresets(); buildCounts(); buildLayouts(); buildFonts(); markThemes(); markIconBox(); buildSlots();
  }

  // ================= events =================
  $('multi').addEventListener('change', async (e) => {
    const all = Array.from(e.target.files || []);
    const n = state.count;
    const files = all.slice(0, n);
    e.target.value = '';
    if (!files.length) return;
    const empties = state.photos.slice(0, n).map((p, i) => p ? -1 : i).filter(i => i >= 0);
    const targets = (files.length >= n || empties.length === 0) ? Array.from({ length: n }, (_, i) => i) : empties;
    for (let k = 0; k < files.length && k < targets.length; k++) await setPhoto(targets[k], files[k]);
    if (all.length > n) toast(`Used the first ${n} photos`);
    buildSlots(); schedule();
  });
  $('rotate').addEventListener('click', () => {
    const used = state.photos.slice(0, state.count);
    used.unshift(used.pop());
    state.photos.splice(0, state.count, ...used);
    buildSlots(); schedule();
  });
  $('shuffle').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e9); schedule(); });

  $('line1').addEventListener('input', (e) => { state.line1 = e.target.value; schedule(); });
  $('line2').addEventListener('input', (e) => { state.line2 = e.target.value; schedule(); });
  $('iconLeft').addEventListener('input', (e) => { state.iconLeft = e.target.value; schedule(); });
  $('iconRight').addEventListener('input', (e) => { state.iconRight = e.target.value; schedule(); });
  $('iconLeft').addEventListener('focus', () => { activeIcon = 'left'; markIconBox(); });
  $('iconRight').addEventListener('focus', () => { activeIcon = 'right'; markIconBox(); });
  $('iconPos').addEventListener('change', (e) => { state.iconPos = e.target.value; schedule(); });

  $('textMode').addEventListener('change', (e) => { state.textMode = e.target.value; if (e.target.value === 'custom') state.textColor = $('textColor').value; schedule(); });
  $('textColor').addEventListener('input', (e) => { state.textColor = e.target.value; state.textMode = 'custom'; $('textMode').value = 'custom'; schedule(); });
  $('outlineMode').addEventListener('change', (e) => { state.outlineMode = e.target.value; if (e.target.value === 'custom') state.outlineColor = $('outlineColor').value; schedule(); });
  $('outlineColor').addEventListener('input', (e) => { state.outlineColor = e.target.value; state.outlineMode = 'custom'; $('outlineMode').value = 'custom'; schedule(); });
  $('frame').addEventListener('change', (e) => {
    state.frame = e.target.value;
    if (state.frame === 'custom') state.frameColor = $('frameColor').value;
    else if (FRAME_COLORS[state.frame]) $('frameColor').value = FRAME_COLORS[state.frame];
    if (state.frameSize <= 0) { state.frameSize = 1; $('frameSize').value = 1; $('frameSizeVal').textContent = frameLabel(); }
    schedule();
  });
  $('frameColor').addEventListener('input', (e) => { state.frameColor = e.target.value; state.frame = 'custom'; $('frame').value = 'custom'; schedule(); });
  function frameLabel() { return state.frameSize <= 0 ? '(none)' : `(${Math.round(state.frameSize * 100)}%)`; }
  $('frameSize').addEventListener('input', (e) => { state.frameSize = Number(e.target.value); $('frameSizeVal').textContent = frameLabel(); schedule(); });
  $('shadow').addEventListener('change', (e) => { state.shadow = e.target.checked; schedule(); });
  $('edge').addEventListener('change', (e) => {
    state.edge = e.target.value;
    if (state.edge === 'custom') state.edgeColor = $('edgeColor').value;
    else if (EDGE_COLORS[state.edge]) $('edgeColor').value = EDGE_COLORS[state.edge];
    schedule();
  });
  $('edgeColor').addEventListener('input', (e) => { state.edgeColor = e.target.value; state.edge = 'custom'; $('edge').value = 'custom'; schedule(); });
  $('edgeSize').addEventListener('input', (e) => {
    state.edgeSize = Number(e.target.value);
    if (state.edge === 'none') { state.edge = 'white'; $('edge').value = 'white'; $('edgeColor').value = '#ffffff'; }
    schedule();
  });

  const customChanged = () => { drawThumb('custom'); if (state.outlineMode === 'auto') $('outlineColor').value = THEMES.custom.accent; schedule(); };
  $('c1').addEventListener('input', (e) => { state.custom.c1 = e.target.value; customChanged(); });
  $('c2').addEventListener('input', (e) => { state.custom.c2 = e.target.value; customChanged(); });
  $('c3').addEventListener('input', (e) => { state.custom.c3 = e.target.value; state.custom.use3 = true; $('use3').checked = true; customChanged(); });
  $('use3').addEventListener('change', (e) => { state.custom.use3 = e.target.checked; customChanged(); });
  $('decoColor').addEventListener('change', (e) => { state.custom.decoColor = e.target.value; customChanged(); });
  $('decoDensity').addEventListener('input', (e) => { state.custom.density = +e.target.value; customChanged(); });
  function buildCustomPanel() {
    const c = state.custom;
    chipGroup($('palettes'), PALETTES, p => p.c[0] === c.c1 && p.c[1] === c.c2, p => {
      Object.assign(c, { c1: p.c[0], c2: p.c[1], c3: p.c[2] || c.c3, use3: !!p.c[2] }); syncCustom(); customChanged();
    }, (b, p) => { b.style.background = `linear-gradient(120deg, ${p.c.join(', ')})`; });
    chipGroup($('fadeDirs'), FADE_DIRS, d => (c.dir || 'diag') === d.id, d => { c.dir = d.id; buildCustomPanel(); customChanged(); });
    chipGroup($('decos'), DECOS, d => c.deco === d.id, d => { c.deco = d.id; buildCustomPanel(); customChanged(); });
  }
  function syncCustom() {
    const c = state.custom;
    $('c1').value = c.c1; $('c2').value = c.c2; $('c3').value = c.c3 || '#ffd6a5'; $('use3').checked = !!c.use3;
    $('decoColor').value = c.decoColor; $('decoDensity').value = c.density || 1;
    buildCustomPanel();
  }

  $('bgFile').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const p = await loadFile(f, 2400);
      URL.revokeObjectURL(p.url);
      bgImage = p.canvas;
      $('bgLabel').textContent = 'Change background photo';
      drawThumb('photo'); schedule();
    } catch (err) { toast("Couldn't open that photo"); }
  });
  $('bgDim').addEventListener('input', (e) => { state.bgDim = Number(e.target.value); drawThumb('photo'); schedule(); });

  // keep the "Auto" colour swatches in step with the background
  document.getElementById('themes').addEventListener('click', () => {
    const theme = THEMES[state.theme];
    if (state.textMode === 'auto') $('textColor').value = theme.text || '#ffffff';
    if (state.outlineMode === 'auto') $('outlineColor').value = theme.accent;
  });

  $('jump').addEventListener('click', () => $(state.appMode === 'video' ? 'videoSection' : 'previewSection').scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // ================= save =================
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  const isAndroid = /Android/i.test(navigator.userAgent);
  const OVERLAYS = ['photoMenu', 'saveSheet', 'videoSheet', 'stickerEd', 'camera', 'making', 'editor', 'party', 'gallery', 'cutEd'];
  function syncScroll() { document.body.style.overflow = OVERLAYS.some(id => !$(id).hidden) ? 'hidden' : ''; }
  function stamp() {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  let sheetFile = null, sheetUrl = null;
  function showSaveSheet(blob, name, title, hint, modes) {
    $('printBtn').hidden = !/^image\/(jpeg|png)$/.test(blob.type) || /gif|anim/i.test(name);
    $('saveModes').hidden = !modes; if (!modes) { $('savePicks').hidden = true; $('saveSizeRow').hidden = true; }
    $('shareBtn').textContent = '📤 Share';
    if (sheetUrl) URL.revokeObjectURL(sheetUrl);
    sheetUrl = URL.createObjectURL(blob);
    sheetFile = new File([blob], name, { type: blob.type });
    $('sheetTitle').textContent = title;
    $('savedImg').src = sheetUrl;
    $('dlBtn').href = sheetUrl; $('dlBtn').download = name;
    $('shareBtn').hidden = !(navigator.canShare && navigator.canShare({ files: [sheetFile] }));
    $('saveHint').innerHTML = hint;
    $('saveSheet').hidden = false;
    syncScroll();
  }
  function photoHint() {
    return isIOS
      ? '<b>To save to Photos:</b> press and hold the picture above, then tap <b>Save to Photos</b>.<br>⬇️ saves it to the Files app instead.'
      : isAndroid
        ? '⬇️ saves it to your phone (Downloads — it shows up in your Gallery/Photos).<br>You can also press and hold the picture.'
        : '⬇️ downloads the file.';
  }
  // One photo on its own with its filter plus the stickers & text that sit on it, without the booth
  // background, frame or message. The whole photo, unless it was zoomed or moved (then that framing).
  function composePhotoOnly(i) {
    const L = computeLayout(state.layout, state.count), tr = mulberry32(state.seed * 3 + 11);
    let T = null;
    L.rects.forEach((rect, k) => { const jit = jitterFor(rect, tr); if (k === i) T = photoXform(state.photos[i], rect, jit, L.border); });
    const p = state.photos[i], src = photoSource(p), ks = src.width / p.canvas.width;
    const adjusted = (p.zoom || 1) > 1.01 || p.cx != null || p.cy != null;
    const c = adjusted ? T.crop : { sx: 0, sy: 0, sw: p.canvas.width, sh: p.canvas.height };
    const cv = document.createElement('canvas'); cv.width = Math.round(c.sw); cv.height = Math.round(c.sh);
    const ctx = cv.getContext('2d');
    ctx.drawImage(src, c.sx * ks, c.sy * ks, c.sw * ks, c.sh * ks, 0, 0, cv.width, cv.height);
    const stt = stampText(); if (stt) PBStamp.draw(ctx, cv.width, cv.height, stt);
    const list = curStickers();
    if (list.length) {
      ctx.save(); T.toPhoto(ctx, cv.width / c.sw, c.sx, c.sy);
      drawStickers(ctx, list, L.W, L.H, list.some(st => st.face) ? stripFaces() : null);
      ctx.restore();
    }
    return cv;
  }
  const toJpeg = (cv) => new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92));
  // Resize a finished picture to a social-media size: fit inside (edges blurred / white / black) or crop to fill.
  function fitInto(ctx, src, W, H, fit, scratch) {
    const sw = src.width, sh = src.height;
    if (fit === 'fill') {
      const k = Math.max(W / sw, H / sh); ctx.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k); return;
    }
    if (fit === 'blur') {
      const t = scratch || document.createElement('canvas'); t.width = 24; t.height = Math.max(1, Math.round(24 * H / W));
      const tc = t.getContext('2d'), k0 = Math.max(t.width / sw, t.height / sh);
      tc.drawImage(src, (t.width - sw * k0) / 2, (t.height - sh * k0) / 2, sw * k0, sh * k0);
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t, 0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, 0, W, H);
    } else { ctx.fillStyle = fit === 'black' ? '#000' : '#fff'; ctx.fillRect(0, 0, W, H); }
    const k = Math.min(W / sw, H / sh); ctx.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
  }
  function toSocial(src, id, fit) {
    if (!id || id === 'orig') return src;
    const Z = sizeOf(id), cv = document.createElement('canvas'); cv.width = Z.w; cv.height = Z.h;
    fitInto(cv.getContext('2d'), src, Z.w, Z.h, fit);
    return cv;
  }
  function fillSizeSelect(sel, value) {
    if (!sel.options.length) {
      sel.add(new Option('Original size', 'orig'));
      SIZES.forEach(z => sel.add(new Option(`${z.label.replace(/^\S+ /, '')} · ${z.hint}`, z.id)));
    }
    sel.value = value || 'orig';
  }

  // A 4×6 photo print at 300 dpi. A strip is printed twice side by side (cut down the middle), like a
  // real photo booth; other layouts are centred on the sheet in whichever way round fits best.
  function composePrint(src) {
    const strip = state.layout === 'strip', land = !strip && src.width > src.height;
    const W = land ? 1800 : 1200, H = land ? 1200 : 1800;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const fit = (x, y, w, h) => {
      const k = Math.min(w / src.width, h / src.height), dw = src.width * k, dh = src.height * k;
      ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };
    if (strip) {
      fit(24, 24, W / 2 - 48, H - 48); fit(W / 2 + 24, 24, W / 2 - 48, H - 48);
      ctx.strokeStyle = '#ccc'; ctx.setLineDash([12, 12]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    } else fit(36, 36, W - 72, H - 72);
    return cv;
  }
  const save = { mode: 'booth', pick: 0, strip: null, photos: [] };
  async function buildSaveSheet() {
    const name = `photobooth-${save.stamp}`;
    if (save.mode === 'booth') {
      if (!save.strip) { render(); save.strip = await toJpeg(toSocial(canvas, state.saveSize, state.saveFit)); }
      if (!save.strip) { toast('Could not create the image'); return; }
      showSaveSheet(save.strip, `${name}.jpg`, 'Your picture is ready 🎉', photoHint(), true);
    } else if (save.mode === 'print') {
      if (!save.print) { render(); save.print = await toJpeg(composePrint(canvas)); }
      showSaveSheet(save.print, `${name}-4x6.jpg`, 'Ready to print 🖨️',
        (state.layout === 'strip' ? 'Two strips on one 4×6 photo — cut down the middle. ' : '') +
        'Print at 4×6 in (10×15 cm), "fit to page" off, on a printer or at a photo kiosk.', true);
    } else {
      const idx = filledIdx();
      if (!save.photos.length) save.photos = await Promise.all(idx.map(async i => new File([await toJpeg(toSocial(composePhotoOnly(i), state.saveSize, state.saveFit))], `${name}-photo${i + 1}.jpg`, { type: 'image/jpeg' })));
      save.pick = Math.min(save.pick, save.photos.length - 1);
      const f = save.photos[save.pick];
      showSaveSheet(f, f.name, 'Your photos 📷', photoHint(), true);
      const all = save.photos.length > 1 && navigator.canShare && navigator.canShare({ files: save.photos });
      if (all) { $('shareBtn').hidden = false; $('shareBtn').textContent = `📤 Share all ${save.photos.length}`; }
    }
    // thumbnails to choose which photo to save
    const picks = $('savePicks'); picks.innerHTML = '';
    picks.hidden = save.mode !== 'photos' || save.photos.length < 2;
    save.photos.forEach((f, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Photo ' + (k + 1));
      b.setAttribute('aria-pressed', String(k === save.pick));
      const im = document.createElement('img'); im.src = URL.createObjectURL(f); im.onload = () => URL.revokeObjectURL(im.src);
      b.appendChild(im); b.addEventListener('click', () => { save.pick = k; buildSaveSheet(); });
      picks.appendChild(b);
    });
    $('saveSizeRow').hidden = save.mode === 'print';
    fillSizeSelect($('saveSize'), state.saveSize); $('saveFit').value = state.saveFit; $('saveFit').hidden = state.saveSize === 'orig';
    chipGroup($('saveModes'), [{ id: 'booth', label: '🎉 Design' }, { id: 'photos', label: '📷 Photos' }, { id: 'print', label: '🖨️ 4×6 print' }],
      m => save.mode === m.id, m => { save.mode = m.id; buildSaveSheet(); });
  }
  const resave = () => { Object.assign(save, { strip: null, photos: [] }); saveSettings(); buildSaveSheet(); };
  $('saveSize').addEventListener('change', (e) => { state.saveSize = e.target.value; resave(); });
  $('saveFit').addEventListener('change', (e) => { state.saveFit = e.target.value; resave(); });
  $('save').addEventListener('click', () => {
    Object.assign(save, { strip: null, print: null, photos: [], pick: 0, stamp: stamp() });
    buildSaveSheet();
  });
  $('printBtn').addEventListener('click', () => printImage(sheetFile));
  $('dlBtn').addEventListener('click', () => { if (!isIOS && sheetFile) setTimeout(() => toast('Saved ' + sheetFile.name), 300); });
  $('shareBtn').addEventListener('click', async () => {
    if (!sheetFile) return;
    const files = !$('saveModes').hidden && save.mode === 'photos' && save.photos.length > 1 ? save.photos : [sheetFile];
    try { await navigator.share({ files }); } catch (err) { /* cancelled */ }
  });
  function closeSheet() { $('saveSheet').hidden = true; syncScroll(); }
  $('sheetClose').addEventListener('click', closeSheet);
  $('saveSheet').addEventListener('click', (e) => { if (e.target.id === 'saveSheet') closeSheet(); });

  // ================= position & zoom editor =================
  const ed = { i: -1, aspect: 1, k: 1, pts: new Map(), g: null };
  const edCanvas = $('edCanvas');
  function slotAspect(i) {
    const L = computeLayout(state.layout, state.count);
    const ir = innerRect(L.rects[i], L.border);
    return ir.w / ir.h;
  }
  function filledIdx() { return state.photos.slice(0, state.count).map((p, i) => p ? i : -1).filter(i => i >= 0); }
  function openEditor(i) {
    if (!state.photos[i]) return;
    ed.i = i; ed.aspect = slotAspect(i);
    $('edNum').textContent = i + 1;
    const multi = filledIdx().length > 1;
    $('edPrev').style.visibility = $('edNext').style.visibility = multi ? 'visible' : 'hidden';
    $('editor').hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(drawEditor);
  }
  function closeEditor() {
    $('editor').hidden = true;
    document.body.style.overflow = '';
    ed.pts.clear(); ed.g = null;
    schedule();
  }
  function step(dir) {
    const f = filledIdx();
    openEditor(f[(f.indexOf(ed.i) + dir + f.length) % f.length]);
  }
  function commit(p) { const c = cropFor(p, ed.aspect); p.cx = c.cx; p.cy = c.cy; }
  function drawEditor() {
    const p = state.photos[ed.i];
    if (!p || $('editor').hidden) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = edCanvas.clientWidth, ch = edCanvas.clientHeight;
    if (edCanvas.width !== Math.round(cw * dpr) || edCanvas.height !== Math.round(ch * dpr)) {
      edCanvas.width = Math.round(cw * dpr); edCanvas.height = Math.round(ch * dpr);
    }
    const ctx = edCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const m = 24;
    let fw = cw - 2 * m, fh = fw / ed.aspect;
    if (fh > ch - 2 * m) { fh = ch - 2 * m; fw = fh * ed.aspect; }
    const fx = (cw - fw) / 2, fy = (ch - fh) / 2;
    const c = cropFor(p, ed.aspect);
    const k = fw / c.sw; ed.k = k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photoSource(p), fx - c.sx * k, fy - c.sy * k, p.canvas.width * k, p.canvas.height * k);
    const edShape = state.shape === 'rounded' ? 'rect' : state.shape;
    ctx.fillStyle = 'rgba(20,10,31,.72)';
    ctx.beginPath(); ctx.rect(0, 0, cw, ch); shapePath(ctx, edShape, fx, fy, fw, fh, 0); ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 1; t <= 2; t++) {
      ctx.moveTo(fx + fw * t / 3, fy); ctx.lineTo(fx + fw * t / 3, fy + fh);
      ctx.moveTo(fx, fy + fh * t / 3); ctx.lineTo(fx + fw, fy + fh * t / 3);
    }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); shapePath(ctx, edShape, fx, fy, fw, fh, 0); ctx.stroke();
    if (edShape !== 'rect') { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.strokeRect(fx, fy, fw, fh); }
    $('edZoom').value = p.zoom;
  }
  function startGesture() {
    const p = state.photos[ed.i];
    if (!p) return;
    commit(p);
    ed.g = { cx: p.cx, cy: p.cy, zoom: p.zoom, k: ed.k, pts: [...ed.pts.values()].map(q => ({ ...q })) };
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function moveGesture() {
    const p = state.photos[ed.i], g = ed.g;
    const pts = [...ed.pts.values()];
    if (!p || !g || !pts.length || !g.pts.length) return;
    let a0 = g.pts[0], a1 = pts[0];
    if (pts.length >= 2 && g.pts.length >= 2) {
      const d0 = dist(g.pts[0], g.pts[1]);
      if (d0 > 10) p.zoom = clamp(g.zoom * dist(pts[0], pts[1]) / d0, 1, ZMAX);
      a0 = mid(g.pts[0], g.pts[1]); a1 = mid(pts[0], pts[1]);
    }
    const kNow = g.k * p.zoom / g.zoom;
    p.cx = g.cx - (a1.x - a0.x) / (kNow * p.canvas.width);
    p.cy = g.cy - (a1.y - a0.y) / (kNow * p.canvas.height);
    commit(p);
    drawEditor(); schedule();
  }
  edCanvas.addEventListener('pointerdown', (e) => {
    edCanvas.setPointerCapture(e.pointerId);
    ed.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  });
  edCanvas.addEventListener('pointermove', (e) => {
    if (!ed.pts.has(e.pointerId)) return;
    ed.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moveGesture();
  });
  const endPtr = (e) => { if (ed.pts.delete(e.pointerId)) startGesture(); };
  edCanvas.addEventListener('pointerup', endPtr);
  edCanvas.addEventListener('pointercancel', endPtr);
  edCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.photos[ed.i]; if (!p) return;
    p.zoom = clamp(p.zoom * Math.exp(-e.deltaY * 0.002), 1, ZMAX);
    commit(p); drawEditor(); schedule();
  }, { passive: false });
  $('edZoom').addEventListener('input', (e) => {
    const p = state.photos[ed.i]; if (!p) return;
    p.zoom = Number(e.target.value);
    commit(p); drawEditor(); schedule();
  });
  $('edReset').addEventListener('click', () => {
    const p = state.photos[ed.i]; if (!p) return;
    p.zoom = 1; p.cx = null; p.cy = null;
    drawEditor(); schedule();
  });
  $('edDone').addEventListener('click', closeEditor);
  $('edReplace').addEventListener('click', () => pickReplace(ed.i, true));
  $('edPrev').addEventListener('click', () => step(-1));
  $('edNext').addEventListener('click', () => step(1));
  window.addEventListener('resize', () => requestAnimationFrame(drawEditor));

  canvas.addEventListener('click', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = (e.clientX - b.left) * canvas.width / b.width;
    const y = (e.clientY - b.top) * canvas.height / b.height;
    const L = computeLayout(state.layout, state.count);
    const pad = L.border * 1.5;
    let i = -1;
    for (let k = L.rects.length - 1; k >= 0; k--) {   // topmost first (scrapbook overlaps)
      const r = L.rects[k];
      if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) { i = k; break; }
    }
    if (i < 0) return;
    if (state.photos[i]) openPhotoMenu(i);
    else pickReplace(i);
  });

  // ================= collapsible sections =================
  const detailEls = [...document.querySelectorAll('details.card')];
  detailEls.forEach(d => d.addEventListener('toggle', () => {
    if (!d.open) return;
    detailEls.forEach(o => { if (o !== d) o.open = false; });   // one open at a time
    // bring the current choice into view in swipe rows
    d.querySelectorAll('.hscroll [aria-pressed="true"], .tgrid [aria-pressed="true"]').forEach(el => {
      const row = el.parentElement;
      row.scrollLeft = el.offsetLeft - row.offsetLeft - 8;
    });
    setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }));
  const labelOf = (list, id) => (list.find(x => x.id === id) || {}).label || '';
  const plain = (t) => t.replace(/^[^\p{L}\p{N}]+/u, '');
  function updateSummaries() {
    const set = (k, v) => { const el = $('sum-' + k); if (el) el.textContent = v; };
    set('occasion', PRESETS[state.preset] ? plain(PRESETS[state.preset].name) : 'Custom');
    set('background', THEMES[state.theme].name);
    set('message', state.line1.trim() || state.line2.trim() || 'No text');
    set('icons', (state.iconLeft || state.iconRight) ? `${state.iconLeft || '–'}  ${state.iconRight || '–'}` : 'None');
    set('layout', isCollage() ? `Collage · ${plain(labelOf(COLLAGES, state.layout))} · ${plain(labelOf(SIZES, state.collageSize))}`
      : `${plain(labelOf(LAYOUTS, state.layout))} · ${plain(labelOf(STYLES, state.style))}`);
    const frame = state.frameSize <= 0 ? 'No frame' : `${state.frame === 'custom' ? 'Custom' : state.frame[0].toUpperCase() + state.frame.slice(1)} frame`;
    set('frames', frame + (state.edge !== 'none' ? ' + border' : ''));
    set('filters', (PBFilters.byId[state.filter] || {}).name || 'Original');
    const nSt = curStickers().length;
    set('stickers', nSt ? `${nSt} on this layout` : 'None');
  }

  // ================= filter picker =================
  function filterSample() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 150;
    const x = c.getContext('2d');
    const p = state.photos.slice(0, state.count).find(Boolean);
    if (p) {
      const src = p.canvas, sq = Math.min(src.width, src.height);
      x.drawImage(src, (src.width - sq) / 2, (src.height - sq) * 0.2, sq, sq, 0, 0, 150, 150);
    } else {
      const g = x.createLinearGradient(0, 0, 150, 150); g.addColorStop(0, '#7ec8ff'); g.addColorStop(1, '#ffb3d1');
      x.fillStyle = g; x.fillRect(0, 0, 150, 150);
      x.fillStyle = '#f2c29b'; x.beginPath(); x.arc(75, 62, 30, 0, 7); x.fill();
      x.fillStyle = '#5b3a29'; x.beginPath(); x.arc(75, 50, 32, Math.PI, 0); x.fill();
      x.fillStyle = '#ff5fa2'; x.fillRect(35, 100, 80, 50);
      x.fillStyle = '#2b1740'; x.beginPath(); x.arc(64, 64, 3.5, 0, 7); x.arc(86, 64, 3.5, 0, 7); x.fill();
    }
    return c;
  }
  function buildFilterTiles() {
    const el = $('filterTiles');
    el.innerHTML = '';
    const sample = filterSample();
    PBFilters.LIST.forEach(f => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.dataset.id = f.id;
      const cv = PBFilters.apply(sample, f.id, 150);
      const label = document.createElement('span'); label.textContent = f.name;
      b.append(cv, label);
      b.addEventListener('click', () => {
        state.filter = f.id;
        markFilters();
        if (f.id === 'y2k' && (!state.stamp || state.stamp === 'off')) { state.stamp = 'yymd'; buildStampChips(); toast('📅 Date stamp on — change it under Filters'); }
        if (f.adv) toast('Applying ' + f.name + '…');
        setTimeout(schedule, 30);
      });
      el.appendChild(b);
    });
    markFilters();
    if (el._search) el._search();
  }
  function markFilters() {
    document.querySelectorAll('#filterTiles .tile').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === state.filter)));
  }
  let thumbTimer = null;
  function queueFilterThumbs() { clearTimeout(thumbTimer); thumbTimer = setTimeout(buildFilterTiles, 120); }

  // ================= stickers & props =================
  // Kinds: prop (clip art drawn in code, js/props.js), svg (stickers/<id>.svg), emoji and text.
  // A sticker's "unit" is st.s × min(W, H) pixels; stickerBox gives its width and height in units.
  // st.border is the die-cut outline colour ('' = none).
  const TEXT_SIZE = 0.4, BORDER_W = 0.055;
  const svgImgs = {};
  function svgImage(id) {
    let im = svgImgs[id];
    if (!im) {
      im = svgImgs[id] = new Image();
      im.onload = () => { schedule(); if (!$('stickerEd').hidden) drawStEd(); };
      im.src = 'stickers/' + id + '.svg';
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  const measureCtx = document.createElement('canvas').getContext('2d');
  function textFont(st, px) { const F = FONTS[st.font] || FONTS.playful; return `${F.main} ${px}px ${F.fam}`; }
  function stickerBox(st) {
    if (st.kind === 'emoji') return { w: 1, h: 1 };
    if (st.kind === 'svg') { const im = svgImage(st.id); return { w: 1, h: im ? im.naturalHeight / im.naturalWidth : 1 }; }
    if (st.kind === 'text') { const L = textLayout(st); return { w: L.w, h: L.h }; }
    return { w: 1, h: PBProps.height(st.id) };
  }
  // Text stickers: several lines, optionally bent into an arc (st.curve -1…1: frown…rainbow).
  // Everything is in units at font size TEXT_SIZE; cached because it's measured on every draw.
  const textCache = new Map();
  function textLayout(st) {
    const key = [st.text, st.font, st.curve || 0].join('|');
    let L = textCache.get(key);
    if (L) return L;
    measureCtx.font = textFont(st, 100);
    const fs = TEXT_SIZE, lh = fs * 1.2, curve = st.curve || 0;
    const lines = String(st.text || ' ').split('\n').map(t => {
      const chars = [...t].map(ch => ({ ch, w: measureCtx.measureText(ch).width / 100 * fs }));
      return { t, chars, w: Math.max(fs * .3, measureCtx.measureText(t).width / 100 * fs) };
    });
    const maxW = Math.max(...lines.map(l => l.w));
    let w = maxW, h = lines.length * lh, bend = 0;
    if (curve) {
      // an arc spanning up to 180°; its depth is added to the height
      const th = Math.abs(curve) * Math.PI, R = maxW / th;
      bend = R * (1 - Math.cos(th / 2));
      w = Math.max(maxW * .4, 2 * R * Math.sin(Math.min(th, Math.PI) / 2)) + fs * .3;
      h += bend;
    }
    L = { lines, w: Math.max(.2, w), h, lh, fs, curve, bend, maxW };
    textCache.set(key, L); if (textCache.size > 200) textCache.delete(textCache.keys().next().value);
    return L;
  }
  function paintText(c, st, u) {
    const L = textLayout(st), px = u * L.fs;
    c.font = textFont(st, px); c.fillStyle = st.color || '#ff2d87'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const top = -L.h / 2 + (L.curve < 0 ? L.bend : 0);
    L.lines.forEach((line, i) => {
      const y = (top + L.lh * (i + .5)) * u + px * .06;
      if (!L.curve) { c.fillText(line.t, 0, y); return; }
      // place each letter along a circle: centre below the line for a rainbow, above for a frown
      const th = Math.abs(L.curve) * Math.PI * (line.w / L.maxW), R = line.w / th * u, dir = L.curve > 0 ? 1 : -1;
      let x = -line.w * u / 2;
      line.chars.forEach(({ ch, w }) => {
        const mid = x + w * u / 2, a = mid / R;
        c.save();
        c.translate(Math.sin(a) * R, y + dir * (R - Math.cos(a) * R));
        c.rotate(dir * a);
        c.fillText(ch, 0, 0);
        c.restore();
        x += w * u;
      });
    });
  }
  function stickerFit(st) {
    if (st.kind === 'svg') { const d = (self.PBStickers || []).find(x => x.id === st.id); return d && d.face || null; }
    return PBProps.fit(st.kind, st.id);
  }
  function borderOf(st) { return st.border != null ? st.border : (st.kind === 'emoji' ? '#ffffff' : ''); }
  // draws the sticker itself, centred on (0,0), `u` pixels to the unit
  function paintSticker(c, st, u) {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (st.kind === 'emoji') {
      c.font = `${u * 0.86}px ${EMOJI}`; c.fillStyle = '#000';
      c.fillText(st.id, 0, u * 0.04);
    } else if (st.kind === 'svg') {
      const im = svgImage(st.id);
      if (im) { const h = u * im.naturalHeight / im.naturalWidth; c.drawImage(im, -u / 2, -h / 2, u, h); }
    } else if (st.kind === 'text') {
      paintText(c, st, u);
    } else PBProps.draw(c, st.id, u, st.text);
  }
  // Stickers are rendered once into a small bitmap (with their outline) and reused; sizes are
  // rounded to 8% steps so a face-tracked sticker that grows and shrinks doesn't redraw every frame.
  const bmCache = new Map();
  function stickerBitmap(st, px) {
    const q = Math.max(8, Math.round(Math.pow(1.08, Math.round(Math.log(Math.max(8, px)) / Math.log(1.08)))));
    const border = borderOf(st);
    const key = [st.kind, st.id, st.text, st.color, st.font, st.curve, border, q].join('|');
    let bm = bmCache.get(key);
    if (bm) { bmCache.delete(key); bmCache.set(key, bm); return bm; }
    if (st.kind === 'svg' && !svgImage(st.id)) return null;
    const box = stickerBox(st), bw = border ? Math.max(1.5, q * BORDER_W) : 0, pad = Math.ceil(bw + q * 0.12 + 2);
    const w = Math.ceil(q * box.w + 2 * pad), h = Math.ceil(q * box.h + 2 * pad);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.translate(w / 2, h / 2); paintSticker(x, st, q);
    let out = c;
    if (border) {
      // outline: the sticker's silhouette stamped in a ring around it, filled with the border colour
      out = document.createElement('canvas'); out.width = w; out.height = h;
      const o = out.getContext('2d');
      for (const r of [bw, bw * .6, bw * .3]) {
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; o.drawImage(c, Math.cos(a) * r, Math.sin(a) * r); }
      }
      o.globalCompositeOperation = 'source-in'; o.fillStyle = border; o.fillRect(0, 0, w, h);
      o.globalCompositeOperation = 'source-over'; o.drawImage(c, 0, 0);
    }
    bm = { c: out, q, w, h };
    bmCache.set(key, bm);
    if (bmCache.size > 150) bmCache.delete(bmCache.keys().next().value);
    return bm;
  }
  // Sticker motion for videos (and the video sticker studio): time in seconds, or null for stills.
  const ANIMS = [
    { id: '', label: 'Still' }, { id: 'wiggle', label: '〰️ Wiggle' }, { id: 'pulse', label: '💓 Pulse' }, { id: 'bounce', label: '⛹️ Bounce' },
    { id: 'spin', label: '🌀 Spin' }, { id: 'float', label: '🎈 Float' }, { id: 'flash', label: '✨ Flash' }
  ];
  function animate(ctx, st, unit, t) {
    const ph = (st.x * 7 + st.y * 13) % 6.28;               // stickers don't all move in step
    switch (st.anim) {
      case 'wiggle': ctx.rotate(Math.sin(t * 9 + ph) * .18); break;
      case 'pulse': { const k = 1 + .12 * Math.sin(t * 7 + ph); ctx.scale(k, k); break; }
      case 'bounce': ctx.translate(0, -Math.abs(Math.sin(t * 5 + ph)) * unit * .25); break;
      case 'spin': ctx.rotate(t * 3.5 + ph); break;
      case 'float': ctx.translate(Math.sin(t * 1.6 + ph) * unit * .08, Math.sin(t * 2.3 + ph) * unit * .12); break;
      case 'flash': ctx.globalAlpha *= .35 + .65 * (Math.sin(t * 8 + ph) > 0 ? 1 : 0); break;
    }
  }
  function drawSticker(ctx, st, W, H, t) {
    const unit = st.s * Math.min(W, H);
    ctx.save();
    ctx.translate(st.x * W, st.y * H);
    ctx.rotate(st.r || 0);
    if (st.anim && t != null) animate(ctx, st, unit, t);
    if (st.flip) ctx.scale(-1, 1);
    if (st.kind === 'prop' && !borderOf(st)) PBProps.draw(ctx, st.id, unit, st.text);   // crisp vectors
    else {
      const m = ctx.getTransform(), bm = stickerBitmap(st, unit * (Math.hypot(m.a, m.b) || 1));
      if (bm) { const k = unit / bm.q; ctx.drawImage(bm.c, -bm.w * k / 2, -bm.h * k / 2, bm.w * k, bm.h * k); }
    }
    ctx.restore();
  }
  function curStickers() {
    const k = state.layout + state.count;
    return state.stickerSets[k] || (state.stickerSets[k] = []);
  }
  // Attached stickers (st.face) are re-placed on their face before drawing; `track` switches from
  // "same face in the same photo" (strips) to following the nearest face frame by frame (videos).
  function drawStickers(ctx, list, W, H, faces, track, t) {
    (list || []).forEach(st => {
      let f = null;
      if (st.face && faces) {
        f = track ? trackFace(st, faces, track, W, H)
          : st.face.cam ? faces.find(g => g.slot === st.face.slot && g.idx === st.face.idx) : faceFor(st, faces, W, H);
        if (f) fitToFace(st, f, W, H);
      }
      // props picked in the camera only show up on an actual face
      st._hidden = !!(st.face && st.face.cam && !f);
      if (!st._hidden) drawSticker(ctx, st, W, H, t);
    });
  }

  // ================= face attachment =================
  // Faces are stored in picture coordinates: points as fractions of W and H, the eye-to-eye
  // distance `d` as a fraction of min(W, H) (the same unit as sticker size) and the tilt `a`.
  // An attached sticker keeps its offset from an anchor point, in eye-distances, turned with the head.

  // where a point of a photo's own pixels lands on the picture (same maths as drawPhoto)
  function photoXform(p, rect, jit, border) {
    const ir = innerRect(rect, border), px = -ir.w / 2, py = -rect.h / 2;
    const c = cropFor(p, ir.w / ir.h), k = ir.w / c.sw;
    const a = jit.deg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    const ox = rect.x + rect.w / 2 + jit.dx, oy = rect.y + rect.h / 2 + jit.dy;
    return {
      crop: c,
      // makes `ctx` (drawing the photo's pixels from (x0, y0) at `scale`) accept picture coordinates, e.g. for stickers
      toPhoto(ctx, scale, x0, y0) {
        ctx.scale(scale, scale); ctx.translate(c.sx - x0, c.sy - y0);
        ctx.scale(1 / k, 1 / k); ctx.translate(-px, -py); ctx.rotate(-a); ctx.translate(-ox, -oy);
      },
      inside: (q) => q.x >= c.sx && q.x <= c.sx + c.sw && q.y >= c.sy && q.y <= c.sy + c.sh,
      map(q) {
        const lx = px + (q.x - c.sx) * k, ly = py + (q.y - c.sy) * k;
        return { x: ox + lx * cos - ly * sin, y: oy + lx * sin + ly * cos };
      }
    };
  }
  function placeFaces(raw, T, slot, W, H) {
    const m = Math.min(W, H), out = [];
    (raw || []).forEach((f, idx) => {
      if (!T.inside({ x: (f.eye1.x + f.eye2.x) / 2, y: (f.eye1.y + f.eye2.y) / 2 })) return; // cropped out
      const P = PBFace.pose({ eye1: T.map(f.eye1), eye2: T.map(f.eye2), nose: T.map(f.nose), mouth: T.map(f.mouth) });
      const pts = {};
      for (const k in P.pts) pts[k] = { x: P.pts[k].x / W, y: P.pts[k].y / H };
      out.push({ slot, idx, d: P.d / m, a: P.a, pts });
    });
    return out;
  }
  // faces in the current strip layout (photos whose faces have been found)
  function stripFaces() {
    const L = computeLayout(state.layout, state.count), tr = mulberry32(state.seed * 3 + 11), faces = [];
    L.rects.forEach((rect, i) => {
      const jit = jitterFor(rect, tr), p = state.photos[i];   // jitterFor must run for every slot, like composeInto
      if (!p) return;
      ensureFaces(p);
      if (p._faces) faces.push(...placeFaces(p._faces, photoXform(p, rect, jit, L.border), i, L.W, L.H));
    });
    return faces;
  }
  function ensureFaces(p) {
    if (!p || p._faces !== undefined) return;
    p._faces = null;                                           // looking…
    PBFace.load().then(ok => { p._faces = ok ? (PBFace.detect(p.canvas) || []) : []; facesChanged(); });
  }
  function facesChanged() {
    schedule();
    if (!$('stickerEd').hidden && stEd.getFaces) { stEd.faces = stEd.getFaces(); drawStEd(); }
  }

  function anchorPx(f, at, W, H) { const q = f.pts[at] || f.pts.eyes; return { x: q.x * W, y: q.y * H }; }
  function fitToFace(st, f, W, H) {
    const F = st.face, A = anchorPx(f, F.at, W, H), d = f.d * Math.min(W, H);
    const c = Math.cos(f.a), s = Math.sin(f.a);
    st.x = (A.x + (F.x * c - F.y * s) * d) / W;
    st.y = (A.y + (F.x * s + F.y * c) * d) / H;
    st.s = F.s * f.d;
    st.r = f.a + F.r;
  }
  // re-measure an attached sticker's offset after it was moved, resized or turned by hand
  function refit(st, f, W, H) {
    const F = st.face, A = anchorPx(f, F.at, W, H), d = f.d * Math.min(W, H);
    const c = Math.cos(f.a), s = Math.sin(f.a), dx = st.x * W - A.x, dy = st.y * H - A.y;
    F.x = (dx * c + dy * s) / d; F.y = (-dx * s + dy * c) / d;
    F.s = st.s / f.d; F.r = (st.r || 0) - f.a;
    F.slot = f.slot; F.idx = f.idx; F.home = { x: f.pts.eyes.x, y: f.pts.eyes.y, d: f.d };
  }
  function attachTo(st, f, fit, W, H) {
    st.face = { at: (fit && fit.at) || 'eyes', x: 0, y: 0, s: 1, r: 0 };
    if (fit) {
      Object.assign(st.face, { x: fit.x || 0, y: fit.y || 0, s: fit.s });
      fitToFace(st, f, W, H);
    }
    refit(st, f, W, H);
  }
  // how far a sticker is from a face, in that face's eye-distances
  function faceDist(st, f, W, H) {
    const e = f.pts.eyes;
    return Math.hypot((st.x - e.x) * W, (st.y - e.y) * H) / (f.d * Math.min(W, H));
  }
  function nearestFace(st, faces, W, H) {
    let best = null, bd = Infinity;
    (faces || []).forEach(f => { const dd = faceDist(st, f, W, H); if (dd < bd) { bd = dd; best = f; } });
    return best && { f: best, dist: bd };
  }
  function faceFor(st, faces, W, H) {
    const F = st.face, inSlot = faces.filter(f => f.slot === F.slot);
    const same = inSlot.find(f => f.idx === F.idx);
    if (same || !inSlot.length) return same || null;
    // the photo changed: move to whoever is closest to where the old face was
    const ref = F.home ? { x: F.home.x, y: F.home.y } : st;
    return nearestFace(ref, inSlot, W, H).f;
  }
  // videos: follow the face nearest to where it was last frame, smoothing out the jitter
  function trackFace(st, faces, track, W, H) {
    const prev = track.get(st);
    const ref = prev ? { x: prev.pts.eyes.x, y: prev.pts.eyes.y, d: prev.d } : st.face.home;
    if (!ref) {                                                // camera props: start on the n-th face from the left
      const f = faces[st.face.idx || 0];
      if (f) track.set(st, f);
      return f || null;
    }
    let best = null, bd = prev ? 2.5 : 8;
    faces.forEach(f => {
      const dd = Math.hypot((f.pts.eyes.x - ref.x) * W, (f.pts.eyes.y - ref.y) * H) / (ref.d * Math.min(W, H));
      if (dd < bd) { bd = dd; best = f; }
    });
    if (!best) return prev || null;                            // lost for a moment: hold still
    let next = best;
    if (prev) {
      const k = 0.6, lerp = (a, b) => a + (b - a) * k, pts = {};
      for (const key in best.pts) pts[key] = { x: lerp(prev.pts[key].x, best.pts[key].x), y: lerp(prev.pts[key].y, best.pts[key].y) };
      let da = best.a - prev.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      next = { ...best, pts, d: lerp(prev.d, best.d), a: prev.a + da * k };
    }
    track.set(st, next);
    return next;
  }
  function stickerHalf(st, W, H) {
    const unit = st.s * Math.min(W, H), b = stickerBox(st), pad = borderOf(st) ? unit * BORDER_W : 0;
    return { hw: unit * b.w / 2 + pad, hh: unit * b.h / 2 + pad };
  }
  function hitSticker(list, px, py, W, H) {
    for (let i = list.length - 1; i >= 0; i--) {
      const st = list[i], dx = px - st.x * W, dy = py - st.y * H;
      if (st._hidden) continue;
      const c = Math.cos(-(st.r || 0)), sn = Math.sin(-(st.r || 0));
      const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
      const { hw, hh } = stickerHalf(st, W, H);
      if (Math.abs(lx) <= hw + 12 && Math.abs(ly) <= hh + 12) return i;
    }
    return -1;
  }

  const stEd = { list: null, base: null, sel: -1, pts: new Map(), g: null, onDone: null, tab: 'props', view: null, before: '',
    faces: null, getFaces: null };
  const stc = $('stCanvas');
  function openStickers(opts) {
    stEd.list = opts.list; stEd.base = opts.getBase(); stEd.onDone = opts.onDone; stEd.sel = -1;
    if (opts.tab) stEd.tab = opts.tab;
    stEd.video = !!opts.video;
    stEd.before = JSON.stringify(stEd.list);
    stEd.getFaces = opts.getFaces || null; stEd.faces = stEd.getFaces ? stEd.getFaces() : null;
    stEd.hist = [JSON.stringify(stEd.list)]; stEd.hi = 0; syncUndo();
    $('stickerEd').hidden = false; syncScroll();
    buildStickerTray();
    requestAnimationFrame(drawStEd);
  }
  function closeStickers() {
    $('stickerEd').hidden = true; syncScroll();
    stEd.pts.clear();
    const cb = stEd.onDone, changed = JSON.stringify(stEd.list) !== stEd.before;
    stEd.onDone = null; stEd.getFaces = null; stEd.faces = null;
    if (cb) cb(changed);
  }
  function stView() {
    const dpr = window.devicePixelRatio || 1, cw = stc.clientWidth, ch = stc.clientHeight;
    if (stc.width !== Math.round(cw * dpr) || stc.height !== Math.round(ch * dpr)) { stc.width = Math.round(cw * dpr); stc.height = Math.round(ch * dpr); }
    const B = stEd.base, m = 12;
    const sc = Math.min((cw - 2 * m) / B.width, (ch - 2 * m) / B.height);
    const w = B.width * sc, h = B.height * sc;
    return { dpr, cw, ch, x: (cw - w) / 2, y: (ch - h) / 2, w, h };
  }
  // ---- undo / redo: a snapshot is taken shortly after each change settles (not on every drag frame) ----
  let histTimer = 0;
  function noteChange() {
    clearTimeout(histTimer);
    histTimer = setTimeout(() => {
      if (!stEd.hist || stEd.pts.size) { if (stEd.pts.size) noteChange(); return; }
      const snap = JSON.stringify(stEd.list);
      if (snap === stEd.hist[stEd.hi]) return;
      stEd.hist.splice(stEd.hi + 1); stEd.hist.push(snap);
      if (stEd.hist.length > 80) stEd.hist.shift();
      stEd.hi = stEd.hist.length - 1; syncUndo();
    }, 350);
  }
  function syncUndo() {
    $('stUndo').disabled = !stEd.hist || stEd.hi <= 0;
    $('stRedo').disabled = !stEd.hist || stEd.hi >= stEd.hist.length - 1;
  }
  function stepHist(d) {
    clearTimeout(histTimer);
    const i = stEd.hi + d;
    if (!stEd.hist || i < 0 || i >= stEd.hist.length) return;
    stEd.hi = i;
    stEd.list.splice(0, stEd.list.length, ...JSON.parse(stEd.hist[i]));
    stEd.sel = -1; syncUndo(); drawStEd(true);
  }
  $('stUndo').addEventListener('click', () => stepHist(-1));
  $('stRedo').addEventListener('click', () => stepHist(1));
  document.addEventListener('keydown', (e) => {
    if ($('stickerEd').hidden || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); stepHist(e.shiftKey ? 1 : -1); return; }
    if (mod && k === 'y') { e.preventDefault(); stepHist(1); return; }
    const st = stEd.list[stEd.sel];
    if (!st) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); $('stDelete').click(); return; }
    const step = e.shiftKey ? .02 : .005, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) { e.preventDefault(); st.x = clamp(st.x + mv[0], 0, 1); st.y = clamp(st.y + mv[1], 0, 1); refitSel(st, false); drawStEd(); }
    if (e.key === 'Escape') { stEd.sel = -1; drawStEd(); }
  });

  function drawStEd(fromHistory) {
    if (fromHistory !== true) noteChange();
    stc.dataset.count = stEd.list.length;
    if ($('stickerEd').hidden) return;
    const V = stView(); stEd.view = V;
    const ctx = stc.getContext('2d');
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.clearRect(0, 0, V.cw, V.ch);
    ctx.drawImage(stEd.base, V.x, V.y, V.w, V.h);
    ctx.save();
    ctx.translate(V.x, V.y);
    ctx.beginPath(); ctx.rect(0, 0, V.w, V.h); ctx.clip();
    const moving = stEd.video && stEd.list.some(s => s.anim);
    drawStickers(ctx, stEd.list, V.w, V.h, stEd.faces, null, moving ? performance.now() / 1000 : null);
    if (moving && !stEd.animRaf) stEd.animRaf = requestAnimationFrame(() => { stEd.animRaf = 0; drawStEd(true); });
    const st = stEd.list[stEd.sel];
    if (st) {
      const f = st.face && stEd.faces && faceFor(st, stEd.faces, V.w, V.h);
      if (f) {
        // show which face it's stuck to
        const e = f.pts.eyes, d = f.d * Math.min(V.w, V.h);
        ctx.save(); ctx.translate(e.x * V.w, e.y * V.h + d * .45); ctx.rotate(f.a);
        ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,95,162,.9)';
        ctx.beginPath(); ctx.ellipse(0, 0, d * 1.25, d * 1.65, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const { hw, hh } = stickerHalf(st, V.w, V.h);
      ctx.translate(st.x * V.w, st.y * V.h); ctx.rotate(st.r || 0);
      ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(-hw - 6, -hh - 6, 2 * hw + 12, 2 * hh + 12);
      ctx.strokeStyle = st.face ? '#ff5fa2' : '#8a4dff'; ctx.lineDashOffset = 5.5; ctx.strokeRect(-hw - 6, -hh - 6, 2 * hw + 12, 2 * hh + 12);
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(hw + 6, -hh - 6, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = st.face ? '#ff5fa2' : '#8a4dff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(hw + 6, -hh - 6, 5.5, -Math.PI * .9, Math.PI * .4); ctx.stroke();   // little turn arrow
    }
    ctx.restore();
    $('stTools').hidden = !st;
    if (st) syncStyle(st);
    const n = stEd.faces ? stEd.faces.length : 0;
    const hint = 'Drag · pinch or use the corner ↻ to resize & turn';
    const loadingFaces = PBFace.status === 'loading' || PBFace.status === 'idle';
    $('stFaceBar').hidden = !(stEd.getFaces && loadingFaces);
    $('stFaceBar').firstChild.style.width = Math.round(PBFace.progress * 100) + '%';
    $('stSub').textContent = !stEd.getFaces || PBFace.status === 'failed' ? hint
      : loadingFaces ? `⏳ Getting face tracking ready… ${Math.round(PBFace.progress * 100)}% · stickers work now`
      : !stEd.faces ? '🔍 Looking for faces…'
      : n ? `🙂 ${n} face${n === 1 ? '' : 's'} · props stick on`
      : 'No faces found · drag props into place';
  }
  // the round handle at the selected sticker's top-right corner, in view coordinates
  function handlePos() {
    const st = stEd.list && stEd.list[stEd.sel], V = stEd.view;
    if (!st || !V) return null;
    const { hw, hh } = stickerHalf(st, V.w, V.h), a = st.r || 0, x = hw + 6, y = -hh - 6;
    return { x: st.x * V.w + x * Math.cos(a) - y * Math.sin(a), y: st.y * V.h + x * Math.sin(a) + y * Math.cos(a) };
  }
  function stLocal(e) { const b = stc.getBoundingClientRect(), V = stEd.view; return { x: e.clientX - b.left - V.x, y: e.clientY - b.top - V.y }; }
  function startStG() {
    const st = stEd.list[stEd.sel];
    stEd.g = st ? { st: { ...st }, face0: st.face ? { ...st.face } : null, pts: [...stEd.pts.values()].map(q => ({ ...q })) } : null;
  }
  function moveStG() {
    const g = stEd.g, st = stEd.list[stEd.sel], V = stEd.view;
    if (!g || !st) return;
    const pts = [...stEd.pts.values()];
    if (stEd.handle && pts.length === 1) {
      const c = { x: g.st.x * V.w, y: g.st.y * V.h }, p0 = g.pts[0], p1 = pts[0];
      const d0 = dist(c, p0);
      if (d0 > 4) st.s = clamp(g.st.s * dist(c, p1) / d0, .03, 2.5);
      st.r = (g.st.r || 0) + Math.atan2(p1.y - c.y, p1.x - c.x) - Math.atan2(p0.y - c.y, p0.x - c.x);
    } else if (pts.length >= 2 && g.pts.length >= 2) {
      const d0 = dist(g.pts[0], g.pts[1]);
      if (d0 > 8) st.s = clamp(g.st.s * dist(pts[0], pts[1]) / d0, .03, 2.5);
      const a0 = Math.atan2(g.pts[1].y - g.pts[0].y, g.pts[1].x - g.pts[0].x);
      const a1 = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      st.r = (g.st.r || 0) + (a1 - a0);
      const m0 = mid(g.pts[0], g.pts[1]), m1 = mid(pts[0], pts[1]);
      st.x = clamp(g.st.x + (m1.x - m0.x) / V.w, 0, 1); st.y = clamp(g.st.y + (m1.y - m0.y) / V.h, 0, 1);
    } else {
      st.x = clamp(g.st.x + (pts[0].x - g.pts[0].x) / V.w, 0, 1);
      st.y = clamp(g.st.y + (pts[0].y - g.pts[0].y) / V.h, 0, 1);
    }
    refitSel(st, false);
    drawStEd();
  }
  // keep an attached sticker's offset in step with a hand edit. When let go on another face
  // (about where it sat on its old one), it moves over to that face.
  function refitSel(st, settle) {
    if (!st || !st.face || !stEd.faces || !stEd.faces.length) return;
    const W = stEd.base.width, H = stEd.base.height, m = Math.min(W, H);
    let f = faceFor(st, stEd.faces, W, H);
    const F0 = settle && stEd.g && stEd.g.face0;
    if (F0) {
      const tmp = { face: F0 };
      let bd = 1.2;
      stEd.faces.forEach(g => {
        fitToFace(tmp, g, W, H);
        const dd = Math.hypot((tmp.x - st.x) * W, (tmp.y - st.y) * H) / (g.d * m);
        if (dd < bd) { bd = dd; f = g; }
      });
    }
    if (f) refit(st, f, W, H);
  }
  stc.addEventListener('pointerdown', (e) => {
    stc.setPointerCapture(e.pointerId);
    const pt = stLocal(e);
    stEd.pts.set(e.pointerId, pt);
    stEd.handle = false;
    if (stEd.pts.size === 1) {
      const h = handlePos();
      if (h && dist(pt, h) < 22) stEd.handle = true;          // corner handle: turn & resize with one finger / mouse
      else stEd.sel = hitSticker(stEd.list, pt.x, pt.y, stEd.view.w, stEd.view.h);
    }
    startStG(); drawStEd();
  });
  stc.addEventListener('pointermove', (e) => { if (!stEd.pts.has(e.pointerId)) return; stEd.pts.set(e.pointerId, stLocal(e)); moveStG(); });
  const stEnd = (e) => {
    if (!stEd.pts.delete(e.pointerId)) return;
    if (!stEd.pts.size && stEd.g) { refitSel(stEd.list[stEd.sel], true); drawStEd(); }
    if (!stEd.pts.size) stEd.handle = false;
    startStG();
  };
  stc.addEventListener('pointerup', stEnd);
  stc.addEventListener('pointercancel', stEnd);
  stc.addEventListener('wheel', (e) => {
    e.preventDefault();
    const st = stEd.list[stEd.sel]; if (!st) return;
    if (e.shiftKey || e.altKey) st.r = (st.r || 0) + (e.deltaY || e.deltaX) * 0.004;   // shift + scroll turns
    else st.s = clamp(st.s * Math.exp(-e.deltaY * 0.002), .03, 2.5);
    refitSel(st, false); drawStEd();
  }, { passive: false });
  window.addEventListener('resize', () => requestAnimationFrame(drawStEd));

  function addSticker(st) {
    st.x = 0.5 + (Math.random() - .5) * .16; st.y = 0.4 + (Math.random() - .5) * .16;
    st.r = 0; st.flip = false; st.s = st.s || .34;
    const fit = stickerFit(st), faces = stEd.faces;
    // stickers get a white die-cut outline, except things that sit on a face (glasses with a white rim look odd)
    if (st.border == null) st.border = st.kind === 'prop' || fit ? '' : '#ffffff';
    if (fit && faces && faces.length) {
      // snap onto the face that has the fewest of this prop so far
      const count = (f) => stEd.list.filter(o => o.face && o.id === st.id && o.face.slot === f.slot && o.face.idx === f.idx).length;
      const f = faces.reduce((a, b) => (count(b) < count(a) ? b : a));
      attachTo(st, f, fit, stEd.base.width, stEd.base.height);
    }
    stEd.list.push(st); stEd.sel = stEd.list.length - 1;
    drawStEd();
  }
  const withSel = (fn) => () => { const st = stEd.list[stEd.sel]; if (st) { fn(st); refitSel(st, false); drawStEd(); } };
  function noFacesMsg() {
    toast(PBFace.status === 'failed' ? "Face finding isn't available on this device"
      : !stEd.faces || PBFace.status === 'loading' ? 'Still looking for faces — try again in a moment' : 'No faces found in this picture');
  }
  $('stAttach').addEventListener('click', () => {
    const st = stEd.list[stEd.sel]; if (!st) return;
    if (st.face) { delete st.face; toast('Unstuck — it stays put now'); drawStEd(); return; }
    const W = stEd.base.width, H = stEd.base.height, n = nearestFace(st, stEd.faces, W, H);
    if (!n) { noFacesMsg(); return; }
    attachTo(st, n.f, null, W, H);
    toast('🔗 Stuck to that face'); drawStEd();
  });
  $('stEveryone').addEventListener('click', () => {
    const st = stEd.list[stEd.sel]; if (!st) return;
    const W = stEd.base.width, H = stEd.base.height, faces = stEd.faces || [];
    if (!faces.length) { noFacesMsg(); return; }
    if (!st.face) attachTo(st, nearestFace(st, faces, W, H).f, stickerFit(st), W, H);
    const has = (f) => stEd.list.some(o => o.face && o.id === st.id && o.text === st.text && o.face.slot === f.slot && o.face.idx === f.idx);
    let added = 0;
    faces.forEach(f => {
      if (has(f)) return;
      const c = JSON.parse(JSON.stringify(st));
      c.face.slot = f.slot; c.face.idx = f.idx; c.face.home = { x: f.pts.eyes.x, y: f.pts.eyes.y, d: f.d };
      fitToFace(c, f, W, H);
      stEd.list.push(c); added++;
    });
    toast(added ? `👥 Added to ${added} more face${added === 1 ? '' : 's'}` : 'Everyone already has one');
    drawStEd();
  });
  $('stSmaller').addEventListener('click', withSel(st => { st.s = Math.max(.03, st.s * .85); }));
  $('stBigger').addEventListener('click', withSel(st => { st.s = Math.min(2.5, st.s * 1.18); }));
  $('stRotL').addEventListener('click', withSel(st => { st.r = (st.r || 0) - Math.PI / 12; }));
  $('stRotR').addEventListener('click', withSel(st => { st.r = (st.r || 0) + Math.PI / 12; }));
  $('stFlip').addEventListener('click', withSel(st => { st.flip = !st.flip; }));
  $('stFront').addEventListener('click', () => {
    const i = stEd.sel; if (i < 0) return;
    const [st] = stEd.list.splice(i, 1); stEd.list.push(st); stEd.sel = stEd.list.length - 1; drawStEd();
  });
  $('stDupe').addEventListener('click', () => {
    const st = stEd.list[stEd.sel]; if (!st) return;
    const c = JSON.parse(JSON.stringify(st));
    delete c.face;                                             // the copy is free to go anywhere
    c.x = clamp(c.x + .05, 0, 1); c.y = clamp(c.y + .05, 0, 1);
    stEd.list.push(c); stEd.sel = stEd.list.length - 1; drawStEd();
  });
  $('stDelete').addEventListener('click', () => { if (stEd.sel < 0) return; stEd.list.splice(stEd.sel, 1); stEd.sel = -1; drawStEd(); });
  $('stClear').addEventListener('click', () => {
    if (!stEd.list.length || !confirm('Remove all stickers?')) return;
    stEd.list.length = 0; stEd.sel = -1; drawStEd();
  });
  $('stDone').addEventListener('click', closeStickers);

  function propIcon(id, text) {
    const c = document.createElement('canvas'); c.width = 112; c.height = 112;
    const x = c.getContext('2d');
    const h = PBProps.height(id), unit = Math.min(100, 96 / h);
    x.translate(56, 56); PBProps.draw(x, id, unit, text);
    return c;
  }
  function svgIcon(id) {
    const im = document.createElement('img'); im.src = 'stickers/' + id + '.svg'; im.alt = ''; im.draggable = false;
    svgImage(id);                                              // warm the cache so it draws straight away
    return im;
  }
  const STICKER_TABS = [{ id: 'props', label: '🎩 Props' }, { id: 'fun', label: '🤪 Fun' }, { id: 'words', label: '🔤 Text' }, { id: 'emoji', label: '😀 Emoji' }];
  let emojiCat = 0, emojiQuery = '';
  function emojiList() {
    const D = window.PBEmojiData || [];
    const split = (g) => g.list.split('\t').map(x => {
      const tone = x[0] === '~', y = tone ? x.slice(1) : x, i = y.indexOf(' ');
      return { e: tone ? withTone(y.slice(0, i)) : y.slice(0, i), n: y.slice(i + 1) };
    });
    if (emojiQuery) {
      const q = emojiQuery.toLowerCase();
      return D.flatMap(split).filter(x => x.n.includes(q)).slice(0, 300);
    }
    return D[emojiCat] ? split(D[emojiCat]) : PBProps.EMOJI.map(e => ({ e, n: '' }));
  }
  // skin tone: the modifier goes right after the first character (replacing an emoji-style selector)
  const TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
  function withTone(e) {
    if (!state.tone) return e;
    const cps = [...e];
    const rest = cps.slice(1); if (rest[0] === '\uFE0F') rest.shift();
    return cps[0] + state.tone + rest.join('');
  }
  function buildStickerTray() {
    chipGroup($('stTabs'), STICKER_TABS, t => stEd.tab === t.id, t => { stEd.tab = t.id; emojiQuery = ''; $('stSearch').value = ''; buildStickerTray(); });
    const el = $('stItems'); el.innerHTML = ''; el.scrollLeft = 0; el.scrollTop = 0;
    el.classList.toggle('grid', stEd.tab === 'emoji');
    $('stCats').hidden = false;
    $('stCatChips').hidden = $('stTones').hidden = stEd.tab !== 'emoji';
    $('stSearch').placeholder = { props: 'Search props', fun: 'Search stickers', words: 'Search words', emoji: 'Search emoji' }[stEd.tab];
    const add = (content, onClick, cls, title) => {
      const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls;
      if (title) { b.title = title; b.setAttribute('aria-label', title); }
      if (typeof content === 'string') b.textContent = content; else b.appendChild(content);
      b.addEventListener('click', onClick); el.appendChild(b);
      return b;
    };
    if (stEd.tab === 'props') {
      PBProps.LIST.forEach(pr => add(propIcon(pr.id), () => addSticker({ kind: 'prop', id: pr.id, s: pr.h > 1 ? .26 : .36 }), '', pr.name));
    } else if (stEd.tab === 'fun') {
      (self.PBStickers || []).forEach(d => add(svgIcon(d.id), () => addSticker({ kind: 'svg', id: d.id, s: d.face ? .36 : .3 }), '', d.name));
    } else if (stEd.tab === 'words') {
      add('🔤 Add your own text', () => openTextSheet(null), 'txt wide');
      add('✏️ Your own bubble', () => { const t = askText('Words for the speech bubble:', 'Hooray!', 24); if (t) addSticker({ kind: 'prop', id: 'bubble', text: t, s: .36 }); }, 'txt');
      add('💥 Your own burst', () => { const t = askText('Words for the comic burst:', 'WHOA!', 16); if (t) addSticker({ kind: 'prop', id: 'burst', text: t, s: .34 }); }, 'txt');
      PBProps.WORDS.bubble.forEach(t => add(propIcon('bubble', t), () => addSticker({ kind: 'prop', id: 'bubble', text: t, s: .36 }), '', t + ' speech bubble'));
      PBProps.WORDS.burst.forEach(t => add(propIcon('burst', t), () => addSticker({ kind: 'prop', id: 'burst', text: t, s: .34 }), '', t + ' comic burst'));
    } else {
      const D = window.PBEmojiData || [];
      chipGroup($('stTones'), TONES.map(t => ({ t, label: '✋' + t })), o => (state.tone || '') === o.t,
        o => { state.tone = o.t; saveSettings(); buildStickerTray(); });
      [...$('stTones').children].forEach((b, i) => b.setAttribute('aria-label', ['Default skin tone', 'Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'][i]));
      chipGroup($('stCatChips'), D.map((g, i) => ({ i, label: g.icon, title: g.name })), g => !emojiQuery && emojiCat === g.i,
        g => { emojiCat = g.i; emojiQuery = ''; $('stSearch').value = ''; buildStickerTray(); });
      [...$('stCatChips').children].forEach((b, i) => { if (D[i]) { b.title = D[i].name; b.setAttribute('aria-label', D[i].name); } });
      const list = emojiList();
      if (!list.length) add('No emoji match', () => {}, 'txt wide');
      list.forEach(x => add(x.e, () => addSticker({ kind: 'emoji', id: x.e, s: .2 }), '', x.n));
    }
    if (stEd.tab !== 'emoji') filterTray();
  }
  $('stSearch').addEventListener('input', (e) => {
    emojiQuery = e.target.value.trim();
    if (stEd.tab === 'emoji') { buildStickerTray(); return; }
    filterTray();
  });
  function filterTray() {
    const words = emojiQuery.toLowerCase().split(/\s+/).filter(Boolean);
    [...$('stItems').children].forEach(b => {
      if (b.classList.contains('wide') || b.classList.contains('txt')) return;       // "add your own" buttons stay
      const t = ((b.title || '') + ' ' + b.textContent).toLowerCase();
      b.hidden = !words.every(w => t.includes(w));
    });
  }
  function askText(label, def, max) {
    const t = prompt(label, def);
    return t && t.trim() ? t.trim().slice(0, max || 60) : null;
  }

  // ---- style panel: outline, text colour & font ----
  const BORDER_SWATCHES = ['', '#ffffff', '#1b1b1b', '#ff5fa2', '#ffd23f', '#3bceac', '#8a4dff'];
  const TEXT_SWATCHES = ['#ffffff', '#1b1b1b', '#ff2d87', '#ff595e', '#ff9f1c', '#ffd23f', '#8ac926', '#1982c4', '#8a4dff'];
  function swatches(el, colors, cur, onPick, customId) {
    el.innerHTML = '';
    colors.forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch' + (c ? '' : ' none');
      if (c) b.style.background = c; else b.textContent = '⃠';
      b.setAttribute('aria-label', c || 'No outline'); b.setAttribute('aria-pressed', String((cur || '') === c));
      b.addEventListener('click', () => onPick(c));
      el.appendChild(b);
    });
    const lab = document.createElement('label'); lab.className = 'swatch custom'; lab.title = 'Pick any colour';
    const inp = document.createElement('input'); inp.type = 'color'; inp.id = customId;
    inp.value = /^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#ffffff';
    lab.setAttribute('aria-pressed', String(!!cur && !colors.includes(cur)));
    inp.addEventListener('input', () => onPick(inp.value));
    lab.appendChild(inp); el.appendChild(lab);
  }
  const hasText = (st) => st.kind === 'text' || (st.kind === 'prop' && (st.id === 'bubble' || st.id === 'burst'));
  let styleFor = null;
  function syncStyle(st) {
    $('stAttach').setAttribute('aria-pressed', st.face ? 'true' : 'false');
    $('stEdit').hidden = !hasText(st);
    const sig = [stEd.sel, st.kind, st.border, st.color, st.font, st.anim].join('|');
    if (styleFor === sig) return;
    styleFor = sig;
    const pick = (fn) => (v) => { const cur = stEd.list[stEd.sel]; if (cur) { fn(cur, v); drawStEd(); } };
    swatches($('stBorders'), BORDER_SWATCHES, borderOf(st), pick((o, v) => { o.border = v; }), 'stBorderCustom');
    $('stAnimRow').hidden = !stEd.video;
    if (stEd.video) chipGroup($('stAnims'), ANIMS, a => (st.anim || '') === a.id, pick((o, a) => { o.anim = a.id; }));
    const isText = st.kind === 'text';
    $('stTextRow').hidden = !isText;
    if (isText) {
      swatches($('stColors'), TEXT_SWATCHES, st.color, pick((o, v) => { o.color = v; }), 'stColorCustom');
      chipGroup($('stFonts'), Object.entries(FONTS).map(([id, f]) => ({ id, label: f.label })), f => (st.font || 'playful') === f.id,
        pick((o, f) => { o.font = f.id; }), (b, f) => { b.style.fontFamily = FONTS[f.id].fam; b.style.fontWeight = 800; });
    }
  }
  function editText() {
    const st = stEd.list[stEd.sel]; if (!st || !hasText(st)) return;
    if (st.kind === 'text') { openTextSheet(st); return; }
    const t = askText('Change the words:', st.text || '', st.id === 'burst' ? 16 : 24);
    if (t) { st.text = t; drawStEd(); }
  }
  // the text box: several lines and a curve slider, with a live preview on the picture
  let textTarget = null;
  function openTextSheet(st) {
    textTarget = st;
    $('txtInput').value = st ? st.text : '';
    $('txtCurve').value = st ? (st.curve || 0) : 0;
    $('txtTitle').textContent = st ? 'Change your text' : 'Add your text';
    $('textSheet').hidden = false;
    setTimeout(() => $('txtInput').focus(), 50);
  }
  function textSheetLive() {
    if (!textTarget) return;
    textTarget.text = $('txtInput').value.slice(0, 120) || ' ';
    textTarget.curve = +$('txtCurve').value;
    drawStEd();
  }
  $('txtInput').addEventListener('input', textSheetLive);
  $('txtCurve').addEventListener('input', textSheetLive);
  $('txtOk').addEventListener('click', () => {
    const t = $('txtInput').value.replace(/\s+$/, '').slice(0, 120);
    $('textSheet').hidden = true;
    if (!t.trim()) { if (textTarget) { stEd.list.splice(stEd.list.indexOf(textTarget), 1); stEd.sel = -1; drawStEd(); } textTarget = null; return; }
    if (textTarget) { textTarget.text = t; textTarget.curve = +$('txtCurve').value; drawStEd(); }
    else addSticker({ kind: 'text', text: t, curve: +$('txtCurve').value, color: '#ff2d87', font: 'playful', s: .3 });
    textTarget = null;
  });
  $('txtCancel').addEventListener('click', () => { $('textSheet').hidden = true; textTarget = null; }); 
  $('stEdit').addEventListener('click', editText);
  stc.addEventListener('dblclick', (e) => {
    const pt = stLocal(e), i = hitSticker(stEd.list, pt.x, pt.y, stEd.view.w, stEd.view.h);
    if (i >= 0) { stEd.sel = i; editText(); }
  });
  function openPhotoStickers(tab) {
    openStickers({
      tab: typeof tab === 'string' ? tab : null,
      list: curStickers(),
      getBase: () => { const c = document.createElement('canvas'); composeInto(c, false); return c; },
      getFaces: () => {
        const L = computeLayout(state.layout, state.count), f = stripFaces();
        return state.photos.slice(0, L.rects.length).some(p => p && p._faces === null) && !f.length ? null : f;
      },
      onDone: () => schedule()
    });
  }
  $('openStickers').addEventListener('click', () => {
    if (state.appMode !== 'video') { openPhotoStickers(); return; }
    if (!cam.last) { toast('Record a video first, then add stickers to it'); return; }
    $('vidStickers').click();
  });
  $('previewStickers').addEventListener('click', openPhotoStickers);
  $('openText').addEventListener('click', () => openPhotoStickers('words'));
  $('previewText').addEventListener('click', () => openPhotoStickers('words'));
  $('clearStickers').addEventListener('click', () => {
    const list = curStickers();
    if (!list.length || !confirm('Remove all stickers from this layout?')) return;
    list.length = 0; schedule();
  });

  // ================= camera =================
  const CAM_MODES = [
    { id: 'booth', label: '📸 Photo booth', kind: 'photo' },
    { id: 'glam', label: '✨ Glam', kind: 'photo' },
    { id: 'comic', label: '💥 Comic', kind: 'photo' },
    { id: 'boomerang', label: '🔁 Boomerang', kind: 'video', secs: 1.6 },
    { id: 'strobe', label: '⚡ Strobe', kind: 'video', secs: 2 },
    { id: 'slowmo', label: '🐢 Slow-mo', kind: 'video', secs: 3 },
    { id: 'spin', label: '🌀 360 spin', kind: 'video', secs: 6 }
  ];
  const cam = { dzoom: 1, hw: null, deviceId: null, lenses: [], lastOf: { photo: 'booth', video: 'boomerang' }, stream: null, facing: 'user', mode: 'booth', timer: 3, shots: [], slot: -1, busy: false, cancel: false,
    stopEarly: false, recording: false, glamBW: false, audio: null, last: null };
  const camVideo = $('camVideo');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const camMode = () => CAM_MODES.find(m => m.id === cam.mode) || CAM_MODES[0];
  const shotsNeeded = () => (cam.slot >= 0 ? 1 : state.count);
  const camFilter = () => cam.mode === 'glam' ? (cam.glamBW ? 'glambw' : 'glam') : cam.mode === 'comic' ? 'comic' : state.filter;

  function buildCamUI() {
    // Photo / Video switch: shows that kind's modes and remembers the last one picked of each
    const kind = camMode().kind;
    cam.lastOf[kind] = cam.mode;
    $('camKind').hidden = cam.slot >= 0;
    [...$('camKind').children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.kind === kind)));
    const modes = CAM_MODES.filter(m => m.kind === kind);
    const mEl = $('camModes'); mEl.innerHTML = '';
    modes.forEach(m => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = m.label;
      b.setAttribute('aria-pressed', String(m.id === cam.mode));
      b.addEventListener('click', () => { if (cam.busy) return; cam.mode = m.id; cam.shots = []; buildCamUI(); applyPreview(); });
      mEl.appendChild(b);
    });
    const fEl = $('camFilters'); fEl.innerHTML = '';
    fEl.hidden = cam.mode === 'glam' || cam.mode === 'comic';
    PBFilters.LIST.forEach(f => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = f.name;
      b.setAttribute('aria-pressed', String(state.filter === f.id));
      b.addEventListener('click', () => { state.filter = f.id; markFilters(); schedule(); buildCamUI(); applyPreview(); });
      fEl.appendChild(b);
    });
    const m = camMode();
    $('camShutter').classList.toggle('video', m.kind === 'video');
    $('camShutter').setAttribute('aria-label', m.kind === 'video' ? 'Start recording' : 'Take photos');
    $('camTimer').textContent = cam.timer ? `⏱ ${cam.timer}s` : '⏱ Off';
    $('camExtra').hidden = cam.mode !== 'glam';
    $('camExtra').textContent = cam.glamBW ? '🎨 Color' : '🖤 B&W';
    $('camHint').textContent = camHint();
    updateCamTitle(); updateCamShots();
    const on = mEl.querySelector('[aria-pressed="true"]');
    if (on) mEl.scrollLeft = on.offsetLeft - 40;
  }
  function camHint() {
    const n = shotsNeeded(), plural = n > 1 ? `${n} photos` : '1 photo';
    switch (cam.mode) {
      case 'booth': return cam.slot >= 0 ? `Retakes photo ${cam.slot + 1}.` : `Takes ${plural} in a row, with a countdown before each.`;
      case 'glam': return `Soft, flattering glam look · ${plural}. Tap B&W for classic black & white.`;
      case 'comic': return `Takes ${plural}, then turns them into a comic-book page with POW! bursts.`;
      case 'boomerang': return 'Records about 1.5 seconds, then loops it back and forth.';
      case 'strobe': return 'Fires 10 strobe flashes in 2 seconds and stitches them into a flickering clip. Dance!';
      case 'slowmo': return 'Records 3 seconds and plays it back in slow motion.';
      case 'spin': return 'Records 6 seconds with a fast–slow–fast speed ramp. Walk the phone around the person, or have them spin.';
    }
    return '';
  }
  function updateCamTitle(t) {
    const m = camMode();
    $('camTitle').textContent = t || (cam.slot >= 0 ? `Retake photo ${cam.slot + 1}` : m.kind === 'video' ? plain(m.label) : `${plain(m.label)} · ${shotsNeeded()} photos`);
  }
  function updateCamShots() {
    const el = $('camShots'); el.innerHTML = '';
    if (camMode().kind !== 'photo' || shotsNeeded() < 2) return;
    for (let k = 0; k < shotsNeeded(); k++) {
      const sp = document.createElement('span');
      if (cam.shots[k]) sp.style.backgroundImage = `url(${cam.shots[k].thumb})`;
      el.appendChild(sp);
    }
  }
  function applyPreview() {
    camVideo.style.transform = (cam.facing === 'user' ? 'scaleX(-1) ' : '') + (cam.dzoom > 1 ? `scale(${cam.dzoom})` : '');
    camVideo.style.filter = [PBFilters.css(camFilter()), PBFilters.adjCss(state.adj)].join(' ').trim() || 'none';
  }

  async function openCamera(opts = {}) {
    cam.slot = opts.slot == null ? -1 : opts.slot;
    cam.shots = []; cam.cancel = false; cam.busy = false; cam.stopEarly = false;
    if (opts.mode) cam.mode = opts.mode;
    if (cam.slot >= 0 && camMode().kind !== 'photo') cam.mode = 'booth';
    $('camera').hidden = false; $('camReview').hidden = true; $('camError').hidden = true;
    syncScroll();
    buildCamUI(); $('camProps').hidden = true; buildCamProps();
    if (state.camProps.length) PBFace.load();
    liveStart();
    await startStream();
  }
  async function startStream() {
    stopStream();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camError('Your browser only allows the live camera when the app is opened from a secure (https) web address, such as your GitHub Pages link. You can still use your phone\'s camera app.');
      return;
    }
    try {
      const pick = cam.deviceId ? { deviceId: { exact: cam.deviceId } } : { facingMode: cam.facing };
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { ...pick, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false
      });
      camVideo.srcObject = cam.stream;
      await camVideo.play().catch(() => {});
      await setupZoom();
      applyPreview();
    } catch (e) {
      const n = e && e.name;
      camError(n === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access for this site in your browser settings, then open the camera again.'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera was found on this device.'
          : 'The camera could not start (' + (n || 'unknown error') + ').');
    }
  }
  // ---- zoom: the camera's own zoom where the browser offers it, otherwise a digital (crop) zoom that
  // also applies to the photos and videos; plus the phone's extra lenses (ultra wide / telephoto) ----
  async function setupZoom() {
    const track = cam.stream && cam.stream.getVideoTracks()[0];
    const caps = track && track.getCapabilities ? track.getCapabilities() : {};
    cam.track = track;
    cam.hw = caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : null;
    cam.hwZoom = cam.hw ? (track.getSettings().zoom || cam.hw.min) : 1;
    if (cam.hw) cam.dzoom = 1;
    // lens list: only labelled lenses (iPhone style "Back Ultra Wide Camera") are offered
    try {
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.label);
      const back = devs.filter(d => /back|rear|environment/i.test(d.label));
      const find = (re) => back.find(d => re.test(d.label));
      const wide = find(/ultra ?wide/i), tele = find(/tele/i), main = back.find(d => /^back camera$/i.test(d.label.trim())) || find(/back camera/i);
      cam.lenses = cam.facing === 'environment' && (wide || tele) && main
        ? [wide && { label: '.5', id: wide.deviceId }, { label: '1×', id: main.deviceId }, tele && { label: /3/.test(tele.label) ? '3×' : '2×', id: tele.deviceId, tele: true }].filter(Boolean)
        : [];
    } catch (e) { cam.lenses = []; }
    buildZoomUI();
  }
  const zoomNow = () => (cam.hw ? cam.hwZoom : cam.dzoom || 1);
  let zoomBusy = false, zoomWant = null, zoomLabelT = 0;
  function setZoom(z, quiet) {
    if (cam.hw) {
      z = clamp(z, cam.hw.min, cam.hw.max); cam.hwZoom = z;
      zoomWant = z;
      if (!zoomBusy) {
        const go = () => {
          if (zoomWant == null || !cam.track) { zoomBusy = false; return; }
          const v = zoomWant; zoomWant = null; zoomBusy = true;
          cam.track.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {}).finally(go);
        };
        go();
      }
    } else {
      cam.dzoom = clamp(z, 1, 5); applyPreview();
    }
    if (!quiet) {
      const lab = $('camZoomLabel'); lab.textContent = zoomNow().toFixed(1).replace(/\.0$/, '') + '×'; lab.hidden = false;
      clearTimeout(zoomLabelT); zoomLabelT = setTimeout(() => { lab.hidden = true; }, 900);
    }
    markZoom();
  }
  function buildZoomUI() {
    const el = $('camZoom'); el.innerHTML = '';
    const btn = (label, on, fn) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.label = label;
      b.addEventListener('click', fn); el.appendChild(b);
    };
    cam.lenses.forEach(l => btn(l.label, false, async () => {
      if (cam.busy || cam.deviceId === l.id) return;
      cam.deviceId = l.id; cam.dzoom = 1; await startStream();
    }));
    const base = cam.hw ? Math.max(1, cam.hw.min) : 1, top = cam.hw ? cam.hw.max : 5;
    [1, 2, 3, 5].filter(v => v * base <= top + .01).forEach(v => {
      const label = v + '×';
      if (cam.lenses.some(l => l.label === label)) return;
      btn(label, false, () => { if (cam.lenses.length && cam.deviceId !== (cam.lenses.find(l => l.label === '1×') || {}).id) { cam.deviceId = cam.lenses.find(l => l.label === '1×').id; cam.dzoom = v; startStream().then(() => setZoom(v * base)); return; } setZoom(v * base); });
    });
    markZoom();
  }
  function markZoom() {
    const lens = cam.lenses.find(l => l.id === cam.deviceId);
    const z = zoomNow() / (cam.hw ? Math.max(1, cam.hw.min) : 1);
    [...$('camZoom').children].forEach(b => {
      const L = b.dataset.label;
      const on = lens && lens.label !== '1×' ? L === lens.label : Math.abs(parseFloat(L) - z) < .25 && L !== '.5';
      b.setAttribute('aria-pressed', String(!!on));
    });
  }
  // pinch (or scroll) on the camera picture to zoom
  (() => {
    const area = $('camera'), pts = new Map();
    let d0 = 0, z0 = 1;
    const onPicture = (e) => e.target === camVideo || e.target === camOverlay || e.target === area;
    area.addEventListener('pointerdown', (e) => {
      if (!onPicture(e)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = zoomNow(); }
    });
    area.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && d0 > 10) { const [a, b] = [...pts.values()]; setZoom(z0 * Math.hypot(a.x - b.x, a.y - b.y) / d0); }
    });
    const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => area.addEventListener(t, end));
    area.addEventListener('wheel', (e) => { if (!onPicture(e)) return; e.preventDefault(); setZoom(zoomNow() * Math.exp(-e.deltaY * .002)); }, { passive: false });
    camVideo.style.touchAction = 'none';                      // the page mustn't zoom instead
  })();

  function stopStream() {
    if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
    cam.stream = null; camVideo.srcObject = null;
  }
  function closeCamera() {
    cam.cancel = true; cam.party = false; stopStream(); liveStop();
    $('camera').hidden = true; $('camCount').hidden = true; $('camRec').hidden = true;
    syncScroll();
  }
  function camError(msg) { $('camErrorMsg').textContent = msg; $('camError').hidden = false; }

  // one shared audio context, first created on a tap (phones only allow sound after one)
  function audioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error('no audio');
    cam.audio = cam.audio || new AC();
    if (cam.audio.state === 'suspended') cam.audio.resume();
    return cam.audio;
  }
  function beep(freq, dur, vol) {
    try {
      const a = audioCtx();
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || .12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur + .02);
    } catch (e) { /* no audio */ }
  }
  function showCount(t) {
    const el = $('camCount'); el.textContent = t; el.hidden = false;
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }
  async function countdown(secs) {
    for (let k = secs; k > 0; k--) {
      if (cam.cancel) throw new Error('cancel');
      showCount(k); beep(k === 1 ? 990 : 660, .09);
      await sleep(1000);
    }
    $('camCount').hidden = true;
    if (cam.cancel) throw new Error('cancel');
  }
  function flash(quiet) {
    const f = $('camFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    if (!quiet) { beep(1500, .05, .2); setTimeout(() => beep(900, .07, .15), 60); } else beep(2200, .03, .08);
  }
  function grabFrame(max) {
    const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
    if (!vw) return null;
    const z = cam.dzoom || 1, sw = vw / z, sh = vh / z;          // digital zoom keeps the middle
    const sc = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas'); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
    const x = c.getContext('2d');
    if (cam.facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(camVideo, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
    return c;
  }
  function thumbOf(c) {
    const t = document.createElement('canvas'), sc = 240 / Math.max(c.width, c.height);
    t.width = Math.round(c.width * sc); t.height = Math.round(c.height * sc);
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', .8);
  }
  const setBusy = (b) => { cam.busy = b; $('camShutter').classList.toggle('busy', b); };

  $('camShutter').addEventListener('click', async () => {
    if (cam.busy) { if (cam.recording) cam.stopEarly = true; else cam.cancel = true; return; }
    if (!cam.stream) return;
    beep(40, .01, .0001);   // unlocks sound on iPhone
    const m = camMode();
    if (m.kind === 'photo') await runPhotos([...Array(shotsNeeded()).keys()]);
    else await runVideo(m);
  });
  async function runPhotos(indices) {
    setBusy(true); cam.cancel = false;
    try {
      for (const k of indices) {
        updateCamTitle(shotsNeeded() > 1 ? `Photo ${k + 1} of ${shotsNeeded()}` : 'Get ready!');
        await countdown(cam.timer);
        const c = grabFrame(1800);
        if (!c) throw new Error('nocam');
        flash();
        cam.shots[k] = { canvas: c, thumb: thumbOf(c) };
        updateCamShots();
        await sleep(indices.length > 1 ? 700 : 250);
      }
      showReview();
    } catch (e) {
      $('camCount').hidden = true;
      if (e.message !== 'cancel') toast('Could not take the photo');
    } finally {
      setBusy(false); cam.cancel = false; updateCamTitle();
    }
  }
  function showReview() {
    if (party.on) { usePhotos().then(partyResult); return; }   // party mode: no review, straight to the strip
    const n = shotsNeeded(), g = $('reviewGrid'); g.innerHTML = '';
    g.style.gridTemplateColumns = n === 1 ? 'minmax(0, 240px)' : n === 4 ? '1fr 1fr' : 'repeat(3, 1fr)';
    g.style.justifyContent = 'center';
    for (let k = 0; k < n; k++) {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `<img src="${cam.shots[k].thumb}" alt=""><span>↺ Retake${n > 1 ? ' ' + (k + 1) : ''}</span>`;
      b.addEventListener('click', () => { $('camReview').hidden = true; runPhotos([k]); });
      g.appendChild(b);
    }
    $('revUse').textContent = n > 1 ? '✓ Use photos' : '✓ Use photo';
    $('camReview').hidden = false;
  }
  $('revRetakeAll').addEventListener('click', () => {
    $('camReview').hidden = true; cam.shots = []; updateCamShots();
    runPhotos([...Array(shotsNeeded()).keys()]);
  });
  async function setPhotoCanvas(i, c) {
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
    const old = state.photos[i]; if (old) URL.revokeObjectURL(old.url);
    state.photos[i] = { canvas: c, url: URL.createObjectURL(blob), zoom: 1, cx: null, cy: null, filter: null };
  }
  $('revUse').addEventListener('click', () => usePhotos());
  async function usePhotos() {
    const n = shotsNeeded(), special = cam.mode === 'glam' || cam.mode === 'comic' ? camFilter() : null;
    const slots = [];
    for (let k = 0; k < n; k++) {
      const slot = cam.slot >= 0 ? cam.slot : k;
      await setPhotoCanvas(slot, cam.shots[k].canvas);
      if (special && cam.slot >= 0) state.photos[slot].filter = special;
      slots.push(slot);
    }
    await applyCamProps(slots);
    if (special && cam.slot < 0) {
      state.filter = special;
      if (cam.mode === 'comic') applyComicLook();
    }
    const wasComic = cam.mode === 'comic' && cam.slot < 0;
    closeCamera(); markFilters(); buildSlots(); schedule();
    if (party.on) return;
    toast(wasComic ? '💥 Comic page ready!' : n > 1 ? 'Photos added!' : 'Photo replaced');
    setTimeout(() => $('previewSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
  }
  function applyComicLook() {
    Object.assign(state, {
      theme: 'action', layout: 'grid', style: 'straight', shape: 'rect', frame: 'black', frameSize: 1.4, font: 'bold',
      line1: 'KA-POW!', textMode: 'auto', outlineMode: 'auto', iconLeft: '💥', iconRight: '⚡', filter: 'comic'
    });
    state.preset = PRESETS.findIndex(p => p.theme === 'action');
    state.photos.forEach(p => { if (p) p.filter = null; });
    const words = PBProps.WORDS.burst.slice().sort(() => Math.random() - .5);
    const L = computeLayout(state.layout, state.count);
    const key = state.layout + state.count;
    state.stickerSets[key] = curStickers().filter(st => !st.auto);
    L.rects.slice(0, 3).forEach((r, i) => {
      state.stickerSets[key].push({ kind: 'prop', id: 'burst', text: words[i], auto: true, flip: false,
        x: (r.x + r.w * (i % 2 ? .8 : .22)) / L.W, y: (r.y + r.h * .2) / L.H, s: .19, r: (Math.random() - .5) * .5 });
    });
    syncUI(); markThemes();
  }

  // fallback: the phone's own camera app via a file input
  $('camNative').addEventListener('click', () => $('nativeCam').click());
  $('nativeCam').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const empty = state.photos.slice(0, state.count).findIndex(p => !p);
    const slot = cam.slot >= 0 ? cam.slot : empty >= 0 ? empty : 0;
    await setPhoto(slot, f);
    closeCamera(); buildSlots(); schedule();
    toast(`Photo ${slot + 1} added`);
  });
  $('camErrClose').addEventListener('click', closeCamera);
  $('camClose').addEventListener('click', closeCamera);
  $('camFlip').addEventListener('click', async () => {
    if (cam.busy) return;
    cam.facing = cam.facing === 'user' ? 'environment' : 'user';
    cam.deviceId = null; cam.dzoom = 1;
    await startStream();
  });
  $('camTimer').addEventListener('click', () => {
    const opts = [3, 5, 10, 0];
    cam.timer = opts[(opts.indexOf(cam.timer) + 1) % opts.length];
    buildCamUI();
  });
  $('camExtra').addEventListener('click', () => { cam.glamBW = !cam.glamBW; buildCamUI(); applyPreview(); });
  $('openCam').addEventListener('click', () => openCamera({ mode: cam.lastOf.photo || 'booth' }));
  $('openVid').addEventListener('click', () => openCamera({ mode: cam.lastOf.video || 'boomerang' }));
  [...$('camKind').children].forEach(b => b.addEventListener('click', () => {
    if (cam.busy) return;
    const kind = b.dataset.kind; if (camMode().kind === kind) return;
    cam.mode = cam.lastOf[kind] || CAM_MODES.find(m => m.kind === kind).id;
    cam.shots = []; buildCamUI(); applyPreview();
    setAppMode(kind);                                          // the app follows along
  }));

  // ================= Photos mode vs Video mode =================
  // Everything shared (occasion, background, message, filters, face paint, stickers) stays; photo-only
  // settings (photos, layouts, collages, party, save) and video-only ones (clip, music, size) swap.
  function setAppMode(m) {
    state.appMode = m === 'video' ? 'video' : 'photo';
    document.body.classList.toggle('mode-video', state.appMode === 'video');
    document.body.classList.toggle('mode-photo', state.appMode === 'photo');
    [...$('appMode').children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === state.appMode)));
    $('openStickers').textContent = state.appMode === 'video' ? '😎 Video sticker studio' : '😎 Open sticker studio';
    saveSettings();
    if (state.appMode === 'video') { buildVidSettings(); drawVideoPreview(); }
  }
  [...$('appMode').children].forEach(b => b.addEventListener('click', () => setAppMode(b.dataset.mode)));
  function buildVidSettings() {
    const kinds = CAM_MODES.filter(m => m.kind === 'video');
    chipGroup($('vidKinds'), kinds, m => (cam.lastOf.video || 'boomerang') === m.id, m => {
      cam.lastOf.video = m.id; buildVidSettings();
    });
    const cur = kinds.find(m => m.id === (cam.lastOf.video || 'boomerang'));
    $('vidKindHint').textContent = videoHint(cur.id);
    chipGroup($('vidMusicMain'), PBMusic.TUNES, t => (state.music || 'none') === t.id, t => { try { audioCtx(); } catch (e) { /* no audio */ } state.music = t.id; buildVidSettings(); drawVideoPreview(); saveSettings(); });
    chipGroup($('vidPlainMain'), [{ v: false, label: '🎉 Booth design' }, { v: true, label: '🎥 Just the video' }], o => !!state.vplain === o.v,
      o => { state.vplain = o.v; buildVidSettings(); drawVideoPreview(); saveSettings(); });
    fillSizeSelect($('vidSizeMain'), state.vidSize); $('vidFitMain').value = state.vidFit; $('vidFitMain').hidden = state.vidSize === 'orig';
    const sz = state.vidSize === 'orig' ? 'Original size' : plain(labelOf(SIZES, state.vidSize));
    const m = PBMusic.TUNES.find(t => t.id === (state.music || 'none'));
    $('sum-vidsettings').textContent = `${plain(m.label)} · ${sz}`;
  }
  $('vidSizeMain').addEventListener('change', (e) => { state.vidSize = e.target.value; buildVidSettings(); drawVideoPreview(); saveSettings(); });
  $('vidFitMain').addEventListener('change', (e) => { state.vidFit = e.target.value; buildVidSettings(); drawVideoPreview(); saveSettings(); });
  function videoHint(id) {
    return { boomerang: 'Records about 1.5 seconds, then loops it back and forth.', strobe: 'Flashing strobe frames stitched into a flickery clip. Dance!',
      slowmo: 'Records 3 seconds and plays it back in slow motion.', spin: 'Records 6 seconds with a fast–slow–fast speed ramp. Walk around the person, or have them spin.' }[id] || '';
  }
  $('vidMain').addEventListener('click', () => {
    if (!cam.last) { $('openVid').click(); return; }
    if (vid.url && vid.sig === designSig()) { $('vidOpen').click(); return; }
    $('vidRemake').click();
  });

  // ================= party mode =================
  // A kiosk for guests: full screen, one big button, 4-shot countdown (with the host's design, stickers
  // and camera props), then the strip to share or print. Strips are kept in a gallery on this device.
  // (Sending a strip to a guest's own phone by QR needs a server — see ROADMAP.md.)
  const party = { on: false, lock: null, idle: 0, left: 0 };
  async function enterParty() {
    party.on = true;
    $('partyTitle').textContent = state.line1 || 'Photo Booth';
    $('party').hidden = false; syncScroll();
    partyAttract();
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* not allowed here */ }
    try { party.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* keeps the screen on where supported */ }
    drawQR($('partyQR'), location.href.split('#')[0]);
  }
  function exitParty() {
    party.on = false; clearInterval(party.idle);
    $('camera').classList.remove('party');
    $('party').hidden = true; syncScroll();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (party.lock) { party.lock.release().catch(() => {}); party.lock = null; }
  }
  async function partyAttract() {
    clearInterval(party.idle);
    $('partyAttract').hidden = false; $('partyResult').hidden = true;
    const n = await stripCount();
    $('partyNote').textContent = n ? `${n} strip${n === 1 ? '' : 's'} taken so far 🎉` : '';
  }
  function partyShoot() {
    // guests' photos never mix with the next group's
    state.photos = noPhotos();
    cam.party = true; cam.timer = cam.timer || 3;
    $('camera').classList.add('party');
    openCamera({ mode: 'booth' }).then(() => { if (party.on && cam.stream) $('camShutter').click(); });
  }
  let partyBlob = null;
  async function partyResult() {
    render();
    partyBlob = await toJpeg(canvas);
    $('partyImg').src = URL.createObjectURL(partyBlob);
    $('partyAttract').hidden = true; $('partyResult').hidden = false;
    $('partyShare').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([partyBlob], 'strip.jpg', { type: 'image/jpeg' })] }));
    photoTx('readwrite', s => s.add({ blob: partyBlob, at: Date.now() }), 'strips').catch(() => {});
    // back to the start screen by itself if nobody touches it
    party.left = 45;
    clearInterval(party.idle);
    party.idle = setInterval(() => {
      party.left--;
      $('partyTimer').textContent = `Next group in ${party.left}s`;
      if (party.left <= 0) partyDone();
    }, 1000);
  }
  function partyDone() {
    clearInterval(party.idle);
    if ($('partyImg').src) URL.revokeObjectURL($('partyImg').src);
    state.photos.forEach(p => p && URL.revokeObjectURL(p.url));
    state.photos = noPhotos(); buildSlots(); schedule();
    partyAttract();
  }
  $('partyResult').addEventListener('pointerdown', () => { party.left = 45; });
  $('partyStart').addEventListener('click', enterParty);
  $('partyGo').addEventListener('click', partyShoot);
  $('partyDone').addEventListener('click', partyDone);
  $('partyShare').addEventListener('click', async () => {
    try { await navigator.share({ files: [new File([partyBlob], `photobooth-${stamp()}.jpg`, { type: 'image/jpeg' })] }); } catch (e) { /* cancelled */ }
  });
  $('partyPrint').addEventListener('click', () => printImage(partyBlob));
  // hold ✕ for 1.5 s to leave, so guests don't exit by accident
  (() => {
    const b = $('partyExit'); let t0 = 0, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); b.classList.remove('holding'); b.style.removeProperty('--p'); };
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 1500);
      b.style.setProperty('--p', Math.round(p * 100) + '%');
      if (p >= 1) { stop(); exitParty(); return; }
      raf = requestAnimationFrame(tick);
    };
    b.addEventListener('pointerdown', () => { t0 = performance.now(); b.classList.add('holding'); raf = requestAnimationFrame(tick); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('click', () => { if (!b.classList.contains('holding')) toast('Hold ✕ to leave party mode'); });
  })();
  function printImage(blob) {
    if (!blob) return;
    let area = $('printArea');
    if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
    area.innerHTML = '';
    const img = document.createElement('img'); img.src = URL.createObjectURL(blob);
    img.onload = () => { window.print(); setTimeout(() => URL.revokeObjectURL(img.src), 1000); };
    area.appendChild(img);
  }
  function drawQR(cv, text) {
    if (!window.qrcode) return;
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), ctx = cv.getContext('2d'), k = Math.floor(cv.width / (n + 2)), o = Math.floor((cv.width - k * n) / 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#1b1b1b';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(o + c * k, o + r * k, k, k);
  }

  // ---- party gallery ----
  function stripCount() { return photoTx('readonly', s => s.count(), 'strips').catch(() => 0); }
  function allStrips() {
    return photoTx('readonly', s => s.getAll(), 'strips').catch(() => []);
  }
  async function openGallery() {
    const list = await allStrips(), g = $('galleryGrid');
    [...g.querySelectorAll('img')].forEach(im => URL.revokeObjectURL(im.src));
    g.innerHTML = '';
    $('galleryHint').textContent = list.length
      ? `${list.length} strip${list.length === 1 ? '' : 's'} saved on this device. Tap one to save or share it.`
      : 'Strips from party mode show up here.';
    list.slice().reverse().forEach(rec => {
      const b = document.createElement('button'); b.type = 'button';
      const im = document.createElement('img'); im.src = URL.createObjectURL(rec.blob); im.alt = '';
      b.appendChild(im);
      b.addEventListener('click', () => showSaveSheet(rec.blob, `photobooth-${new Date(rec.at).toISOString().slice(0, 19).replace(/[-:T]/g, '')}.jpg`, 'Party strip', photoHint()));
      g.appendChild(b);
    });
    $('galleryShare').hidden = !list.length || !(navigator.canShare && navigator.canShare({ files: [new File([list[0].blob], 'a.jpg', { type: 'image/jpeg' })] }));
    $('galleryClear').hidden = !list.length;
    $('gallery').hidden = false; syncScroll();
  }
  $('galleryOpen').addEventListener('click', openGallery);
  $('galleryClose').addEventListener('click', () => { $('gallery').hidden = true; syncScroll(); });
  $('galleryShare').addEventListener('click', async () => {
    const list = await allStrips();
    const files = list.map((r, i) => new File([r.blob], `party-strip-${i + 1}.jpg`, { type: 'image/jpeg' }));
    try { await navigator.share({ files }); } catch (e) { /* cancelled or too many */ }
  });
  $('galleryClear').addEventListener('click', async () => {
    if (!confirm('Delete every strip in the party gallery on this device?')) return;
    await photoTx('readwrite', s => s.clear(), 'strips').catch(() => {});
    openGallery();
  });

  // ================= live face props in the camera =================
  // Pick props before the shot and see them on everyone's face in the preview. The captured photos /
  // video get them as stuck-on stickers (st.face.cam), so they can still be moved or removed later.
  function faceChoices() {
    const out = [];
    PBProps.LIST.forEach(p => { if (PBProps.fit('prop', p.id)) out.push({ kind: 'prop', id: p.id, name: p.name }); });
    (self.PBStickers || []).forEach(d => { if (d.face) out.push({ kind: 'svg', id: d.id, name: d.name }); });
    ['🕶️', '👑', '🎩', '🎀', '🥸', '🤡'].forEach(e => out.push({ kind: 'emoji', id: e, name: e }));
    return out;
  }
  const hasCamProp = (c) => state.camProps.some(p => p.kind === c.kind && p.id === c.id);
  function camSticker(cp, slot, idx) {
    const fit = stickerFit(cp) || { at: 'eyes', s: 2 };
    return { kind: cp.kind, id: cp.id, x: .5, y: .4, s: .3, r: 0, flip: false, border: '',
      face: { at: fit.at, x: fit.x || 0, y: fit.y || 0, s: fit.s, r: 0, slot, idx, cam: true } };
  }
  function buildCamProps() {
    const el = $('camProps'); el.innerHTML = '';
    const add = (content, title, on, click) => {
      const b = document.createElement('button'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
      b.setAttribute('aria-pressed', String(on));
      if (typeof content === 'string') b.textContent = content; else b.appendChild(content);
      b.addEventListener('click', click); el.appendChild(b);
    };
    PBPaint.EFFECTS.forEach(e => add(e.label.split(' ')[0], e.label.replace(/^\S+ /, '') + ' face paint', (state.facePaint || 'none') === e.id && e.id !== 'none',
      () => { setPaint(state.facePaint === e.id ? 'none' : e.id); buildCamProps(); }));
    const sep = document.createElement('span'); sep.className = 'sep'; el.appendChild(sep);
    add('🚫', 'No props', !state.camProps.length, () => { state.camProps = []; saveSettings(); buildCamProps(); });
    faceChoices().forEach(c => add(c.kind === 'prop' ? propIcon(c.id) : c.kind === 'svg' ? svgIcon(c.id) : c.id, c.name, hasCamProp(c), () => {
      state.camProps = hasCamProp(c) ? state.camProps.filter(p => !(p.kind === c.kind && p.id === c.id)) : state.camProps.concat({ kind: c.kind, id: c.id });
      saveSettings(); buildCamProps();
      if (state.camProps.length) PBFace.load();
    }));
    $('camPropsBtn').setAttribute('aria-pressed', String(!el.hidden || state.camProps.length > 0));
  }
  $('camPropsBtn').addEventListener('click', () => {
    $('camProps').hidden = !$('camProps').hidden;
    buildCamProps();
    if (!$('camProps').hidden) PBFace.load();
  });

  const live = { raf: 0, poses: [], count: 0 };
  const camOverlay = $('camOverlay');
  function liveStart() { if (!live.raf) live.raf = requestAnimationFrame(liveFrame); }
  function liveStop() { cancelAnimationFrame(live.raf); live.raf = 0; live.poses = []; camOverlay.getContext('2d').clearRect(0, 0, camOverlay.width, camOverlay.height); }
  function liveFrame() {
    live.raf = 0;
    if ($('camera').hidden) return;
    live.raf = requestAnimationFrame(liveFrame);
    const dpr = window.devicePixelRatio || 1, cw = camOverlay.clientWidth, ch = camOverlay.clientHeight;
    if (camOverlay.width !== Math.round(cw * dpr) || camOverlay.height !== Math.round(ch * dpr)) {
      camOverlay.width = Math.round(cw * dpr); camOverlay.height = Math.round(ch * dpr);
    }
    const ctx = camOverlay.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, camOverlay.width, camOverlay.height);
    const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
    const wanted = state.camProps.length || !$('camProps').hidden || paintOn();
    const hint = (state.camProps.length || paintOn()) && !PBFace.ready()
      ? (PBFace.status === 'failed' ? "Face props aren't available on this device" : `⏳ Getting face props ready… ${Math.round(PBFace.progress * 100)}%`)
      : camHint();
    if ($('camHint').textContent !== hint) $('camHint').textContent = hint;
    if (!wanted || !vw || !PBFace.ready() || !$('camReview').hidden) return;
    const raw = PBFace.detect(camVideo) || [];
    live.count = raw.length;
    // video pixels → screen: the preview is object-fit: cover, and mirrored for the selfie camera
    const k = Math.max(cw / vw, ch / vh) * (cam.dzoom || 1), ox = (cw - vw * k) / 2, oy = (ch - vh * k) / 2, mirror = cam.facing === 'user';
    const map = (q) => ({ x: mirror ? cw - (q.x * k + ox) : q.x * k + ox, y: q.y * k + oy });
    if (paintOn() && PBFace.meshReady()) {
      // paint needs the face underneath it (it blends with the skin) and must match this exact frame,
      // so the preview frame itself is drawn here too, with the same crop, mirror and filter
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      if (mirror) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
      if ('filter' in ctx) ctx.filter = camVideo.style.filter || 'none';
      ctx.drawImage(camVideo, ox, oy, vw * k, vh * k);
      ctx.restore();
      (PBFace.meshes(camVideo) || []).forEach(m => PBPaint.draw(ctx, m.map(q => map({ x: q.x * vw, y: q.y * vh })), state.facePaint));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (!state.camProps.length) return;
    const poses = raw.map(f => PBFace.pose({ eye1: map(f.eye1), eye2: map(f.eye2), nose: map(f.nose), mouth: map(f.mouth) }))
      .sort((a, b) => a.pts.eyes.x - b.pts.eyes.x);
    // smooth against last frame so props don't jitter
    poses.forEach((p, i) => {
      const q = live.poses[i];
      if (!q || Math.hypot(q.pts.eyes.x - p.pts.eyes.x, q.pts.eyes.y - p.pts.eyes.y) > p.d * 1.5) return;
      const m = (a, b) => a + (b - a) * .55;
      for (const key in p.pts) p.pts[key] = { x: m(q.pts[key].x, p.pts[key].x), y: m(q.pts[key].y, p.pts[key].y) };
      let da = p.a - q.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      p.d = m(q.d, p.d); p.a = q.a + da * .55;
    });
    live.poses = poses;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    poses.forEach(p => state.camProps.forEach(cp => {
      const st = camSticker(cp, 0, 0), F = st.face, A = p.pts[F.at] || p.pts.eyes;
      const c = Math.cos(p.a), s = Math.sin(p.a), unit = F.s * p.d;
      ctx.save();
      ctx.translate(A.x + (F.x * c - F.y * s) * p.d, A.y + (F.x * s + F.y * c) * p.d); ctx.rotate(p.a);
      const bm = stickerBitmap(st, unit * dpr);
      if (bm) { const r = unit / bm.q; ctx.drawImage(bm.c, -bm.w * r / 2, -bm.h * r / 2, bm.w * r, bm.h * r); }
      ctx.restore();
    }));
  }
  // after "Use photos": put the chosen props on every face in the new photos (replacing earlier camera props)
  async function applyCamProps(slots) {
    const list = curStickers();
    for (let i = list.length - 1; i >= 0; i--) if (list[i].face && list[i].face.cam && slots.includes(list[i].face.slot)) list.splice(i, 1);
    const props = state.camProps.slice();
    if (!props.length) { schedule(); return; }
    if (!(await PBFace.load())) return;
    slots.forEach(i => { const p = state.photos[i]; if (p) p._faces = PBFace.detect(p.canvas) || []; });
    const L = computeLayout(state.layout, state.count);
    stripFaces().filter(f => slots.includes(f.slot)).forEach(f => props.forEach(cp => {
      const st = camSticker(cp, f.slot, f.idx);
      fitToFace(st, f, L.W, L.H);
      list.push(st);
    }));
    schedule();
  }

  // ================= video modes =================
  function pickMime(withAudio) {
    if (!window.MediaRecorder) return null;
    const list = withAudio ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (const t of list) {
      try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { /* ignore */ }
    }
    return '';
  }
  async function runVideo(m) {
    if (pickMime() === null || !HTMLCanvasElement.prototype.captureStream) { toast("This browser can't record video — try Safari or Chrome"); return; }
    setBusy(true); cam.cancel = false; cam.stopEarly = false;
    let clip;
    try {
      updateCamTitle('Get ready!');
      await countdown(cam.timer);
      if (m.id === 'boomerang') clip = await captureFrames(m.secs, 20, false);
      else if (m.id === 'strobe') clip = await captureFrames(m.secs, 5, true);
      else clip = await recordCamera(m.secs);
    } catch (e) {
      $('camCount').hidden = true; $('camRec').hidden = true; setBusy(false); updateCamTitle();
      if (e.message !== 'cancel') toast('Recording failed');
      return;
    }
    setBusy(false);
    cam.last = { mode: m, clip, mirror: cam.facing === 'user' };
    keepClip();
    // props worn in the camera ride along on the video, one set per face that was in view
    state.vstickers = state.vstickers.filter(st => !(st.face && st.face.cam));
    for (let k = 0; k < Math.max(1, live.count); k++) state.camProps.forEach(cp => state.vstickers.push(camSticker(cp, 0, k)));
    saveSettings();
    closeCamera();
    await buildVideo();
  }
  async function captureFrames(secs, fps, strobe) {
    const frames = [], total = Math.round(secs * fps);
    cam.recording = true; $('camRec').hidden = false;
    try {
      for (let i = 0; i < total; i++) {
        if (cam.cancel) throw new Error('cancel');
        if (cam.stopEarly && frames.length >= 4) break;
        const t0 = performance.now();
        const f = grabFrame(720);
        if (f) frames.push(f);
        if (strobe) flash(true);
        $('camRec').textContent = `● REC ${((i + 1) / fps).toFixed(1)}s`;
        const wait = 1000 / fps - (performance.now() - t0);
        if (wait > 0) await sleep(wait);
      }
    } finally { cam.recording = false; $('camRec').hidden = true; }
    if (frames.length < 2) throw new Error('nocam');
    return { frames };
  }
  async function recordCamera(secs) {
    const mime = pickMime();
    const rec = new MediaRecorder(cam.stream, mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start(200);
    cam.recording = true; $('camRec').hidden = false;
    const t0 = performance.now();
    let el = 0;
    let still = null;
    while ((el = (performance.now() - t0) / 1000) < secs) {
      if (cam.cancel || (cam.stopEarly && el > 1)) break;
      if (!still && el > Math.min(.5, secs / 2)) still = grabFrame(720);   // a frame for the design preview
      $('camRec').textContent = `● REC ${el.toFixed(1)}s`;
      await sleep(100);
    }
    rec.stop(); await stopped;
    cam.recording = false; $('camRec').hidden = true;
    if (cam.cancel) throw new Error('cancel');
    return { blob: new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' }), secs: Math.min(secs, el), still: still || grabFrame(720), zoom: cam.dzoom || 1 };
  }

  // Renders frames into a 720×1280 framed picture: background, caption, photo frame, stickers.
  const GIF_FPS = 12, GIF_MAX = 96;
  // plain: just the clip (whole camera frame, with filter, stickers & text), no booth background
  function videoComposer(plain) {
    const W = 720, H = 1280, top = 80, pw = 600, ph = 800;
    const L = { W, H, rects: [{ x: (W - pw) / 2, y: top, w: pw, h: ph }], border: 14,
      cap: { x: 0, y: top + ph + 14, w: W, h: H - (top + ph + 14) - 12 } };
    const theme = THEMES[state.theme];
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const bctx = bg.getContext('2d');
    theme.draw(bctx, W, H, themeRng(state.theme + 'video'));
    drawCaption(bctx, L, theme);
    // the booth/plain picture is drawn on `stage`; `out` is what gets recorded (a social size, or the same canvas)
    const stage = document.createElement('canvas'); stage.width = W; stage.height = H;
    const octx = stage.getContext('2d');
    const Z = state.vidSize && state.vidSize !== 'orig' ? sizeOf(state.vidSize) : null, zk = Z ? 1280 / Math.max(Z.w, Z.h) : 1;
    const out = Z ? document.createElement('canvas') : stage;
    if (Z) { out.width = Math.round(Z.w * zk) & ~1; out.height = Math.round(Z.h * zk) & ~1; }
    const blurTmp = document.createElement('canvas');
    const frame = document.createElement('canvas');
    const fctx = frame.getContext('2d', { willReadFrequently: true });
    const holder = { canvas: frame, zoom: 1, cx: null, cy: null, raw: true };
    const jit = { deg: 0, dx: 0, dy: 0 };
    const faceCache = new WeakMap();   // boomerang frames repeat, so find their faces once
    const maskCache = new WeakMap(), meshCache = new WeakMap(), swapOut = document.createElement('canvas');
    const swapOn = () => state.bgSwap !== 'none' && !(state.bgSwap === 'custom' && !swapImage) && PBFace.segReady();
    const comp = {
      out, stage, W, H, gif: [], gifDelay: 1000 / GIF_FPS, collect: true, lastGrab: -1e9,
      track: new Map(), raw: null,
      // faces found in the last frame, in picture coordinates
      facesOf(raw) { return raw ? placeFaces(raw, photoXform(holder, L.rects[0], jit, L.border), 0, W, H) : null; },
      draw(src, mirror, opts = {}) {
        const fw = src.videoWidth || src.width, fh = src.videoHeight || src.height;
        if (!fw) return;
        const z = opts.zoom || 1, sw = fw / z, sh = fh / z;         // digital zoom from the camera
        const sc = Math.min(1, (plain ? 1280 : 720) / Math.max(sw, sh)), w = Math.round(sw * sc), h = Math.round(sh * sc);
        if (frame.width !== w || frame.height !== h) { frame.width = w; frame.height = h; }
        fctx.save();
        if (mirror) { fctx.translate(w, 0); fctx.scale(-1, 1); }
        fctx.drawImage(src, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, w, h);
        fctx.restore();
        if (opts.keepRaw) {                                    // an unfiltered copy, to look for faces in later
          comp.raw = document.createElement('canvas'); comp.raw.width = w; comp.raw.height = h;
          comp.raw.getContext('2d').drawImage(frame, 0, 0);
        }
        let raw = null;
        if (opts.stickers !== false && PBFace.ready() && state.vstickers.some(st => st.face)) {
          raw = !(src instanceof HTMLVideoElement) && faceCache.get(src);
          if (!raw) { raw = PBFace.detect(frame) || []; if (!(src instanceof HTMLVideoElement)) faceCache.set(src, raw); }
        }
        let mesh = null;
        if (paintOn() && PBFace.meshReady()) {
          mesh = !(src instanceof HTMLVideoElement) && meshCache.get(src);
          if (!mesh) { mesh = PBFace.meshes(frame) || []; if (!(src instanceof HTMLVideoElement)) meshCache.set(src, mesh); }
        }
        let mask = null;
        if (swapOn()) {
          mask = !(src instanceof HTMLVideoElement) && maskCache.get(src);
          if (!mask) { mask = PBFace.personMask(frame); if (mask && !(src instanceof HTMLVideoElement)) maskCache.set(src, mask); }
        }
        const clipT = (opts.t != null ? opts.t : performance.now()) / 1000;
        PBFilters.applyFrame(fctx, w, h, state.filter, state.adj);
        if (mask) { composeSwap(frame, mask, swapOut); fctx.drawImage(swapOut, 0, 0); }
        if (mesh) mesh.forEach(m => PBPaint.draw(fctx, m.map(q => ({ x: q.x * w, y: q.y * h })), state.facePaint));
        if (plain) {
          const T = photoXform(holder, L.rects[0], jit, L.border);
          const ow = w & ~1, oh = h & ~1;                               // even sizes keep video encoders happy
          if (stage.width !== ow || stage.height !== oh) { stage.width = ow; stage.height = oh; }
          octx.drawImage(frame, 0, 0, ow, oh);
          const stt = stampText(); if (stt) PBStamp.draw(octx, ow, oh, stt);
          if (opts.flash) { octx.fillStyle = `rgba(255,255,255,${opts.flash})`; octx.fillRect(0, 0, ow, oh); }
          if (opts.stickers !== false) {
            octx.save(); T.toPhoto(octx, ow / w, 0, 0);
            drawStickers(octx, state.vstickers, W, H, comp.facesOf(raw), comp.track, clipT);
            octx.restore();
          }
        } else {
          octx.drawImage(bg, 0, 0);
          drawPhoto(octx, holder, L.rects[0], jit, L.border, 0, mulberry32(7));
          if (opts.flash) { octx.fillStyle = `rgba(255,255,255,${opts.flash})`; octx.fillRect(0, 0, W, H); }
          if (opts.stickers !== false) drawStickers(octx, state.vstickers, W, H, comp.facesOf(raw), comp.track, clipT);
          drawEdge(octx, W, H);
        }
        if (Z) fitInto(out.getContext('2d'), stage, out.width, out.height, state.vidFit, blurTmp);
        if (comp.collect && opts.stickers !== false) {
          const now = opts.t != null ? opts.t : performance.now();
          if (now - comp.lastGrab >= comp.gifDelay - 1) {
            comp.lastGrab = now;
            const gs = 360 / Math.max(out.width, out.height / (16 / 9));
            const g = document.createElement('canvas'); g.width = Math.round(out.width * gs); g.height = Math.round(out.height * gs);
            g.getContext('2d').drawImage(out, 0, 0, g.width, g.height);
            comp.gif.push(g);
            if (comp.gif.length > GIF_MAX) { comp.gif = comp.gif.filter((_, i) => i % 2 === 0); comp.gifDelay *= 2; }
          }
        }
      }
    };
    return comp;
  }
  async function recordCanvas(cv, fps, run) {
    const stream = cv.captureStream(fps);
    // background music, synthesized and mixed straight into the recording
    let song = null, ac = null;
    if (state.music && state.music !== 'none' && window.PBMusic) {
      try {
        ac = audioCtx();
        const dest = ac.createMediaStreamDestination();
        song = PBMusic.play(ac, dest, state.music);
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      } catch (e) { song = null; }
    }
    const mime = pickMime(!!song);
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start(250);
    await run();
    await sleep(150);
    rec.stop(); await stopped;
    if (song) song.stop();
    stream.getTracks().forEach(t => t.stop());
    return new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' });
  }
  function loadClipVideo(blob) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    v.style.cssText = 'position:fixed;left:-10px;top:-10px;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.appendChild(v);
    const url = URL.createObjectURL(blob);
    v.src = url;
    const ready = new Promise((res, rej) => {
      v.onloadeddata = () => res(); v.onerror = () => rej(new Error('Could not play the recording'));
      setTimeout(res, 5000);
    });
    return { v, ready, dispose() { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); URL.revokeObjectURL(url); } };
  }

  async function makeVideo(m, clip, mirror) {
    const comp = videoComposer(state.vplain);
    const wrap = $('makingWrap'); wrap.innerHTML = ''; wrap.appendChild(comp.out);
    $('makingTitle').textContent = `Making your ${plain(m.label).toLowerCase()}…`;
    $('making').hidden = false; syncScroll();
    const pct = (p) => { $('makingPct').textContent = Math.round(Math.min(1, p) * 100) + '%'; };
    if (paintOn() && !PBFace.meshReady()) {
      $('makingTitle').textContent = 'Getting face paint ready…';
      const off = setInterval(() => pct(PBFace.progress), 200);
      await PBFace.loadMesh();
      clearInterval(off); pct(0);
    }
    if (state.bgSwap !== 'none' && !PBFace.segReady()) {
      $('makingTitle').textContent = 'Getting the background swap ready…';
      const off = setInterval(() => pct(PBFace.progress), 200);
      await PBFace.loadSegmenter();
      clearInterval(off); pct(0);
    }
    if (state.vstickers.some(st => st.face) && !PBFace.ready()) {
      // props that follow faces need the face finder; show its download instead of a frozen 0%
      const title = $('makingTitle').textContent;
      $('makingTitle').textContent = 'Getting face tracking ready…';
      const off = setInterval(() => pct(PBFace.progress), 200);
      await PBFace.load();
      clearInterval(off);
      $('makingTitle').textContent = title; pct(0);
    }
    try {
      if (clip.frames) {
        // Boomerang: forward + backward, looped. Strobe: each frame held briefly with a white flash between.
        const f = clip.frames, seq = [];
        if (m.id === 'strobe') {
          f.forEach(fr => { seq.push({ fr, flash: .85 }, { fr }, { fr }, { fr }); });
        } else {
          f.concat(f.slice(1, -1).reverse()).forEach(fr => seq.push({ fr }));
        }
        const loops = m.id === 'strobe' ? 2 : 3, fps = m.id === 'strobe' ? 16 : 25;
        const all = []; for (let l = 0; l < loops; l++) all.push(...seq);
        comp.draw(all[0].fr, false, { t: 0 });
        const blob = await recordCanvas(comp.out, fps, async () => {
          const t0 = performance.now();
          for (let i = 0; i < all.length; i++) {
            if (i === seq.length) comp.collect = false;          // the GIF loops by itself, one pass is enough
            comp.draw(all[i].fr, false, { flash: all[i].flash, t: i * 1000 / fps });
            pct(i / all.length);
            const wait = t0 + (i + 1) * 1000 / fps - performance.now();
            if (wait > 0) await sleep(wait);
          }
        });
        return { blob, gif: comp.gif, gifDelay: comp.gifDelay };
      }
      // Slow-mo & 360 spin: play the recording at changing speeds while recording the framed canvas.
      const cv = loadClipVideo(clip.blob);
      await cv.ready;
      const v = cv.v, secs = clip.secs;
      const rateAt = (t) => { const f = t / secs; return m.id === 'slowmo' ? (f < .15 ? 1 : .5) : (f < .2 ? 1.5 : f < .72 ? .5 : 1.75); };
      try {
        comp.draw(v, mirror, { t: 0, zoom: clip.zoom });
        const blob = await recordCanvas(comp.out, 30, () => new Promise((resolve) => {
          let done = false;
          const guard = setTimeout(() => finish(), (secs / .5 + 4) * 1000);
          function finish() { if (done) return; done = true; clearTimeout(guard); resolve(); }
          v.onended = finish;
          v.currentTime = 0;
          v.playbackRate = rateAt(0);
          v.play().catch(finish);
          const t0 = performance.now();
          const tick = () => {
            if (done) return;
            const t = v.currentTime, r = rateAt(t);
            if (Math.abs(v.playbackRate - r) > .01) v.playbackRate = r;
            comp.draw(v, mirror, { t: performance.now() - t0, zoom: clip.zoom });
            pct(t / secs);
            if (t >= secs - .04 || (v.paused && t > 0.2)) { finish(); return; }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }));
        return { blob, gif: comp.gif, gifDelay: comp.gifDelay };
      } finally { cv.dispose(); }
    } finally {
      $('making').hidden = true; syncScroll();
    }
  }

  let vid = { url: null, file: null, gif: null, gifDelay: 83, name: '' };
  async function buildVideo() {
    const L = cam.last;
    if (!L) return;
    try {
      const res = await makeVideo(L.mode, L.clip, L.mirror);
      showVideoResult(res, L.mode);
      drawVideoPreview();
    } catch (e) {
      toast('Could not make the video: ' + (e && e.message || e));
    }
  }
  // ---- "Your video" on the main page: live design preview + remake, and the clip kept on the device ----
  const designSig = () => JSON.stringify([designOf(), state.vplain, state.music, state.adj, state.bgSwap, state.facePaint, swapImageId]);
  let vidPrevTimer = 0;
  function videoPreviewSoon() { if (!cam.last) return; clearTimeout(vidPrevTimer); vidPrevTimer = setTimeout(drawVideoPreview, 250); }
  function clipStill(clip) { return clip.frames ? clip.frames[Math.floor(clip.frames.length / 2)] : clip.still; }
  // before anything is recorded, a stand-in frame shows how the design will look
  let placeholder = null;
  function placeholderFrame() {
    if (placeholder) return placeholder;
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, '#d8cbe8'); g.addColorStop(1, '#9f8ab8'); x.fillStyle = g; x.fillRect(0, 0, 640, 480);
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath(); x.arc(320, 200, 80, 0, 7); x.fill();
    x.beginPath(); x.ellipse(320, 470, 170, 150, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#5b4a73'; x.font = '700 30px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('Your video goes here', 320, 60);
    return (placeholder = c);
  }
  function drawVideoPreview() {
    const L = cam.last;
    if (state.appMode === 'video') buildVidSettings();
    const src = L ? clipStill(L.clip) : placeholderFrame();
    if (!src) return;
    const comp = videoComposer(state.vplain); comp.collect = false;
    comp.draw(src, false, { t: 0 });
    const out = $('vidPreview'), k = Math.min(1, 540 / Math.max(comp.out.width, comp.out.height));
    out.width = Math.round(comp.out.width * k); out.height = Math.round(comp.out.height * k);
    out.getContext('2d').drawImage(comp.out, 0, 0, out.width, out.height);
    const dirty = !!vid.url && vid.sig !== designSig();
    $('vidPrevHint').classList.toggle('dirty', dirty);
    $('vidPrevHint').innerHTML = dirty
      ? '✨ You changed the design — tap <b>Remake video</b> to put it in the video.'
      : 'Change the background, message, filters, face paint or stickers above and this preview follows along. Tap <b>Remake video</b> to rebuild it (takes a few seconds).';
    $('vidOpen').disabled = !vid.url;
    $('vidRemake').disabled = $('vidStickers2').disabled = !L;
    if (!L) $('vidPrevHint').innerHTML = 'Record a video and it shows up here with your design. Change the background, message, filters and more first if you like.';
    $('vidMain').textContent = !L ? '🎥 Record a video' : vid.url && !dirty ? '▶️ Open your video' : '🎬 Make the video';
  }
  $('vidRemake').addEventListener('click', () => { try { audioCtx(); } catch (e) { /* no audio */ } buildVideo(); });
  $('vidOpen').addEventListener('click', () => { if (!vid.url) return; $('videoSheet').hidden = false; syncScroll(); $('outVideo').play().catch(() => {}); });
  $('vidStickers2').addEventListener('click', () => { $('videoSheet').hidden = true; $('vidStickers').click(); });
  $('vidNew').addEventListener('click', () => openCamera({ mode: cam.lastOf.video || 'boomerang' }));
  $('vidDesign').addEventListener('click', () => {
    closeVideoSheet(); drawVideoPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('🎨 Change the design, then tap 🎬 Remake video');
  });
  // keep the last clip so the video can be remade after closing the app
  async function keepClip() {
    const L = cam.last; if (!L || !window.indexedDB) return;
    try {
      const jpg = (c) => new Promise(r => c.toBlob(r, 'image/jpeg', .9));
      const rec = { mode: L.mode.id, mirror: L.mirror };
      if (L.clip.frames) rec.frames = await Promise.all(L.clip.frames.map(jpg));
      else { rec.blob = L.clip.blob; rec.secs = L.clip.secs; rec.still = L.clip.still ? await jpg(L.clip.still) : null; }
      await photoTx('readwrite', s => s.put(rec, 'lastclip'));
    } catch (e) { /* storage full: the clip just won't survive a reload */ }
  }
  async function restoreClip() {
    try {
      const rec = await photoTx('readonly', s => s.get('lastclip'));
      if (!rec) return;
      const toCanvas = async (b) => {
        const bmp = await createImageBitmap(b), c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return c;
      };
      const clip = rec.frames ? { frames: await Promise.all(rec.frames.map(toCanvas)) }
        : { blob: rec.blob, secs: rec.secs, still: rec.still ? await toCanvas(rec.still) : null };
      cam.last = { mode: CAM_MODES.find(m => m.id === rec.mode) || CAM_MODES[3], clip, mirror: rec.mirror };
      drawVideoPreview();
    } catch (e) { /* nothing kept */ }
  }

  function showVideoResult(res, m) {
    if (vid.url) URL.revokeObjectURL(vid.url);
    const ext = /mp4/.test(res.blob.type) ? 'mp4' : 'webm';
    vid = { url: URL.createObjectURL(res.blob), gif: res.gif, gifDelay: res.gifDelay, name: `photobooth-${m.id}-${stamp()}` };
    vid.sig = designSig();
    vid.file = new File([res.blob], `${vid.name}.${ext}`, { type: res.blob.type || 'video/' + ext });
    // with music, try to play it with sound (browsers may insist on muted until the next tap)
    const v = $('outVideo'); v.src = vid.url; v.muted = !state.music || state.music === 'none';
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    $('vidDl').href = vid.url; $('vidDl').download = vid.file.name;
    fillSizeSelect($('vidSize'), state.vidSize); $('vidFit').value = state.vidFit; $('vidFit').hidden = state.vidSize === 'orig';
    chipGroup($('vidMusic'), PBMusic.TUNES, t => (state.music || 'none') === t.id, async t => {
      if (state.music === t.id) return;
      try { audioCtx(); } catch (e) { /* no audio here */ }
      state.music = t.id; saveSettings();
      closeVideoSheet(); await buildVideo();
    });
    chipGroup($('vidModes'), [{ v: false, label: '🎉 Booth design' }, { v: true, label: '🎥 Just the video' }],
      o => !!state.vplain === o.v, async o => {
        if (!!state.vplain === o.v) return;
        state.vplain = o.v; saveSettings();
        closeVideoSheet(); await buildVideo();
      });
    $('vidShare').hidden = !(navigator.canShare && navigator.canShare({ files: [vid.file] }));
    $('vidApng').hidden = !PBEncoders.apngSupported();
    $('vidGif').textContent = '🎞️ GIF'; $('vidApng').textContent = '🖼️ Animated PNG';
    $('videoHint').innerHTML = isIOS
      ? '<b>To save to Photos:</b> tap 📤 Share, then <b>Save Video</b>. ⬇️ saves to the Files app.<br>🎞️ GIF makes a looping animation for texts &amp; social.'
      : isAndroid
        ? '⬇️ saves the video to your phone (Downloads / Gallery).<br>🎞️ GIF makes a looping animation for texts &amp; social.'
        : '⬇️ downloads the video. 🎞️ GIF and 🖼️ Animated PNG make looping animations.';
    $('videoSheet').hidden = false; syncScroll();
  }
  function closeVideoSheet() { $('videoSheet').hidden = true; $('outVideo').pause(); syncScroll(); }
  $('vidClose').addEventListener('click', closeVideoSheet);
  const remakeFor = (k) => async (e) => { state[k] = e.target.value; saveSettings(); closeVideoSheet(); await buildVideo(); };
  $('vidSize').addEventListener('change', remakeFor('vidSize'));
  $('vidFit').addEventListener('change', remakeFor('vidFit'));
  $('vidShare').addEventListener('click', async () => { try { await navigator.share({ files: [vid.file] }); } catch (e) { /* cancelled */ } });
  $('vidRetake').addEventListener('click', () => { const m = cam.last && cam.last.mode; closeVideoSheet(); openCamera({ mode: m ? m.id : 'boomerang' }); });

  async function exportAnim(kind) {
    const btn = kind === 'gif' ? $('vidGif') : $('vidApng');
    if (!vid.gif || !vid.gif.length || btn.disabled) return;
    btn.disabled = true;
    const label = btn.textContent;
    try {
      const frames = vid.gif.map(c => c.getContext('2d').getImageData(0, 0, c.width, c.height));
      const prog = (p) => { btn.textContent = `Making… ${Math.round(p * 100)}%`; };
      prog(0); await sleep(30);
      const blob = kind === 'gif'
        ? await PBEncoders.encodeGIF(frames, vid.gifDelay, prog)
        : await PBEncoders.encodeAPNG(frames, vid.gifDelay, prog);
      const hint = kind === 'gif'
        ? (isIOS ? '<b>To save to Photos:</b> press and hold the animation, then <b>Save to Photos</b> — it stays animated.<br>⬇️ saves the .gif to Files.' : '⬇️ saves the looping GIF. Great for texts and social posts.')
        : 'Animated PNG keeps full color, but some apps (including iPhone Photos) show it as a still image. For texts &amp; social, GIF works everywhere.';
      showSaveSheet(blob, `${vid.name}.${kind === 'gif' ? 'gif' : 'png'}`, kind === 'gif' ? 'Your GIF is ready 🎞️' : 'Your animated PNG is ready', hint);
    } catch (e) {
      toast('Could not make the animation');
    } finally { btn.disabled = false; btn.textContent = label; }
  }
  $('vidGif').addEventListener('click', () => exportAnim('gif'));
  $('vidApng').addEventListener('click', () => exportAnim('apng'));

  // stickers on videos: edit on the first frame, then re-make the video with them
  $('vidStickers').addEventListener('click', async () => {
    const L = cam.last; if (!L) return;
    let base;
    const comp = videoComposer(); comp.collect = false;
    if (L.clip.frames) comp.draw(L.clip.frames[Math.floor(L.clip.frames.length / 2)], false, { stickers: false, keepRaw: true });
    else {
      const cv = loadClipVideo(L.clip.blob);
      try {
        await cv.ready;
        await new Promise(r => { cv.v.onseeked = r; cv.v.currentTime = Math.min(.5, L.clip.secs / 2); setTimeout(r, 1500); });
        comp.draw(cv.v, L.mirror, { stickers: false, keepRaw: true });
      } finally { cv.dispose(); }
    }
    base = document.createElement('canvas'); base.width = comp.W; base.height = comp.H;
    const bctx = base.getContext('2d');
    bctx.drawImage(comp.stage, 0, 0);                        // stickers live in booth-picture coordinates
    // props are placed on this frame; while the video is made they follow each face
    let faces = null;
    PBFace.load().then(ok => { faces = comp.facesOf(ok && comp.raw ? PBFace.detect(comp.raw) : []) || []; facesChanged(); });
    closeVideoSheet();
    openStickers({
      list: state.vstickers,
      getBase: () => base,
      getFaces: () => faces,
      video: true,
      onDone: async (changed) => { saveSettings(); if (changed) await buildVideo(); else $('videoSheet').hidden = false, syncScroll(); }
    });
  });

  // ================= start =================
  PBFace.onProgress(() => { if (!$('stickerEd').hidden) requestAnimationFrame(drawStEd); buildSwapChips(); });
  loadSettings();
  addSearch($('presets'), '🔍 Search occasions (e.g. july, dad, easter)');
  addSearch($('themes'), '🔍 Search backgrounds');
  addSearch($('filterTiles'), '🔍 Search filters');
  syncAdj(); buildDesigns(); buildSwapChips(); buildPaintChips(); buildStampChips();
  setTimeout(readDesignLink, 300);
  buildThemes();
  buildEmojis();
  syncUI();
  buildFilterTiles();
  render();
  setAppMode(state.appMode);
  restoreClip();
  restorePhotos().then(n => {
    if (!n) return;
    buildSlots(); schedule();
    toast(`Welcome back! Your ${n === 1 ? 'photo is' : n + ' photos are'} still here 📸`);
  });

  $('boot').remove();

  // Face tracking is ~12 MB, so it downloads quietly in the background once the app is up (skipped when
  // the phone asks to save data — it then loads when someone opens the sticker studio). Everything
  // else works while it downloads; face props just start snapping on once it's ready.
  window.addEventListener('load', () => {
    if (navigator.connection && navigator.connection.saveData) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
    setTimeout(() => idle(() => PBFace.load()), 2000);
  });

  // Offline support + automatic updates. The worker is scoped to this folder so it never touches other
  // apps on the same site. A new version installs in the background and takes over; the page reloads
  // right away if nothing is in progress, otherwise it offers a one-tap reload so no photos are lost.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    let controlled = !!navigator.serviceWorker.controller;
    let reloading = false;
    const reload = () => { if (!reloading) { reloading = true; location.reload(); } };
    // photos are kept on the device, so only something open on screen (camera, editor, a video being made) blocks it
    const busy = () => OVERLAYS.some(id => !$(id).hidden) || !$('camera').hidden;
    if (/[?&]fresh=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controlled) { controlled = true; return; }            // first install taking over: nothing to refresh
      if (busy()) $('updateBar').hidden = false; else reload();
    });
    $('updateBtn').addEventListener('click', reload);
    window.addEventListener('load', async () => {
      let reg;
      try { reg = await navigator.serviceWorker.register('sw.js', { scope: './' }); } catch (e) { return; }
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 30 * 60 * 1000);
      showVersion();
    });

    // ---- "Check for updates": asks the server which version is current and, if the automatic update
    // doesn't take over within a few seconds, clears this app's cached files and loads a fresh copy.
    // (Only this app's caches; photos, designs and other apps on the site are untouched.)
    const PREFIX = 'birthday-photobooth-';
    const myVersion = async () => {
      const k = (await caches.keys()).find(n => n.startsWith(PREFIX) && n !== PREFIX + 'vendor');
      return k ? k.slice(PREFIX.length) : null;
    };
    async function showVersion() {
      try { const v = await myVersion(); if (v) $('appVersion').textContent = 'Version ' + v.slice(0, 7); } catch (e) { /* no caches */ }
    }
    async function freshCopy() {
      toast('Getting the newest version…');
      try {
        for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== PREFIX + 'vendor') await caches.delete(k);
        const reg = await navigator.serviceWorker.getRegistration('./');
        if (reg) await reg.unregister();
      } catch (e) { /* carry on with the reload */ }
      reloading = true;
      location.replace(location.pathname + '?fresh=' + Date.now());
    }
    $('forceUpdate').addEventListener('click', async () => {
      if (!navigator.onLine) { toast("You're offline — connect to the internet to update"); return; }
      const btn = $('forceUpdate'); btn.disabled = true; btn.textContent = '🔄 Checking…';
      try {
        const text = await (await fetch('sw.js?check=' + Date.now(), { cache: 'no-store' })).text();
        const m = /CACHE = PREFIX \+ '([^']+)'/.exec(text), latest = m && m[1], mine = await myVersion();
        if (latest && mine && latest === mine) {
          if (confirm(`You already have the newest version (${mine.slice(0, 7)}).\nReload a fresh copy anyway?`)) freshCopy();
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration('./');
        if (reg) { await reg.update().catch(() => {}); if (reg.waiting) reg.waiting.postMessage('skipWaiting'); }
        toast('Updating…');
        setTimeout(() => { if (!reloading) freshCopy(); }, 6000);   // didn't switch over by itself
      } catch (e) {
        toast("Couldn't reach the server — try again in a moment");
      } finally { btn.disabled = false; btn.textContent = '🔄 Check for updates'; }
    });
  }
})();
