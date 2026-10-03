import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Modal",
  category: "UI Patterns",
  tech: ["React", "CSS transitions", "Skeleton"],
  blurb: "Centred dialog that scales in from 0.96 and docks to the bottom edge on phones.",
  source: "Built for the engine (Emil Kowalski's modal guidance)",
  behavior: { trigger: "state", frequency: "occasional" },
  reducedMotion: "full",
  reducedMotionNote: "Scale and travel are dropped; the dialog and backdrop only fade.",
  ui: true,
  layout: "fill",
  deps: ["react"],
  includes: ["_skeleton"],
  load: () => import("./index"),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo" },
    intervalMs: { type: "number", label: "Open/close cycle", group: "Demo", min: 1000, max: 10000, step: 100, unit: "ms" },
    enterMs: { type: "number", label: "Enter", group: "Timing", min: 60, max: 1000, step: 10, unit: "ms", role: "enter", limit: 500 },
    exitMs: { type: "number", label: "Exit", group: "Timing", min: 40, max: 1000, step: 10, unit: "ms", role: "exit", limit: 500 },
    easing: { type: "easing", label: "Easing", group: "Timing", role: "enter" },
    scaleFrom: { type: "number", label: "Scale from", group: "Motion", min: 0, max: 1, step: 0.01, role: "scaleFrom" },
    width: { type: "number", label: "Width", group: "Shape", min: 260, max: 720, unit: "px" },
    radius: { type: "number", label: "Radius", group: "Shape", min: 0, max: 36, unit: "px" },
    backdrop: { type: "number", label: "Backdrop", group: "Shape", min: 0, max: 0.9, step: 0.05 },
    blur: { type: "number", label: "Backdrop blur", group: "Performance", min: 0, max: 40, unit: "px", role: "blur", hint: "Blur re-samples everything behind it every frame — heavy on phones, worse in Safari. Keep it under 20px." },
    phoneAs: { type: "select", label: "Below 640px", group: "Breakpoints", options: ["docked", "centred"] },
    shimmer: { type: "select", label: "Skeleton shimmer", group: "Performance", options: ["transform", "background", "off"] },
  },
} satisfies Omit<AnimMeta, "id">;
