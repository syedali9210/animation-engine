/* Animation Engine — stage bridge.
   Loaded as the first classic script in every device iframe, before any animation code, so it can:
     1. emulate the device: devicePixelRatio, prefers-reduced-motion, prefers-color-scheme
     2. hand live params from the engine to the animation   (window.engine.onParams)
     3. measure what the animation costs and report it back  (frame pacing, main-thread work,
        GPU time, canvas fill, which CSS properties the DOM animates)
   With ?vt=1 (the mockup studio's video export) it measures nothing and instead runs the page on a clock stepped by
   hand, so every frame of a video is exact (see 4).
   Exported animations work without it: every hook into window.engine is optional. */
(() => {
  const q = new URLSearchParams(location.search);
  const frame = q.get("frame") || "";
  const reduce = q.get("rm") === "1";
  const stepped = q.get("vt") === "1";
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
      if (d.type === "hairline") setHairline(!!d.on, d.ink, d.fill);
      if (d.type === "peel") setPeel(d.index == null ? -1 : +d.index);
      if (d.type === "part") {
        part = d.index == null ? "" : String(d.index);
        applyPart();
      }
      if (d.type === "describe") describe();
    } catch (err) {
      post("error", { message: String((err && err.message) || err) });
    }
  });
  addEventListener("error", (e) => post("error", { message: e.message }));
  addEventListener("unhandledrejection", (e) => post("error", { message: String(e.reason && e.reason.message || e.reason) }));

  /* ---------- 2b. hairline and layers (?hl=1 ?peel=k, or "hairline" / "peel" messages) ----------
     Hairline redraws the page as thin ink lines from its DOM, not its pixels: every painted box becomes its own
     outline (rounded corners kept), text stays text in the ink, icons keep only their strokes, and pictures and
     canvases become the edges of their brightness. It's live: the page animates underneath as before. The ink is the
     Hairline figures' (#232327 on paper, #d0d6e0 at night) or a colour the engine sends. Turned on, the page draws in
     back to front, one layer after another.
     Layers split the page by how deep each painted thing sits among the painted things around it: the ground, the
     surfaces on it, what's on those, and anything floating over the page (a toast, a sheet). "peel" shows just one,
     so the engine can stand the layers apart in an exploded view; each frame reports what its layers hold. */
  const realEvery = setInterval.bind(window);
  const HL_INK = { light: "#232327", dark: "#d0d6e0" };
  let hairline = q.get("hl") === "1";
  let hlInk = /^#[0-9a-f]{6}$/i.test(q.get("ink") || "") ? q.get("ink") : "";
  // surfaces filled with the ground hide the lines under them, the way a drawing does; "none" draws through (x-ray)
  let hlFill = q.get("fill") || "ground";
  const HL_GROUND = { light: "#ffffff", dark: "#0a0a0c" };
  const fillNow = () => (hlFill === "none" ? "transparent" : /^#[0-9a-f]{6}$/i.test(hlFill) ? hlFill : HL_GROUND[scheme]);
  let peel = q.has("peel") ? +q.get("peel") : -1;
  const LAYERS = Math.max(2, Math.min(6, +(q.get("layers") || 4)));
  const inkNow = () => hlInk || HL_INK[scheme];
  // a picture's or a canvas's lines: its brightness, softened so texture doesn't speckle, then its edges both ways
  const edgeFilter = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
    const fn = (c) => `<feFunc${c} type="linear" slope="5" intercept="-0.25"/>`;
    return `<filter id="__hl-edge" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="lum"/>` +
      `<feGaussianBlur in="lum" stdDeviation="1.2" result="soft"/>` +
      `<feConvolveMatrix in="soft" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="up"/>` +
      `<feConvolveMatrix in="soft" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" preserveAlpha="true" result="down"/>` +
      `<feComposite in="up" in2="down" operator="arithmetic" k2="1" k3="1" result="edges"/>` +
      `<feComponentTransfer in="edges" result="lines">${fn("R")}${fn("G")}${fn("B")}</feComponentTransfer>` +
      `<feColorMatrix in="lines" type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0.34 0.33 0.33 0 0"/></filter>`;
  };
  const range = (n) => [...Array(n).keys()];
  const HL_CSS =
    `html.__hl, html.__hl body { background: transparent !important; }
html.__hl *, html.__hl *::before, html.__hl *::after { background-color: transparent !important; background-image: none !important; box-shadow: none !important; text-shadow: none !important; border-color: var(--hl) !important; color: var(--hl) !important; -webkit-text-fill-color: var(--hl) !important; caret-color: var(--hl) !important; outline-color: var(--hl) !important; backdrop-filter: none !important; filter: none !important; }
html.__hl [data-hl-k="surface"], html.__hl [data-hl-k="control"], html.__hl [data-hl-k="media"] { outline: 1px solid var(--hl) !important; outline-offset: -1px !important; }
html.__hl [data-hl-k="surface"], html.__hl [data-hl-k="control"] { background-color: var(--hl-fill) !important; }
html.__hl svg, html.__hl svg * { fill: none !important; stroke: var(--hl) !important; }
html.__hl svg * { stroke-width: 1.2px !important; vector-effect: non-scaling-stroke; }
html.__hl img, html.__hl video, html.__hl canvas, html.__hl picture { filter: url(#__hl-edge) !important; }
html.__hl-in [data-hl-b] { animation: __hl-in .6s cubic-bezier(.23,1,.32,1) both; }
${range(6).map((k) => `html.__hl-in [data-hl-b="${k}"] { animation-delay: ${k * 160}ms; }`).join("\n")}
@keyframes __hl-in { from { opacity: 0; } }
html[data-peel]:not([data-peel="0"]), html[data-peel]:not([data-peel="0"]) body { background: transparent !important; }
html[data-peel] body * { visibility: hidden !important; }
${range(6).map((k) => `html[data-peel="${k}"] [data-hl-b="${k}"], html[data-peel="${k}"] svg[data-hl-b="${k}"] * { visibility: visible !important; }`).join("\n")}`;

  const isMedia = (t) => t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "IFRAME" || t === "PICTURE";
  const clear = (c) => c === "transparent" || c === "rgba(0, 0, 0, 0)";
  /** What an element paints by itself, if anything: a surface, a control, text, an icon or a picture. */
  const paints = (el, cs) => {
    const t = el.tagName;
    if (isMedia(t)) return "media";
    if (t === "svg") return "icon";
    const control = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL)$/.test(t) || el.getAttribute("role") === "button";
    const border = ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none" && !clear(cs[`border${s}Color`]));
    if (!clear(cs.backgroundColor) || cs.backgroundImage !== "none" || border || cs.boxShadow !== "none") return control ? "control" : "surface";
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(t)) return "control";
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return control ? "control" : "text";
    return null;
  };
  const NOUN = { surface: ["surface", "surfaces"], control: ["control", "controls"], text: ["text run", "text runs"], icon: ["icon", "icons"], media: ["picture", "pictures"] };
  let lastReport = "";
  /** Sorts the page into layers (data-hl-b), marks what each element paints (data-hl-k), and reports the layers. */
  const scan = () => {
    const body = document.body;
    if (!body) return;
    const items = [];
    const walk = (el, over) => {
      for (const c of el.children) {
        if (c.id === "__hl-defs" || c.tagName === "SCRIPT" || c.tagName === "STYLE") continue;
        const cs = getComputedStyle(c);
        if (cs.display === "none") continue;
        const z = parseInt(cs.zIndex) || 0;
        const floats = over || cs.position === "fixed" || (cs.position === "absolute" && z >= 40);
        const kind = paints(c, cs);
        if (kind) {
          const r = c.getBoundingClientRect();
          if (r.width > 0.5 && r.height > 0.5) items.push({ el: c, kind, over: floats, r });
        }
        if (kind !== "icon" && kind !== "media") walk(c, floats);
      }
    };
    walk(body, false);
    // the way a designer takes a screen apart, back to front: the ground (anything covering most of it), the surfaces
    // on it, the pictures, the type and icons, and whatever floats over the page; empty ones are skipped, and with
    // fewer layers asked for, neighbours merge (pictures into surfaces first, then floating into type)
    const W = innerWidth, H = innerHeight;
    const CLASS = ["ground", "surfaces", "media", "content", "floating"];
    const classOf = (it) =>
      it.over ? "floating" : it.kind === "media" ? "media" : it.kind === "text" || it.kind === "icon" ? "content" : it.r.width * it.r.height >= W * H * 0.5 ? "ground" : "surfaces";
    let used = CLASS.filter((c) => items.some((it) => classOf(it) === c));
    const merge = { media: "surfaces", floating: "content", ground: "surfaces", content: "surfaces" };
    const into = new Map(CLASS.map((c) => [c, c]));
    for (const c of ["media", "floating", "ground", "content"]) {
      if (used.length <= LAYERS) break;
      if (!used.includes(c)) continue;
      for (const [k, v] of into) if (v === c) into.set(k, merge[c]);
      used = used.filter((u) => u !== c);
    }
    const count = used.length;
    const groups = range(count).map(() => []);
    for (const it of items) {
      const b = used.indexOf(into.get(classOf(it)));
      if (it.el.dataset.hlB !== String(b)) it.el.dataset.hlB = String(b);
      if (it.el.dataset.hlK !== it.kind) it.el.dataset.hlK = it.kind;
      groups[b].push(it);
    }
    const LABEL = { ground: "Ground", surfaces: "Surfaces", media: "Media", content: "Type & icons", floating: "Floating" };
    const layers = groups.map((g, i) => {
      const kinds = {};
      let x0 = W, y0 = H, x1 = 0, y1 = 0, big = null;
      for (const it of g) {
        kinds[it.kind] = (kinds[it.kind] || 0) + 1;
        const r = it.r;
        x0 = Math.min(x0, Math.max(0, r.left)); y0 = Math.min(y0, Math.max(0, r.top));
        x1 = Math.max(x1, Math.min(W, r.right)); y1 = Math.max(y1, Math.min(H, r.bottom));
        if (!big || r.width * r.height > big.width * big.height) big = r;
      }
      const top = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
      const name = LABEL[used[i]];
      const note = top.slice(0, 2).map(([k, n]) => `${n} ${NOUN[k][n === 1 ? 0 : 1]}`).join(" · ");
      const anchor = big ? [Math.max(0, Math.min(W, big.left + big.width / 2)), Math.max(0, Math.min(H, big.top + Math.min(big.height / 2, 60)))] : [W / 2, H / 2];
      return { i, name, note, n: g.length, box: x1 > x0 ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, W, H], anchor };
    });
    const msg = JSON.stringify(layers.map((l) => [l.name, l.note, l.box.map(Math.round), l.anchor.map(Math.round)]));
    if (msg !== lastReport) {
      lastReport = msg;
      post("layers", { w: W, h: H, layers });
    }
  };
  /* ---------- 2c. components (?parts=1 reports them, ?part=k shows only that one, ?part=none the screen without any)
     A screen is made of components: a header, a search bar, category tabs, a banner, cards, a tab bar. Named ones
     (data-component="Search bar") come first. Otherwise they're found from the page's own structure: down through
     the wrappers to the container whose children stack up the screen, those children (a child that is most of the
     screen is opened up into its own), and anything fixed over the page. Showing one hides everything else but keeps
     every place (visibility, not removal) and keeps the backgrounds it sits on, so a component cut out of the screen
     looks exactly as it does in it, and lines up with it to the pixel. */
  let part = q.get("part") ?? "";
  const wantParts = q.get("parts") === "1" || part !== "";
  const PART_CSS =
    `html[data-part="none"] body *:not([data-hl-anc]) { visibility: hidden !important; }
${range(16).map((k) => `html[data-part="${k}"] body *:not([data-hl-cmp="${k}"], [data-hl-cmp="${k}"] *, [data-hl-anc~="${k}"]) { visibility: hidden !important; }`).join("\n")}`;
  const onScreen = (r) => Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left)) * Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
  const kidsOf = (el) =>
    [...el.children].filter((c) => {
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(c.tagName) || c.id === "__hl-defs") return false;
      if (getComputedStyle(c).display === "none") return false;
      const r = c.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2;
    });
  const titled = (s) => s.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase()).slice(0, 28);
  /** The screen's components, top to bottom, then whatever floats over it. */
  const findParts = () => {
    const screen = innerWidth * innerHeight;
    const big = (el) => onScreen(el.getBoundingClientRect()) > screen * 0.004;
    const named = [...document.querySelectorAll("[data-component]")].filter((el) => !el.parentElement?.closest("[data-component]") && big(el));
    if (named.length >= 2) return named;
    const floating = [];
    // a scrim (a full-screen wash with nothing in it) isn't a component
    const scrim = (el) => onScreen(el.getBoundingClientRect()) > screen * 0.85 && !(el.textContent || "").trim() && !el.querySelector("img, svg, canvas, video, input, button");
    let root = document.body;
    for (let depth = 0; depth < 16; depth++) {
      if (root.dataset.component) break;
      const kids = kidsOf(root);
      const flow = [];
      for (const c of kids) {
        const cs = getComputedStyle(c);
        const share = onScreen(c.getBoundingClientRect()) / screen;
        if (cs.position === "fixed" || (cs.position === "absolute" && share < 0.6) || (cs.position === "absolute" && (parseInt(cs.zIndex) || 0) >= 20)) {
          if (share > 0.004 && !scrim(c)) floating.push(c);
        } else flow.push(c);
      }
      if (flow.length === 1) {
        root = flow[0];
        continue;
      }
      // one child that is most of the screen, beside a little decoration: that's the wrapper
      const main = flow.filter((c) => onScreen(c.getBoundingClientRect()) > screen * 0.7);
      if (main.length === 1 && flow.length <= 3) {
        root = main[0];
        continue;
      }
      break;
    }
    let sections = kidsOf(root).filter((c) => !floating.includes(c) && big(c) && !scrim(c));
    // a section that is most of the screen is a group of components: open it up (twice at most; a named one stays whole)
    for (let pass = 0; pass < 2; pass++)
      sections = sections.flatMap((s) => {
        const kids = kidsOf(s).filter((c) => big(c) && !scrim(c));
        return !s.dataset.component && onScreen(s.getBoundingClientRect()) > screen * 0.42 && kids.length >= 2 ? kids : [s];
      });
    // a floating thing that is itself a wrapper (a sheet's positioner) is named by what's in it, but kept whole
    return [...sections, ...floating].filter(big).slice(0, 16);
  };
  const nameOf = (el, i) => {
    if (el.dataset.component) return el.dataset.component;
    const label = el.getAttribute("aria-label");
    if (label) return titled(label);
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const buttons = el.querySelectorAll("button, [role=button], a").length;
    const floats = cs.position === "fixed" || cs.position === "absolute";
    if (el.matches("[role=dialog], dialog, [aria-modal=true]") || el.querySelector("[role=dialog], [aria-modal=true]")) return r.bottom >= innerHeight - 2 && r.height < innerHeight * 0.8 ? "Sheet" : "Dialog";
    if (el.matches("[role=status], [role=alert]") || (floats && r.height < innerHeight * 0.14 && r.top < innerHeight * 0.3 && (el.textContent || "").trim())) return "Toast";
    if (el.matches("nav, [role=navigation], [role=tablist]") || el.querySelector("nav, [role=tablist]")) return r.bottom > innerHeight * 0.85 ? "Tab bar" : "Navigation";
    if (el.querySelector("input[type=search], [role=search], [role=searchbox]") || (el.querySelector("input") && /search/i.test(el.textContent))) return "Search";
    const fields = el.querySelectorAll("input:not([type=hidden]), textarea, select").length;
    if (fields === 1 && el.querySelector("textarea, input") && buttons >= 1 && r.height < innerHeight * 0.3) return "Composer";
    if (fields >= 2) return "Form";
    if (floats && r.bottom >= innerHeight - 2 && r.height < innerHeight * 0.85 && r.height > innerHeight * 0.2) return "Sheet";
    const h = el.querySelector("h1, h2, h3, h4");
    if (h && h.textContent.trim() && h.textContent.trim().split(/\s+/).length <= 4) return titled(h.textContent);
    const media = el.querySelectorAll("img, canvas, video").length;
    if ([el, ...el.querySelectorAll("*")].some((x) => x.scrollWidth > x.clientWidth + 24 && /auto|scroll/.test(getComputedStyle(x).overflowX))) return media ? "Carousel" : "Chips";
    if (r.top < innerHeight * 0.12 && r.height < innerHeight * 0.22) return "Header";
    if (r.bottom > innerHeight * 0.88 && r.height < innerHeight * 0.16) return buttons >= 3 ? "Tab bar" : "Footer";
    if (media >= 3) return "Gallery";
    if (media >= 1 && r.height > 120) return "Media";
    const t = (el.innerText || "").trim().split("\n")[0].trim();
    if (buttons === 1 && t.length && t.length < 24) return titled(t);
    if (t && t.split(/\s+/).length <= 3) return titled(t);
    return `Part ${i + 1}`;
  };
  /** The thing in a component a camera would close in on: its biggest heading, or its main control. */
  const keyOf = (el) => {
    let best = null, score = 0;
    for (const x of [el, ...el.querySelectorAll("*")]) {
      const r = x.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || onScreen(r) < 40) continue;
      const cs = getComputedStyle(x);
      const kind = paints(x, cs);
      if (!kind || kind === "surface") continue;
      const s = kind === "control" ? 2.2 * Math.sqrt(r.width * r.height) : kind === "media" ? 0.7 * Math.sqrt(r.width * r.height) : parseFloat(cs.fontSize) * (+cs.fontWeight >= 600 ? 3.4 : 2.4) + Math.min(r.width, 200) * 0.05;
      if (s > score) {
        score = s;
        best = r;
      }
    }
    if (!best) return null;
    // only the part of it on the screen
    const x0 = Math.max(0, best.left), y0 = Math.max(0, best.top);
    const x1 = Math.min(innerWidth, best.right), y1 = Math.min(innerHeight, best.bottom);
    return x1 - x0 > 4 && y1 - y0 > 4 ? [x0, y0, x1 - x0, y1 - y0].map(Math.round) : null;
  };
  let lastParts = "";
  const scanParts = () => {
    if (!document.body) return;
    const els = findParts();
    for (const x of document.querySelectorAll("[data-hl-cmp], [data-hl-anc]")) {
      delete x.dataset.hlCmp;
      delete x.dataset.hlAnc;
    }
    const items = els.map((el, i) => {
      el.dataset.hlCmp = String(i);
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) a.dataset.hlAnc = `${a.dataset.hlAnc ?? ""} ${i}`.trim();
      const r = el.getBoundingClientRect();
      const kinds = {};
      for (const x of el.querySelectorAll("*")) {
        const k = paints(x, getComputedStyle(x));
        if (k && k !== "surface") kinds[k] = (kinds[k] || 0) + 1;
      }
      const note = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${n} ${NOUN[k][n === 1 ? 0 : 1]}`).join(" · ");
      const box = [Math.max(0, r.left), Math.max(0, r.top), Math.min(innerWidth, r.right) - Math.max(0, r.left), Math.min(innerHeight, r.bottom) - Math.max(0, r.top)].map(Math.round);
      return { i, name: nameOf(el, i), note, box, key: keyOf(el) };
    });
    const bg = (el) => (el ? getComputedStyle(el).backgroundColor : "");
    const ground = [document.body, document.documentElement, ...document.querySelectorAll("body > div, #root > div")].map(bg).find((c) => c && !clear(c)) || (scheme === "dark" ? "#0a0a0c" : "#ffffff");
    window.__parts = { ground, items };
    const msg = JSON.stringify(items);
    if (msg !== lastParts) {
      lastParts = msg;
      post("parts", { w: innerWidth, h: innerHeight, ground, items });
    }
  };
  const applyPart = () => {
    const doc = document.documentElement;
    if (!document.getElementById("__part-style")) {
      const st = document.createElement("style");
      st.id = "__part-style";
      st.textContent = PART_CSS;
      (document.head || doc).appendChild(st);
    }
    if (part !== "") doc.dataset.part = part;
    else delete doc.dataset.part;
    if (wantParts) scanParts();
  };
  window.__partScan = () => wantParts && scanParts();
  window.__hlScan = scan;

  const applyHairline = () => {
    const doc = document.documentElement;
    if (!document.getElementById("__hl-style")) {
      const st = document.createElement("style");
      st.id = "__hl-style";
      st.textContent = HL_CSS;
      (document.head || doc).appendChild(st);
    }
    let defs = document.getElementById("__hl-defs");
    if (hairline && !defs) {
      const holder = document.createElement("div");
      holder.innerHTML = `<svg id="__hl-defs" aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0"><defs></defs></svg>`;
      defs = holder.firstChild;
      doc.appendChild(defs);
    }
    if (defs) defs.firstChild.innerHTML = edgeFilter(inkNow());
    doc.style.setProperty("--hl", inkNow());
    doc.style.setProperty("--hl-fill", fillNow());
    doc.classList.toggle("__hl", hairline);
    if (peel >= 0) doc.dataset.peel = String(peel);
    else delete doc.dataset.peel;
    if (hairline || peel >= 0) scan();
  };
  const setHairline = (on, ink, fill) => {
    if (typeof ink === "string") hlInk = /^#[0-9a-f]{6}$/i.test(ink) ? ink : "";
    if (typeof fill === "string") hlFill = fill;
    const turnedOn = on && !hairline;
    hairline = on;
    applyHairline();
    // drawn in back to front, the first time it comes on in a running page
    if (turnedOn && document.body) {
      document.documentElement.classList.remove("__hl-in");
      void document.documentElement.offsetWidth;
      document.documentElement.classList.add("__hl-in");
    }
  };
  const setPeel = (k) => {
    peel = Number.isFinite(k) ? k : -1;
    applyHairline();
  };
  themeHandlers.add(applyHairline); // the ink follows the theme
  const startHairline = () => {
    applyHairline();
    applyPart();
    // keep the layers and the components current as the page changes (cheap: a few hundred elements, a few times a
    // second)
    realEvery(() => {
      if (hairline || peel >= 0 || q.get("layers")) scan();
      if (wantParts) scanParts();
    }, 350);
  };
  if (document.body) startHairline();
  else addEventListener("DOMContentLoaded", startHairline);

  /** For the engine's copy writer: what the page says, biggest first, and its main colours. */
  const describe = () => {
    const seen = new Set();
    const texts = [];
    const colors = {};
    for (const el of document.body ? document.body.querySelectorAll("*") : []) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (!clear(cs.backgroundColor)) colors[cs.backgroundColor] = (colors[cs.backgroundColor] || 0) + r.width * r.height;
      let own = "";
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
      own = own.replace(/\s+/g, " ").trim();
      if (!own || own.length > 120 || seen.has(own)) continue;
      seen.add(own);
      colors[cs.color] = (colors[cs.color] || 0) + own.length * 40;
      texts.push({ t: own, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, tag: el.tagName.toLowerCase(), control: !!paints(el, cs) && /^(BUTTON|A)$/.test(el.tagName) });
    }
    texts.sort((a, b) => b.size - a.size || b.weight - a.weight);
    const palette = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
    post("describe", { title: document.title, texts: texts.slice(0, 40), colors: palette });
  };

  /* ---------- 3. measurement ---------- */
  if (!stepped) {
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
  }

  /* ---------- 4. a clock stepped by hand (?vt=1) ----------
     Timers, rAF, performance.now / Date.now and every CSS / WAAPI animation follow window.__adv(ms), and smooth
     scrolls are replayed on it, so a video can be filmed frame by frame and still play back smooth. (The KIPRUN
     film's clock.js, plus element.scrollTo and a settle step so React commits before the frame is captured.) */
  if (stepped) {
    const realST = setTimeout.bind(window);
    const realSI = setInterval.bind(window);
    let t = 0;
    const epoch = Date.now();
    performance.now = () => t;
    Date.now = () => epoch + t;

    let rafs = new Map(), rid = 0;
    window.requestAnimationFrame = (cb) => { rafs.set(++rid, cb); return rid; };
    window.cancelAnimationFrame = (id) => { rafs.delete(id); };
    window.requestIdleCallback = (cb) => realST(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);

    const timers = new Map(); let tid = 0;
    const addTimer = (cb, ms, args, every) => { const id = ++tid; timers.set(id, { cb, at: t + Math.max(0, +ms || 0), args, every: every ? Math.max(1, +ms || 0) : 0 }); return id; };
    window.setTimeout = (cb, ms, ...args) => addTimer(cb, ms, args, false);
    window.setInterval = (cb, ms, ...args) => addTimer(cb, ms, args, true);
    window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };

    // every animation is held and placed by hand, from the moment it was first seen
    const starts = new WeakMap();
    const sync = () => {
      for (const a of document.getAnimations()) {
        if (!starts.has(a)) starts.set(a, t);
        if (a.playState !== "paused") a.pause();
        a.currentTime = (t - starts.get(a)) * (a.playbackRate || 1);
      }
    };
    realSI(sync, 3); // catch new ones between steps, before they run on the real clock
    const settle = () => new Promise((r) => realST(r, 0));
    // when the components were last read (virtual ms)
    let partAt = -Infinity;

    // in display-frame steps: animation code reads one long jump as a stall (GSAP's lag smoothing drops it, springs
    // overshoot), so a still pre-rolled 1.8 s or a 30 fps frame plays out frame by frame, the way a screen would show it
    window.__adv = async (dt) => {
      for (let left = dt; left > 1e-6; left -= 1000 / 60) await tick(Math.min(left, 1000 / 60));
      return t;
    };
    const tick = async (dt) => {
      const target = t + dt;
      for (;;) {
        let next = null, nid = 0;
        for (const [id, tm] of timers) if (tm.at <= target && (!next || tm.at < next.at)) { next = tm; nid = id; }
        if (!next) break;
        t = next.at;
        if (next.every) next.at += next.every; else timers.delete(nid);
        try { if (typeof next.cb === "function") next.cb(...next.args); } catch (e) { console.error(e); }
        await Promise.resolve();
      }
      t = target;
      const q2 = rafs; rafs = new Map();
      for (const cb of q2.values()) { try { cb(t); } catch (e) { console.error(e); } }
      // let React render and commit what the timers and frames changed, then pin any transition that started
      await settle(); await settle();
      sync();
      // a layer or a hairline has to know about anything new before the frame is captured
      if (root.classList.contains("__hl") || root.dataset.peel) window.__hlScan?.();
      if (t - partAt >= 350) {
        partAt = t;
        window.__partScan?.();
      }
      return t;
    };
    window.__now = () => t;

    // smooth scrolls, replayed on this clock (the browser's own would finish in real time)
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const winTo = window.scrollTo.bind(window), elTo = Element.prototype.scrollTo;
    const glide = (el, top, left) => {
      const win = el === window;
      const y0 = win ? scrollY : el.scrollTop, x0 = win ? scrollX : el.scrollLeft;
      const dist = Math.max(Math.abs((top ?? y0) - y0), Math.abs((left ?? x0) - x0));
      const T = Math.min(900, 300 + dist * 0.5), t0 = t;
      const step = () => {
        const k = ease(Math.min(1, (t - t0) / T));
        const o = { top: top == null ? y0 : y0 + (top - y0) * k, left: left == null ? x0 : x0 + (left - x0) * k, behavior: "instant" };
        if (win) winTo(o); else elTo.call(el, o);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const smooth = (o) => o && typeof o === "object" && o.behavior === "smooth";
    window.scrollTo = (a, b) => (smooth(a) ? glide(window, a.top, a.left) : typeof a === "object" ? winTo({ ...a, behavior: "instant" }) : winTo(a, b));
    window.scrollBy = (a, b) => (smooth(a) ? glide(window, a.top == null ? null : scrollY + a.top, a.left == null ? null : scrollX + a.left) : typeof a === "object" ? winTo({ top: scrollY + (a.top || 0), left: scrollX + (a.left || 0), behavior: "instant" }) : winTo(scrollX + a, scrollY + b));
    Element.prototype.scrollTo = function (a, b) {
      if (smooth(a)) return glide(this, a.top, a.left);
      return typeof a === "object" ? elTo.call(this, { ...a, behavior: "instant" }) : elTo.call(this, a, b);
    };
    Element.prototype.scrollBy = function (a, b) {
      if (smooth(a)) return glide(this, a.top == null ? null : this.scrollTop + a.top, a.left == null ? null : this.scrollLeft + a.left);
      return typeof a === "object" ? elTo.call(this, { top: this.scrollTop + (a.top || 0), left: this.scrollLeft + (a.left || 0), behavior: "instant" }) : elTo.call(this, this.scrollLeft + a, this.scrollTop + b);
    };
    const intoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (o) {
      if (!smooth(o)) return intoView.call(this, o);
      intoView.call(this, { ...o, behavior: "instant" }); // close enough for a film: the nearest scroller lands there
    };
    addEventListener("DOMContentLoaded", () => { root.style.scrollBehavior = "auto"; });
  }

  post("ready", {});
})();
