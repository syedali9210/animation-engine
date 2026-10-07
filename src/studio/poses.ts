// Mockup studio — camera angles for stills, and the moves a video makes from them.
// A pose turns the device (yaw/pitch/roll), places the camera (elevation, azimuth, lens) and frames it (zoom, where 1
// fills the frame with a margin). Moves follow TASTE's grammar: arrivals ease out (expo), sweeps ease in-out (sine),
// loops are periodic so the last frame meets the first, and nothing bobs.
import type { DeviceId } from "../devices"

export type Pose = {
  yaw: number
  pitch: number
  roll: number
  /** camera height above the device, degrees */
  elev: number
  /** camera around the device, degrees */
  azim: number
  /** vertical field of view, degrees: low is a long lens, flatter perspective */
  fov: number
  zoom: number
  /** how far the device floats above the floor its shadow falls on, pt */
  lift: number
  /** fraction of the frame to shift the device up (+) or down */
  rise: number
}

export const BASE: Pose = { yaw: 0, pitch: 0, roll: 0, elev: 6, azim: 0, fov: 26, zoom: 1, lift: 50, rise: 0 }

export type AngleId = "front" | "hero" | "heroLeft" | "tilt" | "float" | "flat" | "low" | "side"

export const ANGLES: { id: AngleId; name: string; pose: Partial<Pose>; mac?: Partial<Pose> }[] = [
  { id: "front", name: "Front", pose: { elev: 4 }, mac: { elev: 14 } },
  { id: "hero", name: "Three-quarter", pose: { yaw: -26, elev: 9, roll: 0 }, mac: { yaw: -24, elev: 18 } },
  { id: "heroLeft", name: "Three-quarter left", pose: { yaw: 26, elev: 9 }, mac: { yaw: 24, elev: 18 } },
  { id: "tilt", name: "Tilted back", pose: { pitch: -20, yaw: -12, elev: 24 }, mac: { yaw: -10, elev: 32 } },
  { id: "float", name: "Floating", pose: { yaw: -20, pitch: -12, roll: 8, elev: 16, lift: 200 }, mac: { yaw: -20, roll: 4, elev: 24, lift: 120 } },
  { id: "flat", name: "Flat lay", pose: { pitch: -90, roll: -16, elev: 62, lift: 0, fov: 22 }, mac: { yaw: -18, elev: 64, fov: 22 } },
  { id: "low", name: "Low angle", pose: { yaw: 18, pitch: 6, elev: -6, fov: 30 }, mac: { yaw: 16, elev: 6, fov: 30 } },
  { id: "side", name: "Side", pose: { yaw: -58, elev: 7 }, mac: { yaw: -52, elev: 16 } },
]

export function angle(id: AngleId, device: DeviceId): Pose {
  const a = ANGLES.find((x) => x.id === id) ?? ANGLES[0]
  return { ...BASE, ...(device === "macbook" ? { lift: 0, ...a.mac } : a.pose) }
}

/* ---------------- moves ---------------- */

export type MotionId = "still" | "reveal" | "orbit" | "sway" | "push" | "rise"

export const MOTIONS: { id: MotionId; name: string; hint: string; loops?: boolean }[] = [
  { id: "still", name: "Still", hint: "The device holds the shot; only the screen moves." },
  { id: "reveal", name: "Reveal", hint: "Turns in from −40° and settles on the shot (1.2s), then drifts slowly." },
  { id: "orbit", name: "Orbit", hint: "The camera sweeps from one side of the shot to the other." },
  { id: "sway", name: "Sway", hint: "A slow turn either side of the shot. Loops seamlessly.", loops: true },
  { id: "push", name: "Push in", hint: "The camera moves in towards the screen." },
  { id: "rise", name: "Rise", hint: "Comes up from below the frame and settles (1.1s), then holds." },
]

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x))
const sineInOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x)
const mix = (a: Pose, b: Pose, k: number): Pose => Object.fromEntries(Object.keys(a).map((key) => [key, a[key as keyof Pose] + (b[key as keyof Pose] - a[key as keyof Pose]) * k])) as Pose

/** Where the shot is at `t` seconds into a `dur`-second video that starts from pose `p`. */
export function move(id: MotionId, p: Pose, t: number, dur: number): Pose {
  const u = clamp(t / dur)
  switch (id) {
    case "reveal": {
      const k = expoOut(clamp(t / 1.2))
      const from = { ...p, yaw: p.yaw - 40, pitch: p.pitch + 10, rise: p.rise - 0.04, zoom: p.zoom * 0.92 }
      const drift = t > 1.2 ? 3 * Math.sin((2 * Math.PI * (t - 1.2)) / 9) : 0 // slow, small, after it lands
      return { ...mix(from, p, k), yaw: mix(from, p, k).yaw + drift }
    }
    case "orbit":
      return { ...p, azim: p.azim - 28 + 56 * sineInOut(u) }
    case "sway":
      return { ...p, yaw: p.yaw + 18 * Math.sin(2 * Math.PI * u) }
    case "push":
      return { ...p, zoom: p.zoom * (1 + 0.45 * sineInOut(u)), yaw: p.yaw * (1 - 0.35 * sineInOut(u)) }
    case "rise": {
      const k = expoOut(clamp(t / 1.1))
      return { ...p, rise: p.rise - 0.55 * (1 - k), pitch: p.pitch + 14 * (1 - k), yaw: p.yaw - 10 * (1 - k) }
    }
    default:
      return p
  }
}
