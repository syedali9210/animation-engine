// Studio — draws a composition. Every scene is a layer of its own: its devices (one 3D scene, so they share one camera
// and one perspective) and its flat layers (component animations, exploded views, pictures, titles, callouts), stacked
// in the scene's order, over a ground the background director blends from one scene to the next. Time decides which
// scene shows and how the next one takes over. The engine's preview and the export page both draw with this; the clock
// is theirs (real in the engine, stepped by hand for an export).
import { createRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { DEVICES, type Device, type ScreenInk } from "../devices"
import type { Values } from "../registry"
import { BreakdownBody, animateBreakdown } from "./breakdown"
import { focusOf, type PartsReport } from "./parts"
import { at, devicesOf, type Brand, type BreakdownLayer, type ComponentLayer, type Comp, type Content, type DeviceLayer, type FlatLayer, type Scene, type TextLayer, type Transition } from "./comp"
import { direct } from "./director"
import { FINISHES, type Finish } from "./finishes"
import { Backdrop, HairlineDefs, hairline, isDark, labelInk } from "./look"
import { angle, move, type Pose } from "./poses"
import { StudioScene } from "./scene"
import { ScreenShell } from "./shell"

/** One live frame: an animation, its values, and on a built screen its box. */
export type FrameSpec = {
  key: string
  path: string
  query: Record<string, string>
  values: Values
  box?: CSSProperties
  bare: boolean
  hairline: boolean
  scheme: "light" | "dark"
  /** the hairline's ink and what its surfaces are filled with ("none" draws through them) */
  ink?: string
  fill?: string
}
/** What one device's screen shows. */
export type ScreenSpec = {
  frames: FrameSpec[]
  bg: string
  media?: { url: string; video: boolean }
  image?: string
}
/** How the view turns a composition's references into things it can load. The engine and the export page differ. */
export type Resolve = {
  screen: (content: Content, d: Device, key: string, hairline: boolean) => ScreenSpec
  component: (anim: string, key: string, hairline: boolean, scheme: "light" | "dark") => FrameSpec
  /** the screen a breakdown takes apart: whole ("full", reporting its components), only its grounds ("none"), or only
      component `which` */
  part: (anim: string, key: string, which: "full" | "none" | number, hairline: boolean, scheme: "light" | "dark") => FrameSpec
  image: (src: string) => string
  dark: boolean
  /** export: frames run on the bridge's hand-stepped clock */
  stepped: boolean
  /** the page's origin, that frames talk back to */
  origin: string
}
export type Drag = { yaw: number; elev: number; zoom: number }
export type ViewHandle = {
  /** draw the composition at `t` seconds (with a drag on the current scene's camera, while one is in progress) */
  render: (t: number, drag?: Drag) => void
  /** every frame in the composition, for an export to step */
  frames: () => HTMLIFrameElement[]
}

export const finishFor = (l: DeviceLayer): Finish => FINISHES[l.device].find((f) => f.id === l.finish) ?? FINISHES[l.device][0]
export const deviceOf = (l: DeviceLayer) => DEVICES.find((d) => d.id === l.device)!
export function cameraPose(s: Scene, drag?: Drag): Pose {
  const primary = devicesOf(s).find((l) => l.slot === "center") ?? devicesOf(s)[0]
  const c = s.camera
  const p = angle(c.angle, primary?.device ?? "iphone")
  const yaw = c.yaw + (drag?.yaw ?? 0)
  const elev = c.elev + (drag?.elev ?? 0)
  return {
    ...p,
    yaw: p.yaw + yaw,
    elev: Math.max(-30, Math.min(85, p.elev + elev)),
    zoom: p.zoom * c.zoom * (drag?.zoom ?? 1),
    fov: c.fov ?? p.fov,
  }
}

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)))
const inOut = (x: number) => {
  const k = clamp(x)
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
}

/** How a scene looks while it hands over: `k` runs 0 → 1 across the transition. */
function handover(tr: Transition, k: number, incoming: boolean): CSSProperties {
  const e = inOut(k)
  switch (tr) {
    case "dissolve":
      return incoming ? { opacity: e } : {}
    case "fade":
      return incoming ? { opacity: clamp(e * 2 - 1) } : { opacity: clamp(1 - e * 2) }
    case "push":
      return {
        transform: `translateX(${incoming ? (1 - e) * 100 : -e * 100}%)`,
      }
    case "zoom":
      return incoming ? { opacity: e, transform: `scale(${0.86 + 0.14 * e})` } : { opacity: 1 - e, transform: `scale(${1 + 0.22 * e})` }
    case "blur":
      return incoming ? { opacity: e, filter: `blur(${(1 - e) * 1.4}cqw)` } : { opacity: 1 - e, filter: `blur(${e * 1.4}cqw)` }
    default:
      return incoming ? {} : { opacity: 0 }
  }
}

