// Restaurant Cards — a Swiggy App component on its own (see ../_swiggy).
import { useEffect, useState } from "react"
import { RestaurantSection } from "../_swiggy/RestaurantCards"
import { RESTAURANTS } from "../_swiggy/data"
import { Showcase } from "../_swiggy/Showcase"
import { useCycle, useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function RestaurantCardsDemo({ p = defaults }: { p?: Params }) {
  const [seg, setSeg] = useState(0)
  const [saved, setSaved] = useState<string[]>([])
  const save = (name: string) => setSaved((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]))
  const [tick, setTick] = useState(0)
  useCycle(p.autoplay, p.cycleMs, () => setTick((t) => t + 1))
  useEffect(() => {
    if (!tick) return
    if (tick % 2) setSeg((s) => 1 - s)
    else save(RESTAURANTS[0].name)
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Showcase style={useMotionVars(p)}>
      <RestaurantSection seg={seg} onSeg={setSeg} favs={saved} onFav={save} />
    </Showcase>
  )
}
