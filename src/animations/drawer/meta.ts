import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Side Drawer",
  poster: { at: 4000, y: 0.25 },
  category: "UI Patterns",
  tech: ["React", "CSS transitions", "Skeleton"],
  blurb: "Navigation drawer on the iOS drawer curve — 85% wide on phones, fixed width on tablets and laptops.",
  source: "Built for the engine (Emil Kowalski's drawer curve)",
  behavior: { trigger: "state", frequency: "occasional" },
  reducedMotion: "full",
  reducedMotionNote: "The slide becomes an opacity fade.",
  ui: true,
  layout: "fill",
  deps: ["react"],
  includes: ["_skeleton"],
  load: () => import("./index"),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo" },
    intervalMs: { type: "number", label: "Open/close cycle", group: "Demo", min: 1000, max: 10000, step: 100, unit: "ms" },
    side: { type: "select", label: "Side", group: "Shape", options: ["left", "right"] },
    width: { type: "number", label: "Width", group: "Shape", min: 200, max: 520, unit: "px" },
    enterMs: { type: "number", label: "Enter", group: "Timing", min: 80, max: 1000, step: 10, unit: "ms", role: "enter", limit: 500 },
    exitMs: { type: "number", label: "Exit", group: "Timing", min: 60, max: 1000, step: 10, unit: "ms", role: "exit", limit: 500 },
    easing: { type: "easing", label: "Easing", group: "Timing", role: "enter" },
    backdrop: { type: "number", label: "Backdrop", group: "Shape", min: 0, max: 0.9, step: 0.05 },
    shimmer: { type: "select", label: "Skeleton shimmer", group: "Performance", options: ["transform", "background", "off"] },
  },
} satisfies Omit<AnimMeta, "id">;
