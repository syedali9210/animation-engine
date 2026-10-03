import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Scratch Card",
  category: "Cards & Reveals",
  tech: ["React", "Canvas 2D", "Compositing", "Pointer capture"],
  blurb: "A foil card you scratch off with a grungy brush to reveal the notch card underneath.",
  source: "Desktop/animations/src/animations/archive-scratch-card/ScratchCard.tsx (portfolio Archive tab)",
  behavior: { trigger: "gesture", frequency: "rare" },
  reducedMotion: "full",
  reducedMotionNote: "Nothing moves on its own — the scratch follows your pointer and the reveal is an opacity fade.",
  deps: ["react", "motion", "lucide-react"],
  includes: ["notch-card"],
  assets: ["/anim/scratch-card/foil-dots.png", "/anim/scratch-card/brush-grunge.png", "/anim/scratch-card/noise.png", "/anim/notch-card/avatar.jpg"],
  load: () => import("./index"),
  params,
  schema: {
    caption: { type: "text", label: "Caption", group: "Content" },
    brushSize: { type: "number", label: "Brush size", group: "Scratch", min: 20, max: 160, unit: "px" },
    grid: { type: "number", label: "Coverage grid", group: "Scratch", min: 4, max: 32, hint: "Coverage is tracked on a coarse grid instead of reading pixels.", reload: true },
    threshold: { type: "number", label: "Reveal at", group: "Scratch", min: 0.2, max: 0.95, step: 0.01, hint: "Fraction scratched before the foil fades away." },
    fadeMs: { type: "number", label: "Foil fade", group: "Motion", min: 0, max: 2000, step: 50, unit: "ms" },
    cardColor: { type: "color", label: "Card", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
