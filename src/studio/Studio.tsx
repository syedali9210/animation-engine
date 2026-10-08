// Studio — the inspector: whatever is picked in the layers (a scene, a device, a component, a picture, a title, or the
// background) with its settings, plus the Export popover. All plain React, no three.js: the 3D stage is in Stage.tsx.
import { useState, type ReactNode } from "react"
import { ArrowCounterClockwise, BookOpen, DeviceMobile, DeviceTablet, DownloadSimple, Eyedropper, FilmStrip, ImageSquare, Laptop, UploadSimple, WarningCircle } from "@phosphor-icons/react"
import { DEVICES, type DeviceId, type Posture } from "../devices"
import { SliderField, field } from "../controls"
import { byId } from "../registry"
import { Button, Popover, Segmented, Switch, closePopover, rove, type Icon } from "../ui"
import {
  EFFECTS,
  ENTERS,
  LIGHTS,
  TRANSITIONS,
  device as newDevice,
  devicesOf,
  total,
  type Box,
  type Comp,
  type ComponentLayer,
  type DeviceLayer,
  type Enter,
  type ImageLayer,
  type Layer,
  type Scene,
  type Slot,
  type TextLayer,
} from "./comp"
import { BACKDROPS, SIZES } from "./config"
import type { ExportKind, ExportState } from "./export"
import { FINISHES } from "./finishes"
import { BG, Hint, layerName } from "./Layers"
import { fillCss, isDark } from "./look"
import { ANGLES, MOTIONS, angle, type AngleId, type MotionId } from "./poses"
import type { Sel } from "./Stage"

/** Transparent, shown the way image editors show it. */
const CHECKER = "repeating-conic-gradient(#e4e4e8 0% 25%, #f6f6f8 0% 50%) 50% / 16px 16px"

