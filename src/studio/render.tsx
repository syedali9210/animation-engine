// Studio — the page an export renders in headless Chrome, one frame at a time. It draws the composition with the same
// view the engine uses, and runs every live frame on the bridge's stepped clock (?vt=1), so video frame n shows exactly
// t = n / fps. The renderer calls `await __studio.ready`, then `await __studio.frame(t)` before each capture.
import { createRef } from "react"
import { createRoot } from "react-dom/client"
import type { RenderConfig } from "./config"
import { CompositionView, type Resolve, type ViewHandle } from "./view"
import "./render.css"

type Stepped = Window & { __adv?: (ms: number) => Promise<number>; __now?: () => number }
declare global {
  interface Window {
    __studio: { ready: Promise<void>; frame: (t: number) => Promise<void>; where: () => string }
  }
}

const cfg: RenderConfig = JSON.parse(decodeURIComponent(location.hash.slice(1)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// the engine resolved everything already: look it up
const resolve: Resolve = {
  screen: (_c, _d, key) => cfg.screens[key] ?? { frames: [], bg: "#000" },
  component: (_a, key, hairline, scheme) => ({ ...cfg.components[key], hairline, scheme }),
  part: (_a, key, _w, hairline, scheme) => ({ ...cfg.components[key], hairline, scheme }),
  image: (src) => src,
  dark: cfg.dark,
  stepped: true,
  origin: location.origin,
}

const view = createRef<ViewHandle>()
createRoot(document.getElementById("root")!).render(<CompositionView ref={view} comp={cfg.comp} resolve={resolve} preserve />)

/** each frame's own clock (ms) when it had first drawn: capture t = 0 is preroll ms after this */
const base = new Map<HTMLIFrameElement, number>()
/** what the page is waiting on (read `__studio.where()` over DevTools when an export stalls) */
let where = ""

/** Moves a frame's clock on by `ms`, unless the frame is taken out of the page meanwhile: a scene that's moved on
    drops its frames, and a removed frame's window stops, so it would never answer. */
async function step(el: HTMLIFrameElement, ms: number) {
  let poll = 0
  const gone = new Promise((r) => (poll = window.setInterval(() => !el.isConnected && r(null), 50)))
  await Promise.race([(el.contentWindow as Stepped).__adv!(ms), gone])
  clearInterval(poll)
}

/** One frame, from its document loading to its page being fully drawn (fonts, images, React). A frame that comes in
    later (scenes load their frames as the playhead nears them) starts its own clock where the film is (`at`). */
async function settle(el: HTMLIFrameElement, at = -1) {
  where = `loading ${el.title}`
  const w = el.contentWindow as Stepped
  for (let i = 0; i < 600 && el.isConnected && !(el.contentDocument?.readyState === "complete" && w.__adv); i++) await sleep(25)
  // taken out of the page while it loaded (its scene moved on): nothing to settle
  if (!el.isConnected || !el.contentDocument) return
  const doc = el.contentDocument
  await doc.fonts.ready
  // The animation mounts lazily, and React holds a suspended tree back on a timer, which on this clock only runs when
  // we step it: step in small increments until it draws something.
  where = `first paint of ${el.title}`
  for (let i = 0; i < 400 && el.isConnected && !doc.querySelector("#root > *, body > :not(script):not(#root)"); i++) {
    await step(el, 16)
    await sleep(8)
  }
  const loaded = (img: HTMLImageElement) =>
    img.complete ||
    new Promise((r) => {
      img.addEventListener("load", r, { once: true })
      img.addEventListener("error", r, { once: true })
    })
  where = `pictures and type of ${el.title}`
  await Promise.all([...doc.images].map(loaded))
  await doc.fonts.ready
  if (el.isConnected) base.set(el, w.__now!() - (at >= 0 ? cfg.preroll + at * 1000 : 0))
}

const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)))

async function frame(t: number) {
  const at = cfg.start + t
  // the scene at the playhead decides which frames are loaded: let React mount any new ones, then bring them up
  view.current!.render(at)
  await tick()
  // frames can arrive while others settle (a close-up's component mounts once its whole screen has said what it
  // holds): settle until no new ones come
  for (let pass = 0; pass < 6; pass++) {
    const fresh = view.current!.frames().filter((el) => !base.has(el))
    if (!fresh.length) break
    for (const el of fresh) await settle(el, at)
    view.current!.render(at)
    await tick()
  }
  for (const el of view.current!.frames()) {
    // one still loading joins on the next frame
    if (!base.has(el) || !el.isConnected) continue
    const w = el.contentWindow as Stepped
    const dt = base.get(el)! + cfg.preroll + at * 1000 - w.__now!()
    where = `stepping ${el.title} by ${Math.round(dt)} ms`
    if (dt > 0) await step(el, dt)
  }
  where = "drawing"
  for (const v of document.querySelectorAll("video")) {
    if (!v.duration) continue
    const want = at % v.duration
    if (Math.abs(v.currentTime - want) > 0.0005) {
      v.currentTime = want
      await new Promise((r) => v.addEventListener("seeked", r, { once: true }))
    }
  }
  view.current!.render(at)
  // two of the page's own frames, so the compositor has drawn the screens and the canvases together
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

window.__studio = {
  ready: (async () => {
    await document.fonts.ready
    // the view mounts its scenes (those near the start), then each scene its 3D and its screens: wait until the frames
    // in the page stop changing in number
    for (let i = 0; i < 200 && !view.current; i++) await sleep(25)
    view.current!.render(cfg.start)
    let last = -1
    for (let i = 0, still = 0; i < 300 && still < 8; i++) {
      await sleep(80)
      view.current!.render(cfg.start)
      const n = view.current!.frames().length
      still = n === last ? still + 1 : 0
      last = n
    }
    await Promise.all(view.current!.frames().map((el) => settle(el)))
    // the brand's type, before the first frame (its stylesheet goes in with the view)
    for (const f of [cfg.comp.brand?.font, cfg.comp.brand?.display].filter(Boolean)) await document.fonts.load(`600 32px "${f}"`).catch(() => {})
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => img.complete || new Promise((r) => (img.onload = img.onerror = r))))
    await Promise.all(
      [...document.querySelectorAll("video")].map((v) => v.readyState >= 2 || new Promise((r) => v.addEventListener("loadeddata", r, { once: true }))),
    )
    await frame(0)
  })(),
  frame,
  where: () => where,
}
