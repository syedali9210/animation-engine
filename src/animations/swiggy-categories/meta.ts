import type { AnimMeta } from "../../registry"
import { SLIDE_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Category Tabs",
  poster: { at: 1200, y: 0.5 },
  tech: ["React", "clip-path", "CSS transitions"],
  blurb: "ALL / STORE / OFFERS / BOLT / EATRIGHT, all fitting the width: dark on the hero, light in the sticky header, with an underline that slides to the chosen tab.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The underline jumps to the chosen tab instead of sliding; the label colours still fade.",
  load: () => import("./index"),
  assets: assets(),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Moves through the categories on a loop." },
    cycleMs: { type: "number", label: "Switch every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    ...SLIDE_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