const DEVICE_TILES: { id: DeviceId; label: string; icon: Icon }[] = [
  { id: "iphone", label: "iPhone", icon: DeviceMobile },
  { id: "duo", label: "Duo", icon: BookOpen },
  { id: "ipad", label: "iPad", icon: DeviceTablet },
  { id: "macbook", label: "MacBook", icon: Laptop },
]
const ring = (on: boolean) => (on ? "bg-surface text-fg shadow-[0_0_0_1.5px_var(--fg)] dark:bg-surface-2" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:text-fg hover:shadow-[inset_0_0_0_1px_var(--fg-3)]")
const swatch = (on: boolean) => (on ? "outline-[1.5px] outline-offset-2 outline-fg outline" : "hover:scale-[1.06]")
const POSTURES: { value: Posture; label: string }[] = [
  { value: "folded", label: "Folded" },
  { value: "half", label: "Half open" },
  { value: "open", label: "Open" },
]
const SLOTS: { value: Slot; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Middle" },
  { value: "right", label: "Right" },
]
/** a component's shape, width over height */
const SHAPES: { value: string; label: string; aspect: number }[] = [
  { value: "square", label: "Square", aspect: 1 },
  { value: "wide", label: "4:3", aspect: 4 / 3 },
  { value: "tall", label: "3:4", aspect: 3 / 4 },
  { value: "phone", label: "Phone", aspect: 402 / 874 },
]

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
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

/** A grid of named choices: angles, moves, transitions. */
export function Choices<T extends string>({ label, value, options, set, cols = 4 }: { label: string; value: T; options: { id: T; name: string; hint?: string }[]; set: (v: T) => void; cols?: number }) {
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
          className={`press h-7 truncate rounded-md px-1 text-caption font-medium pointer-coarse:h-9 ${ring(o.id === value)}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  )
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 pl-2.5">
      <label htmlFor={htmlFor} className="text-body text-fg-2">
        {label}
      </label>
      {children}
    </div>
  )
}

const Stack = ({ children }: { children: ReactNode }) => <div className="space-y-1.5">{children}</div>

/** The browser's eyedropper (Chrome, Edge): pick a colour from anywhere on the screen. */
const canPick = typeof window !== "undefined" && "EyeDropper" in window
async function pickColour() {
  try {
    const r = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open()
    return r.sRGBHex
  } catch {
    return null
  }
}

function ColourRow({ label, value, auto, set }: { label: string; value: string; auto: string; set: (v: string) => void }) {
  return (
    <Row label={label}>
      <span className="flex items-center gap-1">
        {value && (
          <button type="button" onClick={() => set("")} className="press rounded px-1.5 text-caption text-fg-3 hover:text-fg">
            Auto
          </button>
        )}
        {canPick && (
          <button type="button" title="Pick a colour from the screen" aria-label="Pick a colour from the screen" onClick={() => pickColour().then((c) => c && set(c))} className="press grid h-7 w-7 place-items-center rounded-md text-fg-2 hover:bg-surface-2 hover:text-fg">
            <Eyedropper size={15} />
          </button>
        )}
        <label className="press relative h-7 w-7 cursor-pointer overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg" style={{ background: value || auto }}>
          <span className="sr-only">{label}: pick a colour</span>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{6}$/i.test(auto) ? auto : "#000000"} onChange={(e) => set(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </span>
    </Row>
  )
}

function Placement({ box, set, sizeLabel = "Size" }: { box: Box; set: (b: Box) => void; sizeLabel?: string }) {
  return (
    <Stack>
      <SliderField id="pl-w" label={sizeLabel} unit="%" min={4} max={100} step={1} value={Math.round(box.w * 100)} set={(v) => set({ ...box, w: v / 100 })} />
      <SliderField id="pl-x" label="Across" unit="%" min={0} max={100} step={1} value={Math.round(box.x * 100)} set={(v) => set({ ...box, x: v / 100 })} />
      <SliderField id="pl-y" label="Down" unit="%" min={0} max={100} step={1} value={Math.round(box.y * 100)} set={(v) => set({ ...box, y: v / 100 })} />
    </Stack>
  )
}

/* ---------------- the inspector ---------------- */

export type InspectorCtx = {
  comp: Comp
  setComp: (fn: (c: Comp) => Comp) => void
  sel: Sel
  setSel: (s: Sel) => void
  /** what "the live screen" is right now, for its label */
  liveName: string
  pickAnim: (title: string, then: (id: string) => void) => void
  pickImage: (then: (src: string, file: string, aspect: number) => void) => void
  cols?: boolean
}

export function StudioInspector(x: InspectorCtx) {
  const { comp, sel } = x
  const scene = comp.scenes.find((s) => s.id === sel.scene) ?? comp.scenes[0]
  const body =
    sel.layer === BG ? (
      <BackgroundPanel {...x} />
    ) : (() => {
        const l = scene.layers.find((y) => y.id === sel.layer)
        if (!l) return <ScenePanel {...x} scene={scene} />
        if (l.kind === "device") return <DevicePanel {...x} scene={scene} l={l} />
        if (l.kind === "component") return <ComponentPanel {...x} scene={scene} l={l} />
        if (l.kind === "image") return <ImagePanel {...x} scene={scene} l={l} />
        return <TextPanel {...x} scene={scene} l={l} />
      })()
  return <div className={x.cols ? "cols columns-2 gap-0 [column-rule:1px_solid_var(--line)]" : ""}>{body}</div>
}

/** The title the inspector shows for what's picked. */
export function inspectorTitle(comp: Comp, sel: Sel) {
  if (sel.layer === BG) return "Background"
  const s = comp.scenes.find((x) => x.id === sel.scene)
  const l = s?.layers.find((y) => y.id === sel.layer)
  return l ? layerName(l) : (s?.name ?? "Scene")
}

/** Devices to one side of the frame: the components and pictures move over to the other side, so they sit beside it. */
function frameTo(scene: Scene, frame: Slot): Partial<Scene> {
  const away = (x: number) => (frame === "left" ? x < 0.5 : frame === "right" ? x > 0.5 : false)
  return { frame, layers: scene.layers.map((l) => (l.kind !== "device" && l.kind !== "text" && away(l.box.x) ? { ...l, box: { ...l.box, x: 1 - l.box.x } } : l)) }
}

const sceneSetter = (x: InspectorCtx, scene: Scene) => (patch: Partial<Scene>) => x.setComp((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)) }))
const layerSetter =
  <L extends Layer>(x: InspectorCtx, scene: Scene, l: L) =>
  (patch: Partial<L>) =>
    x.setComp((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === scene.id ? { ...s, layers: s.layers.map((y) => (y.id === l.id ? ({ ...y, ...patch } as Layer) : y)) } : s)) }))

/* ---------------- scene ---------------- */

function ScenePanel(x: InspectorCtx & { scene: Scene }) {
  const { scene, comp } = x
  const set = sceneSetter(x, scene)
  const i = comp.scenes.indexOf(scene)
  const devs = devicesOf(scene)
  const primary = devs.find((d) => d.slot === "center") ?? devs[0]
  const lens = scene.camera.fov ?? angle(scene.camera.angle, primary?.device ?? "iphone").fov
  const moved = scene.camera.yaw || scene.camera.elev || scene.camera.zoom !== 1 || scene.camera.fov !== null
  // what stands in a slot: change it, empty it, or fill it
  const putIn = (slot: Slot, id: DeviceId | null) => {
    const has = scene.layers.find((l): l is DeviceLayer => l.kind === "device" && l.slot === slot)
    if (!id) return set({ layers: scene.layers.filter((l) => !(l.kind === "device" && l.slot === slot)) })
    if (has) return set({ layers: scene.layers.map((l) => (l === has ? { ...has, device: id, finish: undefined } : l)) })
    // a new device goes in under the flat layers, with the others
    const at = scene.layers.findIndex((l) => l.kind !== "device")
    const layers = [...scene.layers]
    layers.splice(at < 0 ? layers.length : at, 0, newDevice(id, slot))
    set({ layers })
  }
  const move = MOTIONS.find((m) => m.id === scene.move)
  return (
    <>
      <Section title="Scene" aside={`${i + 1} of ${comp.scenes.length} · ${total(comp).toFixed(1)}s in all`}>
        <Stack>
          <input aria-label="Scene name" value={scene.name} onChange={(e) => set({ name: e.target.value })} className={`${field} h-8 w-full px-2.5 text-body`} />
          <SliderField id="sc-len" label="Length" unit="s" min={1} max={15} step={0.1} value={scene.duration} def={4} set={(v) => set({ duration: v })} />
        </Stack>
        {i > 0 && (
          <>
            <p className="pb-1.5 pt-3 text-caption text-fg-3">Into this scene</p>
            <Choices label="Transition" value={scene.transition} options={TRANSITIONS} set={(t) => set({ transition: t })} cols={3} />
          </>
        )}
      </Section>

      <Section title="Devices" aside="matched in scale">
        <div className="grid grid-cols-3 gap-1.5">
          {SLOTS.map(({ value: slot, label }) => {
            const l = scene.layers.find((y): y is DeviceLayer => y.kind === "device" && y.slot === slot)
            const T = l ? DEVICE_TILES.find((t) => t.id === l.device)! : null
            const id = `slot-${scene.id}-${slot}`
            return (
              <div
                key={slot}
                onDragOver={(e) => e.dataTransfer.types.includes("text/x-device") && e.preventDefault()}
                onDrop={(e) => {
                  const d = e.dataTransfer.getData("text/x-device") as DeviceId
                  if (d) putIn(slot, d)
                }}
              >
                <button
                  type="button"
                  popoverTarget={id}
                  className={`press flex h-[68px] w-full flex-col items-center justify-center gap-1 rounded-lg text-caption ${l ? ring(slot === "center") : "border border-dashed border-line-strong text-fg-3 hover:text-fg"}`}
                >
                  {T ? <T.icon size={20} aria-hidden /> : <span aria-hidden className="text-ui leading-none">+</span>}
                  <span className="font-medium">{T ? T.label : label}</span>
                  <span className="text-micro text-fg-3">{slot === "center" ? "Primary" : l ? label : "Empty"}</span>
                </button>
                <Popover id={id} align={slot === "right" ? "end" : slot === "left" ? "start" : "center"} label={`${label} device`}>
                  <div className="w-[200px] p-1.5">
                    {DEVICE_TILES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(e) => {
                          putIn(slot, t.id)
                          closePopover(e.currentTarget)
                        }}
                        className={`press flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-body hover:bg-surface-2 ${l?.device === t.id ? "font-medium" : ""}`}
                      >
                        <t.icon size={16} aria-hidden className="text-fg-2" />
                        {DEVICES.find((d) => d.id === t.id)!.name}
                      </button>
                    ))}
                    {l && (
                      <button
                        type="button"
                        onClick={(e) => {
                          putIn(slot, null)
                          closePopover(e.currentTarget)
                        }}
                        className="press mt-1 flex w-full items-center gap-2.5 rounded-md border-t px-2.5 py-2 text-body text-fg-2 hover:bg-surface-2"
                      >
                        Leave empty
                      </button>
                    )}
                  </div>
                </Popover>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {DEVICE_TILES.map((t) => (
            <span
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/x-device", t.id)
                e.dataTransfer.effectAllowed = "copy"
              }}
              title={`Drag onto a slot: ${t.label}`}
              className="flex h-6 cursor-grab items-center gap-1 rounded-full px-2 text-caption text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)] active:cursor-grabbing"
            >
              <t.icon size={12} aria-hidden />
              {t.id === "macbook" ? "Mac" : t.label}
            </span>
          ))}
        </div>
        <Hint>Drag a device onto a place or the stage. Each stands at its real size beside the primary, under one camera, so scale, distance and perspective agree.</Hint>
        <div className="mt-3 space-y-1.5">
          <Row label="Devices sit">
            <Segmented size="sm" label="Where the devices sit in the frame" value={scene.frame} onChange={(v) => set(frameTo(scene, v))} options={SLOTS} />
          </Row>
          <Row label="Arrive">
            <Segmented
              size="sm"
              label="How the devices come in"
              value={scene.arrival}
              onChange={(v) => set({ arrival: v })}
              options={[
                { value: "none", label: "In place" },
                { value: "drop", label: "Drop in" },
                { value: "slide", label: "Slide in" },
              ]}
            />
          </Row>
        </div>
      </Section>

      <Section
        title="Camera"
        aside={
          moved ? (
            <button type="button" onClick={() => set({ camera: { ...scene.camera, yaw: 0, elev: 0, zoom: 1, fov: null } })} className="press flex items-center gap-1 rounded text-caption font-medium text-fg-2 hover:text-fg">
              <ArrowCounterClockwise size={12} aria-hidden /> Reset
            </button>
          ) : undefined
        }
      >
        <Choices<AngleId> label="Angle" value={scene.camera.angle} options={ANGLES} set={(a) => set({ camera: { ...scene.camera, angle: a, yaw: 0, elev: 0, zoom: 1 } })} />
        <div className="mt-2.5">
          <Stack>
            <SliderField id="sc-lens" label="Lens" unit="°" min={12} max={50} step={1} value={Math.round(lens)} def={Math.round(angle(scene.camera.angle, primary?.device ?? "iphone").fov)} set={(v) => set({ camera: { ...scene.camera, fov: v } })} hint="Low is a long lens: flatter, closer to a product photo." />
            <SliderField id="sc-zoom" label="Zoom" unit="×" min={0.35} max={3} step={0.05} value={Number(scene.camera.zoom.toFixed(2))} def={1} set={(v) => set({ camera: { ...scene.camera, zoom: v } })} />
          </Stack>
        </div>
      </Section>

      <Section title="Move">
        <Choices<MotionId> label="Camera move" value={scene.move} options={MOTIONS} set={(m) => set({ move: m })} cols={3} />
        <Hint>{move?.hint}</Hint>
      </Section>
    </>
  )
}

/* ---------------- device ---------------- */

function DevicePanel(x: InspectorCtx & { scene: Scene; l: DeviceLayer }) {
  const { l } = x
  const set = layerSetter(x, x.scene, l)
  const d = DEVICES.find((y) => y.id === l.device)!
  const finish = FINISHES[l.device].find((f) => f.id === l.finish) ?? FINISHES[l.device][0]
  const c = l.content
  return (
    <>
      <Section title="Device">
        <div
          role="radiogroup"
          aria-label="Device"
          onKeyDown={(e) =>
            rove(
              e,
              DEVICE_TILES.map((t) => t.id),
              l.device,
              (id) => set({ device: id, finish: undefined }),
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
              aria-checked={id === l.device}
              tabIndex={id === l.device ? 0 : -1}
              onClick={() => set({ device: id, finish: undefined })}
              className={`press flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-caption font-medium ${ring(id === l.device)}`}
            >
              <I size={18} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <Row label="Stands">
            <Segmented size="sm" label="Where it stands in the group" value={l.slot} onChange={(v) => set({ slot: v })} options={SLOTS} />
          </Row>
          {d.fold && (
            <Row label="Posture">
              <Segmented size="sm" label="iPhone Duo posture" value={l.posture} onChange={(v) => set({ posture: v })} options={POSTURES} />
            </Row>
          )}
          {d.rotates && (
            <Row label="Turned" htmlFor="dv-land">
              <Switch id="dv-land" on={l.landscape} onChange={(v) => set({ landscape: v })} />
            </Row>
          )}
        </div>
      </Section>
      <Section title="Finish" aside={finish.name}>
        <div role="radiogroup" aria-label="Finish" className="flex flex-wrap gap-2.5">
          {FINISHES[l.device].map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === finish.id}
              aria-label={f.name}
              title={f.name}
              onClick={() => set({ finish: f.id })}
              className={`press h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] ${swatch(f.id === finish.id)}`}
              style={{ background: `radial-gradient(circle at 32% 28%, #ffffff70, transparent 46%), linear-gradient(145deg, ${f.metal}, ${f.back})` }}
            />
          ))}
        </div>
      </Section>
      <Section title="Screen">
        <Segmented
          full
          size="sm"
          label="What the screen shows"
          value={c.kind}
          onChange={(k) => {
            if (k === "current") set({ content: { kind: "current" } })
            else if (k === "anim") x.pickAnim("Show on the screen", (id) => set({ content: { kind: "anim", id } }))
            else x.pickImage((src, file) => set({ content: { kind: "image", src, name: file } }))
          }}
          options={[
            { value: "current", label: "Live" },
            { value: "anim", label: "Animation" },
            { value: "image", label: "Picture" },
          ]}
        />
        <p className="mt-2 text-caption text-fg-3">
          {c.kind === "current" ? (
            <>
              Whatever's open in the engine: <span className="text-fg-2">{x.liveName}</span>.
            </>
          ) : c.kind === "anim" ? (
            <button type="button" onClick={() => x.pickAnim("Show on the screen", (id) => set({ content: { kind: "anim", id } }))} className="press font-medium text-fg underline decoration-fg-3 underline-offset-4">
              {byId(c.id)?.name ?? c.id} · change
            </button>
          ) : (
            <button type="button" onClick={() => x.pickImage((src, file) => set({ content: { kind: "image", src, name: file } }))} className="press font-medium text-fg underline decoration-fg-3 underline-offset-4">
              {c.name} · replace
            </button>
          )}
        </p>
        <div className="mt-2.5">
          <Row label="Hairline" htmlFor="dv-hl">
            <Switch id="dv-hl" on={!!l.hairline} onChange={(v) => set({ hairline: v })} />
          </Row>
          <Hint>Redraws the screen as thin ink lines.</Hint>
        </div>
      </Section>
    </>
  )
}

