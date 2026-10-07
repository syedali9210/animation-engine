// Swiggy App — a restaurant in the feed: photo with offer and delivery time, then what it is and how far.
// The image keeps its proportions at any width; the delivery-time tab bites into the text, which wraps clear of it.
import { Award, Flame, Leaf, MoreVertical } from "lucide-react"
import type { Featured } from "./data"
import { PRESS } from "./motion"
import { FavButton, Rating } from "./ui"

export function FeedCard({ f, fav, onFav }: { f: Featured; fav: boolean; onFav: () => void }) {
  const best = f.tag === "best"
  return (
    <article className={`overflow-hidden rounded-[24px] bg-white shadow-[0_7px_23px_rgba(30,35,40,.08)] ${PRESS}`}>
      <div className="relative aspect-[19/10]">
        <img src={f.img} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        <div aria-hidden="true" className="absolute left-1/2 top-3.5 flex -translate-x-1/2 gap-[5px]">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} className={`h-[6px] rounded-full bg-white ${d === 0 ? "w-[12px]" : "w-[6px] opacity-80"}`} />
          ))}
        </div>
        <FavButton on={fav} onToggle={onFav} label={`Save ${f.name}`} size={26} className="absolute right-8 top-0.5" />
        <button type="button" aria-label={`More about ${f.name}`} className="absolute right-0 top-0.5 grid h-11 w-9 place-items-center text-white">
          <MoreVertical aria-hidden="true" size={22} />
        </button>
        <p className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[14px] font-semibold text-white">
          <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-[#ff5200] text-[9px] font-bold">
            %
          </span>
          {f.offer}
        </p>
        <div
          className={
            best
              ? "absolute bottom-[-24px] right-0 z-10 isolate w-[108px] pb-2 pt-3 text-center before:absolute before:inset-0 before:-z-10 before:origin-top-left before:rounded-tl-[16px] before:bg-white before:[transform:skewY(-3deg)] before:content-['']"
              : "absolute bottom-[-24px] right-0 z-10 w-[112px] rounded-tl-[16px] bg-white pb-2 pt-3 text-center shadow-[-3px_-2px_8px_rgba(0,0,0,.04)]"
          }
        >
          <span
            aria-hidden="true"
            className={`absolute right-[6px] grid place-items-center rounded-full border-white bg-[#ff6b43] ${best ? "-top-[15px] h-[28px] w-[28px] border-[3px]" : "-top-[12px] h-[26px] w-[26px] border-2"}`}
          >
            <Flame size={14} fill="white" stroke="white" strokeWidth={1.5} />
          </span>
          <p className="text-[15px] font-bold leading-none text-[#2b2b33]">{f.time}</p>
          <p className="mx-2.5 mt-1.5 border-t border-[#ff9a77] pt-1 text-[11px] font-bold leading-[14px] text-[#cc4200]">FREE DELIVERY</p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        {f.tag === "veg" ? (
          <p className="flex items-center gap-1 pr-[116px] text-[13px] font-bold leading-[18px] text-[#198567]">
            <Leaf aria-hidden="true" size={13} fill="currentColor" />
            Pure Veg
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-1.5 pr-[116px] text-[13px] font-bold leading-[18px] text-[#2b2b33]">
            <Award aria-hidden="true" size={15} fill="#ffd148" stroke="#ba8420" />
            Best in Cakes &amp; Desserts
            <span className="text-[15px] font-normal text-black underline decoration-[#ec6c37] decoration-1 underline-offset-2 [font-family:Georgia,serif]">gourmet</span>
          </p>
        )}
        <h3 className="mt-1 text-[20px] font-extrabold leading-[24px] text-[#1b1b22]">{f.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[14px] leading-[18px] text-[#6b6d73]">
          <Rating size={18} />
          {f.meta}
        </p>
        <p className="mt-0.5 text-[14px] leading-[18px] text-[#6b6d73]">{f.cuisine}</p>
      </div>
    </article>
  )
}
