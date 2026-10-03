import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Payment Success",
  category: "Celebration",
  tech: ["React", "GSAP", "SVG", "Timeline"],
  blurb: "A coin rolls in carrying the buddy, spins up and shoots off; a second buddy celebrates with a trumpet and confetti.",
  source: "Desktop/animation/src/components/PaymentSuccessScene.tsx",
  behavior: { trigger: "sequence", frequency: "occasional" },
  reducedMotion: "none",
  reducedMotionNote: "The original GSAP timeline ignores the setting. This port adds an opt-in fallback that lands straight on the end state (toggle it below).",
  deps: ["react", "gsap"],
  load: () => import("./index"),
  params,
  schema: {
    title: { type: "text", label: "Title", group: "Content" },
    amount: { type: "text", label: "Amount", group: "Content" },
    recipient: { type: "text", label: "Recipient", group: "Content" },
    speed: { type: "number", label: "Timeline speed", group: "Motion", min: 0.25, max: 3, step: 0.05, unit: "×", reload: true },
    loop: { type: "boolean", label: "Loop", group: "Motion", reload: true },
    loopDelayMs: { type: "number", label: "Pause between loops", group: "Motion", min: 0, max: 6000, step: 100, unit: "ms", reload: true },
    confetti: { type: "number", label: "Confetti per popper", group: "Motion", min: 0, max: 60, reload: true },
    reducedMotion: { type: "boolean", label: "Reduced-motion fallback", group: "Accessibility", reload: true, hint: "Port addition: with the OS setting on, skip to the end state." },
    coinFace: { type: "color", label: "Coin face", group: "Color" },
    coinEdge: { type: "color", label: "Coin edge", group: "Color" },
    buddy: { type: "color", label: "Buddy", group: "Color" },
    buddyShade: { type: "color", label: "Buddy shade", group: "Color" },
    bgTop: { type: "color", label: "Background glow", group: "Color" },
    bgBottom: { type: "color", label: "Background", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