/** A flat layer's way in, `k` 0 → 1. Titles that animate word by word come in as a block with "none" (or a fade). */
function entering(enter: string, k: number): { opacity: number; transform: string; filter: string } {
  const e = expoOut(k)
  switch (enter) {
    case "rise":
      return {
        opacity: clamp(k * 2.2),
        transform: `translateY(${(1 - e) * 4}cqh)`,
        filter: "",
      }
    case "scale":
      return {
        opacity: clamp(k * 2.2),
        transform: `scale(${0.94 + 0.06 * e})`,
        filter: "",
      }
    case "blur":
      return {
        opacity: clamp(k * 1.8),
        transform: `translateY(${(1 - e) * 1.5}cqh)`,
        filter: `blur(${(1 - e) * 0.8}cqw)`,
      }
    case "fade":
    case "sweep":
      return { opacity: clamp(k * 1.6), transform: "", filter: "" }
    default:
      return { opacity: 1, transform: "", filter: "" }
  }
}

/** How far a scene's devices are taken apart at `t`. */
function apartAt(mode: Scene["teardown"], t: number) {
  if (mode === "apart") return inOut((t - 0.5) / 2)
  if (mode === "hold") return 1
  if (mode === "assemble") return 1 - inOut((t - 0.6) / 2.2)
  return 0
}

/* ---------------- labels: a title, a note, and a leader line to the point they name ---------------- */

type LabelItem = {
  key: string
  name: string
  note?: string
  /** the point named, px in the scene */
  ax: number
  ay: number
  /** which side of the subject the label sits on */
  side: -1 | 1
  /** 0 → 1: drawn in */
  p: number
  /** a fixed place for the label (a callout's); otherwise they're laid out in a column on their side */
  lx?: number
  ly?: number
  /** a caption under its subject, without a line */
  caption?: boolean
}

/** The labels of one scene, drawn by hand each frame (they follow things that move). Lines run from the label a
    short way out, then at an angle to the point, the way a technical drawing's leaders do; each draws in from its
    label, the text first, a dot where it lands. */
class Labels {
  private root = document.createElement("div")
  private svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  private slots: {
    line: SVGPolylineElement
    dot: SVGCircleElement
    box: HTMLDivElement
    title: HTMLSpanElement
    note: HTMLSpanElement
  }[] = []

  constructor(host: HTMLElement) {
    this.root.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:50"
    this.svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible"
    this.root.appendChild(this.svg)
    host.appendChild(this.root)
  }

  private slot(i: number) {
    while (this.slots.length <= i) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
      line.setAttribute("fill", "none")
      line.setAttribute("stroke-linecap", "round")
      line.setAttribute("stroke-linejoin", "round")
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      this.svg.append(line, dot)
      const box = document.createElement("div")
      box.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;line-height:1.15"
      const title = document.createElement("span")
      title.style.cssText = "display:block;font-weight:550;letter-spacing:-0.01em"
      const note = document.createElement("span")
      note.style.cssText = "display:block;text-transform:uppercase;letter-spacing:0.12em;opacity:0.58;margin-top:0.35em"
      box.append(title, note)
      this.root.appendChild(box)
      this.slots.push({ line, dot, box, title, note })
    }
    return this.slots[i]
  }

  draw(items: LabelItem[], W: number, H: number, ink: string, font: string) {
    const u = W / 100 // one cqw
    this.svg.setAttribute("width", String(W))
    this.svg.setAttribute("height", String(H))
    // a column either side, each label level with its point unless they'd collide
    for (const side of [-1, 1] as const) {
      const list = items.filter((it) => it.lx == null && !it.caption && it.side === side).sort((a, b) => a.ay - b.ay)
      if (!list.length) continue
      const col = side < 0 ? Math.max(u * 15, Math.min(...list.map((i) => i.ax)) - u * 8) : Math.min(W - u * 15, Math.max(...list.map((i) => i.ax)) + u * 8)
      let y = -Infinity
      for (const it of list) {
        it.lx = col
        it.ly = Math.max(it.ay, y + u * 4.2)
        y = it.ly
      }
      const over = y - (H - u * 3.5)
      if (over > 0) for (const it of list) it.ly! -= over
      const under = u * 3.5 - list[0].ly!
      if (under > 0) for (const it of list) it.ly! += under
    }
    items.forEach((it, i) => {
      const s = this.slot(i)
      const lx = it.lx ?? it.ax
      const ly = it.ly ?? it.ay
      const shown = it.p > 0.001
      s.box.style.display = shown ? "" : "none"
      s.line.style.display = shown && !it.caption ? "" : "none"
      s.dot.style.display = shown && !it.caption ? "" : "none"
      if (!shown) return
      const textIn = clamp(it.p / 0.35)
      s.title.textContent = it.name
      s.note.textContent = it.note ?? ""
      s.note.style.display = it.note ? "" : "none"
      s.box.style.fontFamily = font
      s.box.style.color = ink
      s.title.style.fontSize = `${u * (it.caption ? 1.15 : 1.3)}px`
      s.note.style.fontSize = `${u * 0.72}px`
      s.box.style.opacity = String(textIn)
      if (it.caption) {
        s.box.style.textAlign = "center"
        s.box.style.transform = `translate(${lx}px, ${ly + (1 - textIn) * u * 0.6}px) translate(-50%, 0)`
        return
      }
      s.box.style.textAlign = it.side < 0 ? "right" : "left"
      s.box.style.transform = `translate(${lx + it.side * (1 - textIn) * u * 0.8}px, ${ly}px) translate(${it.side < 0 ? "-100%" : "0"}, -50%)`
      // the leader: out from the label, then to the point
      const sx = lx - it.side * u * 0.7
      const ex = sx - it.side * u * 2.2
      const pts = [
        [sx, ly],
        [ex, ly],
        [it.ax, it.ay],
      ]
      const len = Math.hypot(ex - sx, 0) + Math.hypot(it.ax - ex, it.ay - ly)
      const lp = clamp((it.p - 0.15) / 0.85)
      s.line.setAttribute("points", pts.map((p) => p.join(",")).join(" "))
      s.line.setAttribute("stroke", ink)
      s.line.setAttribute("stroke-opacity", "0.8")
      s.line.setAttribute("stroke-width", String(Math.max(1, u * 0.085)))
      s.line.style.strokeDasharray = `${len} ${len}`
      s.line.style.strokeDashoffset = String(len * (1 - lp))
      s.dot.setAttribute("cx", String(it.ax))
      s.dot.setAttribute("cy", String(it.ay))
      s.dot.setAttribute("r", String(u * 0.3 * clamp((lp - 0.85) / 0.15)))
      s.dot.setAttribute("fill", ink)
    })
    for (let i = items.length; i < this.slots.length; i++) {
      const s = this.slots[i]
      s.box.style.display = "none"
      s.line.style.display = "none"
      s.dot.style.display = "none"
    }
  }

  dispose() {
    this.root.remove()
  }
}

