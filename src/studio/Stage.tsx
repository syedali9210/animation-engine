// Mockup studio — the engine's 3D view: the device as a real object under studio light with the live screen on it,
// framed exactly as the export will be. Drag to turn it, scroll to zoom, double-click to go back to the angle; the
// transport under it plays or scrubs the move a video makes.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Pause, Play } from "@phosphor-icons/react"
import type { Device, Posture, ScreenInk } from "../devices"
import { IconButton } from "../ui"
import { move } from "./poses"
import { StudioScene } from "./scene"
import { ScreenShell } from "./shell"
import { backdropCss, finishOf, shotPose, sizeOf, type Shot } from "./shot"
import { CHECKER } from "./Studio"

const PAD = 32
const DOCK = 72

export default function StudioStage({
  d,
  posture,
  landscape,
  dark,
  ink,
  screenBg,
  shot,
  setShot,
  playing,
  setPlaying,
  children,
}: {
  d: Device
  posture: Posture
  landscape: boolean
  dark: boolean
  ink?: ScreenInk
  screenBg: string
  shot: Shot
  setShot: (patch: Partial<Shot>) => void
  playing: boolean
  setPlaying: (on: boolean) => void
  children: ReactNode
}) {
  const area = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<StudioScene | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const size = sizeOf(shot)
  // the export's frame, fitted into the stage above the transport
  const k = Math.max(0, Math.min((box.w - PAD * 2) / size.w, (box.h - PAD * 2 - DOCK) / size.h))
  const fw = Math.round(size.w * k)
  const fh = Math.round(size.h * k)

  useEffect(() => {
    const el = area.current!
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const s = new StudioScene(host.current!)
    setScene(s)
    return () => s.dispose()
  }, [])

  // Paused, the view holds a moment of the move (null: the shot itself, which is what dragging edits). Playing, it
  // runs from that moment on. A drag in progress lives here too, so the engine doesn't re-render on every move.
  const [scrub, setScrub] = useState<number | null>(null)
  const drag = useRef({ yaw: 0, elev: 0 })
  const live = useRef({ shot, d, playing, scrub })
  live.current = { shot, d, playing, scrub }
  const scrubber = useRef<HTMLInputElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const frameReq = useRef(0)
  const t0 = useRef(performance.now())
  const showTime = (t: number, dur: number) => {
    if (scrubber.current) {
      scrubber.current.value = String(t)
      scrubber.current.style.setProperty("--p", `${(t / dur) * 100}%`)
    }
    if (clock.current) clock.current.textContent = `${t.toFixed(1)} / ${dur.toFixed(1)} s`
  }
  const draw = useCallback(() => {
    if (!scene || frameReq.current) return
    frameReq.current = requestAnimationFrame(() => {
      frameReq.current = 0
      const { shot: s, d: dev, playing: on, scrub: at } = live.current
      const base = shotPose({ ...s, yaw: s.yaw + drag.current.yaw, elev: s.elev + drag.current.elev }, dev.id)
      const t = on ? ((performance.now() - t0.current) / 1000) % s.duration : (at ?? 0)
      scene.setPose(on || at !== null ? move(s.motion, base, t, s.duration) : base)
      scene.render()
      showTime(t, s.duration)
      if (on) draw()
    })
  }, [scene])
  useEffect(() => () => cancelAnimationFrame(frameReq.current), [])

  const finish = finishOf(shot, d.id)
  useEffect(() => {
    scene?.setDevice({ id: d.id, posture, landscape: landscape && d.rotates, finish, screenBg })
    draw()
  }, [scene, d.id, d.rotates, posture, landscape, finish, screenBg, draw])
  useEffect(() => {
    scene?.setLook({ shadow: shot.shadow, reflections: shot.reflections })
    draw()
  }, [scene, shot.shadow, shot.reflections, draw])
  useEffect(() => {
    if (fw && fh) scene?.resize(fw, fh, Math.min(devicePixelRatio, 2))
    draw()
  }, [scene, fw, fh, draw])
  // playing picks up where the scrubber was; a new move or length starts from the top
  useEffect(() => {
    if (playing) {
      t0.current = performance.now() - (live.current.scrub ?? 0) * 1000
      setScrub(null)
    }
    draw()
  }, [playing, draw])
  useEffect(() => {
    t0.current = performance.now()
    setScrub(null)
  }, [shot.motion, shot.duration])
  useEffect(draw, [shot, scrub, draw])

  const pause = () => {
    if (!live.current.playing) return
    setScrub(((performance.now() - t0.current) / 1000) % shot.duration)
    setPlaying(false)
  }

  // drag turns it (left/right) and raises or lowers the camera; scroll zooms; double-click resets
  const start = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: PointerEvent) => {
    if (!start.current) return
    drag.current = { yaw: (e.clientX - start.current.x) * 0.3, elev: (e.clientY - start.current.y) * 0.2 }
    draw()
  }
  const onUp = () => {
    if (!start.current) return
    start.current = null
    const { yaw, elev } = drag.current
    drag.current = { yaw: 0, elev: 0 }
    if (yaw || elev) setShot({ yaw: shot.yaw + yaw, elev: shot.elev + elev })
  }
  const bg = backdropCss(shot)

  return (
    <div ref={area} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="absolute overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--line),var(--sh-md)]"
        style={{ left: (box.w - fw) / 2, top: (box.h - DOCK - fh) / 2, width: fw, height: fh, background: bg === "transparent" ? CHECKER : bg }}
      >
        <div ref={host} className="absolute inset-0" />
      </div>
      {/* over the live screen too: in the studio the pointer moves the camera, it doesn't use the app */}
      <div
        aria-hidden
        title="Drag to turn · scroll to zoom · double-click to reset"
        className="absolute inset-x-0 top-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ bottom: DOCK }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => setShot({ zoom: Math.min(3, Math.max(0.35, shot.zoom * Math.exp(-e.deltaY * 0.0012))) })}
        onDoubleClick={() => {
          setShot({ yaw: 0, elev: 0, zoom: 1 })
          setScrub(null)
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
        <div role="toolbar" aria-label="Move preview" className="pointer-events-auto flex w-[min(460px,100%)] items-center gap-2.5 rounded-xl bg-overlay p-1 pr-3.5 shadow-md">
          <IconButton label={playing ? "Pause" : "Play the move"} tipSide="top" tipAlign="start" onClick={() => (playing ? pause() : setPlaying(true))}>
            {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          </IconButton>
          <input
            ref={scrubber}
            type="range"
            aria-label="Time in the move"
            min={0}
            max={shot.duration}
            step={0.01}
            defaultValue={0}
            onChange={(e) => {
              const t = Number(e.target.value)
              if (playing) setPlaying(false)
              setScrub(t)
            }}
            className="range min-w-0 flex-1"
            style={{ "--p": "0%" } as CSSProperties}
          />
          <span ref={clock} className="w-[76px] shrink-0 text-right text-caption tabular-nums text-fg-3" />
        </div>
      </div>
      {scene &&
        createPortal(
          <ScreenShell d={d} landscape={landscape} posture={posture} dark={dark} ink={ink} bg={screenBg}>
            {children}
          </ScreenShell>,
          scene.slot,
        )}
    </div>
  )
}
