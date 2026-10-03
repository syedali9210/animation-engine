import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Maze Walk",
  category: "Characters",
  tech: ["React", "SVG", "rAF", "Isometric"],
  blurb: "A pixel pet forever pacing an isometric maze, with a cursor spotlight that lights the path edges.",
  source: "Desktop/animations/src/animations/pet-buddy-hero/PetBuddyPathHero.tsx (portfolio hero)",
  behavior: { trigger: "ambient", frequency: "constant" },
  reducedMotion: "full",
  reducedMotionNote: "The pet is parked on the path instead of walking; the cursor spotlight still works.",
  deps: ["react"],
  load: () => import("./index"),
  params,
  schema: {
    speed: { type: "number", label: "Walk speed", group: "Motion", min: 10, max: 400, unit: "px/s" },
    pauseMs: { type: "number", label: "Pause at ends", group: "Motion", min: 0, max: 3000, step: 50, unit: "ms" },
    stepMs: { type: "number", label: "Step cadence", group: "Motion", min: 40, max: 500, step: 5, unit: "ms" },
    jog: { type: "number", label: "Leg swing", group: "Motion", min: 0, max: 30 },
    fps: { type: "number", label: "Arcade frame rate", group: "Motion", min: 4, max: 60, unit: "fps", hint: "Renders on a stepped tick, like a sprite." },
    scale: { type: "number", label: "Pet scale", group: "Look", min: 0.1, max: 0.5, step: 0.01 },
    spotRadius: { type: "number", label: "Spotlight radius", group: "Look", min: 30, max: 250 },
    glow: { type: "color", label: "Spotlight edge", group: "Color" },
    body: { type: "color", label: "Body", group: "Color" },
    highlight: { type: "color", label: "Highlight", group: "Color" },
    shade: { type: "color", label: "Shade", group: "Color" },
    shadeDark: { type: "color", label: "Deep shade", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
