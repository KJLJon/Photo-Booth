/* Photo Booth props & stickers — original clip art drawn with canvas paths (no image files, works offline).
   Every prop is drawn centred on (0,0) in "units" where the prop is 1 unit wide; `h` is its height in units. */
(function () {
  'use strict';

  const ROUND = '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI",system-ui,sans-serif';
  const IMPACT = 'Impact,"Arial Black","Franklin Gothic Heavy",sans-serif';

  function heartPath(c, x, y, s) {
    c.moveTo(x, y + s * 0.8);
    c.bezierCurveTo(x - s * 1.25, y - s * 0.05, x - s * 0.65, y - s * 0.95, x, y - s * 0.35);
    c.bezierCurveTo(x + s * 0.65, y - s * 0.95, x + s * 1.25, y - s * 0.05, x, y + s * 0.8);
    c.closePath();
  }
  function starPath(c, x, y, R, r, n, rot) {
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R, a = rot + (Math.PI / n) * i - Math.PI / 2;
      i ? c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function rrect(c, x, y, w, h, r) {
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function bridge(c, color) {
    c.strokeStyle = color; c.lineWidth = .04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-.09, -.04); c.quadraticCurveTo(0, -.13, .09, -.04); c.stroke();
    c.beginPath(); c.moveTo(-.47, -.08); c.lineTo(-.5, -.12); c.moveTo(.47, -.08); c.lineTo(.5, -.12); c.stroke();
  }
  // draw text in real pixels (tiny fractional font sizes render badly on some browsers)
  function unitText(c, unit, text, font, size, y, fill, stroke, strokeW, maxW) {
    c.save();
    c.scale(1 / unit, 1 / unit);
    let px = size * unit;
    c.font = `${font.w} ${px}px ${font.f}`;
    const lim = maxW * unit;
    while (px > 6 && c.measureText(text).width > lim) { px -= 1; c.font = `${font.w} ${px}px ${font.f}`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (stroke) { c.lineJoin = 'round'; c.lineWidth = px * strokeW; c.strokeStyle = stroke; c.strokeText(text, 0, y * unit); }
    c.fillStyle = fill; c.fillText(text, 0, y * unit);
    c.restore();
  }

  const P = {
    shades: { name: 'Sunglasses', h: .34, draw(c) {
      c.fillStyle = '#111'; c.fillRect(-.5, -.15, 1, .05);
      for (const s of [-1, 1]) {
        c.fillStyle = '#111';
        c.beginPath(); c.moveTo(s * .06, -.12); c.lineTo(s * .48, -.12);
        c.quadraticCurveTo(s * .47, .13, s * .3, .15); c.quadraticCurveTo(s * .1, .16, s * .07, -.02); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)';
        c.beginPath(); c.moveTo(s * .38, -.09); c.lineTo(s * .44, -.09); c.lineTo(s * .31, .09); c.lineTo(s * .25, .09); c.closePath(); c.fill();
      }
      bridge(c, '#111');
    } },
    heartglasses: { name: 'Heart glasses', h: .42, draw(c) {
      for (const s of [-1, 1]) {
        c.beginPath(); heartPath(c, s * .26, -.02, .22);
        c.fillStyle = 'rgba(255,40,90,.85)'; c.fill();
        c.lineWidth = .035; c.strokeStyle = '#b0003a'; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(s * .26 - .08, -.1, .035, .02, -.6, 0, Math.PI * 2); c.fill();
      }
      bridge(c, '#b0003a');
    } },
    starglasses: { name: 'Star glasses', h: .46, draw(c) {
      for (const s of [-1, 1]) {
        c.beginPath(); starPath(c, s * .26, 0, .24, .11, 5, 0);
        c.fillStyle = '#ff5fa2'; c.fill(); c.lineWidth = .035; c.strokeStyle = '#ffd23f'; c.lineJoin = 'round'; c.stroke();
      }
      bridge(c, '#ffd23f');
    } },
    mustache: { name: 'Mustache', h: .34, draw(c) {
      c.fillStyle = '#2b1b10';
      for (const s of [1, -1]) {
        c.beginPath(); c.moveTo(0, -.06);
        c.bezierCurveTo(s * .12, -.17, s * .3, -.13, s * .36, -.02);
        c.bezierCurveTo(s * .4, .05, s * .5, .05, s * .5, -.07);
        c.bezierCurveTo(s * .53, .1, s * .36, .15, s * .25, .07);
        c.bezierCurveTo(s * .15, .01, s * .06, .07, 0, .05);
        c.closePath(); c.fill();
      }
    } },
    partyhat: { name: 'Party hat', h: 1.2, draw(c) {
      c.save(); c.beginPath(); c.moveTo(-.4, .5); c.lineTo(0, -.52); c.lineTo(.4, .5); c.closePath(); c.clip();
      for (let i = -8; i < 8; i++) { c.fillStyle = i % 2 ? '#ff5fa2' : '#ffd23f'; c.save(); c.rotate(-.5); c.fillRect(i * .12, -1, .12, 2); c.restore(); }
      c.fillStyle = '#fff'; for (const [x, y] of [[-.12, .15], [.1, -.05], [.15, .32], [-.02, -.25], [-.2, .4]]) { c.beginPath(); c.arc(x, y, .03, 0, 7); c.fill(); }
      c.restore();
      c.fillStyle = '#fff'; for (let x = -.4; x <= .4; x += .1) { c.beginPath(); c.arc(x, .5, .065, 0, 7); c.fill(); }
      c.fillStyle = '#3bceac'; c.beginPath(); c.arc(0, -.52, .09, 0, 7); c.fill();
    } },
    crown: { name: 'Crown', h: .66, draw(c) {
      c.beginPath(); c.moveTo(-.5, .28); c.lineTo(-.5, -.18); c.lineTo(-.27, .03); c.lineTo(0, -.3); c.lineTo(.27, .03); c.lineTo(.5, -.18); c.lineTo(.5, .28); c.closePath();
      const g = c.createLinearGradient(0, -.3, 0, .3); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#e0a800');
      c.fillStyle = g; c.fill(); c.lineWidth = .03; c.strokeStyle = '#a07000'; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = '#f5c542'; c.fillRect(-.5, .14, 1, .14); c.strokeRect(-.5, .14, 1, .14);
      [['#e63946', -.3], ['#1d77ff', 0], ['#06d6a0', .3]].forEach(([col, x]) => { c.fillStyle = col; c.beginPath(); c.arc(x, .21, .045, 0, 7); c.fill(); });
      c.fillStyle = '#fff3b0'; [[-.5, -.18], [0, -.3], [.5, -.18]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, .045, 0, 7); c.fill(); });
    } },
    tophat: { name: 'Top hat', h: .92, draw(c) {
      c.fillStyle = '#1a1a1a'; c.fillRect(-.3, -.46, .6, .8);
      c.beginPath(); c.ellipse(0, -.46, .3, .06, 0, 0, 7); c.fillStyle = '#2d2d2d'; c.fill();
      c.fillStyle = '#d62828'; c.fillRect(-.3, .16, .6, .11);
      c.beginPath(); c.ellipse(0, .36, .5, .09, 0, 0, 7); c.fillStyle = '#1a1a1a'; c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-.22, -.4, .07, .5);
    } },
    bowtie: { name: 'Bow tie', h: .56, draw(c) {
      c.save();
      c.beginPath();
      for (const s of [-1, 1]) {
        c.moveTo(0, 0); c.quadraticCurveTo(s * .2, -.3, s * .5, -.24); c.quadraticCurveTo(s * .42, 0, s * .5, .24); c.quadraticCurveTo(s * .2, .3, 0, 0);
      }
      c.fillStyle = '#d90429'; c.fill(); c.clip();
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (let x = -.45; x < .5; x += .14) for (let y = -.25; y < .3; y += .14) { c.beginPath(); c.arc(x + ((y * 10) % 2 ? .07 : 0), y, .028, 0, 7); c.fill(); }
      c.restore();
      c.beginPath(); rrect(c, -.08, -.1, .16, .2, .05); c.fillStyle = '#a4031f'; c.fill();
    } },
    lips: { name: 'Lips', h: .5, draw(c) {
      c.beginPath(); c.moveTo(-.5, 0);
      c.bezierCurveTo(-.35, -.23, -.14, -.26, 0, -.12); c.bezierCurveTo(.14, -.26, .35, -.23, .5, 0);
      c.bezierCurveTo(.3, .3, -.3, .3, -.5, 0); c.closePath();
      c.fillStyle = '#e0115f'; c.fill();
      c.beginPath(); c.moveTo(-.46, .005); c.quadraticCurveTo(0, .07, .46, .005); c.lineWidth = .025; c.strokeStyle = '#8b0033'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(.1, .13, .1, .03, -.1, 0, 7); c.fill();
    } },
    bunny: { name: 'Bunny ears', h: 1.1, draw(c) {
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * .22, -.08); c.rotate(s * .2);
        c.beginPath(); c.ellipse(0, 0, .15, .44, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = .025; c.strokeStyle = '#ddd'; c.stroke();
        c.beginPath(); c.ellipse(0, .02, .08, .33, 0, 0, 7); c.fillStyle = '#ffb3c6'; c.fill();
        c.restore();
      }
      c.beginPath(); c.ellipse(0, .5, .5, .12, 0, Math.PI, 0); c.lineWidth = .07; c.strokeStyle = '#ff5fa2'; c.stroke();
    } },
    kitty: { name: 'Kitty ears', h: .56, draw(c) {
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(s * .12, .2); c.lineTo(s * .3, -.28); c.lineTo(s * .48, .16); c.closePath(); c.fillStyle = '#2b2b2b'; c.fill();
        c.beginPath(); c.moveTo(s * .2, .14); c.lineTo(s * .3, -.14); c.lineTo(s * .41, .12); c.closePath(); c.fillStyle = '#ff9eb5'; c.fill();
      }
      c.beginPath(); c.ellipse(0, .24, .5, .1, 0, Math.PI, 0); c.lineWidth = .06; c.strokeStyle = '#2b2b2b'; c.stroke();
    } },
    halo: { name: 'Halo', h: .34, draw(c) {
      c.save(); c.shadowColor = '#ffe066'; c.shadowBlur = 20;
      c.beginPath(); c.ellipse(0, 0, .45, .12, 0, 0, 7); c.lineWidth = .08; c.strokeStyle = '#ffd23f'; c.stroke(); c.restore();
      c.beginPath(); c.ellipse(0, 0, .45, .12, 0, 0, 7); c.lineWidth = .03; c.strokeStyle = '#fff6c2'; c.stroke();
    } },
    horns: { name: 'Devil horns', h: .5, draw(c) {
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(s * .14, .2); c.quadraticCurveTo(s * .12, -.1, s * .42, -.24); c.quadraticCurveTo(s * .3, -.02, s * .36, .2); c.closePath();
        c.fillStyle = '#e5383b'; c.fill(); c.lineWidth = .02; c.strokeStyle = '#8d0801'; c.stroke();
      }
      c.beginPath(); c.ellipse(0, .22, .5, .08, 0, Math.PI, 0); c.lineWidth = .05; c.strokeStyle = '#8d0801'; c.stroke();
    } },
    flowercrown: { name: 'Flower crown', h: .46, draw(c) {
      c.beginPath(); c.ellipse(0, .16, .48, .2, 0, Math.PI, 0); c.lineWidth = .03; c.strokeStyle = '#4f772d'; c.stroke();
      const cols = ['#ff8fab', '#ffd166', '#ffffff', '#cdb4db', '#ff8fab', '#ffd166', '#ffffff'];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i + .5) * Math.PI / 7, x = Math.cos(a) * .44, y = .16 + Math.sin(a) * .18;
        c.fillStyle = '#6a994e'; c.beginPath(); c.ellipse(x + .06, y + .03, .05, .02, .6, 0, 7); c.fill();
        c.fillStyle = cols[i];
        for (let k = 0; k < 5; k++) { const b = k * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(b) * .045, y + Math.sin(b) * .045, .04, 0, 7); c.fill(); }
        c.fillStyle = '#f6bd60'; c.beginPath(); c.arc(x, y, .03, 0, 7); c.fill();
      }
    } },
    lightning: { name: 'Lightning', h: 1.3, draw(c) {
      c.beginPath(); c.moveTo(.12, -.65); c.lineTo(-.35, .08); c.lineTo(-.02, .08); c.lineTo(-.14, .65); c.lineTo(.35, -.12); c.lineTo(.02, -.12); c.closePath();
      c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = .04; c.strokeStyle = '#ff8c00'; c.lineJoin = 'round'; c.stroke();
    } },
    sparkles: { name: 'Sparkles', h: 1, draw(c) {
      const sp = (x, y, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); };
      sp(-.1, .05, .38, '#ffd23f'); sp(.3, -.3, .18, '#fff3a3'); sp(.28, .32, .13, '#ffe066');
    } },
    heart: { name: 'Heart', h: .95, draw(c) {
      c.beginPath(); heartPath(c, 0, .02, .5); c.fillStyle = '#ff2d55'; c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-.22, -.18, .09, .05, -.7, 0, 7); c.fill();
    } },
    rainbow: { name: 'Rainbow', h: .64, draw(c) {
      ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((col, i) => {
        c.beginPath(); c.arc(0, .22, .46 - i * .055, Math.PI, 0); c.lineWidth = .055; c.strokeStyle = col; c.stroke();
      });
      c.fillStyle = '#fff';
      for (const s of [-1, 1]) for (const [dx, dy, r] of [[0, 0, .08], [.07, -.04, .09], [.14, 0, .07]]) {
        c.beginPath(); c.arc(s * .38 + (s < 0 ? -dx : dx) - s * .06, .24 + dy, r, 0, 7); c.fill();
      }
    } },
    balloons: { name: 'Balloons', h: 1.5, draw(c) {
      c.strokeStyle = '#666'; c.lineWidth = .012;
      [[-.25, -.35, '#ff5fa2'], [.05, -.5, '#ffd23f'], [.28, -.3, '#4cc9f0']].forEach(([x, y, col]) => {
        c.beginPath(); c.moveTo(x, y + .22); c.quadraticCurveTo(x * .5, .3, 0, .7); c.stroke();
        c.fillStyle = col; c.beginPath(); c.ellipse(x, y, .18, .22, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(x, y + .2); c.lineTo(x - .03, y + .25); c.lineTo(x + .03, y + .25); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x - .06, y - .08, .035, .06, -.4, 0, 7); c.fill();
      });
    } },
    bubble: { name: 'Speech bubble', h: .62, text: true, draw(c, unit, text) {
      c.beginPath(); rrect(c, -.5, -.3, 1, .46, .16);
      c.moveTo(-.18, .15); c.lineTo(-.3, .31); c.lineTo(-.02, .15);
      c.fillStyle = '#fff'; c.fill(); c.lineWidth = .03; c.strokeStyle = '#1b1b1b'; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-.19, .12, .18, .05);
      unitText(c, unit, text || 'WOW!', { w: 900, f: ROUND }, .24, -.07, '#1b1b1b', null, 0, .86);
    } },
    burst: { name: 'Comic burst', h: .82, text: true, draw(c, unit, text) {
      c.save(); c.scale(1, .82);
      c.beginPath();
      const n = 14;
      for (let i = 0; i < n * 2; i++) { const r = i % 2 ? .33 : (i % 4 ? .5 : .46), a = (Math.PI / n) * i; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); }
      c.closePath(); c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = .03; c.strokeStyle = '#d00000'; c.lineJoin = 'round'; c.stroke();
      c.beginPath();
      for (let i = 0; i < n * 2; i++) { const r = i % 2 ? .22 : .36, a = (Math.PI / n) * i + .1; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); }
      c.closePath(); c.fillStyle = '#ff3b30'; c.fill();
      c.restore();
      c.save(); c.rotate(-.12);
      unitText(c, unit, text || 'POW!', { w: 900, f: IMPACT }, .26, 0, '#fff', '#1b1b1b', .22, .62);
      c.restore();
    } }
  };

  const WORDS = {
    bubble: ['WOW!', 'OMG!', 'LOL', 'YAY!', 'Cheers!', 'BFF', 'Party!', 'I ♥ U', 'Selfie!', "Let's go!"],
    burst: ['POW!', 'BAM!', 'ZAP!', 'BOOM!', 'WHAM!', 'KAPOW!']
  };
  const EMOJI = ['😎', '🥳', '😂', '😍', '🤩', '😜', '🤪', '😘', '👑', '🎩', '🕶️', '🎀', '💋', '👄', '🥸', '🤡', '👻', '💀', '🎃', '🦄',
    '🐶', '🐱', '🐰', '🦊', '🎉', '🎈', '🎂', '🍰', '🍾', '🥂', '🍕', '🍩', '🌈', '⭐', '✨', '💥', '💖', '💯', '🔥', '⚡', '🎵', '📸', '🏆', '🎓', '💍', '🌸', '🌻', '🍀'];

  function draw(ctx, id, unit, text) {
    const p = P[id];
    if (!p) return;
    ctx.save();
    ctx.scale(unit, unit);
    p.draw(ctx, unit, text);
    ctx.restore();
  }
  const LIST = Object.entries(P).filter(([, p]) => !p.text).map(([id, p]) => ({ id, name: p.name, h: p.h }));
  window.PBProps = { LIST, WORDS, EMOJI, draw, height: (id) => (P[id] ? P[id].h : 1) };
})();
