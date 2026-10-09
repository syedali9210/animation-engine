// Studio — a composition: scenes played one after another, each a set of layers (devices with live screens, component
// animations outside any device, images, titles) over one background. Plain data: the engine edits it, keeps it
// between visits, and hands it to the export page, which draws it the same way.
import type { DeviceId, Posture } from "../devices"
import { SCREENS } from "../animations/_film/screens"
import type { Copy } from "./copy"
import type { AngleId, MotionId } from "./poses"

/** What a device's screen shows: whatever is open in the engine, one animation from the library, or a picture. */
export type Content = { kind: "current" } | { kind: "anim"; id: string } | { kind: "image"; src: string; name: string }
/** A flat layer's place: centre and width as fractions of the frame. Its height follows its own aspect. */
export type Box = { x: number; y: number; w: number }
export type Enter = "none" | "fade" | "rise" | "scale" | "blur"
/** How a title comes in. Beyond the block entrances: words rising one by one, a light sweeping across the words (the
    launch films' feature lines), a typewriter with its caret, lines rising out of a mask, and words parting around
    the middle so a device can stand between them ("for smarter | group selfies": the bar marks the split). */
export type TextEnter = Enter | "words" | "sweep" | "type" | "mask" | "part"
/** How the camera treats a component: flat on, tilted back and settling, a slow push, an extreme close-up gliding
    across one part of it, a gentle float, or an orbit. */
export type Shot = "flat" | "tilt" | "dolly" | "macro" | "float" | "orbit"
/** Where a device stands in a group: the primary in the middle, the others either side of it. */
export type Slot = "center" | "left" | "right"

type Base = { id: string; name?: string; hidden?: boolean }
export type DeviceLayer = Base & { kind: "device"; device: DeviceId; slot: Slot; finish?: string; posture: Posture; landscape: boolean; content: Content; hairline?: boolean }
export type ComponentLayer = Base & { kind: "component"; anim: string; box: Box; aspect: number; enter: Enter; hairline?: boolean; shot?: Shot; focus?: { x: number; y: number } }
export type ImageLayer = Base & { kind: "image"; src: string; file: string; aspect: number; box: Box; radius: number; enter: Enter; hairline?: boolean }
export type TextLayer = Base & {
  kind: "text"
  text: string
  box: Box
  size: number
  weight: number
  align: "left" | "center" | "right"
  enter: TextEnter
  color: string
  /** display: the brand's display face, set tight; mono: small spaced caps, for labels */
  font?: "text" | "display" | "mono"
  /** "part": how far the two halves open, in % of the frame's width */
  gap?: number
}
/** A screen taken apart into its components (a header, a search bar, tabs, cards, a tab bar), each a live plate cut
    from the running screen. The screen sits in its device, drawn flat; the components lift out onto the table beside
    it, fly back in, float above it in a stack, or one is shown on its own, close. See breakdown.tsx. */
export type BreakdownLayer = Base & {
  kind: "breakdown"
  anim: string
  /** the device the screen sits in, drawn flat and front on */
  mockup: "phone" | "tablet" | "none"
  /** table: out of the screen onto the table; assemble: back in; stack: floating above it; focus: one, close */
  view: "table" | "assemble" | "stack" | "focus"
  /** focus: which component, by interest (0 is the most interesting) */
  focus: number
  /** at most this many components, top of the screen first */
  max: number
  /** the screen and its components drawn as hairlines */
  lines: boolean
  labels: boolean
  /** a label per component, where the names it reports won't do */
  names?: string[]
  /** unused (it fills the frame), kept so every flat layer has one */
  box: Box
  enter: Enter
}
/** A label with a leader line, like a technical drawing's: a title, a smaller line under it, and a thin line that
    runs from the label to the point it names. */
export type CalloutLayer = Base & { kind: "callout"; text: string; sub: string; box: Box; at: { x: number; y: number }; enter: Enter; color: string }
export type Layer = DeviceLayer | ComponentLayer | ImageLayer | TextLayer | BreakdownLayer | CalloutLayer
export type FlatLayer = ComponentLayer | ImageLayer | TextLayer | BreakdownLayer | CalloutLayer

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
  /** the devices taken apart: coming apart into their parts (labelled), held apart, or assembling from them */
  teardown?: "none" | "apart" | "hold" | "assemble"
  /** this scene's own background; without it the composition's (or, with Auto on, the director's choice) */
  look?: Partial<SceneLook>
  /** back to front */
  layers: Layer[]
}
export type SceneLook = { fill: string; effect: Effect; ink: string; amount: number }

export type Effect = "none" | "glow" | "dots" | "grid" | "lines" | "noise" | "dither" | "sheet"
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
  /** the background director: picks each scene's background from what's in it, and blends between them */
  auto?: boolean
  /** colours and type taken from the product's own design system */
  brand?: Brand
  scenes: Scene[]
}

