// Studio — a screen taken apart into its components, the way the launch films take a product apart. The screen sits in
// its device (drawn flat, front on), and each of its components (a header, a search bar, tabs, cards, a tab bar) is a
// live plate: the same screen running beside it with everything else hidden, cut to that component's box, so it lines
// up with its place on the screen to the pixel and keeps animating. Then:
//   table     the components lift out of the screen and are laid out beside the device, numbered, each leaving a
//             dashed socket where it was (the knolling shot)
//   assemble  the same, backwards: from the table into the screen
//   stack     the device lies flat and its components float above it, each at its own height; they're lit one at a
//             time, each with a leader-line label (the exploded shot)
//   focus     one component on its own, large and sharp, the camera closing in on the thing that matters in it
// Everything is drawn at the size it's seen (CSS zoom, not a scale), so text stays sharp at 4K and in a close-up.
import type { CSSProperties } from "react"
import { DeviceFrame, DEVICES, PHONE, TABLET, frameSize, viewport, type Device } from "../devices"
import type { BreakdownLayer, Scene } from "./comp"
import { focusOf, type PartItem, type PartsReport } from "./parts"
export type BreakdownLabel = {
  key: string
  name: string
  note?: string
  ax: number
  ay: number
  side: -1 | 1
  p: number
  lx?: number
  ly?: number
  caption?: boolean
}

const clamp = (x: number) => Math.min(1, Math.max(0, x))
const inOut = (x: number) => {
  const k = clamp(x)
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
}
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const range = (n: number) => [...Array(n).keys()]

/** The device a breakdown sits in, and where its screen is inside its frame. */
export function mockupOf(l: BreakdownLayer) {
  const d: Device = DEVICES.find((x) => x.id === (l.mockup === "tablet" ? "ipad" : "iphone"))!
  const v = viewport(d, false)
  if (l.mockup === "none") return { d, v, fw: v.w, fh: v.h, ox: 0, oy: 0 }
  const f = frameSize(d, false)
  const o = d.id === "iphone" ? 4 + PHONE.bezel : 3 + TABLET.bezel
  return { d, v, fw: f.w, fh: f.h, ox: o, oy: o }
}

/* ---------------- layout ---------------- */

type Geo = {
  s: number
  /** device top-left in the stage */
  dx: number
  dy: number
  /** where each part rests on the table (top-left) and at what scale (screen px to stage px) */
  slots: { x: number; y: number; k: number }[]
  /** the scale the plates are drawn at: the largest they're seen */
  z: number
}

/** Where the device stands and where each component is laid on the table. */
function tableLayout(l: BreakdownLayer, r: PartsReport, W: number, H: number): Geo {
  const m = mockupOf(l)
  const items = r.items.slice(0, l.max)
  const wide = W >= H
  const s = wide ? Math.min((0.82 * H) / m.fh, (0.34 * W) / m.fw) : Math.min((0.46 * H) / m.fh, (0.6 * W) / m.fw)
  const cx = wide ? W * 0.25 : W * 0.5
  const cy = wide ? H * 0.5 : H * 0.29
  const dx = cx - (m.fw * s) / 2
  const dy = cy - (m.fh * s) / 2
  // the table: right of the device (below it in a tall frame), parts in columns, each with room for its caption
  const x0 = wide ? dx + m.fw * s + W * 0.07 : W * 0.06
  const x1 = W * 0.95
  const y0 = wide ? H * 0.09 : dy + m.fh * s + H * 0.04
  const y1 = H * 0.93
  const gap = Math.max(W, H) * 0.022
  const caption = Math.max(W, H) * 0.034
  let best: Geo["slots"] = []
  for (const cols of [2, 3, 1]) {
    // parts may be laid out larger than they are in the device, to be read
    let k = s * 1.45
    for (let tries = 0; tries < 40; tries++) {
      // greedy: each part into the shortest column
      const heights = Array(cols).fill(0)
      const colOf: number[] = []
      for (const it of items) {
        const c = heights.indexOf(Math.min(...heights))
        colOf.push(c)
        heights[c] += it.box[3] * k + caption + gap
      }
      const colW = range(cols).map((c) => Math.max(0, ...items.filter((_, i) => colOf[i] === c).map((it) => it.box[2] * k)))
      const totalW = colW.reduce((a, b) => a + b, 0) + gap * 2 * (cols - 1)
      if (Math.max(...heights) - gap <= y1 - y0 && totalW <= x1 - x0) {
        const left = x0 + (x1 - x0 - totalW) / 2
        const top = y0 + (y1 - y0 - (Math.max(...heights) - gap)) / 2
        const xs = range(cols).map((c) => left + colW.slice(0, c).reduce((a, b) => a + b, 0) + gap * 2 * c)
        const ys = Array(cols).fill(top)
        const slots = items.map((it, i) => {
          const c = colOf[i]
          const slot = {
            x: xs[c] + (colW[c] - it.box[2] * k) / 2,
            y: ys[c],
            k,
          }
          ys[c] += it.box[3] * k + caption + gap
          return slot
        })
        if (!best.length || slots[0].k > best[0].k) best = slots
        break
      }
      k *= 0.95
    }
  }
  return { s, dx, dy, slots: best, z: Math.max(s, ...best.map((b) => b.k)) }
}

