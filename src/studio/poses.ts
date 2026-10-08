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
  { id: "hero", name: "¾ right", pose: { yaw: -26, elev: 9, roll: 0 }, mac: { yaw: -24, elev: 18 } },
  { id: "heroLeft", name: "¾ left", pose: { yaw: 26, elev: 9 }, mac: { yaw: 24, elev: 18 } },
  { id: "front", name: "Front", pose: { elev: 4 }, mac: { elev: 14 } },
  { id: "side", name: "Side", pose: { yaw: -58, elev: 7 }, mac: { yaw: -52, elev: 16 } },
  { id: "tilt", name: "Tilted", pose: { pitch: -20, yaw: -12, elev: 24 }, mac: { yaw: -10, elev: 32 } },
  { id: "float", name: "Floating", pose: { yaw: -20, pitch: -12, roll: 8, elev: 16, lift: 200 }, mac: { yaw: -20, roll: 4, elev: 24, lift: 120 } },
  { id: "flat", name: "Flat lay", pose: { pitch: -90, roll: -16, elev: 62, lift: 0, fov: 22 }, mac: { yaw: -18, elev: 64, fov: 22 } },
  { id: "low", name: "Low", pose: { yaw: 18, pitch: 6, elev: -6, fov: 30 }, mac: { yaw: 16, elev: 6, fov: 30 } },
]

export function angle(id: AngleId, device: DeviceId): Pose {
  const a = ANGLES.find((x) => x.id === id) ?? ANGLES[0]
  return { ...BASE, ...(device === "macbook" ? { lift: 0, ...a.mac } : a.pose) }
}

/* ---------------- moves ---------------- */

export type MotionId = "still" | "reveal" | "spin" | "turn" | "pull" | "orbit" | "sway" | "push" | "rise" | "tour"

export const MOTIONS: { id: MotionId; name: string; hint: string; loops?: boolean }[] = [
  { id: "still", name: "Still", hint: "The device holds the shot; only the screen moves." },
  { id: "reveal", name: "Reveal", hint: "Turns in from the side and settles on the shot, then drifts slowly." },
  { id: "spin", name: "Spin in", hint: "Starts on its back and spins round to the screen, the way a keynote shows a new device." },
  { id: "turn", name: "Hero turn", hint: "One slow, continuous turn past the shot, easing in and out, the camera drifting closer." },
  { id: "pull", name: "Pull back", hint: "Starts close on the device and pulls back to the whole shot." },
  { id: "orbit", name: "Orbit", hint: "The camera sweeps from one side of the shot to the other." },
  { id: "sway", name: "Sway", hint: "A slow turn either side of the shot. Loops seamlessly.", loops: true },
  { id: "push", name: "Push in", hint: "The camera moves in towards the screen." },
  { id: "rise", name: "Rise", hint: "Comes up from below the frame and settles, then holds." },
  { id: "tour", name: "Tour", hint: "Three angles in one take: the shot, its mirror, then face-on and close." },
]

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x))
const quintOut = (x: number) => 1 - (1 - x) ** 5
const sineInOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x)
const mix = (a: Pose, b: Pose, k: number): Pose => Object.fromEntries(Object.keys(a).map((key) => [key, a[key as keyof Pose] + (b[key as keyof Pose] - a[key as keyof Pose]) * k])) as Pose
/** after a move lands: a slow, small turn, so a long take never freezes */
const drift = (t: number, from: number) => (t > from ? 3 * Math.sin((2 * Math.PI * (t - from)) / 9) : 0)

/** Where the shot is at `t` seconds into a `dur`-second video that starts from pose `p`. */
export function move(id: MotionId, p: Pose, t: number, dur: number): Pose {
  const u = clamp(t / dur)
  switch (id) {
    case "reveal": {
      const k = expoOut(clamp(t / 1.2))
      const from = { ...p, yaw: p.yaw - 40, pitch: p.pitch + 10, rise: p.rise - 0.04, zoom: p.zoom * 0.92 }
      const at = mix(from, p, k)
      return { ...at, yaw: at.yaw + drift(t, 1.2) }
    }
    case "spin": {
      // a full turn less the shot's own yaw, so it lands facing the camera the way the shot does
      const len = Math.min(2.2, dur * 0.6)
      const k = quintOut(clamp(t / len))
      const from = { ...p, yaw: p.yaw + 180, pitch: p.pitch + 6, zoom: p.zoom * 0.86, rise: p.rise - 0.03 }
      const at = mix(from, p, k)
      return { ...at, yaw: at.yaw + drift(t, len) }
    }
    case "turn": {
      const k = sineInOut(u)
      return { ...p, yaw: p.yaw - 22 + 34 * k, zoom: p.zoom * (1 + 0.1 * k) }
    }
    case "pull": {
      const k = expoOut(clamp(t / Math.min(2.6, dur * 0.8)))
      return { ...p, zoom: p.zoom * (2.1 - 1.1 * k), yaw: p.yaw + 10 * (1 - k), rise: p.rise - 0.08 * (1 - k) }
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
    case "tour": {
      // hold, glide, hold, glide, hold: each glide in-out, overlapping nothing, so every stop reads as a shot
      const mirror = { ...p, yaw: -p.yaw || 22, elev: p.elev + 4 }
      const close = { ...p, yaw: 0, pitch: p.pitch - 6, elev: p.elev + 2, zoom: p.zoom * 1.25 }
      if (u < 0.22) return p
      if (u < 0.42) return mix(p, mirror, sineInOut((u - 0.22) / 0.2))
      if (u < 0.6) return mirror
      if (u < 0.8) return mix(mirror, close, sineInOut((u - 0.6) / 0.2))
      return close
    }
    default:
      return p
  }
}
