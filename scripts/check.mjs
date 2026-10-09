// Smallest check that fails if the suggestion rules or the GPU-load math break.
// Run: npm run check   (Node 22.6+ strips the TypeScript types from suggest.ts)
import assert from "node:assert/strict";
import { deviceLoad, suggest, bezier, EMIL_EASE_OUT } from "../src/suggest.ts";

const iphone = { id: "iphone", name: "iPhone 16 Pro", w: 402, h: 874, dpr: 3, hz: 120, chip: "", tflops: 2.3, rotates: true };
const meta = (over = {}) => ({
  id: "t", name: "T", category: "UI Patterns", tech: ["React", "Motion"], blurb: "", source: "",
  behavior: { trigger: "state", frequency: "occasional" }, reducedMotion: "full", reducedMotionNote: "",
  ui: true, params: {}, schema: {}, ...over,
});
const perf = (over = {}) => ({ fps: 120, interval: 8.3, dropped: 0, workMs: 1, workP95: 2, jsMs: 0, gpuMs: null, gpuP95: null, gpuKind: null, canvasPx: 0, dom: [], history: [], ...over });
const ctx = { reduce: false, nativeDpr: true, hostTflops: 4 };
const titles = (list) => list.map((s) => `${s.level}:${s.title}`);

// GPU scales host -> device by throughput: 4.6ms on a 4 TFLOPS host = 8ms on a 2.3 TFLOPS phone
const L = deviceLoad(perf({ gpuMs: 4.6 }), iphone, 4);
assert.equal(L.gpuMs.toFixed(1), "8.0");
assert.equal(L.budget.toFixed(2), "8.33");

assert.deepEqual(bezier("cubic-bezier(0.23, 1, 0.32, 1)"), [0.23, 1, 0.32, 1]);

// reduced motion is always the first card, and "none" is an error
let s = suggest(meta({ reducedMotion: "none" }), {}, {}, [iphone], ctx);
assert.equal(s[0].tag, "Reduced motion");
assert.equal(s[0].level, "error");

// timing / easing / scale rules, each with a one-click fix
const schema = {
  enter: { type: "number", label: "Enter", unit: "ms", role: "enter", group: "T", min: 0, max: 1000 },
  exit: { type: "number", label: "Exit", unit: "ms", role: "exit", group: "T", min: 0, max: 1000 },
  ease: { type: "easing", label: "Ease", role: "enter" },
  from: { type: "number", label: "From", role: "scaleFrom", min: 0, max: 1 },
};
s = suggest(meta({ schema }), { enter: 450, exit: 450, ease: "cubic-bezier(0.42, 0, 1, 1)", from: 0 }, {}, [iphone], ctx);
const t = titles(s);
assert.ok(t.some((x) => x.startsWith("warn:Enter: 450ms")), t.join("\n"));
assert.ok(t.some((x) => x.startsWith("tip:Exit is as slow")), t.join("\n"));
assert.equal(s.find((x) => x.title.includes("ease-in")).fix.value, EMIL_EASE_OUT);
assert.equal(s.find((x) => x.title.includes("scale(0)")).fix.value, 0.95);

// blur over 20px gets the Safari warning
s = suggest(meta({ schema: { blur: { type: "number", label: "Blur", role: "blur", min: 0, max: 48 } } }), { blur: 28 }, {}, [iphone], ctx);
assert.equal(s.find((x) => x.title.includes("28px blur")).fix.value, 16);

// over the GPU budget on the phone -> error, with the DPR cap as the fix
s = suggest(meta({ schema: { dprCap: { type: "number", label: "DPR", role: "dpr", min: 1, max: 3 } } }), { dprCap: 2 }, { iphone: perf({ gpuMs: 9 }) }, [iphone], ctx);
const gpu = s.find((x) => x.tag === "Performance");
assert.equal(gpu.level, "error");
assert.deepEqual(gpu.fix, { key: "dprCap", value: 1.5, label: "Cap DPR at 1.5" });

// layout properties animated every frame are flagged; compositor-only ones are not
s = suggest(meta(), {}, { iphone: perf({ dom: [{ kind: "layout", prop: "height", perSec: 60 }, { kind: "composite", prop: "transform", perSec: 60 }] }) }, [iphone], ctx);
assert.ok(titles(s).some((x) => x === "warn:Animates layout properties: height"));

// with reduced motion emulated, anything still travelling is called out
s = suggest(meta(), {}, { iphone: perf({ dom: [{ kind: "composite", prop: "transform", perSec: 60 }] }) }, [iphone], { ...ctx, reduce: true });
assert.ok(titles(s).some((x) => x.startsWith("warn:Still moving with reduced motion on")));

// a close-up picks among the components that have plates (the first `max`): one past them has no frame to show
const { ranked, focusOf } = await import("../src/studio/parts.ts");
const part = (i, h, key = true) => ({ i, name: `P${i}`, note: "", box: [0, i * 10, 400, h], key: key ? [0, 0, 10, 10] : null });
const report = { w: 400, h: 800, ground: "#fff", items: [part(0, 40), part(1, 60, false), part(2, 90), part(3, 700), part(4, 300)] };
assert.deepEqual(ranked(report, 3).map((p) => p.i), [2, 0, 1]); // with a key element first, then by size
assert.equal(ranked(report, 5).some((p) => p.i === 3), false); // most of the screen is a ground, not a close-up
assert.equal(focusOf({ max: 3, focus: 0 }, report).idx, 2);
assert.equal(focusOf({ max: 3, focus: 9 }, report).idx, 2); // past the end falls back to the first
assert.equal(focusOf({ max: 3, focus: 1, names: ["", "", "", ""] }, report).name, "P0");
assert.equal(focusOf({ max: 2, focus: 0, names: ["Header"] }, report).name, "Header");
assert.equal(focusOf({ max: 3, focus: 0 }, undefined), null);

console.log("check: ok");
