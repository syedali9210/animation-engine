import type { AnimMeta } from "../../registry";
import { SCREENS } from "../_film/screens";
import { params } from "./params";

export default {
  name: "Glass launch",
  poster: { at: 8200 },
  category: "Launch films",
  tech: ["React", "Deterministic timeline", "Live product screen", "CSS 3D"],
  blurb:
    "A 34 s SaaS launch film in the glass grammar: single words blurring in, a word, your icon, a word; a tunnel of live phones flown through; a progress bar; a glass orb with its check and confetti; the product tilted with a cursor; a black button turning into your accent; a spark into a three-word line; the end card.",
  source: "Built for the engine, from the LangEase launch film's structure (studied shot by shot)",
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
    words: { type: "text", label: "Opening words", group: "Story", hint: "Two words, split by |: a small one, then a huge one." },
    pair: { type: "text", label: "Word · icon · word", group: "Story", hint: "Split by |. Your icon drops in between." },
    tunnel: { type: "text", label: "Through the phones", group: "Story", hint: "Three lines, split by |." },
    progress: { type: "text", label: "Progress", group: "Story" },
    done: { type: "text", label: "Done", group: "Story" },
    every: { type: "text", label: "Among the cards", group: "Story" },
    button: { type: "text", label: "Button", group: "Ending" },
    trio: { type: "text", label: "Three words", group: "Ending" },
    url: { type: "text", label: "Address", group: "Ending" },
  },
} satisfies Omit<AnimMeta, "id">;
