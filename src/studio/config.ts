// Studio — everything an export needs to redraw the composition on its own: the composition, and every screen and
// component in it already resolved by the engine (the export page can't see the engine's state). The engine builds
// it; the render page (render.tsx) reads it from its URL.
import type { Comp } from "./comp"
import type { FrameSpec, ScreenSpec } from "./view"

export type RenderConfig = {
  comp: Comp
  dark: boolean
  /** by device layer id */
  screens: Record<string, ScreenSpec>
  /** by "scene:layer" */
  components: Record<string, FrameSpec>
  /** seconds into the composition the capture starts at (a still is the one frame there) */
  start: number
  /** seconds the capture runs: the whole composition, or 0 for a still */
  duration: number
  /** how long every frame has been running when the capture starts, ms */
  preroll: number
  transparent: boolean
}

export type Backdrop = { id: string; name: string; css: string; dark: boolean }

/** Studio backdrops: soft sweeps the way product photos are lit, a few colour fields for social posts, and
    "transparent" for a PNG or a ProRes video with alpha. */
export const BACKDROPS: Backdrop[] = [
  { id: "studio", name: "Studio", css: "radial-gradient(120% 90% at 50% 30%, #f7f7f9 0%, #e6e6ea 55%, #d4d4da 100%)", dark: false },
  { id: "white", name: "Paper", css: "radial-gradient(130% 100% at 50% 35%, #ffffff 0%, #f4f4f6 70%, #ebebef 100%)", dark: false },
  { id: "midnight", name: "Graphite", css: "radial-gradient(110% 90% at 50% 28%, #2a2b33 0%, #15161b 55%, #0b0b0e 100%)", dark: true },
  { id: "black", name: "Onyx", css: "radial-gradient(90% 70% at 50% 18%, #1c1c1f 0%, #070708 60%, #000000 100%)", dark: true },
  { id: "sand", name: "Sand", css: "radial-gradient(120% 90% at 50% 30%, #f6efe6 0%, #e9ddcd 60%, #dccdb9 100%)", dark: false },
  { id: "iris", name: "Iris", css: "radial-gradient(120% 90% at 50% 30%, #f1f0ff 0%, #d9d8ff 55%, #b9b6f5 100%)", dark: false },
  {
    id: "aurora",
    name: "Aurora",
    css: "radial-gradient(60% 60% at 18% 22%, #b8f0dc 0%, transparent 70%), radial-gradient(55% 60% at 84% 16%, #d4c8ff 0%, transparent 70%), radial-gradient(70% 70% at 70% 92%, #b9dcff 0%, transparent 70%), #eef1fb",
    dark: false,
  },
  {
    id: "sunset",
    name: "Sunset",
    css: "radial-gradient(60% 60% at 16% 20%, #ffd6b8 0%, transparent 70%), radial-gradient(60% 60% at 86% 24%, #ffc2d4 0%, transparent 70%), radial-gradient(70% 70% at 60% 96%, #ffe7a8 0%, transparent 70%), #fbefe9",
    dark: false,
  },
  {
    id: "ocean",
    name: "Deep sea",
    css: "radial-gradient(70% 60% at 30% 18%, #1d4f7a 0%, transparent 70%), radial-gradient(60% 60% at 82% 88%, #10325a 0%, transparent 70%), radial-gradient(120% 100% at 50% 40%, #0b1c33 0%, #050b16 100%)",
    dark: true,
  },
  {
    id: "dusk",
    name: "Dusk",
    css: "radial-gradient(70% 60% at 22% 16%, #3b2a63 0%, transparent 70%), radial-gradient(60% 60% at 84% 86%, #5a2346 0%, transparent 70%), radial-gradient(120% 100% at 50% 40%, #171126 0%, #0a0710 100%)",
    dark: true,
  },
  { id: "transparent", name: "Transparent", css: "transparent", dark: false },
]

export type SizePreset = { id: string; name: string; hint: string; w: number; h: number }

export const SIZES: SizePreset[] = [
  { id: "16x9", name: "16:9", hint: "1920 × 1080 · YouTube, Dribbble, slides", w: 1920, h: 1080 },
  { id: "16x9-4k", name: "16:9 4K", hint: "3840 × 2160", w: 3840, h: 2160 },
  { id: "4x3", name: "4:3", hint: "1600 × 1200 · Dribbble shot, Behance", w: 1600, h: 1200 },
  { id: "1x1", name: "1:1", hint: "2048 × 2048 · Instagram, LinkedIn", w: 2048, h: 2048 },
  { id: "4x5", name: "4:5", hint: "1080 × 1350 · Instagram feed", w: 1080, h: 1350 },
  { id: "9x16", name: "9:16", hint: "1080 × 1920 · Reels, Shorts, Stories", w: 1080, h: 1920 },
]
