// Swiggy App — filter and sort for the restaurant feed. On the home screen it pins under the header while the feed
// scrolls, so the filters stay in reach of the list they filter.
import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { PRESS } from "./motion"

// the chips share the width when there's room, and scroll when there isn't (narrow phones)
const CHIP = `flex h-9 flex-auto shrink-0 items-center justify-center gap-1 rounded-[10px] border border-[#d8d8da] bg-white px-2.5 text-[13px] font-medium text-[#3d3e44] shadow-[0_1px_2px_rgba(0,0,0,.06)] ${PRESS}`

export function FilterBar() {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2.5 md:max-w-[640px]">
      <button type="button" className={CHIP}>
        Filter <SlidersHorizontal aria-hidden="true" size={15} />
      </button>
      <button type="button" className={CHIP}>
        Sort By <ChevronDown aria-hidden="true" size={15} />
      </button>
      <button type="button" className={CHIP}>
        <span className="text-[17px] font-black leading-none tracking-[-1px] text-black">one</span> Extra off
      </button>
      <button type="button" className={CHIP}>
        <span aria-hidden="true" className="grid h-4 w-4 -rotate-12 place-items-center rounded-[4px] bg-[#102432] text-[10px] font-black tracking-[-1px] text-[#ffcf00]">
          99
        </span>
        99 Store
      </button>
    </div>
  )
}
