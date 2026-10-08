// Studio — a composition: scenes played one after another, each a set of layers (devices with live screens, component
// animations outside any device, images, titles) over one background. Plain data: the engine edits it, keeps it
// between visits, and hands it to the export page, which draws it the same way.
import type { DeviceId, Posture } from "../devices"
import type { AngleId, MotionId } from "./poses"

/** What a device's screen shows: whatever is open in the engine, one animation from the library, or a picture. */
export type Content = { kind: "current" } | { kind: "anim"; id: string } | { kind: "image"; src: string; name: string }
/** A flat layer's place: centre and width as fractions of the frame. Its height follows its own aspect. */
export type Box = { x: number; y: number; w: number }
export type Enter = "none" | "fade" | "rise" | "scale" | "blur"
/** Where a device stands in a group: the primary in the middle, the others either side of it. */
export type Slot = "center" | "left" | "right"

type Base = { id: string; name?: string; hidden?: boolean }
export type DeviceLayer = Base & { kind: "device"; device: DeviceId; slot: Slot; finish?: string; posture: Posture; landscape: boolean; content: Content; hairline?: boolean }
export type ComponentLayer = Base & { kind: "component"; anim: string; box: Box; aspect: number; enter: Enter; hairline?: boolean }
export type ImageLayer = Base & { kind: "image"; src: string; file: string; aspect: number; box: Box; radius: number; enter: Enter; hairline?: boolean }
export type TextLayer = Base & { kind: "text"; text: string; box: Box; size: number; weight: number; align: "left" | "center" | "right"; enter: Enter; color: string }
export type Layer = DeviceLayer | ComponentLayer | ImageLayer | TextLayer
export type FlatLayer = ComponentLayer | ImageLayer | TextLayer

export type Transition = "cut" | "fade" | "dissolve" | "push" | "zoom" | "blur"
export type Camera = { angle: AngleId; yaw: number; elev: number; zoom: number; fov: number | null }
export type Scene = {
  id: string
  name: string
  /** seconds */
  duration: number
  /** how this scene takes over from the one before it */
  transition: Transition
  camera: Camera
  move: MotionId
  /** where the devices sit in the frame: the middle, or one side, leaving the other for a component or a title */
  frame: Slot
  /** how the devices come into the scene */
  arrival: "none" | "drop" | "slide"
  /** back to front */
  layers: Layer[]
}

export type Effect = "none" | "glow" | "dots" | "grid" | "lines" | "noise" | "dither"
export type Light = "studio" | "dramatic" | "soft"
export type Comp = {
  v: 2
  size: string
  fps: 30 | 60
  kind: "png" | "video"
  /** a BACKDROPS id or a CSS colour */
  fill: string
  effect: Effect
  /** the effect's colour; "" picks black or white against the fill */
  ink: string
  /** how strong the effect is, 0 to 1 */
  amount: number
  light: Light
  shadow: boolean
  reflections: number
  scenes: Scene[]
}

export const TRANSITIONS: { id: Transition; name: string; hint: string }[] = [
  { id: "cut", name: "Cut", hint: "Straight to the next scene, the way an edit cuts on a beat." },
  { id: "dissolve", name: "Dissolve", hint: "The two scenes cross for a moment." },
  { id: "fade", name: "Dip", hint: "Out to the background and back in: a new chapter." },
  { id: "push", name: "Push", hint: "The new scene slides the old one out." },
  { id: "zoom", name: "Zoom", hint: "Through the old scene into the new one." },
  { id: "blur", name: "Blur", hint: "A soft focus pull between the two." },
]
export const ENTERS: { id: Enter; name: string }[] = [
  { id: "rise", name: "Rise" },
  { id: "fade", name: "Fade" },
  { id: "scale", name: "Scale" },
  { id: "blur", name: "Blur in" },
  { id: "none", name: "None" },
]
export const EFFECTS: { id: Effect; name: string }[] = [
  { id: "none", name: "None" },
  { id: "glow", name: "Glow" },
  { id: "dots", name: "Dots" },
  { id: "grid", name: "Grid" },
  { id: "lines", name: "Lines" },
  { id: "noise", name: "Grain" },
  { id: "dither", name: "Dither" },
]
export const LIGHTS: { id: Light; name: string; hint: string }[] = [
  { id: "studio", name: "Studio", hint: "Big soft boxes: true colours, clean edges." },
  { id: "dramatic", name: "Keynote", hint: "A dark room and bright rims along every edge, the way launch films light a device." },
  { id: "soft", name: "Soft", hint: "Bright and low-contrast, for light backgrounds." },
]

