// Studio — the background director. With Auto on, it reads each scene (what's in it, where it sits in the film) and
// picks its ground from the looks launch films use: a dark keynote room for a device's reveal, paper for a feature told
// with a component, a drawing sheet for a teardown, the brand's own colour for the name and the end card. It keeps
// neighbouring scenes in rhythm (dark, light, dark), and the view blends one ground into the next across the cut.
// It learns: a background you set on a scene by hand is remembered with what that scene holds, and later picks for
// scenes like it lean towards your choice. (Kept in this browser; a few dozen picks.)
import type { Brand, Comp, Scene, SceneLook } from "./comp"
import { devicesOf } from "./comp"
import { isDark } from "./look"

export type Features = {
  devices: number
  components: number
  /** a screen taken apart, and how */
  breakdown: "" | "table" | "assemble" | "stack" | "focus"
  teardown: boolean
  titles: number
  lines: boolean
  first: boolean
  last: boolean
  textOnly: boolean
}

export function features(s: Scene, i: number, n: number): Features {
  const visible = s.layers.filter((l) => !l.hidden)
  const devices = devicesOf(s).length
  const components = visible.filter((l) => l.kind === "component").length
  const titles = visible.filter((l) => l.kind === "text").length
  const bd = visible.find((l) => l.kind === "breakdown")
  const breakdown = bd && bd.kind === "breakdown" ? bd.view : ""
  return {
    devices,
    components,
    breakdown,
    teardown: !!s.teardown && s.teardown !== "none",
    titles,
    lines: visible.some((l) => "hairline" in l && !!l.hairline) || visible.some((l) => l.kind === "breakdown" && l.lines),
    first: i === 0,
    last: i === n - 1 && n > 1,
    textOnly: devices + components === 0 && !breakdown && titles > 0,
  }
}

/** How alike two scenes are, 0 to 1. */
function alike(a: Features, b: Features) {
  const keys = Object.keys(a) as (keyof Features)[]
  const same = keys.filter((k) => (typeof a[k] === "number" ? Math.min(2, a[k] as number) === Math.min(2, b[k] as number) : a[k] === b[k])).length
  return same / keys.length
}

/* ---------------- what it has learned ---------------- */

type Sample = { f: Features; look: SceneLook }
const KEY = "anim-engine:director"
const load = (): Sample[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}
let samples: Sample[] = typeof localStorage === "undefined" ? [] : load()

/** Remember that a scene like this one got this background, by hand. */
export function learn(f: Features, look: SceneLook) {
  samples = [...samples.filter((x) => !(alike(x.f, f) === 1 && JSON.stringify(x.look) === JSON.stringify(look))), { f, look }].slice(-60)
  try {
    localStorage.setItem(KEY, JSON.stringify(samples))
  } catch {
    /* private mode: it just doesn't remember */
  }
}
export const learnedCount = () => samples.length
export function forget() {
  samples = []
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing kept */
  }
}

/* ---------------- the looks ---------------- */

