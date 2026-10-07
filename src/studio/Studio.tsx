// Mockup studio — the engine's 3D view: the device as a real object under studio light with the live screen on it,
// framed exactly as the export will be. Drag to turn it, scroll to zoom, double-click to go back to the angle.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowCounterClockwise, Camera, DownloadSimple, FilmStrip, ImageSquare, Pause, Play, WarningCircle } from "@phosphor-icons/react"
import type { Device, Posture, ScreenInk } from "../devices"
import { field } from "../controls"
import { Button, IconButton, Segmented, Switch } from "../ui"
import { BACKDROPS, SIZES } from "./config"
import { FINISHES } from "./devices3d"
import type { ExportKind, ExportState } from "./export"
import { ANGLES, MOTIONS, move, type AngleId, type MotionId } from "./poses"
import { StudioScene } from "./scene"
import { ScreenShell } from "./shell"
import { backdropCss, finishOf, shotPose, sizeOf, type Shot } from "./shot"

/** Transparent, shown the way image editors show it. */
const CHECKER = "repeating-conic-gradient(#e4e4e8 0% 25%, #f6f6f8 0% 50%) 50% / 18px 18px"
const PAD = 28
const DOCK = 60

export function StudioStage({
  d,
  posture,
  landscape,
  dark,
  ink,
  screenBg,
  shot,
  setShot,
  playing,
  setPlaying,
  children,
}: {
  d: Device
  posture: Posture
  landscape: boolean
  dark: boolean
  ink?: ScreenInk
  screenBg: string
  shot: Shot
  setShot: (patch: Partial<Shot>) => void
  playing: boolean
  setPlaying: (on: boolean) => void
  children: ReactNode
}) {
  const area = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<StudioScene | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const size = sizeOf(shot)
  // the export's frame, fitted into the stage above the angle dock
  const k = Math.max(0, Math.min((box.w - PAD * 2) / size.w, (box.h - PAD * 2 - DOCK) / size.h))
  const fw = Math.round(size.w * k)
  const fh = Math.round(size.h * k)

  useEffect(() => {
    const el = area.current!
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const s = new StudioScene(host.current!)
    setScene(s)
    return () => s.dispose()
  }, [])

  // what to draw: the shot, plus a drag in progress (kept here so the rest of the engine doesn't re-render per move)
  const drag = useRef({ yaw: 0, elev: 0 })
  const live = useRef({ shot, d, playing })
  live.current = { shot, d, playing }
  const frameReq = useRef(0)
  const t0 = useRef(performance.now())
  const draw = useCallback(() => {
    if (!scene || frameReq.current) return
    frameReq.current = requestAnimationFrame(() => {
      frameReq.current = 0
      const { shot: s, d: dev, playing: on } = live.current
      const base = shotPose({ ...s, yaw: s.yaw + drag.current.yaw, elev: s.elev + drag.current.elev }, dev.id)
      const t = ((performance.now() - t0.current) / 1000) % s.duration
      scene.setPose(on ? move(s.motion, base, t, s.duration) : base)
      scene.render()
      if (on) draw()
    })
  }, [scene])
  useEffect(() => () => cancelAnimationFrame(frameReq.current), [])

  const finish = finishOf(shot, d.id)
  useEffect(() => {
    scene?.setDevice({ id: d.id, posture, landscape: landscape && d.rotates, finish, screenBg })
    draw()
  }, [scene, d.id, d.rotates, posture, landscape, finish, screenBg, draw])
  useEffect(() => {
    scene?.setLook({ shadow: shot.shadow, reflections: shot.reflections })
    draw()
  }, [scene, shot.shadow, shot.reflections, draw])
  useEffect(() => {
    if (fw && fh) scene?.resize(fw, fh, Math.min(devicePixelRatio, 2))
    draw()
  }, [scene, fw, fh, draw])
  useEffect(() => {
    t0.current = performance.now()
    draw()
  }, [playing, shot.motion, shot.duration, draw])
  useEffect(draw, [shot, draw])

  // drag turns it (left/right) and raises or lowers the camera; scroll zooms; double-click resets
  const start = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: PointerEvent) => {
    if (!start.current) return
    drag.current = { yaw: (e.clientX - start.current.x) * 0.3, elev: (e.clientY - start.current.y) * 0.2 }
    draw()
  }
  const onUp = () => {
    if (!start.current) return
    start.current = null
    const { yaw, elev } = drag.current
    drag.current = { yaw: 0, elev: 0 }
    if (yaw || elev) setShot({ yaw: shot.yaw + yaw, elev: shot.elev + elev })
  }
  const bg = backdropCss(shot)

  return (
    <div ref={area} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="absolute overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line),var(--sh-md)]"
        style={{ left: (box.w - fw) / 2, top: (box.h - DOCK - fh) / 2, width: fw, height: fh, background: bg === "transparent" ? CHECKER : bg }}
      >
        <div ref={host} className="absolute inset-0" />
      </div>
      {/* over the live screen too: in the studio the pointer moves the camera, it doesn't use the app */}
      <div
        aria-hidden
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => setShot({ zoom: Math.min(3, Math.max(0.35, shot.zoom * Math.exp(-e.deltaY * 0.0012))) })}
        onDoubleClick={() => setShot({ yaw: 0, elev: 0, zoom: 1 })}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-overlay p-1 shadow-md no-scrollbar">
          <Segmented<AngleId> size="sm" label="Angle" value={shot.angle} onChange={(a) => setShot({ angle: a, yaw: 0, elev: 0, zoom: 1 })} options={ANGLES.map((a) => ({ value: a.id, label: a.name }))} />
          <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-line-strong" />
          <IconButton size="sm" label={playing ? "Pause the move" : "Preview the move"} active={playing} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </IconButton>
        </div>
      </div>
      {scene &&
        createPortal(
          <ScreenShell d={d} landscape={landscape} posture={posture} dark={dark} ink={ink} bg={screenBg}>
            {children}
          </ScreenShell>,
          scene.slot,
        )}
    </div>
  )
}