/* ---------------- frames: one iframe per live animation, talked to by the view ---------------- */

type Registry = {
  add: (key: string, el: HTMLIFrameElement) => void
  update: (key: string, spec: FrameSpec) => void
  remove: (key: string, el: HTMLIFrameElement | null) => void
}

function Frame({ spec, reg, resolve }: { spec: FrameSpec; reg: Registry; resolve: Resolve }) {
  const el = useRef<HTMLIFrameElement>(null)
  // the address is set once per frame: theme, values and hairline change by message, so the animation keeps playing
  const src = useMemo(() => {
    const q = new URLSearchParams({
      ...spec.query,
      frame: spec.key,
      rm: "0",
      cs: spec.scheme,
      host: resolve.origin,
    })
    if (resolve.stepped) q.set("vt", "1")
    if (spec.hairline) q.set("hl", "1")
    if (spec.ink) q.set("ink", spec.ink)
    if (spec.fill) q.set("fill", spec.fill)
    return `${spec.path}?${q}`
  }, [spec.key, spec.path, JSON.stringify(spec.query), resolve.stepped, resolve.origin]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const x = el.current!
    reg.add(spec.key, x)
    return () => reg.remove(spec.key, x)
  }, [reg, spec.key])
  const said = JSON.stringify([spec.values, spec.scheme, spec.bare, spec.hairline, spec.ink, spec.fill])
  useEffect(() => reg.update(spec.key, spec), [reg, said]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={spec.box ?? { position: "absolute", inset: 0 }}>
      <iframe ref={el} title={spec.key} src={src} tabIndex={-1} className="pointer-events-none block h-full w-full border-0" style={{ background: "transparent" }} />
    </div>
  )
}

/* ---------------- titles ---------------- */

const FAMILY = {
  text: (b?: Brand) => `${b?.font ? `"${b.font}", ` : ""}Geist, Inter, system-ui, sans-serif`,
  display: (b?: Brand) => `${b?.display ? `"${b.display}", ` : b?.font ? `"${b.font}", ` : ""}Geist, Inter, system-ui, sans-serif`,
  mono: (b?: Brand) => `${b?.mono ? `"${b.mono}", ` : ""}"Geist Mono", ui-monospace, monospace`,
}

