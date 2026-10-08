// Mockup studio — the inspector and the Export popover while the mockup is open. The 3D stage itself is in Stage.tsx,
// loaded only when the mockup opens (it brings three.js).
import { useState, type ReactNode } from "react"
import { ArrowCounterClockwise, BookOpen, DeviceMobile, DeviceTablet, DownloadSimple, FilmStrip, ImageSquare, Laptop, WarningCircle } from "@phosphor-icons/react"
import type { Device, DeviceId, Posture } from "../devices"
import { ChipTabs, SliderField, field } from "../controls"
import { Button, Segmented, Switch, rove, type Icon } from "../ui"
import { BACKDROPS, SIZES } from "./config"
import { FINISHES } from "./finishes"
import type { ExportKind, ExportState } from "./export"
import { ANGLES, MOTIONS, type AngleId, type MotionId } from "./poses"
import { finishOf, shotPose, sizeOf, type Shot } from "./shot"

/** Transparent, shown the way image editors show it. */
export const CHECKER = "repeating-conic-gradient(#e4e4e8 0% 25%, #f6f6f8 0% 50%) 50% / 16px 16px"

/* ---------------- the inspector while the mockup is open ---------------- */

const DEVICE_TILES: { id: DeviceId; label: string; icon: Icon }[] = [
  { id: "iphone", label: "iPhone", icon: DeviceMobile },
  { id: "duo", label: "Duo", icon: BookOpen },
  { id: "ipad", label: "iPad", icon: DeviceTablet },
  { id: "macbook", label: "MacBook", icon: Laptop },
]
const ring = (on: boolean) => (on ? "bg-surface text-fg shadow-[0_0_0_1.5px_var(--fg)] dark:bg-surface-2" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:text-fg hover:shadow-[inset_0_0_0_1px_var(--fg-3)]")
const swatch = (on: boolean) => (on ? "outline-[1.5px] outline-offset-2 outline-fg outline" : "hover:scale-[1.06]")

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="break-inside-avoid border-b px-4 pb-4 pt-3.5 last:border-b-0 [.cols_&]:border-b-0">
      <h3 className="flex min-h-5 items-center justify-between pb-2 text-caption font-medium text-fg-3">
        {title}
        {aside && <span className="font-normal">{aside}</span>}
      </h3>
      {children}
    </section>
  )
}

