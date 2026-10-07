// Swiggy App — the small pieces the components share, and the type scale they all follow:
//   10/11  badges, tab-bar labels      12  caps labels, chips      13  secondary text, captions
//   14     body, card meta            15  search, card titles     18  section titles, the name in the header
//   20     a restaurant's name in the feed                         display: FLAVOURFEST, offer cards
// Text colours pass WCAG AA on white: ink #1b1b22, secondary #6b6d73 (5.2:1), brand text #cc4200 (4.8:1).
// The brand orange #ff5200 (3.3:1) is kept for fills, icons and large type.
import { useEffect, useId, useRef } from "react"
import { Heart, Star } from "lucide-react"
import { SLIDE } from "./motion"
import "./swiggy.css"

/** The page gutter, and the widest the content gets (a laptop shows a centred 1200px column). */
export const WRAP = "mx-auto w-full max-w-[1200px] px-4"
/** A row that scrolls sideways on phones, snapping card by card, and becomes a grid from md (768px) up. Cards in it
    are sized from the screen width to show two whole cards and a 24px peek of the next, so it reads as a carousel. */
export const ROW = "no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 scroll-px-4 md:grid md:overflow-visible"

/** SVG gradient ids must be unique on a page that shows a component more than once. */
export const useSvgId = () => useId().replace(/[^\w-]/g, "")

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-[#1b1b22]">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] leading-[18px] text-[#6b6d73]">{subtitle}</p>}
    </div>
  )
}

/** Swiggy One, the membership: the wordmark, or the drawn logo. */
export function One({ className = "", artwork = false }: { className?: string; artwork?: boolean }) {
  if (artwork)
    return (
      <span aria-label="one" className={`inline-flex items-center text-[#ff5200] ${className}`}>
        <svg aria-hidden="true" viewBox="0 0 52 22" className="h-[17px] w-[40px]" fill="currentColor">
          <path d="M8 3C4 3 1 5 0 8L4 10C4.5 8 6 7 8 7C10.5 7 12 9 12 11.5C12 14 10.5 16 8 16C5.5 16 4 14 4 11.5L0 10.5V12C0 17 3 20 8 20S16 17 16 11.5S13 3 8 3Z" />
          <path d="M18 4H22.5V6C24 4 25.5 3 28 3C32 3 34 6 34 10V20H29.5V11C29.5 8.5 28.5 7 26.5 7C24 7 22.5 8.5 22.5 11V20H18Z" />
          <path fillRule="evenodd" d="M51.5 13H40C40.5 15.5 42 16.5 44.5 16.5C46.5 16.5 48 16 49.5 15L51.5 18C49.5 19.5 47 20 44.5 20C39 20 35.5 17 35.5 11.5S39 3 44 3C49 3 52 6.5 52 11.5L51.5 13ZM40 9.5H47.5C47 7.5 46 6.5 44 6.5S40.5 7.5 40 9.5Z" />
        </svg>
      </span>
    )
  return <span className={`font-extrabold tracking-[-0.7px] text-[#ff5200] ${className}`}>one</span>
}

/** The green rating star. */
export function Rating({ size = 16 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-[#1ba672]" style={{ width: size, height: size }}>
      <Star aria-hidden="true" size={Math.round(size * 0.6)} fill="white" strokeWidth={0} />
      <span className="sr-only">Rated</span>
    </span>
  )
}

export function VegMark() {
  return (
    <span role="img" aria-label="Veg" className="mr-1 inline-grid h-[13px] w-[13px] place-items-center rounded-[3px] border-[1.5px] border-[#198c70] align-[-1px]">
      <span className="h-[6px] w-[6px] rounded-full bg-[#198c70]" />
    </span>
  )
}

/** Save to favourites: the heart fills orange and pops once (no pop with reduced motion). */
export function FavButton({ on, onToggle, label, size = 24, className = "" }: { on: boolean; onToggle: () => void; label: string; size?: number; className?: string }) {
  const icon = useRef<SVGSVGElement>(null)
  const was = useRef(on)
  useEffect(() => {
    if (on && !was.current && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      icon.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" })
    was.current = on
  }, [on])
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onToggle} className={`grid h-11 w-11 place-items-center text-white ${className}`}>
      <Heart ref={icon} size={size} strokeWidth={1.8} fill={on ? "#ff5200" : "rgba(0,0,0,.18)"} className="transition-[fill] duration-200" />
    </button>
  )
}

/** Two or more choices with a pill that slides to the chosen one. */
export function Segmented({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div role="tablist" aria-label={label} className="relative flex h-11 rounded-full bg-[#f3f2f5] p-1 shadow-[inset_3px_0_7px_rgba(30,35,55,.06)]">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_1px_12px_rgba(30,35,55,.09)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${value * 100}%)`, transition: `transform ${SLIDE}` }}
      />
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={value === i}
          onClick={() => onChange(i)}
          className={`relative flex-1 rounded-full text-[13px] font-extrabold transition-colors duration-200 ${value === i ? "text-[#cc4200]" : "text-[#505055]"}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
