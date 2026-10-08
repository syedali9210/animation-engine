// Mockup studio — the export side of the dev server. A job opens render.html in headless Chrome (on the GPU), steps
// it frame by frame over the DevTools protocol and captures each one: one frame is a PNG; a video goes through
// ffmpeg (H.264 MP4, or ProRes 4444 with alpha when the background is transparent).
//   POST /__studio/jobs        { config, kind: "png" | "video", width, height, scale, fps } -> { id }
//   GET  /__studio/jobs/:id    -> { state, frame, total, error? }
//   GET  /__studio/jobs/:id/file
//   POST /__studio/media       (a dropped background image or video) -> { url }
//   POST /__studio/posters     { only?: id[] } -> { made }  the library cards' stills, into public/thumbs
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import type { IncomingMessage, ServerResponse } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Plugin, ViteDevServer } from "vite"

type Kind = "png" | "video"
type Job = {
  id: string
  kind: Kind
  state: "queued" | "rendering" | "encoding" | "done" | "error"
  frame: number
  total: number
  error?: string
  file?: string
  type?: string
  ext?: string
}

const DIR = join(tmpdir(), "anim-engine-studio")
const jobs = new Map<string, Job>()
const media = new Map<string, { file: string; type: string }>()
let queue: Promise<void> = Promise.resolve() // one render at a time: they share the GPU

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function findChrome() {
  const env = process.env.STUDIO_CHROME
  if (env && existsSync(env)) return env
  const pf = process.env.PROGRAMFILES ?? "C:/Program Files"
  const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:/Program Files (x86)"
  const local = process.env.LOCALAPPDATA ?? ""
  const paths = [
    `${pf}/Google/Chrome/Application/chrome.exe`,
    `${pf86}/Google/Chrome/Application/chrome.exe`,
    `${local}/Google/Chrome/Application/chrome.exe`,
    `${pf86}/Microsoft/Edge/Application/msedge.exe`,
    `${pf}/Microsoft/Edge/Application/msedge.exe`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]
  return paths.find((p) => existsSync(p))
}

const ffmpeg = () => {
  const bin = process.env.STUDIO_FFMPEG || "ffmpeg"
  return spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0 ? bin : null
}

/** A small DevTools-protocol client over Node's own WebSocket. */
async function devtools(chrome: string, profile: string) {
  const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] })
  const browserUrl = await new Promise<string>((resolve, reject) => {
    let err = ""
    const t = setTimeout(() => reject(new Error("Chrome didn't start")), 20000)
    proc.stderr!.on("data", (b: Buffer) => {
      err += b.toString()
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(t)
        resolve(m[1])
      }
    })
    proc.on("exit", () => reject(new Error("Chrome quit while starting")))
  })
  const port = new URL(browserUrl).port
  let page: { webSocketDebuggerUrl: string; type: string } | undefined
  for (let i = 0; i < 50 && !page; i++) {
    page = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { webSocketDebuggerUrl: string; type: string }[]).find((x) => x.type === "page")
    if (!page) await sleep(100)
  }
  const ws = new WebSocket(page!.webSocketDebuggerUrl)
  await new Promise((r, j) => {
    ws.onopen = r
    ws.onerror = j
  })
  let seq = 0
  const pending = new Map<number, (m: { result?: Record<string, unknown>; error?: { message: string } }) => void>()
  const errors: string[] = []
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data))
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m)
      pending.delete(m.id)
    } else if (m.method === "Runtime.exceptionThrown") errors.push(String(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split("\n")[0])
  }
  const send = <T = Record<string, unknown>>(method: string, params: object = {}) =>
    new Promise<T>((resolve, reject) => {
      const id = ++seq
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result as T)))
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression: string, timeout = 90000) => {
    const r = await send<{ result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string }; text?: string } }>("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout })
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text).split("\n")[0])
    return r.result?.value
  }
  const close = async () => {
    await send("Browser.close").catch(() => {})
    ws.close()
    proc.kill()
  }
  return { send, evaluate, close, errors, proc }
}

