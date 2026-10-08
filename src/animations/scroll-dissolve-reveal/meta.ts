import type { AnimMeta } from "../../registry";
import { params } from "./params";

const photos = ["Latte", "Pralines", "Kaju katli", "Bowl", "Cake"];

export default {
  name: "Scroll Dissolve Reveal",
  category: "Cards & Reveals",
  tech: ["React Three Fiber", "GLSL", "Sobel edges", "Motion useScroll"],
  blurb: "VengeanceUI's scroll reveal: the front photo burns away from the middle along noisy edges, the one behind lights up from a dark line drawing.",
  source: "VengeanceUI (github.com/Ashutoshx7/VengeanceUI), components/ui/scroll-dissolve-reveal.tsx",
  behavior: { trigger: "gesture", frequency: "occasional" },
  reducedMotion: "partial",
  reducedMotionNote: "The demo sweep stops under reduced motion; scrolling it yourself still scrubs the dissolve, since you are driving it.",
  deps: ["react", "three", "@react-three/fiber", "@react-three/drei", "motion"],
  layout: "fill",
  poster: { at: 1350, y: 0.5 },
  assets: ["latte-surface.jpg", "pralines.jpg", "kaju-katli.jpg", "photo-1512621776951-a57141f2eefd.jpg", "photo-1578985545062-69928b1d9587.jpg"].map((f) => `/anim/swiggy-home/img/${f}`),
  load: () => import("./index"),
  params,
  schema: {
    front: { type: "select", label: "Front photo", group: "Photos", options: photos },
    back: { type: "select", label: "Revealed photo", group: "Photos", options: photos },
    autoplay: { type: "boolean", label: "Autoplay sweep", group: "Demo", hint: "Scrolls down and back on its own; scroll it yourself and it waits for you." },
    sweepMs: { type: "number", label: "Sweep", group: "Demo", min: 800, max: 8000, step: 100, unit: "ms" },
    holdMs: { type: "number", label: "Hold", group: "Demo", min: 0, max: 5000, step: 100, unit: "ms" },
  },
} satisfies Omit<AnimMeta, "id">;
