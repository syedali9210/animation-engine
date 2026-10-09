// Studio — a screen's components, as the bridge reports them, and which one a close-up shows. Kept free of React so
// scripts/check.mjs can run it.
import type { BreakdownLayer } from "./comp"

export type PartItem = {
  i: number
  name: string
  note: string
  box: number[]
  key: number[] | null
}
export type PartsReport = {
  w: number
  h: number
  ground: string
  items: PartItem[]
}

/** The components that have plates (the first `max`), most interesting first: what a close-up should pick (not the
    ground, not a tab bar). */
export function ranked(r: PartsReport | undefined, max: number) {
  if (!r) return []
  const screen = r.w * r.h
  return r.items
    .slice(0, max)
    .filter((p) => p.box[2] * p.box[3] < screen * 0.7)
    .sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || b.box[2] * b.box[3] - a.box[2] * a.box[3])
}

/** The component a close-up shows, and what it's called. */
export function focusOf(l: Pick<BreakdownLayer, "max" | "focus" | "names">, r: PartsReport | undefined) {
  const list = ranked(r, l.max)
  const it = list[l.focus] ?? list[0]
  if (!r || !it) return null
  const idx = r.items.indexOf(it)
  return { it, idx, name: l.names?.[idx] || it.name }
}
