// Restaurant Feed — a Swiggy App component on its own (see ../_swiggy).
import { useState } from "react"
import { FeedCard } from "../_swiggy/FeedCard"
import { FilterBar } from "../_swiggy/FilterBar"
import { FEATURED } from "../_swiggy/data"
import { SectionHeader } from "../_swiggy/ui"
import { Showcase } from "../_swiggy/Showcase"
import { useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function RestaurantFeedDemo({ p = defaults }: { p?: Params }) {
  const [saved, setSaved] = useState(false)
  return (
    <Showcase style={useMotionVars(p)}>
      <div className="mx-auto max-w-[480px]">
        <div className="px-4">
          <SectionHeader title="Top 740 restaurants to explore" subtitle="Featured restaurants" />
        </div>
        <FilterBar />
        <div className="mt-2 px-4">
          <FeedCard f={FEATURED[0]} fav={saved} onFav={() => setSaved((s) => !s)} />
        </div>
      </div>
    </Showcase>
  )
}
