// Search Bar — a Swiggy App component on its own (see ../_swiggy).
import { useState } from "react"
import { SearchBar } from "../_swiggy/SearchBar"
import { Showcase } from "../_swiggy/Showcase"
import { useCycle, useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function SearchBarDemo({ p = defaults }: { p?: Params }) {
  const [hint, setHint] = useState(0)
  const [veg, setVeg] = useState(false)
  useCycle(p.autoplay, p.hintMs, () => setHint((h) => h + 1))
  useCycle(p.autoplay, p.hintMs * 2, () => setVeg((v) => !v))
  return (
    <Showcase on="panel" style={useMotionVars(p)}>
      <div className="mx-auto max-w-[1200px] px-4">
        <SearchBar veg={veg} onVeg={setVeg} hint={hint} />
      </div>
    </Showcase>
  )
}
