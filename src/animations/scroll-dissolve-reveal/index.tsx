// The demo around VengeanceUI's component: it scrolls its own container (a screen in a device scrolls itself, not the
// window), and while nobody scrolls it, it sweeps down and back so the dissolve plays on its own.
import { useEffect, useRef } from "react"
import { ScrollDissolveReveal } from "./scroll-dissolve-reveal"
import { params as defaults, type Params } from "./params"

const IMG = "/anim/swiggy-home/img/"
export const PHOTOS: Record<string, string> = {
  Latte: `${IMG}latte-surface.jpg`,
  Pralines: `${IMG}pralines.jpg`,
  "Kaju katli": `${IMG}kaju-katli.jpg`,
  Bowl: `${IMG}photo-1512621776951-a57141f2eefd.jpg`,
  Cake: `${IMG}photo-1578985545062-69928b1d9587.jpg`,
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

export default function ScrollDissolveDemo({ p = defaults }: { p?: Params }) {
  const scroller = useRef<HTMLDivElement>(null)
  const live = useRef(p)
  live.current = p

  useEffect(() => {
    const el = scroller.current!
    let raf = 0
    let paused = -Infinity // when a person last scrolled: it hands over to them for a few seconds
    const t0 = performance.now()
    const hand = () => (paused = performance.now())
    el.addEventListener("wheel", hand, { passive: true })
    el.addEventListener("touchstart", hand, { passive: true })
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const { autoplay, sweepMs, holdMs } = live.current
      if (!autoplay || now - paused < 3000 || matchMedia("(prefers-reduced-motion: reduce)").matches) return
      // down, hold, back up, hold: one loop
      const loop = 2 * (sweepMs + holdMs)
      const u = (now - t0) % loop
      const k = u < sweepMs ? ease(u / sweepMs) : u < sweepMs + holdMs ? 1 : u < 2 * sweepMs + holdMs ? 1 - ease((u - sweepMs - holdMs) / sweepMs) : 0
      el.scrollTop = k * (el.scrollHeight - el.clientHeight)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("wheel", hand)
      el.removeEventListener("touchstart", hand)
    }
  }, [])

  return (
    <div ref={scroller} className="no-scrollbar relative h-full overflow-y-auto overscroll-contain [scrollbar-width:none]">
      <ScrollDissolveReveal key={`${p.front}|${p.back}`} imageFront={PHOTOS[p.front]} imageBack={PHOTOS[p.back]} scrollContainerRef={scroller} />
    </div>
  )
}
