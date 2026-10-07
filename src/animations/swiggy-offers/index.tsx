// Offer Cards — a Swiggy App component on its own (see ../_swiggy).
import { OfferCards } from "../_swiggy/OfferCards"
import { Showcase } from "../_swiggy/Showcase"
import { useMotionVars } from "../_swiggy/motion"
import { params as defaults, type Params } from "./params"

export default function OfferCardsDemo({ p = defaults }: { p?: Params }) {
  return (
    <Showcase on="panel" style={useMotionVars(p)}>
      <OfferCards />
    </Showcase>
  )
}