async function render(job: Job, body: { config: { backdrop: string; duration: number }; width: number; height: number; scale: number; fps: number }, origin: string) {
  const chrome = findChrome()
  if (!chrome) throw new Error("Couldn't find Chrome or Edge to render with. Set STUDIO_CHROME to its path.")
  const video = job.kind === "video"
  const ff = video ? ffmpeg() : null
  if (video && !ff) throw new Error("Video export needs ffmpeg on your PATH (winget install ffmpeg, or brew install ffmpeg).")
  const clear = body.config.backdrop === "transparent"
  const scale = Math.min(3, Math.max(1, body.scale || 1))
  const w = Math.round(body.width / scale)
  const h = Math.round(body.height / scale)
  mkdirSync(DIR, { recursive: true })
  const profile = mkdtempSync(join(tmpdir(), "anim-engine-chrome-"))
  const cdp = await devtools(chrome, profile)
  let encoder: ChildProcess | null = null
  try {
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile: false })
    if (clear) await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } })
    await cdp.send("Page.navigate", { url: `${origin}/render.html?job=${job.id}#${encodeURIComponent(JSON.stringify(body.config))}` })
    for (let i = 0; i < 300 && !(await cdp.evaluate("!!window.__studio").catch(() => false)); i++) await sleep(100)
    await cdp.evaluate("window.__studio.ready.then(() => true)", 120000)
    const shot = async (format: "png" | "jpeg") => Buffer.from(((await cdp.send<{ data: string }>("Page.captureScreenshot", { format, quality: format === "jpeg" ? 95 : undefined })).data), "base64")

    if (!video) {
      job.total = 1
      job.state = "rendering"
      await cdp.evaluate("window.__studio.frame(0)")
      job.file = join(DIR, `${job.id}.png`)
      writeFileSync(job.file, await shot("png"))
      job.frame = 1
      job.type = "image/png"
      job.ext = "png"
      return
    }

    const fps = body.fps === 60 ? 60 : 30
    const n = Math.max(1, Math.round(body.config.duration * fps))
    job.total = n
    job.state = "rendering"
    job.ext = clear ? "mov" : "mp4"
    job.type = clear ? "video/quicktime" : "video/mp4"
    job.file = join(DIR, `${job.id}.${job.ext}`)
    const codec = clear
      ? ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
      : // Chrome's JPEGs are full-range BT.601; video players expect limited-range BT.709, tagged as such
        ["-vf", "scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-movflags", "+faststart"]
    encoder = spawn(ff!, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", clear ? "png" : "mjpeg", "-i", "-", ...codec, job.file], { stdio: ["pipe", "ignore", "pipe"] })
    let ffErr = ""
    encoder.stderr!.on("data", (b: Buffer) => (ffErr += b.toString()))
    const done = new Promise<number>((r) => encoder!.on("exit", (code) => r(code ?? 1)))
    for (let i = 0; i < n; i++) {
      await cdp.evaluate(`window.__studio.frame(${i / fps})`)
      const img = await shot(clear ? "png" : "jpeg")
      if (!encoder.stdin!.write(img)) await new Promise((r) => encoder!.stdin!.once("drain", r))
      job.frame = i + 1
    }
    job.state = "encoding"
    encoder.stdin!.end()
    const code = await done
    if (code !== 0) throw new Error(`ffmpeg failed: ${ffErr.trim().split("\n").pop() || code}`)
  } finally {
    if (cdp.errors.length && job.state !== "done") console.warn("[studio]", cdp.errors.slice(0, 3).join(" | "))
    await cdp.close()
    encoder?.kill()
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 2000)
  }
}

type PosterMeta = { id: string; html?: boolean; layout?: string; poster?: { at?: number; y?: number } }

/** The library's card stills: each animation on an iPhone-sized page, run on the stepped clock to its moment, cropped
    to the card's 4:3, in both themes. Written to public/thumbs/<id>-<light|dark>.webp. */
async function posters(server: ViteDevServer, origin: string, only: string[]) {
  const chrome = findChrome()
  if (!chrome) throw new Error("Couldn't find Chrome or Edge to render with. Set STUDIO_CHROME to its path.")
  const { ANIMS } = (await server.ssrLoadModule("/src/registry.ts")) as { ANIMS: PosterMeta[] }
  const out = join(server.config.publicDir, "thumbs")
  mkdirSync(out, { recursive: true })
  const W = 402
  const H = 874
  const CH = Math.round((W * 3) / 4)
  const profile = mkdtempSync(join(tmpdir(), "anim-engine-chrome-"))
  const cdp = await devtools(chrome, profile)
  const made: string[] = []
  try {
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false })
    for (const a of ANIMS.filter((x) => !only.length || only.includes(x.id))) {
      for (const scheme of ["light", "dark"]) {
        const q = new URLSearchParams({ frame: "poster", rm: "0", cs: scheme, vt: "1", dpr: "2", host: origin })
        if (!a.html) q.set("a", a.id)
        await cdp.send("Page.navigate", { url: `${origin}${a.html ? `/anim/${a.id}/index.html` : "/stage.html"}?${q}` })
        for (let i = 0; i < 200 && !(await cdp.evaluate("document.readyState === 'complete' && !!window.__adv").catch(() => false)); i++) await sleep(50)
        // React mounts the animation lazily, on timers that only run when the clock is stepped
        for (let i = 0; i < 400 && !(await cdp.evaluate(`window.__adv(16).then(() => !!document.querySelector("#root > *, body > :not(script):not(#root)"))`)); i++) await sleep(8)
        await cdp.evaluate("Promise.all([...document.images].map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r }))).then(() => document.fonts.ready).then(() => true)")
        // in frame-sized steps, so anything that builds up frame by frame gets its frames
        for (let t = 0; t < (a.poster?.at ?? 1800); t += 16) await cdp.evaluate("window.__adv(16)")
        // GPU work lands on its own time: give WebGL / WebGPU a few real frames to present
        for (let i = 0; i < 6; i++) {
          await cdp.evaluate("window.__adv(16)")
          await sleep(60)
        }
        const y = a.poster?.y ?? (a.layout === "fill" ? 0 : 0.5)
        const top = Math.round(Math.min(H - CH, Math.max(0, y * H - CH / 2)))
        const { data } = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "webp", quality: 82, clip: { x: 0, y: top, width: W, height: CH, scale: 1 } })
        writeFileSync(join(out, `${a.id}-${scheme}.webp`), Buffer.from(data, "base64"))
      }
      made.push(a.id)
    }
  } finally {
    await cdp.close()
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 2000)
  }
  return made
}