/** The layers shot: the device lying flat under the camera and its components above it, sized and centred so the
    tilted stack (projected) fills the frame. */
function stackLayout(l: BreakdownLayer, r: PartsReport, W: number, H: number) {
  const m = mockupOf(l)
  const items = r.items.slice(0, l.max)
  const n = Math.max(1, items.length)
  const RX = 56
  const RZ = -38
  const gap = (m.fh * 0.5) / n
  const [cx, sx, cz, sz] = [Math.cos((RX * Math.PI) / 180), Math.sin((RX * Math.PI) / 180), Math.cos((RZ * Math.PI) / 180), Math.sin((RZ * Math.PI) / 180)]
  // rotateZ, then rotateX (CSS applies the right-most first); orthographic is near enough to fit
  const project = (x: number, y: number, z: number) => [x * cz - y * sz, (x * sz + y * cz) * cx - z * sx]
  const pts: number[][] = []
  for (const [x, y] of [
    [0, 0],
    [m.fw, 0],
    [m.fw, m.fh],
    [0, m.fh],
  ])
    pts.push(project(x - m.fw / 2, y - m.fh / 2, 0))
  items.forEach((it, i) => {
    const z = (n - i) * gap
    for (const [x, y] of [
      [it.box[0], it.box[1]],
      [it.box[0] + it.box[2], it.box[1]],
      [it.box[0] + it.box[2], it.box[1] + it.box[3]],
      [it.box[0], it.box[1] + it.box[3]],
    ])
      pts.push(project(m.ox + x - m.fw / 2, m.oy + y - m.fh / 2, z))
  })
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const bw = Math.max(...xs) - Math.min(...xs)
  const bh = Math.max(...ys) - Math.min(...ys)
  // a little room on the left, for the labels
  const s = Math.min((0.62 * W) / bw, (0.88 * H) / bh)
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2
  const my = (Math.max(...ys) + Math.min(...ys)) / 2
  // the device's middle, placed so the whole stack is centred (a touch right of centre, for the labels)
  const px = W * 0.56 - mx * s
  const py = H * 0.5 - my * s
  // flat (before it tilts) the device fits the frame on its own
  const flat = Math.min((0.86 * H) / m.fh, (0.5 * W) / m.fw)
  return { s, px, py, gap: gap * s, RX, RZ, flat }
}

/* ---------------- the body ---------------- */

/** One live plate: the screen with only component `i` showing, cut to that component's box, drawn at zoom `z`. */
function Plate({ box, z, v, children, radius }: { box: number[]; z: number; v: { w: number; h: number }; children: React.ReactNode; radius: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius }}>
      <div className="absolute" style={{ left: -box[0] * z, top: -box[1] * z }}>
        <div style={{ zoom: z || 0.0001, width: v.w, height: v.h }}>{children}</div>
      </div>
    </div>
  )
}

