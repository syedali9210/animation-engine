import { useEffect, useRef } from 'react'

/*
 * A spring lattice.
 *
 * Same DNA as the dither it replaces — a dot grid, a corner-anchored falloff,
 * one colour register per state — but every dot is now a body with a rest
 * position, a velocity and a spring holding it home. Four forces act on it:
 *
 *   flow      a slow curl field, so the lattice breathes instead of sitting still
 *   cursor    a soft shove, or a vortex once you press and hold
 *   waves     expanding rings fired on state changes and on send
 *   spring    always pulling it back to rest
 *
 * Everything else falls out of that: brightness and radius come from how fast a
 * dot is moving, so the field lights up exactly where it's disturbed.
 */

/** 8×8 ordered (Bayer) threshold. Not for tone this time — it decides *which*
 *  dots are lit near the edge, so the field dissolves instead of ending on a
 *  visible contour. Same dissolve as the dither it replaces. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
  28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
  7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]

/** Live-tunable lattice: cell spacing (css px), dot radius, spring K, damping, cursor push, wave speed (px/ms). */
export const F = { cell: 7, dot: 1.6, k: 0.1, damp: 0.82, push: 2.2, waveSpeed: 0.72 }
const TAU = Math.PI * 2
const LEVELS = 7 // colour buckets — one path fill each, not a fill per dot

/* --- lattice physics ------------------------------------------------------
   Damped harmonic oscillator per dot: `v = (v + a) * DAMP`, `a` including
   `-offset * K`. A steady force F parks a dot at F/K px from rest, which is how
   every constant below was sized. DAMP sits under-damped on purpose — that
   slight ring is what makes a shove propagate like a ripple.               */
const PUSH_R = 84 // cursor influence radius, css px
const HOLD_DELAY = 340 // ms of stillness before the vortex engages
const VORTEX_R = 130
const WAVE_W = 30 // ring thickness
const WAVE_F = 7
const WAVE_LIFE = 1100

/**
 * One entry per `variant` — each thinking step keeps its own palette so the
 * marker rail and its label stay in sync with the field.
 */
const SWIRLS = [
  { deep: [88, 140, 214], bright: [156, 200, 255] }, // blue
  { deep: [140, 112, 220], bright: [201, 182, 255] }, // violet
  { deep: [64, 178, 172], bright: [148, 234, 224] }, // teal
]
/** Text tint that matches each variant, for whatever is labelling the swirl. */
export const SWIRL_TINTS = SWIRLS.map((s) => `rgb(${s.bright.join(',')})`)

/**
 * Named field presets. Every mode, command and app gets its own register:
 * colour, how far the lattice reaches, how hard it breathes and how fast the
 * flow runs. The component eases between whichever two are current.
 */
export const PRESETS = {
  calm: { deep: [88, 140, 214], bright: [156, 200, 255], tight: 1, flow: 0.3, speed: 0.55 },
  // toolbar modes
  build: { deep: [64, 178, 172], bright: [148, 234, 224], tight: 0.94, flow: 0.45, speed: 0.8 },
  plan: { deep: [126, 116, 214], bright: [198, 190, 255], tight: 1.06, flow: 0.24, speed: 0.4 },
  execute: { deep: [214, 118, 58], bright: [255, 196, 148], tight: 0.86, flow: 0.95, speed: 1.5 },
  // transient states
  command: { deep: [84, 94, 110], bright: [226, 232, 240], tight: 0.84, flow: 0.8, speed: 1.3 },
  voice: { deep: [206, 72, 128], bright: [255, 178, 210], tight: 0.9, flow: 1.15, speed: 1.8 },
  // app registers, picked up while a command is highlighted or armed
  slack: { deep: [178, 40, 88], bright: [255, 150, 190], tight: 0.9, flow: 0.66, speed: 1.1 },
  clickup: { deep: [96, 84, 200], bright: [186, 176, 255], tight: 0.92, flow: 0.55, speed: 1 },
  cloudflare: { deep: [200, 122, 40], bright: [255, 202, 130], tight: 0.9, flow: 0.72, speed: 1.2 },
} as const
export type Preset = keyof typeof PRESETS

