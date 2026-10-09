// Studio — the copy writer. It reads what a component is and what it shows (its name, blurb and category, the text it
// renders on screen, biggest first, its buttons, the strings in its code, a built screen's layers, the brand's name)
// and writes the lines a launch film needs: a hook, the name, feature lines in the launch films' short noun-phrase
// style, a line that parts around a device, a tagline and a call to action. With an Anthropic API key on the dev server
// it asks Claude for them; without one it writes them itself from what it read. It never invents numbers: a proof line
// only uses a figure that's on the screen.
import { byId, htmlUrl, type AnimMeta } from "../registry"

export type ScreenText = { t: string; size: number; weight: number; tag: string; control: boolean }
export type CopyContext = {
  name: string
  blurb: string
  category: string
  tech: string[]
  /** the knobs it has: their labels say what it's about */
  params: string[]
  /** what it shows, biggest first */
  texts: ScreenText[]
  /** strings in its code that read like copy */
  strings: string[]
  /** a built screen's layers */
  layers: string[]
  brand: string
}
export type Copy = {
  kicker: string
  hook: string
  name: string
  tagline: string
  features: string[]
  /** for words parting around a device: "left | right" */
  split: string
  proof: string
  cta: string
  /** where it came from */
  by: "claude" | "rules"
}

/* ---------------- reading the component ---------------- */

/** What a component shows: it's loaded off screen, and the bridge reads its text back. */
export function describe(a: AnimMeta, timeout = 7000): Promise<{ texts: ScreenText[]; colors: string[] }> {
  return new Promise((resolve) => {
    const frame = `copy-${Math.random().toString(36).slice(2, 8)}`
    const q = new URLSearchParams({ frame, rm: "1", cs: "light", host: location.origin })
    if (!a.html) q.set("a", a.id)
    const el = Object.assign(document.createElement("iframe"), { src: `${a.html ? htmlUrl(a) : "/stage.html"}?${q}`, title: "copy" })
    el.style.cssText = "position:fixed;left:-10000px;top:0;width:402px;height:874px;border:0;visibility:hidden"
    let done = false
    const finish = (v: { texts: ScreenText[]; colors: string[] }) => {
      if (done) return
      done = true
      removeEventListener("message", on)
      el.remove()
      resolve(v)
    }
    const on = (e: MessageEvent) => {
      const d = e.data
      if (e.origin !== location.origin || d?.source !== "anim-engine-stage" || d.frame !== frame) return
      // give it a moment to draw before reading it
      if (d.type === "ready") setTimeout(() => el.contentWindow?.postMessage({ source: "anim-engine-host", type: "describe" }, location.origin), 1600)
      if (d.type === "describe") finish({ texts: d.texts ?? [], colors: d.colors ?? [] })
    }
    addEventListener("message", on)
    document.body.appendChild(el)
    setTimeout(() => finish({ texts: [], colors: [] }), timeout)
  })
}