/** The studio's controls, at the top of the inspector while the studio is open. */
export function MockupPanel({
  d,
  shot,
  set,
  playing,
  setPlaying,
  exporting,
  onExport,
  canAlpha,
  posture,
  setPosture,
}: {
  d: Device
  shot: Shot
  set: (patch: Partial<Shot>) => void
  playing: boolean
  setPlaying: (on: boolean) => void
  exporting: ExportState
  onExport: (kind: ExportKind) => void
  canAlpha: boolean
  /** the Duo's posture, when the device folds */
  posture?: Posture
  setPosture: (p: Posture) => void
}) {
  const finish = finishOf(shot, d.id)
  const custom = !BACKDROPS.some((b) => b.id === shot.backdrop)
  const moved = shot.yaw || shot.elev || shot.zoom !== 1 || shot.fov !== null
  const busy = exporting.phase === "working"
  const lens = shot.fov ?? shotPose({ ...shot, fov: null }, d.id).fov
  const size = sizeOf(shot)
  return (
    <div className="px-4 pb-4 pt-4">
      <p className="flex items-center gap-1.5 text-caption font-medium text-fg-3">
        <Camera size={14} aria-hidden />
        Mockup studio
      </p>
      <h2 className="mt-1 text-heading font-semibold tracking-[-0.012em]">{d.name}</h2>
      <p className="mt-1 text-body text-fg-2">A real 3D device with your live screen on it. Drag the stage to turn it; export a still or a video.</p>

      <section aria-label="Finish" className="mt-5">
        <h3 className="mb-2 flex items-center justify-between text-caption font-medium text-fg-3">
          Finish <span className="text-fg-2">{finish.name}</span>
        </h3>
        <div role="radiogroup" aria-label="Finish" className="flex flex-wrap gap-2">
          {FINISHES[d.id].map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === finish.id}
              aria-label={f.name}
              title={f.name}
              onClick={() => set({ finish: { ...shot.finish, [d.id]: f.id } })}
              className={`press h-8 w-8 rounded-full ring-offset-2 ring-offset-surface ${f.id === finish.id ? "ring-2 ring-accent" : "ring-1 ring-line-strong hover:ring-fg-3"}`}
              style={{ background: `radial-gradient(circle at 32% 28%, #ffffff66, transparent 46%), linear-gradient(145deg, ${f.metal}, ${f.back})` }}
            />
          ))}
        </div>
      </section>

      {posture && (
        <section aria-label="Posture" className="mt-5">
          <h3 className="mb-2 text-caption font-medium text-fg-3">Posture</h3>
          <Segmented<Posture>
            full
            size="sm"
            label="iPhone Duo posture"
            value={posture}
            onChange={setPosture}
            options={[
              { value: "folded", label: "Folded" },
              { value: "half", label: "Half open" },
              { value: "open", label: "Open" },
            ]}
          />
        </section>
      )}

      <section aria-label="Framing" className="mt-5">
        <h3 className="mb-2 flex items-center justify-between text-caption font-medium text-fg-3">
          Framing
          {moved ? (
            <button type="button" onClick={() => set({ yaw: 0, elev: 0, zoom: 1, fov: null })} className="press flex items-center gap-1 rounded-md px-1 text-caption font-medium text-accent-ink hover:underline">
              <ArrowCounterClockwise size={12} aria-hidden /> Reset view
            </button>
          ) : (
            <span className="text-fg-2">{ANGLES.find((a) => a.id === shot.angle)?.name}</span>
          )}
        </h3>
        <Range label="Lens" unit="°" min={12} max={50} step={1} value={Math.round(lens)} set={(v) => set({ fov: v })} hint="Low is a long lens: flatter, closer to a product photo." />
        <Range label="Zoom" unit="×" min={0.35} max={3} step={0.05} value={Number(shot.zoom.toFixed(2))} set={(v) => set({ zoom: v })} />
      </section>

      <section aria-label="Background and light" className="mt-5">
        <h3 className="mb-2 text-caption font-medium text-fg-3">Background</h3>
        <div role="radiogroup" aria-label="Background" className="flex flex-wrap items-center gap-2">
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={shot.backdrop === b.id}
              aria-label={b.name}
              title={b.name}
              onClick={() => set({ backdrop: b.id })}
              className={`press h-8 w-8 rounded-lg ring-offset-2 ring-offset-surface ${shot.backdrop === b.id ? "ring-2 ring-accent" : "ring-1 ring-line-strong hover:ring-fg-3"}`}
              style={{ background: b.id === "transparent" ? CHECKER : b.css }}
            />
          ))}
          <label title="Your own colour" className={`press relative h-8 w-8 cursor-pointer overflow-hidden rounded-lg ring-offset-2 ring-offset-surface ${custom ? "ring-2 ring-accent" : "ring-1 ring-line-strong hover:ring-fg-3"}`} style={{ background: custom ? shot.backdrop : "conic-gradient(#f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)" }}>
            <span className="sr-only">Your own colour</span>
            <input type="color" value={custom ? shot.backdrop : "#e8e8ec"} onChange={(e) => set({ backdrop: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <label htmlFor="studio-shadow" className="text-body">
            Shadow
          </label>
          <Switch id="studio-shadow" on={shot.shadow} onChange={(v) => set({ shadow: v })} />
        </div>
        <Range label="Glass reflections" unit="×" min={0} max={2} step={0.05} value={shot.reflections} set={(v) => set({ reflections: v })} />
      </section>

      <section aria-label="Move" className="mt-5">
        <h3 className="mb-2 flex items-center justify-between text-caption font-medium text-fg-3">
          Video move
          <button type="button" onClick={() => setPlaying(!playing)} className="press flex items-center gap-1 rounded-md px-1 text-caption font-medium text-accent-ink hover:underline">
            {playing ? <Pause size={12} weight="fill" aria-hidden /> : <Play size={12} weight="fill" aria-hidden />}
            {playing ? "Pause preview" : "Preview"}
          </button>
        </h3>
        <div role="radiogroup" aria-label="Video move" className="grid grid-cols-3 gap-1.5">
          {MOTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={shot.motion === m.id}
              title={m.hint}
              onClick={() => set({ motion: m.id as MotionId })}
              className={`press h-8 rounded-lg text-body font-medium ${shot.motion === m.id ? "bg-accent-soft text-accent-ink shadow-[inset_0_0_0_1px_var(--accent)]" : "bg-surface-2 text-fg-2 hover:text-fg"}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-caption text-fg-3">{MOTIONS.find((m) => m.id === shot.motion)?.hint}</p>
        <Range label="Length" unit="s" min={2} max={15} step={0.5} value={shot.duration} set={(v) => set({ duration: v })} />
      </section>

      <section aria-label="Export" className="mt-5 rounded-xl bg-surface-2 p-3">
        <h3 className="mb-2 text-caption font-medium text-fg-3">Export</h3>
        <div className="flex gap-2">
          <select aria-label="Size" value={shot.size} onChange={(e) => set({ size: e.target.value })} className={`${field} h-8 min-w-0 flex-1 cursor-pointer px-2 text-body`}>
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Segmented<number> size="sm" label="Frame rate" value={shot.fps} onChange={(v) => set({ fps: v === 60 ? 60 : 30 })} options={[{ value: 30, label: "30 fps" }, { value: 60, label: "60" }]} />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={() => onExport("png")}>
            <ImageSquare size={15} aria-hidden />
            Image
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => onExport("video")}>
            <FilmStrip size={15} aria-hidden />
            Video
          </Button>
        </div>
        <ExportStatus state={exporting} />
        {exporting.phase === "idle" && (
          <p className="mt-2 text-caption text-fg-3">
            PNG {size.w}×{size.h}
            {canAlpha ? " with a transparent background" : ""}. Video: {shot.duration}s at {shot.fps} fps, {shot.backdrop === "transparent" ? "ProRes 4444 with alpha (.mov)" : "H.264 (.mp4)"}.
          </p>
        )}
      </section>
    </div>
  )
}

function ExportStatus({ state }: { state: ExportState }) {
  if (state.phase === "idle") return null
  if (state.phase === "error")
    return (
      <p role="alert" className="mt-2.5 flex items-start gap-1.5 text-caption text-fg-2">
        <WarningCircle size={14} weight="fill" aria-hidden className="mt-px shrink-0 text-bad-ink" />
        {state.message}
      </p>
    )
  if (state.phase === "done")
    return (
      <p role="status" className="mt-2.5 flex items-center gap-1.5 text-caption text-fg-2">
        <DownloadSimple size={14} aria-hidden /> Downloaded {state.file}
      </p>
    )
  const pct = state.total ? state.done / state.total : 0
  return (
    <div role="status" className="mt-2.5">
      <div className="flex justify-between text-caption text-fg-2">
        <span>{state.label}</span>
        {state.total > 1 && <span className="tabular-nums">{Math.round(pct * 100)}%</span>}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${Math.max(4, pct * 100)}%` }} />
      </div>
    </div>
  )
}

function Range({ label, unit, min, max, step, value, set, hint }: { label: string; unit: string; min: number; max: number; step: number; value: number; set: (v: number) => void; hint?: string }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mt-3" title={hint}>
      <div className="mb-1.5 flex items-center justify-between text-body">
        <span>{label}</span>
        <span className="tabular-nums text-fg-2">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${value}${unit}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="range"
        style={{ "--p": `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties}
      />
    </div>
  )
}
