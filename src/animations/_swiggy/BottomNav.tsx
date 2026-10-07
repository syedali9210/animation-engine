// Swiggy App — the bottom navigation. `hidden` slides it off the bottom edge (fades it, with reduced motion);
// `inset` leaves room for the device's home indicator when it's docked at the bottom of a screen.
import { NAV } from "./data"
import { useMedia } from "../_skeleton/Skeleton"

export function BottomNav({
  value,
  onChange,
  hidden = false,
  inset = 0,
  ms = 200,
  ease = "cubic-bezier(0.4, 0, 0.2, 1)",
  className = "",
}: {
  value: number
  onChange: (i: number) => void
  hidden?: boolean
  inset?: number
  ms?: number
  ease?: string
  className?: string
}) {
  const reduce = useMedia("(prefers-reduced-motion: reduce)")
  return (
    <nav
      aria-label="Main"
      className={`border-t border-[#f0f0f0] bg-white shadow-[0_-3px_12px_rgba(0,0,0,.03)] ${hidden ? "pointer-events-none" : ""} ${className}`}
      style={{
        paddingBottom: inset,
        transform: hidden && !reduce ? "translateY(100%)" : "translateY(0)",
        opacity: hidden && reduce ? 0 : 1,
        transition: `${reduce ? "opacity" : "transform"} ${ms}ms ${ease}`,
      }}
    >
      <div className="mx-auto grid h-[58px] max-w-[640px] grid-cols-5">
        {NAV.map((n, i) => (
          <button
            key={n.l}
            type="button"
            aria-current={value === i ? "page" : undefined}
            onClick={() => onChange(i)}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] transition-colors duration-200 ${value === i ? "font-bold text-[#cc4200]" : "font-semibold text-[#6b6d73]"}`}
          >
            <span className={`grid h-[30px] w-[32px] place-items-center ${value === i ? "text-[#ff5200]" : ""}`}>
              <NavIcon name={n.l} />
            </span>
            {n.b && (
              <span className={`absolute top-[24px] grid h-[15px] place-items-center rounded-full border border-white bg-[#e01f38] px-1 text-[10px] font-extrabold leading-none text-white ${n.b === "15 MIN" ? "min-w-[38px]" : "min-w-[30px]"}`}>
                {n.b}
              </span>
            )}
            {n.l}
          </button>
        ))}
      </div>
    </nav>
  )
}

/** The source's icons/*.svg, drawn in the button's own colour. */
function NavIcon({ name }: { name: string }) {
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const
  if (name === "Food")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={27} height={27}>
        <path d="M8 15C4 10 7 6 12 7C12 1 20 1 22 6C28 3 33 8 30 14" fill="white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M4 15Q19 11 34 15V22Q34 26 30 27L28 34Q19 37 10 34L8 27Q4 26 4 22Z" fill="currentColor" />
        <path d="M6 16Q19 13 32 16" fill="none" stroke="#ff9c46" strokeWidth="1.5" />
        <path d="M8 26H30" stroke="#ec4700" strokeWidth="1" />
      </svg>
    )
  if (name === "Bolt")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={27} height={27} {...line} strokeWidth="2.4">
        <path d="M23 3 13 19H20L15 33 30 13H22L27 3Z" />
        <path d="M5 8H11M3 14H9M6 20H10" />
      </svg>
    )
  if (name === "99 store")
    return (
      <svg aria-hidden="true" viewBox="0 0 40 38" width={29} height={27} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <g transform="rotate(-8 20 19)">
          <path d="M14 4C7 4 3 8 3 14C3 20 7 23 12 23L10 29L16 30L23 19C29 10 23 4 14 4Z" fill="white" />
          <circle cx="13" cy="13" r="1.7" fill="currentColor" stroke="none" />
          <path d="M25 10C19 10 15 14 15 20C15 25 19 28 23 28L21 33L27 34L34 23C40 15 33 10 25 10Z" fill="white" />
          <circle cx="25" cy="19" r="1.7" fill="currentColor" stroke="none" />
        </g>
      </svg>
    )
  if (name === "EatRight")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={27} height={27} {...line} strokeWidth="2.5">
        <path d="M19 32 6 20C-3 11 7 0 15 6L19 10L23 6C31 0 41 11 32 20Z" />
        <path d="m12 14 6 6 9-10" />
      </svg>
    )
  return (
    <svg aria-hidden="true" viewBox="0 0 40 38" width={29} height={27} {...line} strokeWidth="2.5">
      <path d="m4 4 5 2 4 18q1 3 5 3h11q3 0 4-4l3-12" />
      <circle cx="17" cy="34" r="2.6" />
      <circle cx="29" cy="34" r="2.6" />
      <path d="M23 5a7.5 7.5 0 1 1-7 11M20 2l4 3-4 3" />
    </svg>
  )
}
