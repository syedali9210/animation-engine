// Dish Row — a Swiggy App component on its own (see ../_swiggy).
import { DishRow } from "../_swiggy/DishRow"
import { Showcase } from "../_swiggy/Showcase"
import { useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function DishRowDemo({ p = defaults }: { p?: Params }) {
  return (
    <Showcase style={useMotionVars(p)}>
      <div className="mx-auto max-w-[1200px] px-4">
        <DishRow />
      </div>
    </Showcase>
  )
}
