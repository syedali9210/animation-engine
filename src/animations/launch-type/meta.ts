import type { AnimMeta } from "../../registry";
import { SCREENS } from "../_film/screens";
import { params } from "./params";

export default {
  name: "Typed launch",
  poster: { at: 12600 },
  category: "Launch films",
  tech: ["React", "Deterministic timeline", "Live product screen", "CSS 3D"],
  blurb:
    "A 40 s SaaS launch film in the typed-hook grammar: your product's live screen in fragments around a typed hook that edits itself, a huge word, the reveal on your accent, the screen tilted under a dolly, a split screen whose checklist ticks, a keyword in braces, a macro, a typed CTA.",
  source: "Built for the engine, from the Numtera launch film's structure (studied shot by shot)",
  behavior: { trigger: "sequence", frequency: "rare" },
  reducedMotion: "none",
  reducedMotionNote: "It's a film: it plays as cut. Export it as a video for places that respect reduced motion.",
  layout: "fill",
  deps: ["react"],
  includes: ["_film"],
  load: () => import("./index"),
  params,
  schema: {
    screen: { type: "select", label: "Product screen", group: "Product", options: SCREENS },
    name: { type: "text", label: "Name", group: "Product" },
    accent: { type: "color", label: "Accent", group: "Product" },
    hook: { type: "text", label: "Hook", group: "Story", hint: "Typed first. [old/new] is selected and retyped." },
    question: { type: "text", label: "Question", group: "Story" },
    stop: { type: "text", label: "Stop line", group: "Story", hint: "Its first word is thrown in huge." },
    tagline: { type: "text", label: "Tagline", group: "Story", hint: "*word* takes the accent." },
    feature: { type: "text", label: "Beside the phone", group: "Story" },
    checks: { type: "text", label: "Checklist", group: "Story", hint: "Four steps, split by |." },
    brace: { type: "text", label: "Brace line", group: "Story", hint: "{word} goes in braces, then becomes a progress bar." },
    big: { type: "text", label: "Big line", group: "Story", hint: "Its first word starts huge." },
    they: { type: "text", label: "They…", group: "Ending" },
    we: { type: "text", label: "We…", group: "Ending" },
    cta: { type: "text", label: "Call to action", group: "Ending" },
    url: { type: "text", label: "Address", group: "Ending" },
  },
} satisfies Omit<AnimMeta, "id">;