/* ---------------- flat layers ---------------- */

function EnterSection({ value, set }: { value: Enter; set: (e: Enter) => void }) {
  return (
    <Section title="Comes in">
      <Choices<Enter> label="How it comes in" value={value} options={ENTERS} set={set} cols={5} />
    </Section>
  )
}

function ComponentPanel(x: InspectorCtx & { scene: Scene; l: ComponentLayer }) {
  const { l } = x
  const set = layerSetter(x, x.scene, l)
  const shape = SHAPES.find((s) => Math.abs(s.aspect - l.aspect) < 0.02)?.value ?? "square"
  return (
    <>
      <Section title="Component">
        <button type="button" onClick={() => x.pickAnim("Pick a component", (id) => set({ anim: id }))} className="press flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2">
          <img src={`/thumbs/${l.anim}-light.webp`} alt="" className="h-10 w-[54px] shrink-0 rounded-md object-cover shadow-[0_0_0_1px_var(--line)]" />
          <span className="min-w-0">
            <span className="block truncate text-body font-medium">{byId(l.anim)?.name ?? l.anim}</span>
            <span className="block text-caption text-fg-3">Change</span>
          </span>
        </button>
        <div className="mt-2.5 space-y-1.5">
          <Row label="Shape">
            <Segmented size="sm" label="Shape" value={shape} onChange={(v) => set({ aspect: SHAPES.find((s) => s.value === v)!.aspect })} options={SHAPES} />
          </Row>
          <Row label="Hairline" htmlFor="cp-hl">
            <Switch id="cp-hl" on={!!l.hairline} onChange={(v) => set({ hairline: v })} />
          </Row>
        </div>
      </Section>
      <Section title="Place">
        <Placement box={l.box} set={(box) => set({ box })} />
        <Hint>Or drag it on the stage; its corner resizes it.</Hint>
      </Section>
      <EnterSection value={l.enter} set={(enter) => set({ enter })} />
    </>
  )
}

