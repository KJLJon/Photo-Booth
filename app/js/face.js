/* Photo Booth face finder — lets props "attach" to a face and follow it (strip photos & video clips).
   Uses MediaPipe's BlazeFace model, loaded lazily the first time it is needed. The files come from
   ./vendor/ (downloaded at deploy time by scripts/fetch-vendor.sh) and fall back to a CDN. */
(function () {
  'use strict';

  const MP_VERSION = '1.0.1';
  const LOCAL = new URL(`vendor/mediapipe-${MP_VERSION}/`, document.baseURI).href;
  const SOURCES = [
    { lib: LOCAL + 'vision_bundle.mjs', wasm: LOCAL + 'wasm', model: LOCAL + 'blaze_face_short_range.tflite' },
    {
      lib: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`,
      wasm: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
      model: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
    }
  ];

  let detector = null, loading = null, status = 'idle', progress = 0;
  const listeners = [], progressFns = [];
  const setProgress = (p) => { progress = p; progressFns.forEach(fn => { try { fn(p); } catch (e) { /* ignore */ } }); };

  // Downloads a file while reporting how much has arrived (goes through the service worker cache,
  // so after the first time it's instant and works offline).
  async function fetchBytes(url, onBytes) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    if (!res.body || !res.body.getReader) { const b = await res.arrayBuffer(); onBytes(b.byteLength); return new Uint8Array(b); }
    const reader = res.body.getReader(), parts = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); n += value.length; onBytes(n);
    }
    const out = new Uint8Array(n);
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  async function create(src) {
    const mp = await import(src.lib);
    setProgress(0.02);
    const files = await mp.FilesetResolver.forVisionTasks(src.wasm);
    // fetch the big pieces ourselves so we can show progress (sizes are close enough for a progress bar)
    const SIZES = { wasm: 11.8e6, model: 0.23e6 }, got = { wasm: 0, model: 0 };
    const tick = () => setProgress(0.02 + 0.93 * (got.wasm + got.model) / (SIZES.wasm + SIZES.model));
    const [wasm, model] = await Promise.all([
      fetchBytes(files.wasmBinaryPath, n => { got.wasm = Math.min(n, SIZES.wasm); tick(); }),
      fetchBytes(src.model, n => { got.model = Math.min(n, SIZES.model); tick(); })
    ]);
    const wasmUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
    const fileset = { ...files, wasmBinaryPath: wasmUrl };
    const opts = (delegate) => ({
      baseOptions: { modelAssetBuffer: model, delegate },
      runningMode: 'IMAGE', minDetectionConfidence: 0.5, minSuppressionThreshold: 0.3
    });
    try {
      try { return await mp.FaceDetector.createFromOptions(fileset, opts('GPU')); } catch (e) {
        return await mp.FaceDetector.createFromOptions(fileset, opts('CPU'));
      }
    } finally { setTimeout(() => URL.revokeObjectURL(wasmUrl), 10000); }
  }

  // Resolves true once faces can be found, false if face tracking isn't available here.
  // Safe to call any number of times; everything else in the app keeps working while it loads.
  function load() {
    if (loading && status !== 'failed') return loading;         // after a failure (e.g. offline), try again
    status = 'loading'; setProgress(0);
    loading = (async () => {
      for (const src of SOURCES) {
        try { detector = await create(src); break; } catch (e) { console.warn('Face finder: could not load from', src.lib, e); }
      }
      status = detector ? 'ready' : 'failed';
      setProgress(1);
      listeners.splice(0).forEach(fn => { try { fn(!!detector); } catch (e) { /* ignore */ } });
      return !!detector;
    })();
    return loading;
  }

  // Finds faces in a canvas / image / video frame. Synchronous once loaded; null before that.
  // Points are in the source's pixel coordinates.
  function detect(source) {
    if (!detector) return null;
    const w = source.videoWidth || source.naturalWidth || source.width;
    const h = source.videoHeight || source.naturalHeight || source.height;
    if (!w || !h) return [];
    let res;
    try { res = detector.detect(source); } catch (e) { console.warn('Face finder failed', e); return []; }
    const pt = (k) => (k ? { x: k.x * w, y: k.y * h } : null);
    return (res.detections || []).map(d => {
      // BlazeFace keypoints: right eye, left eye, nose tip, mouth, right ear, left ear (the person's right/left)
      const k = d.keypoints || [];
      const b = d.boundingBox || { originX: 0, originY: 0, width: 0, height: 0 };
      return {
        score: d.categories && d.categories[0] ? d.categories[0].score : 1,
        box: { x: b.originX, y: b.originY, w: b.width, h: b.height },
        eye1: pt(k[0]), eye2: pt(k[1]), nose: pt(k[2]), mouth: pt(k[3])
      };
    }).filter(f => f.eye1 && f.eye2 && f.nose && f.mouth)
      .sort((a, b) => (a.eye1.x + a.eye2.x) - (b.eye1.x + b.eye2.x)); // left to right, so the order is stable
  }

  // Turns four face points (in any pixel space) into a pose: where the eyes are, how big the face is
  // (eye-to-eye distance) and how far it is tilted. Anchors are the spots props hang from.
  function pose(p) {
    let vx = p.eye2.x - p.eye1.x, vy = p.eye2.y - p.eye1.y;
    if (vx < 0) { vx = -vx; vy = -vy; }                // mirrored selfies swap the eyes
    const eyes = { x: (p.eye1.x + p.eye2.x) / 2, y: (p.eye1.y + p.eye2.y) / 2 };
    let d = Math.hypot(vx, vy);
    // turned-away faces squash the eye distance; lean on the eyes→mouth distance instead
    const em = Math.hypot(p.mouth.x - eyes.x, p.mouth.y - eyes.y);
    d = Math.max(d, em * 0.85);
    return {
      d, a: Math.atan2(vy, vx),
      pts: { eyes, nose: p.nose, mouth: p.mouth, lip: { x: (p.nose.x + p.mouth.x) / 2, y: (p.nose.y + p.mouth.y) / 2 } }
    };
  }

  window.PBFace = {
    load, detect, pose,
    get status() { return status; },
    get progress() { return progress; },
    onProgress(fn) { progressFns.push(fn); },
    ready: () => !!detector,
    onReady(fn) { if (status === 'ready' || status === 'failed') fn(!!detector); else listeners.push(fn); }
  };
})();
