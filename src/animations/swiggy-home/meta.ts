import type { AnimMeta } from "../../registry";
import { params } from "./params";

const IMG = [
  "chocolate-cupcake-cutout.png",
  "cupcake-cutout.png",
  "kaju-katli.jpg",
  "latte-surface.jpg",
  "pralines.jpg",
  ...["1497034825429-c343d7c6a68f", "1512621776951-a57141f2eefd", "1563379091339-03b21ab4a4f8", "1571934811356-5cc061b6821f", "1578985545062-69928b1d9587", "1589301760014-d929f3979dbc", "1630383249896-424e482df921", "1645177628172-a94c1f96e6db", "1668236543090-82eba5ee5976", "1694849789325-914b71ab4075", "1742281257687-092746ad6021"].map((id) => `photo-${id}.jpg`),
  ...["idli", "dosa", "vada", "bath", "tea", "biryani"].map((d) => `dishes/${d}-cutout.png`),
];
const FONTS = ["Gilroy-Medium.woff2", "Gilroy-SemiBold.woff2", "Gilroy-Bold.woff2", "Gilroy-ExtraBold.woff2", "i7dPIFZ9Zz-WBtRtedDbUEY.ttf"];

export default {
  name: "Swiggy Home",
  category: "Screens",
  tech: ["React", "Tailwind CSS", "CSS transitions", "Scroll-driven state"],
  blurb: "A full food-delivery home screen: the header fades in and the bottom nav slides away as you scroll. Use it as the base for the Screen builder.",
  source: "Desktop/swiggy (Figma Make)",
  behavior: { trigger: "gesture", frequency: "frequent" },
  reducedMotion: "none",
  reducedMotionNote: "The source has no reduced-motion handling: the bottom nav still slides 82px off screen and the header still fades. The engine's demo scroll jumps between stops instead of gliding.",
  ui: true,
  layout: "fill",
  deps: ["react", "lucide-react"],
  load: () => import("./index"),
  assets: ["/anim/swiggy-home/service-food-v2.png", ...IMG.map((f) => `/anim/swiggy-home/img/${f}`), ...FONTS.map((f) => `/anim/swiggy-home/fonts/${f}`)],
  params,
  schema: {
    autoplay: { type: "boolean", label: "Autoplay scroll", group: "Demo", hint: "Scrolls a screenful at a time, then back to the top. Pauses for a few seconds when you scroll it yourself." },
    stepMs: { type: "number", label: "Scroll every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    headerMs: { type: "number", label: "Sticky header fade", group: "Timing", min: 0, max: 1000, step: 10, unit: "ms", role: "ui" },
    navMs: { type: "number", label: "Bottom nav slide", group: "Timing", min: 0, max: 1000, step: 10, unit: "ms", role: "ui" },
    easing: { type: "easing", label: "Easing", group: "Timing", role: "ui" },
  },
} satisfies Omit<AnimMeta, "id">;
