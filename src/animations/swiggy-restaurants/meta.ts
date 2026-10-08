import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, SLIDE_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Restaurant Cards",
  poster: { at: 1200, y: 0.5 },
  tech: ["React", "Web Animations", "Scroll snap", "CSS transitions"],
  blurb: "Top-rated restaurant cards under the TOP RATED / FOOD IN 15 MINS switch: the pill slides, a saved heart pops, cards sink when pressed.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The pill jumps instead of sliding, the heart fills without popping and cards don't sink when pressed.",
  load: () => import("./index"),
  assets: assets("img/pralines.jpg", "img/kaju-katli.jpg", "img/photo-1512621776951-a57141f2eefd.jpg", "img/photo-1497034825429-c343d7c6a68f.jpg"),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Flips the switch and saves / unsaves a restaurant, in turns." },
    cycleMs: { type: "number", label: "Step every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    ...SLIDE_SCHEMA,
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
