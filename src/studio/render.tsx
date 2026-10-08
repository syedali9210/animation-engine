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
    __studio: { ready: Promise<void>; frame: (t: number) => Promise<void> }
  }
}

const cfg: RenderConfig = JSON.parse(decodeURIComponent(location.hash.slice(1)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// the engine resolved everything already: look it up
const resolve: Resolve = {
  screen: (_c, _d, key) => cfg.screens[key] ?? { frames: [], bg: "#000" },
  component: (_a, key, hairline, scheme) => ({ ...cfg.components[key], hairline, scheme }),
  image: (src) => src,
  dark: cfg.dark,
  stepped: true,
  origin: location.origin,
}

const view = createRef<ViewHandle>()
createRoot(document.getElementById("root")!).render(<CompositionView ref={view} comp={cfg.comp} resolve={resolve} preserve />)

/** each frame's own clock (ms) when it had first drawn: capture t = 0 is preroll ms after this */
const base = new Map<HTMLIFrameElement, number>()

/** One frame, from its document loading to its page being fully drawn (fonts, images, React). */
async function settle(el: HTMLIFrameElement) {
  const w = el.contentWindow as Stepped
  for (let i = 0; i < 600 && !(el.contentDocument?.readyState === "complete" && w.__adv); i++) await sleep(25)
  const doc = el.contentDocument!
  await doc.fonts.ready
  // The animation mounts lazily, and React holds a suspended tree back on a timer, which on this clock only runs when
  // we step it: step in small increments until it draws something.
  for (let i = 0; i < 400 && !doc.querySelector("#root > *, body > :not(script):not(#root)"); i++) {
    await w.__adv!(16)
    await sleep(8)
  }
  const loaded = (img: HTMLImageElement) =>
    img.complete ||
    new Promise((r) => {
      img.addEventListener("load", r, { once: true })
      img.addEventListener("error", r, { once: true })
    })
  await Promise.all([...doc.images].map(loaded))
  await doc.fonts.ready
  base.set(el, w.__now!())
}

async function frame(t: number) {
  const at = cfg.start + t
  for (const el of view.current!.frames()) {
    const w = el.contentWindow as Stepped
    const dt = (base.get(el) ?? 0) + cfg.preroll + at * 1000 - w.__now!()
    if (dt > 0) await w.__adv!(dt)
  }
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
    // the view mounts its scenes, then each scene its 3D and its screens: wait for the frames to be in the page
    const want = Object.values(cfg.screens).reduce((n, s) => n + s.frames.length, 0) + Object.keys(cfg.components).length
    for (let i = 0; i < 400 && (!view.current || view.current.frames().length < want); i++) await sleep(25)
    await Promise.all(view.current!.frames().map(settle))
    await Promise.all([...document.images].map((img) => img.complete || new Promise((r) => (img.onload = img.onerror = r))))
    await Promise.all(
      [...document.querySelectorAll("video")].map((v) => v.readyState >= 2 || new Promise((r) => v.addEventListener("loadeddata", r, { once: true }))),
    )
    await frame(0)
  })(),
  frame,
}
