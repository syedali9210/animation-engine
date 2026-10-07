// Swiggy App — motion tokens, as CSS variables on a screen's root, so every component inside reads the same ones:
//   --sw-slide / --sw-ease      indicators moving to a new choice (section tab, category underline, segment pill,
//                               VEG knob, search hint)
//   --sw-press / --sw-press-ms  cards and buttons sinking while pressed
// Reduced motion: nothing travels (slides jump, presses don't sink); colour and opacity still fade.
import { useEffect, useRef, type CSSProperties } from "react"
import { useMedia } from "../_skeleton/Skeleton"

export type MotionTokens = { slideMs?: number; slideEase?: string; pressScale?: number; pressMs?: number }

export function useMotionVars(m: MotionTokens): CSSProperties {
  const reduce = useMedia("(prefers-reduced-motion: reduce)")
  return {
    "--sw-slide": `${reduce ? 0 : (m.slideMs ?? 300)}ms`,
    "--sw-ease": m.slideEase ?? "cubic-bezier(0.23, 1, 0.32, 1)",
    "--sw-press": reduce ? 1 : (m.pressScale ?? 0.97),
    "--sw-press-ms": `${m.pressMs ?? 160}ms`,
  } as CSSProperties
}

/** `transition: transform ${SLIDE}` — the slide token, with its defaults for use outside a screen. */
export const SLIDE = "var(--sw-slide, 300ms) var(--sw-ease, cubic-bezier(0.23, 1, 0.32, 1))"
/** Press feedback for anything tappable. */
export const PRESS = "transition-transform duration-[var(--sw-press-ms,160ms)] ease-out active:scale-[var(--sw-press,0.97)]"

/** Demo: call `step` every `ms` while `on`. A tap anywhere holds it for a few seconds so it doesn't fight you. */
export function useCycle(on: boolean, ms: number, step: () => void) {
  const latest = useRef(step)
  latest.current = step
  useEffect(() => {
    if (!on) return
    let quietUntil = 0
    const hold = () => {
      quietUntil = performance.now() + 4000
    }
    const t = setInterval(() => performance.now() > quietUntil && latest.current(), ms)
    addEventListener("pointerdown", hold)
    return () => {
      clearInterval(t)
      removeEventListener("pointerdown", hold)
    }
  }, [on, ms])
}
