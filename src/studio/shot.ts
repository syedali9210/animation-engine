// Mockup studio — the shot the studio is set up for: finish, angle (plus any drag on top of it), lens, backdrop and the
// move a video makes. The engine keeps it between visits.
import type { DeviceId } from "../devices"
import { BACKDROPS, SIZES } from "./config"
import { FINISHES } from "./finishes"
import { angle, type AngleId, type MotionId, type Pose } from "./poses"

export type Shot = {
  finish: Partial<Record<DeviceId, string>>
  angle: AngleId
  /** degrees dragged on top of the angle */
  yaw: number
  elev: number
  zoom: number
  /** lens, degrees of vertical view; null keeps the angle's own */
  fov: number | null
  motion: MotionId
  /** seconds */
  duration: number
  /** a BACKDROPS id, or a custom colour */
  backdrop: string
  shadow: boolean
  reflections: number
  size: string
  fps: 30 | 60
  /** what Export makes */
  kind: "png" | "video"
}

export const DEFAULT_SHOT: Shot = {
  finish: {},
  angle: "hero",
  yaw: 0,
  elev: 0,
  zoom: 1,
  fov: null,
  motion: "reveal",
  duration: 6,
  backdrop: "studio",
  shadow: true,
  reflections: 1,
  size: "16x9",
  fps: 30,
  kind: "video",
}

export function shotPose(s: Shot, device: DeviceId): Pose {
  const p = angle(s.angle, device)
  return { ...p, yaw: p.yaw + s.yaw, elev: Math.max(-30, Math.min(85, p.elev + s.elev)), zoom: p.zoom * s.zoom, fov: s.fov ?? p.fov }
}

export const finishOf = (s: Shot, device: DeviceId) => FINISHES[device].find((f) => f.id === s.finish[device]) ?? FINISHES[device][0]
export const backdropCss = (s: Shot) => BACKDROPS.find((b) => b.id === s.backdrop)?.css ?? s.backdrop
export const sizeOf = (s: Shot) => SIZES.find((x) => x.id === s.size) ?? SIZES[0]
