import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "99 Store Cards",
  tech: ["React", "Scroll snap", "CSS transitions"],
  blurb: "Meals at ₹99 with free delivery: dish cards with an add button, a snapping row on phones and four across from 768px.",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "The add button doesn't sink when pressed.",
  load: () => import("./index"),
  assets: assets("img/photo-1694849789325-914b71ab4075.jpg", "img/photo-1668236543090-82eba5ee5976.jpg", "img/photo-1589301760014-d929f3979dbc.jpg"),
  params,
  schema: {
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
