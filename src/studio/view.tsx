// Studio — draws a composition. Every scene is a layer of its own: its devices (one 3D scene, so they share one camera
// and one perspective) and its flat layers (component animations, pictures, titles), stacked in the scene's order.
// Time decides which scene shows and how the next one takes over. The engine's preview and the export page both draw
// with this; the clock is theirs (real in the engine, stepped by hand for an export).
import { createRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { DEVICES, type Device, type ScreenInk } from "../devices"
import type { Values } from "../registry"
import { at, devicesOf, type Comp, type Content, type DeviceLayer, type FlatLayer, type Scene, type Transition } from "./comp"
import { FINISHES, type Finish } from "./finishes"
import { Backdrop, HairlineDefs, hairline, isDark } from "./look"
import { angle, move, type Pose } from "./poses"
import { StudioScene } from "./scene"
import { ScreenShell } from "./shell"

/** One live frame: an animation, its values, and on a built screen its box. */
export type FrameSpec = { key: string; path: string; query: Record<string, string>; values: Values; box?: CSSProperties; bare: boolean; hairline: boolean; scheme: "light" | "dark" }
/** What one device's screen shows. */
export type ScreenSpec = { frames: FrameSpec[]; bg: string; media?: { url: string; video: boolean }; image?: string }
/** How the view turns a composition's references into things it can load. The engine and the export page differ. */
export type Resolve = {
  screen: (content: Content, d: Device, key: string, hairline: boolean) => ScreenSpec
  component: (anim: string, key: string, hairline: boolean, scheme: "light" | "dark") => FrameSpec
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
  return { ...p, yaw: p.yaw + yaw, elev: Math.max(-30, Math.min(85, p.elev + elev)), zoom: p.zoom * c.zoom * (drag?.zoom ?? 1), fov: c.fov ?? p.fov }
}

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)))
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

/** How a scene looks while it hands over: `k` runs 0 → 1 across the transition. */
function handover(tr: Transition, k: number, incoming: boolean): CSSProperties {
  const e = inOut(k)
  switch (tr) {
    case "dissolve":
      return incoming ? { opacity: e } : {}
    case "fade":
      return incoming ? { opacity: clamp(e * 2 - 1) } : { opacity: clamp(1 - e * 2) }
    case "push":
      return { transform: `translateX(${incoming ? (1 - e) * 100 : -e * 100}%)` }
    case "zoom":
      return incoming ? { opacity: e, transform: `scale(${0.86 + 0.14 * e})` } : { opacity: 1 - e, transform: `scale(${1 + 0.22 * e})` }
    case "blur":
      return incoming ? { opacity: e, filter: `blur(${(1 - e) * 1.4}cqw)` } : { opacity: 1 - e, filter: `blur(${e * 1.4}cqw)` }
    default:
      return incoming ? {} : { opacity: 0 }
  }
}

/** A flat layer's way in, `k` 0 → 1. */
function entering(enter: FlatLayer["enter"], k: number): { opacity: number; transform: string; filter: string } {
  const e = expoOut(k)
  switch (enter) {
    case "rise":
      return { opacity: clamp(k * 2.2), transform: `translateY(${(1 - e) * 4}cqh)`, filter: "" }
    case "scale":
      return { opacity: clamp(k * 2.2), transform: `scale(${0.94 + 0.06 * e})`, filter: "" }
    case "blur":
      return { opacity: clamp(k * 1.8), transform: `translateY(${(1 - e) * 1.5}cqh)`, filter: `blur(${(1 - e) * 0.8}cqw)` }
    case "fade":
      return { opacity: clamp(k * 1.6), transform: "", filter: "" }
    default:
      return { opacity: 1, transform: "", filter: "" }
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
    const q = new URLSearchParams({ ...spec.query, frame: spec.key, rm: "0", cs: spec.scheme, host: resolve.origin })
    if (resolve.stepped) q.set("vt", "1")
    if (spec.hairline) q.set("hl", "1")
    return `${spec.path}?${q}`
  }, [spec.key, spec.path, JSON.stringify(spec.query), resolve.stepped, resolve.origin]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const x = el.current!
    reg.add(spec.key, x)
    return () => reg.remove(spec.key, x)
  }, [reg, spec.key])
  const said = JSON.stringify([spec.values, spec.scheme, spec.bare, spec.hairline])
  useEffect(() => reg.update(spec.key, spec), [reg, said]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={spec.box ?? { position: "absolute", inset: 0 }}>
      <iframe ref={el} title={spec.key} src={src} tabIndex={-1} className="pointer-events-none block h-full w-full border-0" style={{ background: "transparent" }} />
    </div>
  )
}

/* ---------------- one scene ---------------- */

type SceneHandle = { el: HTMLDivElement | null; render: (local: number, drag?: Drag) => void }

const SceneView = forwardRef<
  SceneHandle,
  { scene: Scene; comp: Comp; size: { w: number; h: number }; resolve: Resolve; reg: Registry; inks: Record<string, ScreenInk>; preserve: boolean }
