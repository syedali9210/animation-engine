import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Restaurant Feed",
  tech: ["React", "Web Animations", "CSS transitions"],
  blurb: "The restaurant feed: its heading, the filter chips and a restaurant card with offer, delivery time and a heart that pops when saved.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The heart fills without popping and the card doesn't sink when pressed.",
  load: () => import("./index"),
  assets: assets("img/photo-1578985545062-69928b1d9587.jpg"),
  params,
  schema: {
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