function ImagePanel(x: InspectorCtx & { scene: Scene; l: ImageLayer }) {
  const { l } = x
  const set = layerSetter(x, x.scene, l)
  return (
    <>
      <Section title="Picture">
        <Button className="w-full" onClick={() => x.pickImage((src, file, aspect) => set({ src, file, aspect }))}>
          <UploadSimple size={15} aria-hidden />
          Replace {l.file}
        </Button>
        <div className="mt-2.5 space-y-1.5">
          <SliderField id="im-r" label="Corners" unit="" min={0} max={6} step={0.1} value={l.radius} def={1.2} set={(v) => set({ radius: v })} />
          <Row label="Hairline" htmlFor="im-hl">
            <Switch id="im-hl" on={!!l.hairline} onChange={(v) => set({ hairline: v })} />
          </Row>
        </div>
      </Section>
      <Section title="Place">
        <Placement box={l.box} set={(box) => set({ box })} />
      </Section>
      <EnterSection value={l.enter} set={(enter) => set({ enter })} />
    </>
  )
}

function TextPanel(x: InspectorCtx & { scene: Scene; l: TextLayer }) {
  const { l } = x
  const set = layerSetter(x, x.scene, l)
  return (
    <>
      <Section title="Title">
        <textarea aria-label="Text" value={l.text} rows={2} onChange={(e) => set({ text: e.target.value })} className={`${field} block w-full resize-y px-2.5 py-2 text-body`} />
        <div className="mt-2 space-y-1.5">
          <SliderField id="tx-size" label="Size" unit="" min={1} max={16} step={0.1} value={l.size} def={6} set={(v) => set({ size: v })} />
          <Row label="Weight">
            <Segmented
              size="sm"
              label="Weight"
              value={String(l.weight)}
              onChange={(v) => set({ weight: Number(v) })}
              options={[
                { value: "450", label: "Regular" },
                { value: "550", label: "Medium" },
                { value: "650", label: "Bold" },
              ]}
            />
          </Row>
          <Row label="Align">
            <Segmented
              size="sm"
              label="Align"
              value={l.align}
              onChange={(v) => set({ align: v })}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Centre" },
                { value: "right", label: "Right" },
              ]}
            />
          </Row>
          <ColourRow label="Colour" value={l.color} auto={isDark(x.comp.fill) ? "#fafafa" : "#0a0a0b"} set={(color) => set({ color })} />
        </div>
      </Section>
      <Section title="Place">
        <Placement box={l.box} set={(box) => set({ box })} sizeLabel="Width" />
      </Section>
      <EnterSection value={l.enter} set={(enter) => set({ enter })} />
    </>
  )
}

