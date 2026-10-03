import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Popover Menu",
  category: "UI Patterns",
  tech: ["React", "CSS transitions", "Skeleton"],
  blurb: "Dropdown that grows out of its trigger, and becomes an action sheet on phones.",
  source: "Built for the engine (Emil Kowalski's origin-aware popover rule)",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The menu fades without scaling or sliding.",
  ui: true,
  layout: "fill",
  deps: ["react"],
  includes: ["_skeleton"],
  load: () => import("./index"),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo" },
    intervalMs: { type: "number", label: "Open/close cycle", group: "Demo", min: 800, max: 8000, step: 100, unit: "ms" },
    enterMs: { type: "number", label: "Enter", group: "Timing", min: 40, max: 800, step: 10, unit: "ms", role: "enter", limit: 250 },
    exitMs: { type: "number", label: "Exit", group: "Timing", min: 30, max: 800, step: 10, unit: "ms", role: "exit" },
    easing: { type: "easing", label: "Easing", group: "Timing", role: "enter" },
    scaleFrom: { type: "number", label: "Scale from", group: "Motion", min: 0, max: 1, step: 0.01, role: "scaleFrom" },
    originAware: { type: "boolean", label: "Origin-aware", group: "Motion", hint: "Scale from the trigger's corner instead of the menu's centre." },
    staggerMs: { type: "number", label: "Item stagger", group: "Motion", min: 0, max: 150, unit: "ms", role: "stagger" },
    phoneAs: { type: "select", label: "Below 640px", group: "Breakpoints", options: ["action sheet", "popover"] },
    shimmer: { type: "select", label: "Skeleton shimmer", group: "Performance", options: ["transform", "background", "off"] },
  },
} satisfies Omit<AnimMeta, "id">;
