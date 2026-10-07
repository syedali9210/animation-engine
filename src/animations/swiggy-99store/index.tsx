// 99 Store Cards — a Swiggy App component on its own (see ../_swiggy).
import { Store99 } from "../_swiggy/Store99"
import { Showcase } from "../_swiggy/Showcase"
import { useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function Store99Demo({ p = defaults }: { p?: Params }) {
  return (
    <Showcase style={useMotionVars(p)}>
      <div className="mx-auto max-w-[1200px] px-4">
        <Store99 />
      </div>
    </Showcase>
  )
}