/* ---------------- background ---------------- */

function BackgroundPanel(x: InspectorCtx) {
  const { comp, setComp } = x
  const set = (patch: Partial<Comp>) => setComp((c) => ({ ...c, ...patch }))
  const custom = !BACKDROPS.some((b) => b.id === comp.fill)
  const light = LIGHTS.find((l) => l.id === comp.light)
  return (
    <>
      <Section title="Background" aside={custom ? "Custom" : BACKDROPS.find((b) => b.id === comp.fill)?.name}>
        <div role="radiogroup" aria-label="Background" className="grid grid-cols-6 gap-2">
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={comp.fill === b.id}
              aria-label={b.name}
              title={`${b.name} · drag it onto the stage too`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/x-fill", b.id)}
              onClick={() => set({ fill: b.id })}
              className={`press aspect-square rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] ${swatch(comp.fill === b.id)}`}
              style={{ background: b.id === "transparent" ? CHECKER : b.css }}
            />
          ))}
        </div>
        <div className="mt-2.5">
          <ColourRow label="Your own colour" value={custom ? comp.fill : ""} auto={fillCss(comp.fill).startsWith("#") ? fillCss(comp.fill) : "#e8e8ec"} set={(v) => set({ fill: v || "studio" })} />
        </div>
      </Section>
      <Section title="Effect">
        <Choices label="Effect" value={comp.effect} options={EFFECTS} set={(effect) => set({ effect })} />
        {comp.effect !== "none" && (
          <div className="mt-2.5 space-y-1.5">
            <SliderField id="bg-amt" label="Amount" unit="%" min={0} max={100} step={1} value={Math.round(comp.amount * 100)} def={50} set={(v) => set({ amount: v / 100 })} />
            <ColourRow label="Effect colour" value={comp.ink} auto={isDark(comp.fill) ? "#ffffff" : "#000000"} set={(ink) => set({ ink })} />
          </div>
        )}
      </Section>
      <Section title="Light">
        <Choices label="Light" value={comp.light} options={LIGHTS} set={(l) => set({ light: l })} cols={3} />
        <Hint>{light?.hint}</Hint>
        <div className="mt-2.5 space-y-1.5">
          <Row label="Shadow" htmlFor="bg-shadow">
            <Switch id="bg-shadow" on={comp.shadow} onChange={(v) => set({ shadow: v })} />
          </Row>
          <SliderField id="bg-refl" label="Glass reflections" unit="×" min={0} max={2} step={0.05} value={comp.reflections} def={1} set={(v) => set({ reflections: v })} />
        </div>
      </Section>
    </>
  )
}

