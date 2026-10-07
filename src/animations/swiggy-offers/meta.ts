import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Offer Cards",
  tech: ["React", "Scroll snap", "CSS transitions"],
  blurb: "The four pink offer cards: a snapping row showing two whole cards and a peek of the next on any phone, four across from 768px.",
  behavior: { trigger: "interaction", frequency: "occasional" },
  reducedMotion: "full",
  reducedMotionNote: "Cards don't sink when pressed.",
  load: () => import("./index"),
  assets: assets("img/chocolate-cupcake-cutout.png", "img/cupcake-cutout.png"),
  params,
  schema: {
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
