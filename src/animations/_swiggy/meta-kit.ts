// What every Swiggy App library item's meta.ts shares. Strings and types only: meta files load with the engine.
// Like meta.ts itself, it stays out of exports.
import type { AnimMeta } from "../../registry"

const FONTS = ["Gilroy-Medium.woff2", "Gilroy-SemiBold.woff2", "Gilroy-Bold.woff2", "Gilroy-ExtraBold.woff2", "i7dPIFZ9Zz-WBtRtedDbUEY.ttf"].map((f) => `fonts/${f}`)

/** An item's files for export: the images it shows, plus the fonts every Swiggy component uses. */
export const assets = (...files: string[]) => [...files, ...FONTS].map((f) => `/anim/swiggy-home/${f}`)

export const swiggy = {
  category: "Swiggy App",
  brand: "Swiggy",
  source: "Desktop/swiggy (Figma Make), split into components here",
  deps: ["react", "lucide-react"],
  includes: ["_swiggy", "_skeleton"],
  layout: "fill",
  ui: true,
} satisfies Partial<AnimMeta>

/** The motion tokens most components expose (see _swiggy/motion.ts). */
export const SLIDE_SCHEMA = {
  slideMs: { type: "number", label: "Slide", group: "Timing", min: 0, max: 800, step: 10, unit: "ms", role: "ui", hint: "How long an indicator takes to move to the new choice." },
  slideEase: { type: "easing", label: "Slide easing", group: "Timing", role: "ui" },
} satisfies AnimMeta["schema"]
export const PRESS_SCHEMA = {
  pressScale: { type: "number", label: "Press scale", group: "Press", min: 0.9, max: 1, step: 0.005, role: "scaleFrom", hint: "How far a card or button sinks while pressed (Emil: 0.95–0.98)." },
  pressMs: { type: "number", label: "Press", group: "Press", min: 0, max: 400, step: 10, unit: "ms", role: "press" },
} satisfies AnimMeta["schema"]
