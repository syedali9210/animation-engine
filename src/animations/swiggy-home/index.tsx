// Swiggy Home — ported 1:1 from Desktop/swiggy (Figma Make), with what it takes to run as a screen in a device:
// it scrolls its own container instead of the window; the fake status bar is gone and the hero and the bottom nav
// leave room for the device's real status bar and home indicator (the device is told which ink each needs); and a
// demo scroll drives it while nobody scrolls it by hand. Images and fonts live in public/anim/swiggy-home.
import { useEffect, useRef, useState } from "react"
import {
  Check,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  ChevronRight,
  Menu,
  Search,
  Mic,
  Tag,
  Zap,
  Heart,
  Star,
  Flame,
  Leaf,
  Award,
} from "lucide-react"
import { params as defaults, type Params } from "./params"
import "./swiggy.css"

const A = "/anim/swiggy-home"
const foodService = `${A}/service-food-v2.png`
const u = (id: string) => `${A}/img/${id}.jpg`

const tabs = [
  { label: "Food" },
  { label: "Instamart", badge: "10 mins" },
  { label: "Dineout" },
  { label: "Scenes" },
]
const chips = [
  { label: "ALL" },
  { label: "STORE" },
  { label: "OFFERS" },
  { label: "BOLT" },
  { label: "EATRIGHT" },
]
const restaurants = [
  {
    name: "Theobroma",
    rating: 4.4,
    cat: "Bakery",
    offer: "ITEMS\nAT ₹37",
    ad: true,
    img: `${A}/img/pralines.jpg`,
  },
  {
    name: "Kanti Sweets",
    rating: 4.7,
    cat: "Sweets",
    offer: "",
    ad: false,
    img: `${A}/img/kaju-katli.jpg`,
  },
  {
    name: "Salad Days",
    rating: 4.4,
    cat: "Salads",
    offer: "ITEMS\nAT ₹129",
    ad: true,
    img: u("photo-1512621776951-a57141f2eefd"),
  },
  {
    name: "Natural Ice",
    rating: 4.6,
    cat: "Desserts",
    offer: "",
    ad: false,
    img: u("photo-1497034825429-c343d7c6a68f"),
  },
]

const mind = [
  { l: "Idli", img: u("photo-1589301760014-d929f3979dbc") },
  { l: "Dosa", img: u("photo-1668236543090-82eba5ee5976") },
  { l: "Vada", img: u("photo-1630383249896-424e482df921") },
  { l: "Bath", img: u("photo-1645177628172-a94c1f96e6db") },
  { l: "Tea", img: u("photo-1571934811356-5cc061b6821f") },
  { l: "Biryani", img: u("photo-1563379091339-03b21ab4a4f8") },
]
const store99 = [
  {
    n: "Masala Dosa",
    old: 110,
    p: 99,
    r: "4.0 (3.5K+)",
    s: "Udupi Thindies",
    img: u("photo-1630383249896-424e482df921"),
  },
  {
    n: "Masala Dosa",
    old: 150,
    p: 59,
    r: "4.3 (440)",
    s: "Udupi Kitchen",
    img: u("photo-1668236543090-82eba5ee5976"),
  },
  {
    n: "Steaming Idlis (2 Pcs)",
    old: 102,
    p: 89,
    r: "4.5 (955)",
    s: "The Filter Coffee",
    img: u("photo-1589301760014-d929f3979dbc"),
  },
  {
    n: "Set Dosa",
    old: 110,
    p: 99,
    r: "4.0 (1.1K+)",
    s: "Udupi Thindies",
    img: u("photo-1694849789325-914b71ab4075"),
  },
]

const featured = [
  {
    name: "Theobroma",
    tag: "best",
    offer: "Items at ₹37",
    time: "15-20 MINS",
    meta: "4.4 (4.7K+) • Sanjay Nagar, 4.0 km",
    cuisine: "Bakery, Desserts • ₹400 for two",
    img: u("photo-1578985545062-69928b1d9587"),
  },
  {
    name: "Sri Manjunatha Grand",
    tag: "veg",
    offer: "₹20 off above ₹449",
    time: "20-25 MINS",
    meta: "4.3 (2.6K+) • RT Nagar, 1.4 km",
    cuisine: "South Indian • ₹150 for two",
    img: u("photo-1742281257687-092746ad6021"),
  },
  {
    name: "Udupi Thindies",
    tag: "veg",
    offer: "Items at ₹59",
    time: "25-30 MINS",
    meta: "4.0 (3.5K+) • Hebbal, 2.2 km",
    cuisine: "South Indian, Chaats • ₹200 for two",
    img: u("photo-1668236543090-82eba5ee5976"),
  },
]

function One({ className = "", artwork = false }: { className?: string; artwork?: boolean }) {
  if (artwork) return <span aria-label="one" className={`inline-flex items-center text-[#ff5200] ${className}`}><svg aria-hidden="true" viewBox="0 0 52 22" className="h-[23px] w-[49px]" fill="currentColor"><path d="M8 3C4 3 1 5 0 8L4 10C4.5 8 6 7 8 7C10.5 7 12 9 12 11.5C12 14 10.5 16 8 16C5.5 16 4 14 4 11.5L0 10.5V12C0 17 3 20 8 20S16 17 16 11.5S13 3 8 3Z" /><path d="M18 4H22.5V6C24 4 25.5 3 28 3C32 3 34 6 34 10V20H29.5V11C29.5 8.5 28.5 7 26.5 7C24 7 22.5 8.5 22.5 11V20H18Z" /><path fillRule="evenodd" d="M51.5 13H40C40.5 15.5 42 16.5 44.5 16.5C46.5 16.5 48 16 49.5 15L51.5 18C49.5 19.5 47 20 44.5 20C39 20 35.5 17 35.5 11.5S39 3 44 3C49 3 52 6.5 52 11.5L51.5 13ZM40 9.5H47.5C47 7.5 46 6.5 44 6.5S40.5 7.5 40 9.5Z" /></svg></span>;
  return (
    <span
      className={`font-extrabold tracking-[-.7px] text-[#ff5200] ${className}`}
    >
      one
    </span>
  )
}

function CategoryIcon({ index }: { index: number }) {
  if (index === 0)
    return (
      <span
        aria-hidden="true"
        className="grid h-[19px] w-[19px] shrink-0 grid-cols-2 gap-[3px] p-[1px]"
      >
        {[0, 1, 2, 3].map((dot) => (
          <span key={dot} className="rounded-full bg-current" />
        ))}
      </span>
    )
  if (index === 1)
    return (
      <span
        aria-hidden="true"
        className="inline-block -rotate-[15deg] text-[23px] font-extrabold leading-[20px] tracking-[-3px]"
      >
        99
      </span>
    )
  if (index === 2) return <Tag size={19} fill="currentColor" strokeWidth={0} />
  if (index === 3) return <Zap size={20} fill="currentColor" strokeWidth={1} />
  return (
    <span className="relative" aria-hidden="true">
      <Heart size={21} fill="currentColor" strokeWidth={0} />
      <Check
        size={12}
        strokeWidth={3}
        className="absolute left-[4px] top-[3px] text-[#5b233c]"
      />
    </span>
  )
}

