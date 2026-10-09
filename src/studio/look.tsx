// Studio — what's behind and over the work: the background (a colour or a soft sweep, plus one effect drawn over it)
// and the hairline treatment, which redraws any animation as thin ink lines. All of it is CSS and SVG sized in the
// frame's own units (cqw), so the preview and a 4K export look the same.
import type { CSSProperties } from "react"
import { BACKDROPS } from "./config"
import type { Effect } from "./comp"

export const fillCss = (fill: string) => BACKDROPS.find((b) => b.id === fill)?.css ?? fill

/** Whether a fill is dark, for picking the effect's ink and the hairline's. */
export function isDark(fill: string) {
  const b = BACKDROPS.find((x) => x.id === fill)
  if (b) return b.dark
  const m = /^#([0-9a-f]{6})$/i.exec(fill)
  if (!m) return false
  const n = parseInt(m[1], 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 110
}

/* ---------------- effects ---------------- */

let dithers = new Map<string, string>()
/** An ordered (Bayer 8×8) dither of a soft vignette, in the ink, at a resolution the amount sets: retro, and crisp at
    any size because it's scaled up pixel for pixel. */
function dither(ink: string, amount: number) {
  const key = `${ink}|${amount.toFixed(2)}`
  const hit = dithers.get(key)
  if (hit) return hit
  const B = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21]
  const w = 192
  const h = 108
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const g = c.getContext("2d")!
  const img = g.createImageData(w, h)
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16))
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x / w - 0.5) * 1.6
      const dy = (y / h - 0.42) * 1.6
      const v = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 0.25) / 0.75)) * (0.35 + amount * 0.65)
      const on = v * 64 > B[(y % 8) * 8 + (x % 8)]
      const i = (y * w + x) * 4
      img.data[i] = r
      img.data[i + 1] = gg
      img.data[i + 2] = b
      img.data[i + 3] = on ? 255 : 0
    }
  g.putImageData(img, 0, 0)
  const url = c.toDataURL()
  if (dithers.size > 24) dithers = new Map()
  dithers.set(key, url)
  return url
}

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.4 -0.2"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>')}")`

function effectStyle(effect: Effect, ink: string, amount: number): CSSProperties {
  const a = Math.max(0, Math.min(1, amount))
  const soft = "radial-gradient(75% 70% at 50% 45%, #000 40%, transparent 100%)"
  switch (effect) {
    case "glow":
      return { background: `radial-gradient(48% 42% at 50% 44%, color-mix(in oklab, ${ink} ${Math.round(a * 30)}%, transparent) 0%, transparent 100%)` }
    case "dots":
      return { backgroundImage: `radial-gradient(circle, ${ink} 0.1cqw, transparent 0.14cqw)`, backgroundSize: "2.2cqw 2.2cqw", backgroundPosition: "center", opacity: 0.12 + a * 0.45, maskImage: soft }
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${ink} 1px, transparent 1px), linear-gradient(to bottom, ${ink} 1px, transparent 1px)`,
        backgroundSize: "5cqw 5cqw",
        backgroundPosition: "center",
        opacity: 0.05 + a * 0.22,
        maskImage: soft,
      }
    case "lines":
      return { backgroundImage: `repeating-linear-gradient(135deg, ${ink} 0 0.07cqw, transparent 0.07cqw 1.3cqw)`, opacity: 0.06 + a * 0.24, maskImage: soft }
    case "noise":
      return { backgroundImage: GRAIN, backgroundSize: "16cqw 16cqw", opacity: 0.1 + a * 0.45, mixBlendMode: "overlay" }
    case "dither":
      return { backgroundImage: `url(${dither(ink, a)})`, backgroundSize: "100% 100%", imageRendering: "pixelated", opacity: 0.55 }
    default:
      return {}
  }
}

/** A technical drawing's sheet, the way the launch films lay out a teardown: a ruled border inset from the edge, zone
    references down the sides (A–D) and along the top and bottom (1–6), a faint grid, and a title block. */
