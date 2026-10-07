// Mockup studio — everything an export needs to redraw the studio's shot on its own: the device, the shot, the move,
// and what's on the screen. The engine builds it; the render page (render.tsx) reads it from its URL.
import type { CSSProperties } from "react"
import type { DeviceId, Posture } from "../devices"
import type { Values } from "../registry"
import type { MotionId, Pose } from "./poses"

/** One live frame on the screen: an animation, its tuned values, and (on a built screen) its box. */
export type ScreenFrame = { fid: string; path: string; query: Record<string, string>; values: Values; box?: CSSProperties; bare: boolean }

export type RenderConfig = {
  device: DeviceId
  posture: Posture
  landscape: boolean
  finish: string
  pose: Pose
  motion: MotionId
  /** seconds */
  duration: number
  /** CSS background behind the device, or "transparent" */
  backdrop: string
  shadow: boolean
  reflections: number
  dark: boolean
  screenBg: string
  frames: ScreenFrame[]
  media?: { url: string; video: boolean }
  /** how long the screen has been running when the video starts, ms */
  preroll: number
}

export type Backdrop = { id: string; name: string; css: string; dark: boolean }

/** Studio backdrops: plain or a soft spotlight falloff. "transparent" exports a PNG with alpha. */
export const BACKDROPS: Backdrop[] = [
  { id: "studio", name: "Studio", css: "radial-gradient(120% 90% at 50% 30%, #f7f7f9 0%, #e6e6ea 55%, #d4d4da 100%)", dark: false },
  { id: "midnight", name: "Midnight", css: "radial-gradient(110% 90% at 50% 28%, #2a2b33 0%, #15161b 55%, #0b0b0e 100%)", dark: true },
  { id: "sand", name: "Sand", css: "radial-gradient(120% 90% at 50% 30%, #f6efe6 0%, #e9ddcd 60%, #dccdb9 100%)", dark: false },
  { id: "iris", name: "Iris", css: "radial-gradient(120% 90% at 50% 30%, #f1f0ff 0%, #d9d8ff 55%, #b9b6f5 100%)", dark: false },
  { id: "white", name: "White", css: "#ffffff", dark: false },
  { id: "black", name: "Black", css: "#000000", dark: true },
  { id: "transparent", name: "Transparent", css: "transparent", dark: false },
]

export type SizePreset = { id: string; name: string; w: number; h: number }

export const SIZES: SizePreset[] = [
  { id: "16x9", name: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { id: "16x9-4k", name: "16:9 · 4K", w: 3840, h: 2160 },
  { id: "1x1", name: "1:1 · 2048", w: 2048, h: 2048 },
  { id: "4x5", name: "4:5 · 1080×1350", w: 1080, h: 1350 },
  { id: "9x16", name: "9:16 · 1080×1920", w: 1080, h: 1920 },
]