/** A title's words (or letters, or lines, or halves), as spans the view animates one by one. */
function textBody(l: TextLayer): ReactNode {
  if (l.enter === "type")
    return (
      <>
        {[...l.text].map((c, i) => (
          <span key={i} data-c="">
            {c}
          </span>
        ))}
        <span
          data-caret=""
          style={{
            display: "inline-block",
            width: "0.06em",
            height: "0.95em",
            marginLeft: "0.04em",
            verticalAlign: "-0.1em",
            background: "currentColor",
          }}
        />
      </>
    )
  if (l.enter === "words" || l.enter === "sweep")
    return l.text.split(/(\s+)/).map((w, i) =>
      /^\s+$/.test(w) ? (
        w.includes("\n") ? (
          <br key={i} />
        ) : (
          w
        )
      ) : (
        <span key={i} data-w="" style={{ display: "inline-block" }}>
          {w}
        </span>
      ),
    )
  if (l.enter === "part") {
    const [a, b = ""] = l.text.split("|")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          justifyContent: "center",
          whiteSpace: "nowrap",
        }}
      >
        <span data-half="0">{a.trim()}</span>
        <span data-gap="" style={{ display: "inline-block", width: 0 }} />
        <span data-half="1">{b.trim()}</span>
      </span>
    )
  }
  if (l.enter === "mask")
    return l.text.split("\n").map((line, i) => (
      <span
        key={i}
        style={{
          display: "block",
          overflow: "hidden",
          paddingBottom: "0.08em",
        }}
      >
        <span data-line="" style={{ display: "block" }}>
          {line}
        </span>
      </span>
    ))
  return l.text
}

/** Moves a title's pieces for `t` seconds into its own entrance. */
function animateText(box: HTMLElement, l: TextLayer, t: number) {
  if (l.enter === "type") {
    const chars = box.querySelectorAll<HTMLElement>("[data-c]")
    const shown = Math.max(0, Math.floor(t / 0.045))
    chars.forEach((c, i) => (c.style.display = i < shown ? "" : "none"))
    const caret = box.querySelector<HTMLElement>("[data-caret]")
    if (caret) {
      const typing = shown < chars.length
      const after = t - chars.length * 0.045
      caret.style.opacity = t < 0 ? "0" : typing || Math.floor(after * 2) % 2 === 0 ? "1" : "0"
      if (after > 2.2) caret.style.opacity = "0"
    }
  } else if (l.enter === "words") {
    box.querySelectorAll<HTMLElement>("[data-w]").forEach((w, i) => {
      const k = clamp((t - i * 0.07) / 0.55)
      const e = expoOut(k)
      w.style.opacity = String(clamp(k * 2))
      w.style.transform = `translateY(${(1 - e) * 0.45}em)`
      w.style.filter = k < 1 ? `blur(${(1 - e) * 0.18}em)` : ""
    })
  } else if (l.enter === "sweep") {
    const words = box.querySelectorAll<HTMLElement>("[data-w]")
    // a light runs across the words, each brightening as it passes and staying lit
    const head = (t / 1.5) * (words.length + 1.5) - 0.5
    words.forEach((w, i) => {
      const lit = clamp(head - i)
      w.style.opacity = String(0.24 + 0.76 * inOut(lit))
    })
  } else if (l.enter === "part") {
    const k = expoOut(t / 1.1)
    const gap = box.querySelector<HTMLElement>("[data-gap]")
    if (gap) gap.style.width = `${(l.gap ?? 22) * k}cqw`
    box.querySelectorAll<HTMLElement>("[data-half]").forEach((h, i) => {
      h.style.opacity = String(clamp(t / 0.5))
      h.style.transform = `translateX(${(1 - k) * (i ? -1 : 1) * 1.2}cqw)`
    })
  } else if (l.enter === "mask") {
    box.querySelectorAll<HTMLElement>("[data-line]").forEach((line, i) => {
      const e = expoOut((t - i * 0.1) / 0.75)
      line.style.transform = `translateY(${(1 - e) * 110}%)`
    })
  }
}

/* ---------------- component shots ---------------- */

/** The camera on a component at `t` seconds into a `dur`-second scene. */
function shotTransform(l: ComponentLayer, t: number, dur: number, footW: number): { transform: string; origin: string } {
  const u = clamp(t / Math.max(0.1, dur))
  const persp = `perspective(${Math.round(footW * 2.4)}px)`
  switch (l.shot) {
    case "tilt": {
      const k = expoOut(t / 2.4)
      const ry = -20 * (1 - k) - 5 + 2 * Math.sin(t * 0.6)
      return {
        transform: `${persp} rotateX(${26 * (1 - k) + 7}deg) rotateY(${ry}deg) rotateZ(${3 * (1 - k)}deg) scale(${0.9 + 0.1 * k})`,
        origin: "50% 50%",
      }
    }
    case "dolly":
      return {
        transform: `${persp} rotateX(${12 - 4 * u}deg) rotateY(${-12 + 7 * inOut(u)}deg) scale(${0.93 + 0.16 * inOut(u)})`,
        origin: "50% 50%",
      }
    case "macro":
      // the magnification itself is done with zoom, so the close-up is drawn at its size, not blown up
      return {
        transform: `${persp} rotateX(6deg) rotateY(${-5 + 6 * u}deg)`,
        origin: "50% 50%",
      }
    case "float":
      return {
        transform: `${persp} rotateX(${4 + 4 * Math.sin((2 * Math.PI * t) / 7)}deg) rotateY(${9 * Math.sin((2 * Math.PI * t) / 6)}deg) translateY(${Math.sin((2 * Math.PI * t) / 6.5) * 0.8}%)`,
        origin: "50% 50%",
      }
    case "orbit":
      return {
        transform: `${persp} rotateX(8deg) rotateY(${-28 + 56 * inOut(u)}deg)`,
        origin: "50% 50%",
      }
    default:
      return { transform: "", origin: "50% 50%" }
  }
}

