import type { AnimMeta, Value, Values } from "./registry";
import type { Device } from "./devices";

/** What the stage bridge reports every 500ms. */
export interface Perf {
  fps: number;
  interval: number;
  dropped: number;
  workMs: number;
  workP95: number;
  jsMs: number;
  gpuMs: number | null;
  gpuP95: number | null;
  gpuKind: "webgl" | "webgl-untimed" | "webgpu" | null;
  canvasPx: number;
  dom: { kind: "composite" | "paint" | "layout"; prop: string; perSec: number }[];
  history: number[];
}

/** This computer's GPU from the WebGL renderer string, bucketed into a rough FP32 class (the default for the calibration knob). */
export function detectHost() {
  let name = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    name = String(ext ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "").replace(/^ANGLE \(|\)$/g, "");
  } catch {
    /* no WebGL: keep the mid default */
  }
  // ponytail: regex buckets, not a GPU database — the select lets people correct it
  const tflops = /RTX (40|50)|RX (7[89]|9)\d/i.test(name) ? 20 : /RTX|GTX 1[06-9]|RX [56]\d{3}|Arc A7|Apple M\d (Pro|Max|Ultra)/i.test(name) ? 10 : /Apple/i.test(name) ? 4 : /Intel|Vega|Radeon\(TM\) Graphics|Iris|UHD|Adreno|Mali/i.test(name) ? 2 : 4;
  return { name, tflops };
}

/** Frame budget on the device, and this frame's cost against it. GPU is scaled host -> device by throughput. */
export function deviceLoad(p: Perf, d: Device, hostTflops: number) {
  const budget = 1000 / d.hz;
  const gpuMs = p.gpuMs == null ? null : (p.gpuMs * hostTflops) / d.tflops;
  return { budget, mainMs: p.workMs, main: p.workMs / budget, gpuMs, gpu: gpuMs == null ? null : gpuMs / budget };
}

export type Level = "error" | "warn" | "tip" | "pass";
export interface Suggestion {
  level: Level;
  tag: "Reduced motion" | "Timing" | "Easing" | "Motion" | "Behaviour" | "Performance";
  title: string;
  body: string;
  code?: string;
  fix?: { key: string; value: Value; label: string };
  action?: "reduce" | "nativeDpr";
}

export const EMIL_EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const bezier = (s: string) => (String(s).match(/-?[\d.]+/g) ?? []).map(Number);

const MOVES = /^(transform|translate|rotate|scale|top|left|right|bottom|x|y|cx|cy|d|points|margin|inset)/;

function reducedMotionSnippet(tech: string[]) {
  if (tech.includes("GSAP"))
    return `const mm = gsap.matchMedia();
mm.add({ reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  if (ctx.conditions.reduce) return tl.progress(1); // land on the end state, no travel
  tl.play();
});`;
  if (tech.some((t) => /WebGL|WebGPU|Three|Canvas/.test(t)))
    return `const reduce = matchMedia("(prefers-reduced-motion: reduce)");
// freeze time and draw on change — don't keep a 120Hz loop running a still image
renderer.setAnimationLoop(reduce.matches ? null : loop);
if (reduce.matches) render(0);`;
  if (tech.includes("Motion"))
    return `import { MotionConfig, useReducedMotion } from "motion/react";

// once at the root: transform + layout animations off, opacity/colour kept
<MotionConfig reducedMotion="user">{app}</MotionConfig>

// or per component
const reduce = useReducedMotion();
<motion.div animate={{ opacity: 1, y: reduce ? 0 : 8 }} />`;
  return `@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 200ms ease; /* keep the fade, it aids comprehension */
    transform: none;            /* drop the movement */
  }
}`;
}