>(function SceneView({ scene, comp, size, resolve, reg, inks, preserve }, ref) {
  const el = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [studio, setStudio] = useState<StudioScene | null>(null)
  const devices = devicesOf(scene)
  const flats = useRef(new Map<string, HTMLDivElement>())
  const has3d = devices.length > 0

  useEffect(() => {
    if (!has3d) return
    const s = new StudioScene(host.current!, { preserve })
    setStudio(s)
    return () => {
      s.dispose()
      setStudio(null)
    }
  }, [has3d, preserve])

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
  useEffect(() => studio?.setLook({ shadow: comp.shadow, reflections: comp.reflections, light: comp.light }), [studio, comp.shadow, comp.reflections, comp.light])
  useEffect(() => {
    if (size.w && size.h) studio?.resize(size.w, size.h, preserve ? devicePixelRatio : Math.min(devicePixelRatio, 2))
  }, [studio, size.w, size.h, preserve])

  useImperativeHandle(
    ref,
    () => ({
      get el() {
        return el.current
      },
      render(local, drag) {
        if (studio && has3d) {
          studio.setPose(move(scene.move, cameraPose(scene, drag), local, scene.duration), { at: scene.frame, arrival: scene.arrival, t: local })
          studio.render()
        }
        // flat layers come in one after another, a beat after the scene starts
        let n = 0
        for (const l of scene.layers) {
          if (l.kind === "device" || l.hidden) continue
          const box = flats.current.get(l.id)
          if (!box) continue
          const e = entering(l.enter, (local - 0.25 - n * 0.12) / 0.9)
          box.style.opacity = String(e.opacity)
          box.style.transform = `translate(-50%, -50%) ${e.transform}`
          box.style.filter = e.filter
          n++
        }
      },
    }),
    [studio, has3d, scene],
  )

  const onDark = isDark(comp.fill)
  const first3d = scene.layers.findIndex((l) => l.kind === "device" && !l.hidden)
  const flat = (l: FlatLayer) => {
    const style: CSSProperties = { position: "absolute", left: `${l.box.x * 100}%`, top: `${l.box.y * 100}%`, width: `${l.box.w * 100}%`, transform: "translate(-50%, -50%)" }
    let inner: ReactNode
    if (l.kind === "text")
      inner = (
        <p
          className="m-0 whitespace-pre-wrap text-balance"
          style={{ fontSize: `${l.size}cqw`, fontWeight: l.weight, textAlign: l.align, lineHeight: 1.02, letterSpacing: "-0.035em", color: l.color || (onDark ? "#fafafa" : "#0a0a0b"), fontFamily: "Geist, Inter, system-ui, sans-serif" }}
        >
          {l.text}
        </p>
      )
    else if (l.kind === "image")
      inner = <img src={resolve.image(l.src)} alt="" draggable={false} className="block w-full" style={{ aspectRatio: l.aspect, objectFit: "cover", borderRadius: `${l.radius}cqw`, ...(l.hairline ? hairline(onDark) : {}) }} />
    else {
      // the animation runs at a phone-like width and is scaled to the box, so it lays out the same at any frame size
      const W = 420
      const k = (l.box.w * size.w) / W
      const spec = resolve.component(l.anim, `${scene.id}:${l.id}`, !!l.hairline, onDark ? "dark" : "light")
      inner = (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: l.aspect, borderRadius: "1.2cqw" }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: W / l.aspect, transform: `scale(${k || 0.0001})` }}>
            <Frame spec={spec} reg={reg} resolve={resolve} />
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
          const ink = screen.frames.map((f) => inks[f.key]).filter((x) => x?.top || x?.bottom).at(-1)
          return createPortal(
            <ScreenShell d={d} landscape={l.landscape && d.rotates} posture={l.posture} dark={resolve.dark} ink={ink} bg={screen.bg}>
              {screen.image && <img src={resolve.image(screen.image)} alt="" className="absolute inset-0 h-full w-full object-cover" style={l.hairline ? hairline(resolve.dark) : undefined} />}
              {screen.media &&
                (screen.media.video ? (
                  <video src={screen.media.url} autoPlay={!resolve.stepped} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <img src={screen.media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ))}
              {screen.frames.map((f) => (
                <Frame key={f.key} spec={f} reg={reg} resolve={resolve} />
              ))}
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

  // every frame, by key: what it should show, and whether it has said it's ready to be told
  type Entry = { el: HTMLIFrameElement; spec?: FrameSpec; ready: boolean }
  const frames = useRef(new Map<string, Entry>())
  const [inks, setInks] = useState<Record<string, ScreenInk>>({})
  const tell = (f: Entry) => {
    if (!f.ready || !f.spec) return
    const post = (msg: object) => f.el.contentWindow?.postMessage({ source: "anim-engine-host", ...msg }, resolve.origin)
    post({ type: "theme", scheme: f.spec.scheme })
    post({ type: "params", values: f.spec.values })
    post({ type: "bare", on: f.spec.bare })
    post({ type: "hairline", on: f.spec.hairline })
  }
  const reg: Registry = useMemo(
    () => ({
      add(key, el) {
        frames.current.set(key, { el, ready: false, spec: frames.current.get(key)?.spec })
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
        setInks((x) => ({ ...x, [d.frame]: { top: ink("top"), bottom: ink("bottom") } }))
      }
    }
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [resolve.origin]) // eslint-disable-line react-hooks/exhaustive-deps

  const scenes = useMemo(() => comp.scenes.map(() => createRef<SceneHandle>()), [comp.scenes])

  useImperativeHandle(
    ref,
    () => ({
      render(t, drag) {
        const { i, local, prev } = at(comp, t)
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
      },
      frames: () => [...frames.current.values()].map((f) => f.el),
    }),
    [comp, scenes],
  )

  return (
    <div ref={root} className={`absolute inset-0 overflow-hidden [container-type:size] ${className}`}>
      <Backdrop fill={comp.fill} effect={comp.effect} ink={comp.ink} amount={comp.amount} />
      {comp.scenes.map((s, j) => (
        <SceneView key={s.id} ref={scenes[j] as RefObject<SceneHandle>} scene={s} comp={comp} size={size} resolve={resolve} reg={reg} inks={inks} preserve={preserve} />
      ))}
      <HairlineDefs />
    </div>
  )
})
