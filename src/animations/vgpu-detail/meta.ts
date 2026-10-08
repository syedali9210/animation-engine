import type { AnimMeta } from "../../registry";
import { params } from "./params";

export default {
  name: "vgpu Detail Maps",
  poster: { at: 3000 },
  category: "Shaders & GPU",
  tech: ["WebGPU", "WGSL", "vgpu", "Procedural"],
  blurb: "The WGSL that bakes the coins' scratches, grime, fingerprints and the notes' paper fibre — running live on WebGPU.",
  source: "Desktop/experiment animation/motiscope-output/webgl/vgpu/detail.wgsl (+ @vgpu/wgsl-std)",
  behavior: { trigger: "ambient", frequency: "rare" },
  reducedMotion: "full",
  reducedMotionNote: "The drift stops and the field is drawn once per change instead of every frame.",
  deps: ["react"],
  layout: "fill",
  load: () => import("./index"),
  params,
  schema: {
    kind: { type: "select", label: "Surface", group: "Field", options: ["metal", "paper"] },
    channel: { type: "select", label: "Channel", group: "Field", options: ["Composite", "R", "G", "B", "A"], hint: "Metal: R scratches · G grime · B oil · A pits. Paper: R fibre · G formation · B soil · A crumple." },
    seed: { type: "number", label: "Seed", group: "Field", min: 0, max: 50, step: 0.1 },
    zoom: { type: "number", label: "Zoom", group: "Field", min: 0.25, max: 6, step: 0.05 },
    contrast: { type: "number", label: "Contrast", group: "Color", min: 0.5, max: 4, step: 0.05 },
    low: { type: "color", label: "Low", group: "Color" },
    high: { type: "color", label: "High", group: "Color" },
    animate: { type: "boolean", label: "Drift", group: "Motion" },
    drift: { type: "number", label: "Drift speed", group: "Motion", min: 0, max: 0.2, step: 0.005, unit: "uv/s" },
    resolution: { type: "number", label: "Render scale", group: "Performance", min: 0.25, max: 1, step: 0.05, role: "resolution", hint: "Cost scales with pixels: 0.5 is a quarter of the work." },
  },
} satisfies Omit<AnimMeta, "id">;
