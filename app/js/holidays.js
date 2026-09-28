/* Holiday backgrounds and occasions, drawn in code (no image files). Each theme draws a W×H background;
   `r()` is a seeded random number so the same design always looks the same. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function grad(ctx, W, H, stops, diag) {
    const g = diag ? ctx.createLinearGradient(0, 0, W, H) : ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function dots(ctx, W, H, r, n, colors, s, min, max) {
    for (let i = 0; i < n; i++) { ctx.fillStyle = pick(r, colors); ctx.beginPath(); ctx.arc(r() * W, r() * H, (min + r() * (max - min)) * s, 0, TAU); ctx.fill(); }
  }
  function star(ctx, x, y, R, rot, n, inner) {
    n = n || 5; inner = inner || .45;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + Math.PI / n * i - Math.PI / 2, rr = i % 2 ? R * inner : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  function heart(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.moveTo(0, s * .8);
    ctx.bezierCurveTo(-s * 1.25, -s * .05, -s * .65, -s * .95, 0, -s * .35);
    ctx.bezierCurveTo(s * .65, -s * .95, s * 1.25, -s * .05, 0, s * .8); ctx.fill(); ctx.restore();
  }
  function sparkle(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }
  function shamrock(ctx, x, y, s, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.rotate(k * TAU / 3); heart(ctx, 0, -s * .55, s * .55, Math.PI); ctx.restore(); }
    ctx.strokeStyle = color; ctx.lineWidth = s * .14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * .2, s * .6, s * .1, s * 1.1); ctx.stroke(); ctx.restore();
  }
  function egg(ctx, x, y, s, rot, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, s * .72, s, 0, 0, TAU); ctx.fillStyle = pick(r, ['#ffc8dd', '#bde0fe', '#caffbf', '#fdffb6', '#ffd6a5', '#e2c2ff']); ctx.fill();
    ctx.save(); ctx.clip();
    const c = pick(r, ['#ff5fa2', '#4cc9f0', '#8ac926', '#ffca3a', '#9b5de5', '#ffffff']);
    ctx.strokeStyle = c; ctx.lineWidth = s * .16; ctx.fillStyle = c;
    const kind = Math.floor(r() * 3);
    if (kind === 0) for (const yy of [-.4, 0, .4]) { ctx.beginPath(); for (let t = -1; t <= 1.01; t += .1) ctx.lineTo(t * s, yy * s + Math.sin(t * 9) * s * .1); ctx.stroke(); }
    else if (kind === 1) for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((r() - .5) * s * 1.2, (r() - .5) * s * 1.7, s * .1, 0, TAU); ctx.fill(); }
    else for (const yy of [-.35, .35]) { ctx.beginPath(); for (let t = -1; t <= 1.01; t += .25) ctx.lineTo(t * s, yy * s + (Math.round(t * 4) % 2 ? .15 : -.15) * s); ctx.stroke(); }
    ctx.restore(); ctx.restore();
  }
  function lantern(ctx, x, y, s, body, trim) {
    ctx.strokeStyle = trim; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x, y - s * .7); ctx.stroke();
    ctx.fillStyle = trim; ctx.fillRect(x - s * .35, y - s * .78, s * .7, s * .16); ctx.fillRect(x - s * .35, y + s * .62, s * .7, s * .16);
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y, s * .75, s * .68, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = s * .04;
    for (const k of [-.4, 0, .4]) { ctx.beginPath(); ctx.ellipse(x, y, s * .75 * Math.abs(k) + s * .05, s * .68, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = trim; ctx.lineWidth = s * .04;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * .08, y + s * .78); ctx.lineTo(x + i * s * .1, y + s * 1.3); ctx.stroke(); }
  }
  function pumpkin(ctx, x, y, s) {
    ctx.fillStyle = '#e8590c';
    for (const k of [-.45, .45, 0]) { ctx.beginPath(); ctx.ellipse(x + k * s, y, s * .55, s * .7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = k ? '#e8590c' : '#f76707'; }
    ctx.fillStyle = '#5c940d'; ctx.fillRect(x - s * .08, y - s * .9, s * .16, s * .3);
  }
  function leaf(ctx, x, y, s, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .9, -s * .2, 0, s); ctx.quadraticCurveTo(-s * .9, -s * .2, 0, -s); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(0, -s * .8); ctx.lineTo(0, s * 1.2); ctx.stroke(); ctx.restore();
  }
  function candle(ctx, x, y, w, h, color, flame) {
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h, w, h);
    if (flame) {
      ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = w * 2; ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.moveTo(x, y - h - w * 1.6); ctx.quadraticCurveTo(x + w * .6, y - h - w * .5, x, y - h - w * .1); ctx.quadraticCurveTo(x - w * .6, y - h - w * .5, x, y - h - w * 1.6); ctx.fill(); ctx.restore();
    }
  }
  function papelPicado(ctx, W, y, s, colors, r) {
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const fw = 90 * s, fh = 110 * s;
    for (let x = 10 * s, i = Math.floor(r() * colors.length); x < W; x += fw + 10 * s, i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + fw, y); ctx.lineTo(x + fw, y + fh * .85);
      for (let k = 6; k >= 0; k--) ctx.lineTo(x + fw * k / 6, y + fh * (k % 2 ? 1 : .85));
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + fw * (.2 + .15 * k), y + fh * (.3 + (k % 2) * .25), 6 * s, 0, TAU); ctx.fill(); }
      star(ctx, x + fw / 2, y + fh * .5, 14 * s, 0);
      ctx.restore();
    }
  }
  function marigold(ctx, x, y, s) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#f08c00', '#ffa94d', '#ffd43b'][k];
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * (.6 - k * .2), y + Math.sin(a) * s * (.6 - k * .2), s * (.35 - k * .08), 0, TAU); ctx.fill(); }
    }
  }
  function diya(ctx, x, y, s) {
    ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y + s * .9, x + s, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(x - s, y - s * .08, s * 2, s * .16);
    ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = s * 1.2; ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.moveTo(x, y - s * 1.1); ctx.quadraticCurveTo(x + s * .4, y - s * .3, x, y - s * .1); ctx.quadraticCurveTo(x - s * .4, y - s * .3, x, y - s * 1.1); ctx.fill(); ctx.restore();
  }
  function rangoli(ctx, x, y, s, colors) {
    for (let k = 0; k < colors.length; k++) {
      ctx.fillStyle = colors[k]; const R = s * (1 - k / colors.length);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * R * .55, y + Math.sin(a) * R * .55, R * .45, R * .22, a, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, s * .15, 0, TAU); ctx.fill();
  }
  function davidStar(ctx, x, y, R, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    for (const o of [0, Math.PI]) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = o + i * TAU / 3 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } ctx.closePath(); ctx.stroke(); }
  }
  function dreidel(ctx, x, y, s, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    ctx.fillRect(-s * .08, -s * 1.1, s * .16, s * .4);
    ctx.beginPath(); ctx.moveTo(-s * .5, -s * .7); ctx.lineTo(s * .5, -s * .7); ctx.lineTo(s * .5, s * .2); ctx.lineTo(0, s * .8); ctx.lineTo(-s * .5, s * .2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `bold ${s * .6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ש', 0, -s * .2);
    ctx.restore();
  }
  function candyCane(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(0, -s * .4); ctx.arc(s * .35, -s * .4, s * .35, Math.PI, 0); };
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .24; path(); ctx.stroke();
    ctx.strokeStyle = '#d62828'; ctx.setLineDash([s * .14, s * .14]); ctx.lineWidth = s * .24; path(); ctx.stroke(); ctx.restore();
  }
  function ornament(ctx, x, y, s, color) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.moveTo(x, y - s * 2.5); ctx.lineTo(x, y - s); ctx.stroke();
    ctx.fillStyle = '#d4af37'; ctx.fillRect(x - s * .25, y - s * 1.15, s * .5, s * .3);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x - s * .35, y - s * .35, s * .25, 0, TAU); ctx.fill();
  }
  function tree(ctx, x, y, s) {
    ctx.fillStyle = '#1b4332';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y - s * (1.4 - k * .35)); ctx.lineTo(x + s * (.45 + k * .15), y - s * (.6 - k * .35)); ctx.lineTo(x - s * (.45 + k * .15), y - s * (.6 - k * .35)); ctx.fill(); }
    ctx.fillStyle = '#6f4518'; ctx.fillRect(x - s * .08, y + s * .1, s * .16, s * .2);
    ctx.fillStyle = '#ffd23f'; star(ctx, x, y - s * 1.4, s * .16, 0);
  }
  function crescent(ctx, x, y, R, color, bg) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x + R * .38, y - R * .15, R * .85, 0, TAU); ctx.fill();
  }
  function firework(ctx, x, y, R, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .25, y + Math.sin(a) * R * .25); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
  }
  function stripes(ctx, W, H, colors, horizontal) {
    const n = colors.length;
    colors.forEach((c, i) => { ctx.fillStyle = c; horizontal ? ctx.fillRect(0, H * i / n, W, H / n + 1) : ctx.fillRect(W * i / n, 0, W / n + 1, H); });
  }

  const T = {
    lunar: { name: 'Lunar New Year', accent: '#7a0000', text: '#ffd166',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#d00000', '#8b0000']); const s = W / 900;
        ctx.strokeStyle = 'rgba(255,210,63,.18)'; ctx.lineWidth = 4 * s;
        for (let y = 60 * s; y < H; y += 120 * s) for (let x = 60 * s; x < W; x += 120 * s) { ctx.beginPath(); ctx.arc(x, y, 40 * s, 0, TAU); ctx.stroke(); }
        for (let i = 0; i < Math.max(4, Math.round(H / 300)); i++) lantern(ctx, (i % 2 ? .08 : .92) * W + (r() - .5) * 40 * s, (i + .5) * H / Math.max(4, Math.round(H / 300)), (40 + r() * 20) * s, '#e5383b', '#ffd166');
        dots(ctx, W, H, r, Math.round(W * H / 20000), ['#ffd166', '#ffba08'], s, 4, 9);
      } },
    mardigras: { name: 'Mardi Gras', accent: '#3c096c', text: '#ffd60a',
      draw(ctx, W, H, r) {
        const s = W / 900; const cols = ['#5a189a', '#2b9348', '#ffc300'];
        const w = W / 8; for (let i = -12; i < 20; i++) { ctx.fillStyle = cols[(i + 30) % 3]; ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w + w, 0); ctx.lineTo(i * w + w + H * .5, H); ctx.lineTo(i * w + H * .5, H); ctx.fill(); }
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
        for (let k = 0; k < Math.round(H / 220); k++) {
          const y0 = r() * H, c = pick(r, cols.concat('#e0e0e0'));
          for (let t = 0; t < 1; t += .025) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(t * W, y0 + Math.sin(t * 6 + k) * 60 * s, 9 * s, 0, TAU); ctx.fill(); }
        }
        ctx.fillStyle = '#ffd60a'; for (let i = 0; i < Math.round(W * H / 40000); i++) sparkle(ctx, r() * W, r() * H, (8 + r() * 12) * s);
      } },
    stpatricks: { name: "St. Patrick's", accent: '#1b4332', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#40916c', '#1b4332']); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 11000); i++) shamrock(ctx, r() * W, r() * H, (14 + r() * 26) * s, r() * TAU, pick(r, ['#95d5b2', '#74c69d', '#b7e4c7', '#d8f3dc']));
        for (let i = 0; i < Math.round(W * H / 30000); i++) { const x = r() * W, y = r() * H, R = (10 + r() * 8) * s; ctx.fillStyle = '#ffc300'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.fillStyle = '#e09f00'; ctx.beginPath(); ctx.arc(x, y, R * .7, 0, TAU); ctx.fill(); }
      } },
    easter: { name: 'Easter', accent: '#7b61ff', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#e0f7fa', '#fde2f3', '#fff9db']); const s = W / 900;
        dots(ctx, W, H, r, Math.round(W * H / 9000), ['#ffffff', '#fff3b0'], s, 3, 7);
        for (let i = 0; i < Math.round(W * H / 22000); i++) egg(ctx, r() * W, r() * H, (24 + r() * 22) * s, (r() - .5), r);
        ctx.fillStyle = '#8ac926'; for (let x = 0; x < W; x += 14 * s) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 7 * s, H - (30 + r() * 40) * s); ctx.lineTo(x + 14 * s, H); ctx.fill(); }
      } },
    cinco: { name: 'Fiesta', accent: '#006d77', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#ff8fab', '#ffb703']); const s = W / 900;
        const cols = ['#e63946', '#2a9d8f', '#ffb703', '#8338ec', '#fb5607', '#06d6a0', '#3a86ff'];
        for (let y = 20 * s; y < H; y += Math.max(300 * s, H / 5)) papelPicado(ctx, W, y, s, cols, r);
        dots(ctx, W, H, r, Math.round(W * H / 12000), cols, s, 3, 7);
      } },
    mothers: { name: "Mother's Day", accent: '#b5179e', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#ffd6e8', '#fbb1bd', '#f28482'], true); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 16000); i++) {
          const x = r() * W, y = r() * H, R = (16 + r() * 22) * s, c = pick(r, ['#ffffff', '#ff5d8f', '#ffc8dd', '#ffe5ec', '#c9184a']);
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * R * .55, y + Math.sin(a) * R * .55, R * .5, R * .32, a, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, R * .25, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < Math.round(W * H / 30000); i++) heart(ctx, r() * W, r() * H, (10 + r() * 14) * s, (r() - .5));
      } },
    fathers: { name: "Father's Day", accent: '#023e8a', text: '#ffffff',
      draw(ctx, W, H, r) {
        ctx.fillStyle = '#0b3d91'; ctx.fillRect(0, 0, W, H); const s = W / 900;
        ctx.globalAlpha = .18;
        for (let x = 0; x < W; x += 90 * s) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 0, 30 * s, H); ctx.fillStyle = '#48cae4'; ctx.fillRect(x + 45 * s, 0, 8 * s, H); }
        for (let y = 0; y < H; y += 90 * s) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y, W, 30 * s); ctx.fillStyle = '#48cae4'; ctx.fillRect(0, y + 45 * s, W, 8 * s); }
        ctx.globalAlpha = 1;
        for (let i = 0; i < Math.round(H / 200); i++) {
          const x = r() < .5 ? r() * W * .15 : W - r() * W * .15, y = r() * H, k = (26 + r() * 16) * s;
          ctx.fillStyle = pick(r, ['#ffb703', '#e63946', '#ffffff']);
          ctx.beginPath(); ctx.moveTo(x, y - k); ctx.lineTo(x + k * .35, y - k * .7); ctx.lineTo(x + k * .5, y + k); ctx.lineTo(x, y + k * 1.5); ctx.lineTo(x - k * .5, y + k); ctx.lineTo(x - k * .35, y - k * .7); ctx.fill();
        }
      } },
    memorial: { name: 'Memorial & Veterans', accent: '#14213d', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#14213d', '#000814']); const s = W / 900;
        for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(193,18,31,.25)'; ctx.fillRect(0, H * .75 + i * 30 * s, W, 30 * s); }
        ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < Math.round(W * H / 14000); i++) star(ctx, r() * W, r() * H * .8, (6 + r() * 14) * s, r());
        for (let i = 0; i < Math.round(H / 400); i++) { const x = r() * W, y = r() * H; ctx.fillStyle = '#c1121f'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(k * 1.57) * 12 * s, y + Math.sin(k * 1.57) * 12 * s, 14 * s, 10 * s, k * 1.57, 0, TAU); ctx.fill(); } ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, TAU); ctx.fill(); }
      } },
    juneteenth: { name: 'Juneteenth', accent: '#1b1b1b', text: '#ffffff',
      draw(ctx, W, H, r) {
        stripes(ctx, W, H, ['#c1121f', '#141414', '#2b9348'], true); const s = W / 900;
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < Math.round(W * H / 26000); i++) star(ctx, r() * W, r() * H, (10 + r() * 20) * s, r(), 5);
        ctx.fillStyle = '#ffd60a'; for (let i = 0; i < Math.round(W * H / 40000); i++) sparkle(ctx, r() * W, r() * H, (8 + r() * 12) * s);
      } },
    pride: { name: 'Pride', accent: '#3a0ca3', text: '#ffffff',
      draw(ctx, W, H, r) {
        stripes(ctx, W, H, ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'], true); const s = W / 900;
        ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < Math.round(W * H / 18000); i++) heart(ctx, r() * W, r() * H, (10 + r() * 22) * s, (r() - .5) * .8);
      } },
    july4: { name: 'Fireworks USA', accent: '#003049', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#001d3d', '#003566']); const s = W / 900;
        dots(ctx, W, H, r, Math.round(W * H / 6000), ['#ffffff'], s, .8, 2);
        for (let i = 0; i < Math.max(6, Math.round(H / 220)); i++) firework(ctx, r() * W, r() * H, (50 + r() * 90) * s, pick(r, ['#e63946', '#ffffff', '#4cc9f0', '#e63946']), 4 * s);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#c1121f'; ctx.fillRect(0, H - (7 - i) * 18 * s, W, 18 * s); }
      } },
    labor: { name: 'Summer BBQ', accent: '#9d0208', text: '#ffffff',
      draw(ctx, W, H, r) {
        const s = W / 900, c = 60 * s;
        for (let y = 0; y < H; y += c) for (let x = 0; x < W; x += c) { ctx.fillStyle = ((x + y) / c) % 2 ? '#ffffff' : '#e63946'; ctx.fillRect(x, y, c, c); }
        ctx.globalAlpha = .35; for (let y = 0; y < H; y += c) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y, W, c / 2); } ctx.globalAlpha = 1;
        ctx.font = `${60 * s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center';
        for (let i = 0; i < Math.round(H / 170); i++) ctx.fillText(pick(r, ['🍔', '🌭', '🍉', '🌽', '🥤', '☀️']), r() < .5 ? r() * W * .15 + 30 * s : W - r() * W * .15 - 30 * s, r() * H);
      } },
    school: { name: 'Back to School', accent: '#1b4332', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#2d3a2e', '#1f2a20']); const s = W / 900;
        ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 400; i++) ctx.fillRect(r() * W, r() * H, 40 * s, 2 * s);
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3 * s; ctx.font = `bold ${46 * s}px "Comic Sans MS","Chalkboard SE",cursive`; ctx.textAlign = 'center';
        const words = ['ABC', '1+2=3', 'A+', '★', 'π', 'Hello!', '✏️', '♪'];
        for (let i = 0; i < Math.round(H / 140); i++) { ctx.save(); ctx.translate(r() < .5 ? r() * W * .2 + 40 * s : W - r() * W * .2 - 40 * s, r() * H); ctx.rotate((r() - .5) * .5); ctx.fillText(pick(r, words), 0, 0); ctx.restore(); }
        ctx.fillStyle = '#ffd166'; ctx.fillRect(0, H - 20 * s, W, 20 * s);
      } },
    muertos: { name: 'Día de Muertos', accent: '#240046', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#240046', '#10002b']); const s = W / 900;
        papelPicado(ctx, W, 10 * s, s, ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff', '#06d6a0'], r);
        for (let i = 0; i < Math.round(W * H / 20000); i++) marigold(ctx, r() * W, 160 * s + r() * (H - 160 * s), (14 + r() * 16) * s);
        ctx.fillStyle = '#ffbe0b'; for (let i = 0; i < Math.round(W * H / 16000); i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, 4 * s, 0, TAU); ctx.fill(); }
      } },
    diwali: { name: 'Diwali', accent: '#7b2cbf', text: '#ffd166',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#3c096c', '#240046', '#10002b']); const s = W / 900;
        dots(ctx, W, H, r, Math.round(W * H / 8000), ['#ffd166', '#ffffff'], s, 1, 2.5);
        for (let i = 0; i < Math.round(H / 400) + 1; i++) rangoli(ctx, r() < .5 ? W * .08 : W * .92, r() * H, (60 + r() * 30) * s, ['#ff006e', '#ffbe0b', '#06d6a0', '#3a86ff', '#fb5607']);
        for (let x = 40 * s; x < W; x += 110 * s) diya(ctx, x, H - 40 * s, 30 * s);
        for (let i = 0; i < Math.round(W * H / 60000); i++) diya(ctx, r() * W, r() * (H - 100 * s), (18 + r() * 10) * s);
      } },
    thanksgiving: { name: 'Harvest', accent: '#7f4f24', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#f4a261', '#e76f51', '#9c4221']); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 10000); i++) leaf(ctx, r() * W, r() * H, (14 + r() * 22) * s, r() * TAU, pick(r, ['#ffb703', '#fb8500', '#bc4749', '#6a994e', '#dda15e']));
        for (let i = 0; i < Math.round(H / 260); i++) pumpkin(ctx, r() < .5 ? r() * W * .12 + 30 * s : W - r() * W * .12 - 30 * s, r() * H, (30 + r() * 20) * s);
        ctx.strokeStyle = '#e9c46a'; ctx.lineWidth = 3 * s;
        for (let i = 0; i < Math.round(H / 300); i++) { const x = r() * W, y = r() * H; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(x + (k % 2 ? 6 : -6) * s, y - k * 10 * s, 5 * s, 9 * s, (k % 2 ? .5 : -.5), 0, TAU); ctx.stroke(); } }
      } },
    hanukkah: { name: 'Hanukkah', accent: '#0353a4', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#0466c8', '#023e7d']); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 14000); i++) davidStar(ctx, r() * W, r() * H, (12 + r() * 20) * s, pick(r, ['#caf0f8', '#ffffff', '#ffd166']), 3 * s);
        for (let i = 0; i < Math.round(H / 300); i++) dreidel(ctx, r() < .5 ? r() * W * .15 + 30 * s : W - r() * W * .15 - 30 * s, r() * H, (30 + r() * 14) * s, (r() - .5) * .8, pick(r, ['#ffd166', '#90e0ef', '#ffffff']));
        const cx = W / 2, by = H - 30 * s, gap = Math.min(80 * s, W / 11);
        for (let i = -4; i <= 4; i++) candle(ctx, cx + i * gap, by - (i === 0 ? 30 * s : 0), 16 * s, 70 * s, i === 0 ? '#ffd166' : '#caf0f8', true);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(cx - 4.5 * gap, by, 9 * gap, 10 * s);
      } },
    christmas: { name: 'Christmas', accent: '#9d0208', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#c1121f', '#780000']); const s = W / 900;
        dots(ctx, W, H, r, Math.round(W * H / 5000), ['rgba(255,255,255,.8)'], s, 1.5, 4);
        for (let i = 0; i < Math.round(H / 250); i++) ornament(ctx, r() < .5 ? r() * W * .15 + 30 * s : W - r() * W * .15 - 30 * s, r() * H, (18 + r() * 12) * s, pick(r, ['#ffd166', '#2d6a4f', '#ffffff', '#4cc9f0']));
        for (let i = 0; i < Math.round(H / 350); i++) candyCane(ctx, r() * W, r() * H, (30 + r() * 20) * s, (r() - .5));
        for (let x = 40 * s; x < W; x += 120 * s) tree(ctx, x, H - 30 * s, (60 + r() * 30) * s);
      } },
    kwanzaa: { name: 'Kwanzaa', accent: '#1b1b1b', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#3d2c1f', '#1b1b1b']); const s = W / 900;
        const band = 50 * s; ['#c1121f', '#141414', '#2b9348'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * band, W, band); ctx.fillRect(0, H - (3 - i) * band, W, band); });
        const cols = ['#2b9348', '#2b9348', '#2b9348', '#141414', '#c1121f', '#c1121f', '#c1121f'], gap = Math.min(80 * s, W / 9), cx = W / 2, by = H - 3 * band - 20 * s;
        cols.forEach((c, i) => candle(ctx, cx + (i - 3) * gap, by, 18 * s, 90 * s, c === '#141414' ? '#333' : c, true));
        ctx.fillStyle = '#8d5524'; ctx.fillRect(cx - 3.6 * gap, by, 7.2 * gap, 16 * s);
        ctx.fillStyle = '#ffd166'; for (let i = 0; i < Math.round(W * H / 30000); i++) star(ctx, r() * W, 3 * band + r() * (H - 7 * band - 120 * s), (6 + r() * 10) * s, r());
      } },
    eid: { name: 'Ramadan & Eid', accent: '#0b2545', text: '#ffd166',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#13315c', '#0b2545', '#050d1c']); const s = W / 900;
        dots(ctx, W, H, r, Math.round(W * H / 5000), ['rgba(255,255,255,.8)'], s, .8, 2);
        crescent(ctx, W * .78, H * .12, 70 * s, '#ffd166', '#10284a');
        ctx.fillStyle = '#ffd166'; for (let i = 0; i < Math.round(W * H / 26000); i++) star(ctx, r() * W, r() * H, (6 + r() * 12) * s, r(), 8, .55);
        for (let i = 0; i < Math.max(3, Math.round(W / 250)); i++) { const x = (i + .5) * W / Math.max(3, Math.round(W / 250)); lantern(ctx, x, (120 + r() * 120) * s, (26 + r() * 12) * s, pick(r, ['#2a9d8f', '#e9c46a', '#e76f51']), '#ffd166'); }
      } },
    newyear: { name: 'Gold New Year', accent: '#b8860b', text: '#ffd166',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#141414', '#000000']); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 3500); i++) { ctx.fillStyle = pick(r, ['#d4af37', '#f5d06f', '#ffffff', '#c0c0c0']); ctx.globalAlpha = .4 + r() * .6; const x = r() * W, y = r() * H; ctx.save(); ctx.translate(x, y); ctx.rotate(r() * TAU); ctx.fillRect(-6 * s, -2 * s, 12 * s, 4 * s); ctx.restore(); }
        ctx.globalAlpha = 1;
        for (let i = 0; i < Math.max(4, Math.round(H / 300)); i++) firework(ctx, r() * W, r() * H, (50 + r() * 70) * s, pick(r, ['#d4af37', '#f5d06f', '#ffffff']), 3 * s);
      } },
    earth: { name: 'Earth Day', accent: '#1b4332', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#caf0f8', '#90e0ef', '#52b788']); const s = W / 900;
        const R = Math.min(W, H) * .22, x = W * .5, y = H * .5;
        ctx.globalAlpha = .25; ctx.fillStyle = '#0077b6'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2d6a4f'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (r() - .5) * R, y + (r() - .5) * R, R * .3, R * .2, r() * 3, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        for (let i = 0; i < Math.round(W * H / 12000); i++) leaf(ctx, r() * W, r() * H, (12 + r() * 16) * s, r() * TAU, pick(r, ['#2d6a4f', '#40916c', '#95d5b2', '#74c69d']));
      } },
    boo: { name: 'Kids Halloween', accent: '#7209b7', text: '#ffffff',
      draw(ctx, W, H, r) {
        grad(ctx, W, H, ['#ff9e00', '#ff6d00', '#7209b7'], true); const s = W / 900;
        for (let i = 0; i < Math.round(W * H / 30000); i++) pumpkin(ctx, r() * W, r() * H, (18 + r() * 16) * s);
        for (let i = 0; i < Math.round(W * H / 40000); i++) {
          const x = r() * W, y = r() * H, k = (22 + r() * 16) * s; ctx.fillStyle = 'rgba(255,255,255,.95)';
          ctx.beginPath(); ctx.arc(x, y, k, Math.PI, 0); ctx.lineTo(x + k, y + k * 1.2); for (let j = 3; j >= 0; j--) ctx.lineTo(x - k + j * k * 2 / 3, y + k * (j % 2 ? 1.2 : .9)); ctx.fill();
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - k * .35, y - k * .1, k * .12, 0, TAU); ctx.arc(x + k * .35, y - k * .1, k * .12, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffd60a'; for (let i = 0; i < Math.round(W * H / 30000); i++) star(ctx, r() * W, r() * H, (6 + r() * 10) * s, r());
      } }
  };

  // Occasions: theme + message + icons + font (+ keywords for search)
  const PRESETS = [
    { name: '🧧 Lunar New Year', theme: 'lunar', line1: 'Happy Lunar New Year!', left: '🧧', right: '🏮', font: 'bold', k: 'chinese spring festival' },
    { name: '🎭 Mardi Gras', theme: 'mardigras', line1: 'Laissez les bons temps rouler!', left: '🎭', right: '⚜️', font: 'bold', k: 'carnival fat tuesday' },
    { name: '☘️ St. Patrick’s Day', theme: 'stpatricks', line1: 'Happy St. Patrick’s Day', left: '☘️', right: '🍀', font: 'bold', k: 'irish march shamrock' },
    { name: '🐣 Easter', theme: 'easter', line1: 'Happy Easter!', left: '🐣', right: '🐰', font: 'playful', k: 'spring bunny eggs' },
    { name: '🌎 Earth Day', theme: 'earth', line1: 'Love Your Planet', left: '🌎', right: '🌱', font: 'playful', k: 'april green' },
    { name: '🪅 Cinco de Mayo', theme: 'cinco', line1: '¡Feliz Cinco de Mayo!', left: '🪅', right: '🌮', font: 'bold', k: 'fiesta mexico may' },
    { name: '💐 Mother’s Day', theme: 'mothers', line1: 'Happy Mother’s Day', left: '💐', right: '💖', font: 'script', k: 'mom may' },
    { name: '🎖️ Memorial Day', theme: 'memorial', line1: 'Remember & Honor', left: '🇺🇸', right: '🎖️', font: 'classic', k: 'may veterans' },
    { name: '👔 Father’s Day', theme: 'fathers', line1: 'Happy Father’s Day', left: '👔', right: '🏆', font: 'bold', k: 'dad june' },
    { name: '✊🏾 Juneteenth', theme: 'juneteenth', line1: 'Happy Juneteenth', left: '✊🏾', right: '⭐', font: 'bold', k: 'freedom june' },
    { name: '🏳️‍🌈 Pride', theme: 'pride', line1: 'Love is Love', left: '🏳️‍🌈', right: '💖', font: 'bold', k: 'june rainbow lgbtq' },
    { name: '🎆 4th of July Fireworks', theme: 'july4', line1: 'Happy 4th of July!', left: '🎆', right: '🇺🇸', font: 'bold', k: 'independence day usa fireworks america' },
    { name: '🍔 Labor Day BBQ', theme: 'labor', line1: 'Happy Labor Day!', left: '🍔', right: '🇺🇸', font: 'playful', k: 'september cookout picnic summer' },
    { name: '🍎 Back to School', theme: 'school', line1: 'First Day of School!', left: '🍎', right: '✏️', font: 'playful', k: 'teacher class' },
    { name: '👻 Kids Halloween', theme: 'boo', line1: 'Trick or Treat!', left: '👻', right: '🍬', font: 'playful', k: 'october costume pumpkin' },
    { name: '💀 Día de los Muertos', theme: 'muertos', line1: 'Día de los Muertos', left: '💀', right: '🌼', font: 'bold', k: 'day of the dead november' },
    { name: '🪔 Diwali', theme: 'diwali', line1: 'Happy Diwali!', left: '🪔', right: '✨', font: 'elegant', k: 'festival of lights' },
    { name: '🎖️ Veterans Day', theme: 'memorial', line1: 'Thank You, Veterans', left: '🇺🇸', right: '🎖️', font: 'classic', k: 'november' },
    { name: '🦃 Thanksgiving Harvest', theme: 'thanksgiving', line1: 'Happy Thanksgiving!', left: '🦃', right: '🥧', font: 'elegant', k: 'harvest november turkey grateful' },
    { name: '🕎 Hanukkah', theme: 'hanukkah', line1: 'Happy Hanukkah', left: '🕎', right: '✡️', font: 'elegant', k: 'chanukah december' },
    { name: '🎅 Christmas', theme: 'christmas', line1: 'Merry Christmas!', left: '🎅', right: '🎄', font: 'script', k: 'xmas december santa' },
    { name: '🕯️ Kwanzaa', theme: 'kwanzaa', line1: 'Happy Kwanzaa', left: '🕯️', right: '✨', font: 'classic', k: 'december' },
    { name: '🌙 Ramadan & Eid', theme: 'eid', line1: 'Eid Mubarak', left: '🌙', right: '✨', font: 'elegant', k: 'ramadan kareem' },
    { name: '🥂 New Year’s Eve', theme: 'newyear', line1: 'Cheers to the New Year!', left: '🥂', right: '🎉', font: 'elegant', k: 'nye countdown party december' }
  ];

  window.PBHolidays = { themes: T, presets: PRESETS };
})();
