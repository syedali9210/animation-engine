import type { AnimMeta } from "../../registry"
import { SLIDE_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Section Selector",
  tech: ["React", "SVG", "CSS transitions"],
  blurb: "Food / Instamart / Dineout / Scenes as folder tabs on the hero; the chosen tab flares into the panel below on both sides and slides to a new section.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The lit tab jumps to the new section instead of sliding; the labels and the resting tabs still fade.",
  load: () => import("./index"),
  assets: assets("service-food-v2.png"),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Moves through the sections on a loop." },
    cycleMs: { type: "number", label: "Switch every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    ...SLIDE_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
