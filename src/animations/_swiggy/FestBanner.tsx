// Swiggy App — the FLAVOURFEST campaign banner on the hero: the title between two dancing food characters.
import { FOOD_ICON } from "./data"
import { PRESS } from "./motion"

export function FestBanner() {
  return (
    <div className="relative mx-auto flex h-[112px] max-w-[600px] items-center justify-center px-[100px]">
      <svg aria-hidden="true" viewBox="0 0 90 108" className="absolute left-[20px] top-[7px] h-[104px] w-[88px] -rotate-[8deg] max-[480px]:left-[8px] max-[480px]:origin-left max-[480px]:scale-[.7]">
        <g fill="#ffe000" stroke="#efb400" strokeWidth="1">
          <path d="M27 38 30 8 36 9 33 39Z" />
          <path d="M35 39 39 1 46 2 42 40Z" />
          <path d="M43 40 50 5 57 7 50 42Z" />
          <path d="M51 43 62 6 68 9 58 45Z" />
          <path d="M60 44 74 16 80 19 66 48Z" />
          <path d="M22 40 19 20 25 18 30 42Z" />
        </g>
        <path d="M33 76 32 95 23 101M53 77 60 93 66 95" fill="none" stroke="#fb5691" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="22" cy="101" rx="10" ry="5" fill="#03b87b" />
        <ellipse cx="68" cy="97" rx="9" ry="6" fill="#03b87b" />
        <path d="M19 36 72 44 60 79 29 73Z" fill="#f52670" />
        <path d="M21 38 32 73 43 76 34 40Z" fill="#ff508d" />
        <ellipse cx="39" cy="52" rx="4" ry="5" fill="#5b0c39" />
        <ellipse cx="58" cy="55" rx="4" ry="5" fill="#5b0c39" />
        <path d="M40 62Q47 70 55 63" fill="none" stroke="#5b0c39" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 61Q79 76 64 80M28 56Q13 54 20 70" fill="none" stroke="#fb5691" strokeWidth="7" strokeLinecap="round" />
        <path d="M16 55Q3 67 11 79Q19 90 28 78L31 66" fill="none" stroke="#c6f100" strokeWidth="9" strokeLinecap="round" />
        <circle cx="12" cy="68" r="2" fill="#178854" />
        <circle cx="18" cy="77" r="2" fill="#178854" />
        <g fill="#ffe000">
          <circle cx="7" cy="44" r="1.5" />
          <circle cx="82" cy="33" r="1.5" />
          <path d="m4 84 3 1-1 3-3-1ZM78 60l4-2 1 2-4 2Z" />
        </g>
      </svg>
      <span aria-hidden="true" className="absolute left-[127px] top-[29px] text-[23px] text-white max-[480px]:hidden">
        ✦
      </span>
      <div className="relative z-10 text-center">
        <h2 className="fest whitespace-nowrap text-[clamp(44px,12.84vw,76px)] leading-[72px] tracking-[-1px] [transform:scaleX(.66)] [text-shadow:2px_5px_0_#e50078,0_7px_0_#640028]">FLAVOURFEST</h2>
        <button type="button" className={`relative -mt-[2px] rounded-b-[50%] border-2 border-t-0 border-[#dd008b] bg-[#3f001a] px-[20px] pb-[5px] pt-[1px] text-[13px] font-extrabold leading-[16px] text-[#ffed00] ${PRESS}`}>
          ORDER NOW
        </button>
      </div>
      <span aria-hidden="true" className="absolute right-[125px] top-[31px] text-[23px] text-white max-[480px]:hidden">
        ✦
      </span>
      <span aria-hidden="true" className="absolute right-[17px] top-[4px] h-[106px] w-[90px] rotate-[8deg] max-[480px]:right-[8px] max-[480px]:origin-right max-[480px]:scale-[.7]">
        <svg viewBox="0 0 90 108" className="absolute inset-0 h-full w-full">
          <path d="M34 65 30 88 23 97M56 65 63 87 70 94M25 42 14 28 13 15M65 45 77 36" fill="none" stroke="#fc4b8a" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="21" cy="98" rx="10" ry="5" fill="#ff694b" />
          <ellipse cx="72" cy="97" rx="10" ry="5" fill="#ff694b" />
          <circle cx="12" cy="13" r="5" fill="#fc4b8a" />
          <path d="m6 46 5-2M82 16l2 5M72 9l2-4M79 63l5 2" stroke="#ffe000" strokeWidth="2" />
        </svg>
        <img src={FOOD_ICON} alt="" className="absolute left-[9px] top-[15px] h-[72px] w-[72px] -rotate-[12deg] object-contain" />
        <svg viewBox="0 0 90 108" className="absolute inset-0 h-full w-full">
          <path d="M13 41Q42 65 78 49" fill="none" stroke="#00c884" strokeWidth="7" strokeLinecap="round" />
          <path d="m23 48-5 14 12-4" fill="#00c884" />
        </svg>
        <span className="absolute left-[34px] top-[34px] h-[4px] w-[4px] rounded-full bg-[#58142a]" />
        <span className="absolute left-[48px] top-[33px] h-[4px] w-[4px] rounded-full bg-[#58142a]" />
      </span>
    </div>
  )
}