/** A product's look, read from its design system: its grounds, ink, accent and type. */
export type Brand = {
  name: string
  bg: string
  surface: string
  ink: string
  muted: string
  accent: string
  /** text on the accent */
  onAccent: string
  font: string
  display: string
  mono: string
  radius: number
  /** the product lives on a dark ground */
  dark: boolean
  /** stylesheets that load its fonts (Google Fonts) */
  fonts: string[]
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
  { id: "sheet", name: "Drawing" },
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
export const isAnimated = (l: Layer) => (l.kind === "device" ? l.content.kind !== "image" : l.kind === "component" || l.kind === "breakdown" || ("enter" in l && l.enter !== "none"))
export const TEXT_ENTERS: { id: TextEnter; name: string; hint: string }[] = [
  { id: "sweep", name: "Sweep", hint: "Every word dim, then a light runs across them: the launch films' feature lines." },
  { id: "words", name: "Words", hint: "Word by word, each rising into place." },
  { id: "part", name: "Part", hint: "The words part around the middle to make room for a device. A | marks where they split." },
  { id: "type", name: "Type", hint: "Typed out, with a caret." },
  { id: "mask", name: "Mask", hint: "Each line rises out of a mask." },
  { id: "blur", name: "Blur in", hint: "Comes into focus as it rises." },
  { id: "rise", name: "Rise", hint: "Rises into place." },
  { id: "fade", name: "Fade", hint: "Fades in." },
  { id: "none", name: "None", hint: "Already there." },
]
export const SHOTS: { id: Shot; name: string; hint: string }[] = [
  { id: "flat", name: "Flat", hint: "Square on to the camera." },
  { id: "tilt", name: "Tilt", hint: "Tilted back in perspective, settling towards the camera." },
  { id: "dolly", name: "Dolly", hint: "A slow push in, a little turned." },
  { id: "macro", name: "Macro", hint: "An extreme close-up gliding across one part of it." },
  { id: "float", name: "Float", hint: "A gentle turn either way, as if held in the air." },
  { id: "orbit", name: "Orbit", hint: "The camera swings round it." },
]

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
export const text = (t: string, box: Box = { x: 0.5, y: 0.5, w: 0.8 }, size = 6, weight = 650, enter: TextEnter = "rise", o: Partial<TextLayer> = {}): TextLayer => ({
  id: uid(),
  kind: "text",
  text: t,
  box,
  size,
  weight,
  align: "center",
  enter,
  color: "",
  ...o,
})
export const breakdown = (anim: string, view: BreakdownLayer["view"], o: Partial<BreakdownLayer> = {}): BreakdownLayer => ({
  id: uid(),
  kind: "breakdown",
  anim,
  mockup: "phone",
  view,
  focus: 0,
  max: 6,
  lines: false,
  labels: true,
  box: { x: 0.5, y: 0.5, w: 1 },
  enter: "none",
  ...o,
})
export const callout = (t: string, sub: string, at: { x: number; y: number }, box: Box): CalloutLayer => ({ id: uid(), kind: "callout", text: t, sub, at, box, enter: "fade", color: "" })
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

export type TemplateCtx = { device: DeviceId; posture: Posture; name: string; anim: string; copy: Copy; brand?: Brand }
export type Template = {
  id: string
  name: string
  hint: string
  scenes: number
  film?: boolean
  make: (x: TemplateCtx) => Comp
  /** a launch film's own params, set from what's open (its product screen, name, accent) */
  values?: (x: TemplateCtx) => { anim: string; values: Record<string, string> }
  /** drawn for one frame: the composition takes this size, not the one it had */
  size?: Comp["size"]
}

/** Lines to draw a template with before the copy writer has read the component. */
export const SAMPLE_COPY: Copy = {
  kicker: "Introducing",
  hook: "Meet what's next.",
  name: "Product",
  tagline: "Made to move",
  features: ["Built in motion", "Every state, designed", "Live, in your app"],
  split: "Built for | every screen",
  proof: "",
  cta: "Try it now",
  by: "rules",
}

const base = (x: TemplateCtx, o: Partial<Comp>): Comp => ({ ...defaultComp(x.device, x.posture), brand: x.brand, ...o })
const phoneOr = (d: DeviceId): DeviceId => (d === "macbook" || d === "ipad" ? "iphone" : d)
const accent = (x: TemplateCtx) => x.brand?.accent ?? ""
/** A launch film filling the frame (it's drawn at 16:9 and plays on its own clock). */
const launchFilm = (anim: string): ComponentLayer => ({ ...component(anim, { x: 0.5, y: 0.5, w: 1 }), aspect: 16 / 9, enter: "none", shot: "flat" })
/** What a launch film takes from what's open: the product's screen (when it's one a film can show), its name, the brand's accent. */
const launchValues = (anim: string, x: TemplateCtx) => {
  const values: Record<string, string> = {}
  if (SCREENS.includes(x.anim)) values.screen = x.anim
  if (x.copy.name) values.name = x.copy.name
  if (x.brand?.accent) values.accent = x.brand.accent
  return { anim, values }
}
/** A name behind a device: as big as fits on one line, so the device hides only a little of it. */
const nameSize = (name: string) => Math.min(22, Math.max(9, 150 / Math.max(1, name.length)))

export const TEMPLATES: Template[] = [
  {
    id: "app-film",
    name: "App film",
    hint: "The screen taken apart, the way the iPhone films take a phone apart: its components out on the table, floating in layers, two close-ups, then back together.",
    scenes: 8,
    film: true,
    make: (x) => {
      const ph = phoneOr(x.device)
      const f = x.copy.features
      return base(x, {
        auto: true,
        light: "dramatic",
        scenes: [
          scene("Hook", [text(x.copy.hook, { x: 0.5, y: 0.5, w: 0.8 }, 5.2, 600, "sweep")], { duration: 2.4, transition: "cut", move: "still" }),
          scene("Hero", [text(x.copy.name, { x: 0.5, y: 0.5, w: 0.96 }, nameSize(x.copy.name), 780, "mask", { font: "display", color: accent(x) }), device(ph)], {
            duration: 3.4,
            transition: "fade",
            move: "pull",
            camera: { ...CAMERA, angle: "front", zoom: 0.84 },
          }),
          // blur, not a plain dissolve, between shots that share nothing: it hides the seam
          scene("Components", [breakdown(x.anim, "table")], { duration: 4.4, transition: "blur", move: "still" }),
          scene("Layers", [breakdown(x.anim, "stack")], { duration: 5.4, transition: "dissolve", move: "still" }),
          scene("Close-up", [breakdown(x.anim, "focus", { focus: 0, labels: false }), text("{part}", { x: 0.17, y: 0.4, w: 0.26 }, 1.05, 500, "fade", { font: "mono", align: "left" }), text(f[0], { x: 0.17, y: 0.5, w: 0.26 }, 2.6, 600, "words", { align: "left" })], { duration: 3.6, transition: "push", move: "still" }),
          scene("Close-up 2", [breakdown(x.anim, "focus", { focus: 1, labels: false }), text("{part}", { x: 0.17, y: 0.4, w: 0.26 }, 1.05, 500, "fade", { font: "mono", align: "left" }), text(f[1] ?? x.copy.tagline, { x: 0.17, y: 0.5, w: 0.26 }, 2.6, 600, "words", { align: "left" })], { duration: 3.6, transition: "dissolve", move: "still" }),
          scene("Together", [breakdown(x.anim, "assemble")], { duration: 3.8, transition: "blur", move: "still" }),
          scene("End card", [text(x.copy.name, { x: 0.5, y: 0.12, w: 0.8 }, 4.6, 720, "blur", { font: "display", color: accent(x) }), device(ph), text(x.copy.cta, { x: 0.5, y: 0.91, w: 0.6 }, 2.2, 560, "type")], {
            duration: 3.2,
            transition: "fade",
            move: "rise",
            camera: { ...CAMERA, angle: "front", zoom: 0.7, elev: -4 },
          }),
        ],
      })
    },
  },
  {
    id: "typed",
    name: "Typed launch",
    hint: "Cut like the Numtera film: a hook that types and edits itself among live fragments of your product, a huge word, the reveal on your accent, the product tilted, a split screen whose checklist ticks, a keyword in braces, a macro, a typed CTA. 42 s.",
    scenes: 1,
    film: true,
    size: "16x9",
    make: (x) => base(x, { fill: "black", effect: "none", auto: false, scenes: [scene("Film", [launchFilm("launch-type")], { duration: 42, transition: "cut", move: "still" })] }),
    values: (x) => launchValues("launch-type", x),
  },
  {
    id: "glass",
    name: "Glass launch",
    hint: "Cut like the LangEase film: single words blurring in, a word with your icon dropping between, a tunnel of live phones, a progress bar, a glass orb with confetti, a tap, a black button turning into your accent, a spark, the end card. 34 s.",
    scenes: 1,
    film: true,
    size: "16x9",
    make: (x) => base(x, { fill: "black", effect: "none", auto: false, scenes: [scene("Film", [launchFilm("launch-glass")], { duration: 34, transition: "cut", move: "still" })] }),
    values: (x) => launchValues("launch-glass", x),
  },
  {
    id: "prompt",
    name: "Prompt launch",
    hint: "Cut like the Claude Design film, on warm paper: a pill clicked open into a prompt that types, status words in italic, the result in its window, macro clicks on the toolbar, the plan ticking off, the screen changing, a collage. 31 s.",
    scenes: 1,
    film: true,
    size: "16x9",
    make: (x) => base(x, { fill: "black", effect: "none", auto: false, scenes: [scene("Film", [launchFilm("launch-prompt")], { duration: 31, transition: "cut", move: "still" })] }),
    values: (x) => launchValues("launch-prompt", x),
  },
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