/** Strings in the component's own code that read like words a person sees. */
async function codeStrings(a: AnimMeta) {
  try {
    const url = a.html ? htmlUrl(a) : `/src/animations/${a.id}/index.tsx?raw`
    const src = await (await fetch(url)).text()
    const out = new Set<string>()
    for (const m of src.matchAll(/>\s*([A-Z][^<>{}\n]{2,48}?)\s*</g)) out.add(m[1].trim())
    for (const m of src.matchAll(/(?:label|title|text|placeholder|aria-label)\s*[=:]\s*["'`]([^"'`\n]{3,48})["'`]/g)) out.add(m[1].trim())
    return [...out].filter((s) => /[a-z]/i.test(s) && !/[{}=;]|https?:|\.(tsx?|css|png|jpe?g)$/.test(s)).slice(0, 30)
  } catch {
    return []
  }
}

export async function context(animId: string, o: { layers?: string[]; brand?: string } = {}): Promise<CopyContext> {
  const a = byId(animId)!
  const [{ texts }, strings] = await Promise.all([describe(a), codeStrings(a)])
  return {
    name: a.name,
    blurb: a.blurb,
    category: a.category,
    tech: a.tech,
    params: Object.values(a.schema).map((s) => s.label),
    texts,
    strings,
    layers: o.layers ?? [],
    brand: o.brand || a.brand || "",
  }
}

/* ---------------- writing ---------------- */

const HOOKS: Record<string, string[]> = {
  "Shaders & GPU": ["Light, rendered.", "Pixels, in motion."],
  Characters: ["Say hello.", "Meet your new friend."],
  "Chat & AI": ["Ask anything.", "Just ask."],
  "Cards & Reveals": ["Reveal the moment.", "Look closer."],
  Navigation: ["Get anywhere.", "Every way in."],
  Celebration: ["Make it land.", "The moment it's done."],
  "UI Patterns": ["Every state, considered.", "Built to move."],
  "Swiggy App": ["Hungry?", "Food, in motion."],
}
const words = (s: string) => s.split(/\s+/).filter(Boolean)
const title = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[.:,;]+$/, "")
/** A short, launch-film feature line: a noun phrase of two to five words, first letter up. */
const phrase = (s: string) => {
  const w = words(title(s)).slice(0, 5)
  if (!w.length) return ""
  const out = w.join(" ")
  return out[0].toUpperCase() + out.slice(1)
}

/** Writes the lines from what it read, by rule. */
export function rules(c: CopyContext): Copy {
  const name = c.brand || c.name
  const on = c.texts.filter((t) => t.t.length >= 3 && t.t.length <= 42 && !/^[\d\s.,:%₹$€£★•·|/+-]+$/.test(t.t))
  const headings = on.filter((t) => !t.control && words(t.t).length <= 6).slice(0, 8)
  const buttons = on.filter((t) => t.control && words(t.t).length <= 4)
  // features: what the screen says loudest, then the blurb's clauses, then what its knobs are about
  const clauses = c.blurb
    .split(/[.;:—–]|, (?:then|and|so|while) /)
    .map((x) => x.replace(/^(the|a|an)\s+/i, "").trim())
    .filter((x) => words(x).length >= 2 && words(x).length <= 7)
  // what it does (its own description) reads as a feature; a lone word on its screen ("VISA") or a name in title case
  // ("Sri Manjunatha Grand") is content, not one
  const proper = (t: string) => words(t).every((w) => /^[^a-z]/.test(w))
  const pool = [...clauses, ...headings.filter((h) => words(h.t).length >= 2 && !proper(h.t)).map((h) => h.t), ...c.params.map((p) => `${p} you can tune`)]
  const features: string[] = []
  for (const p of pool.map(phrase)) if (p && !features.some((f) => f.toLowerCase() === p.toLowerCase()) && p.toLowerCase() !== name.toLowerCase()) features.push(p)
  while (features.length < 3) features.push(["Built in motion", "Every state, designed", "Live, in your app"][features.length])
  const hook = (HOOKS[c.category] ?? ["Meet what's next."])[name.length % 2] ?? "Meet what's next."
  // a figure that's on the screen, with what's beside it, or nothing
  const figure = c.texts.find((t) => /\d/.test(t.t) && /(%|★|x\b|k\b|min|sec|ms|fps|\+)/i.test(t.t) && t.t.length <= 24)
  const lead = words(features[0])
  const split = lead.length >= 3 ? `${lead.slice(0, Math.ceil(lead.length / 2)).join(" ")} | ${lead.slice(Math.ceil(lead.length / 2)).join(" ")}` : `Made for | ${name}`
  const tagline = phrase(clauses[0] ?? `${name}, in motion`)
  return {
    kicker: "Introducing",
    hook,
    name,
    tagline,
    features: features.slice(0, 4),
    split,
    proof: figure ? figure.t : "",
    cta: buttons[0] ? title(buttons[0].t) : "Try it now",
    by: "rules",
  }
}

/** The lines: Claude's, through the dev server, when it has a key; otherwise the rules'. */
export async function write(c: CopyContext): Promise<Copy> {
  try {
    const r = await fetch("/__studio/copy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) })
    if (r.ok) {
      const j = (await r.json()) as Partial<Copy>
      const base = rules(c)
      if (j && typeof j.hook === "string" && Array.isArray(j.features))
        return { ...base, ...j, features: j.features.filter((f) => typeof f === "string").slice(0, 4), proof: base.proof && j.proof ? j.proof : base.proof, by: "claude" }
    }
  } catch {
    /* no server, or no key: the rules write it */
  }
  return rules(c)
}

/** The lines for a component, start to finish. */
export async function copyFor(animId: string, o: { layers?: string[]; brand?: string } = {}) {
  return write(await context(animId, o))
}