function Sheet({ ink, amount, title }: { ink: string; amount: number; title?: string }) {
  const line = (w: number) => `${w}cqw solid ${ink}`
  const mono = "Geist Mono, ui-monospace, monospace"
  const zones = (n: number) => [...Array(n).keys()]
  return (
    <div className="absolute" style={{ inset: "2.2cqw", opacity: 0.35 + Math.min(1, amount) * 0.5 }}>
      <div
        className="absolute inset-0"
        style={{
          border: line(0.1),
          backgroundImage: `linear-gradient(to right, color-mix(in oklab, ${ink} 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, ${ink} 7%, transparent) 1px, transparent 1px)`,
          backgroundSize: "2.5cqw 2.5cqw",
          backgroundPosition: "1.2cqw 1.2cqw",
        }}
      />
      <div className="absolute" style={{ inset: "1.2cqw", border: line(0.06) }} />
      {zones(4).map((i) => (
        <div key={`r${i}`}>
          {[0, 1].map((side) => (
            <span key={side} className="absolute -translate-y-1/2 text-center" style={{ top: `${((i + 0.5) / 4) * 100}%`, [side ? "right" : "left"]: 0, width: "1.2cqw", fontSize: "0.62cqw", fontFamily: mono, color: ink }}>
              {"ABCD"[i]}
            </span>
          ))}
          {i > 0 && [0, 1].map((side) => <span key={`t${side}`} className="absolute" style={{ top: `${(i / 4) * 100}%`, [side ? "right" : "left"]: 0, width: "1.2cqw", borderTop: line(0.06) }} />)}
        </div>
      ))}
      {zones(6).map((i) => (
        <div key={`c${i}`}>
          {[0, 1].map((side) => (
            <span key={side} className="absolute -translate-x-1/2 text-center" style={{ left: `${((i + 0.5) / 6) * 100}%`, [side ? "bottom" : "top"]: 0, height: "1.2cqw", lineHeight: "1.2cqw", fontSize: "0.62cqw", fontFamily: mono, color: ink }}>
              {i + 1}
            </span>
          ))}
          {i > 0 && [0, 1].map((side) => <span key={`t${side}`} className="absolute" style={{ left: `${(i / 6) * 100}%`, [side ? "bottom" : "top"]: 0, height: "1.2cqw", borderLeft: line(0.06) }} />)}
        </div>
      ))}
      <div className="absolute" style={{ right: "1.2cqw", bottom: "1.2cqw", width: "20cqw", height: "4.6cqw", borderLeft: line(0.06), borderTop: line(0.06), fontFamily: mono, color: ink, fontSize: "0.6cqw", letterSpacing: "0.12em" }}>
        <div className="absolute inset-x-0" style={{ top: "50%", borderTop: line(0.05) }} />
        <div className="absolute inset-y-0" style={{ left: "62%", borderLeft: line(0.05) }} />
        <span className="absolute" style={{ left: "0.8cqw", top: "0.55cqw" }}>{(title || "Assembly").toUpperCase()}</span>
        <span className="absolute" style={{ left: "0.8cqw", bottom: "0.55cqw" }}>EXPLODED VIEW</span>
        <span className="absolute" style={{ left: "64%", top: "0.55cqw" }}>SCALE 1:1</span>
        <span className="absolute" style={{ left: "64%", bottom: "0.55cqw" }}>SHEET 1/1</span>
      </div>
    </div>
  )
}

/** The background: the fill, then the effect over it. */
export function Backdrop({ fill, effect, ink, amount, title, style }: { fill: string; effect: Effect; ink: string; amount: number; title?: string; style?: CSSProperties }) {
  const css = fillCss(fill)
  const color = /^#[0-9a-f]{6}$/i.test(ink) ? ink : isDark(fill) ? "#ffffff" : "#000000"
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: css === "transparent" ? undefined : css, ...style }}>
      {effect === "sheet" ? (
        <Sheet ink={/^#[0-9a-f]{6}$/i.test(ink) ? ink : isDark(fill) ? "#c4cede" : "#2b2b30"} amount={amount} title={title} />
      ) : (
        effect !== "none" && <div className="absolute inset-0" style={effectStyle(effect, color, amount)} />
      )}
    </div>
  )
}

/** Ink for labels and leader lines over a ground. */
export const labelInk = (fill: string) => (isDark(fill) ? "#e8eaef" : "#1d1d21")

/* ---------------- hairline ---------------- */

/** The hairline treatment for pictures on this page (an animation's frame does the same inside itself, through the
    bridge's ?hl=1): brightness, softened a touch so textures don't turn to speckle → edges (a Laplacian both ways
    round, so dark-to-light and light-to-dark edges both count) → a thin line in the ink, on nothing. The Hairline
    figures' palette: #232327 on paper, #d0d6e0 at night. Put this once on any page that uses `hairline()`. */
export function HairlineDefs() {
  const filter = (id: string, [r, g, b]: number[]) => (
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="lum" />
      <feGaussianBlur in="lum" stdDeviation="1" result="soft" />
      <feConvolveMatrix in="soft" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="up" />
      <feConvolveMatrix in="soft" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" preserveAlpha="true" result="down" />
      <feComposite in="up" in2="down" operator="arithmetic" k2="1" k3="1" result="edges" />
      <feComponentTransfer in="edges" result="lines">
        <feFuncR type="linear" slope="6.5" intercept="-0.2" />
        <feFuncG type="linear" slope="6.5" intercept="-0.2" />
        <feFuncB type="linear" slope="6.5" intercept="-0.2" />
      </feComponentTransfer>
      <feColorMatrix in="lines" type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0.34 0.33 0.33 0 0`} />
    </filter>
  )
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        {filter("hl-ink", [0x23 / 255, 0x23 / 255, 0x27 / 255])}
        {filter("hl-light", [0xd0 / 255, 0xd6 / 255, 0xe0 / 255])}
      </defs>
    </svg>
  )
}

/** The filter that redraws an element as hairlines: dark ink over a light ground, light ink over a dark one. */
export const hairline = (onDark: boolean): CSSProperties => ({ filter: `url(#${onDark ? "hl-light" : "hl-ink"})` })
