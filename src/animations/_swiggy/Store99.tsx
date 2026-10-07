// Swiggy App — 99 store: meals at ₹99 with free delivery. A snapping row of dish cards on phones, four across from md.
import { Check, ChevronRight, Plus, Star } from "lucide-react"
import { STORE99, type Store99Item } from "./data"
import { PRESS } from "./motion"
import { ROW, VegMark } from "./ui"

export function Store99Card({ d }: { d: Store99Item }) {
  return (
    <article className="w-[clamp(118px,calc((100vw-96px)/2),200px)] shrink-0 snap-start md:w-auto">
      <div className="relative aspect-square overflow-hidden rounded-[14px]">
        <img src={d.img} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          aria-label={`Add ${d.n} from ${d.s}`}
          className={`absolute bottom-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-[10px] border border-[#e3e5e4] bg-white shadow-sm ${PRESS}`}
        >
          <Plus aria-hidden="true" size={18} strokeWidth={3.5} className="text-[#1ba672]" />
        </button>
      </div>
      <h4 className="mt-2 line-clamp-2 text-[14px] font-medium leading-[18px] text-[#242833]">
        <VegMark />
        {d.n}
      </h4>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-[18px]">
        <s className="text-[#5f6168]">₹{d.old}</s>
        <span className="-skew-x-6 bg-[#ffda00] px-1 font-semibold text-[#1b1b22] shadow-[1px_2px_0_#222]">₹{d.p}</span>
      </p>
      <p className="mt-2 inline-flex items-center gap-[3px] rounded-[5px] bg-[#def6eb] px-1.5 text-[12px] font-semibold leading-[20px] text-[#146e52]">
        <Star aria-hidden="true" size={11} fill="currentColor" />
        {d.r}
      </p>
      <div className="mt-2 h-px w-4 bg-gray-300" />
      <p className="mt-1.5 truncate text-[12px] leading-[16px] text-[#6b6d73]">{d.s}</p>
    </article>
  )
}

export function Store99() {
  return (
    <section aria-label="99 store" className="overflow-hidden rounded-[28px] border border-[#e2f0f7] bg-gradient-to-b from-[#f5fbff] to-[#f5fafc] pb-6 pt-5">
      <div className="px-4">
        <div aria-hidden="true" className="flex h-[36px] origin-left scale-[.84] items-center gap-[5px]">
          <span className="relative isolate grid h-[43px] w-[45px] -rotate-12 place-items-center text-[30px] font-black leading-none tracking-[-3px] text-[#ffcf00]">
            <svg viewBox="0 0 54 52" className="absolute -left-[4px] -top-[3px] -z-10 h-[49px] w-[53px] text-[#102432]">
              <path d="M9 11 34 6M7 18 44 10M8 26 46 17M7 34 43 25M12 42 40 32M22 45 37 39" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              <path d="m10 8 22-4M5 23l39-10M13 45l22-12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <span className="relative -translate-x-[1px]">99</span>
          </span>
          <span className="text-[36px] leading-none text-[#ffcf00] [font-family:'Lilita_One',cursive] [-webkit-text-stroke:3px_#102432] [paint-order:stroke_fill] [text-shadow:0_3px_0_#102432]">store</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-[18px] text-[#15212e]">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#102432]">
              <Check aria-hidden="true" size={11} className="text-white" strokeWidth={3} />
            </span>
            <span>
              <span className="font-semibold text-[#9a5f08]">Meals at ₹99</span> + Free Delivery
            </span>
          </p>
          <button type="button" className="flex shrink-0 items-center text-[13px] font-bold leading-[18px] text-[#087b9c]">
            View All <ChevronRight aria-hidden="true" size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
      <div className={`mt-4 ${ROW} md:grid-cols-4`}>
        {STORE99.map((d, i) => (
          <Store99Card key={i} d={d} />
        ))}
      </div>
    </section>
  )
}