/** Six colour buckets for a deep→bright pair. Light mode runs the ramp the
 *  other way: on white the near-white `bright` end would simply vanish. */
const ramp = (
  light: boolean,
  deep: readonly number[],
  bright: readonly number[],
  out: string[],
) => {
  const [lo, hi] = light ? [bright, deep] : [deep, bright]
  for (let l = 0; l < LEVELS; l++) {
    const k = (l + 0.5) / LEVELS
    const c = (i: number) => Math.round(lo[i] + (hi[i] - lo[i]) * k)
    const a = light ? 0.34 + 0.62 * k : 0.34 + 0.66 * k
    out[l] = `rgba(${c(0)},${c(1)},${c(2)},${a.toFixed(3)})`
  }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: readonly number[], b: readonly number[], t: number) => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

type Wave = { x: number; y: number; born: number }

/**
 * Dot lattice that lives in whichever card it sits in. Hovering pushes the dots
 * aside; pressing and holding pulls them into a vortex; releasing fires a
 * shockwave and they spring home. `preset` sets the register, `pulse` fires a
 * wave from the bottom-right on demand, `spread` scales the corner reach.
 */
export default function DitherField({
  interactive = false,
  loading = false,
  preset = 'calm',
  variant = 0,
  pulse = 0,
  spread = 1.12,
}: {
  interactive?: boolean
  loading?: boolean
  preset?: Preset
  variant?: number
  pulse?: number
  spread?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  // read inside the rAF loop — a dep change would restart the whole field
  const loadingRef = useRef(loading)
  const variantRef = useRef(variant)
  const presetRef = useRef<Preset>(preset)
  const pulseRef = useRef(pulse)
  // Kept out of the rAF-loop effect's deps below (only `interactive`/`spread`
  // restart it) — the loop reads these refs each frame instead.
  useEffect(() => {
    loadingRef.current = loading
    variantRef.current = variant % SWIRLS.length
    presetRef.current = preset
    pulseRef.current = pulse
  }, [loading, variant, preset, pulse])

  useEffect(() => {
    const canvas = ref.current!
    const host = canvas.parentElement! // sized to this
    // Pointer listeners go on the card, not the clip layer: the clip layer is
    // pointer-events-none (so controls above it stay clickable) and would never
    // see a move. Same box either way, so coordinates are unaffected.
    const surface = (canvas.closest('[data-dither-surface]') ?? host) as HTMLElement
    const ctx = canvas.getContext('2d')!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    let w = 0
    let h = 0
    let cols = 0
    let rows = 0
    let raf = 0
    let t = 0

    // flat arrays beat objects here — this loop touches every dot every frame
    let x0 = new Float32Array(0)
    let y0 = new Float32Array(0)
    let ox = new Float32Array(0)
    let oy = new Float32Array(0)
    let vx = new Float32Array(0)
    let vy = new Float32Array(0)
    let rest = new Float32Array(0) // baked corner falloff, 0..1

    let bucket: Float32Array[] = []
    const count = new Uint16Array(LEVELS)
    const shades: string[] = new Array(LEVELS)

    // eased pointer, in css px
    const p = { x: -1e3, y: -1e3, tx: -1e3, ty: -1e3, on: 0, want: 0 }
    let held = false
    let settledAt = 0
    let vortex = 0 // 0..1 eased engagement of the hold vortex

    const waves: Wave[] = []
    let seenPulse = pulse

    // eased crossfade between the outgoing and incoming preset
    let fromP: Preset = preset
    let toP: Preset = preset
    let blend = 1

    function resize() {
      const nw = host.clientWidth
      const nh = host.clientHeight
      if (nw === w && nh === h) return
      w = nw
      h = nh
      cols = Math.max(1, Math.ceil(w / F.cell))
      rows = Math.max(1, Math.ceil(h / F.cell))
      const n = cols * rows
      x0 = new Float32Array(n)
      y0 = new Float32Array(n)
      ox = new Float32Array(n)
      oy = new Float32Array(n)
      vx = new Float32Array(n)
      vy = new Float32Array(n)
      rest = new Float32Array(n)
      for (let r = 0, i = 0; r < rows; r++)
        for (let c = 0; c < cols; c++, i++) {
          x0[i] = c * F.cell + F.cell / 2
          y0[i] = r * F.cell + F.cell / 2
        }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bucket = Array.from({ length: LEVELS }, () => new Float32Array(n * 3))
    }

    /** the field is background texture — it shouldn't react to the cursor while
     *  the cursor is busy with a control sitting on top of it */
    const overControl = (t: EventTarget | null) =>
      t instanceof Element &&
      !!t.closest('button, a, input, textarea, select, [role="button"]')

    function onMove(e: PointerEvent) {
      const r = surface.getBoundingClientRect()
      p.tx = e.clientX - r.left
      p.ty = e.clientY - r.top
      p.want = overControl(e.target) ? 0 : 1
      settledAt = performance.now()
    }
    function onLeave() {
      p.want = 0
      held = false
    }
    function onDown(e: PointerEvent) {
      if (overControl(e.target)) return // pressing a button isn't a lattice gesture
      held = true
    }
    function onUp() {
      if (held && vortex > 0.2) waves.push({ x: p.x, y: p.y, born: performance.now() })
      held = false
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (!cols) return

      /* --- preset crossfade ------------------------------------------------ */
      if (presetRef.current !== toP) {
        fromP = blend >= 1 ? toP : fromP
        toP = presetRef.current
        blend = 0
        // a register change is a state change — announce it with a wave
        if (!reduced) waves.push({ x: w, y: h, born: now })
      }
      blend = Math.min(1, blend + 0.05)
      const A = PRESETS[fromP]
      const B = PRESETS[toP]
      const tight = lerp(A.tight, B.tight, blend)
      const flowAmt = reduced ? 0 : lerp(A.flow, B.flow, blend)
      const flowSpd = lerp(A.speed, B.speed, blend)
      if (!reduced) t += 0.004 * flowSpd

      if (pulseRef.current !== seenPulse) {
        seenPulse = pulseRef.current
        if (!reduced) waves.push({ x: w, y: h * 0.5, born: now })
      }
      while (waves.length > 4) waves.shift()

      /* --- pointer --------------------------------------------------------- */
      if (p.x < -1e2) {
        p.x = p.tx
        p.y = p.ty
      }
      p.x += (p.tx - p.x) * 0.16
      p.y += (p.ty - p.y) * 0.16
      p.on += (p.want - p.on) * 0.09
      const wantVortex =
        interactive && !reduced && held && p.want === 1 && now - settledAt > HOLD_DELAY
      vortex += ((wantVortex ? 1 : 0) - vortex) * 0.07

      /* --- falloff geometry ------------------------------------------------ */
      const ar = w / h
      const norm = Math.hypot(ar, 1) * spread * tight

      count.fill(0)
      // reduced motion keeps the field's colour and shape, drops every displacement
      const push = reduced ? 0 : F.push * p.on
      const pr2 = PUSH_R * PUSH_R

      for (let i = 0, n = cols * rows; i < n; i++) {
        const rx = x0[i]
        const ry = y0[i]
        const col = i % cols
        const row = (i / cols) | 0

        // Falloff still anchored bottom-right, but the reach now clears the far
        // corner so the lattice spans the whole card. A gentler exponent than the
        // old cubic keeps the far side populated instead of cutting it dead.
        const nx = (rx / w - 1) * ar
        const ny = ry / h - 1
        let k = 1 - Math.hypot(nx, ny) / norm
        k = k > 0 ? k * k * Math.sqrt(k) : 0
        rest[i] = k

        let ax = 0
        let ay = 0

        if (k > 0.004) {
          // curl-ish flow from layered sines: organic drift without a noise table
          if (flowAmt > 0) {
            const a = Math.sin(nx * 3.1 + t) + Math.cos(ny * 2.7 - t * 0.8)
            const b = Math.sin((nx + ny) * 2.2 + t * 0.6)
            ax += Math.cos((a + b) * 1.7) * flowAmt
            ay += Math.sin((a - b) * 1.7) * flowAmt
          }

          // cursor: shove aside, or orbit once the vortex is engaged
          const dx = rx + ox[i] - p.x
          const dy = ry + oy[i] - p.y
          const d2 = dx * dx + dy * dy
          if (d2 < pr2 || (vortex > 0.01 && d2 < VORTEX_R * VORTEX_R)) {
            const d = Math.sqrt(d2) || 0.001
            const ux = dx / d
            const uy = dy / d
            if (d2 < pr2) {
              const f = (1 - d / PUSH_R) ** 2 * push
              ax += ux * f
              ay += uy * f
            }
            if (vortex > 0.01) {
              const g = (1 - Math.min(1, d / VORTEX_R)) ** 2 * vortex
              ax += (-uy * 2.4 - ux * 0.9) * g // tangential + a little inward
              ay += (ux * 2.4 - uy * 0.9) * g
            }
          }

          // shockwaves
          for (let wi = 0; wi < waves.length; wi++) {
            const wv = waves[wi]
            const age = now - wv.born
            if (age > WAVE_LIFE) continue
            const wdx = rx - wv.x
            const wdy = ry - wv.y
            const wd = Math.hypot(wdx, wdy) || 0.001
            const band = (wd - age * F.waveSpeed) / WAVE_W
            if (band > -3 && band < 3) {
              const f = Math.exp(-band * band) * WAVE_F * (1 - age / WAVE_LIFE)
              ax += (wdx / wd) * f
              ay += (wdy / wd) * f
            }
          }
        }

        // spring home
        ax -= ox[i] * F.k
        ay -= oy[i] * F.k
        vx[i] = (vx[i] + ax) * F.damp
        vy[i] = (vy[i] + ay) * F.damp
        ox[i] += vx[i]
        oy[i] += vy[i]

        if (k <= 0.002) continue

        // brightness tracks disturbance: the lattice lights up where it's touched
        const sp = Math.min(1, Math.hypot(vx[i], vy[i]) * 0.34)
        const lit = Math.min(0.999, k * 0.9 + sp * 0.75)
        // ordered threshold: dots wink out stochastically toward the edge
        if (lit < (BAYER[(row & 7) * 8 + (col & 7)] + 0.5) / 64) continue
        const l = (lit * LEVELS) | 0
        const b = bucket[l]
        const m = count[l]++ * 3
        b[m] = rx + ox[i]
        b[m + 1] = ry + oy[i]
        b[m + 2] = F.dot * (0.55 + 0.85 * lit)
      }

      /* --- draw ------------------------------------------------------------ */
      const light = document.documentElement.dataset.theme === 'light'
      ramp(light, lerp3(A.deep, B.deep, blend), lerp3(A.bright, B.bright, blend), shades)

      ctx.clearRect(0, 0, w, h)
      for (let l = 0; l < LEVELS; l++) {
        const n = count[l]
        if (!n) continue
        const b = bucket[l]
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const x = b[i * 3]
          const y = b[i * 3 + 1]
          const r = b[i * 3 + 2]
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, TAU)
        }
        ctx.fillStyle = shades[l]
        ctx.fill()
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()
    raf = requestAnimationFrame(frame)
    surface.addEventListener('pointermove', onMove)
    surface.addEventListener('pointerleave', onLeave)
    if (interactive) {
      surface.addEventListener('pointerdown', onDown)
      window.addEventListener('pointerup', onUp)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      surface.removeEventListener('pointermove', onMove)
      surface.removeEventListener('pointerleave', onLeave)
      surface.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
    // `loading`/`variant`/`preset`/`pulse` are deliberately excluded — they're
    // read each frame via their refs so changing them doesn't tear down and
    // reinitialize the canvas/rAF loop. Only `interactive`/`spread` should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, spread])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
