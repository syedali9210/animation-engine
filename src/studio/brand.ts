// Studio — reads a product's design system and turns it into a Brand: its grounds, ink, accent and type, so a film is
// made in the product's own colours. It takes what designers and developers actually have: CSS (custom properties,
// shadcn's bare "222 47% 11%" HSL, Tailwind v4's @theme), a Tailwind config or a theme file in JS or TS, a tokens JSON
// (Style Dictionary, Figma Tokens), a page's HTML, or a picture of the system (its palette is read from the pixels).
// Names decide roles (background, foreground, primary, card, muted…); what's left is decided by the colours themselves.
import type { Brand } from "./comp"

type Rgb = [number, number, number]

/* ---------------- colours ---------------- */

let ctx: CanvasRenderingContext2D | null = null
/** Any CSS colour to #rrggbb, by letting the browser paint it (so oklch, hsl, names… all work). */
export function toHex(css: string): string | null {
  const v = css.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`.toLowerCase()
  // shadcn's bare channels: "222.2 47.4% 11.2%" is hsl, "0.21 0.006 285.88" is oklch
  let c = v
  if (/^-?[\d.]+\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(v)) c = `hsl(${v})`
  else if (/^[\d.]+%?\s+[\d.]+\s+[\d.]+$/.test(v)) c = `oklch(${v})`
  if (!/^(#|rgb|hsl|oklch|oklab|lab|lch|hwb|color\(|[a-z]+$)/i.test(c)) return null
  if (typeof document === "undefined") return null
  ctx ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = "#010203"
  ctx.fillStyle = c
  if (ctx.fillStyle === "#010203" && !/^#010203$/i.test(c)) return null // the browser didn't take it
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  if (a < 8) return null
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
}
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const saturation = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1))
}

/* ---------------- reading the files ---------------- */

export type Found = { vars: Map<string, string>; fonts: Map<string, string>; links: string[]; name: string; radius?: number }

const strip = (f: string) =>
  f
    .split(",")
    .map((x) => x.trim().replace(/^["']|["']$/g, ""))
    .find((x) => x && !/^(ui-|system-ui|-apple-system|sans-serif|serif|monospace|var\(|BlinkMacSystemFont|inherit)/i.test(x)) ?? ""

/** Everything that looks like a token in one file. */
export function read(text: string, into: Found = { vars: new Map(), fonts: new Map(), links: [], name: "" }): Found {
  const put = (k: string, v: string) => {
    const key = k.toLowerCase().replace(/^--/, "")
    if (!into.vars.has(key)) into.vars.set(key, v.trim())
  }
  // CSS custom properties (the first definition wins: light themes come first)
  for (const m of text.matchAll(/--([\w-]+)\s*:\s*([^;{}]+)[;}]/g)) put(m[1], m[2])
  // tokens JSON: "primary": { "value": "#..." } / { "$value": ... }
  for (const m of text.matchAll(/["']([\w-]+)["']\s*:\s*\{[^{}]*?["']\$?value["']\s*:\s*["']([^"']+)["']/g)) put(m[1], m[2])
  // object keys in a config or theme: primary: "#...", 'brand-500': 'oklch(...)'
  for (const m of text.matchAll(/["']?([A-Za-z][\w-]*)["']?\s*:\s*["']((?:#|rgb|hsl|oklch|oklab)[^"']*)["']/g)) put(m[1], m[2])
  // nested colour groups in a config: primary: { DEFAULT: "#..." } → primary
  for (const m of text.matchAll(/["']?([A-Za-z][\w-]*)["']?\s*:\s*\{\s*["']?DEFAULT["']?\s*:\s*["']([^"']+)["']/g)) put(m[1], m[2])
  // fonts: --font-sans: ..., fontFamily: { sans: ["Inter", ...] }, font-family: ...
  for (const m of text.matchAll(/--font-([\w-]+)\s*:\s*([^;{}]+)/g)) if (!into.fonts.has(m[1])) into.fonts.set(m[1], strip(m[2]))
  for (const m of text.matchAll(/["']?(sans|serif|mono|display|heading|body|base|text)["']?\s*:\s*\[?\s*["']([^"']+)["']/g)) if (!into.fonts.has(m[1])) into.fonts.set(m[1], strip(m[2]))
  for (const m of text.matchAll(/font-family\s*:\s*([^;{}]+)/g)) if (!into.fonts.has("body")) into.fonts.set("body", strip(m[1]))
  for (const m of text.matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"')\s]+/g)) into.links.push(m[0].replace(/&amp;/g, "&"))
  const r = /--radius\s*:\s*([\d.]+)(rem|px)/.exec(text)
  if (r && into.radius == null) into.radius = +r[1] * (r[2] === "rem" ? 16 : 1)
  into.name ||= /<title>([^<]{1,60})<\/title>/i.exec(text)?.[1]?.split(/[|·–-]/)[0].trim() || /"name"\s*:\s*"([^"]{1,40})"/.exec(text)?.[1] || ""
  return into
}

/** The palette of a picture (a screenshot of the design system): its common colours, most common first. */
export async function readImage(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const W = 160
    const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth))
    const c = Object.assign(document.createElement("canvas"), { width: W, height: H }).getContext("2d")!
    c.drawImage(img, 0, 0, W, H)
    const d = c.getImageData(0, 0, W, H).data
    const counts = new Map<string, number>()
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue
      // quantised to 16 levels a channel, so near-identical pixels pool
      const k = [d[i], d[i + 1], d[i + 2]].map((v) => (v >> 4) * 17 + 8)
      const hex = `#${k.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`
      counts.set(hex, (counts.get(hex) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([h]) => h)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ---------------- deciding roles ---------------- */

const ROLES: [keyof Brand, RegExp, RegExp?][] = [
  ["onAccent", /^(primary-foreground|on-primary|accent-foreground|primary-contrast|brand-foreground|on-brand)$/],
  ["muted", /(muted-foreground|text-muted|secondary-foreground|subtle|fg-muted|text-secondary|tertiary)/],
  ["accent", /^(color-)?(primary|brand|accent|cta|main|highlight|tint)(-500|-600|-default)?$/, /foreground|text|on-/],
  ["ink", /^(color-)?(foreground|fg|text|ink|content|on-background|text-primary|body-text)$/],
  ["surface", /^(color-)?(card|surface|panel|popover|elevated|bg-subtle|background-secondary|secondary)$/, /foreground/],
  ["bg", /^(color-)?(background|bg|canvas|page|body|base|bg-default|surface-0)$/],
]

/** A Brand from what was read (and a picture's palette, if one was dropped). */
export function decide(found: Found, palette: string[] = []): Brand {
  const resolve = (v: string, depth = 0): string | null => {
    const ref = /var\(--([\w-]+)\)/.exec(v)
    if (ref && depth < 6) {
      const next = found.vars.get(ref[1].toLowerCase())
      return next ? resolve(next, depth + 1) : null
    }
    return toHex(v)
  }
  const colors = new Map<string, string>()
  for (const [k, v] of found.vars) {
    const hex = resolve(v)
    if (hex) colors.set(k, hex)
  }
  const pick: Partial<Record<keyof Brand, string>> = {}
  for (const [role, re, not] of ROLES)
    for (const [k, hex] of colors)
      if (!pick[role] && re.test(k) && !(not && not.test(k))) {
        pick[role] = hex
        break
      }
  const all = [...new Set([...colors.values(), ...palette])]
  // what names didn't settle, the colours do: the most common light (or dark) as the ground, the most saturated as
  // the accent, the strongest contrast to the ground as the ink
  const byLum = [...all].sort((a, b) => lum(b) - lum(a))
  const bg = pick.bg ?? (palette[0] && (lum(palette[0]) > 0.6 || lum(palette[0]) < 0.06) ? palette[0] : byLum[0]) ?? "#ffffff"
  const dark = lum(bg) < 0.25
  const accent =
    pick.accent ??
    [...all].filter((c) => saturation(c) > 0.35 && lum(c) > 0.04 && lum(c) < 0.85).sort((a, b) => saturation(b) * (1 + all.indexOf(b) * -0.02) - saturation(a) * (1 + all.indexOf(a) * -0.02))[0] ??
    (dark ? "#ffffff" : "#111111")
  const ink = pick.ink ?? [...all].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0] ?? (dark ? "#fafafa" : "#0a0a0b")
  const surface = pick.surface ?? (dark ? "#16161a" : "#f6f6f7")
  const muted = pick.muted ?? (dark ? "#a1a1aa" : "#6b6b73")
  const onAccent = pick.onAccent ?? (contrast("#ffffff", accent) >= contrast("#0a0a0b", accent) ? "#ffffff" : "#0a0a0b")
  const font = found.fonts.get("sans") || found.fonts.get("body") || found.fonts.get("base") || found.fonts.get("text") || ""
  const display = found.fonts.get("display") || found.fonts.get("heading") || font
  const mono = found.fonts.get("mono") || ""
  // fonts the page asked Google for, or a request for the families named (one that isn't there just doesn't load)
  const families = [font, display, mono].filter((f, i, a) => f && a.indexOf(f) === i && !/^(SF |San Francisco|Segoe|Helvetica|Arial|Geist)/i.test(f))
  const links = found.links.length ? found.links : families.map((f) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800&display=swap`)
  return { name: found.name, bg, surface, ink, muted, accent, onAccent, font, display, mono, radius: found.radius ?? 12, dark, fonts: [...new Set(links)] }
}

/** Reads every dropped file (and pasted text) into a Brand. */
export async function brandFrom(files: File[], pasted = ""): Promise<Brand> {
  const found: Found = { vars: new Map(), fonts: new Map(), links: [], name: "" }
  let palette: string[] = []
  for (const f of files) {
    if (f.type.startsWith("image/")) palette = [...palette, ...(await readImage(f))]
    else read(await f.text(), found)
  }
  if (pasted.trim()) read(pasted, found)
  return decide(found, palette)
}
