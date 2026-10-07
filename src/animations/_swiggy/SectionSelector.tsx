// Swiggy App — Food / Instamart / Dineout / Scenes. Folder tabs on the maroon hero; the chosen one is lit and
// flares into the panel below with a curved foot on each side. Drawn in real pixels from the measured width (not a
// stretched 592px viewBox), so the curves keep their shape at any width. The chosen tab slides to a new section.
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { FOOD_ICON, SECTIONS } from "./data"
import { SLIDE } from "./motion"
import { useSvgId } from "./ui"

const H = 104 // tab height
const G = 8 // edge padding, and the gap between tabs

export function SectionSelector({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const id = useSvgId()
  useLayoutEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const col = (w - G * 5) / 4
  const x = (i: number) => G + i * (col + G)
  // a resting tab: slanted sides, rounded top corners
  const tab = (i: number) => {
    const l = x(i)
    const r = l + col
    return `M${l - 7} ${H}L${l + 3} 20Q${l + 5} 0 ${l + 25} 0H${r - 25}Q${r - 5} 0 ${r - 3} 20L${r + 7} ${H}`
  }
  // the chosen tab, drawn over the first column and slid across: both sides curve out into the floor
  const l = x(0)
  const r = l + col
  const lit = `M${l - 34} ${H}Q${l - 10} ${H} ${l - 7} ${H - 25}L${l + 5} 20Q${l + 7} 0 ${l + 30} 0H${r - 30}Q${r - 7} 0 ${r - 5} 20L${r + 7} ${H - 25}Q${r + 10} ${H} ${r + 34} ${H}`

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    const next = (value + step + SECTIONS.length) % SECTIONS.length
    onChange(next)
    e.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus()
  }

  return (
    <div ref={box} role="tablist" aria-label="Sections" onKeyDown={keys} className="relative isolate grid grid-cols-4 items-end gap-2 px-2" style={{ height: H }}>
      {w > 0 && (
        <svg aria-hidden="true" width={w} height={H} className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
          <defs>
            <linearGradient id={`${id}on`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#c60045" />
              <stop offset="1" stopColor="#82012b" />
            </linearGradient>
            <linearGradient id={`${id}off`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#4b132a" />
              <stop offset=".45" stopColor="#3e0d22" />
              <stop offset="1" stopColor="#2e0717" />
            </linearGradient>
            <radialGradient id={`${id}light`} cx="82%" cy="5%" r="85%">
              <stop stopColor="#bd7c96" stopOpacity=".12" />
              <stop offset=".55" stopColor="#8d405f" stopOpacity=".035" />
              <stop offset="1" stopColor="#8d405f" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#9f5672" stopOpacity=".08" />
              <stop offset=".3" stopColor="#af6e88" stopOpacity=".18" />
              <stop offset=".75" stopColor="#d095aa" stopOpacity=".6" />
              <stop offset=".9" stopColor="#deb0bf" stopOpacity=".75" />
              <stop offset="1" stopColor="#b97892" stopOpacity=".48" />
            </linearGradient>
            <linearGradient id={`${id}floor`} x1="0" y1="0" x2="0" y2="1">
              <stop offset=".65" stopColor="#82012b" stopOpacity="0" />
              <stop offset="1" stopColor="#82012b" />
            </linearGradient>
          </defs>
          <path d={`M0 0H${w}V${H + 1}H0Z`} fill={`url(#${id}floor)`} />
          {SECTIONS.map((s, i) => (
            <g key={s.label} style={{ opacity: i === value ? 0 : 1, transition: "opacity 200ms ease" }}>
              <path d={`${tab(i)}Z`} fill={`url(#${id}off)`} className="drop-shadow-[2px_0_2px_rgba(15,0,6,.24)]" />
              <path d={`${tab(i)}Z`} fill={`url(#${id}light)`} />
              <path d={tab(i)} fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.2" />
            </g>
          ))}
          <path d={`M0 ${H - 0.5}H${w}`} fill="none" stroke="#aa5473" strokeOpacity=".55" strokeWidth="1.2" />
          <g style={{ transform: `translateX(${value * (col + G)}px)`, transition: `transform ${SLIDE}` }}>
            <path d={`${lit}V${H + 2}H${l - 34}Z`} fill={`url(#${id}on)`} />
            <path d={lit} fill="none" stroke="#cb6c8a" strokeOpacity=".65" strokeWidth="1.2" />
          </g>
        </svg>
      )}
      {SECTIONS.map((s, i) => {
        const Art = ART[i]
        return (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={value === i}
            tabIndex={value === i ? 0 : -1}
            onClick={() => onChange(i)}
            className="relative flex h-full flex-col items-center pt-[10px]"
          >
            <span aria-hidden="true" className="grid h-[56px] w-[56px] place-items-center">
              <span className="grid h-[65px] w-[65px] shrink-0 scale-[.86] place-items-center"><Art /></span>
            </span>
            {s.badge && <span className="absolute top-[46px] rounded-[5px] bg-[#0059ff] px-1.5 text-[11px] font-semibold leading-[16px] text-white">{s.badge}</span>}
            <span className={`mt-1.5 text-[14px] leading-[18px] transition-colors duration-200 ${value === i ? "font-bold text-white" : "font-medium text-white/75"}`}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---- the four section icons, drawn at 65px as in the source ---- */

const ART = [
  function Food() {
    return <img src={FOOD_ICON} alt="" className="h-[65px] w-[65px] object-contain drop-shadow-md" />
  },
  function Grocery() {
    const id = useSvgId()
    return (
      <span className="relative grid h-[65px] w-[65px] place-items-center">
        <span className="absolute left-[17px] top-[11px] h-[24px] w-[8px] -rotate-12 rounded-t-full bg-gradient-to-r from-[#5d962b] to-[#bbd344]" />
        <span className="absolute left-[29px] top-[14px] h-[23px] w-[8px] rotate-12 rounded-t-full bg-gradient-to-r from-[#e9781d] to-[#f4b94c]" />
        <span className="absolute right-[14px] top-[9px] h-[27px] w-[9px] rotate-[22deg] rounded-t-full bg-gradient-to-r from-[#c88824] to-[#ffe7a0]" />
        <svg viewBox="0 0 64 56" className="absolute bottom-[8px] h-[48px] w-[54px] drop-shadow-[0_3px_2px_rgba(0,0,0,.2)]">
          <defs>
            <linearGradient id={`${id}b`} x2="0" y2="1">
              <stop stopColor="#7ee3f1" />
              <stop offset=".4" stopColor="#37bada" />
              <stop offset="1" stopColor="#177baf" />
            </linearGradient>
          </defs>
          <path d="M10 30 13 14Q20 10 24 22L28 31" fill="#55ab36" />
          <path d="M23 31 28 14Q32 9 34 16L35 31" fill="#fb9730" />
          <path d="m37 31 7-22q2-5 6-2l3 3-8 23" fill="#f5bf56" />
          <path d="m44 15 5 3m-7 3 5 3" stroke="#d78b27" strokeWidth="2" />
          <path d="M7 28H58L52 52H13Z" fill={`url(#${id}b)`} />
          <path d="M11 33H54M13 40H52M16 47H50M20 30l2 21M30 30v22M40 30l-2 22M49 30l-4 22" fill="none" stroke="#a1edf4" strokeOpacity=".65" strokeWidth="2" />
          <path d="M6 28H58" stroke="#89e3ee" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    )
  },
  function Dome() {
    const id = useSvgId()
    return (
      <span className="relative mt-[7px] h-[58px] w-[62px] drop-shadow-[0_4px_3px_rgba(0,0,0,.25)]">
        <svg viewBox="0 0 62 58" className="h-full w-full">
          <defs>
            <radialGradient id={`${id}d`} cx="30%" cy="22%" r="78%">
              <stop stopColor="#afdc7b" />
              <stop offset=".42" stopColor="#72ad45" />
              <stop offset=".8" stopColor="#447f23" />
              <stop offset="1" stopColor="#315819" />
            </radialGradient>
            <linearGradient id={`${id}r`} x2="0" y2="1">
              <stop stopColor="#92c168" />
              <stop offset="1" stopColor="#456d2e" />
            </linearGradient>
          </defs>
          <ellipse cx="31" cy="48" rx="24" ry="8" fill="#fff2d7" />
          <path d="M16 46Q29 39 46 47L43 51Q30 54 18 49Z" fill="#d78435" />
          <path d="m19 43 10 2 7-3 9 4-10 4-15-3Z" fill="#74a535" />
          <circle cx="31" cy="5" r="4.5" fill={`url(#${id}d)`} />
          <path d="M6 36C7 20 16 10 31 10S55 20 56 36Z" fill={`url(#${id}d)`} />
          <ellipse cx="31" cy="36" rx="28" ry="5" fill={`url(#${id}r)`} />
          <path d="M14 29Q15 18 23 15" fill="none" stroke="#b5db86" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 37Q31 42 58 37" fill="none" stroke="#365822" strokeOpacity=".6" strokeWidth="1.2" />
        </svg>
      </span>
    )
  },
  function DiscoBall() {
    const id = useSvgId()
    return (
      <svg viewBox="0 0 64 72" className="h-[65px] w-[65px] drop-shadow-md">
        <defs>
          <radialGradient id={`${id}l`} cx="28%" cy="24%" r="78%">
            <stop stopColor="#fff0f8" />
            <stop offset=".3" stopColor="#ffa9d1" />
            <stop offset=".65" stopColor="#f270ae" />
            <stop offset="1" stopColor="#cc3b80" />
          </radialGradient>
          <pattern id={`${id}m`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="none" />
            <path d="M.5.5H7.5V7.5H.5Z" fill="#fff0fa" fillOpacity=".08" stroke="#ffd9ed" strokeOpacity=".2" strokeWidth=".5" />
            <path d="M1 1H7V3H1Z" fill="white" fillOpacity=".13" />
          </pattern>
          <clipPath id={`${id}o`}>
            <circle cx="32" cy="38" r="26" />
          </clipPath>
        </defs>
        <path d="M32 8v4" stroke="#b33465" strokeWidth="1" />
        <circle cx="32" cy="38" r="26" fill={`url(#${id}l)`} />
        <circle cx="32" cy="38" r="26" fill={`url(#${id}m)`} />
        <g clipPath={`url(#${id}o)`} fill="none" stroke="#fce0ed" strokeWidth=".9" opacity=".7">
          <path d="M8 24Q32 18 56 24M6 34Q32 30 58 34M6 44Q32 48 58 44M10 54Q32 62 54 54M32 12v52M22 12q-10 25 0 51M42 12q10 25 0 51M14 17q-13 21 0 41M50 17q13 21 0 41" />
        </g>
        <path d="M17 21H23V27H17ZM24 15H29V20H24ZM11 30H16V35H11Z" fill="#fff4fa" opacity=".8" />
      </svg>
    )
  },
]
