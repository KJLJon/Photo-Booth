/* Animated GIF + APNG encoders (no libraries, work offline). */
(function () {
  'use strict';

  // ---------- palette: median cut over sampled pixels ----------
  function buildPalette(frames, maxColors) {
    const samples = [];
    const per = Math.max(1, Math.floor((frames.length * frames[0].data.length / 4) / 120000));
    for (const f of frames) {
      const d = f.data;
      for (let i = 0; i < d.length; i += 4 * per) samples.push((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    }
    let boxes = [samples];
    while (boxes.length < maxColors) {
      // split the box with the widest channel range (weighted by size)
      let best = -1, bestScore = -1, bestCh = 0;
      boxes.forEach((b, bi) => {
        if (b.length < 2) return;
        let mn = [255, 255, 255], mx = [0, 0, 0];
        for (const c of b) {
          const r = c >> 16, g = (c >> 8) & 255, bl = c & 255;
          if (r < mn[0]) mn[0] = r; if (r > mx[0]) mx[0] = r;
          if (g < mn[1]) mn[1] = g; if (g > mx[1]) mx[1] = g;
          if (bl < mn[2]) mn[2] = bl; if (bl > mx[2]) mx[2] = bl;
        }
        const ranges = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
        const ch = ranges.indexOf(Math.max(...ranges));
        const score = ranges[ch] * Math.sqrt(b.length);
        if (score > bestScore) { bestScore = score; best = bi; bestCh = ch; }
      });
      if (best < 0 || bestScore <= 0) break;
      const b = boxes[best];
      const shift = bestCh === 0 ? 16 : bestCh === 1 ? 8 : 0;
      b.sort((x, y) => ((x >> shift) & 255) - ((y >> shift) & 255));
      const mid = b.length >> 1;
      boxes.splice(best, 1, b.slice(0, mid), b.slice(mid));
    }
    const pal = boxes.filter(b => b.length).map(b => {
      let r = 0, g = 0, bl = 0;
      for (const c of b) { r += c >> 16; g += (c >> 8) & 255; bl += c & 255; }
      return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
    });
    while (pal.length < 256) pal.push([0, 0, 0]);
    return pal;
  }

  function makeMapper(pal) {
    const cache = new Int16Array(32768).fill(-1);
    return (r, g, b) => {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let v = cache[key];
      if (v >= 0) return v;
      let best = 0, bd = 1e9;
      const rr = (r & 0xf8) + 4, gg = (g & 0xf8) + 4, bb = (b & 0xf8) + 4;
      for (let i = 0; i < pal.length; i++) {
        const p = pal[i], dr = p[0] - rr, dg = p[1] - gg, db = p[2] - bb;
        const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
        if (d < bd) { bd = d; best = i; }
      }
      cache[key] = best;
      return best;
    };
  }

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.5) * 10);

  // ---------- LZW (same scheme as the well-tested omggif writer) ----------
  function lzw(indices, minCode, out) {
    out.push(minCode);
    const clear = 1 << minCode, eoi = clear + 1;
    let codeSize = minCode + 1, next = eoi + 1, table = new Map();
    let cur = 0, bits = 0;
    const block = [];
    const flushByte = (b) => { block.push(b); if (block.length === 255) { out.push(255, ...block); block.length = 0; } };
    const emit = (code) => { cur |= code << bits; bits += codeSize; while (bits >= 8) { flushByte(cur & 255); cur >>>= 8; bits -= 8; } };
    emit(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = (prefix << 8) | k;
      const v = table.get(key);
      if (v !== undefined) { prefix = v; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clear); next = eoi + 1; codeSize = minCode + 1; table = new Map();
      } else {
        if (next >= (1 << codeSize)) codeSize++;
        table.set(key, next++);
      }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (bits > 0) flushByte(cur & 255);
    if (block.length) out.push(block.length, ...block);
    out.push(0);
  }

  // frames: ImageData[] (same size), delayMs: number
  async function encodeGIF(frames, delayMs, onProgress) {
    const w = frames[0].width, h = frames[0].height;
    const pal = buildPalette(frames, 256);
    const map = makeMapper(pal);
    const out = [];
    const str = (s) => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
    const u16 = (v) => out.push(v & 255, (v >> 8) & 255);
    str('GIF89a'); u16(w); u16(h); out.push(0xF7, 0, 0);
    pal.forEach(p => out.push(p[0], p[1], p[2]));
    out.push(0x21, 0xFF, 0x0B); str('NETSCAPE2.0'); out.push(3, 1, 0, 0, 0);   // loop forever
    const delay = Math.max(2, Math.round(delayMs / 10));
    const idx = new Uint8Array(w * h);
    for (let f = 0; f < frames.length; f++) {
      const d = frames[f].data;
      for (let y = 0, i = 0, j = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i += 4, j++) {
          const t = BAYER[((y & 3) << 2) | (x & 3)];
          const r = d[i] + t, g = d[i + 1] + t, b = d[i + 2] + t;
          idx[j] = map(r < 0 ? 0 : r > 255 ? 255 : r, g < 0 ? 0 : g > 255 ? 255 : g, b < 0 ? 0 : b > 255 ? 255 : b);
        }
      }
      out.push(0x21, 0xF9, 4, 0x04); u16(delay); out.push(0, 0);   // graphic control
      out.push(0x2C); u16(0); u16(0); u16(w); u16(h); out.push(0);   // image descriptor
      lzw(idx, 8, out);
      if (onProgress) onProgress((f + 1) / frames.length);
      if (f % 4 === 3) await new Promise(r => setTimeout(r, 0));    // keep the page responsive
    }
    out.push(0x3B);
    return new Blob([new Uint8Array(out)], { type: 'image/gif' });
  }

  // ---------- APNG ----------
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }
  const be32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const be16 = (v) => [(v >> 8) & 255, v & 255];
  async function zlib(bytes) {
    const cs = new CompressionStream('deflate');
    const buf = await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer();
    return new Uint8Array(buf);
  }
  const apngSupported = () => typeof CompressionStream !== 'undefined';

  async function encodeAPNG(frames, delayMs, onProgress) {
    const w = frames[0].width, h = frames[0].height;
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
    parts.push(chunk('IHDR', new Uint8Array([...be32(w), ...be32(h), 8, 2, 0, 0, 0])));
    parts.push(chunk('acTL', new Uint8Array([...be32(frames.length), ...be32(0)])));
    let seq = 0;
    const row = w * 3 + 1;
    for (let f = 0; f < frames.length; f++) {
      const d = frames[f].data, raw = new Uint8Array(row * h);
      for (let y = 0; y < h; y++) {           // filter 1 ("Sub") per row
        raw[y * row] = 1;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4, o = y * row + 1 + x * 3;
          if (x === 0) { raw[o] = d[i]; raw[o + 1] = d[i + 1]; raw[o + 2] = d[i + 2]; }
          else { raw[o] = d[i] - d[i - 4]; raw[o + 1] = d[i + 1] - d[i - 3]; raw[o + 2] = d[i + 2] - d[i - 2]; }
        }
      }
      parts.push(chunk('fcTL', new Uint8Array([...be32(seq++), ...be32(w), ...be32(h), ...be32(0), ...be32(0),
        ...be16(Math.round(delayMs)), ...be16(1000), 0, 0])));
      const z = await zlib(raw);
      if (f === 0) parts.push(chunk('IDAT', z));
      else {
        const data = new Uint8Array(4 + z.length);
        data.set(be32(seq++), 0); data.set(z, 4);
        parts.push(chunk('fdAT', data));
      }
      if (onProgress) onProgress((f + 1) / frames.length);
    }
    parts.push(chunk('IEND', new Uint8Array(0)));
    return new Blob(parts, { type: 'image/apng' });
  }

  window.PBEncoders = { encodeGIF, encodeAPNG, apngSupported };
})();