const mixHex = (a: string, b: string, k: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const [x, y] = [p(a), p(b)]
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`
}

type Candidate = { id: string; look: SceneLook; dark: boolean; score: number; why: string }

function looks(brand?: Brand): Omit<Candidate, "score" | "why">[] {
  const accent = brand?.accent ?? ""
  const list: Omit<Candidate, "score" | "why">[] = [
    { id: "keynote", look: { fill: brand?.dark ? brand.bg : "black", effect: "glow", ink: accent, amount: 0.42 }, dark: true },
    { id: "graphite", look: { fill: "midnight", effect: "glow", ink: accent, amount: 0.32 }, dark: true },
    { id: "studio", look: { fill: "studio", effect: "none", ink: "", amount: 0.5 }, dark: false },
    { id: "paper", look: { fill: "white", effect: "dots", ink: "", amount: 0.3 }, dark: false },
    { id: "drawing", look: { fill: "#f2f1ec", effect: "sheet", ink: "", amount: 0.6 }, dark: false },
    { id: "table", look: { fill: "#ecebe6", effect: "noise", ink: "", amount: 0.18 }, dark: false },
    { id: "blueprint", look: { fill: "#0b1120", effect: "grid", ink: "#5b7ba6", amount: 0.45 }, dark: true },
  ]
  if (brand) {
    list.push({ id: "brand", look: { fill: brand.bg, effect: "glow", ink: brand.accent, amount: 0.5 }, dark: brand.dark })
    if (!brand.dark) list.push({ id: "tint", look: { fill: mixHex("#ffffff", brand.accent, 0.07), effect: "glow", ink: brand.accent, amount: 0.38 }, dark: false })
    list.push({ id: "accent", look: { fill: brand.accent, effect: "noise", ink: "", amount: 0.25 }, dark: isDark(brand.accent) })
  }
  return list
}

/** Scores every look for a scene: what launch films put behind this kind of shot, then the rhythm, then you. */
function choose(f: Features, prevDark: boolean | null, brand?: Brand): Candidate {
  const all: Candidate[] = looks(brand).map((c) => ({ ...c, score: 0, why: "" }))
  const bump = (id: string, n: number, why: string) => {
    const c = all.find((x) => x.id === id)
    if (c) {
      c.score += n
      c.why ||= why
    }
  }
  if (f.teardown) {
    bump("drawing", 5, "a teardown reads as a technical drawing")
    bump("blueprint", 3, "a teardown reads as a technical drawing")
  }
  // a screen taken apart: its parts on a pale table (the knolling shot), floating in a dark room, or one close up in
  // the brand's light
  if (f.breakdown === "table" || f.breakdown === "assemble") {
    bump("table", 6, "parts laid out on a pale table, the way a teardown is shot")
    bump("tint", 3, "parts laid out on the brand's light")
  }
  if (f.breakdown === "stack") {
    bump("graphite", 5, "layers floating in a dark room")
    bump("keynote", 3, "layers floating in a dark room")
  }
  if (f.breakdown === "focus") {
    bump("tint", 5, "a close-up on the brand's light")
    bump("studio", 4, "a close-up in studio light")
  }
  if (f.lines && !f.breakdown) bump("drawing", 2, "hairlines want paper")
  if (f.textOnly && f.first) {
    bump("keynote", 4, "the hook opens in the dark")
    bump("brand", 2, "the hook in the brand's world")
  }
  if (f.textOnly && f.last) {
    bump("brand", 5, "the name and the call to action in the brand's colour")
    bump("accent", 3, "the end card in the accent")
    bump("keynote", 2, "the end card in the dark")
  }
  if (f.textOnly && !f.first && !f.last) {
    bump("keynote", 3, "a feature line on black, the way launch films set them")
    bump("tint", 2, "a feature line in the brand's light")
  }
  if (f.devices >= 2) {
    bump("keynote", 4, "a line-up lit like a keynote")
    bump("graphite", 3, "a line-up lit like a keynote")
  }
  if (f.devices === 1 && f.components === 0 && !f.teardown) {
    bump("keynote", 3, "a device's reveal, drawn by its edges")
    bump("studio", 2, "a product shot in studio light")
  }
  if (f.components > 0) {
    bump("tint", 4, "a feature with its component, on the brand's light")
    bump("paper", 3, "a feature with its component, on paper")
    bump("studio", 2, "a feature with its component")
  }
  // rhythm: after a dark scene a light one reads as the next idea, and back (product reveals stay in the dark)
  if (prevDark !== null && !(f.devices >= 1 && f.components === 0))
    for (const c of all) if (c.dark !== prevDark) c.score += 1
  // what you've chosen for scenes like this
  for (const s of samples) {
    const sim = alike(s.f, f)
    if (sim < 0.75) continue
    const same = all.find((c) => JSON.stringify(c.look) === JSON.stringify(s.look))
    if (same) {
      same.score += 4 * sim
      same.why = "what you chose for scenes like this"
    } else all.push({ id: "learned", look: s.look, dark: isDark(s.look.fill), score: 3.5 * sim, why: "what you chose for scenes like this" })
  }
  return all.reduce((a, b) => (b.score > a.score ? b : a))
}

export type Directed = SceneLook & { why: string; auto: boolean }

/** Every scene's background: its own if it has one, the director's when Auto is on, the composition's otherwise. */
export function direct(comp: Comp): Directed[] {
  const base: SceneLook = { fill: comp.fill, effect: comp.effect, ink: comp.ink, amount: comp.amount }
  let prevDark: boolean | null = null
  return comp.scenes.map((s, i) => {
    let out: Directed
    if (s.look && Object.keys(s.look).length) out = { ...base, ...s.look, why: "set on this scene", auto: false }
    else if (comp.auto) {
      const c = choose(features(s, i, comp.scenes.length), prevDark, comp.brand)
      out = { ...c.look, why: c.why || "a quiet ground", auto: true }
    } else out = { ...base, why: "the composition's background", auto: false }
    prevDark = isDark(out.fill)
    return out
  })
}
