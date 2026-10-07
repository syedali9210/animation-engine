// Category Tabs — a Swiggy App component on its own (see ../_swiggy).
import { useState } from "react"
import { CategoryTabs } from "../_swiggy/CategoryTabs"
import { Showcase } from "../_swiggy/Showcase"
import { useCycle, useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function CategoryTabsDemo({ p = defaults }: { p?: Params }) {
  const [i, setI] = useState(0)
  useCycle(p.autoplay, p.cycleMs, () => setI((x) => (x + 1) % 5))
  return (
    <Showcase on="grey" style={useMotionVars(p)}>
      <div className="mx-auto max-w-[1200px] space-y-4 px-4">
        <div className="rounded-[20px] bg-[linear-gradient(180deg,#4b011d,#2c0011)] px-2 pt-2">
          <CategoryTabs tone="dark" value={i} onChange={setI} />
        </div>
        <div className="rounded-[20px] bg-white px-2 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
          <CategoryTabs tone="light" value={i} onChange={setI} />
        </div>
      </div>
    </Showcase>
  )
}