/* ---------------- one scene ---------------- */

type SceneHandle = {
  el: HTMLDivElement | null
  render: (local: number, drag?: Drag) => void
}

const SceneView = forwardRef<
  SceneHandle,
  {
    scene: Scene
    comp: Comp
    size: { w: number; h: number }
    resolve: Resolve
    reg: Registry
    inks: Record<string, ScreenInk>
    parts: Record<string, PartsReport>
    fill: string
    preserve: boolean
    /** near the playhead: its live frames are loaded (far scenes keep only their layout) */
    live: boolean
  }
>(function SceneView({ scene, comp, size, resolve, reg, inks, parts, fill, preserve, live }, ref) {
  const el = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [studio, setStudio] = useState<StudioScene | null>(null)
  const devices = devicesOf(scene)
  const flats = useRef(new Map<string, HTMLDivElement>())
  const labels = useRef<Labels | null>(null)
  const has3d = devices.length > 0
  const brand = comp.brand
  const onDark = isDark(fill)
  const ink = labelInk(fill)

  useEffect(() => {
    if (!has3d) return
    const s = new StudioScene(host.current!, { preserve })
    setStudio(s)
    return () => {
      s.dispose()
      setStudio(null)
    }
  }, [has3d, preserve])
  useEffect(() => {
    labels.current = new Labels(el.current!)
    return () => labels.current?.dispose()
  }, [])

  const placed = devices.map((l) => ({
    key: l.id,
    id: l.device,
    posture: l.posture,
    landscape: l.landscape && deviceOf(l).rotates,
    finish: finishFor(l),
    screenBg: resolve.screen(l.content, deviceOf(l), l.id, false).bg,
    slot: l.slot,
  }))
  const sig = JSON.stringify(placed.map((p) => [p.key, p.id, p.posture, p.landscape, p.finish.id, p.screenBg, p.slot]))
  useEffect(() => {
    studio?.setDevices(placed)
  }, [studio, sig]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () =>
      studio?.setLook({
        shadow: comp.shadow,
        reflections: comp.reflections,
        light: comp.light,
      }),
    [studio, comp.shadow, comp.reflections, comp.light],
  )
  useEffect(() => {
    if (size.w && size.h) studio?.resize(size.w, size.h, preserve ? devicePixelRatio : Math.min(devicePixelRatio, 2))
  }, [studio, size.w, size.h, preserve])

  /** the components a breakdown's whole screen reported; until it has, what the same screen said in another scene (so a
      close-up can load its component straight away, not after its screen) */
  const partsFor = (l: BreakdownLayer) =>
    parts[`${scene.id}:${l.id}:full`] ??
    comp.scenes
      .flatMap((s) => s.layers.map((x) => (x.kind === "breakdown" && x.anim === l.anim && (x.mockup === "tablet") === (l.mockup === "tablet") ? parts[`${s.id}:${x.id}:full`] : undefined)))
      .find(Boolean)
  const font = FAMILY.text(brand)
  /** a title's "{part}" is the name of the component this scene's close-up shows, "{note}" what's in it */
  const fillText = (s: string) => {
    if (!s.includes("{")) return s
    const bd = scene.layers.find((x): x is BreakdownLayer => x.kind === "breakdown" && x.view === "focus" && !x.hidden)
    const f = bd ? focusOf(bd, partsFor(bd)) : null
    return s.replace(/\{part\}/g, f?.name ?? "").replace(/\{note\}/g, f?.it.note ?? "")
  }

  useImperativeHandle(
    ref,
    () => ({
      get el() {
        return el.current
      },
      render(local, drag) {
        const items: LabelItem[] = []
        const root = el.current
        const R = root?.getBoundingClientRect()
        const k = R && R.width ? size.w / R.width : 1
        const inScene = (r: DOMRect) => ({
          x: (r.left + r.width / 2 - (R?.left ?? 0)) * k,
          y: (r.top + r.height / 2 - (R?.top ?? 0)) * k,
        })
        if (studio && has3d) {
          const apart = apartAt(scene.teardown, local)
          studio.setPose(move(scene.move, cameraPose(scene, drag), local, scene.duration), { at: scene.frame, arrival: scene.arrival, t: local, apart })
          studio.render()
          studio.partMarks().forEach((m, i) =>
            items.push({
              key: m.key,
              name: m.name,
              ax: m.x,
              ay: m.y,
              side: m.side,
              p: clamp((apart - 0.5) / 0.4 - i * 0.08),
            }),
          )
        }
        // flat layers come in one after another, a beat after the scene starts
        let n = 0
        for (const l of scene.layers) {
          if (l.kind === "device" || l.hidden) continue
          const box = flats.current.get(l.id)
          if (!box) continue
          const t0 = local - 0.25 - n * 0.12
          const special = l.kind === "text" && ["words", "type", "part", "mask"].includes(l.enter)
          const e = entering(special ? "none" : l.enter, t0 / 0.9)
          box.style.opacity = String(e.opacity)
          box.style.transform = l.kind === "breakdown" ? e.transform : `translate(-50%, -50%) ${e.transform}`
          box.style.filter = e.filter
          n++
          if (l.kind === "text") animateText(box, l, t0)
          else if (l.kind === "component" && l.shot && l.shot !== "flat") {
            const card = box.querySelector<HTMLElement>("[data-shot]")
            if (card) {
              const s = shotTransform(l, local, scene.duration, l.box.w * size.w)
              card.style.transform = s.transform
              card.style.transformOrigin = s.origin
            }
            if (l.shot === "macro") {
              // an extreme close-up gliding across one part of it: zoomed in, the focus held near the middle
              const u = clamp(local / Math.max(0.1, scene.duration))
              const W = 420
              const H = W / l.aspect
              const k = (l.box.w * size.w) / W
              const mz = 2.35 + 0.2 * u
              const f = l.focus ?? { x: 0.5, y: 0.35 }
              const fx = f.x + (u - 0.5) * 0.16
              const bw = l.box.w * size.w
              const zoomEl = box.querySelector<HTMLElement>("[data-zoom]")
              const pan = box.querySelector<HTMLElement>("[data-pan]")
              if (zoomEl) zoomEl.style.zoom = String(k * mz)
              if (pan) pan.style.transform = `translate(${0.5 * bw - fx * W * k * mz}px, ${0.5 * (bw / l.aspect) - f.y * H * k * mz}px)`
            }
          } else if (l.kind === "callout") {
            items.push({
              key: l.id,
              name: l.text,
              note: l.sub,
              ax: l.at.x * size.w,
              ay: l.at.y * size.h,
              side: l.at.x >= l.box.x ? -1 : 1,
              lx: l.box.x * size.w,
              ly: l.box.y * size.h,
              p: clamp(t0 / 1.1),
            })
            box.style.opacity = "0" // the label itself is drawn with the leader
          } else if (l.kind === "breakdown") {
            const marks = animateBreakdown(box, l, partsFor(l), local, scene, size, inScene)
            if (l.labels) items.push(...marks)
          }
        }
        labels.current?.draw(items, size.w, size.h, ink, font)
      },
    }),
    [studio, has3d, scene, size.w, size.h, ink, font, parts], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const first3d = scene.layers.findIndex((l) => l.kind === "device" && !l.hidden)
  const textColor = (c: string) => c || (onDark ? "#fafafa" : brand && !brand.dark ? brand.ink : "#0a0a0b")
  const scheme = onDark ? "dark" : "light"
  const flat = (l: FlatLayer) => {
    const style: CSSProperties =
      l.kind === "breakdown"
        ? { position: "absolute", inset: 0 }
        : {
            position: "absolute",
            left: `${l.box.x * 100}%`,
            top: `${l.box.y * 100}%`,
            width: `${l.box.w * 100}%`,
            transform: "translate(-50%, -50%)",
          }
    const W = 420
    const k = (l.box.w * size.w) / W
    let inner: ReactNode
    if (l.kind === "text") {
      const display = l.font === "display"
      const mono = l.font === "mono"
      inner = (
        <p
          className="m-0 whitespace-pre-wrap text-balance"
          style={{
            fontSize: `${l.size}cqw`,
            fontWeight: l.weight,
            textAlign: l.align,
            lineHeight: display ? 0.92 : mono ? 1.3 : 1.04,
            letterSpacing: display ? "-0.05em" : mono ? "0.16em" : "-0.035em",
            textTransform: mono ? "uppercase" : undefined,
            color: textColor(l.color),
            fontFamily: display ? FAMILY.display(brand) : mono ? FAMILY.mono(brand) : FAMILY.text(brand),
          }}
        >
          {textBody({ ...l, text: fillText(l.text) })}
        </p>
      )
    } else if (l.kind === "image")
      inner = (
        <img
          src={resolve.image(l.src)}
          alt=""
          draggable={false}
          className="block w-full"
          style={{
            aspectRatio: l.aspect,
            objectFit: "cover",
            borderRadius: `${l.radius}cqw`,
            ...(l.hairline ? hairline(onDark) : {}),
          }}
        />
      )
    else if (l.kind === "callout")
      // the label and its line are drawn by the scene's labels; this box is what the stage picks and drags
      inner = <div style={{ height: "2.4cqw" }} />
    else if (l.kind === "breakdown") {
      const key = (w: "full" | "none" | number) => `${scene.id}:${l.id}:${w}`
      inner = (
        <BreakdownBody
          l={l}
          report={partsFor(l)}
          size={size}
          dark={resolve.dark}
          ink={ink}
          font={font}
          frame={(w) => (live ? <Frame spec={resolve.part(l.anim, key(w), w, l.lines, scheme)} reg={reg} resolve={resolve} /> : null)}
        />
      )
    } else {
      // the animation runs at a phone-like width and is scaled to the box, so it lays out the same at any frame size
      const spec = resolve.component(l.anim, `${scene.id}:${l.id}`, !!l.hairline, scheme)
      const macro = l.shot === "macro"
      const frame = live ? <Frame spec={spec} reg={reg} resolve={resolve} /> : null
      inner = (
        <div className={`relative w-full ${macro ? "overflow-hidden" : ""}`} style={{ aspectRatio: l.aspect, borderRadius: "1.2cqw" }}>
          <div data-shot="" className="absolute inset-0 overflow-hidden" style={{ borderRadius: "1.2cqw" }}>
            {/* zoom, not a scale: the frame is drawn at the size it's shown, so it stays sharp at 4K and in a close-up */}
            <div data-pan="" className="absolute left-0 top-0">
              <div data-zoom="" style={{ width: W, height: W / l.aspect, zoom: k || 0.0001 }}>
                {frame}
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div
        key={l.id}
        data-layer={l.id}
        ref={(x) => {
          if (x) flats.current.set(l.id, x)
          else flats.current.delete(l.id)
        }}
        style={style}
      >
        {inner}
      </div>
    )
  }

  return (
    <div ref={el} data-scene={scene.id} className="absolute inset-0" style={{ visibility: "hidden" }}>
      {scene.layers.map((l, i) => {
        if (l.hidden) return null
        if (l.kind !== "device") return flat(l)
        if (i !== first3d) return null
        return <div key="3d" ref={host} className="absolute inset-0" />
      })}
      {studio &&
        devices.map((l) => {
          const d = deviceOf(l)
          const screen = resolve.screen(l.content, d, l.id, !!l.hairline)
          const ink = screen.frames
            .map((f) => inks[f.key])
            .filter((x) => x?.top || x?.bottom)
            .at(-1)
          return createPortal(
            <ScreenShell d={d} landscape={l.landscape && d.rotates} posture={l.posture} dark={resolve.dark} ink={ink} bg={screen.bg}>
              {screen.image && <img src={resolve.image(screen.image)} alt="" className="absolute inset-0 h-full w-full object-cover" style={l.hairline ? hairline(resolve.dark) : undefined} />}
              {screen.media &&
                (screen.media.video ? (
                  <video src={screen.media.url} autoPlay={!resolve.stepped} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <img src={screen.media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ))}
              {live && screen.frames.map((f) => <Frame key={f.key} spec={f} reg={reg} resolve={resolve} />)}
            </ScreenShell>,
            studio.slotOf(l.id),
            l.id,
          )
        })}
    </div>
  )
})

/* ---------------- the composition ---------------- */

export const CompositionView = forwardRef<ViewHandle, { comp: Comp; resolve: Resolve; preserve?: boolean; className?: string }>(function CompositionView(
  { comp, resolve, preserve = false, className = "" },
  ref,
) {
  const root = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = root.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the brand's fonts, once each
  const fonts = comp.brand?.fonts ?? []
  useEffect(() => {
    for (const href of fonts) {
      if ([...document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]")].some((l) => l.href === href)) continue
      document.head.appendChild(
        Object.assign(document.createElement("link"), {
          rel: "stylesheet",
          href,
        }),
      )
    }
  }, [fonts.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps

  // every frame, by key: what it should show, and whether it has said it's ready to be told
  type Entry = { el: HTMLIFrameElement; spec?: FrameSpec; ready: boolean }
  const frames = useRef(new Map<string, Entry>())
  const [inks, setInks] = useState<Record<string, ScreenInk>>({})
  const [parts, setParts] = useState<Record<string, PartsReport>>({})
  // the scene at the playhead and its neighbours load their frames; the rest wait
  const [near, setNear] = useState(0)
  const nearRef = useRef(0)
  const tell = (f: Entry) => {
    if (!f.ready || !f.spec) return
    const post = (msg: object) => f.el.contentWindow?.postMessage({ source: "anim-engine-host", ...msg }, resolve.origin)
    post({ type: "theme", scheme: f.spec.scheme })
    post({ type: "params", values: f.spec.values })
    post({ type: "bare", on: f.spec.bare })
    post({
      type: "hairline",
      on: f.spec.hairline,
      ink: f.spec.ink ?? "",
      fill: f.spec.fill ?? "ground",
    })
  }
  const reg: Registry = useMemo(
    () => ({
      add(key, el) {
        frames.current.set(key, {
          el,
          ready: false,
          spec: frames.current.get(key)?.spec,
        })
      },
      update(key, spec) {
        const f = frames.current.get(key)
        if (!f) return
        f.spec = spec
        tell(f)
      },
      remove(key, el) {
        if (frames.current.get(key)?.el === el) frames.current.delete(key)
      },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (e.origin !== resolve.origin || d?.source !== "anim-engine-stage" || typeof d.frame !== "string") return
      const f = frames.current.get(d.frame)
      if (!f || e.source !== f.el.contentWindow) return
      if (d.type === "ready") {
        setInks(({ [d.frame]: _, ...rest }) => rest)
        f.ready = true
        tell(f)
      } else if (d.type === "status") {
        const ink = (k: string) => (d[k] === "light" || d[k] === "dark" ? d[k] : undefined)
        setInks((x) => ({
          ...x,
          [d.frame]: { top: ink("top"), bottom: ink("bottom") },
        }))
      } else if (d.type === "parts" && Array.isArray(d.items))
        setParts((x) => ({
          ...x,
          [d.frame]: { w: d.w, h: d.h, ground: d.ground, items: d.items },
        }))
    }
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [resolve.origin]) // eslint-disable-line react-hooks/exhaustive-deps

  const scenes = useMemo(() => comp.scenes.map(() => createRef<SceneHandle>()), [comp.scenes])
  // what a frame reports (its components) can change the picture: draw the last moment again when it arrives
  const last = useRef<{ t: number; drag?: Drag } | null>(null)
  const handle = useRef<ViewHandle | null>(null)
  useEffect(() => {
    if (last.current) handle.current?.render(last.current.t, last.current.drag)
  }, [parts])
  const looks = useMemo(() => direct(comp), [comp])
  const grounds = useRef<(HTMLDivElement | null)[]>([])

  useImperativeHandle(
    ref,
    () =>
      (handle.current = {
        render(t, drag) {
          last.current = { t, drag }
          const { i, local, prev } = at(comp, t)
          if (i !== nearRef.current) {
            nearRef.current = i
            setNear(i)
          }
          comp.scenes.forEach((s, j) => {
            const h = scenes[j].current
            const el = h?.el
            if (!h || !el) return
            const on = j === i || (prev && j === prev.i)
            el.style.visibility = on ? "visible" : "hidden"
            if (!on) return
            const css = prev ? handover(comp.scenes[i].transition, prev.k, j === i) : {}
            el.style.opacity = String(css.opacity ?? 1)
            el.style.transform = String(css.transform ?? "")
            el.style.filter = String(css.filter ?? "")
            el.style.zIndex = j === i ? "2" : "1"
            h.render(j === i ? local : prev!.local, j === i ? drag : undefined)
          })
          // the grounds blend into each other a little longer than the scenes hand over (a cut is a cut)
          const cur = comp.scenes[i]
          const same = i > 0 && JSON.stringify(looks[i - 1]) === JSON.stringify(looks[i])
          const kb = i === 0 || cur.transition === "cut" || same ? 1 : inOut(local / 0.9)
          grounds.current.forEach((g, j) => {
            if (!g) return
            const shown = j === i || (j === i - 1 && kb < 1)
            g.style.visibility = shown ? "visible" : "hidden"
            g.style.opacity = j === i ? String(kb) : "1"
            g.style.zIndex = j === i ? "1" : "0"
          })
        },
        frames: () => [...frames.current.values()].map((f) => f.el),
      }),
    [comp, scenes, looks],
  )

  return (
    <div ref={root} className={`absolute inset-0 overflow-hidden [container-type:size] ${className}`}>
      {comp.scenes.map((s, j) => (
        <div
          key={`bg-${s.id}`}
          ref={(x) => {
            grounds.current[j] = x
          }}
          className="absolute inset-0"
          style={{ visibility: j === 0 ? "visible" : "hidden" }}
        >
          <Backdrop fill={looks[j].fill} effect={looks[j].effect} ink={looks[j].ink} amount={looks[j].amount} title={comp.brand?.name} />
        </div>
      ))}
      {comp.scenes.map((s, j) => (
        <SceneView
          key={s.id}
          ref={scenes[j] as RefObject<SceneHandle>}
          scene={s}
          comp={comp}
          size={size}
          resolve={resolve}
          reg={reg}
          inks={inks}
          parts={parts}
          fill={looks[j].fill}
          preserve={preserve}
          live={Math.abs(j - near) <= 1}
        />
      ))}
      <HairlineDefs />
    </div>
  )
})