function DiscoBall() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 72"
      className="h-[65px] w-[65px] drop-shadow-md"
    >
      <defs>
        <radialGradient id="disco-light" cx="28%" cy="24%" r="78%">
          <stop stopColor="#fff0f8" />
          <stop offset=".3" stopColor="#ffa9d1" />
          <stop offset=".65" stopColor="#f270ae" />
          <stop offset="1" stopColor="#cc3b80" />
        </radialGradient>
        <pattern id="disco-mirrors" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="none" /><path d="M.5.5H7.5V7.5H.5Z" fill="#fff0fa" fillOpacity=".08" stroke="#ffd9ed" strokeOpacity=".2" strokeWidth=".5" /><path d="M1 1H7V3H1Z" fill="white" fillOpacity=".13" /></pattern>
        <clipPath id="disco-outline">
          <circle cx="32" cy="38" r="26" />
        </clipPath>
      </defs>
      <path d="M32 8v4" stroke="#b33465" strokeWidth="1" />
      <circle cx="32" cy="38" r="26" fill="url(#disco-light)" />
      <circle cx="32" cy="38" r="26" fill="url(#disco-mirrors)" />
      <g
        clipPath="url(#disco-outline)"
        fill="none"
        stroke="#fce0ed"
        strokeWidth=".9"
        opacity=".7"
      >
        <path d="M8 24Q32 18 56 24M6 34Q32 30 58 34M6 44Q32 48 58 44M10 54Q32 62 54 54M32 12v52M22 12q-10 25 0 51M42 12q10 25 0 51M14 17q-13 21 0 41M50 17q13 21 0 41" />
      </g>
      <path
        d="M17 21H23V27H17ZM24 15H29V20H24ZM11 30H16V35H11Z"
        fill="#fff4fa"
        opacity=".8"
      />
    </svg>
  )
}

/** The bottom-nav glyphs (the source's icons/*.svg), drawn in the button's own colour. */
function NavIcon({ name }: { name: string }) {
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const
  if (name === "Food")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={36} height={36}>
        <path d="M8 15C4 10 7 6 12 7C12 1 20 1 22 6C28 3 33 8 30 14" fill="white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M4 15Q19 11 34 15V22Q34 26 30 27L28 34Q19 37 10 34L8 27Q4 26 4 22Z" fill="currentColor" />
        <path d="M6 16Q19 13 32 16" fill="none" stroke="#ff9c46" strokeWidth="1.5" />
        <path d="M8 26H30" stroke="#ec4700" strokeWidth="1" />
      </svg>
    )
  if (name === "Bolt")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={36} height={36} {...line} strokeWidth="2.4">
        <path d="M23 3 13 19H20L15 33 30 13H22L27 3Z" />
        <path d="M5 8H11M3 14H9M6 20H10" />
      </svg>
    )
  if (name === "99 store")
    return (
      <svg aria-hidden="true" viewBox="0 0 40 38" width={38} height={36} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <g transform="rotate(-8 20 19)">
          <path d="M14 4C7 4 3 8 3 14C3 20 7 23 12 23L10 29L16 30L23 19C29 10 23 4 14 4Z" fill="white" />
          <circle cx="13" cy="13" r="1.7" fill="currentColor" stroke="none" />
          <path d="M25 10C19 10 15 14 15 20C15 25 19 28 23 28L21 33L27 34L34 23C40 15 33 10 25 10Z" fill="white" />
          <circle cx="25" cy="19" r="1.7" fill="currentColor" stroke="none" />
        </g>
      </svg>
    )
  if (name === "EatRight")
    return (
      <svg aria-hidden="true" viewBox="0 0 38 38" width={36} height={36} {...line} strokeWidth="2.5">
        <path d="M19 32 6 20C-3 11 7 0 15 6L19 10L23 6C31 0 41 11 32 20Z" />
        <path d="m12 14 6 6 9-10" />
      </svg>
    )
  return (
    <svg aria-hidden="true" viewBox="0 0 40 38" width={38} height={36} {...line} strokeWidth="2.5">
      <path d="m4 4 5 2 4 18q1 3 5 3h11q3 0 4-4l3-12" />
      <circle cx="17" cy="34" r="2.6" />
      <circle cx="29" cy="34" r="2.6" />
      <path d="M23 5a7.5 7.5 0 1 1-7 11M20 2l4 3-4 3" />
    </svg>
  )
}

