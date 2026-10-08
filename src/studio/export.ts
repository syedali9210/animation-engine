// Studio — the engine's side of an export: hand the dev server a job, follow it, download what it made.
import { useRef, useState } from "react"
import type { RenderConfig } from "./config"

export type ExportKind = "png" | "video"
export type ExportState =
  | { phase: "idle" }
  | { phase: "working"; kind: ExportKind; label: string; done: number; total: number }
  | { phase: "done"; kind: ExportKind; file: string }
  | { phase: "error"; message: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A dropped background lives at a blob: URL only this tab can read; the renderer gets its own copy. */
const uploads = new Map<string, string>()
export async function serverMedia(blobUrl: string) {
  const known = uploads.get(blobUrl)
  if (known) return known
  const blob = await (await fetch(blobUrl)).blob()
  const r = await fetch("/__studio/media", { method: "POST", headers: { "content-type": blob.type || "application/octet-stream" }, body: blob })
  if (!r.ok) throw new Error("Couldn't hand the background to the renderer")
  const { url } = (await r.json()) as { url: string }
  uploads.set(blobUrl, url)
  return url
}

export function useExport() {
  const [state, setState] = useState<ExportState>({ phase: "idle" })
  const busy = useRef(false)

  async function run(kind: ExportKind, config: () => Promise<RenderConfig>, size: { w: number; h: number }, fps: number, name: string) {
    if (busy.current) return
    busy.current = true
    try {
      setState({ phase: "working", kind, label: "Starting the renderer…", done: 0, total: 0 })
      const cfg = await config()
      // render at twice the pixels per point for anything big, so the device's edges and the screen stay crisp
      const scale = Math.max(size.w, size.h) > 1400 ? 2 : 1
      const r = await fetch("/__studio/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: cfg, kind, width: size.w, height: size.h, scale, fps }),
      }).catch(() => null)
      if (!r || !r.ok) throw new Error("Exports are rendered by the engine's dev server: run it with npm run dev.")
      const { id } = (await r.json()) as { id: string }
      for (;;) {
        await sleep(350)
        const s = (await (await fetch(`/__studio/jobs/${id}`)).json()) as { state: string; frame: number; total: number; error?: string }
        if (s.state === "error") throw new Error(s.error || "The render failed")
        if (s.state === "done") break
        const label = s.state === "queued" ? "Waiting for the renderer…" : s.state === "encoding" ? "Encoding…" : s.total > 1 ? `Rendering frame ${s.frame} of ${s.total}` : "Rendering…"
        setState({ phase: "working", kind, label, done: s.frame, total: s.total })
      }
      // a transparent video comes back as ProRes 4444 with alpha
      const ext = kind === "png" ? "png" : cfg.transparent ? "mov" : "mp4"
      const file = `${name}.${ext}`
      const a = Object.assign(document.createElement("a"), { href: `/__studio/jobs/${id}/file`, download: file })
      document.body.appendChild(a)
      a.click()
      a.remove()
      setState({ phase: "done", kind, file })
    } catch (e) {
      setState({ phase: "error", message: (e as Error).message })
    } finally {
      busy.current = false
    }
  }

  return { state, run, reset: () => setState({ phase: "idle" }) }
}