export function BreakdownBody({
  l,
  report,
  size,
  frame,
  dark,
  ink,
  font,
}: {
  l: BreakdownLayer
  report: PartsReport | undefined
  size: { w: number; h: number }
  /** a live frame of the screen: "full", "none" (only its grounds), or a component's index */
  frame: (which: "full" | "none" | number) => React.ReactNode
  dark: boolean
  ink: string
  font: string
}) {
  const m = mockupOf(l)
  const W = size.w
  const H = size.h
  const n = Math.min(l.max, report?.items.length ?? l.max)
  // the zoom every plate and the device are drawn at: the biggest they'll be seen in this view, so nothing is blown up
  let z = 1
  let deviceZ = Math.min((0.82 * H) / m.fh, (0.34 * W) / m.fw)
  const focused = l.view === "focus" ? focusOf(l, report) : null
  if (l.view === "focus") {
    if (focused) z = focusZoom(focused.it, W, H).z
  } else if (report && l.view === "stack") z = deviceZ = stackLayout(l, report, W, H).s
  else if (report) {
    const g = tableLayout(l, report, W, H)
    z = g.z
    deviceZ = g.s
  } else z = deviceZ
  const radius = Math.max(4, 10 * z)
  const plateStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    transformOrigin: "0 0",
    willChange: "transform",
  }
  const sockets = report?.items.slice(0, n) ?? []
  return (
    <div data-bd="" className="absolute inset-0" style={{ perspective: `${Math.round(Math.max(W, H) * 2.2)}px` }}>
      <div data-world="" className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {l.view === "focus" && (
          // a close-up shows one component, but the whole screen still has to run to say what its components are
          <div
            aria-hidden
            className="absolute"
            style={{
              left: -100000,
              top: 0,
              width: m.v.w,
              height: m.v.h,
              visibility: "hidden",
            }}
          >
            {frame("full")}
          </div>
        )}
        {l.view !== "focus" && (
          <div data-device="" style={{ ...plateStyle, transformStyle: "preserve-3d" }}>
            <div style={{ zoom: deviceZ || 0.0001 }}>
              {l.mockup === "none" ? (
                <div className="relative overflow-hidden" style={{ width: m.v.w, height: m.v.h, borderRadius: 44 }}>
                  <ScreenLayers frame={frame} sockets={sockets} ink={ink} font={font} />
                </div>
              ) : (
                <DeviceFrame d={m.d} landscape={false} dark={dark}>
                  <ScreenLayers frame={frame} sockets={sockets} ink={ink} font={font} />
                </DeviceFrame>
              )}
            </div>
          </div>
        )}
        {l.view === "stack" &&
          // each layer drawn as the whole screen's outline at its height, so the stack reads as the screen's layers
          range(n).map((i) => <div key={`g${i}`} data-ghost={i} style={{ ...plateStyle, width: m.v.w * z, height: m.v.h * z, border: `1px solid ${ink}`, borderRadius: 40 * z, opacity: 0 }} />)}
        {range(l.max).map((i) => {
          // a close-up runs only its own component's screen
          if (l.view === "focus" && i !== focused?.idx) return null
          const it = report?.items[i]
          const box = it?.box ?? [0, 0, 1, 1]
          return (
            <div
              key={i}
              data-plate={i}
              style={{
                ...plateStyle,
                width: box[2] * z,
                height: box[3] * z,
                display: it && i < n ? "" : "none",
              }}
            >
              <Plate box={box} z={z} v={m.v} radius={radius}>
                {frame(i)}
              </Plate>
              <span data-anchor="" className="absolute" style={{ left: 0, top: "50%", width: 1, height: 1 }} />
              {it?.key && (
                <span
                  data-key=""
                  className="absolute"
                  style={{
                    left: (it.key[0] - box[0] + it.key[2] / 2) * z,
                    top: (it.key[1] - box[1] + it.key[3] / 2) * z,
                    width: 1,
                    height: 1,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The device's screen: its grounds (always), the whole screen over them (until the parts take its place), and the
    dashed sockets with their numbers that the parts leave behind. */
function ScreenLayers({ frame, sockets, ink, font }: { frame: (which: "full" | "none" | number) => React.ReactNode; sockets: PartItem[]; ink: string; font: string }) {
  return (
    <>
      <div className="absolute inset-0">{frame("none")}</div>
      <div data-full="" className="absolute inset-0">
        {frame("full")}
      </div>
      {/* the base screen recedes when its layers lift off it */}
      <div data-shade="" className="absolute inset-0" style={{ background: "#000", opacity: 0 }} />
      {sockets.map((p) => (
        <div
          key={p.i}
          data-socket={p.i}
          className="absolute"
          style={{
            left: p.box[0] + 4,
            top: p.box[1] + 4,
            width: Math.max(0, p.box[2] - 8),
            height: Math.max(0, p.box[3] - 8),
            border: "1.5px dashed rgba(255,255,255,0.78)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.18)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            opacity: 0,
          }}
        >
          <span className="absolute left-2 top-1.5 rounded-full px-1.5 text-[11px] font-semibold leading-[18px] shadow-sm" style={{ background: "#fff", color: "#111", fontFamily: font }}>
            {String(p.i + 1).padStart(2, "0")}
          </span>
        </div>
      ))}
    </>
  )
}

/* ---------------- views ---------------- */

/** The close-up: how big the component is drawn so its key element can fill a third of the frame without blowing up. */
function focusZoom(it: PartItem, W: number, H: number) {
  const bw = it.box[2]
  const bh = it.box[3]
  // the whole component, comfortably in the frame
  const fit = Math.min((0.52 * W) / bw, (0.66 * H) / bh)
  // then in on its key element, until that's a third of the frame wide (at most 2.4×)
  const key = it.key ?? [it.box[0], it.box[1], bw, bh]
  const push = Math.max(1, Math.min(2.4, (0.34 * W) / (key[2] * fit), (0.42 * H) / (key[3] * fit)))
  return { fit, push, z: fit * push }
}

/** Moves a breakdown to `t` seconds into its scene; returns the labels it wants drawn. */
export function animateBreakdown(
  root: HTMLElement,
  l: BreakdownLayer,
  report: PartsReport | undefined,
  t: number,
  scene: Scene,
  size: { w: number; h: number },
  inScene: (r: DOMRect) => { x: number; y: number },
): BreakdownLabel[] {
  const W = size.w
  const H = size.h
  const out: BreakdownLabel[] = []
  if (!report || !W) return out
  const m = mockupOf(l)
  const n = Math.min(l.max, report.items.length)
  const items = report.items.slice(0, n)
  const world = root.querySelector<HTMLElement>("[data-world]")
  const device = root.querySelector<HTMLElement>("[data-device]")
  const full = root.querySelector<HTMLElement>("[data-full]")
  const plates: HTMLElement[] = []
  root.querySelectorAll<HTMLElement>("[data-plate]").forEach((p) => (plates[Number(p.dataset.plate)] = p))
  const sockets = [...root.querySelectorAll<HTMLElement>("[data-socket]")]
  const shade = root.querySelector<HTMLElement>("[data-shade]")
  if (shade) shade.style.opacity = "0"
  plates.forEach((p, i) => (p.style.display = i < n ? "" : "none"))
  const dur = scene.duration
  const name = (i: number) => l.names?.[i] || items[i]?.name || `Part ${i + 1}`
  const num = (i: number) => String(i + 1).padStart(2, "0")

  if (l.view === "table" || l.view === "assemble") {
    const g = tableLayout(l, report, W, H)
    const back = l.view === "assemble"
    // put back together, the device glides to the middle of the frame
    const whole = back ? inOut((t - (0.5 + (n - 1) * 0.1 + 1.25)) / 1.1) : 0
    const shift = (W / 2 - (g.dx + (m.fw * g.s) / 2)) * whole
    if (world) world.style.transform = `translate(${shift}px, 0) scale(${1 + 0.03 * clamp(t / dur) + 0.06 * whole})`
    if (world) world.style.transformOrigin = `${W / 2}px ${H / 2}px`
    if (device) device.style.transform = `translate(${g.dx}px, ${g.dy}px)`
    // each part's journey, 0 on the screen, 1 on the table
    const u = items.map((_, i) => (back ? 1 - clamp((t - (0.5 + (n - 1 - i) * 0.1)) / 1.15) : clamp((t - (0.45 + i * 0.1)) / 1.15)))
    const leaving = back ? clamp((t - (0.5 + (n - 1) * 0.1 + 1.15)) / 0.25) : 1 - clamp((t - 0.42) / 0.12)
    if (full) full.style.opacity = String(leaving)
    items.forEach((it, i) => {
      const p = plates[i]
      const slot = g.slots[i]
      if (!p || !slot) return
      const e = inOut(u[i])
      const arc = Math.sin(Math.PI * e)
      const sx = g.dx + (m.ox + it.box[0]) * g.s
      const sy = g.dy + (m.oy + it.box[1]) * g.s
      const x = lerp(sx, slot.x, e)
      const y = lerp(sy, slot.y, e) - arc * H * 0.05
      // drawn at g.z; on the screen it's at the device's scale, on the table at its slot's
      const k = (lerp(g.s, slot.k, e) / g.z) * (1 + 0.035 * arc)
      const rot = arc * (i % 2 ? 1.6 : -1.6)
      p.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${k})`
      // on the screen the plate is the screen; lifted, it casts a shadow
      const lift = Math.max(arc, e * 0.5)
      p.style.boxShadow = lift > 0.01 ? `0 ${(2 + 14 * lift) * g.s}px ${(6 + 34 * lift) * g.s}px rgba(0,0,0,${0.1 + 0.18 * lift})` : "none"
      p.style.borderRadius = `${10 * g.s}px`
      p.style.opacity = "1"
      if (sockets[i]) sockets[i].style.opacity = String(clamp(u[i] * 3) * 0.85)
      // its caption on the table
      const cp = back ? clamp((u[i] - 0.4) / 0.5) : clamp((u[i] - 0.82) / 0.18)
      out.push({
        key: `${l.id}:${i}`,
        name: `${num(i)}  ${name(i)}`,
        note: it.note,
        ax: 0,
        ay: 0,
        side: 1,
        lx: slot.x + (it.box[2] * slot.k) / 2,
        ly: slot.y + it.box[3] * slot.k + Math.max(W, H) * 0.008,
        caption: true,
        p: cp,
      })
    })
    return out
  }

  if (l.view === "stack") {
    const g = stackLayout(l, report, W, H)
    const a = inOut((t - 0.1) / 1.1)
    const rx = g.RX * a
    const rz = g.RZ * a - 5 * clamp((t - 1.2) / Math.max(1, dur - 1.2))
    // flat, the device fits the frame on its own and sits in the middle; tilted, the whole stack does
    const sc = lerp(g.flat / g.s, 1, a)
    const cx = lerp(W / 2, g.px, a)
    const cy = lerp(H / 2, g.py, a)
    if (world) {
      world.style.transformOrigin = "0 0"
      world.style.transform = `translate(${cx}px, ${cy}px) scale(${sc}) rotateX(${rx}deg) rotateZ(${rz}deg)`
    }
    // the device's middle sits at the world's origin
    const dx = (-m.fw * g.s) / 2
    const dy = (-m.fh * g.s) / 2
    if (device) device.style.transform = `translate(${dx}px, ${dy}px)`
    const rise = items.map((_, i) => inOut((t - 0.8 - i * 0.07) / 0.9))
    if (full) full.style.opacity = String(1 - clamp((t - 0.78) / 0.1))
    if (shade) shade.style.opacity = String(0.42 * Math.max(0, ...rise))
    const ghosts = [...root.querySelectorAll<HTMLElement>("[data-ghost]")]
    // every layer is labelled, one after another, and the labels stay; each layer catches the light as its label draws
    const per = Math.min(0.32, Math.max(0.16, (dur - 3.2) / Math.max(1, n)))
    items.forEach((it, i) => {
      const p = plates[i]
      if (!p) return
      const zz = (n - i) * g.gap * rise[i]
      p.style.transform = `translate(${dx + (m.ox + it.box[0]) * g.s}px, ${dy + (m.oy + it.box[1]) * g.s}px) translateZ(${zz}px)`
      p.style.borderRadius = `${10 * g.s}px`
      const at = 1.9 + i * per
      const ring = clamp(1 - Math.abs(t - at - 0.2) / 0.45)
      const lift = rise[i] > 0.02 ? `0 ${10 * g.s}px ${36 * g.s}px rgba(0,0,0,${0.14 + 0.2 * rise[i]})` : ""
      p.style.boxShadow = [ring > 0.01 ? `0 0 0 ${2 / Math.max(0.2, g.s)}px rgba(255,255,255,${0.85 * ring})` : "", lift].filter(Boolean).join(", ") || "none"
      p.style.opacity = "1"
      p.style.filter = ""
      if (ghosts[i]) {
        ghosts[i].style.transform = `translate(${dx + m.ox * g.s}px, ${dy + m.oy * g.s}px) translateZ(${zz}px)`
        ghosts[i].style.opacity = String(0.22 * clamp((rise[i] - 0.15) / 0.5))
      }
      if (sockets[i]) sockets[i].style.opacity = String(clamp(rise[i] * 2) * 0.8)
      const anchor = p.querySelector<HTMLElement>("[data-anchor]")
      if (anchor && t >= at) {
        const pt = inScene(anchor.getBoundingClientRect())
        out.push({ key: `${l.id}:${i}`, name: name(i), note: it.note, ax: pt.x, ay: pt.y, side: -1, p: clamp((t - at) / 0.5) })
      }
    })
    return out
  }

  // focus: one component, large and sharp, the camera closing in on its key element
  const f = focusOf(l, report)
  if (!f) return out
  const { it, idx } = f
  const { fit, push, z } = focusZoom(it, W, H)
  plates.forEach((p, i) => (p.style.display = i === idx ? "" : "none"))
  const p = plates[idx]
  if (!p) return out
  const enter = expoOut(t / 1.3)
  const closing = inOut((t - 1.15) / Math.max(1, dur - 1.6))
  const scale = lerp(1, push, closing) / push // the plate is drawn at full push; at rest it's scaled down to fit
  const bw = it.box[2] * z
  const bh = it.box[3] * z
  const key = it.key ?? [it.box[0], it.box[1], it.box[2], it.box[3]]
  // what the camera centres: the component's middle, moving to its key element as it closes in
  const fx = lerp(bw / 2, (key[0] - it.box[0] + key[2] / 2) * z, closing)
  const fy = lerp(bh / 2, (key[1] - it.box[1] + key[3] / 2) * z, closing)
  const cx = W * 0.58
  const cy = H * (0.5 + 0.03 * (1 - enter))
  if (world) {
    world.style.transformOrigin = `${cx}px ${cy}px`
    world.style.transform = `rotateX(${4 + 18 * (1 - enter)}deg) rotateY(${-5 - 14 * (1 - enter)}deg)`
  }
  // the left third is the title's: closing in, a wide component grows right, off the frame, not over the words
  const x = Math.max(W * 0.33, cx - fx * scale)
  p.style.transform = `translate(${x}px, ${cy - fy * scale}px) scale(${scale})`
  p.style.opacity = String(clamp(t / 0.5))
  p.style.borderRadius = `${12 * fit}px`
  p.style.boxShadow = `0 ${W * 0.02}px ${W * 0.06}px rgba(0,0,0,0.22)`
  const kEl = p.querySelector<HTMLElement>("[data-key]")
  if (kEl) {
    // the label sits in the margin left of the component, its leader running in to the key element's edge
    const edge = (r: DOMRect) => inScene(new DOMRect(r.left, r.top, 0, r.height))
    const pt = edge(kEl.getBoundingClientRect())
    const left = edge(p.getBoundingClientRect()).x
    out.push({
      key: `${l.id}:focus`,
      name: name(idx),
      note: it.note,
      ax: pt.x + W * 0.006,
      ay: pt.y,
      side: -1,
      lx: Math.max(W * 0.15, left - W * 0.035),
      ly: pt.y,
      p: clamp((t - 0.9) / 0.6),
    })
  }
  return out
}

/** Every frame a breakdown needs, by the name the view asks for. */
export const breakdownFrames = (l: BreakdownLayer) => ["full", "none", ...range(l.max)] as const
