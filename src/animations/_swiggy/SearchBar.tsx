// Swiggy App — search with a suggestion that changes (Pizza → Biryani → …), voice search, and the VEG switch.
import { useState } from "react"
import { Mic, Search } from "lucide-react"
import { HINTS } from "./data"
import { SLIDE } from "./motion"

/** `hint` counts up; the suggestion shown is HINTS[hint % HINTS.length], rising into place as it changes. */
export function SearchBar({ veg, onVeg, hint = 0 }: { veg: boolean; onVeg: (veg: boolean) => void; hint?: number }) {
  const [query, setQuery] = useState("")
  const now = hint % HINTS.length
  return (
    <div className="flex gap-2.5">
      <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-[14px] bg-white pl-4 pr-1 shadow-[inset_0_0_0_1px_#f4f4f4]">
        <Search aria-hidden="true" size={20} strokeWidth={2} className="shrink-0 text-[#6b6d73]" />
        <span className="relative min-w-0 flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for dishes and restaurants"
            className="w-full bg-transparent text-[15px] leading-[20px] text-[#1b1b22] outline-none"
          />
          {!query && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap text-[15px] leading-[20px] text-[#6b6d73]">
              Search for '
              <span className="relative inline-block h-[20px] w-[4.4em] overflow-hidden">
                {HINTS.map((h, i) => {
                  const at = (i - now + HINTS.length) % HINTS.length // 0 shown, last one just left, the rest waiting below
                  return (
                    <span
                      key={h}
                      className="absolute left-0 top-0"
                      style={{ transform: `translateY(${at === 0 ? 0 : at === HINTS.length - 1 ? -100 : 100}%)`, opacity: at === 0 ? 1 : 0, transition: `transform ${SLIDE}, opacity 200ms ease` }}
                    >
                      {h}'
                    </span>
                  )
                })}
              </span>
            </span>
          )}
        </span>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[#e5e5e7]" />
        <button type="button" aria-label="Search by voice" className="grid h-11 w-11 shrink-0 place-items-center">
          <Mic aria-hidden="true" size={20} strokeWidth={2.4} className="text-[#ff5200]" />
        </button>
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={veg}
        aria-label="Veg only"
        onClick={() => onVeg(!veg)}
        className="flex h-[52px] w-[60px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-white"
      >
        <span className="text-[11px] font-bold leading-none text-[#4a4c52]">VEG</span>
        <span className={`relative h-[10px] w-[30px] rounded-full transition-colors duration-200 ${veg ? "bg-[#bfe8c7]" : "bg-[#eceef0]"}`}>
          <span
            className="absolute -top-[2px] left-0 grid h-[14px] w-[14px] place-items-center rounded-[3px] border-2 border-green-700 bg-white"
            style={{ transform: `translateX(${veg ? 16 : 0}px)`, transition: `transform ${SLIDE}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
          </span>
        </span>
      </button>
    </div>
  )
}
