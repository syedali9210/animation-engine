import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "Info Notch Card",
  category: "Cards & Reveals",
  tech: ["React", "Motion", "Springs", "Layout animation"],
  blurb: "A MacBook notch moonlighting as a business card — hover (tap below 768px) to grow it.",
  source: "Desktop/animations/src/animations/hover-expansion-card/DynamicInfoCard.tsx",
  behavior: { trigger: "hover", frequency: "occasional" },
  reducedMotion: "none",
  reducedMotionNote: "The notch ears, padding and expanding row spring open and closed regardless of the setting.",
  hover: "ungated",
  ui: true,
  deps: ["react", "motion", "lucide-react"],
  assets: ["/anim/notch-card/avatar.jpg"],
  load: () => import("./index"),
  params,
  schema: {
    name: { type: "text", label: "Name", group: "Content" },
    role: { type: "text", label: "Title", group: "Content" },
    timeZone: { type: "select", label: "Clock time zone", group: "Content", options: ["Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "UTC"] },
    autoplay: { type: "boolean", label: "Autoplay", group: "Demo", hint: "Opens and closes on a timer; hover (or tap on phones) still works." },
    intervalMs: { type: "number", label: "Toggle every", group: "Demo", min: 800, max: 6000, step: 100, unit: "ms" },
    durationMs: { type: "number", label: "Spring duration", group: "Motion", min: 150, max: 1500, step: 10, unit: "ms", role: "enter" },
    bounce: { type: "number", label: "Spring bounce", group: "Motion", min: 0, max: 0.6, step: 0.01, role: "bounce" },
    background: { type: "color", label: "Notch", group: "Color" },
    available: { type: "color", label: "Available dot", group: "Color" },
  },
} satisfies Omit<AnimMeta, "id">;
