import type { AnimMeta } from "../../registry";
import { SCREENS } from "../_film/screens";
import { params } from "./params";

export default {
  name: "Prompt launch",
  poster: { at: 12800 },
  category: "Launch films",
  tech: ["React", "Deterministic timeline", "Live product screen", "Cursor choreography"],
  blurb:
    "A 31 s SaaS launch film in the prompt grammar: a pill clicked open into a prompt box that types, files attached, sent; status words in italic; the result pulling back into a window; macro shots of the toolbar with a hand clicking; a comment typed; the plan ticking off; the screen changing before your eyes; a collage; the end card.",
  source: "Built for the engine, from the Claude Design launch film's structure (studied shot by shot)",
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
    prompt: { type: "text", label: "Prompt", group: "Story" },
    files: { type: "text", label: "Attachments", group: "Story", hint: "Split by |." },
    status: { type: "text", label: "Status words", group: "Story", hint: "Three, split by |. Shown with an ellipsis." },
    comment: { type: "text", label: "Comment", group: "Story" },
    plan: { type: "text", label: "Plan", group: "Story", hint: "Four steps, split by |." },
    change: { type: "text", label: "While it changes", group: "Story", hint: "One status word, while the screen turns dark." },
    collage: { type: "text", label: "Under the collage", group: "Story" },
    tagline: { type: "text", label: "Tagline", group: "Ending" },
    url: { type: "text", label: "Address", group: "Ending" },
  },
} satisfies Omit<AnimMeta, "id">;
