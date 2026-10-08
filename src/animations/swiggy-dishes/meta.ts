import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Dish Row",
  poster: { at: 1200, y: 0.6 },
  tech: ["React", "CSS grid"],
  blurb: "“What’s on your mind?” — browse by dish. All six fit on a phone (three across, two rows), six across from 768px.",
  behavior: { trigger: "interaction", frequency: "occasional" },
  reducedMotion: "full",
  reducedMotionNote: "Dishes don't sink when pressed.",
  load: () => import("./index"),
  assets: assets("img/dishes/idli-cutout.png", "img/dishes/dosa-cutout.png", "img/dishes/vada-cutout.png", "img/dishes/bath-cutout.png", "img/dishes/tea-cutout.png", "img/dishes/biryani-cutout.png"),
  params,
  schema: {
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
