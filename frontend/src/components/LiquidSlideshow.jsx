import React, { useEffect, useRef } from 'react';

/**
 * Full-bleed image slideshow with a "liquid wave" transition, drawn with WebGL:
 * a thin ribbon of clear water sweeps across the picture (from a different corner or
 * side on every change), bending the light of the image beneath, and leaves the next
 * image behind it. Between changes each image keeps a slow Ken Burns zoom.
 *
 * Props
 *   images    array of image URLs (same order as the slides)
 *   index     which image to show; changing it plays the transition
 *   duration  transition length in ms
 *   paused    true stops drawing (e.g. while the opening intro covers the page)
 *   onStatus  ('on' | 'off') => void. 'off' = WebGL / images not usable: show a fallback
 *
 * Performance: one full-screen triangle; pixels away from the water skip the water maths;
 * photos are resized off the main thread and uploaded only between waves; at most the
 * current / previous / next photo are kept on the GPU; normal resolution with a pixel cap;
 * drawing stops off screen, in a hidden tab or while `paused`.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uRes;
uniform vec2 uFromSize;
uniform vec2 uToSize;
uniform float uProgress;
uniform float uTime;
uniform float uZoomFrom;
uniform float uZoomTo;
uniform vec2 uOrigin;   // where this wave starts (outside the screen), in aspect space
uniform float uStart;   // front radius when the water first touches the screen
uniform float uEnd;     // front radius once the whole sheet has left the screen

const float SHEET = 0.17;   // width of the water sheet (must match BAND in the JS)

// image "object-fit: cover" with a zoom
vec2 coverUv(vec2 uv, vec2 img, float zoom) {
  float sr = uRes.x / uRes.y;
  float ir = img.x / img.y;
  vec2 s = sr > ir ? vec2(1.0, ir / sr) : vec2(sr / ir, 1.0);
  return (uv - 0.5) * s / zoom + 0.5;
}
vec3 img(sampler2D t, vec2 uv, vec2 size, float zoom) {
  vec2 c = clamp(coverUv(uv, size, zoom), 0.001, 0.999);
  return texture2D(t, vec2(c.x, 1.0 - c.y)).rgb;    // pictures are stored top row first
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) { return 0.6667 * noise(p) + 0.3333 * noise(p * 2.03 + 11.7); }
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

float gFront;   // where the front of the water is (set in main)

// Height of the water surface at q (0 outside the sheet). The splashing edge offsets
// fw / bw change slowly, so they are worked out once per pixel and reused here.
float waterH(vec2 q, float fw, float bw) {
  float f = length(q - uOrigin) - gFront + fw;
  float a = -f, b = f + SHEET + bw;
  if (a <= 0.0 || b <= 0.0) return 0.0;
  float body = smoothstep(0.0, 0.045, min(a, b));
  float crest = exp(-a * 14.0) * 0.55 * smoothstep(0.0, 0.03, a);
  float swell = fbm3(q * 2.1 + vec2(uTime * 0.08, uTime * 0.06)) * 0.65;   // big, soft swirls
  return body * (0.45 + swell) + crest;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);       // (0,0) = bottom-left, circles stay round

  float t = clamp(uProgress, 0.0, 1.0);
  float e = 0.5 - 0.5 * cos(3.14159265 * t);  // ease in-out sine
  gFront = mix(uStart, uEnd, e);

  if (uProgress <= 0.0 || uProgress >= 1.0) {
    gl_FragColor = vec4(uProgress >= 1.0 ? img(uTo, uv, uToSize, uZoomTo) : img(uFrom, uv, uFromSize, uZoomFrom), 1.0);
    return;
  }

  // cheap check first: far ahead of the water, or far behind it, is just a photo
  vec2 rel = p - uOrigin;
  float f0 = length(rel) - gFront;
  if (f0 > 0.28) { gl_FragColor = vec4(img(uFrom, uv, uFromSize, uZoomFrom), 1.0); return; }
  if (f0 < -(SHEET + 0.26)) { gl_FragColor = vec4(img(uTo, uv, uToSize, uZoomTo), 1.0); return; }

  // the splashing edges: worked out once for this pixel
  float ang = atan(rel.y, rel.x);
  float fw = (fbm2(p * 1.7 + vec2(uTime * 0.05, -uTime * 0.04)) - 0.5) * 0.24
           + sin(ang * 5.0 + uTime * 0.7) * 0.03;
  float bw = (fbm2(p * 2.4 - vec2(uTime * 0.04, uTime * 0.05) + 7.3) - 0.5) * 0.14;
  float f = f0 + fw;
  float a = -f, b = f + SHEET + bw;
  bool passed = a > 0.0;

  // ---- outside the water: old picture ahead (with droplets and a soft shadow), new behind ----
  if (a <= 0.0 || b <= 0.0) {
    if (passed) { gl_FragColor = vec4(img(uTo, uv, uToSize, uZoomTo), 1.0); return; }
    vec3 c = img(uFrom, uv, uFromSize, uZoomFrom);
    float ahead = -a;
    c *= 1.0 - (1.0 - smoothstep(0.0, 0.07, ahead)) * 0.18;   // shadow just ahead
    if (ahead < 0.14) {
      // a few glass droplets flying just ahead of the wave
      vec2 cell = floor(p * 16.0);
      vec2 cc = (cell + 0.5 + (vec2(hash(cell + 3.1), hash(cell + 8.7)) - 0.5) * 0.6) / 16.0;
      float rad = 0.006 + 0.010 * hash(cell + 1.9);
      float cAhead = gFront - length(cc - uOrigin);
      float d = length(p - cc);
      if (d < rad && hash(cell) > 0.82 && cAhead > 0.01 && cAhead < 0.13) {
        float q = d / rad;
        vec2 bend = (p - cc) / rad * 0.02 * (1.0 - q * q);
        bend.x /= aspect;
        vec3 inside = img(uFrom, uv - bend, uFromSize, uZoomFrom) * 0.92 + 0.08;
        float dark = smoothstep(0.62, 1.0, q);
        float shine = pow(max(0.0, 1.0 - length((p - cc) / rad - vec2(-0.35, 0.4)) * 2.6), 3.0);
        c = mix(inside * (1.0 - dark * 0.7), vec3(1.0), shine * 0.85);
      }
    }
    gl_FragColor = vec4(c, 1.0);
    return;
  }

  // ---- inside the water sheet: surface height and slope (3 samples) ----
  float px = 1.5 / uRes.y;
  float h = waterH(p, fw, bw);
  vec2 grad = vec2(waterH(p + vec2(px, 0.0), fw, bw) - h,
                   waterH(p + vec2(0.0, px), fw, bw) - h) / px;

  // refraction: the picture behind the water bends with the slope (big soft swirls)
  vec2 refr = -grad * 0.036;
  refr.x /= aspect;
  vec2 ca = refr * 0.08;
  vec3 col = vec3(
    img(uTo, uv + refr + ca, uToSize, uZoomTo).r,
    img(uTo, uv + refr, uToSize, uZoomTo).g,
    img(uTo, uv + refr - ca, uToSize, uZoomTo).b);
  // the front of the crest still carries a little of the old picture
  float carryOld = exp(-a * 22.0) * 0.55;
  if (carryOld > 0.01) col = mix(col, img(uFrom, uv + refr * 1.4, uFromSize, uZoomFrom), carryOld);

  // clear water is slightly milky and cool where it is thick
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), 0.22 * h);
  col = mix(col, col * 0.84 + vec3(0.16, 0.17, 0.18), 0.6 * h);

  // light on the surface: a bright specular glint and soft shading
  vec3 nrm = normalize(vec3(-grad * 0.35, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  float spec = pow(max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
  float shade = 0.9 + 0.1 * dot(nrm, L);
  col = col * shade + vec3(1.0) * spec * 0.9;

  // glass edges: a dark outline with a bright line just inside it
  float edge = min(a, b);
  float rim = 1.0 - smoothstep(0.0, 0.011, edge);
  float line = smoothstep(0.010, 0.016, edge) * (1.0 - smoothstep(0.016, 0.025, edge));
  float frontSide = smoothstep(0.0, 1.0, (b - a) * 8.0 + 0.5);   // the front edge is the sharper one
  col *= 1.0 - rim * (0.55 + 0.25 * frontSide);
  col += vec3(1.0) * line * (0.35 + 0.25 * frontSide);

  gl_FragColor = vec4(col, 1.0);
}`;

const MAX_DPR = 1;             // a background photo under overlays: normal resolution is enough
const MAX_PIXELS = 2100000;    // about 1920 x 1100; larger screens draw a little softer, never slower
const BAND = 0.17; // width of the water sheet, must match SHEET in the shader
const WARP = 0.16; // how far the splashing edges can reach beyond the plain arc

// Where each wave starts, like the reference: corners and sides, each change a new one.
// x is in screen widths, y in screen heights ((0,0) = bottom-left). Points just past a
// corner give a curling arc; points far to one side give an almost straight sweep.
const WAVE_ORIGINS = [
  { x: -0.16, y: -0.32 }, // bottom-left corner, arcs up to the top-right
  { x: 1.16, y: 1.32 },   // top-right corner, arcs down to the bottom-left
  { x: -1.2, y: 0.5 },    // left side, sweeps straight across to the right
  { x: 1.18, y: -0.3 },   // bottom-right corner, arcs up to the top-left
  { x: 0.5, y: -1.6 },    // below, a level wave rising through the middle
  { x: -0.18, y: 1.34 },  // top-left corner, arcs down to the bottom-right
  { x: 2.2, y: 0.55 }     // right side, sweeps straight across to the left
];

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log || 'shader compile failed');
  }
  return s;
}

export default function LiquidSlideshow({ images, index = 0, duration = 1700, paused = false, onStatus, className = '' }) {
  const canvasRef = useRef(null);
  const api = useRef(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  // One-time WebGL setup
  useEffect(() => {
    const canvas = canvasRef.current;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
        || canvas.getContext('experimental-webgl');
    } catch { gl = null; }
    if (!gl) { statusRef.current?.('off'); return undefined; }

    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
    } catch (err) {
      console.warn('[LiquidSlideshow] WebGL program failed, using the photo fallback:', err.message);
      statusRef.current?.('off');
      return undefined;
    }
    gl.useProgram(prog);

    // one triangle that covers the screen
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uFrom', 'uTo', 'uRes', 'uFromSize', 'uToSize', 'uProgress', 'uTime', 'uZoomFrom', 'uZoomTo', 'uOrigin', 'uStart', 'uEnd']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uFrom, 0);
    gl.uniform1i(U.uTo, 1);

    // ---- drawing state ----
    let disposed = false;
    let raf = 0;
    let visible = true;
    let pausedNow = paused;
    const start = performance.now();
    const state = {
      from: null, to: null,          // texture entries
      fromZoomAt: 0, toShownAt: 0,   // for the Ken Burns zoom
      fromZoom: 1, transStart: -1,
      waveIdx: -1,                   // which angle the current wave comes from (first = 0)
      pendingIndex: null,
      shownIndex: null,
      frozen: null                   // development only: hold the wave at a fixed point
    };

    // ---- textures: loaded on demand, kept for the current / previous / next slide ----
    const cache = new Map(); // url -> { tex, w, h } | 'loading' | 'error'
    const waiters = new Map(); // url -> [resolve]
    const load = (url) => new Promise((resolve) => {
      const got = cache.get(url);
      if (got && got !== 'loading') { resolve(got === 'error' ? null : got); return; }
      if (!waiters.has(url)) waiters.set(url, []);
      waiters.get(url).push(resolve);
      if (got === 'loading') return;
      cache.set(url, 'loading');
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.decoding = 'async';
      im.onload = async () => {
        try { if (im.decode) await im.decode(); } catch { /* still usable */ }
        if (disposed) return;
        // Shrink the photo to the size it is drawn at (+15% for the slow zoom), off the main
        // thread. A full-size photo uploaded at once took ~100 ms and stalled the wave.
        let source = im;
        let sw = im.naturalWidth, sh = im.naturalHeight;
        const targetW = Math.min(sw, Math.max(960, Math.ceil((canvas.width || 1280) * 1.15)));
        if (typeof createImageBitmap === 'function' && targetW < sw) {
          try {
            const th = Math.round(sh * targetW / sw);
            source = await createImageBitmap(im, { resizeWidth: targetW, resizeHeight: th, resizeQuality: 'high', imageOrientation: 'none' });
            sw = targetW; sh = th;
          } catch { source = im; }
          if (disposed) return;
        }
        // never upload while a wave is running: wait for it to finish
        while (state.transStart >= 0 && !disposed) {
          await new Promise((r) => setTimeout(r, 120));
        }
        if (disposed) return;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // no flip at upload: browsers ignore it for resized bitmaps (photos came out upside down);
        // the shader turns every picture the right way up instead
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          if (source !== im && source.close) source.close();
        } catch {
          // e.g. a cross-origin image without CORS headers
          gl.deleteTexture(tex);
          cache.set(url, 'error');
          (waiters.get(url) || []).forEach((r) => r(null));
          waiters.delete(url);
          return;
        }
        const entry = { tex, w: sw, h: sh };
        cache.set(url, entry);
        (waiters.get(url) || []).forEach((r) => r(entry));
        waiters.delete(url);
      };
      im.onerror = () => {
        cache.set(url, 'error');
        (waiters.get(url) || []).forEach((r) => r(null));
        waiters.delete(url);
      };
      im.src = url;
    });
    const keepOnly = (urls) => {
      for (const [url, v] of cache) {
        if (v && typeof v === 'object' && !urls.includes(url) && v !== state.to && v !== state.from) {
          gl.deleteTexture(v.tex);
          cache.delete(url);
        }
      }
    };

    const zoomFor = (shownAt, now) => {
      const k = Math.min(1, (now - shownAt) / 12000);
      return 1.0 + 0.06 * (1 - Math.pow(1 - k, 2));
    };

    const resize = () => {
      let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const area = canvas.clientWidth * canvas.clientHeight * dpr * dpr;
      if (area > MAX_PIXELS) dpr *= Math.sqrt(MAX_PIXELS / area);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    // After a wave (or the first picture): load the next photo while nothing is moving,
    // and drop the ones far away
    const afterWave = () => {
      const i = state.shownIndex;
      if (i == null) return;
      const url = images[i];
      const next = images[(i + 1) % images.length];
      const prev = images[(i - 1 + images.length) % images.length];
      keepOnly([url, next, prev]);
      setTimeout(() => { if (!disposed) load(next); }, 250);
    };

    const draw = (now) => {
      if (!state.to) return;
      resize();
      let progress = 1;
      if (state.frozen !== null && state.from) {
        progress = state.frozen;
      } else if (state.transStart >= 0) {
        progress = Math.min(1, (now - state.transStart) / duration);
        if (progress >= 1) {
          state.transStart = -1;
          state.from = null;
          window.__wowHeroWave = false;
          afterWave();
        }
      }
      const from = state.from || state.to;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, from.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, state.to.tex);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uFromSize, from.w, from.h);
      gl.uniform2f(U.uToSize, state.to.w, state.to.h);
      gl.uniform1f(U.uProgress, state.from ? progress : 1);
      gl.uniform1f(U.uTime, (now - start) / 1000);
      gl.uniform1f(U.uZoomFrom, state.from ? state.fromZoom : zoomFor(state.toShownAt, now));
      gl.uniform1f(U.uZoomTo, zoomFor(state.toShownAt, now));
      // where this wave starts, and how far it travels to cross the whole screen
      const aspect = canvas.width / canvas.height;
      const o = WAVE_ORIGINS[((state.waveIdx % WAVE_ORIGINS.length) + WAVE_ORIGINS.length) % WAVE_ORIGINS.length];
      const ox = o.x * aspect, oy = o.y;
      const nearX = Math.min(Math.max(ox, 0), aspect), nearY = Math.min(Math.max(oy, 0), 1);
      const near = Math.hypot(ox - nearX, oy - nearY);
      const far = Math.max(...[[0, 0], [aspect, 0], [0, 1], [aspect, 1]].map(([cx, cy]) => Math.hypot(ox - cx, oy - cy)));
      gl.uniform2f(U.uOrigin, ox, oy);
      gl.uniform1f(U.uStart, near - WARP * 0.45);   // water enters right away
      gl.uniform1f(U.uEnd, far + BAND + WARP * 0.45);   // and finishes as it leaves
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let lastIdle = 0;
    const loop = (now) => {
      raf = 0;
      if (disposed || !visible || pausedNow || document.hidden) return;
      // full frame rate while the wave runs; the slow zoom alone is smooth at ~20 fps
      if (state.transStart >= 0 || state.frozen !== null || now - lastIdle > 50) {
        draw(now);
        lastIdle = now;
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !disposed) raf = requestAnimationFrame(loop); };

    const show = async (i, animate) => {
      if (state.frozen !== null) return;
      const url = images[i];
      state.pendingIndex = i;
      const entry = await load(url);
      if (disposed || state.pendingIndex !== i) return;
      if (!entry) {
        // this image cannot be drawn; if nothing is on screen yet, use the fallback
        if (!state.to) statusRef.current?.('off');
        return;
      }
      const now = performance.now();
      if (animate && state.to && state.to !== entry) {
        state.fromZoom = zoomFor(state.toShownAt, now);
        state.from = state.to;
        state.transStart = now;
        state.waveIdx += 1;          // every change comes from a different angle
        window.__wowHeroWave = true; // other page work (the chatbot avatar) eases off meanwhile
      }
      state.to = entry;
      state.toShownAt = now;
      if (!api.current.ready) {
        api.current.ready = true;
        statusRef.current?.('on');
      }
      draw(now);
      kick();
      state.shownIndex = i;
      // no wave running (first picture): get the next one ready now; otherwise after the wave
      if (state.transStart < 0) afterWave();
    };

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); })
      : null;
    io?.observe(canvas);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (state.to) draw(performance.now()); }) : null;
    ro?.observe(canvas);

    const onLost = (e) => { e.preventDefault(); statusRef.current?.('off'); disposed = true; };
    canvas.addEventListener('webglcontextlost', onLost);

    api.current = {
      ready: false,
      show,
      setPaused: (p) => { pausedNow = p; if (!p) kick(); }
    };
    // Development only (removed from production builds): lets a test hold the wave at a
    // given point, e.g. canvas.__liquidFreeze(0.4), and release it with null
    if (import.meta.env.DEV) {
      canvas.__liquidFreeze = (p) => { state.frozen = p; if (p === null) state.transStart = -1; draw(performance.now()); };
    }
    show(index, false);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const v of cache.values()) if (v && typeof v === 'object') gl.deleteTexture(v.tex);
      cache.clear();
      window.__wowHeroWave = false;
      api.current = null;
    };
    // set up once; images / index changes go through api.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new index plays the wave to that image
  const firstIndex = useRef(true);
  useEffect(() => {
    if (firstIndex.current) { firstIndex.current = false; return; }
    api.current?.show(index, true);
  }, [index]);

  useEffect(() => {
    api.current?.setPaused(paused);
  }, [paused]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
