import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "provider-guard Launch",
  poster: { at: 37800 },
  category: "Launch films",
  tech: ["React", "Geist", "Deterministic timeline", "provider-guard Studio styles"],
  blurb:
    "A 46 s launch film for provider-guard, cut like the SaaS launch films: a typed hook among call fragments, the number from the issue, a reveal on black, the catch side by side with its checks, the Studio's own timeline and feed under a dolly, a typed npm install. Export it from the Studio as a component filling a 16:9 frame.",
  source: "Desktop/Vercel PRD (the Studio's stylesheet, chips and timeline markup) + the replay data from vercel/ai#20932",
  behavior: { trigger: "sequence", frequency: "rare" },
  reducedMotion: "none",
  reducedMotionNote: "It's a film: it plays as cut. Export it as a video for places that respect reduced motion.",
  layout: "fill",
  deps: ["react"],
  includes: ["_film"],
  load: () => import("./index"),
  params,
  schema: {},
} satisfies Omit<AnimMeta, "id">;
