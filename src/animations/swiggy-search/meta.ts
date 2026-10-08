import type { AnimMeta } from "../../registry"
import { SLIDE_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Search Bar",
  poster: { at: 1200, y: 0.53 },
  tech: ["React", "CSS transitions"],
  blurb: "Search with a suggestion that rises into place (Pizza, Biryani, Cake, Dosa), voice search, and the VEG switch.",
  behavior: { trigger: "ambient", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The suggestion swaps with a fade instead of rising, and the VEG knob jumps instead of sliding.",
  load: () => import("./index"),
  assets: assets(),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Changes the suggestion, and flips VEG every other time." },
    hintMs: { type: "number", label: "New suggestion every", group: "Demo", min: 1000, max: 8000, step: 100, unit: "ms" },
    ...SLIDE_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
