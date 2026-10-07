// Swiggy App — the four pink offer cards on the hero. A snapping row on phones (two whole cards and a peek of the
// next, at any width), four across from md up.
import { PRESS } from "./motion"
import { ROW } from "./ui"

const OFFERS = [
  {
    t: "Get\n70% OFF",
    art: (
      <span className="relative flex h-[104px] items-start justify-center gap-[3px] pt-[6px] before:absolute before:bottom-[-8px] before:left-[-7px] before:h-[34px] before:w-[calc(100%+14px)] before:rounded-[50%] before:border-2 before:border-[#d84e72] before:bg-[radial-gradient(ellipse,#9f183a,#36000c)] before:content-['']">
        {[0, 1].map((ticket) => (
          <span
            key={ticket}
            className={`relative z-10 grid h-[80px] w-[48px] place-items-center text-[36px] font-black text-[#38000f] drop-shadow-[2px_4px_3px_rgba(0,0,0,.2)] ${ticket === 0 ? "-rotate-[12deg]" : "rotate-[10deg]"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 54 90" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full">
              <path d={`M3 3${"q3 -4.2 6 0".repeat(8)}${"q4.2 3 0 6".repeat(14)}${"q-3 4.2 -6 0".repeat(8)}${"q-4.2 -3 0 -6".repeat(14)}Z`} fill="#ffdf00" />
            </svg>
            <span className="absolute inset-x-0 bottom-[16px] border-b-2 border-dashed border-[#986800]" />%
          </span>
        ))}
      </span>
    ),
  },
  {
    t: "Get A\nFree Treat",
    art: (
      <span className="relative mx-auto block h-[108px] max-w-[136px] before:absolute before:inset-x-[-8px] before:bottom-[-3px] before:h-[33px] before:rounded-[50%] before:border-2 before:border-[#bd496c] before:bg-[radial-gradient(ellipse,#75142d,#30000a)] before:content-['']">
        <img src="/anim/swiggy-home/img/chocolate-cupcake-cutout.png" alt="" className="absolute -left-[5px] top-[8px] h-[84px] w-[72px] -rotate-6 object-contain" />
        <img src="/anim/swiggy-home/img/chocolate-cupcake-cutout.png" alt="" className="absolute -right-[8px] top-[6px] h-[84px] w-[72px] rotate-6 object-contain" />
        <img src="/anim/swiggy-home/img/cupcake-cutout.png" alt="" className="absolute bottom-[-1px] left-1/2 h-[94px] w-[78px] -translate-x-1/2 object-contain [filter:saturate(.25)]" />
      </span>
    ),
  },
  {
    t: "Binge-Worthy\nOffers",
    art: (
      <span className="mx-auto grid h-[104px] w-[min(126px,100%)] place-items-center rounded-t-[64px] border-[3px] border-[#edc400] bg-[radial-gradient(ellipse_at_50%_80%,#ae1232,#62071e)] text-center leading-none shadow-[inset_0_0_0_2px_#e98b38,0_0_6px_#a80c56]">
        <span className="block">
          <span className="block text-[14px] font-bold">FLAT</span>
          <span className="block text-[40px] font-extrabold tracking-[-2px] text-[#ffe200] [text-shadow:2px_3px_0_#4b0013]">₹150</span>
          <span className="mt-[3px] block text-[14px] font-bold">OFF</span>
        </span>
      </span>
    ),
  },
  {
    t: "Dishes\nFrom",
    art: (
      <span className="relative block pb-[22px] text-[30px] font-black italic leading-[28px] [-webkit-text-stroke:4px_#4b002d] [paint-order:stroke_fill] [text-shadow:3px_4px_0_#4b002d]">
        PREMIUM
        <br />
        CRAZE
        <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 text-[18px] not-italic tracking-[10px] text-[#ffe700] [-webkit-text-stroke:0]">••••</span>
      </span>
    ),
  },
]

export function OfferCards() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className={`${ROW} md:grid-cols-4`}>
        {OFFERS.map((o) => (
          <button
            key={o.t}
            type="button"
            className={`flex h-[176px] w-[clamp(132px,calc((100vw-64px)/2),220px)] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[16px] bg-[radial-gradient(ellipse_at_50%_0%,#fb299b,#ef178c_60%,#bd0656_100%)] pt-4 text-center text-white shadow-[inset_-8px_0_10px_rgba(112,0,45,.2)] md:w-auto ${PRESS}`}
          >
            <span className="block whitespace-pre-line px-1 text-[17px] font-semibold leading-[21px]">{o.t}</span>
            <span className="block px-[3px]">{o.art}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
