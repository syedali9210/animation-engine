// Mockup studio — the page an export renders in headless Chrome, one frame at a time. It draws the studio's shot with
// the same scene, and runs every frame on the screen on the bridge's stepped clock (?vt=1), so video frame n shows
// exactly t = n / fps. The renderer calls `await __studio.ready`, then `await __studio.frame(t)` before each capture.
import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { DEVICES, type ScreenInk } from "../devices"
import type { RenderConfig, ScreenFrame } from "./config"
import { FINISHES } from "./devices3d"
import { move } from "./poses"
import { StudioScene } from "./scene"
import { ScreenShell } from "./shell"
import "./render.css"

type Stepped = Window & { __adv?: (ms: number) => Promise<number>; __now?: () => number }
declare global {
  interface Window {
    __studio: { ready: Promise<void>; frame: (t: number) => Promise<void> }
  }
}

const cfg: RenderConfig = JSON.parse(decodeURIComponent(location.hash.slice(1)))
const d = DEVICES.find((x) => x.id === cfg.device)!
document.body.style.background = cfg.backdrop
const studio = new StudioScene(document.getElementById("root")!, { preserve: true })
studio.resize(innerWidth, innerHeight, devicePixelRatio)
studio.setDevice({ id: d.id, posture: cfg.posture, landscape: cfg.landscape, finish: FINISHES[d.id].find((f) => f.id === cfg.finish) ?? FINISHES[d.id][0], screenBg: cfg.screenBg })
studio.setLook({ shadow: cfg.shadow, reflections: cfg.reflections })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const host = (el: HTMLIFrameElement, msg: object) => el.contentWindow?.postMessage({ source: "anim-engine-host", ...msg }, location.origin)
const src = (f: ScreenFrame) => `${f.path}?${new URLSearchParams({ ...f.query, frame: f.fid, vt: "1", rm: "0", cs: cfg.dark ? "dark" : "light", host: location.origin })}`

/** One frame on the screen, from its bridge saying hello to its page being fully drawn (fonts, images, React). */
const live = cfg.frames.map((f) => {
  let el: HTMLIFrameElement | null = null
  let hello = () => {}
  const said = new Promise<void>((r) => (hello = r))
  return {
    f,
    /** the frame's own clock (ms) when it first drew: the video's t = 0 is preroll ms after this */
    base: 0,
    attach: (x: HTMLIFrameElement | null) => void (el = x ?? el),
    get el() {
      return el
    },
    hello: () => hello(),
    async settled() {
      await said
      host(el!, { type: "theme", scheme: cfg.dark ? "dark" : "light" })
      host(el!, { type: "params", values: f.values })
      host(el!, { type: "bare", on: f.bare })
      const doc = el!.contentDocument!
      const w = el!.contentWindow as Stepped
      if (doc.readyState !== "complete") await new Promise((r) => el!.addEventListener("load", r, { once: true }))
      await doc.fonts.ready
      // The animation mounts lazily, and React holds a suspended tree back on a timer, which on this clock only runs
      // when we step it: step in small increments until it draws something.
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
      this.base = w.__now!()
    },
  }
})
let ink: ((x: ScreenInk) => void) | null = null
addEventListener("message", (e) => {
  const m = e.data
  if (e.origin !== location.origin || m?.source !== "anim-engine-stage") return
  const fr = live.find((x) => x.f.fid === m.frame)
  if (m.type === "ready") fr?.hello()
  if (m.type === "status" && (m.top || m.bottom)) ink?.({ top: m.top, bottom: m.bottom })
})

/** the screen's background video, if it has one (set once it mounts) */
const bg = { video: null as HTMLVideoElement | null }

function Screen() {
  const [asked, setAsked] = useState<ScreenInk>()
  const vref = useRef<HTMLVideoElement>(null)
  ink = setAsked
  useEffect(() => void (bg.video = vref.current), [])
  return (
    <ScreenShell d={d} landscape={cfg.landscape} posture={cfg.posture} dark={cfg.dark} ink={asked} bg={cfg.screenBg}>
      {cfg.media && (cfg.media.video ? <video ref={vref} src={cfg.media.url} muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" /> : <img src={cfg.media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />)}
      {live.map((x) => (
        <div key={x.f.fid} style={x.f.box ?? { position: "absolute", inset: 0 }}>
          <iframe ref={x.attach} title={x.f.fid} src={src(x.f)} className="block h-full w-full border-0" style={{ background: "transparent" }} />
        </div>
      ))}
    </ScreenShell>
  )
}
createRoot(studio.slot).render(<Screen />)

async function frame(t: number) {
  for (const x of live) {
    const w = x.el!.contentWindow as Stepped
    const dt = x.base + cfg.preroll + t * 1000 - w.__now!()
    if (dt > 0) await w.__adv!(dt)
  }
  const video = bg.video
  if (video && video.duration) {
    const want = t % video.duration
    if (Math.abs(video.currentTime - want) > 0.0005) {
      video.currentTime = want
      await new Promise((r) => video.addEventListener("seeked", r, { once: true }))
    }
  }
  studio.setPose(move(cfg.motion, cfg.pose, t, cfg.duration))
  studio.render()
  // two of the page's own frames, so the compositor has drawn the screen and the canvas together
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

window.__studio = {
  ready: (async () => {
    await document.fonts.ready
    await Promise.all(live.map((x) => x.settled()))
    const video = bg.video
    if (video && video.readyState < 2) await new Promise((r) => video.addEventListener("loadeddata", r, { once: true }))
    await frame(0)
  })(),
  frame,
}