export function suggest(a: AnimMeta, v: Values, perf: Record<string, Perf>, devices: Device[], ctx: { reduce: boolean; nativeDpr: boolean; hostTflops: number }): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (s: Suggestion) => out.push(s);
  const specs = Object.entries(a.schema);

  /* ---- reduced motion (always first) ---- */
  const why = "Reduced motion means fewer and gentler animations, not zero: keep opacity and colour changes that help people follow along, remove movement and position changes. Motion can make people physically sick.";
  const rmToggle = specs.find(([k, s]) => s.type === "boolean" && k === "reducedMotion");
  if (rmToggle && v.reducedMotion === false)
    add({ level: "error", tag: "Reduced motion", title: "Reduced-motion fallback is switched off", body: `This port can honour prefers-reduced-motion, but it's disabled. ${why}`, fix: { key: "reducedMotion", value: true, label: "Turn it back on" } });
  if (a.reducedMotion === "none")
    add({ level: "error", tag: "Reduced motion", title: "The original ignores prefers-reduced-motion", body: `${a.reducedMotionNote} ${why}`, code: reducedMotionSnippet(a.tech) });
  else if (a.reducedMotion === "partial")
    add({ level: "warn", tag: "Reduced motion", title: "Only partly respects reduced motion", body: `${a.reducedMotionNote} ${why}`, code: reducedMotionSnippet(a.tech) });
  else add({ level: "pass", tag: "Reduced motion", title: "Respects prefers-reduced-motion", body: a.reducedMotionNote });

  if (!ctx.reduce)
    add({ level: "tip", tag: "Reduced motion", title: "Preview it the way those users see it", body: "Switch on Reduced motion in the stage toolbar — every frame reloads with the OS setting emulated (media queries, matchMedia and Motion all see it).", action: "reduce" });
  else
    for (const d of devices) {
      const p = perf[d.id];
      if (!p) continue;
      const moving = p.dom.filter((x) => MOVES.test(x.prop) && x.perSec >= 6);
      if (moving.length)
        add({ level: "warn", tag: "Reduced motion", title: `Still moving with reduced motion on (${d.name})`, body: `These keep changing every frame: ${moving.map((x) => x.prop).join(", ")}. Swap travel for a short opacity fade.` });
      else if (p.canvasPx > 0 && (p.jsMs > 0.15 || (p.gpuMs ?? 0) > 0.15))
        add({ level: "tip", tag: "Reduced motion", title: `Still rendering every frame (${d.name})`, body: `The canvas keeps redrawing (${p.jsMs.toFixed(1)}ms JS${p.gpuMs != null ? `, ${p.gpuMs.toFixed(1)}ms GPU` : ""} per frame) even though nothing should move. Render once and stop the loop — it saves battery on every device.` });
      break; // one device is enough to make the point
    }

  /* ---- timing ---- */
  const ms = specs.filter(([, s]) => s.type === "number" && s.unit === "ms");
  for (const [k, s] of ms) {
    const val = Number(v[k]);
    if (s.role === "press" && val > 160)
      add({ level: "warn", tag: "Timing", title: `${s.label}: ${val}ms is slow for press feedback`, body: "Button press feedback should land in 100–160ms so the interface feels like it heard you.", fix: { key: k, value: 140, label: "Set 140ms" } });
    const limit = s.limit ?? 300;
    if ((s.role === "ui" || s.role === "enter") && a.ui && val > limit)
      add({
        level: "warn",
        tag: "Timing",
        title: `${s.label}: ${val}ms — keep this under ${limit}ms`,
        body: "A 180ms dropdown feels more responsive than a 400ms one; speed is perceived performance. Modals and drawers can run 200–500ms, dropdowns 150–250ms, press feedback 100–160ms.",
        fix: { key: k, value: Math.round(limit * 0.8), label: `Set ${Math.round(limit * 0.8)}ms` },
      });
    if (s.role === "exit") {
      const enter = ms.find(([, e]) => e.role === "enter" && e.group === s.group);
      if (enter && val >= Number(v[enter[0]]))
        add({ level: "tip", tag: "Timing", title: `${s.label} is as slow as the entrance`, body: "Make exits faster than entrances: be slow where the user is deciding, fast where the system responds.", fix: { key: k, value: Math.round(Number(v[enter[0]]) * 0.7), label: `Set ${Math.round(Number(v[enter[0]]) * 0.7)}ms` } });
    }
    if (s.role === "stagger" && val > 80)
      add({ level: "tip", tag: "Timing", title: `${s.label}: ${val}ms between items`, body: "Keep stagger delays at 30–80ms; longer cascades make the whole interface feel slow. Never block interaction while a stagger plays.", fix: { key: k, value: 50, label: "Set 50ms" } });
  }

  /* ---- easing ---- */
  for (const [k, s] of specs) {
    if (s.type !== "easing") continue;
    const [x1, y1, x2, y2] = bezier(String(v[k]));
    if (s.role !== "exit" && x1 >= 0.3 && y1 <= 0.05 && x2 >= 0.75 && y2 >= 0.95)
      add({ level: "warn", tag: "Easing", title: `${s.label} uses ease-in`, body: "Never use ease-in for UI: it starts slowly at the exact moment the user is watching, so the same 300ms feels slower than ease-out. Entrances should ease out.", fix: { key: k, value: EMIL_EASE_OUT, label: "Use ease-out (0.23, 1, 0.32, 1)" } });
    else if ((x1 === 0.25 && y1 === 0.1 && x2 === 0.25 && y2 === 1) || (x1 === 0 && y1 === 0 && x2 === 0.58 && y2 === 1))
      add({ level: "tip", tag: "Easing", title: `${s.label} is a built-in CSS curve`, body: "The built-in easings are too weak to feel intentional. Use a stronger custom curve.", fix: { key: k, value: EMIL_EASE_OUT, label: "Use (0.23, 1, 0.32, 1)" } });
  }

  /* ---- motion values ---- */
  for (const [k, s] of specs) {
    if (s.role === "scaleFrom" && Number(v[k]) < 0.9)
      add({ level: "warn", tag: "Motion", title: `${s.label}: scale(${v[k]}) is too small a start`, body: "Nothing in the real world appears from nothing. Start entrances at scale 0.9–0.97 combined with opacity.", fix: { key: k, value: 0.95, label: "Start at 0.95" } });
    if (s.role === "bounce" && Number(v[k]) > 0.3)
      add({ level: "tip", tag: "Motion", title: `${s.label}: ${v[k]} is a lot of bounce`, body: "Keep bounce subtle (0.1–0.3) and save it for playful moments or drag-to-dismiss.", fix: { key: k, value: 0.2, label: "Set 0.2" } });
    if (s.role === "blur" && Number(v[k]) > 20)
      add({ level: "warn", tag: "Performance", title: `${s.label}: ${v[k]}px blur`, body: "Keep blur under 20px. A backdrop blur re-samples everything behind it every frame it's on screen — heavy on phones, and worse in Safari.", fix: { key: k, value: 16, label: "Set 16px" } });
  }

  /* ---- behaviour ---- */
  const { trigger, frequency } = a.behavior;
  if ((frequency === "frequent" || frequency === "constant") && ["interaction", "hover", "state"].includes(trigger))
    add({ level: "tip", tag: "Behaviour", title: "People will see this tens of times a day", body: "The more often an animation plays, the faster and quieter it should be. At 100+ times a day, don't animate at all." });
  if (trigger === "hover" || a.hover === "ungated")
    if (a.hover !== "gated")
      add({ level: "tip", tag: "Behaviour", title: "Hover isn't gated to real pointers", body: "Touch devices fire hover on tap. Gate hover animations so phones and tablets don't get false positives.", code: `@media (hover: hover) and (pointer: fine) {\n  .card:hover { transform: scale(1.02); }\n}` });
  if (a.keyboard)
    add({ level: "warn", tag: "Behaviour", title: "Animates a keyboard-initiated action", body: `${a.keyboard} Never animate keyboard-initiated actions — they repeat hundreds of times a day and animation makes them feel delayed.` });

  /* ---- performance ---- */
  const seen = new Set<string>();
  for (const d of devices) {
    const p = perf[d.id];
    if (!p) continue;
    const L = deviceLoad(p, d, ctx.hostTflops);
    if (L.gpu != null && L.gpu > 0.75) {
      const dprParam = specs.find(([, s]) => s.role === "dpr");
      const resParam = specs.find(([, s]) => s.role === "resolution");
      const fix = dprParam && Number(v[dprParam[0]]) > 1.5 ? { key: dprParam[0], value: 1.5, label: "Cap DPR at 1.5" } : resParam && Number(v[resParam[0]]) > 0.6 ? { key: resParam[0], value: 0.6, label: "Render at 60%" } : undefined;
      add({
        level: L.gpu > 1 ? "error" : "warn",
        tag: "Performance",
        title: `${L.gpu > 1 ? "Over" : "Close to"} the GPU frame budget on ${d.name}`,
        body: `≈${L.gpuMs!.toFixed(1)}ms of GPU per frame against a ${L.budget.toFixed(1)}ms budget at ${d.hz}Hz. Fill rate scales with pixels: capping the pixel ratio, rendering the heavy pass at lower resolution or pausing off-screen work buys the most.`,
        fix,
      });
    }
    if (L.main > 1)
      add({ level: "warn", tag: "Performance", title: `Main thread over budget on ${d.name}`, body: `${L.mainMs.toFixed(1)}ms of script, style, layout and paint per frame (budget ${L.budget.toFixed(1)}ms). Measured on this machine.` });
    // 3s of history first, so a page's loading burst isn't reported as jank
    if (p.dropped > 0.1 && p.history.length >= 6 && !seen.has("drop")) {
      seen.add("drop");
      add({ level: "warn", tag: "Performance", title: `Dropping ${Math.round(p.dropped * 100)}% of frames here`, body: "Frames are arriving late on this machine already; slower devices will stutter more." });
    }
    for (const kind of ["layout", "paint"] as const) {
      const hot = p.dom.filter((x) => x.kind === kind && x.perSec >= 20);
      if (!hot.length || seen.has(kind)) continue;
      seen.add(kind);
      const props = [...new Set(hot.map((x) => x.prop))].join(", ");
      add(
        kind === "layout"
          ? { level: "warn", tag: "Performance", title: `Animates layout properties: ${props}`, body: "Every frame re-runs layout, paint and composite. Only transform and opacity skip straight to the GPU — use scale/translate, or clip-path for reveals." }
          : { level: "tip", tag: "Performance", title: `Repaints every frame: ${props}`, body: "These properties repaint (SVG attributes, colours, shadows, filters). Fine at this size; for big surfaces move the motion to transform/opacity and keep blur under 20px — it's expensive, especially in Safari." },
      );
    }
    if (p.gpuKind === "webgl-untimed" && !seen.has("untimed")) {
      seen.add("untimed");
      add({ level: "tip", tag: "Performance", title: "This browser hides WebGL GPU timing", body: "EXT_disjoint_timer_query_webgl2 isn't exposed here, so the GPU column is empty. Chrome on desktop exposes it." });
    }
  }
  if (!ctx.nativeDpr)
    add({ level: "tip", tag: "Performance", title: "Rendering at this screen's pixel ratio", body: "GPU numbers are closest to the device when canvases render at its pixel ratio (@3x iPhone, @2x iPad/Mac).", action: "nativeDpr" });

  if (!out.some((s) => s.tag === "Timing" || s.tag === "Easing") && specs.some(([, s]) => s.type === "easing" || (s.type === "number" && s.unit === "ms")))
    add({ level: "pass", tag: "Timing", title: "Timing and easing follow the guidelines", body: "Durations, curves and exit speeds are within Emil Kowalski's ranges." });

  const order: Suggestion["tag"][] = ["Reduced motion", "Performance", "Timing", "Easing", "Motion", "Behaviour"];
  const rank: Record<Level, number> = { error: 0, warn: 1, tip: 2, pass: 3 };
  return out.sort((x, y) => (x.tag === "Reduced motion" ? -1 : 0) - (y.tag === "Reduced motion" ? -1 : 0) || rank[x.level] - rank[y.level] || order.indexOf(x.tag) - order.indexOf(y.tag));
}
