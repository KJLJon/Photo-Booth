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

  let detector = null, loading = null, status = 'idle';
  const listeners = [];

  async function create(src) {
    const mp = await import(src.lib);
    const files = await mp.FilesetResolver.forVisionTasks(src.wasm);
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: src.model, delegate },
      runningMode: 'IMAGE', minDetectionConfidence: 0.5, minSuppressionThreshold: 0.3
    });
    try { return await mp.FaceDetector.createFromOptions(files, opts('GPU')); } catch (e) {
      return mp.FaceDetector.createFromOptions(files, opts('CPU'));
    }
  }

  // Resolves true once faces can be found, false if face tracking isn't available here.
  function load() {
    if (loading) return loading;
    status = 'loading';
    loading = (async () => {
      for (const src of SOURCES) {
        try { detector = await create(src); break; } catch (e) { console.warn('Face finder: could not load from', src.lib, e); }
      }
      status = detector ? 'ready' : 'failed';
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
    ready: () => !!detector,
    onReady(fn) { if (status === 'ready' || status === 'failed') fn(!!detector); else listeners.push(fn); }
  };
})();
