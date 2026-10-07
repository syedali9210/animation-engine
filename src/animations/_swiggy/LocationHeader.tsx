// Swiggy App — who and where you're ordering for, the current offer and the menu. Sits on the maroon hero.
import { ChevronRight, Flame, Menu } from "lucide-react"
import { PRESS } from "./motion"
import { useSvgId } from "./ui"

export function LocationHeader({ name = "Syed Ali", address = "2nd Floor, Ayyappa Layout..." }: { name?: string; address?: string }) {
  const id = useSvgId()
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-white">
      <button type="button" className="min-w-0 text-left">
        <span className="flex items-center gap-0.5 whitespace-nowrap text-[18px] font-bold leading-[22px]">
          {name} <ChevronRight aria-hidden="true" size={16} strokeWidth={3} />
        </span>
        <span className="block truncate text-[13px] leading-[18px] text-white/85">{address}</span>
      </button>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className={`flex h-9 items-center gap-1.5 rounded-full border border-[#82616b] bg-[#1a0009]/80 pl-3 pr-1 text-[12px] font-medium shadow-[inset_0_1px_2px_rgba(255,255,255,.12)] ${PRESS}`}
        >
          <span className="whitespace-nowrap">Get Flat 50% OFF</span>
          <span aria-hidden="true" className="relative grid h-7 w-8 place-items-center overflow-hidden rounded-[12px] bg-[radial-gradient(ellipse_at_40%_20%,#7b4308,#321505_75%)]">
            <svg viewBox="0 0 44 40" className="h-[21px] w-[23px] -rotate-12 drop-shadow-[0_2px_2px_#000]">
              <defs>
                <linearGradient id={`${id}cap`}>
                  <stop stopColor="#ffe79a" />
                  <stop offset=".35" stopColor="#efb72f" />
                  <stop offset=".75" stopColor="#b86b0d" />
                  <stop offset="1" stopColor="#f2c85f" />
                </linearGradient>
              </defs>
              <ellipse cx="22" cy="30" rx="19" ry="6" fill="#86510a" stroke="#e7bd51" strokeWidth="1" />
              <path d="M8 27C8 17 13 8 23 8C32 8 36 17 36 27Z" fill={`url(#${id}cap)`} />
              <ellipse cx="22" cy="27" rx="18" ry="3" fill={`url(#${id}cap)`} />
              <ellipse cx="23" cy="7" rx="3" ry="2" fill="#ffe4a2" />
              <path d="M14 23Q13 15 20 11" fill="none" stroke="#fff0b0" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="absolute bottom-[1px] right-[5px] text-[13px] italic text-[#ffe49e] [font-family:Georgia,serif]">%</span>
          </span>
        </button>
        <button type="button" aria-label="Open menu" className={`flex h-9 w-14 items-center justify-center gap-0.5 rounded-full border border-[#82616b] bg-[#1a0009]/80 ${PRESS}`}>
          <Flame aria-hidden="true" size={20} fill="#ff5b31" stroke="#ff5b31" strokeWidth={1.5} />
          <Menu aria-hidden="true" size={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  )
}
