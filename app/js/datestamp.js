/* The orange date stamp from early-2000s cameras: seven-segment digits with a soft glow, printed in the
   bottom-right corner. PBStamp.draw(ctx, w, h, text) draws on a photo w×h; PBStamp.text(style, date). */
(function () {
  'use strict';

  const STYLES = [
    { id: 'off', label: 'Off' },
    { id: 'yymd', label: "'26 9 28" },
    { id: 'mdy', label: "09 28 '26" },
    { id: 'ymd', label: '2026.09.28' },
    { id: 'dt', label: "'26 9 28 10:42" }
  ];

  // which of the seven segments (a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle) light up
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

  function text(style, date) {
    const d = date || new Date(), yy = String(d.getFullYear()).slice(2), p2 = (n) => String(n).padStart(2, '0');
    switch (style) {
      case 'yymd': return `'${yy} ${d.getMonth() + 1} ${p2(d.getDate())}`;
      case 'mdy': return `${p2(d.getMonth() + 1)} ${p2(d.getDate())} '${yy}`;
      case 'ymd': return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
      case 'dt': return `'${yy} ${d.getMonth() + 1} ${p2(d.getDate())}  ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    }
    return '';
  }

  function glyphWidth(ch, dw) {
    if (SEG[ch]) return dw * 1.3;
    if (ch === ' ') return dw * .7;
    return dw * .55;                                   // ' : .
  }
  function segment(ctx, x, y, w, h, t, s) {
    // one bar, with slanted ends like a real LCD segment
    const hor = s === 'a' || s === 'd' || s === 'g';
    const pos = { a: [0, 0], b: [w, 0], c: [w, h / 2], d: [0, h], e: [0, h / 2], f: [0, 0], g: [0, h / 2] }[s];
    const X = x + pos[0], Y = y + pos[1], L = hor ? w : h / 2, k = t / 2, gap = t * .18;
    ctx.beginPath();
    if (hor) {
      ctx.moveTo(X + gap, Y); ctx.lineTo(X + gap + k, Y - k); ctx.lineTo(X + L - gap - k, Y - k); ctx.lineTo(X + L - gap, Y);
      ctx.lineTo(X + L - gap - k, Y + k); ctx.lineTo(X + gap + k, Y + k);
    } else {
      ctx.moveTo(X, Y + gap); ctx.lineTo(X + k, Y + gap + k); ctx.lineTo(X + k, Y + L - gap - k); ctx.lineTo(X, Y + L - gap);
      ctx.lineTo(X - k, Y + L - gap - k); ctx.lineTo(X - k, Y + gap + k);
    }
    ctx.closePath(); ctx.fill();
  }
  function draw(ctx, w, h, str) {
    if (!str) return;
    const H = Math.max(10, Math.min(w, h) * .045), dw = H * .55, t = H * .14, slant = .08;
    const total = [...str].reduce((a, ch) => a + glyphWidth(ch, dw), 0);
    let x = w - total - Math.min(w, h) * .05;
    const y = h - H - Math.min(w, h) * .05;
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([1, 0, -slant, 1, slant * (y + H), 0])));   // italic lean
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass ? '#ffb347' : '#ff6a00';
      ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = pass ? H * .15 : H * .6;
      let cx = x;
      for (const ch of str) {
        const gw = glyphWidth(ch, dw);
        if (SEG[ch]) for (const s of SEG[ch]) segment(ctx, cx + (gw - dw) / 2, y, dw, H, t, s);
        else if (ch === "'") { ctx.beginPath(); ctx.moveTo(cx + gw * .5, y); ctx.lineTo(cx + gw * .5 + t * .6, y); ctx.lineTo(cx + gw * .4, y + H * .3); ctx.closePath(); ctx.fill(); }
        else if (ch === ':') { ctx.fillRect(cx + gw * .35, y + H * .25, t, t); ctx.fillRect(cx + gw * .35, y + H * .7, t, t); }
        else if (ch === '.') ctx.fillRect(cx + gw * .3, y + H - t, t, t);
        cx += gw;
      }
    }
    ctx.restore();
  }

  window.PBStamp = { STYLES, text, draw };
})();
