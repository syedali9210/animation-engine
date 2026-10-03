import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Tab Hop",
  category: "Navigation",
  tech: ["React", "Motion", "SVG", "Keyframes", "Shared layout"],
  blurb: "The mascot leaps between tabs — crouch, arc, squash and stretch, dust poof on landing.",
  source: "Desktop/animations/src/animations/pet-buddy-tab-hop (portfolio design-system Tabs)",
  behavior: { trigger: "interaction", frequency: "frequent" },
  reducedMotion: "none",
  reducedMotionNote: "The hop arc, squash-stretch and sliding indicator all play regardless of the setting.",
  ui: true,
  deps: ["react", "motion"],
  load: () => import("./index"),
  params,
  schema: {
    tabs: { type: "text", label: "Tabs (comma separated)", group: "Content", reload: true },
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo" },
    intervalMs: { type: "number", label: "Hop every", group: "Demo", min: 600, max: 5000, step: 50, unit: "ms" },
    hopMs: { type: "number", label: "Hop duration", group: "Hop", min: 120, max: 1000, step: 10, unit: "ms", role: "ui" },
    hopHeight: { type: "number", label: "Hop height", group: "Hop", min: 0, max: 40, unit: "px" },
    squash: { type: "number", label: "Crouch squash", group: "Hop", min: 0.5, max: 1, step: 0.01 },
    stretch: { type: "number", label: "Air stretch", group: "Hop", min: 1, max: 1.4, step: 0.01 },
    lean: { type: "number", label: "Lean", group: "Hop", min: 0, max: 25, unit: "°" },
    indicatorMs: { type: "number", label: "Indicator slide", group: "Indicator", min: 100, max: 1000, step: 10, unit: "ms", role: "ui" },
    indicatorBounce: { type: "number", label: "Indicator bounce", group: "Indicator", min: 0, max: 0.6, step: 0.01, role: "bounce" },
    blinkMs: { type: "number", label: "Blink every", group: "Character", min: 800, max: 8000, step: 100, unit: "ms" },
    body: { type: "color", label: "Body", group: "Color" },
    highlight: { type: "color", label: "Highlight", group: "Color" },
    shade: { type: "color", label: "Shade", group: "Color" },
    shadeDark: { type: "color", label: "Deep shade", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
