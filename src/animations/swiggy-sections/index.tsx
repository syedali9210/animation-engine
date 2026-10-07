// Section Selector — a Swiggy App component on its own (see ../_swiggy).
import { useState } from "react"
import { SectionSelector } from "../_swiggy/SectionSelector"
import { Showcase } from "../_swiggy/Showcase"
import { useCycle, useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function SectionSelectorDemo({ p = defaults }: { p?: Params }) {
  const [i, setI] = useState(0)
  useCycle(p.autoplay, p.cycleMs, () => setI((x) => (x + 1) % 4))
  return (
    <Showcase on="hero" style={useMotionVars(p)}>
      <SectionSelector value={i} onChange={setI} />
      {/* the panel the lit tab flows into */}
      <div className="-mt-px h-14 rounded-b-[28px] bg-[linear-gradient(180deg,#82012b,#50011d)]" />
    </Showcase>
  )
}