const json = (res: ServerResponse, code: number, body: unknown) => {
  res.statusCode = code
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify(body))
}
const readBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const parts: Buffer[] = []
    req.on("data", (c: Buffer) => parts.push(c))
    req.on("end", () => resolve(Buffer.concat(parts)))
    req.on("error", reject)
  })

/** Serve a file, with byte ranges: a video only seeks when its server answers them. */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string, type: string, download?: string) {
  const size = statSync(file).size
  res.setHeader("content-type", type)
  res.setHeader("accept-ranges", "bytes")
  if (download) res.setHeader("content-disposition", `attachment; filename="${download}"`)
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "")
  if (range && !download) {
    const start = range[1] ? +range[1] : 0
    const end = range[2] ? Math.min(+range[2], size - 1) : size - 1
    res.statusCode = 206
    res.setHeader("content-range", `bytes ${start}-${end}/${size}`)
    res.setHeader("content-length", String(end - start + 1))
    createReadStream(file, { start, end }).pipe(res)
    return
  }
  res.setHeader("content-length", String(size))
  createReadStream(file).pipe(res)
}

export function studio(): Plugin {
  let origin = ""
  const handle = async (server: ViteDevServer, req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://x")
    if (!url.pathname.startsWith("/__studio/")) return next()
    origin ||= (server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`).replace(/\/$/, "")
    const [, , what, id, extra] = url.pathname.split("/")
    try {
      if (what === "media" && req.method === "POST") {
        const mid = randomUUID()
        const type = req.headers["content-type"] ?? "application/octet-stream"
        mkdirSync(DIR, { recursive: true })
        const file = join(DIR, `media-${mid}`)
        writeFileSync(file, await readBody(req))
        media.set(mid, { file, type })
        return json(res, 200, { url: `/__studio/media/${mid}` })
      }
      if (what === "media" && id && media.has(id)) return sendFile(req, res, media.get(id)!.file, media.get(id)!.type)
      if (what === "posters" && req.method === "POST") {
        const body = JSON.parse((await readBody(req)).toString() || "{}") as { only?: string[] }
        const run = queue.then(() => posters(server, origin, body.only ?? []))
        queue = run.then(
          () => {},
          () => {},
        )
        return json(res, 200, { made: await run })
      }
      if (what === "jobs" && req.method === "POST") {
        const body = JSON.parse((await readBody(req)).toString())
        const job: Job = { id: randomUUID(), kind: body.kind === "video" ? "video" : "png", state: "queued", frame: 0, total: 0 }
        jobs.set(job.id, job)
        queue = queue.then(() =>
          render(job, body, origin).then(
            () => void (job.state = "done"),
            (e: Error) => {
              job.state = "error"
              job.error = e.message
            },
          ),
        )
        return json(res, 200, { id: job.id })
      }
      const job = id ? jobs.get(id) : undefined
      if (what === "jobs" && job && !extra) return json(res, 200, { state: job.state, frame: job.frame, total: job.total, error: job.error })
      if (what === "jobs" && job && extra === "file" && job.state === "done" && job.file) return sendFile(req, res, job.file, job.type!, `mockup.${job.ext}`)
      return json(res, 404, { error: "Not found" })
    } catch (e) {
      return json(res, 500, { error: (e as Error).message })
    }
  }
  return {
    name: "anim-engine-studio",
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handle(server, req, res, next))
    },
  }
}