/** How long a scene's transition in takes, seconds (it overlaps the start of the scene; nothing is added). */
export const XFADE = 0.7

export const uid = () => Math.random().toString(36).slice(2, 9)
export const total = (c: Comp) => c.scenes.reduce((s, x) => s + x.duration, 0)
export const starts = (c: Comp) => c.scenes.reduce<number[]>((a, x, i) => [...a, i ? a[i - 1] + c.scenes[i - 1].duration : 0], [])

/** What's on screen at `t`: the scene it's in, how far into it, and the scene it's taking over from, if it's still
    mid-transition (with the transition's progress, 0 to 1). */
export function at(c: Comp, t: number) {
  const s = starts(c)
  let i = s.findIndex((x, j) => t < x + c.scenes[j].duration)
  if (i < 0) i = c.scenes.length - 1
  const local = t - s[i]
  const sc = c.scenes[i]
  const T = sc.transition === "cut" || i === 0 ? 0 : Math.min(XFADE, sc.duration / 2)
  const prev = T && local < T ? { i: i - 1, local: c.scenes[i - 1].duration + local, k: local / T } : null
  return { i, local, prev }
}

export const devicesOf = (s: Scene) => s.layers.filter((l): l is DeviceLayer => l.kind === "device" && !l.hidden)
export const isAnimated = (l: Layer) => (l.kind === "device" ? l.content.kind !== "image" : l.kind === "component" || ("enter" in l && l.enter !== "none"))

export const CAMERA: Camera = { angle: "hero", yaw: 0, elev: 0, zoom: 1, fov: null }

export const device = (d: DeviceId, slot: Slot = "center", posture: Posture = "open", content: Content = { kind: "current" }): DeviceLayer => ({
  id: uid(),
  kind: "device",
  device: d,
  slot,
  posture,
  landscape: false,
  content,
})
export const component = (anim: string, box: Box = { x: 0.72, y: 0.5, w: 0.3 }): ComponentLayer => ({ id: uid(), kind: "component", anim, box, aspect: 0.75, enter: "rise" })
export const text = (t: string, box: Box = { x: 0.5, y: 0.5, w: 0.8 }, size = 6, weight = 650): TextLayer => ({ id: uid(), kind: "text", text: t, box, size, weight, align: "center", enter: "rise", color: "" })
export const scene = (name: string, layers: Layer[], o: Partial<Scene> = {}): Scene => ({
  id: uid(),
  name,
  duration: 4,
  transition: "dissolve",
  camera: { ...CAMERA },
  move: "reveal",
  frame: "center",
  arrival: "none",
  layers,
  ...o,
})

/** A device into the next free place in the scene (the middle, then left, then right), under its flat layers; null when
    all three are taken. */
export function addDevice(s: Scene, d: DeviceId): Scene | null {
  const used = s.layers.flatMap((l) => (l.kind === "device" ? [l.slot] : []))
  const slot = (["center", "left", "right"] as Slot[]).find((x) => !used.includes(x))
  if (!slot) return null
  const at = s.layers.findIndex((l) => l.kind !== "device")
  const layers = [...s.layers]
  layers.splice(at < 0 ? layers.length : at, 0, device(d, slot))
  return { ...s, layers }
}

export const defaultComp =(d: DeviceId, posture: Posture = "open"): Comp => ({
  v: 2,
  size: "16x9",
  fps: 30,
  kind: "video",
  fill: "studio",
  effect: "none",
  ink: "",
  amount: 0.5,
  light: "studio",
  shadow: true,
  reflections: 1,
  scenes: [scene("Hero", [device(d, "center", posture)], { duration: 6, transition: "cut" })],
})

/* ---------------- templates ---------------- */

export type TemplateCtx = { device: DeviceId; posture: Posture; name: string; anim: string }
export type Template = { id: string; name: string; hint: string; scenes: number; make: (x: TemplateCtx) => Comp }

const base = (x: TemplateCtx, o: Partial<Comp>): Comp => ({ ...defaultComp(x.device, x.posture), ...o })
const phoneOr = (d: DeviceId): DeviceId => (d === "macbook" || d === "ipad" ? "iphone" : d)