/* ---------------- the Export popover ---------------- */

export function StudioExport({ comp, set, scene, exporting, onExport }: { comp: Comp; set: (patch: Partial<Comp>) => void; scene: Scene; exporting: ExportState; onExport: (kind: ExportKind) => void }) {
  const size = SIZES.find((x) => x.id === comp.size) ?? SIZES[0]
  const busy = exporting.phase === "working"
  const alpha = comp.fill === "transparent"
  const video = comp.kind === "video"
  const len = total(comp)
  return (
    <div className="w-[320px] max-w-[calc(100vw-16px)] p-3">
      <Segmented<"png" | "video">
        full
        label="Format"
        value={comp.kind}
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
          <select id="export-size" value={comp.size} onChange={(e) => set({ size: e.target.value })} className={`${field} h-7 w-[188px] cursor-pointer px-2 text-body`}>
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
            <Segmented<number> size="sm" labelledBy="export-fps" value={comp.fps} onChange={(v) => set({ fps: v === 60 ? 60 : 30 })} options={[{ value: 30, label: "30 fps" }, { value: 60, label: "60 fps" }]} />
          </div>
        )}
      </div>
      <p className="mt-3 text-caption text-fg-3">
        {size.hint}.{" "}
        {video
          ? `All ${comp.scenes.length} scene${comp.scenes.length > 1 ? "s" : ""}, ${len.toFixed(1)} s at ${comp.fps} fps, ${alpha ? "ProRes 4444 with alpha (.mov)" : "H.264 (.mp4)"}.`
          : `“${scene.name}”, settled, as a PNG${alpha ? " with a transparent background" : ""}.`}
      </p>
      <Button variant="primary" className="mt-3 w-full" disabled={busy} onClick={() => onExport(comp.kind)}>
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
