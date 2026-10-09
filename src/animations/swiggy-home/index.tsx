// Swiggy Home — the whole screen, put together from the Swiggy App components in ../_swiggy.
// Order, broad to narrow: the hero (where, which section, search, offers), browse by dish, top-rated restaurants,
// a promo, 99 store, then the full restaurant feed with its filters pinned under the header.
// It scrolls its own container (so it works as a screen in a device), leaves room for the device's status bar and
// home indicator, tells the device which status-bar ink it needs, and runs a demo scroll while nobody scrolls it.
import { useEffect, useRef, useState } from "react"
import { BottomNav } from "../_swiggy/BottomNav"
import { CategoryTabs } from "../_swiggy/CategoryTabs"
import { DishRow } from "../_swiggy/DishRow"
import { FeedCard } from "../_swiggy/FeedCard"
import { FestBanner } from "../_swiggy/FestBanner"
import { FilterBar } from "../_swiggy/FilterBar"
import { LocationHeader } from "../_swiggy/LocationHeader"
import { OfferCards } from "../_swiggy/OfferCards"
import { PromoBanner } from "../_swiggy/PromoBanner"
import { RestaurantSection } from "../_swiggy/RestaurantCards"
import { SearchBar } from "../_swiggy/SearchBar"
import { SectionSelector } from "../_swiggy/SectionSelector"
import { Store99 } from "../_swiggy/Store99"
import { FEATURED } from "../_swiggy/data"
import { useMotionVars } from "../_swiggy/motion"
import { SectionHeader, WRAP } from "../_swiggy/ui"
import { params as defaults, type Params } from "./params"

const SAFE = 62 // room for the device's status bar
const TABS = 44 // the category tabs in the sticky header

export default function SwiggyHome({ p = defaults }: { p?: Params }) {
  const [section, setSection] = useState(0)
  const [category, setCategory] = useState(0)
  const [veg, setVeg] = useState(false)
  const [seg, setSeg] = useState(0)
  const [saved, setSaved] = useState<string[]>([])
  const [nav, setNav] = useState(0)
  const save = (key: string) => setSaved((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]))
  const scroller = useRef<HTMLDivElement>(null)
  const heroTabs = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  // the white header takes over once the hero's category tabs pass under the status bar
  useEffect(() => {
    const el = scroller.current!
    const on = () => setStuck(heroTabs.current!.getBoundingClientRect().top < SAFE - 18)
    on()
    el.addEventListener("scroll", on, { passive: true })
    addEventListener("resize", on) // a foldable opening or closing moves everything
    return () => {
      el.removeEventListener("scroll", on)
      removeEventListener("resize", on)
    }
  }, [])

  // the status bar sits on the maroon hero until the white header takes over (light ink, then dark); the home
  // indicator is always over white
  useEffect(() => {
    window.engine?.report("status", { top: stuck ? "dark" : "light", bottom: "dark" })
  }, [stuck])

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
    <div className="swiggy absolute inset-0 overflow-hidden bg-white" style={useMotionVars(p)}>
      <div ref={scroller} className="no-scrollbar h-full overflow-y-auto overscroll-contain">
        <header className="overflow-hidden rounded-b-[28px] bg-[linear-gradient(115deg,#3b0315,#2c0010)] text-white" style={{ paddingTop: SAFE }}>
          <div className="mx-auto max-w-[1200px]">
            <div data-component="Location">
              <LocationHeader />
            </div>
            <div data-component="Sections" className="mt-3">
              <SectionSelector value={section} onChange={setSection} />
            </div>
          </div>
          <div className="-mt-px rounded-b-[28px] bg-[linear-gradient(180deg,#82012b_0%,#50011d_23%,#4b011d_37%,#3f0118_58%,#2c0011_95%,#22000d_100%)] pb-4 pt-5">
            <div data-component="Search" className={WRAP}>
              <SearchBar veg={veg} onVeg={setVeg} />
            </div>
            <div data-component="Category tabs" ref={heroTabs} className={`${WRAP} mt-4`}>
              <CategoryTabs tone="dark" value={category} onChange={setCategory} />
            </div>
            <div data-component="Fest banner" className="mt-4">
              <FestBanner />
            </div>
            <div data-component="Offer cards" className="mt-3">
              <OfferCards />
            </div>
            <p data-component="Delivery offer" className="mt-3.5 px-4 text-center text-[12px] font-bold leading-[20px]">
              FREE DELIVERY WITH <span className="text-[17px] font-black tracking-[-1px] text-[#ff8a00]">one</span> ABOVE <s className="opacity-80">₹99</s>{" "}
              <span className="text-[#ff9900]">₹49</span>
            </p>
          </div>
        </header>

        <main className="pb-[120px]">
          <section data-component="Dish row" className={`${WRAP} mt-7`}>
            <DishRow />
          </section>
          <section data-component="Top restaurants" aria-label="Top restaurants" className="mt-8">
            <RestaurantSection seg={seg} onSeg={setSeg} favs={saved} onFav={save} />
          </section>
          <div data-component="Promo" className={`${WRAP} mt-8`}>
            <PromoBanner />
          </div>
          <div data-component="99 Store" className={`${WRAP} mt-8`}>
            <Store99 />
          </div>
          <section data-component="Restaurant feed" className="mt-8">
            <div className={WRAP}>
              <SectionHeader title="Top 740 restaurants to explore" subtitle="Featured restaurants" />
            </div>
            <div className="sticky z-20 bg-white" style={{ top: SAFE + TABS }}>
              <div className="mx-auto max-w-[1200px]">
                <FilterBar />
              </div>
            </div>
            <div className={`${WRAP} mt-2 grid gap-6 md:grid-cols-2 xl:grid-cols-3`}>
              {FEATURED.map((f) => (
                <FeedCard key={f.name} f={f} fav={saved.includes(`feed:${f.name}`)} onFav={() => save(`feed:${f.name}`)} />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* the sticky header: the device's status bar sits on its white top */}
      <div
        className={`absolute inset-x-0 top-0 z-30 bg-white transition-opacity ${stuck ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ paddingTop: SAFE, transitionDuration: `${p.headerMs}ms`, transitionTimingFunction: p.easing }}
      >
        <div className={WRAP}>
          <CategoryTabs tone="light" value={category} onChange={setCategory} />
        </div>
      </div>

      <div data-component="Tab bar" className="absolute inset-x-0 bottom-0 z-40">
        <BottomNav value={nav} onChange={setNav} hidden={stuck} inset={34} ms={p.navMs} ease={p.easing} />
      </div>
    </div>
  )
}
