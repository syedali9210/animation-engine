// Studio — the Layers panel: every scene in order, and inside each the layers it's made of, front first, the way a
// design tool lists them. Pick one to edit it, drag to reorder, the eye hides it, ⋯ has the rest. Animated layers say
// so. The background, shared by every scene, sits at the bottom. Also: the template gallery and the animation picker.
import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CaretRight,
  Copy,
  CubeTransparent,
  LineSegment,
  DeviceMobile,
  DeviceTablet,
  DotsThree,
  Eye,
  EyeSlash,
  FilmSlate,
  Image as ImageIcon,
  Laptop,
  MagnifyingGlass,
  PaintBucket,
  Plus,
  SquaresFour,
  TextT,
  Trash,
  X,
} from "@phosphor-icons/react"
import { DEVICES, type DeviceId } from "../devices"
import { ANIMS, byId } from "../registry"
import { Button, Dialog, IconButton, MenuItem, Popover, type Icon } from "../ui"
import { EFFECTS, SAMPLE_COPY, TEMPLATES, isAnimated, uid, type Comp, type Layer, type Scene, type Template } from "./comp"
import { BACKDROPS } from "./config"
import { fillCss } from "./look"
import type { Sel } from "./Stage"

export const BG = "@bg"
const DEVICE_ICON: Record<DeviceId, Icon> = { iphone: DeviceMobile, duo: BookOpen, ipad: DeviceTablet, macbook: Laptop }
export const layerIcon = (l: Layer): Icon =>
  l.kind === "device" ? DEVICE_ICON[l.device] : l.kind === "component" ? SquaresFour : l.kind === "image" ? ImageIcon : l.kind === "breakdown" ? CubeTransparent : l.kind === "callout" ? LineSegment : TextT
export function layerName(l: Layer) {
  if (l.name) return l.name
  if (l.kind === "device") return DEVICES.find((d) => d.id === l.device)!.name
  if (l.kind === "component") return byId(l.anim)?.name ?? "Component"
  if (l.kind === "breakdown") return `${byId(l.anim)?.name ?? "Screen"}, ${BD_NAME[l.view]}`
  if (l.kind === "image") return l.file || "Image"
  if (l.kind === "callout") return l.text || "Callout"
  return l.text.split("\n")[0].replace("|", "") || "Title"
}
const BD_NAME = { table: "on the table", assemble: "assembling", stack: "in layers", focus: "close up" }
const BD_NOTE = { table: "Components out onto the table", assemble: "Components into the screen", stack: "Components floating in layers", focus: "One component, close" }
function layerNote(l: Layer) {
  if (l.kind === "device") return l.content.kind === "current" ? "Live screen" : l.content.kind === "anim" ? (byId(l.content.id)?.name ?? "Animation") : "Picture"
  if (l.kind === "component") return `${l.shot && l.shot !== "flat" ? `${l.shot[0].toUpperCase()}${l.shot.slice(1)} shot` : l.enter === "none" ? "Animation" : `Enters: ${l.enter}`}${l.hairline ? " · hairline" : ""}`
  if (l.kind === "breakdown") return `${BD_NOTE[l.view]}${l.lines ? " · hairline" : ""}`
  if (l.kind === "image") return l.enter === "none" ? "Picture" : `Enters: ${l.enter}`
  if (l.kind === "callout") return "Label with a leader line"
  return l.enter === "none" ? "Title" : `Enters: ${l.enter}`
}