export const TEMPLATES: Template[] = [
  {
    id: "hero",
    name: "Hero shot",
    hint: "One device, turning in under studio light.",
    scenes: 1,
    make: (x) => base(x, { scenes: [scene("Hero", [device(x.device, "center", x.posture)], { duration: 6, transition: "cut" })] }),
  },
  {
    id: "beside",
    name: "Device + component",
    hint: "The device on the left, a component animating beside it.",
    scenes: 1,
    make: (x) =>
      base(x, {
        fill: "white",
        scenes: [scene("Feature", [device(phoneOr(x.device)), component(x.anim)], { duration: 6, transition: "cut", frame: "left", camera: { ...CAMERA, angle: "heroLeft" }, move: "sway" })],
      }),
  },
  {
    id: "family",
    name: "Family",
    hint: "MacBook in the middle, iPad and iPhone either side, matched in scale and perspective.",
    scenes: 1,
    make: (x) =>
      base(x, {
        scenes: [
          scene("Family", [device("macbook"), device("ipad", "left"), device("iphone", "right")], { duration: 6, transition: "cut", arrival: "drop", move: "push", camera: { ...CAMERA, angle: "front", elev: 6 } }),
        ],
      }),
  },
  {
    id: "keynote",
    name: "Keynote reveal",
    hint: "Three scenes on black: spin in, a profile pass, then the hero with its name.",
    scenes: 3,
    make: (x) =>
      base(x, {
        fill: "black",
        light: "dramatic",
        effect: "glow",
        amount: 0.45,
        scenes: [
          scene("Spin in", [device(x.device, "center", x.posture)], { duration: 3.4, transition: "cut", move: "spin", camera: { ...CAMERA, angle: "front" } }),
          scene("Profile", [device(x.device, "center", x.posture)], { duration: 3, transition: "dissolve", move: "turn", camera: { ...CAMERA, angle: "side", zoom: 0.95 } }),
          scene("Hero", [device(x.device, "center", x.posture), { ...text(x.name, { x: 0.5, y: 0.1, w: 0.8 }, 4.2), enter: "blur" }], {
            duration: 3.6,
            transition: "fade",
            move: "pull",
            camera: { ...CAMERA, angle: "hero", zoom: 0.76 },
          }),
        ],
      }),
  },
  {
    id: "launch",
    name: "Launch film",
    hint: "Five scenes: a title, the reveal, a feature beside the device, the family dropping in, an end card.",
    scenes: 5,
    make: (x) =>
      base(x, {
        fill: "midnight",
        light: "dramatic",
        effect: "glow",
        amount: 0.5,
        scenes: [
          scene("Title", [{ ...text("Introducing", { x: 0.5, y: 0.42, w: 0.8 }, 2.4, 500), color: "#a1a1aa" }, { ...text(x.name, { x: 0.5, y: 0.54, w: 0.8 }, 7.5), enter: "blur" }], {
            duration: 2.4,
            transition: "cut",
            move: "still",
          }),
          scene("Reveal", [device(x.device, "center", x.posture)], { duration: 3.4, transition: "fade", move: "spin", camera: { ...CAMERA, angle: "front" } }),
          scene("Feature", [device(phoneOr(x.device)), component(x.anim)], { duration: 3.6, transition: "push", frame: "left", move: "sway", camera: { ...CAMERA, angle: "heroLeft" } }),
          scene("Everywhere", [device("macbook"), device("ipad", "left"), device("iphone", "right")], { duration: 3.6, transition: "dissolve", arrival: "drop", move: "push", camera: { ...CAMERA, angle: "front", elev: 6 } }),
          scene("End card", [device(x.device, "center", x.posture), { ...text(x.name, { x: 0.5, y: 0.12, w: 0.8 }, 4), enter: "fade" }], {
            duration: 3,
            transition: "blur",
            move: "still",
            camera: { ...CAMERA, angle: "front", zoom: 0.72, elev: -4 },
          }),
        ],
      }),
  },
  {
    id: "story",
    name: "Social 9:16",
    hint: "A vertical teaser in three quick scenes, for Reels, Shorts and Stories.",
    scenes: 3,
    make: (x) =>
      base(x, {
        size: "9x16",
        fill: "aurora",
        scenes: [
          scene("Rise", [device(phoneOr(x.device))], { duration: 2.4, transition: "cut", move: "rise", camera: { ...CAMERA, angle: "hero" } }),
          scene("Close", [device(phoneOr(x.device))], { duration: 2.2, transition: "zoom", move: "push", camera: { ...CAMERA, angle: "tilt", zoom: 1.5 } }),
          scene("Name", [device(phoneOr(x.device)), { ...text(x.name, { x: 0.5, y: 0.1, w: 0.86 }, 8.5), enter: "rise" }], {
            duration: 2.6,
            transition: "dissolve",
            move: "reveal",
            camera: { ...CAMERA, angle: "front", zoom: 0.7, elev: -4 },
          }),
        ],
      }),
  },
]