export default function SwiggyHome({ p = defaults }: { p?: Params }) {
  const [tab, setTab] = useState(0)
  const [chip, setChip] = useState(0)
  const [seg, setSeg] = useState(0)
  const [veg, setVeg] = useState(false)
  const [favs, setFavs] = useState<number[]>([])
  const [nav, setNav] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const dishRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const [dishPinned, setDishPinned] = useState(false)
  const [wide, setWide] = useState(false) // wider than the 592px column: the grey page shows at the sides
  useEffect(() => {
    const el = scroller.current!
    const on = () => {
      setWide(innerWidth > 592)
      setStuck(
        !!chipRef.current && chipRef.current.getBoundingClientRect().top < 44,
      )
      setDishPinned(
        !!dishRef.current && dishRef.current.getBoundingClientRect().top <= 108,
      )
    }
    on()
    el.addEventListener("scroll", on, { passive: true })
    addEventListener("resize", on) // a foldable opening or closing moves everything
    return () => {
      el.removeEventListener("scroll", on)
      removeEventListener("resize", on)
    }
  }, [])

  // the status bar sits on the maroon hero until the white header takes over (light ink, then dark) — unless the
  // screen is wider than the column and it sits on the grey page; the home indicator is always over white
  useEffect(() => {
    window.engine?.report("status", { top: stuck || wide ? "dark" : "light", bottom: "dark" })
  }, [stuck, wide])

  // demo: a screenful at a time to the end, then back to the top; hands off for a while when someone scrolls it
  useEffect(() => {
    const el = scroller.current!
    if (!p.autoplay) return
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
    let quietUntil = 0
    const hold = () => {
      quietUntil = performance.now() + 4000
    }
    const t = setInterval(() => {
      if (performance.now() < quietUntil) return
      const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      el.scrollTo({ top: end ? 0 : el.scrollTop + el.clientHeight * 0.8, behavior })
    }, p.stepMs)
    const events = ["wheel", "pointerdown", "touchstart"] as const
    events.forEach((e) => el.addEventListener(e, hold, { passive: true }))
    return () => {
      clearInterval(t)
      events.forEach((e) => el.removeEventListener(e, hold))
    }
  }, [p.autoplay, p.stepMs])

  return (
    <div className="swiggy absolute inset-0 overflow-hidden bg-[#d9d9de]">
      <div ref={scroller} className="no-scrollbar h-full overflow-y-auto overscroll-contain">
        <div className="relative mx-auto min-h-full w-full max-w-[592px] overflow-x-clip bg-white pb-[96px]">
          {/* Hero — 62px on top for the device's status bar, which sits on the maroon */}
          <section className="rounded-b-[32px] pt-[62px] text-white bg-[linear-gradient(115deg,#3b0315,#2c0010)]">
            <header className="flex h-[86px] items-start justify-between px-5 pt-[22px]">
              <div className="min-w-0 pr-[8px]">
                <div className="flex items-center whitespace-nowrap text-[24px] font-bold leading-[30px] max-[480px]:text-[18px]">
                  Syed Ali <ChevronRight size={20} strokeWidth={3} />
                </div>
                <div className="truncate text-[16px] leading-[22px] text-white/90 max-[480px]:text-[11px]">
                  2nd Floor, Ayyappa Layout...
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex h-[50px] w-[217px] shrink-0 items-center justify-between gap-[8px] rounded-full border border-[#82616b] bg-[#1a0009]/80 pl-[13px] pr-[4px] text-[18px] font-normal shadow-[inset_0_1px_2px_rgba(255,255,255,.12)] max-[480px]:h-[40px] max-[480px]:w-[156px] max-[480px]:gap-[4px] max-[480px]:pl-[8px] max-[480px]:text-[12px]">
                  <span className="whitespace-nowrap">Get Flat 50% OFF</span>
                  <span
                    aria-hidden="true"
                    className="relative grid h-[42px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-[17px] bg-[radial-gradient(ellipse_at_40%_20%,#7b4308,#321505_75%)] max-[480px]:h-[32px] max-[480px]:w-[32px]"
                  >
                    <svg aria-hidden="true" viewBox="0 0 44 40" className="h-[34px] w-[38px] -rotate-12 drop-shadow-[0_2px_2px_#000]"><defs><linearGradient id="gold-cap"><stop stopColor="#ffe79a" /><stop offset=".35" stopColor="#efb72f" /><stop offset=".75" stopColor="#b86b0d" /><stop offset="1" stopColor="#f2c85f" /></linearGradient></defs><ellipse cx="22" cy="30" rx="19" ry="6" fill="#86510a" stroke="#e7bd51" strokeWidth="1" /><path d="M8 27C8 17 13 8 23 8C32 8 36 17 36 27Z" fill="url(#gold-cap)" /><ellipse cx="22" cy="27" rx="18" ry="3" fill="url(#gold-cap)" /><ellipse cx="23" cy="7" rx="3" ry="2" fill="#ffe4a2" /><path d="M14 23Q13 15 20 11" fill="none" stroke="#fff0b0" strokeWidth="2" strokeLinecap="round" /></svg>
                    <span className="absolute bottom-[5px] right-[11px] text-[20px] italic text-[#ffe49e] [font-family:Georgia,serif]">
                      %
                    </span>
                  </span>
                </button>
                <button
                  aria-label="Open menu"
                  className="flex h-[50px] w-[78px] shrink-0 items-center justify-center gap-[5px] rounded-full border border-[#82616b] bg-[#1a0009]/80 max-[480px]:h-[40px] max-[480px]:w-[50px] max-[480px]:gap-0"
                >
                  <Flame
                    size={31}
                    fill="#ff5b31"
                    stroke="#ff5b31"
                    strokeWidth={1.5}
                  />
                  <Menu size={25} strokeWidth={2.6} />
                </button>
              </div>
            </header>

            <nav className="relative isolate mt-[18px] grid h-[115px] grid-cols-4 items-end gap-[8px] px-[8px]">
              <svg aria-hidden="true" viewBox="0 0 592 115" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="service-active-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#c60045" />
                    <stop offset="1" stopColor="#82012b" />
                  </linearGradient>
                  <linearGradient id="service-inactive-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#4b132a" />
                    <stop offset=".45" stopColor="#3e0d22" />
                    <stop offset="1" stopColor="#2e0717" />
                  </linearGradient>
                  <radialGradient id="service-panel-light" cx="82%" cy="5%" r="85%">
                    <stop stopColor="#bd7c96" stopOpacity=".12" />
                    <stop offset=".55" stopColor="#8d405f" stopOpacity=".035" />
                    <stop offset="1" stopColor="#8d405f" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="service-panel-rim" x1="0" y1="0" x2="1" y2="0">
                    <stop stopColor="#9f5672" stopOpacity=".08" />
                    <stop offset=".3" stopColor="#af6e88" stopOpacity=".18" />
                    <stop offset=".75" stopColor="#d095aa" stopOpacity=".6" />
                    <stop offset=".9" stopColor="#deb0bf" stopOpacity=".75" />
                    <stop offset="1" stopColor="#b97892" stopOpacity=".48" />
                  </linearGradient>
                  <linearGradient id="service-floor-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset=".65" stopColor="#82012b" stopOpacity="0" />
                    <stop offset="1" stopColor="#82012b" />
                  </linearGradient>
                </defs>
                <path d="M0 0H592V116H0Z" fill="url(#service-floor-fill)" />
                {tabs.map((service, index) => ({ service, index })).reverse().map(({ service, index }) => {
                  if (index === tab) return null;
                  const left = 8 + index * 146;
                  const right = left + 138;
                  const outline = `M${left - 7} 115L${left + 3} 22Q${left + 5} 0 ${left + 25} 0H${right - 25}Q${right - 5} 0 ${right - 3} 22L${right + 7} 115`;
                  return <g key={service.label}><path d={`${outline}Z`} fill="url(#service-inactive-fill)" className="drop-shadow-[2px_0_2px_rgba(15,0,6,.24)]" /><path d={`${outline}Z`} fill="url(#service-panel-light)" /><path d={outline} fill="none" stroke="url(#service-panel-rim)" strokeWidth="1.2" /></g>;
                })}
                <path d="M0 114.5H592" fill="none" stroke="#aa5473" strokeOpacity=".55" strokeWidth="1.2" />
                <path d={`M${tab * 146} 116L${10 + tab * 146} 22Q${13 + tab * 146} 0 ${33 + tab * 146} 0H${116 + tab * 146}Q${139 + tab * 146} 0 ${141 + tab * 146} 22L${153 + tab * 146} 90Q${156 + tab * 146} 115 ${180 + tab * 146} 115L${180 + tab * 146} 117H${tab * 146}`} fill="url(#service-active-fill)" />
                <path d={`M${tab * 146} 115L${10 + tab * 146} 22Q${13 + tab * 146} 0 ${33 + tab * 146} 0H${116 + tab * 146}Q${139 + tab * 146} 0 ${141 + tab * 146} 22L${153 + tab * 146} 90Q${156 + tab * 146} 115 ${180 + tab * 146} 115`} fill="none" stroke="#cb6c8a" strokeOpacity=".65" strokeWidth="1.2" />
              </svg>
              {tabs.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setTab(i)}
                  aria-pressed={tab === i}
                  className="relative flex h-full flex-col items-center pt-[13px] pb-[8px] transition"
                >
                  {i === 2 ? (
                    <span
                      aria-hidden="true"
                      className="relative mt-[7px] h-[58px] w-[62px] drop-shadow-[0_4px_3px_rgba(0,0,0,.25)]"
                    >
                      <svg viewBox="0 0 62 58" className="h-full w-full"><defs><radialGradient id="dine-dome" cx="30%" cy="22%" r="78%"><stop stopColor="#afdc7b" /><stop offset=".42" stopColor="#72ad45" /><stop offset=".8" stopColor="#447f23" /><stop offset="1" stopColor="#315819" /></radialGradient><linearGradient id="dine-rim" x2="0" y2="1"><stop stopColor="#92c168" /><stop offset="1" stopColor="#456d2e" /></linearGradient></defs><ellipse cx="31" cy="48" rx="24" ry="8" fill="#fff2d7" /><path d="M16 46Q29 39 46 47L43 51Q30 54 18 49Z" fill="#d78435" /><path d="m19 43 10 2 7-3 9 4-10 4-15-3Z" fill="#74a535" /><circle cx="31" cy="5" r="4.5" fill="url(#dine-dome)" /><path d="M6 36C7 20 16 10 31 10S55 20 56 36Z" fill="url(#dine-dome)" /><ellipse cx="31" cy="36" rx="28" ry="5" fill="url(#dine-rim)" /><path d="M14 29Q15 18 23 15" fill="none" stroke="#b5db86" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" /><path d="M4 37Q31 42 58 37" fill="none" stroke="#365822" strokeOpacity=".6" strokeWidth="1.2" /></svg>
                    </span>
                  ) : i === 1 ? (
                    <span
                      className="relative grid h-[65px] w-[65px] place-items-center"
                      aria-hidden="true"
                    >
                      <span className="absolute left-[17px] top-[11px] h-[24px] w-[8px] -rotate-12 rounded-t-full bg-gradient-to-r from-[#5d962b] to-[#bbd344]" />
                      <span className="absolute left-[29px] top-[14px] h-[23px] w-[8px] rotate-12 rounded-t-full bg-gradient-to-r from-[#e9781d] to-[#f4b94c]" />
                      <span className="absolute right-[14px] top-[9px] h-[27px] w-[9px] rotate-[22deg] rounded-t-full bg-gradient-to-r from-[#c88824] to-[#ffe7a0]" />
                      <svg aria-hidden="true" viewBox="0 0 64 56" className="absolute bottom-[8px] h-[48px] w-[54px] drop-shadow-[0_3px_2px_rgba(0,0,0,.2)]"><defs><linearGradient id="grocery-blue" x2="0" y2="1"><stop stopColor="#7ee3f1" /><stop offset=".4" stopColor="#37bada" /><stop offset="1" stopColor="#177baf" /></linearGradient></defs><path d="M10 30 13 14Q20 10 24 22L28 31" fill="#55ab36" /><path d="M23 31 28 14Q32 9 34 16L35 31" fill="#fb9730" /><path d="m37 31 7-22q2-5 6-2l3 3-8 23" fill="#f5bf56" /><path d="m44 15 5 3m-7 3 5 3" stroke="#d78b27" strokeWidth="2" /><path d="M7 28H58L52 52H13Z" fill="url(#grocery-blue)" /><path d="M11 33H54M13 40H52M16 47H50M20 30l2 21M30 30v22M40 30l-2 22M49 30l-4 22" fill="none" stroke="#a1edf4" strokeOpacity=".65" strokeWidth="2" /><path d="M6 28H58" stroke="#89e3ee" strokeWidth="5" strokeLinecap="round" /></svg>
                    </span>
                  ) : i === 3 ? (
                    <DiscoBall />
                  ) : (
                    <img
                      src={foodService}
                      alt=""
                      className="h-[65px] w-[65px] object-contain drop-shadow-md"
                    />
                  )}
                  {t.badge && (
                    <span className="absolute top-[54px] rounded-[5px] bg-[#0059ff] px-[7px] py-[2px] text-[18px] font-semibold leading-[24px]">
                      {t.badge}
                    </span>
                  )}
                  <span
                    className={`mt-[8px] text-[18px] leading-[22px] ${
                      tab === i ? "font-bold" : "text-white/75"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </nav>
            <div className="-mt-px rounded-b-[32px] bg-[linear-gradient(180deg,#82012b_0%,#50011d_23%,#4b011d_37%,#3f0118_58%,#2c0011_95%,#22000d_100%)] pt-[24px] pb-[4px]">
              <div className="flex gap-[12px] px-[20px]">
                <label className="flex h-[82px] min-w-0 flex-1 items-center gap-[20px] rounded-[18px] bg-white px-[22px] text-gray-500 shadow-[inset_0_0_0_1px_#f4f4f4]">
                  <Search
                    size={29}
                    strokeWidth={1.8}
                    className="shrink-0 text-[#919397]"
                  />
                  <input
                    placeholder="Search for 'Pizza'"
                    className="min-w-0 flex-1 bg-transparent text-[20px] text-gray-800 outline-none placeholder:text-[#939397]"
                  />
                  <span className="h-7 w-px bg-gray-200" />
                  <Mic
                    size={28}
                    strokeWidth={2.5}
                    className="shrink-0 text-[#ff5200]"
                  />
                </label>
                <button
                  onClick={() => setVeg(!veg)}
                  className="flex h-[82px] w-[72px] flex-col items-center justify-center rounded-[18px] bg-white text-gray-800"
                >
                  <span className="text-[17px] font-semibold text-[#686b6d]">
                    VEG
                  </span>
                  <span
                    className={`mt-1 flex h-3 w-[39px] items-center rounded-full ${
                      veg ? "bg-green-200 justify-end" : "bg-[#f0f1f2]"
                    }`}
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-sm border-2 border-green-700 bg-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
                    </span>
                  </span>
                </button>
              </div>

              <div
                ref={chipRef}
                className="no-scrollbar mx-[10px] mt-[26px] flex h-[46px] overflow-x-auto border-b border-white/20"
              >
                {chips.map((c, i) => {
                  return (
                    <button
                      key={c.label}
                      onClick={() => setChip(i)}
                      className={`relative flex shrink-0 items-start justify-center gap-[5px] pt-[3px] text-[14px] leading-[20px] after:absolute after:bottom-0 after:inset-x-0 after:h-[5px] after:rounded-full after:content-[''] ${
                        i === 0
                          ? "w-[104px]"
                          : i === 1
                            ? "w-[120px]"
                            : i === 2
                              ? "w-[127px]"
                              : i === 3
                                ? "w-[107px]"
                                : "w-[114px]"
                      } ${
                        i > 0
                          ? "before:absolute before:left-0 before:top-[5px] before:h-[18px] before:w-px before:bg-white/20 before:content-['']"
                          : ""
                      } ${
                        i === 0 && chip === i
                          ? "isolate after:bg-[#f4dce6] font-semibold text-white"
                          : chip === i
                          ? "after:bg-[#fff3f5] font-semibold text-white"
                          : "text-[#dac1cb]"
                      }`}
                    >
                      {i === 0 && chip === 0 && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[6px] -z-10 h-[37px] bg-[radial-gradient(ellipse_at_45%_70%,rgba(178,35,91,.35)_0%,rgba(117,13,54,.18)_48%,transparent_78%)] blur-[7px]" />}
                      <CategoryIcon index={i} /> {c.label}
                    </button>
                  )
                })}
              </div>

              <div className="relative mt-[18px] flex h-[112px] items-center justify-center px-[100px]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 90 108"
                  className="absolute left-[20px] top-[7px] h-[104px] w-[88px] -rotate-[8deg] max-[480px]:origin-left max-[480px]:scale-[.7]"
                >
                  <g fill="#ffe000" stroke="#efb400" strokeWidth="1">
                    <path d="M27 38 30 8 36 9 33 39Z" />
                    <path d="M35 39 39 1 46 2 42 40Z" />
                    <path d="M43 40 50 5 57 7 50 42Z" />
                    <path d="M51 43 62 6 68 9 58 45Z" />
                    <path d="M60 44 74 16 80 19 66 48Z" />
                    <path d="M22 40 19 20 25 18 30 42Z" />
                  </g>
                  <path
                    d="M33 76 32 95 23 101M53 77 60 93 66 95"
                    fill="none"
                    stroke="#fb5691"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <ellipse cx="22" cy="101" rx="10" ry="5" fill="#03b87b" />
                  <ellipse cx="68" cy="97" rx="9" ry="6" fill="#03b87b" />
                  <path d="M19 36 72 44 60 79 29 73Z" fill="#f52670" />
                  <path d="M21 38 32 73 43 76 34 40Z" fill="#ff508d" />
                  <ellipse cx="39" cy="52" rx="4" ry="5" fill="#5b0c39" />
                  <ellipse cx="58" cy="55" rx="4" ry="5" fill="#5b0c39" />
                  <path
                    d="M40 62Q47 70 55 63"
                    fill="none"
                    stroke="#5b0c39"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M62 61Q79 76 64 80M28 56Q13 54 20 70"
                    fill="none"
                    stroke="#fb5691"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 55Q3 67 11 79Q19 90 28 78L31 66"
                    fill="none"
                    stroke="#c6f100"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="68" r="2" fill="#178854" />
                  <circle cx="18" cy="77" r="2" fill="#178854" />
                  <g fill="#ffe000">
                    <circle cx="7" cy="44" r="1.5" />
                    <circle cx="82" cy="33" r="1.5" />
                    <path d="m4 84 3 1-1 3-3-1ZM78 60l4-2 1 2-4 2Z" />
                  </g>
                </svg>
                <span
                  aria-hidden="true"
                  className="absolute left-[127px] top-[29px] text-[23px] text-white max-[480px]:hidden"
                >
                  ✦
                </span>
                <div className="relative z-10 text-center">
                  <h1 className="fest whitespace-nowrap text-[clamp(44px,12.84vw,76px)] leading-[72px] tracking-[-1px] [transform:scaleX(.66)] [text-shadow:2px_5px_0_#e50078,0_7px_0_#640028]">
                    FLAVOURFEST
                  </h1>
                  <button className="relative -mt-[2px] rounded-b-[50%] border-2 border-t-0 border-[#dd008b] bg-[#3f001a] px-[22px] pb-[5px] pt-[1px] text-[16px] font-extrabold leading-[18px] text-[#ffed00]">
                    ORDER NOW
                  </button>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute right-[125px] top-[31px] text-[23px] text-white max-[480px]:hidden"
                >
                  ✦
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-[17px] top-[4px] h-[106px] w-[90px] rotate-[8deg] max-[480px]:origin-right max-[480px]:scale-[.7]"
                >
                  <svg
                    viewBox="0 0 90 108"
                    className="absolute inset-0 h-full w-full"
                  >
                    <path
                      d="M34 65 30 88 23 97M56 65 63 87 70 94M25 42 14 28 13 15M65 45 77 36"
                      fill="none"
                      stroke="#fc4b8a"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <ellipse cx="21" cy="98" rx="10" ry="5" fill="#ff694b" />
                    <ellipse cx="72" cy="97" rx="10" ry="5" fill="#ff694b" />
                    <circle cx="12" cy="13" r="5" fill="#fc4b8a" />
                    <path
                      d="m6 46 5-2M82 16l2 5M72 9l2-4M79 63l5 2"
                      stroke="#ffe000"
                      strokeWidth="2"
                    />
                  </svg>
                  <img
                    src={foodService}
                    alt=""
                    className="absolute left-[9px] top-[15px] h-[72px] w-[72px] -rotate-[12deg] object-contain"
                  />
                  <svg
                    viewBox="0 0 90 108"
                    className="absolute inset-0 h-full w-full"
                  >
                    <path
                      d="M13 41Q42 65 78 49"
                      fill="none"
                      stroke="#00c884"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path d="m23 48-5 14 12-4" fill="#00c884" />
                  </svg>
                  <span className="absolute left-[34px] top-[34px] h-[4px] w-[4px] rounded-full bg-[#58142a]" />
                  <span className="absolute left-[48px] top-[33px] h-[4px] w-[4px] rounded-full bg-[#58142a]" />
                </span>
              </div>

              <div className="no-scrollbar mt-[16px] flex gap-[15px] overflow-x-auto px-[16px]">
                {[
                  {
                    t: "Get\n70% OFF",
                    body: (
                      <div className="relative flex h-[111px] items-start justify-center gap-[3px] pt-[7px] before:absolute before:bottom-[-8px] before:left-[-7px] before:h-[37px] before:w-[140px] before:rounded-[50%] before:border-2 before:border-[#d84e72] before:bg-[radial-gradient(ellipse,#9f183a,#36000c)] before:content-['']">
                        {[0, 1].map((ticket) => (
                          <span
                            key={ticket}
                            className={`relative z-10 grid h-[85px] w-[51px] place-items-center text-[40px] font-black text-[#38000f] drop-shadow-[2px_4px_3px_rgba(0,0,0,.2)] ${
                              ticket === 0 ? "-rotate-[12deg]" : "rotate-[10deg]"
                            }`}
                          >
                            <svg aria-hidden="true" viewBox="0 0 54 90" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full"><path d={`M3 3${"q3 -4.2 6 0".repeat(8)}${"q4.2 3 0 6".repeat(14)}${"q-3 4.2 -6 0".repeat(8)}${"q-4.2 -3 0 -6".repeat(14)}Z`} fill="#ffdf00" /></svg>
                            <span className="absolute inset-x-0 bottom-[17px] border-b-2 border-dashed border-[#986800]" />
                            %
                          </span>
                        ))}
                      </div>
                    ),
                  },
                  {
                    t: "Get A\nFree Treat",
                    body: (
                      <div className="relative h-[116px] before:absolute before:inset-x-[-8px] before:bottom-[-3px] before:h-[35px] before:rounded-[50%] before:border-2 before:border-[#bd496c] before:bg-[radial-gradient(ellipse,#75142d,#30000a)] before:content-['']">
                        <img
                          src={`${A}/img/chocolate-cupcake-cutout.png`}
                          alt="Chocolate cupcake"
                          className="absolute -left-[5px] top-[9px] h-[90px] w-[77px] -rotate-6 object-contain"
                        />
                        <img
                          src={`${A}/img/chocolate-cupcake-cutout.png`}
                          alt="Chocolate cupcake"
                          className="absolute -right-[9px] top-[7px] h-[90px] w-[77px] rotate-6 object-contain"
                        />
                        <img
                          src={`${A}/img/cupcake-cutout.png`}
                          alt="Vanilla cupcake"
                          className="absolute bottom-[-1px] left-[26px] h-[100px] w-[84px] object-contain [filter:saturate(.25)]"
                        />
                      </div>
                    ),
                  },
                  {
                    t: "Binge-Worthy\nOffers",
                    body: (
                      <div className="mx-auto grid h-[112px] w-[134px] place-items-center rounded-t-[70px] border-[3px] border-[#edc400] bg-[radial-gradient(ellipse_at_50%_80%,#ae1232,#62071e)] text-center leading-none shadow-[inset_0_0_0_2px_#e98b38,0_0_6px_#a80c56]">
                        <div>
                          <div className="text-[16px] font-bold">FLAT</div>
                          <div className="text-[45px] font-extrabold tracking-[-2px] text-[#ffe200] [text-shadow:2px_3px_0_#4b0013]">
                            ₹150
                          </div>
                          <div className="mt-[4px] text-[16px] font-bold">
                            OFF
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    t: "Dishes\nFrom",
                    body: (
                      <div className="relative pb-[22px] text-[38px] font-black italic leading-[33px] [-webkit-text-stroke:5px_#4b002d] [paint-order:stroke_fill] [text-shadow:3px_4px_0_#4b002d]">
                        PREMIUM
                        <br />
                        CRAZE
                        <span className="absolute bottom-[3px] left-[5px] text-[20px] not-italic tracking-[12px] text-[#ffe700] [-webkit-text-stroke:0]">
                          ••••
                        </span>
                      </div>
                    ),
                  },
                ].map((c, i) => (
                  <article
                    key={i}
                    className="flex h-[188px] w-[144px] shrink-0 flex-col justify-between overflow-hidden rounded-[16px] bg-[radial-gradient(ellipse_at_50%_0%,#fb299b,#ef178c_60%,#bd0656_100%)] pt-[21px] text-center shadow-[inset_-8px_0_10px_rgba(112,0,45,.2)]"
                  >
                    <p className="whitespace-pre-line px-[5px] text-[20px] font-medium leading-[24px]">
                      {c.t}
                    </p>
                    <div className="px-[3px]">{c.body}</div>
                  </article>
                ))}
              </div>
              <p className="mt-[14px] text-center text-[17px] font-bold leading-[24px] max-[480px]:text-[12px]">
                FREE DELIVERY WITH{" "}
                <span className="text-[23px] font-black tracking-[-1px] text-[#ff8a00] max-[480px]:text-[18px]">
                  one
                </span>{" "}
                ABOVE <s className="opacity-80">₹99</s>{" "}
                <span className="text-[#ff9900]">₹49</span>
              </p>
            </div>
          </section>

          {/* Segment */}
          <div className="mx-5 mt-[30px] flex h-[54px] rounded-full bg-[#f3f2f5] p-[5px] shadow-[inset_3px_0_7px_rgba(30,35,55,.06)]">
            {["TOP RATED", "FOOD IN 15 MINS"].map((s, i) => (
              <button
                key={s}
                aria-pressed={seg === i}
                onClick={() => setSeg(i)}
                className={`flex-1 rounded-full text-[16px] font-extrabold transition ${
                  seg === i
                    ? "bg-white text-[#ff5200] shadow-[0_1px_12px_rgba(30,35,55,.09)]"
                    : "text-[#505055]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Restaurants */}
          <div className="no-scrollbar mt-[26px] flex gap-[16px] overflow-x-auto px-5">
            {restaurants.map((r, i) => (
              <article key={r.name} className="w-[172px] shrink-0">
                <div className="relative h-[200px] overflow-hidden rounded-[16px] bg-[#ddd]">
                  <img
                    src={r.img}
                    alt={r.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <span className="absolute left-[8px] top-[7px] grid h-[33px] w-[59px] place-items-center rounded-full bg-[#fff1e7] leading-none">
                    <One className="text-[27px]" artwork={i === 0} />
                  </span>
                  <button
                    onClick={() =>
                      setFavs((f) =>
                        f.includes(i) ? f.filter((x) => x !== i) : [...f, i],
                      )
                    }
                    className="absolute right-2 top-2 text-white"
                  >
                    <Heart
                      size={28}
                      fill={favs.includes(i) ? "#ff5200" : "rgba(0,0,0,.15)"}
                      strokeWidth={1.8}
                    />
                  </button>
                  {r.offer && (
                    <p className="absolute bottom-[11px] left-[12px] whitespace-pre-line text-[20px] font-extrabold leading-[25px] text-white">
                      {r.offer}
                    </p>
                  )}
                  {r.ad && (
                    <span className="absolute bottom-[11px] right-[12px] text-[14px] font-semibold text-white/70">
                      1AD
                    </span>
                  )}
                </div>
                <h3 className="mt-[12px] text-[20px] font-bold leading-[25px] text-[#202125]">
                  {r.name}
                </h3>
                <p className="flex items-center gap-[4px] mt-[2px] whitespace-nowrap text-[18px] font-semibold leading-[24px] text-[#2b2b33]">
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#1ba672]">
                    <Star size={11} fill="white" className="text-white" />
                  </span>
                  {r.rating} • 15-20 mins
                </p>
                <p className="mt-[3px] text-[18px] leading-[23px] text-[#808185]">
                  {r.cat}
                </p>
              </article>
            ))}
          </div>

          {/* What's on your mind */}
          <h2 className="mt-[32px] bg-gradient-to-b from-[#f4f4f4] to-white px-[22px] text-[22px] font-bold leading-[27px] text-[#1b1b22]">
            What's on your mind?
          </h2>
          <div
            ref={dishRef}
            className={`no-scrollbar sticky top-[108px] z-20 mt-[22px] flex gap-[18px] overflow-x-auto bg-white px-[22px] pb-[10px] ${
              dishPinned ? "pt-[26px]" : "pt-[8px]"
            }`}
          >
            {mind.map((m) => (
              <button
                key={m.l}
                className="flex w-[106px] shrink-0 flex-col items-center"
              >
                <span className="flex h-[88px] w-[106px] items-center justify-center">
                  <img
                    src={`${A}/img/dishes/${m.l.toLowerCase()}-cutout.png`}
                    alt={m.l}
                    className="h-[85px] w-[108px] object-contain"
                  />
                </span>
                <span className="mt-[12px] text-[20px] leading-[25px] text-[#626266]">
                  {m.l}
                </span>
              </button>
            ))}
          </div>

          {/* Coffee banner */}
          <div className="no-scrollbar mt-[27px] flex gap-[24px] overflow-x-auto px-[24px]">
            <article className="relative h-[188px] w-[526px] shrink-0 overflow-hidden rounded-[20px] border border-[#e0e6ef] bg-[#417ccc] p-[24px] text-white">
              <h3 className="relative z-10 text-[28px] font-extrabold leading-[34px]">
                Get up to 60% OFF<sup className="text-[17px]">*</sup>
              </h3>
              <p className="relative z-10 mt-[4px] w-[275px] text-[21px] leading-[27px] text-white/95">
                Enjoy coffee delights from
                <br />
                top brands
              </p>
              <button className="relative z-10 mt-[14px] h-[40px] rounded-full bg-white px-[17px] text-[16px] font-extrabold text-[#3979c5]">
                ORDER NOW
              </button>
              <span className="absolute bottom-[6px] left-[37px] text-[7px]">
                *T&amp;C apply
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                className="absolute right-[-12px] top-[-15px] h-[90px] w-[90px] text-white/15"
              >
                <g fill="none" stroke="currentColor">
                  <path d="M50 50C0 10 10 0 50 50C40 0 60 0 50 50C90 0 100 10 50 50C100 40 100 60 50 50C100 90 90 100 50 50C60 100 40 100 50 50C10 100 0 90 50 50C0 60 0 40 50 50Z" />
                  <path d="M20 90 80 10M10 20l80 60" />
                </g>
              </svg>
              <div
                aria-label="Latte in a white cup and saucer"
                role="img"
                className="absolute right-[19px] top-[14px] h-[166px] w-[202px] drop-shadow-[0_7px_4px_rgba(0,0,0,.22)]"
              >
                <span className="absolute bottom-0 left-[4px] h-[67px] w-[195px] rounded-[50%] border-b-[5px] border-[#b2b8b7] bg-[radial-gradient(ellipse_at_50%_30%,#fff_0%,#f0f3f1_50%,#bcc5c2_100%)]" />
                <span className="absolute right-0 top-[52px] h-[65px] w-[50px] -rotate-12 rounded-[50%] border-[12px] border-[#e1e8e7] bg-transparent" />
                <span className="absolute bottom-[21px] left-[22px] h-[93px] w-[146px] rounded-b-[65px] bg-[linear-gradient(100deg,#fff_0%,#f0f4f2_45%,#bdc8c4_100%)]" />
                <span className="absolute left-[22px] top-0 h-[86px] w-[146px] overflow-hidden rounded-[50%] border-[5px] border-[#eaf0e9] bg-[#b7834c]">
                  <img
                    src={`${A}/img/latte-surface.jpg`}
                    alt=""
                    className="h-full w-full object-fill"
                  />
                </span>
              </div>
            </article>
            <article className="h-[188px] w-[300px] shrink-0 rounded-[14px] bg-[#0e1f1c]" />
          </div>

          {/* 99 store */}
          <section className="mx-[18px] mt-[32px] overflow-hidden rounded-[38px] border border-[#e2f0f7] bg-gradient-to-b from-[#f5fbff] to-[#f5fafc] pt-[28px] pb-[32px]">
            <div className="flex h-[43px] items-center gap-[5px] px-[24px]">
              <span className="relative isolate grid h-[43px] w-[45px] -rotate-12 place-items-center text-[30px] font-black leading-none tracking-[-3px] text-[#ffcf00]">
                <svg aria-hidden="true" viewBox="0 0 54 52" className="absolute -left-[4px] -top-[3px] -z-10 h-[49px] w-[53px] text-[#102432]">
                  <path d="M9 11 34 6M7 18 44 10M8 26 46 17M7 34 43 25M12 42 40 32M22 45 37 39" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
                  <path d="m10 8 22-4M5 23l39-10M13 45l22-12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="relative -translate-x-[1px]">99</span>
              </span>
              <span className="text-[36px] leading-none text-[#ffcf00] [font-family:'Lilita_One',cursive] [-webkit-text-stroke:3px_#102432] [paint-order:stroke_fill] [text-shadow:0_3px_0_#102432]">
                store
              </span>
            </div>
            <div className="mt-[13px] flex items-center justify-between gap-2 px-[24px]">
              <p className="flex items-center gap-[6px] whitespace-nowrap text-[clamp(12px,3.38vw,20px)] font-medium leading-[25px] text-[#15212e]">
                <span className="grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full bg-[#102432]">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </span>
                <span>
                  <span className="font-semibold text-[#df951b]">
                    Meals at ₹99
                  </span>{" "}
                  + Free Delivery
                </span>
              </p>
              <button className="flex shrink-0 items-center text-[clamp(12px,3.38vw,20px)] font-bold leading-[25px] text-[#087b9c]">
                View All <ChevronRight size={22} strokeWidth={3} />
              </button>
            </div>
            <div className="no-scrollbar mt-[26px] flex gap-[22px] overflow-x-auto px-[14px]">
              {store99.map((d, i) => (
                <article key={i} className="w-[130px] shrink-0">
                  <div className="relative h-[130px] overflow-hidden rounded-[15px]">
                    <img
                      src={
                        i === 0 ? u("photo-1694849789325-914b71ab4075") : d.img
                      }
                      alt={d.n}
                      className="h-full w-full object-cover"
                    />
                    <button
                      aria-label={`Add ${d.n} from ${d.s}`}
                      className="absolute bottom-[7px] right-[7px] grid h-[44px] w-[44px] place-items-center rounded-[10px] border border-[#e3e5e4] bg-white shadow-sm"
                    >
                      <Plus
                        size={22}
                        strokeWidth={4}
                        className="text-[#1ba672]"
                      />
                    </button>
                  </div>
                  <h4 className="mt-[10px] text-[20px] font-normal leading-[22px] text-[#242833]">
                    <span className="mr-1 inline-grid h-[16px] w-[16px] place-items-center rounded-[3px] border-[1.5px] border-[#198c70] align-[-1px]">
                      <span className="h-[8px] w-[8px] rounded-full bg-[#198c70]" />
                    </span>
                    {d.n}
                  </h4>
                  <p className="mt-[7px] flex items-center gap-[8px] text-[17px] leading-[25px]">
                    <s className="text-[#252b31]">₹{d.old}</s>
                    <span className="-skew-x-6 bg-[#ffda00] px-[4px] font-medium shadow-[1px_2px_0_#222]">
                      ₹{d.p}
                    </span>
                  </p>
                  <p className="mt-[12px] inline-flex items-center gap-[3px] rounded-[5px] bg-[#def6eb] px-[5px] text-[16px] font-semibold leading-[22px] text-[#1ba07d]">
                    <Star size={13} fill="currentColor" />
                    {d.r}
                  </p>
                  <div className="mt-2 h-px w-4 bg-gray-300" />
                  <p className="mt-[8px] whitespace-nowrap text-[15px] leading-[20px] text-[#8b9095]">
                    {d.s}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Filters */}
          <div className="no-scrollbar mt-[24px] flex gap-[12px] overflow-x-auto px-[22px] pb-[3px] [&>button]:h-[44px] [&>button]:shrink-0 [&>button]:rounded-[12px] [&>button]:border [&>button]:border-[#d8d8da] [&>button]:bg-white [&>button]:text-[19px] [&>button]:text-[#424245] [&>button]:shadow-[0_2px_3px_rgba(0,0,0,.06)]">
            <button className="flex w-[108px] items-center justify-center gap-[10px]">
              Filter <SlidersHorizontal size={21} />
            </button>
            <button className="flex w-[123px] items-center justify-center gap-[10px]">
              Sort By <ChevronDown size={21} />
            </button>
            <button className="flex w-[154px] items-center justify-center gap-[9px]">
              <span className="text-[23px] font-black leading-none tracking-[-1px] text-black">
                one
              </span>{" "}
              Extra off
            </button>
            <button className="flex w-[138px] items-center justify-center gap-[9px]">
              <span className="grid h-[21px] w-[21px] -rotate-12 place-items-center rounded-[6px] bg-[#102432] text-[14px] font-black tracking-[-1px] text-[#ffcf00]">
                99
              </span>{" "}
              99 Store
            </button>
          </div>

          <section className="mt-[32px] px-[22px]">
            <h2 className="text-[22px] font-bold leading-[27px] text-[#2b2b33]">
              Top 740 restaurants to explore
            </h2>
            <p className="mt-[4px] text-[20px] leading-[25px] text-[#65666a]">
              Featured Restaurants
            </p>
            <div className="mt-[26px] flex flex-col gap-[34px]">
              {featured.map((f, i) => (
                <article
                  key={f.name}
                  className="overflow-hidden rounded-[28px] bg-white shadow-[0_7px_23px_rgba(30,35,40,.07)]"
                >
                  <div className="relative h-[288px]">
                    <img
                      src={f.img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-1/2 top-[18px] flex -translate-x-1/2 gap-[5px]">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <span
                          key={d}
                          className={`h-[7px] rounded-full bg-white ${
                            d === 0 ? "w-[14px]" : "w-[7px] opacity-80"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        setFavs((v) =>
                          v.includes(100 + i)
                            ? v.filter((x) => x !== 100 + i)
                            : [...v, 100 + i],
                        )
                      }
                      className="absolute right-[44px] top-[18px] text-white"
                    >
                      <Heart
                        size={30}
                        strokeWidth={1.8}
                        fill={
                          favs.includes(100 + i) ? "#ff5200" : "rgba(0,0,0,.2)"
                        }
                      />
                    </button>
                    <MoreVertical
                      size={24}
                      className="absolute right-[10px] top-[20px] text-white"
                    />
                    <p className="absolute bottom-[12px] left-[18px] flex items-center gap-[6px] text-[18px] font-medium text-white">
                      <span className="grid h-[17px] w-[17px] place-items-center rounded-full bg-[#ff5200] text-[10px] font-bold">
                        %
                      </span>
                      {f.offer}
                    </p>
                    <div className={f.name === "Theobroma" ? "absolute bottom-[-29px] right-0 z-10 isolate w-[120px] pt-[14px] pb-[9px] text-center before:absolute before:inset-0 before:-z-10 before:origin-top-left before:rounded-tl-[18px] before:bg-white before:[transform:skewY(-3deg)] before:content-['']" : "absolute bottom-[-29px] right-0 z-10 w-[124px] rounded-tl-[18px] bg-white pt-[14px] pb-[9px] text-center shadow-[-3px_-2px_8px_rgba(0,0,0,.04)]"}>
                      <span className={f.name === "Theobroma" ? "absolute -top-[17px] right-[6px] grid h-[32px] w-[32px] place-items-center rounded-full border-[4px] border-white bg-[#ff6b43]" : "absolute -top-[14px] right-[6px] grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-white bg-[#ff6b43]"}>
                        <Flame
                          size={17}
                          fill="white"
                          stroke="white"
                          strokeWidth={1.5}
                        />
                      </span>
                      <p className="text-[18px] font-bold leading-none text-[#2b2b33]">
                        {f.time}
                      </p>
                      <p className="mx-[12px] mt-[6px] border-t border-[#ff9a77] pt-[5px] text-[13px] font-bold leading-[16px] text-[#ff5200]">
                        FREE DELIVERY
                      </p>
                    </div>
                  </div>
                  <div className={f.name === "Theobroma" ? "px-[20px] pb-[15px] pt-[16px]" : "px-[20px] pb-[22px] pt-[16px]"}>
                    {f.tag === "veg" ? (
                      <p className="flex items-center gap-1 text-[16px] font-bold leading-[20px] text-[#198567]">
                        <Leaf size={15} fill="currentColor" />
                        Pure Veg
                      </p>
                    ) : (
                      <p className="flex items-center gap-[6px] text-[16px] font-bold leading-[20px] text-[#2b2b33]">
                        <Award size={17} fill="#ffd148" stroke="#ba8420" />
                        Best in Cakes &amp; Desserts{" "}
                        <span className="ml-1 text-[20px] font-normal text-black underline decoration-[#ec6c37] decoration-1 underline-offset-2 [font-family:Georgia,serif]">
                          gourmet
                        </span>
                      </p>
                    )}
                    <h3 className={`text-[27px] font-extrabold leading-[30px] text-[#1b1b22] ${f.name === "Theobroma" ? "mt-[2px]" : ""}`}>
                      {f.name}
                    </h3>
                    <p className={`flex items-center gap-[6px] text-[20px] leading-[24px] text-[#898b8f] ${f.name === "Theobroma" ? "mt-[4px]" : "mt-[1px]"}`}>
                      <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-[#1ba672]">
                        <Star size={12} fill="white" className="text-white" />
                      </span>
                      {f.meta}
                    </p>
                    <p className={`text-[20px] leading-[24px] text-[#898b8f] ${f.name === "Theobroma" ? "mt-[5px]" : "mt-[3px]"}`}>
                      {f.cuisine}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Sticky header on scroll */}
      <div
        className={`absolute left-1/2 top-0 z-30 w-full max-w-[592px] -translate-x-1/2 bg-white transition-opacity ${
          stuck ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transitionDuration: `${p.headerMs}ms`, transitionTimingFunction: p.easing }}
      >
        {/* the device draws its status bar here */}
        <div className="h-[62px]" />
        <div className="no-scrollbar flex h-[46px] overflow-x-auto border-b border-[#dedee1] px-[20px]">
          {chips.map((c, i) => {
            return (
              <button
                key={c.label}
                onClick={() => setChip(i)}
                className={`relative flex shrink-0 items-start justify-center gap-[5px] pt-[7px] text-[16px] ${
                  i === 0
                    ? "w-[100px]"
                    : i === 1
                      ? "w-[119px]"
                      : i === 2
                        ? "w-[127px]"
                        : i === 3
                          ? "w-[108px]"
                          : "w-[124px]"
                } ${
                  chip === i ? "font-bold text-[#ff5200]" : "text-[#96989a]"
                } ${
                  i
                    ? "before:absolute before:left-0 before:top-[7px] before:h-[18px] before:w-px before:bg-[#f0f0f0]"
                    : ""
                }`}
              >
                <CategoryIcon index={i} /> {c.label}
                {chip === i && (
                  <span className="absolute inset-x-0 bottom-0 h-[4px] rounded-t bg-gradient-to-r from-[#ff7a1a] to-[#ff5200]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom nav — 34px taller at the bottom, clear of the device's home indicator */}
      <nav
        className={`absolute bottom-0 left-1/2 z-40 grid h-[116px] w-full max-w-[592px] -translate-x-1/2 grid-cols-5 border-t border-[#f4f4f4] bg-white pt-[12px] pb-[34px] shadow-[0_-3px_12px_rgba(0,0,0,.025)] transition-transform ${
          stuck ? "pointer-events-none translate-y-full" : "translate-y-0"
        }`}
        style={{ transitionDuration: `${p.navMs}ms`, transitionTimingFunction: p.easing }}
      >
        {[
          { l: "Food" },
          { l: "Bolt", b: "15 MIN" },
          { l: "99 store" },
          { l: "EatRight", b: "NEW" },
          { l: "Reorder" },
        ].map((n, i) => (
          <button
            key={n.l}
            aria-pressed={nav === i}
            onClick={() => setNav(i)}
            className={`relative flex flex-col items-center gap-[6px] text-[14px] leading-[20px] ${
              nav === i ? "text-[#ff5200] font-bold" : "text-[#999b9e] font-semibold"
            }`}
          >
            <span className="grid h-[36px] w-[40px] place-items-center"><NavIcon name={n.l} /></span>
            {n.b && (
              <span className={`absolute top-[22px] grid h-[16px] place-items-center rounded-full border border-white bg-[#ff3049] px-[4px] text-[9px] font-extrabold leading-none text-white ${n.b === "15 MIN" ? "min-w-[36px]" : "min-w-[29px]"}`}>
                {n.b}
              </span>
            )}
            {n.l}
          </button>
        ))}
      </nav>
    </div>
  )
}
