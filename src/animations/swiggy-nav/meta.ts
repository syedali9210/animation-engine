import type { AnimMeta } from "../../registry"
import { assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Bottom Nav",
  poster: { at: 1200, y: 1 },
  tech: ["React", "CSS transitions"],
  blurb: "Food / Bolt / 99 store / EatRight / Reorder, docked above the home indicator; it slides away while you scroll the feed.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The nav fades out instead of sliding off the bottom edge.",
  load: () => import("./index"),
  assets: assets(),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Moves through the tabs, and hides the bar every fourth step the way scrolling does." },
    cycleMs: { type: "number", label: "Step every", group: "Demo", min: 600, max: 6000, step: 100, unit: "ms" },
    hideMs: { type: "number", label: "Hide / show", group: "Timing", min: 0, max: 1000, step: 10, unit: "ms", role: "ui" },
    easing: { type: "easing", label: "Easing", group: "Timing", role: "ui" },
  },
} satisfies Omit<AnimMeta, "id">