export function LayersPanel({
  comp,
  setComp,
  sel,
  setSel,
  onAdd,
  onTemplates,
  undo,
  hideTitle,
}: {
  comp: Comp
  setComp: (fn: (c: Comp) => Comp) => void
  sel: Sel
  setSel: (s: Sel) => void
  onAdd: (kind: "scene" | "device" | "component" | "breakdown" | "image" | "text" | "callout", device?: DeviceId) => void
  onTemplates: () => void
  /** after a template replaced the composition: put the old one back */
  undo?: { label: string; run: () => void }
  /** in a sheet that already says "Layers" */
  hideTitle?: boolean
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const isOpen = (id: string) => open[id] ?? id === sel.scene
  const scenes = (fn: (s: Scene[]) => Scene[]) => setComp((c) => ({ ...c, scenes: fn(c.scenes) }))
  const layers = (sid: string, fn: (l: Layer[]) => Layer[]) => scenes((ss) => ss.map((s) => (s.id === sid ? { ...s, layers: fn(s.layers) } : s)))
  const shift = <T,>(list: T[], i: number, by: number) => {
    const j = i + by
    if (j < 0 || j >= list.length) return list
    const out = [...list]
    ;[out[i], out[j]] = [out[j], out[i]]
    return out
  }

  // dragging a layer row up or down its scene's list
  const [dragging, setDragging] = useState<{ scene: string; id: string; over: number } | null>(null)
  const rows = useRef(new Map<string, HTMLElement>())
  const press = useRef<{ scene: string; id: string; y: number } | null>(null)

  const bgName = BACKDROPS.find((b) => b.id === comp.fill)?.name ?? "Custom colour"
  const fx = EFFECTS.find((e) => e.id === comp.effect)

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b pl-4 pr-2">
        <h2 className={`mr-auto text-body font-semibold ${hideTitle ? "sr-only" : ""}`}>Layers</h2>
        {hideTitle && <span className="mr-auto" />}
        <Button size="sm" variant="ghost" onClick={onTemplates}>
          <FilmSlate size={14} aria-hidden />
          Templates
        </Button>
        <IconButton label="Add" popover="layers-add">
          <Plus size={16} />
        </IconButton>
        <Popover id="layers-add" align="end" label="Add">
          <div className="w-[260px] p-1.5">
            <MenuItem icon={FilmSlate} hint="A new shot after this one, with the same devices." onSelect={() => onAdd("scene")}>
              Scene
            </MenuItem>
            <div className="my-1 border-t" />
            <p className="px-2.5 pb-1 pt-1.5 text-micro font-medium text-fg-3">Device, matched to the others in this scene</p>
            {DEVICES.map((d) => (
              <MenuItem key={d.id} icon={DEVICE_ICON[d.id]} onSelect={() => onAdd("device", d.id)}>
                {d.name}
              </MenuItem>
            ))}
            <div className="my-1 border-t" />
            <MenuItem icon={SquaresFour} hint="Any animation from the library, outside a device." onSelect={() => onAdd("component")}>
              Component
            </MenuItem>
            <MenuItem icon={CubeTransparent} hint="A screen taken apart into its components: on the table, in layers, or one close up." onSelect={() => onAdd("breakdown")}>
              Breakdown
            </MenuItem>
            <MenuItem icon={ImageIcon} onSelect={() => onAdd("image")}>
              Picture
            </MenuItem>
            <MenuItem icon={TextT} onSelect={() => onAdd("text")}>
              Title
            </MenuItem>
            <MenuItem icon={LineSegment} hint="A label with a leader line to a point." onSelect={() => onAdd("callout")}>
              Callout
            </MenuItem>
          </div>
        </Popover>
      </div>

      {undo && (
        <div className="flex items-center gap-2 border-b bg-surface-2 px-4 py-2 text-caption text-fg-2">
          <span className="mr-auto truncate">{undo.label}</span>
          <button type="button" onClick={undo.run} className="press rounded font-medium text-fg underline decoration-fg-3 underline-offset-4">
            Undo
          </button>
        </div>
      )}

      <div role="tree" aria-label="Scenes and layers" className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {comp.scenes.map((s, si) => {
          const on = sel.scene === s.id && !sel.layer
          const front = [...s.layers].reverse() // front first, like a layers panel
          return (
            <div key={s.id} role="treeitem" aria-expanded={isOpen(s.id)} aria-selected={on} className="mb-0.5">
              <div className={`group flex h-9 items-center gap-1 rounded-md pr-1 ${on ? "bg-surface-3" : "hover:bg-surface-2"}`}>
                <button
                  type="button"
                  aria-label={isOpen(s.id) ? `Collapse ${s.name}` : `Expand ${s.name}`}
                  onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen(s.id) }))}
                  className="grid h-7 w-6 shrink-0 place-items-center rounded text-fg-3 hover:text-fg"
                >
                  <CaretRight size={12} weight="bold" className={`transition-transform duration-150 ${isOpen(s.id) ? "rotate-90" : ""}`} />
                </button>
                <button type="button" onClick={() => setSel({ scene: s.id })} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
                  <span className="w-4 shrink-0 text-caption tabular-nums text-fg-3">{si + 1}</span>
                  <span className={`truncate text-body ${on ? "font-medium text-fg" : "text-fg-2"}`}>{s.name}</span>
                  <span className="ml-auto shrink-0 text-caption tabular-nums text-fg-3">{s.duration.toFixed(1)}s</span>
                </button>
                <span className={`flex ${on ? "" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"}`}>
                  <IconButton size="sm" label={`${s.name}: more`} popover={`scene-${s.id}`}>
                    <DotsThree size={16} weight="bold" />
                  </IconButton>
                </span>
                <Popover id={`scene-${s.id}`} align="end" label={s.name}>
                  <div className="w-[220px] p-1.5">
                    <MenuItem
                      icon={Copy}
                      onSelect={() => {
                        const copy = { ...s, id: uid(), name: `${s.name} copy`, layers: s.layers.map((l) => ({ ...l, id: uid() })) }
                        scenes((ss) => [...ss.slice(0, si + 1), copy, ...ss.slice(si + 1)])
                        setSel({ scene: copy.id })
                      }}
                    >
                      Duplicate
                    </MenuItem>
                    <MenuItem icon={ArrowUp} disabled={si === 0} onSelect={() => scenes((ss) => shift(ss, si, -1))}>
                      Move earlier
                    </MenuItem>
                    <MenuItem icon={ArrowDown} disabled={si === comp.scenes.length - 1} onSelect={() => scenes((ss) => shift(ss, si, 1))}>
                      Move later
                    </MenuItem>
                    <MenuItem
                      icon={Trash}
                      disabled={comp.scenes.length === 1}
                      onSelect={() => {
                        scenes((ss) => ss.filter((x) => x.id !== s.id))
                        setSel({ scene: comp.scenes[si === 0 ? 1 : si - 1].id })
                      }}
                    >
                      Delete scene
                    </MenuItem>
                  </div>
                </Popover>
              </div>

              {isOpen(s.id) && (
                <ul role="group" className="relative">
                  {!front.length && <li className="py-1.5 pl-11 text-caption text-fg-3">Empty. Add a device, a component or a title.</li>}
                  {front.map((l) => {
                    const i = s.layers.indexOf(l)
                    const picked = sel.scene === s.id && sel.layer === l.id
                    const I = layerIcon(l)
                    const over = dragging?.scene === s.id && dragging.over === i && dragging.id !== l.id
                    return (
                      <li
                        key={l.id}
                        ref={(el) => {
                          if (el) rows.current.set(l.id, el)
                          else rows.current.delete(l.id)
                        }}
                        role="treeitem"
                        aria-selected={picked}
                        className={`group relative flex h-9 touch-none items-center gap-1 rounded-md pl-6 pr-1 ${picked ? "bg-surface-3" : "hover:bg-surface-2"} ${dragging?.id === l.id ? "opacity-60" : ""}`}
                        onPointerDown={(e) => {
                          if ((e.target as Element).closest("button[data-act]") || e.button !== 0) return
                          press.current = { scene: s.id, id: l.id, y: e.clientY }
                          e.currentTarget.setPointerCapture(e.pointerId)
                        }}
                        onPointerMove={(e) => {
                          const p = press.current
                          if (!p) return
                          if (!dragging && Math.abs(e.clientY - p.y) < 5) return
                          // the row the pointer is over, in the scene's own order
                          let target = i
                          for (const x of s.layers) {
                            const r = rows.current.get(x.id)?.getBoundingClientRect()
                            if (r && e.clientY >= r.top && e.clientY < r.bottom) target = s.layers.indexOf(x)
                          }
                          setDragging({ scene: s.id, id: l.id, over: target })
                        }}
                        onPointerUp={() => {
                          const p = press.current
                          press.current = null
                          if (dragging && p) {
                            const to = dragging.over
                            layers(s.id, (ls) => {
                              const from = ls.findIndex((x) => x.id === p.id)
                              const out = ls.filter((x) => x.id !== p.id)
                              out.splice(to, 0, ls[from])
                              return out
                            })
                            setDragging(null)
                          } else setSel({ scene: s.id, layer: l.id })
                        }}
                        onPointerCancel={() => {
                          press.current = null
                          setDragging(null)
                        }}
                        onKeyDown={(e) => {
                          if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
                          e.preventDefault()
                          layers(s.id, (ls) => shift(ls, i, e.key === "ArrowUp" ? 1 : -1)) // up the list = towards the front
                        }}
                      >
                        {over && <span aria-hidden className="absolute inset-x-2 -top-px h-0.5 rounded-full bg-fg" />}
                        <button
                          type="button"
                          aria-pressed={picked}
                          onClick={() => setSel({ scene: s.id, layer: l.id })}
                          className="flex min-w-0 flex-1 cursor-grab items-center gap-2 py-1 text-left active:cursor-grabbing"
                        >
                          <I size={15} aria-hidden className={`shrink-0 ${l.hidden ? "text-fg-3" : "text-fg-2"}`} />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-body leading-4 ${l.hidden ? "text-fg-3 line-through" : picked ? "font-medium text-fg" : "text-fg-2"}`}>{layerName(l)}</span>
                            <span className="block truncate text-micro text-fg-3">{layerNote(l)}</span>
                          </span>
                          {isAnimated(l) && (
                            <span title="Animated" className="grid h-4 w-4 shrink-0 place-items-center">
                              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg" />
                              <span className="sr-only">(animated)</span>
                            </span>
                          )}
                        </button>
                        <span className={`flex items-center ${picked || l.hidden ? "" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"}`}>
                          <span data-act>
                            <IconButton size="sm" label={l.hidden ? `Show ${layerName(l)}` : `Hide ${layerName(l)}`} active={l.hidden} onClick={() => layers(s.id, (ls) => ls.map((x) => (x.id === l.id ? { ...x, hidden: !x.hidden } : x)))}>
                              {l.hidden ? <EyeSlash size={14} /> : <Eye size={14} />}
                            </IconButton>
                          </span>
                          <span data-act>
                            <IconButton size="sm" label={`${layerName(l)}: more`} popover={`layer-${l.id}`}>
                              <DotsThree size={16} weight="bold" />
                            </IconButton>
                          </span>
                        </span>
                        <Popover id={`layer-${l.id}`} align="end" label={layerName(l)}>
                          <div className="w-[220px] p-1.5">
                            <MenuItem icon={ArrowUp} disabled={i === s.layers.length - 1} onSelect={() => layers(s.id, (ls) => shift(ls, i, 1))}>
                              Bring forward
                            </MenuItem>
                            <MenuItem icon={ArrowDown} disabled={i === 0} onSelect={() => layers(s.id, (ls) => shift(ls, i, -1))}>
                              Send backward
                            </MenuItem>
                            <MenuItem
                              icon={Copy}
                              onSelect={() => {
                                const copy = { ...l, id: uid() } as Layer
                                layers(s.id, (ls) => [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)])
                                setSel({ scene: s.id, layer: copy.id })
                              }}
                            >
                              Duplicate
                            </MenuItem>
                            <MenuItem
                              icon={Trash}
                              onSelect={() => {
                                layers(s.id, (ls) => ls.filter((x) => x.id !== l.id))
                                setSel({ scene: s.id })
                              }}
                            >
                              Delete
                            </MenuItem>
                          </div>
                        </Popover>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setSel({ scene: sel.scene, layer: BG })}
        aria-pressed={sel.layer === BG}
        className={`press flex h-12 shrink-0 items-center gap-2.5 border-t px-4 text-left ${sel.layer === BG ? "bg-surface-3" : "hover:bg-surface-2"}`}
      >
        <span aria-hidden className="h-5 w-5 shrink-0 rounded shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)]" style={{ background: comp.fill === "transparent" ? "repeating-conic-gradient(#e4e4e8 0% 25%, #f6f6f8 0% 50%) 50% / 8px 8px" : fillCss(comp.fill) }} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium">Background</span>
          <span className="block truncate text-micro text-fg-3">
            {bgName}
            {comp.effect !== "none" ? ` · ${fx?.name}` : ""} · {comp.light === "dramatic" ? "Keynote light" : comp.light === "soft" ? "Soft light" : "Studio light"}
          </span>
        </span>
        <PaintBucket size={15} aria-hidden className="shrink-0 text-fg-3" />
      </button>
    </div>
  )
}

/* ---------------- the template gallery ---------------- */

/** A storyboard of the template: one card per scene, drawn from what's in it. */
function Storyboard({ t }: { t: Template }) {
  const c = t.make({ device: "iphone", posture: "open", name: "Title", anim: ANIMS[0].id, copy: SAMPLE_COPY })
  return (
    <div className="flex h-16 gap-1 rounded-md p-1.5" style={{ background: c.auto ? "linear-gradient(90deg, #0b0b0d 0%, #1b1b20 45%, #f2f1ec 55%, #0b0b0d 100%)" : fillCss(c.fill) }}>
      {c.scenes.slice(0, 8).map((s) => (
        <div key={s.id} className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[4px] bg-white/10 shadow-[inset_0_0_0_1px_rgb(127_127_127/0.25)]">
          {s.layers.map((l) => {
            const I = layerIcon(l)
            return <I key={l.id} size={l.kind === "device" ? 14 : 11} className={c.fill === "black" || c.fill === "midnight" || c.auto ? "text-white/80" : "text-black/60"} />
          })}
        </div>
      ))}
    </div>
  )
}

export function TemplateDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: Template) => void }) {
  return (
    <Dialog open={open} onClose={onClose} label="Templates" className="modal">
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between border-b py-3 pl-5 pr-3">
          <div>
            <h2 className="text-ui font-semibold">Start from a template</h2>
            <p className="text-caption text-fg-3">It uses what's open now: the device, the animation on its screen, its own words for the copy, and your brand.</p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <ul className="scroll-thin grid min-h-0 grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onPick(t)} className="press flex w-full flex-col gap-2 rounded-lg p-2 text-left shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2">
                <Storyboard t={t} />
                <span className="px-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body font-medium">{t.name}</span>
                    <span className="text-micro tabular-nums text-fg-3">{t.scenes === 1 ? "1 scene" : `${t.scenes} scenes`}</span>
                  </span>
                  <span className="mt-0.5 block text-caption text-fg-3">{t.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}

/* ---------------- the animation picker ---------------- */

export function AnimPicker({ open, onClose, onPick, dark, title = "Pick an animation" }: { open: boolean; onClose: () => void; onPick: (id: string) => void; dark: boolean; title?: string }) {
  const [q, setQ] = useState("")
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus())
  }, [open])
  const list = ANIMS.filter((a) => !q || `${a.name} ${a.category}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog open={open} onClose={onClose} label={title} className="modal">
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center gap-2 border-b py-2.5 pl-4 pr-3">
          <MagnifyingGlass size={15} aria-hidden className="shrink-0 text-fg-3" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={title} aria-label="Search animations" className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-fg-3" />
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <ul className="scroll-thin grid min-h-0 grid-cols-3 gap-x-2 gap-y-3 overflow-y-auto p-3">
          {list.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(a.id)
                  onClose()
                }}
                className="press block w-full rounded-lg text-left"
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-canvas shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1px_var(--line-strong)]">
                  <img src={`/thumbs/${a.id}-${dark ? "dark" : "light"}.webp`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="mt-1 block truncate px-0.5 text-caption font-medium text-fg-2">{a.name}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="col-span-3 py-8 text-center text-body text-fg-3">Nothing matches “{q}”.</li>}
        </ul>
      </div>
    </Dialog>
  )
}

export const Hint = ({ children }: { children: ReactNode }) => <p className="mt-1.5 text-caption text-fg-3">{children}</p>
