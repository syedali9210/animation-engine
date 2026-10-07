// Swiggy App — the coffee promo: a full-width banner, the cup scaled down on phones so it never crowds the copy.
import { A } from "./data"
import { PRESS } from "./motion"

export function PromoBanner() {
  return (
    <article className={`relative h-[164px] overflow-hidden rounded-[20px] border border-[#e0e6ef] bg-[#356fbf] p-5 text-white md:h-[188px] md:p-6 ${PRESS}`}>
      <h3 className="relative z-10 text-[20px] font-extrabold leading-[24px] md:text-[24px] md:leading-[30px]">
        Get up to 60% OFF<sup className="text-[12px]">*</sup>
      </h3>
      <p className="relative z-10 mt-1 w-[52%] max-w-[280px] text-[14px] leading-[18px] text-white md:text-[16px] md:leading-[22px]">Enjoy coffee delights from top brands</p>
      <button type="button" className="relative z-10 mt-3 h-8 rounded-full bg-white px-3.5 text-[13px] font-extrabold text-[#2c64ae]">
        ORDER NOW
      </button>
      <span className="absolute bottom-1.5 left-5 text-[9px] md:left-6">*T&amp;C apply</span>
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute right-[-12px] top-[-15px] h-[90px] w-[90px] text-white/15">
        <g fill="none" stroke="currentColor">
          <path d="M50 50C0 10 10 0 50 50C40 0 60 0 50 50C90 0 100 10 50 50C100 40 100 60 50 50C100 90 90 100 50 50C60 100 40 100 50 50C10 100 0 90 50 50C0 60 0 40 50 50Z" />
          <path d="M20 90 80 10M10 20l80 60" />
        </g>
      </svg>
      <div
        aria-label="Latte in a white cup and saucer"
        role="img"
        className="absolute right-[-6px] top-[10px] h-[166px] w-[202px] origin-top-right scale-[.76] drop-shadow-[0_7px_4px_rgba(0,0,0,.22)] md:right-[19px] md:top-[14px] md:scale-100"
      >
        <span className="absolute bottom-0 left-[4px] h-[67px] w-[195px] rounded-[50%] border-b-[5px] border-[#b2b8b7] bg-[radial-gradient(ellipse_at_50%_30%,#fff_0%,#f0f3f1_50%,#bcc5c2_100%)]" />
        <span className="absolute right-0 top-[52px] h-[65px] w-[50px] -rotate-12 rounded-[50%] border-[12px] border-[#e1e8e7] bg-transparent" />
        <span className="absolute bottom-[21px] left-[22px] h-[93px] w-[146px] rounded-b-[65px] bg-[linear-gradient(100deg,#fff_0%,#f0f4f2_45%,#bdc8c4_100%)]" />
        <span className="absolute left-[22px] top-0 h-[86px] w-[146px] overflow-hidden rounded-[50%] border-[5px] border-[#eaf0e9] bg-[#b7834c]">
          <img src={`${A}/img/latte-surface.jpg`} alt="" className="h-full w-full object-fill" />
        </span>
      </div>
    </article>
  )
}
