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

const fine = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches
const clampZoom = (z: number) => Math.min(3, Math.max(0.35, z))

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
  compact,
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
  /** phones and short windows: tighter margins */
  compact?: boolean
  children: ReactNode
}) {
  const PAD = compact ? 12 : 32
  const DOCK = compact ? 64 : 72
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
  const drag = useRef({ yaw: 0, elev: 0, zoom: 1 })
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
      const base = shotPose({ ...s, yaw: s.yaw + drag.current.yaw, elev: s.elev + drag.current.elev, zoom: clampZoom(s.zoom * drag.current.zoom) }, dev.id)
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

  // the first visit says how to move the camera, until it has been moved once
  const [hint, setHint] = useState(() => {
    try {
      return !localStorage.getItem("anim-engine:orbited")
    } catch {
      return false
    }
  })
  const learned = () => {
    if (!hint) return
    setHint(false)
    try {
      localStorage.setItem("anim-engine:orbited", "1")
    } catch {
      /* private mode: the hint just comes back next time */
    }
  }

  // one finger or the mouse turns it (left/right) and raises or lowers the camera; two fingers or the wheel zoom;
  // double-click resets
  const fingers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ x: number; y: number } | null>(null)
  const pinch = useRef(0) // the fingers' distance when the pinch began
  const spread = () => {
    const [a, b] = [...fingers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (fingers.current.size === 2) {
      start.current = null // a second finger turns a turn into a pinch
      drag.current = { yaw: 0, elev: 0, zoom: 1 }
      pinch.current = spread()
    } else if (fingers.current.size === 1) start.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: PointerEvent) => {
    if (!fingers.current.has(e.pointerId)) return
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (fingers.current.size === 2 && pinch.current) drag.current.zoom = spread() / pinch.current
    else if (start.current) drag.current = { yaw: (e.clientX - start.current.x) * 0.3, elev: (e.clientY - start.current.y) * 0.2, zoom: 1 }
    else return
    draw()
  }
  const onUp = (e: PointerEvent) => {
    fingers.current.delete(e.pointerId)
    if (fingers.current.size) return
    start.current = null
    pinch.current = 0
    const { yaw, elev, zoom } = drag.current
    drag.current = { yaw: 0, elev: 0, zoom: 1 }
    if (yaw || elev || zoom !== 1) {
      setShot({ yaw: shot.yaw + yaw, elev: shot.elev + elev, zoom: clampZoom(shot.zoom * zoom) })
      learned()
    }
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
        title={fine ? "Drag to turn · scroll to zoom · double-click to reset" : undefined}
        className="absolute inset-x-0 top-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ bottom: DOCK }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => {
          setShot({ zoom: clampZoom(shot.zoom * Math.exp(-e.deltaY * 0.0012)) })
          learned()
        }}
        onDoubleClick={() => {
          setShot({ yaw: 0, elev: 0, zoom: 1 })
          setScrub(null)
        }}
      />
      {hint && fw > 0 && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6" style={{ top: (box.h - DOCK - fh) / 2 + 12 }}>
          <p className="fade-in rounded-full bg-overlay px-3 py-1.5 text-caption text-fg-2 shadow-md">{fine ? "Drag to turn it · scroll to zoom · double-click to reset" : "Drag to turn it · pinch to zoom"}</p>
        </div>
      )}
      <div className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3 ${compact ? "bottom-3" : "bottom-4"}`}>
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
