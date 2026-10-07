// Bottom Nav — a Swiggy App component on its own (see ../_swiggy).
import { useEffect, useState } from "react"
import { BottomNav } from "../_swiggy/BottomNav"
import { Showcase } from "../_swiggy/Showcase"
import { useCycle } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function BottomNavDemo({ p = defaults }: { p?: Params }) {
  const [tick, setTick] = useState(0)
  const [tab, setTab] = useState(0)
  useCycle(p.autoplay, p.cycleMs, () => setTick((t) => t + 1))
  useEffect(() => {
    if (tick % 4 !== 3) setTab((t) => (tick ? (t + 1) % 5 : t))
  }, [tick])
  return (
    <Showcase on="grey" at="bottom">
      <BottomNav value={tab} onChange={setTab} hidden={p.autoplay && tick % 4 === 3} inset={34} ms={p.hideMs} ease={p.easing} />
    </Showcase>
  )
}
