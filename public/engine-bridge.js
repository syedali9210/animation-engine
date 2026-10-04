/* Animation Engine — stage bridge.
   Loaded as the first classic script in every device iframe, before any animation code, so it can:
     1. emulate the device: devicePixelRatio, prefers-reduced-motion, prefers-color-scheme
     2. hand live params from the engine to the animation   (window.engine.onParams)
     3. measure what the animation costs and report it back  (frame pacing, main-thread work,
        GPU time, canvas fill, which CSS properties the DOM animates)
   Exported animations work without it: every hook into window.engine is optional. */
(() => {
  const q = new URLSearchParams(location.search);
  const frame = q.get("frame") || "";
  const reduce = q.get("rm") === "1";
  let scheme = q.get("cs") === "light" ? "light" : "dark"; // switches live via a "theme" message
  const dpr = parseFloat(q.get("dpr") || "") || 0;
  // The engine may serve each device frame from its own site (iphone.localhost…) so Chrome gives it its
  // own process; `host` is the engine's origin to talk to.
  const host = q.get("host") || location.origin;
  const now = () => performance.now();
  const post = (type, data) => parent !== window && parent.postMessage({ source: "anim-engine-stage", frame, type, ...data }, host);

  /* ---------- 1. device emulation ---------- */
  if (dpr) Object.defineProperty(window, "devicePixelRatio", { get: () => dpr, configurable: true });
  const root = document.documentElement;
  const applyScheme = () => {
    root.dataset.theme = scheme;
    root.classList.toggle("dark", scheme === "dark");
    root.style.colorScheme = scheme;
  };
  applyScheme();

  // A media query string -> forced answer, or undefined when it isn't one we emulate.
  const forced = (m) =>
    /prefers-reduced-motion/.test(m) ? (/no-preference/.test(m) ? !reduce : reduce)
    : /prefers-color-scheme/.test(m) ? m.includes(scheme)
    : undefined;
  const realMatchMedia = window.matchMedia.bind(window);
  const schemeQueries = new Set(); // live color-scheme MediaQueryLists, told when the theme flips
  window.matchMedia = (media) => {
    const m = String(media);
    const f = forced(m);
    if (f === undefined) return realMatchMedia(media);
    const listeners = new Set();
    const mql = {
      media: m, matches: f, onchange: null,
      addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn),
      addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
      dispatchEvent: () => false,
    };
    if (/prefers-color-scheme/.test(m)) schemeQueries.add({ mql, listeners });
    return mql;
  };
  // Same answers for stylesheets: flip matching @media rules to `all` / `not all`, remembering the
  // original condition so color-scheme rules can be re-evaluated when the theme changes.
  const patched = new WeakSet();
  const original = new WeakMap();
  const schemeRules = [];
  const patchRules = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSMediaRule) {
        const text = original.get(r) ?? r.media.mediaText;
        const f = forced(text);
        if (f !== undefined) {
          if (!original.has(r) && /prefers-color-scheme/.test(text)) schemeRules.push(r);
          original.set(r, text);
          r.media.mediaText = f ? "all" : "not all";
        }
      }
      if (r.cssRules) patchRules(r.cssRules);
    }
  };
  const themeHandlers = new Set();
  const setScheme = (next) => {
    if (next === scheme) return;
    scheme = next;
    applyScheme();
    for (const r of schemeRules) r.media.mediaText = forced(original.get(r)) ? "all" : "not all";
    for (const { mql, listeners } of schemeQueries) {
      mql.matches = forced(mql.media);
      const ev = { matches: mql.matches, media: mql.media };
      for (const fn of listeners) fn.call(mql, ev);
      if (typeof mql.onchange === "function") mql.onchange(ev);
    }
    for (const fn of themeHandlers) fn(scheme);
  };
  const shadowRoots = new Set();
  const scanSheets = () => {
    for (const list of [document.styleSheets, ...[...shadowRoots].map((s) => s.styleSheets)])
      for (const sheet of list) {
        if (patched.has(sheet)) continue;
        try { patchRules(sheet.cssRules); patched.add(sheet); } catch { patched.add(sheet); } // cross-origin sheet
      }
  };
  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const sr = attachShadow.call(this, init);
    shadowRoots.add(sr);
    queueMicrotask(scanSheets);
    return sr;
  };
  new MutationObserver(scanSheets).observe(document.head, { childList: true, subtree: true }); // bundlers inject <style> here
  addEventListener("DOMContentLoaded", scanSheets);

  /* ---------- 2. params ---------- */
  let params = null;
  const handlers = new Set();
  let bare = false; // on a built screen with something behind it: draw only the animation, no stand-in app
  const bareHandlers = new Set();
  window.engine = {
    frame, reduce, dpr,
    get scheme() { return scheme; },
    get params() { return params; },
    onParams(fn) { handlers.add(fn); if (params) fn(params); return () => handlers.delete(fn); },
    onTheme(fn) { themeHandlers.add(fn); return () => themeHandlers.delete(fn); },
    get bare() { return bare; },
    onBare(fn) { bareHandlers.add(fn); return () => bareHandlers.delete(fn); },
    /** tell the engine something about this frame, e.g. the animation's natural size */
    report(type, data) { post(type, data); },
  };
  addEventListener("message", (e) => {
    const d = e.data;
    if (e.origin !== host || !d || d.source !== "anim-engine-host") return;
    try {
      if (d.type === "params") {
        params = d.values;
        for (const fn of handlers) fn(params);
      }
      if (d.type === "theme") setScheme(d.scheme === "light" ? "light" : "dark");
      if (d.type === "bare" && !!d.on !== bare) {
        bare = !!d.on;
        for (const fn of bareHandlers) fn(bare);
      }
    } catch (err) {
      post("error", { message: String((err && err.message) || err) });
    }
  });
  addEventListener("error", (e) => post("error", { message: e.message }));
  addEventListener("unhandledrejection", (e) => post("error", { message: String(e.reason && e.reason.message || e.reason) }));

  /* ---------- 3. measurement ---------- */
  // main-thread JS: time spent inside every rAF callback the page registers
  const realRaf = window.requestAnimationFrame.bind(window);
  let jsMs = 0;
  window.requestAnimationFrame = (cb) => realRaf((ts) => { const t0 = now(); try { cb(ts); } finally { jsMs += now() - t0; } });

  // GPU: WebGL2 timer queries around each frame, WebGPU submit -> work-done latency
  const gls = [];
  let gpuSamples = [], gpuKind = null;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const ctx = getContext.call(this, type, opts);
    if (type === "webgl2" && ctx && !gls.some((g) => g.gl === ctx)) {
      const ext = ctx.getExtension("EXT_disjoint_timer_query_webgl2");
      gls.push({ gl: ctx, ext, active: null, pending: [] });
      gpuKind = ext ? "webgl" : gpuKind || "webgl-untimed";
    }
    if (type === "webgpu") gpuKind = "webgpu";
    return ctx;
  };
  if (window.GPUQueue) {
    const submit = GPUQueue.prototype.submit;
    GPUQueue.prototype.submit = function (buffers) {
      const t0 = now();
      submit.call(this, buffers);
      this.onSubmittedWorkDone().then(() => gpuSamples.push(now() - t0), () => {});
    };
  }
  const gpuBegin = () => {
    for (const g of gls) {
      if (!g.ext || g.active || g.gl.isContextLost()) continue;
      while (g.pending.length) { // collect finished queries from earlier frames
        const qr = g.pending[0];
        if (!g.gl.getQueryParameter(qr, g.gl.QUERY_RESULT_AVAILABLE)) break;
        if (!g.gl.getParameter(g.ext.GPU_DISJOINT_EXT)) gpuSamples.push(g.gl.getQueryParameter(qr, g.gl.QUERY_RESULT) / 1e6);
        g.gl.deleteQuery(qr);
        g.pending.shift();
      }
      if (g.pending.length > 8) continue; // driver is behind; don't pile up
      g.active = g.gl.createQuery();
      g.gl.beginQuery(g.ext.TIME_ELAPSED_EXT, g.active);
    }
  };
  const gpuEnd = () => {
    for (const g of gls) if (g.active) { g.gl.endQuery(g.ext.TIME_ELAPSED_EXT); g.pending.push(g.active); g.active = null; }
  };

  // DOM: which properties change every frame, sorted into compositor / paint / layout work
  const LAYOUT = /^(width|height|top|left|right|bottom|inset|margin|padding|font-size|line-height|border-width|min-|max-|flex|gap|grid|letter-spacing)/;
  const COMPOSITE = /^(transform|opacity|translate|rotate|scale)$/;
  const kindOf = (el, prop) => el instanceof SVGElement && !(el instanceof SVGSVGElement) ? "paint" : COMPOSITE.test(prop) ? "composite" : LAYOUT.test(prop) ? "layout" : "paint";
  let props = new Map(); // "kind:prop" -> count since last report
  const bump = (kind, prop, n = 1) => props.set(kind + ":" + prop, (props.get(kind + ":" + prop) || 0) + n);
  const lastStyle = new WeakMap();
  new MutationObserver((list) => {
    for (const m of list) {
      const el = m.target;
      if (m.attributeName !== "style") { bump(kindOf(el, m.attributeName), m.attributeName); continue; }
      const prev = lastStyle.get(el) || {}, next = {};
      for (let i = 0; i < el.style.length; i++) {
        const k = el.style[i];
        next[k] = el.style.getPropertyValue(k);
        if (prev[k] !== next[k]) bump(kindOf(el, k), k);
      }
      lastStyle.set(el, next);
    }
  }).observe(root, { attributes: true, subtree: true, attributeFilter: ["style", "transform", "x", "y", "cx", "cy", "r", "rx", "ry", "width", "height", "d", "points", "opacity", "fill"] });
  const sampleAnimations = () => { // CSS animations/transitions + WAAPI (Motion hands transform/opacity to WAAPI)
    if (!document.getAnimations) return;
    for (const a of document.getAnimations()) {
      if (a.playState !== "running" || !a.effect || !a.effect.getKeyframes) continue;
      const el = a.effect.target;
      const keys = new Set();
      for (const k of a.effect.getKeyframes()) for (const p in k) if (!/^(offset|easing|composite|computedOffset)$/.test(p)) keys.add(p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()));
      for (const p of keys) bump(el ? kindOf(el, p) : "composite", p, 6); // polled at 10/s; weight 6 ~ frames at 60fps
    }
  };

  // the frame loop: pacing from rAF timestamps, work from frame start to the first task after rendering
  let last = 0, intervals = [], work = [];
  const loop = (ts) => {
    if (last) intervals.push(ts - last);
    last = ts;
    gpuBegin();
    setTimeout(() => { work.push(now() - ts); gpuEnd(); }, 0);
    realRaf(loop);
  };
  realRaf(loop);

  const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    sampleAnimations();
    if (++tick % 5) return; // report every 500ms
    scanSheets();
    // almost no frames means the host throttled us (pane hidden, window occluded) — nothing to report
    if (intervals.length < 3) { intervals = []; work = []; gpuSamples = []; jsMs = 0; props = new Map(); return; }
    const median = pct(intervals, 0.5) || 16.7;
    let canvasPx = 0;
    for (const c of document.querySelectorAll("canvas")) canvasPx += c.width * c.height;
    const n = intervals.length || 1;
    post("perf", {
      fps: intervals.length ? 1000 / avg(intervals) : 0,
      interval: median,
      dropped: intervals.filter((i) => i > median * 1.5).length / n,
      workMs: pct(work, 0.5),
      workP95: pct(work, 0.95),
      jsMs: jsMs / n,
      gpuMs: gpuSamples.length ? pct(gpuSamples, 0.5) : null,
      gpuP95: gpuSamples.length ? pct(gpuSamples, 0.95) : null,
      gpuKind,
      canvasPx,
      dom: [...props].map(([k, count]) => { const [kind, prop] = k.split(":"); return { kind, prop, perSec: count * 2 }; }).sort((a, b) => b.perSec - a.perSec).slice(0, 12),
    });
    intervals = []; work = []; gpuSamples = []; jsMs = 0; props = new Map();
  }, 100);

  post("ready", {});
})();
