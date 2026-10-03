import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Nav Scrubber",
  category: "Navigation",
  tech: ["React", "CSS transitions", "Pointer capture"],
  blurb: "Section nav you scrub like a video timeline — drag, click the track or use the arrow keys.",
  source: "Desktop/animations/src/animations/scrubber-navigation (portfolio left rail)",
  behavior: { trigger: "gesture", frequency: "frequent" },
  reducedMotion: "partial",
  reducedMotionNote: "No reduced-motion handling, but the only motion is a short 300ms slide of the playhead and label that follows your own input.",
  keyboard: "Arrow keys move the playhead with the same 300ms slide.",
  ui: true,
  deps: ["react"],
  load: () => import("./index"),
  params,
  schema: {
    items: { type: "text", label: "Sections (comma separated)", group: "Content" },
    ticks: { type: "number", label: "Tick marks", group: "Content", min: 8, max: 48 },
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo" },
    intervalMs: { type: "number", label: "Step every", group: "Demo", min: 400, max: 4000, step: 50, unit: "ms" },
    moveMs: { type: "number", label: "Playhead slide", group: "Motion", min: 0, max: 800, step: 10, unit: "ms", role: "ui" },
    easing: { type: "easing", label: "Playhead easing", group: "Motion", role: "ui" },
    accent: { type: "color", label: "Playhead", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
