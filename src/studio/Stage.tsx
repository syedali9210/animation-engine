// Studio — the engine's stage: the composition in its export frame, played on the real clock, with the timeline under
// it. Things are edited where they are: drag a component, picture or title to move it (its corner resizes it), drag
// anywhere else to turn the camera of the scene that's showing, scroll or pinch to zoom, double-click to reset.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"
import { Pause, Play, Plus } from "@phosphor-icons/react"
import type { DeviceId } from "../devices"
import { IconButton } from "../ui"
import { addDevice, at, total, type Comp, type FlatLayer, type Scene } from "./comp"
import { SIZES } from "./config"
import { CompositionView, type Drag, type Resolve, type ViewHandle } from "./view"

/** Transparent, shown the way image editors show it. */
const CHECKER = "repeating-conic-gradient(#e4e4e8 0% 25%, #f6f6f8 0% 50%) 50% / 16px 16px"
const fine = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches
const clampZoom = (z: number) => Math.min(3, Math.max(0.35, z))
const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`

export type Sel = { scene: string; layer?: string }

export default function StudioStage({
  comp,
  setComp,
  resolve,
  sel,
  setSel,
  playing,
  setPlaying,
  onAddScene,
  compact,
}: {
  comp: Comp
  setComp: (fn: (c: Comp) => Comp) => void
  resolve: Resolve
  sel: Sel
  setSel: (s: Sel) => void
  playing: boolean
  setPlaying: (on: boolean) => void
  onAddScene: () => void
  /** phones and short windows: tighter margins */
  compact?: boolean
}) {
  const PAD = compact ? 12 : 28
  const area = useRef<HTMLDivElement>(null)
  const shield = useRef<HTMLDivElement>(null)
  const view = useRef<ViewHandle>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const size = SIZES.find((x) => x.id === comp.size) ?? SIZES[0]
  const k = Math.max(0, Math.min((box.w - PAD * 2) / size.w, (box.h - PAD * 2) / size.h))
  const fw = Math.round(size.w * k)
  const fh = Math.round(size.h * k)
  useEffect(() => {
    const el = area.current!
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ---------- the clock ---------- */
  const len = total(comp)
  const time = useRef(0)
  const t0 = useRef(performance.now())
  const drag = useRef<Drag>({ yaw: 0, elev: 0, zoom: 1 })
  const live = useRef({ playing, len })
  live.current = { playing, len }
  const head = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const outline = useRef<HTMLDivElement>(null)
  const selRef = useRef(sel)
  selRef.current = sel
  const req = useRef(0)
  const draw = useCallback(() => {
    if (req.current) return
    req.current = requestAnimationFrame(() => {
      req.current = 0
      const { playing: on, len: L } = live.current
      if (on) time.current = ((performance.now() - t0.current) / 1000) % Math.max(0.1, L)
      const t = Math.min(time.current, Math.max(0, L - 0.001))
      view.current?.render(t, drag.current)
      if (head.current) head.current.style.left = `${(t / Math.max(0.1, L)) * 100}%`
      if (clock.current) clock.current.textContent = `${fmt(t)} / ${fmt(L)}`
      // the picked flat layer gets an outline and a corner to resize it by, wherever it has moved to
      const o = outline.current
      if (o) {
        const s = selRef.current
        const el = s.layer ? area.current?.querySelector<HTMLElement>(`[data-scene="${s.scene}"] [data-layer="${s.layer}"]`) : null
        const vis = el && el.closest<HTMLElement>("[data-scene]")?.style.visibility === "visible"
        if (el && vis) {
          const r = el.getBoundingClientRect()
          const a = area.current!.getBoundingClientRect()
          Object.assign(o.style, { display: "block", left: `${r.left - a.left}px`, top: `${r.top - a.top}px`, width: `${r.width}px`, height: `${r.height}px` })
        } else o.style.display = "none"
      }
      if (on) draw()
    })
  }, [])
  useEffect(() => () => cancelAnimationFrame(req.current), [])
  useEffect(() => {
    if (playing) t0.current = performance.now() - time.current * 1000
    draw()
  }, [playing, draw])
  useEffect(draw, [comp, sel, fw, fh, draw])
  const seek = (t: number) => {
    time.current = Math.max(0, Math.min(len, t))
    if (live.current.playing) t0.current = performance.now() - time.current * 1000
    draw()
  }
  // for scripted checks: pause and show the composition at `t` seconds
  useEffect(() => {
    ;(window as unknown as { __studioSeek?: (t: number) => void }).__studioSeek = (t: number) => {
      setPlaying(false)
      seek(t)
    }
  })
  // picking a scene (in the layers or the timeline) shows it settled: its layers in, its camera on the shot
  useEffect(() => {
    if (live.current.playing) return
    const i = comp.scenes.findIndex((s) => s.id === sel.scene)
    if (i < 0 || at(comp, time.current).i === i) return
    const st = comp.scenes.slice(0, i).reduce((a, s) => a + s.duration, 0)
    seek(st + Math.min(1.8, comp.scenes[i].duration * 0.6))
  }, [sel.scene]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- editing on the stage ---------- */
  const current = (): Scene | undefined => comp.scenes[at(comp, time.current).i]
  const [hint, setHint] = useState(() => {
    try {
      return !localStorage.getItem("anim-engine:orbited")
    } catch {
      return false
    }
  })
  const learned = () => {
    if (!hint) return
    setHint(false)
    try {
      localStorage.setItem("anim-engine:orbited", "1")
    } catch {
      /* private mode: the hint just comes back next time */
    }
  }
  const updateScene = (id: string, fn: (s: Scene) => Scene) => setComp((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === id ? fn(s) : s)) }))
  const fingers = useRef(new Map<number, { x: number; y: number }>())
  type Gesture =
    | { kind: "orbit"; x: number; y: number; scene: string }
    | { kind: "move" | "size"; x: number; y: number; scene: string; layer: FlatLayer; el: HTMLElement; moved: boolean }
    | { kind: "pinch"; d: number; scene: string }
  const gesture = useRef<Gesture | null>(null)
  const spread = () => {
    const [a, b] = [...fingers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const begin = (e: PointerEvent<HTMLElement>, sizer: boolean) => {
    if (e.button !== 0) return
    const s = current()
    if (!s) return
    shield.current!.setPointerCapture(e.pointerId)
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (fingers.current.size === 2) {
      gesture.current = { kind: "pinch", d: spread(), scene: s.id }
      drag.current = { yaw: 0, elev: 0, zoom: 1 }
      return
    }
    // a flat layer under the pointer (the shield sits over the frame, so look through it)
    const hit = sizer
      ? area.current?.querySelector<HTMLElement>(`[data-scene="${s.id}"] [data-layer="${selRef.current.layer}"]`)
      : document.elementsFromPoint(e.clientX, e.clientY).find((n): n is HTMLElement => n instanceof HTMLElement && !!n.dataset.layer && n.closest<HTMLElement>("[data-scene]")?.dataset.scene === s.id)
    const layer = hit ? s.layers.find((l) => l.id === hit.dataset.layer) : undefined
    if (hit && layer && layer.kind !== "device") {
      setSel({ scene: s.id, layer: layer.id })
      gesture.current = { kind: sizer ? "size" : "move", x: e.clientX, y: e.clientY, scene: s.id, layer, el: hit, moved: false }
      return
    }
    if (selRef.current.scene !== s.id || selRef.current.layer) setSel({ scene: s.id })
    gesture.current = { kind: "orbit", x: e.clientX, y: e.clientY, scene: s.id }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!fingers.current.has(e.pointerId)) return
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (g.kind === "pinch") {
      if (fingers.current.size === 2) drag.current = { yaw: 0, elev: 0, zoom: spread() / g.d }
    } else if (g.kind === "orbit") drag.current = { yaw: (e.clientX - g.x) * 0.3, elev: (e.clientY - g.y) * 0.2, zoom: 1 }
    else if (g.kind === "move") {
      g.moved = true
      g.el.style.left = `${(g.layer.box.x + (e.clientX - g.x) / fw) * 100}%`
      g.el.style.top = `${(g.layer.box.y + (e.clientY - g.y) / fh) * 100}%`
    } else {
      g.moved = true
      g.el.style.width = `${Math.max(0.04, g.layer.box.w + (2 * (e.clientX - g.x)) / fw) * 100}%`
    }
    draw()
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    fingers.current.delete(e.pointerId)
    if (fingers.current.size) return
    const g = gesture.current
    gesture.current = null
    const d = drag.current
    drag.current = { yaw: 0, elev: 0, zoom: 1 }
    if (!g) return
    if (g.kind === "orbit" || g.kind === "pinch") {
      if (d.yaw || d.elev || d.zoom !== 1) {
        updateScene(g.scene, (s) => ({ ...s, camera: { ...s.camera, yaw: s.camera.yaw + d.yaw, elev: s.camera.elev + d.elev, zoom: clampZoom(s.camera.zoom * d.zoom) } }))
        learned()
      }
    } else if (g.moved) {
      const dx = (e.clientX - g.x) / fw
      const dy = (e.clientY - g.y) / fh
      const nb = g.kind === "move" ? { ...g.layer.box, x: g.layer.box.x + dx, y: g.layer.box.y + dy } : { ...g.layer.box, w: Math.max(0.04, g.layer.box.w + 2 * dx) }
      updateScene(g.scene, (s) => ({ ...s, layers: s.layers.map((l) => (l.id === g.layer.id ? { ...l, box: nb } : l)) }))
    }
    draw()
  }

  /* ---------- the timeline ---------- */
  const scrub = useRef<{ x: number; moved: boolean } | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const tAt = (x: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.max(0, Math.min(len - 0.001, ((x - r.left) / r.width) * len))
  }
  const frameStyle = { left: (box.w - fw) / 2, top: (box.h - fh) / 2, width: fw, height: fh }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={area}
        className="relative min-h-0 flex-1 overflow-hidden"
        // a background swatch or a device dragged in from the inspector
        onDragOver={(e) => (e.dataTransfer.types.includes("text/x-fill") || e.dataTransfer.types.includes("text/x-device")) && e.preventDefault()}
        onDrop={(e) => {
          const fill = e.dataTransfer.getData("text/x-fill")
          const d = e.dataTransfer.getData("text/x-device") as DeviceId
          const s = current()
          if (fill) setComp((c) => ({ ...c, fill }))
          else if (d && s) updateScene(s.id, (x) => addDevice(x, d) ?? x)
        }}
      >
        <div className="absolute overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--line),var(--sh-md)]" style={{ ...frameStyle, background: comp.fill === "transparent" ? CHECKER : undefined }}>
          {fw > 0 && <CompositionView ref={view} comp={comp} resolve={resolve} />}
        </div>
        {/* over the live screens too: on the stage the pointer edits the shot, it doesn't use the app */}
        <div
          ref={shield}
          aria-hidden
          title={fine ? "Drag to turn · drag a layer to move it · scroll to zoom · double-click to reset" : undefined}
          className="absolute cursor-grab touch-none active:cursor-grabbing"
          style={frameStyle}
          onPointerDown={(e) => begin(e, false)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={(e) => {
            const s = current()
            if (!s) return
            updateScene(s.id, (x) => ({ ...x, camera: { ...x.camera, zoom: clampZoom(x.camera.zoom * Math.exp(-e.deltaY * 0.0012)) } }))
            learned()
          }}
          onDoubleClick={() => {
            const s = current()
            if (s && !selRef.current.layer) updateScene(s.id, (x) => ({ ...x, camera: { ...x.camera, yaw: 0, elev: 0, zoom: 1 } }))
          }}
        />
        <div ref={outline} className="pointer-events-none absolute hidden rounded-[3px] shadow-[0_0_0_1.5px_var(--fg)]">
          <span
            data-sizer="1"
            aria-hidden
            className="pointer-events-auto absolute -bottom-[7px] -right-[7px] h-3.5 w-3.5 cursor-nwse-resize touch-none rounded-full bg-surface shadow-[0_0_0_1.5px_var(--fg)]"
            onPointerDown={(e) => begin(e, true)}
          />
        </div>
        {hint && fw > 0 && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6" style={{ top: (box.h - fh) / 2 + 12 }}>
            <p className="fade-in rounded-full bg-overlay px-3 py-1.5 text-caption text-fg-2 shadow-md">{fine ? "Drag to turn it · drag a layer to move it · scroll to zoom" : "Drag to turn it · pinch to zoom"}</p>
          </div>
        )}
      </div>

      <div role="group" aria-label="Timeline" className={`flex shrink-0 items-center gap-2 border-t bg-surface px-2 ${compact ? "h-14" : "h-[60px]"}`}>
        <IconButton label={playing ? "Pause" : "Play"} tipSide="top" tipAlign="start" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </IconButton>
        <span ref={clock} className="hidden w-[84px] shrink-0 text-caption tabular-nums text-fg-3 sm:block" />
        <div
          ref={track}
          className="relative flex h-10 min-w-0 flex-1 cursor-pointer touch-none select-none gap-1"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            scrub.current = { x: e.clientX, moved: false }
          }}
          onPointerMove={(e) => {
            const s = scrub.current
            if (!s || (!s.moved && Math.abs(e.clientX - s.x) < 4)) return
            s.moved = true
            if (playing) setPlaying(false)
            seek(tAt(e.clientX))
          }}
          onPointerUp={(e) => {
            const s = scrub.current
            scrub.current = null
            if (!s || s.moved) return
            // a click picks the scene under it and shows that moment
            const t = tAt(e.clientX)
            setSel({ scene: comp.scenes[at(comp, t).i].id })
            seek(t)
          }}
        >
          {comp.scenes.map((s, i) => {
            const on = sel.scene === s.id
            return (
              <div
                key={s.id}
                className={`relative flex min-w-0 flex-col justify-center rounded-md px-2 ${on ? "bg-surface-3 shadow-[inset_0_0_0_1.5px_var(--fg)]" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]"}`}
                style={{ flexGrow: s.duration, flexBasis: 0 }}
              >
                <span className={`truncate text-caption font-medium ${on ? "text-fg" : "text-fg-2"}`}>
                  <span className="tabular-nums text-fg-3">{i + 1}</span> {s.name}
                </span>
                <span className="truncate text-micro tabular-nums text-fg-3">
                  {s.duration.toFixed(1)}s{i > 0 && s.transition !== "cut" ? ` · ${s.transition}` : ""}
                </span>
              </div>
            )
          })}
          <div ref={head} aria-hidden className="pointer-events-none absolute -bottom-1 -top-1 left-0 w-[2px] -translate-x-1/2 rounded-full bg-fg" />
        </div>
        <IconButton label="Add a scene" tipSide="top" tipAlign="end" onClick={onAddScene}>
          <Plus size={16} />
        </IconButton>
      </div>
    </div>
  )
}
