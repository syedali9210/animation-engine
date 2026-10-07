import type { AnimMeta } from "../../registry"
import { PRESS_SCHEMA, SLIDE_SCHEMA, assets, swiggy } from "../_swiggy/meta-kit"
import { params } from "./params"

export default {
  ...swiggy,
  name: "Home Screen",
  order: -1,
  tech: ["React", "Tailwind CSS", "CSS transitions", "Scroll-driven state"],
  blurb: "The whole Swiggy home screen, built from the components in this group: the header fades in, the filters pin and the bottom nav slides away as you scroll. Use it as the base in the Screen builder.",
  behavior: { trigger: "gesture", frequency: "frequent" },
  reducedMotion: "full",
  reducedMotionNote: "Nothing travels: the bottom nav fades instead of sliding, tabs and pills jump to the new choice and cards don't sink when pressed, while colours and the header still fade. The demo scroll jumps between stops.",
  load: () => import("./index"),
  assets: assets(
    "service-food-v2.png",
    "img/chocolate-cupcake-cutout.png",
    "img/cupcake-cutout.png",
    "img/kaju-katli.jpg",
    "img/latte-surface.jpg",
    "img/pralines.jpg",
    ...["1497034825429-c343d7c6a68f", "1512621776951-a57141f2eefd", "1578985545062-69928b1d9587", "1589301760014-d929f3979dbc", "1668236543090-82eba5ee5976", "1694849789325-914b71ab4075", "1742281257687-092746ad6021"].map((id) => `img/photo-${id}.jpg`),
    ...["idli", "dosa", "vada", "bath", "tea", "biryani"].map((d) => `img/dishes/${d}-cutout.png`),
  ),
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay scroll", group: "Demo", hint: "Scrolls a screenful at a time, then back to the top. Pauses for a few seconds when you scroll it yourself." },
    stepMs: { type: "number", label: "Scroll every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    headerMs: { type: "number", label: "Sticky header fade", group: "Scroll", min: 0, max: 1000, step: 10, unit: "ms", role: "ui" },
    navMs: { type: "number", label: "Bottom nav slide", group: "Scroll", min: 0, max: 1000, step: 10, unit: "ms", role: "ui" },
    easing: { type: "easing", label: "Scroll easing", group: "Scroll", role: "ui" },
    ...SLIDE_SCHEMA,
    ...PRESS_SCHEMA,
  },
} satisfies Omit<AnimMeta, "id">