/** A grid of named choices: angles, moves. */
function Choices<T extends string>({ label, value, options, set, cols = 4 }: { label: string; value: T; options: { id: T; name: string; hint?: string }[]; set: (v: T) => void; cols?: number }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) =>
        rove(
          e,
          options.map((o) => o.id),
          value,
          set,
          "radio",
        )
      }
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          title={o.hint}
          onClick={() => set(o.id)}
          className={`press h-7 truncate rounded-md px-1 text-caption font-medium ${ring(o.id === value)}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  )
}

export function MockupPanel({
  d,
  shot,
  set,
  setDevice,
  posture,
  setPosture,
  cols,
}: {
  d: Device
  shot: Shot
  set: (patch: Partial<Shot>) => void
  setDevice: (id: DeviceId) => void
  posture: Posture
  setPosture: (p: Posture) => void
  /** two columns, on a wide bottom panel */
  cols?: boolean
}) {
  const finish = finishOf(shot, d.id)
  const custom = !BACKDROPS.some((b) => b.id === shot.backdrop)
  const moved = shot.yaw || shot.elev || shot.zoom !== 1 || shot.fov !== null
  const lens = shot.fov ?? shotPose({ ...shot, fov: null }, d.id).fov
  const backdrop = BACKDROPS.find((b) => b.id === shot.backdrop)
  const motion = MOTIONS.find((m) => m.id === shot.motion)
  return (
    <div className={cols ? "cols columns-2 gap-0 [column-rule:1px_solid_var(--line)]" : ""}>
      <Section title="Device">
        <div
          role="radiogroup"
          aria-label="Device"
          onKeyDown={(e) =>
            rove(
              e,
              DEVICE_TILES.map((t) => t.id),
              d.id,
              setDevice,
              "radio",
            )
          }
          className="grid grid-cols-4 gap-1.5"
        >
          {DEVICE_TILES.map(({ id, label, icon: I }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === d.id}
              tabIndex={id === d.id ? 0 : -1}
              onClick={() => setDevice(id)}
              className={`press flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-caption font-medium ${ring(id === d.id)}`}
            >
              <I size={18} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {d.fold && (
          <div className="mt-3">
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
          </div>
        )}
      </Section>

      <Section title="Finish" aside={finish.name}>
        <div role="radiogroup" aria-label="Finish" className="flex flex-wrap gap-2.5">
          {FINISHES[d.id].map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === finish.id}
              aria-label={f.name}
              title={f.name}
              onClick={() => set({ finish: { ...shot.finish, [d.id]: f.id } })}
              className={`press h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] ${swatch(f.id === finish.id)}`}
              style={{ background: `radial-gradient(circle at 32% 28%, #ffffff70, transparent 46%), linear-gradient(145deg, ${f.metal}, ${f.back})` }}
            />
          ))}
        </div>
      </Section>

      <Section title="Background" aside={custom ? "Custom" : backdrop?.name}>
        <div role="radiogroup" aria-label="Background" className="grid grid-cols-6 gap-2">
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={shot.backdrop === b.id}
              aria-label={b.name}
              title={b.name}
              onClick={() => set({ backdrop: b.id })}
              className={`press aspect-square rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] ${swatch(shot.backdrop === b.id)}`}
              style={{ background: b.id === "transparent" ? CHECKER : b.css }}
            />
          ))}
          <label
            title="Your own colour"
            className={`press relative aspect-square cursor-pointer overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg ${swatch(custom)}`}
            style={{ background: custom ? shot.backdrop : "conic-gradient(from 90deg, #f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)" }}
          >
            <span className="sr-only">Your own colour</span>
            <input type="color" value={custom ? shot.backdrop : "#e8e8ec"} onChange={(e) => set({ backdrop: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </Section>

      <Section
        title="Camera"
        aside={
          moved ? (
            <button type="button" onClick={() => set({ yaw: 0, elev: 0, zoom: 1, fov: null })} className="press flex items-center gap-1 rounded text-caption font-medium text-fg-2 hover:text-fg">
              <ArrowCounterClockwise size={12} aria-hidden /> Reset
            </button>
          ) : undefined
        }
      >
        <Choices<AngleId> label="Angle" value={shot.angle} options={ANGLES} set={(a) => set({ angle: a, yaw: 0, elev: 0, zoom: 1 })} />
        <div className="mt-2.5" />
        <Range id="mk-lens" label="Lens" unit="°" min={12} max={50} step={1} value={Math.round(lens)} def={Math.round(shotPose({ ...shot, fov: null }, d.id).fov)} set={(v) => set({ fov: v })} hint="Low is a long lens: flatter, closer to a product photo." />
        <Range id="mk-zoom" label="Zoom" unit="×" min={0.35} max={3} step={0.05} value={Number(shot.zoom.toFixed(2))} def={1} set={(v) => set({ zoom: v })} />
      </Section>

      <Section title="Motion">
        <Choices<MotionId> label="Move" value={shot.motion} options={MOTIONS} set={(m) => set({ motion: m })} />
        <p className="mt-2 line-clamp-2 min-h-8 text-caption text-fg-3">{motion?.hint}</p>
        <Range id="mk-length" label="Length" unit="s" min={2} max={15} step={0.5} value={shot.duration} def={6} set={(v) => set({ duration: v })} />
      </Section>

      <Section title="Light">
        <div className="flex h-8 items-center justify-between gap-3 pl-2.5">
          <label htmlFor="studio-shadow" className="text-body text-fg-2">
            Shadow
          </label>
          <Switch id="studio-shadow" on={shot.shadow} onChange={(v) => set({ shadow: v })} />
        </div>
        <Range id="mk-reflections" label="Glass reflections" unit="×" min={0} max={2} step={0.05} value={shot.reflections} def={1} set={(v) => set({ reflections: v })} />
      </Section>
    </div>
  )
}

/* ---------------- phones: one setting at a time ---------------- */

const POSTURE_OPTIONS: { value: Posture; label: string }[] = [
  { value: "folded", label: "Folded" },
  { value: "half", label: "Half open" },
  { value: "open", label: "Open" },
]

/** A row of named choices that scrolls sideways (angles, moves on a phone). */
function ChoiceStrip<T extends string>({ label, value, options, set }: { label: string; value: T; options: { id: T; name: string; hint?: string }[]; set: (v: T) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) =>
        rove(
          e,
          options.map((o) => o.id),
          value,
          set,
          "radio",
        )
      }
      className="no-scrollbar flex h-11 items-center gap-1.5 overflow-x-auto px-px"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          onClick={() => set(o.id)}
          className={`press h-10 shrink-0 rounded-md px-3.5 text-body font-medium ${ring(o.id === value)}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  )
}

type Tool = "frame" | "device" | "posture" | "finish" | "background" | "angle" | "zoom" | "lens" | "move" | "length" | "shadow" | "reflections"

/** The mockup on a phone: the picked setting in one strip, the chips that pick it under that, Export at the end. */
export function MockupBar({
  d,
  shot,
  set,
  setDevice,
  posture,
  setPosture,
  exportButton,
}: {
  d: Device
  shot: Shot
  set: (patch: Partial<Shot>) => void
  setDevice: (id: DeviceId) => void
  posture: Posture
  setPosture: (p: Posture) => void
  exportButton: ReactNode
}) {
  const [tool, setTool] = useState<Tool>("frame")
  const tools: { id: Tool; label: string; sep?: boolean }[] = [
    { id: "frame", label: "Frame" },
    { id: "device", label: "Device" },
    ...(d.fold ? [{ id: "posture" as const, label: "Posture" }] : []),
    { id: "finish", label: "Finish" },
    { id: "background", label: "Background", sep: false },
    { id: "angle", label: "Angle", sep: true },
    { id: "zoom", label: "Zoom" },
    { id: "lens", label: "Lens" },
    { id: "move", label: "Move", sep: true },
    { id: "length", label: "Length" },
    { id: "shadow", label: "Shadow", sep: true },
    { id: "reflections", label: "Reflections" },
  ]
  const k = tools.some((t) => t.id === tool) ? tool : "background"
  const finish = finishOf(shot, d.id)
  const custom = !BACKDROPS.some((b) => b.id === shot.backdrop)
  const lensDef = Math.round(shotPose({ ...shot, fov: null }, d.id).fov)
  let body: ReactNode
  if (k === "frame")
    body = <ChoiceStrip label="Frame" value={shot.size} options={SIZES.map((x) => ({ id: x.id, name: x.name, hint: x.hint }))} set={(v) => set({ size: v })} />
  else if (k === "device")
    body = <Segmented full label="Device" value={d.id} onChange={setDevice} options={DEVICE_TILES.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))} />
  else if (k === "posture") body = <Segmented full label="iPhone Duo posture" value={posture} onChange={setPosture} options={POSTURE_OPTIONS} />
  else if (k === "finish")
    body = (
      <div className="flex h-11 items-center gap-3 px-1">
        <div role="radiogroup" aria-label="Finish" className="flex gap-3">
          {FINISHES[d.id].map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === finish.id}
              aria-label={f.name}
              onClick={() => set({ finish: { ...shot.finish, [d.id]: f.id } })}
              className={`press h-8 w-8 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] ${swatch(f.id === finish.id)}`}
              style={{ background: `radial-gradient(circle at 32% 28%, #ffffff70, transparent 46%), linear-gradient(145deg, ${f.metal}, ${f.back})` }}
            />
          ))}
        </div>
        <span className="ml-auto truncate text-body text-fg-2">{finish.name}</span>
      </div>
    )
  else if (k === "background")
    body = (
      <div role="radiogroup" aria-label="Background" className="no-scrollbar flex h-11 items-center gap-2.5 overflow-x-auto px-1">
        {BACKDROPS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={shot.backdrop === b.id}
            aria-label={b.name}
            onClick={() => set({ backdrop: b.id })}
            className={`press h-9 w-9 shrink-0 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] ${swatch(shot.backdrop === b.id)}`}
            style={{ background: b.id === "transparent" ? CHECKER : b.css }}
          />
        ))}
        <label
          className={`press relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] ${swatch(custom)}`}
          style={{ background: custom ? shot.backdrop : "conic-gradient(from 90deg, #f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)" }}
        >
          <span className="sr-only">Your own colour</span>
          <input type="color" value={custom ? shot.backdrop : "#e8e8ec"} onChange={(e) => set({ backdrop: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    )
  else if (k === "angle") body = <ChoiceStrip<AngleId> label="Angle" value={shot.angle} options={ANGLES} set={(a) => set({ angle: a, yaw: 0, elev: 0, zoom: 1 })} />
  else if (k === "move") body = <ChoiceStrip<MotionId> label="Move" value={shot.motion} options={MOTIONS} set={(m) => set({ motion: m })} />
  else if (k === "zoom") body = <SliderField big id="mb-zoom" label="Zoom" unit="×" min={0.35} max={3} step={0.05} value={Number(shot.zoom.toFixed(2))} def={1} set={(v) => set({ zoom: v })} />
  else if (k === "lens") body = <SliderField big id="mb-lens" label="Lens" unit="°" min={12} max={50} step={1} value={Math.round(shot.fov ?? lensDef)} def={lensDef} set={(v) => set({ fov: v })} />
  else if (k === "length") body = <SliderField big id="mb-length" label="Length" unit="s" min={2} max={15} step={0.5} value={shot.duration} def={6} set={(v) => set({ duration: v })} />
  else if (k === "reflections")
    body = <SliderField big id="mb-reflections" label="Glass reflections" unit="×" min={0} max={2} step={0.05} value={shot.reflections} def={1} set={(v) => set({ reflections: v })} />
  else
    body = (
      <div className="flex h-11 items-center justify-between gap-3 rounded-md bg-surface-2 pl-3 pr-2 shadow-[inset_0_0_0_1px_var(--line)]">
        <label htmlFor="mb-shadow" className="text-ui text-fg-2">
          Shadow under the device
        </label>
        <Switch id="mb-shadow" size="lg" on={shot.shadow} onChange={(v) => set({ shadow: v })} />
      </div>
    )
  return (
    <section aria-label="Mockup" className="shrink-0 border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      <div id="mockup-panel" role="tabpanel" aria-labelledby={`mockup-panel-chip-${k}`} className="px-3 pt-3">
        {body}
      </div>
      <div className="flex items-center gap-2 py-2.5 pl-3">
        <ChipTabs label="Mockup settings" items={tools} value={k} onChange={setTool} panel="mockup-panel" />
        <span className="shrink-0 pr-2">{exportButton}</span>
      </div>
    </section>
  )
}

/* ---------------- the Export popover while the mockup is open ---------------- */

export function MockupExport({ shot, set, exporting, onExport }: { shot: Shot; set: (patch: Partial<Shot>) => void; exporting: ExportState; onExport: (kind: ExportKind) => void }) {
  const size = sizeOf(shot)
  const busy = exporting.phase === "working"
  const alpha = shot.backdrop === "transparent"
  const video = shot.kind === "video"
  return (
    <div className="w-[320px] max-w-[calc(100vw-16px)] p-3">
      <Segmented<"png" | "video">
        full
        label="Format"
        value={shot.kind}
        onChange={(k) => set({ kind: k })}
        options={[
          { value: "png", label: "Image", icon: ImageSquare },
          { value: "video", label: "Video", icon: FilmStrip },
        ]}
      />
      <div className="mt-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="export-size" className="text-body text-fg-2">
            Size
          </label>
          <select id="export-size" value={shot.size} onChange={(e) => set({ size: e.target.value })} className={`${field} h-7 w-[188px] cursor-pointer px-2 text-body`}>
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.w}×{s.h}
              </option>
            ))}
          </select>
        </div>
        {video && (
          <div className="flex items-center justify-between gap-3">
            <span id="export-fps" className="text-body text-fg-2">
              Frame rate
            </span>
            <Segmented<number> size="sm" labelledBy="export-fps" value={shot.fps} onChange={(v) => set({ fps: v === 60 ? 60 : 30 })} options={[{ value: 30, label: "30 fps" }, { value: 60, label: "60 fps" }]} />
          </div>
        )}
      </div>
      <p className="mt-3 text-caption text-fg-3">
        {size.hint}.{" "}
        {video
          ? `${shot.duration} s at ${shot.fps} fps, ${alpha ? "ProRes 4444 with alpha (.mov)" : "H.264 (.mp4)"}.`
          : `PNG${alpha ? " with a transparent background" : ""}.`}
      </p>
      <Button variant="primary" className="mt-3 w-full" disabled={busy} onClick={() => onExport(shot.kind)}>
        {video ? <FilmStrip size={15} aria-hidden /> : <ImageSquare size={15} aria-hidden />}
        {busy ? "Rendering…" : video ? "Export video" : "Export image"}
      </Button>
      <ExportStatus state={exporting} />
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
        <div className="h-full rounded-full bg-fg transition-[width] duration-300 ease-out" style={{ width: `${Math.max(4, pct * 100)}%` }} />
      </div>
    </div>
  )
}

function Range({ id, label, unit, min, max, step, value, set, def, hint }: { id: string; label: string; unit: string; min: number; max: number; step: number; value: number; set: (v: number) => void; def?: number; hint?: string }) {
  return (
    <div className="mt-1.5">
      <SliderField id={id} label={label} unit={unit} min={min} max={max} step={step} value={value} set={set} def={def} hint={hint} />
    </div>
  )
}
