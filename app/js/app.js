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
    if (shape === 'oval') {
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
  function decorate(ctx, W, H, r, kind, colors) {
    const s = W / 900;
    const col = () => pick(r, colors);
    switch (kind) {
      case 'confetti': confettiPieces(ctx, W, H, r, Math.round(W * H / 5500), colors, s); break;
      case 'dots':
        for (let i = 0; i < Math.round(W * H / 9000); i++) {
          ctx.fillStyle = col(); ctx.beginPath(); ctx.arc(r() * W, r() * H, (6 + r() * 16) * s, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'stars':
        for (let i = 0; i < Math.round(W * H / 16000); i++) { ctx.fillStyle = col(); star(ctx, r() * W, r() * H, (10 + r() * 22) * s, r() * Math.PI); }
        break;
      case 'hearts':
        for (let i = 0; i < Math.round(W * H / 14000); i++) { ctx.fillStyle = col(); heart(ctx, r() * W, r() * H, (12 + r() * 26) * s, (r() - .5) * .8); }
        break;
      case 'balloons':
        for (let i = 0; i < Math.round(H / 110); i++) {
          const edge = r() < 0.5 ? r() * W * 0.14 : W - r() * W * 0.14;
          balloon(ctx, r() < 0.75 ? edge : r() * W, r() * H, (34 + r() * 36) * s, col());
        }
        break;
      case 'snow':
        for (let i = 0; i < Math.round(W * H / 4000); i++) {
          ctx.fillStyle = col(); ctx.beginPath(); ctx.arc(r() * W, r() * H, (1.5 + r() * 3) * s, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < Math.round(W * H / 20000); i++) { ctx.strokeStyle = col(); snowflake(ctx, r() * W, r() * H, (12 + r() * 24) * s, 3 * s); }
        break;
      case 'sparkles':
        for (let i = 0; i < Math.round(W * H / 12000); i++) { ctx.fillStyle = col(); sparkle(ctx, r() * W, r() * H, (6 + r() * 16) * s); }
        break;
      case 'flowers':
        for (let i = 0; i < Math.round(W * H / 20000); i++) flower(ctx, r() * W, r() * H, (14 + r() * 20) * s, col(), r() * 6);
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
    custom: { name: 'Your Colors', custom: true,
      get accent() { return shade(state.custom.c2, -0.45); },
      draw(ctx, W, H, r) {
        const c = state.custom;
        vGrad(ctx, W, H, [c.c1, c.c2], true);
        if (c.deco !== 'none') decorate(ctx, W, H, r, c.deco, DECO_COLORS[c.decoColor] || DECO_COLORS.bright);
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

  const FONTS = {
    playful: { label: 'Playful', main: '900', sub: '800', fam: ROUNDED, k: .2 },
    bold: { label: 'Bold', main: '900', sub: '700', fam: 'Impact,"Arial Black","Franklin Gothic Heavy",sans-serif', k: .16 },
    classic: { label: 'Classic', main: '700', sub: '600', fam: '"Helvetica Neue",Helvetica,Arial,system-ui,sans-serif', k: .18 },
    elegant: { label: 'Elegant', main: 'italic 700', sub: 'italic 600', fam: 'Didot,"Bodoni 72","Bodoni MT",Georgia,"Times New Roman",serif', k: .14 },
    script: { label: 'Script', main: '700', sub: '600', fam: '"Snell Roundhand","Brush Script MT","Segoe Script","Apple Chancery","Dancing Script",cursive', k: .12 }
  };

  const PRESETS = [
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

  const EMOJIS = ['🎉', '🎈', '🎂', '🎁', '🥳', '🎊', '✨', '⭐', '❤️', '💕', '💍', '🥂', '🍾', '💐', '🎓', '🏆',
    '🍼', '👶', '🎄', '❄️', '☃️', '🎃', '👻', '🦇', '🎆', '🇺🇸', '🍂', '🦃', '🥧', '🌻', '🌸', '🌈',
    '☀️', '🌴', '🏖️', '🪩', '🎵', '🎤', '📸', '⚽', '🏀', '🏈', '⚾', '🐶', '🐱', '🦄', '🍀', '🐣'];

  const FRAME_COLORS = { white: '#ffffff', black: '#111111', gold: '#d4af37', pink: '#ffc2d9' };

  // ================= state =================
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const state = {
    photos: [null, null, null, null],
    count: 3, theme: 'confetti', layout: 'strip', style: 'tilt', shape: 'rect', seed: 20260927,
    line1: 'Happy Birthday!', line2: today, font: 'playful',
    textMode: 'auto', textColor: '#ffffff', outlineMode: 'auto', outlineColor: '#540d6e',
    iconLeft: '🎈', iconRight: '🎂', iconPos: 'sub',
    frame: 'white', frameColor: '#ffffff', frameSize: 1, shadow: true,
    edge: 'none', edgeColor: '#ffffff', edgeSize: 2,
    custom: { c1: '#ff9a8b', c2: '#7f53ac', deco: 'confetti', decoColor: 'bright' },
    bgDim: 0.2, preset: 0,
    filter: 'none', stickerSets: {}, vstickers: [], vplain: false, camProps: []
  };
  let bgImage = null;

  const SETTINGS_KEY = 'photobooth-settings-v1';
  const SAVED_KEYS = ['count', 'theme', 'layout', 'style', 'shape', 'seed', 'line1', 'line2', 'font', 'textMode', 'textColor',
    'outlineMode', 'outlineColor', 'iconLeft', 'iconRight', 'iconPos', 'frame', 'frameColor', 'frameSize', 'shadow',
    'edge', 'edgeColor', 'edgeSize', 'custom', 'bgDim', 'preset', 'filter', 'stickerSets', 'vstickers', 'vplain', 'camProps'];
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
      if (!LAYOUTS.some(l => l.id === state.layout)) state.layout = 'strip';
      if (state.frame === 'none') { state.frame = 'white'; state.frameSize = 0; }
      if (!FONTS[state.font]) state.font = 'playful';
      if (state.theme === 'photo') state.theme = 'confetti'; // background photo isn't stored
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
    { id: 'heart', label: '❤️ Heart' }
  ];

  // Every layout returns the canvas size, one rect per photo (optional fixed rotation),
  // a base frame thickness, and the caption box.
  function computeLayout(kind, n) {
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
    const id = p.filter || state.filter;
    if (!id || id === 'none') return p.canvas;
    if (!p._f || p._f.id !== id) p._f = { id, canvas: PBFilters.apply(p.canvas, id) };
    return p._f.canvas;
  }

  // ================= drawing =================
  const EDGE_COLORS = FRAME_COLORS;
  function frameFill() {
    if (state.frameSize <= 0) return null;
    if (state.frame === 'custom') return state.frameColor;
    return FRAME_COLORS[state.frame] || '#ffffff';
  }

  function drawPhoto(ctx, p, rect, jit, border, idx, rng) {
    const style = state.style;
    const card = usesCard();
    const shape = state.shape;
    let fill = frameFill();
    let b = fill ? border * state.frameSize : 0;
    if (card && style === 'polaroid') { fill = fill || '#ffffff'; b = Math.max(b, border); }
    if (card && style === 'film') { fill = (state.frame === 'white' || !fill) ? '#111111' : fill; b = Math.max(b, border * 0.8); }
    const ir = innerRect(rect, border);
    const px = -ir.w / 2, py = -rect.h / 2;              // photo box, top-left
    const photoR = shape === 'rounded' ? Math.min(ir.w, ir.h) * 0.08 : 0;

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
    } else if (shape === 'heart' || shape === 'oval') {
      shapePath(ctx, shape, px, py, ir.w, ir.h, 0);
    } else {
      const rr = shape === 'rounded' ? photoR + b : (b ? b * 0.8 : 0);
      shapePath(ctx, shape, px - b, py - b, ir.w + 2 * b, ir.h + 2 * b, rr);
    }
    if (fill || state.shadow) ctx.fill();
    if (!card && b && (shape === 'heart' || shape === 'oval')) {
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
    shapePath(ctx, card ? 'rect' : shape, px, py, ir.w, ir.h, photoR);
    ctx.clip();
    if (p) {
      const c = cropFor(p, ir.w / ir.h);
      const src = photoSource(p), k = src.width / p.canvas.width;
      ctx.drawImage(src, c.sx * k, c.sy * k, c.sw * k, c.sh * k, px, py, ir.w, ir.h);
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
      for (let i = 0; i < 4; i++) {
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
      for (let i = 0; i < 4; i++) {
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
    state.photos = [null, null, null, null];
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
      el.appendChild(b);
    });
  }

  function buildPresets() {
    chipGroup($('presets'), PRESETS, (_, i) => state.preset === i, (p, i) => {
      state.preset = i;
      state.theme = p.theme; state.line1 = p.line1;
      state.iconLeft = p.left; state.iconRight = p.right; state.font = p.font;
      state.textMode = 'auto'; state.outlineMode = 'auto';
      state.frame = p.frame || 'white';
      if (!state.line2.trim()) state.line2 = today;
      syncUI(); schedule();
    });
  }

  const slotsEl = $('slots');
  function buildSlots() {
    slotsEl.innerHTML = '';
    const n = state.count;
    const full = state.photos.slice(0, n).every(Boolean);
    $('multiLabel').textContent = full ? 'Replace' : 'Upload';
    queueFilterThumbs();
    slotsEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
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
    chipGroup($('counts'), [{ label: '3 photos', n: 3 }, { label: '4 photos', n: 4 }], it => state.count === it.n, it => {
      state.count = it.n; buildCounts(); buildSlots(); schedule();
    });
  }
  function buildLayouts() {
    chipGroup($('layouts'), LAYOUTS, it => state.layout === it.id, it => { state.layout = it.id; buildLayouts(); schedule(); });
    chipGroup($('styles'), STYLES, it => state.style === it.id, it => { state.style = it.id; buildLayouts(); schedule(); });
    chipGroup($('shapes'), SHAPES, it => state.shape === it.id, it => { state.shape = it.id; buildLayouts(); schedule(); });
  }
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
      el.appendChild(b);
      drawThumb(id);
    });
    markThemes();
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
    $('c1').value = state.custom.c1; $('c2').value = state.custom.c2;
    $('deco').value = state.custom.deco; $('decoColor').value = state.custom.decoColor;
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
  $('deco').addEventListener('change', (e) => { state.custom.deco = e.target.value; customChanged(); });
  $('decoColor').addEventListener('change', (e) => { state.custom.decoColor = e.target.value; customChanged(); });

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

  $('jump').addEventListener('click', () => $('previewSection').scrollIntoView({ behavior: 'smooth', block: 'start' }));

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
  const OVERLAYS = ['photoMenu', 'saveSheet', 'videoSheet', 'stickerEd', 'camera', 'making', 'editor', 'party', 'gallery'];
  function syncScroll() { document.body.style.overflow = OVERLAYS.some(id => !$(id).hidden) ? 'hidden' : ''; }
  function stamp() {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  let sheetFile = null, sheetUrl = null;
  function showSaveSheet(blob, name, title, hint, modes) {
    $('saveModes').hidden = !modes; if (!modes) $('savePicks').hidden = true;
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
    const list = curStickers();
    if (list.length) {
      ctx.save(); T.toPhoto(ctx, cv.width / c.sw, c.sx, c.sy);
      drawStickers(ctx, list, L.W, L.H, list.some(st => st.face) ? stripFaces() : null);
      ctx.restore();
    }
    return cv;
  }
  const toJpeg = (cv) => new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92));
  const save = { mode: 'booth', pick: 0, strip: null, photos: [] };
  async function buildSaveSheet() {
    const name = `photobooth-${save.stamp}`;
    if (save.mode === 'booth') {
      if (!save.strip) { render(); save.strip = await toJpeg(canvas); }
      if (!save.strip) { toast('Could not create the image'); return; }
      showSaveSheet(save.strip, `${name}.jpg`, 'Your picture is ready 🎉', photoHint(), true);
    } else {
      const idx = filledIdx();
      if (!save.photos.length) save.photos = await Promise.all(idx.map(async i => new File([await toJpeg(composePhotoOnly(i))], `${name}-photo${i + 1}.jpg`, { type: 'image/jpeg' })));
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
    chipGroup($('saveModes'), [{ id: 'booth', label: '🎉 Booth design' }, { id: 'photos', label: '📷 Just the photos' }],
      m => save.mode === m.id, m => { save.mode = m.id; buildSaveSheet(); });
  }
  $('save').addEventListener('click', () => {
    Object.assign(save, { strip: null, photos: [], pick: 0, stamp: stamp() });
    buildSaveSheet();
  });
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
    set('layout', `${plain(labelOf(LAYOUTS, state.layout))} · ${plain(labelOf(STYLES, state.style))}`);
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
        if (f.adv) toast('Applying ' + f.name + '…');
        setTimeout(schedule, 30);
      });
      el.appendChild(b);
    });
    markFilters();
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
    if (st.kind === 'text') {
      measureCtx.font = textFont(st, 100);
      return { w: Math.max(.2, measureCtx.measureText(st.text || ' ').width / 100 * TEXT_SIZE), h: TEXT_SIZE * 1.3 };
    }
    return { w: 1, h: PBProps.height(st.id) };
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
      c.font = textFont(st, u * TEXT_SIZE); c.fillStyle = st.color || '#ff2d87';
      c.fillText(st.text || '', 0, u * TEXT_SIZE * 0.06);
    } else PBProps.draw(c, st.id, u, st.text);
  }
  // Stickers are rendered once into a small bitmap (with their outline) and reused; sizes are
  // rounded to 8% steps so a face-tracked sticker that grows and shrinks doesn't redraw every frame.
  const bmCache = new Map();
  function stickerBitmap(st, px) {
    const q = Math.max(8, Math.round(Math.pow(1.08, Math.round(Math.log(Math.max(8, px)) / Math.log(1.08)))));
    const border = borderOf(st);
    const key = [st.kind, st.id, st.text, st.color, st.font, border, q].join('|');
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
  function drawSticker(ctx, st, W, H) {
    const unit = st.s * Math.min(W, H);
    ctx.save();
    ctx.translate(st.x * W, st.y * H);
    ctx.rotate(st.r || 0);
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
  function drawStickers(ctx, list, W, H, faces, track) {
    (list || []).forEach(st => {
      let f = null;
      if (st.face && faces) {
        f = track ? trackFace(st, faces, track, W, H)
          : st.face.cam ? faces.find(g => g.slot === st.face.slot && g.idx === st.face.idx) : faceFor(st, faces, W, H);
        if (f) fitToFace(st, f, W, H);
      }
      // props picked in the camera only show up on an actual face
      st._hidden = !!(st.face && st.face.cam && !f);
      if (!st._hidden) drawSticker(ctx, st, W, H);
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
    drawStickers(ctx, stEd.list, V.w, V.h, stEd.faces);
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
    const split = (g) => g.list.split('\t').map(x => { const i = x.indexOf(' '); return { e: x.slice(0, i), n: x.slice(i + 1) }; });
    if (emojiQuery) {
      const q = emojiQuery.toLowerCase();
      return D.flatMap(split).filter(x => x.n.includes(q)).slice(0, 300);
    }
    return D[emojiCat] ? split(D[emojiCat]) : PBProps.EMOJI.map(e => ({ e, n: '' }));
  }
  function buildStickerTray() {
    chipGroup($('stTabs'), STICKER_TABS, t => stEd.tab === t.id, t => { stEd.tab = t.id; buildStickerTray(); });
    const el = $('stItems'); el.innerHTML = ''; el.scrollLeft = 0; el.scrollTop = 0;
    el.classList.toggle('grid', stEd.tab === 'emoji');
    const cats = $('stCats'); cats.hidden = stEd.tab !== 'emoji';
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
      add('🔤 Add your own text', () => { const t = askText('Your text:', ''); if (t) addSticker({ kind: 'text', text: t, color: '#ff2d87', font: 'playful', s: .3 }); }, 'txt wide');
      add('✏️ Your own bubble', () => { const t = askText('Words for the speech bubble:', 'Hooray!', 24); if (t) addSticker({ kind: 'prop', id: 'bubble', text: t, s: .36 }); }, 'txt');
      add('💥 Your own burst', () => { const t = askText('Words for the comic burst:', 'WHOA!', 16); if (t) addSticker({ kind: 'prop', id: 'burst', text: t, s: .34 }); }, 'txt');
      PBProps.WORDS.bubble.forEach(t => add(propIcon('bubble', t), () => addSticker({ kind: 'prop', id: 'bubble', text: t, s: .36 })));
      PBProps.WORDS.burst.forEach(t => add(propIcon('burst', t), () => addSticker({ kind: 'prop', id: 'burst', text: t, s: .34 })));
    } else {
      const D = window.PBEmojiData || [];
      chipGroup($('stCatChips'), D.map((g, i) => ({ i, label: g.icon, title: g.name })), g => !emojiQuery && emojiCat === g.i,
        g => { emojiCat = g.i; emojiQuery = ''; $('stSearch').value = ''; buildStickerTray(); });
      [...$('stCatChips').children].forEach((b, i) => { if (D[i]) { b.title = D[i].name; b.setAttribute('aria-label', D[i].name); } });
      const list = emojiList();
      if (!list.length) add('No emoji match', () => {}, 'txt wide');
      list.forEach(x => add(x.e, () => addSticker({ kind: 'emoji', id: x.e, s: .2 }), '', x.n));
    }
  }
  $('stSearch').addEventListener('input', (e) => { emojiQuery = e.target.value.trim(); buildStickerTray(); });
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
    const sig = [stEd.sel, st.kind, st.border, st.color, st.font].join('|');
    if (styleFor === sig) return;
    styleFor = sig;
    const pick = (fn) => (v) => { const cur = stEd.list[stEd.sel]; if (cur) { fn(cur, v); drawStEd(); } };
    swatches($('stBorders'), BORDER_SWATCHES, borderOf(st), pick((o, v) => { o.border = v; }), 'stBorderCustom');
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
    const t = askText('Change the words:', st.text || '', st.kind === 'text' ? 60 : st.id === 'burst' ? 16 : 24);
    if (t) { st.text = t; drawStEd(); }
  }
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
  $('openStickers').addEventListener('click', openPhotoStickers);
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
  const cam = { stream: null, facing: 'user', mode: 'booth', timer: 3, shots: [], slot: -1, busy: false, cancel: false,
    stopEarly: false, recording: false, glamBW: false, audio: null, last: null };
  const camVideo = $('camVideo');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const camMode = () => CAM_MODES.find(m => m.id === cam.mode) || CAM_MODES[0];
  const shotsNeeded = () => (cam.slot >= 0 ? 1 : state.count);
  const camFilter = () => cam.mode === 'glam' ? (cam.glamBW ? 'glambw' : 'glam') : cam.mode === 'comic' ? 'comic' : state.filter;

  function buildCamUI() {
    const modes = CAM_MODES.filter(m => cam.slot < 0 || m.kind === 'photo');
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
    camVideo.style.transform = cam.facing === 'user' ? 'scaleX(-1)' : 'none';
    camVideo.style.filter = PBFilters.css(camFilter()) || 'none';
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
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cam.facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false
      });
      camVideo.srcObject = cam.stream;
      await camVideo.play().catch(() => {});
      applyPreview();
    } catch (e) {
      const n = e && e.name;
      camError(n === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access for this site in your browser settings, then open the camera again.'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera was found on this device.'
          : 'The camera could not start (' + (n || 'unknown error') + ').');
    }
  }
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

  function beep(freq, dur, vol) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      cam.audio = cam.audio || new AC();
      const a = cam.audio; if (a.state === 'suspended') a.resume();
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
    const sc = Math.min(1, max / Math.max(vw, vh));
    const c = document.createElement('canvas'); c.width = Math.round(vw * sc); c.height = Math.round(vh * sc);
    const x = c.getContext('2d');
    if (cam.facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(camVideo, 0, 0, c.width, c.height);
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
    await startStream();
  });
  $('camTimer').addEventListener('click', () => {
    const opts = [3, 5, 10, 0];
    cam.timer = opts[(opts.indexOf(cam.timer) + 1) % opts.length];
    buildCamUI();
  });
  $('camExtra').addEventListener('click', () => { cam.glamBW = !cam.glamBW; buildCamUI(); applyPreview(); });
  $('openCam').addEventListener('click', () => openCamera());

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
    state.photos = [null, null, null, null];
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
    state.photos = [null, null, null, null]; buildSlots(); schedule();
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
    const wanted = state.camProps.length || !$('camProps').hidden;
    const hint = state.camProps.length && !PBFace.ready()
      ? (PBFace.status === 'failed' ? "Face props aren't available on this device" : `⏳ Getting face props ready… ${Math.round(PBFace.progress * 100)}%`)
      : camHint();
    if ($('camHint').textContent !== hint) $('camHint').textContent = hint;
    if (!wanted || !vw || !PBFace.ready() || !$('camReview').hidden) return;
    const raw = PBFace.detect(camVideo) || [];
    live.count = raw.length;
    if (!state.camProps.length) return;
    // video pixels → screen: the preview is object-fit: cover, and mirrored for the selfie camera
    const k = Math.max(cw / vw, ch / vh), ox = (cw - vw * k) / 2, oy = (ch - vh * k) / 2, mirror = cam.facing === 'user';
    const map = (q) => ({ x: mirror ? cw - (q.x * k + ox) : q.x * k + ox, y: q.y * k + oy });
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
  function pickMime() {
    if (!window.MediaRecorder) return null;
    for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
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
    while ((el = (performance.now() - t0) / 1000) < secs) {
      if (cam.cancel || (cam.stopEarly && el > 1)) break;
      $('camRec').textContent = `● REC ${el.toFixed(1)}s`;
      await sleep(100);
    }
    rec.stop(); await stopped;
    cam.recording = false; $('camRec').hidden = true;
    if (cam.cancel) throw new Error('cancel');
    return { blob: new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' }), secs: Math.min(secs, el) };
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
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const octx = out.getContext('2d');
    const frame = document.createElement('canvas');
    const fctx = frame.getContext('2d', { willReadFrequently: true });
    const holder = { canvas: frame, zoom: 1, cx: null, cy: null, raw: true };
    const jit = { deg: 0, dx: 0, dy: 0 };
    const faceCache = new WeakMap();   // boomerang frames repeat, so find their faces once
    const comp = {
      out, W, H, gif: [], gifDelay: 1000 / GIF_FPS, collect: true, lastGrab: -1e9,
      track: new Map(), raw: null,
      // faces found in the last frame, in picture coordinates
      facesOf(raw) { return raw ? placeFaces(raw, photoXform(holder, L.rects[0], jit, L.border), 0, W, H) : null; },
      draw(src, mirror, opts = {}) {
        const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
        if (!sw) return;
        const sc = Math.min(1, (plain ? 1280 : 720) / Math.max(sw, sh)), w = Math.round(sw * sc), h = Math.round(sh * sc);
        if (frame.width !== w || frame.height !== h) { frame.width = w; frame.height = h; }
        fctx.save();
        if (mirror) { fctx.translate(w, 0); fctx.scale(-1, 1); }
        fctx.drawImage(src, 0, 0, w, h);
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
        PBFilters.applyFrame(fctx, w, h, state.filter);
        if (plain) {
          const T = photoXform(holder, L.rects[0], jit, L.border);
          const ow = w & ~1, oh = h & ~1;                               // even sizes keep video encoders happy
          if (out.width !== ow || out.height !== oh) { out.width = ow; out.height = oh; }
          octx.drawImage(frame, 0, 0, ow, oh);
          if (opts.flash) { octx.fillStyle = `rgba(255,255,255,${opts.flash})`; octx.fillRect(0, 0, ow, oh); }
          if (opts.stickers !== false) {
            octx.save(); T.toPhoto(octx, ow / w, 0, 0);
            drawStickers(octx, state.vstickers, W, H, comp.facesOf(raw), comp.track);
            octx.restore();
          }
        } else {
          octx.drawImage(bg, 0, 0);
          drawPhoto(octx, holder, L.rects[0], jit, L.border, 0, mulberry32(7));
          if (opts.flash) { octx.fillStyle = `rgba(255,255,255,${opts.flash})`; octx.fillRect(0, 0, W, H); }
          if (opts.stickers !== false) drawStickers(octx, state.vstickers, W, H, comp.facesOf(raw), comp.track);
          drawEdge(octx, W, H);
        }
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
    const stream = cv.captureStream(fps), mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start(250);
    await run();
    await sleep(150);
    rec.stop(); await stopped;
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
        comp.draw(v, mirror, { t: 0 });
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
            comp.draw(v, mirror, { t: performance.now() - t0 });
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
    } catch (e) {
      toast('Could not make the video: ' + (e && e.message || e));
    }
  }
  function showVideoResult(res, m) {
    if (vid.url) URL.revokeObjectURL(vid.url);
    const ext = /mp4/.test(res.blob.type) ? 'mp4' : 'webm';
    vid = { url: URL.createObjectURL(res.blob), gif: res.gif, gifDelay: res.gifDelay, name: `photobooth-${m.id}-${stamp()}` };
    vid.file = new File([res.blob], `${vid.name}.${ext}`, { type: res.blob.type || 'video/' + ext });
    const v = $('outVideo'); v.src = vid.url; v.play().catch(() => {});
    $('vidDl').href = vid.url; $('vidDl').download = vid.file.name;
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
    bctx.drawImage(comp.out, 0, 0);
    // props are placed on this frame; while the video is made they follow each face
    let faces = null;
    PBFace.load().then(ok => { faces = comp.facesOf(ok && comp.raw ? PBFace.detect(comp.raw) : []) || []; facesChanged(); });
    closeVideoSheet();
    openStickers({
      list: state.vstickers,
      getBase: () => base,
      getFaces: () => faces,
      onDone: async (changed) => { saveSettings(); if (changed) await buildVideo(); else $('videoSheet').hidden = false, syncScroll(); }
    });
  });

  // ================= start =================
  PBFace.onProgress(() => { if (!$('stickerEd').hidden) requestAnimationFrame(drawStEd); });
  loadSettings();
  buildThemes();
  buildEmojis();
  syncUI();
  buildFilterTiles();
  render();
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
    });
  }
})();
