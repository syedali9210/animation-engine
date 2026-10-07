// Swiggy App — ALL / STORE / OFFERS / BOLT / EATRIGHT. Dark on the maroon hero, light in the sticky header.
// Every tab fits the width (they share it by content, and the type steps down on narrow phones); the underline
// slides to the chosen tab by clipping one full-width bar, so its rounded ends never stretch.
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { Check, Heart, Tag, Zap } from "lucide-react"
import { CATEGORIES } from "./data"
import { SLIDE } from "./motion"

export function CategoryTabs({ value, onChange, tone = "dark" }: { value: number; onChange: (i: number) => void; tone?: "dark" | "light" }) {
  const box = useRef<HTMLDivElement>(null)
  const [bar, setBar] = useState<{ l: number; r: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current!
    const tabs = el.querySelectorAll<HTMLElement>("[role=tab]")
    const measure = () => {
      const t = tabs[value]
      setBar({ l: t.offsetLeft, r: el.clientWidth - t.offsetLeft - t.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure) // also catches the font arriving and reflowing the tabs
    ro.observe(el)
    tabs.forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [value])

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    const next = (value + step + CATEGORIES.length) % CATEGORIES.length
    onChange(next)
    e.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus()
  }

  const dark = tone === "dark"
  return (
    <div ref={box} role="tablist" aria-label="Categories" onKeyDown={keys} className={`relative flex h-[44px] border-b ${dark ? "border-white/20" : "border-[#dedee1]"}`}>
      {CATEGORIES.map((c, i) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={value === i}
          tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i)}
          className={`relative flex flex-auto items-center justify-center gap-1 px-1 text-[clamp(10.5px,3vw,12px)] font-semibold uppercase tracking-[0.02em] transition-colors duration-200 ${
            i ? `before:absolute before:left-0 before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 ${dark ? "before:bg-white/20" : "before:bg-[#e6e6e9]"}` : ""
          } ${value === i ? (dark ? "text-white" : "text-[#cc4200]") : dark ? "text-[#dac1cb]" : "text-[#6b6d73]"}`}
        >
          <CategoryIcon index={i} />
          {c}
        </button>
      ))}
      {bar && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 ${dark ? "h-[4px] bg-[#fff3f5]" : "h-[3px] bg-[#ff5200]"}`}
          style={{ clipPath: `inset(0 ${bar.r}px 0 ${bar.l}px round 3px)`, transition: `clip-path ${SLIDE}` }}
        />
      )}
    </div>
  )
}

function CategoryIcon({ index }: { index: number }) {
  if (index === 0)
    return (
      <span aria-hidden="true" className="grid h-[14px] w-[14px] shrink-0 grid-cols-2 gap-[2px] p-px">
        {[0, 1, 2, 3].map((dot) => (
          <span key={dot} className="rounded-full bg-current" />
        ))}
      </span>
    )
  if (index === 1)
    return (
      <span aria-hidden="true" className="inline-block -rotate-[15deg] text-[16px] font-extrabold leading-[14px] tracking-[-2px]">
        99
      </span>
    )
  if (index === 2) return <Tag aria-hidden="true" size={14} fill="currentColor" strokeWidth={0} className="shrink-0" />
  if (index === 3) return <Zap aria-hidden="true" size={15} fill="currentColor" strokeWidth={1} className="shrink-0" />
  return (
    <span aria-hidden="true" className="relative shrink-0">
      <Heart size={15} fill="currentColor" strokeWidth={0} />
      <Check size={9} strokeWidth={3} className="absolute left-[3px] top-[2px] text-[#5b233c]" />
    </span>
  )
}
