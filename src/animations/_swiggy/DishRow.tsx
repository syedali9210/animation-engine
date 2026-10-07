// Swiggy App — "What's on your mind?": browse by dish. Three across on phones (all six fit, two rows), six from md.
import { DISHES } from "./data"
import { PRESS } from "./motion"
import { SectionHeader } from "./ui"

export function DishRow() {
  return (
    <div>
      <SectionHeader title="What's on your mind?" />
      <div className="grid grid-cols-3 gap-x-3 gap-y-4 md:grid-cols-6">
        {DISHES.map((d) => (
          <button key={d.name} type="button" className={`flex flex-col items-center ${PRESS}`}>
            <img src={d.img} alt="" className="aspect-[108/85] w-full max-w-[120px] object-contain" />
            <span className="mt-1.5 text-[14px] font-medium leading-[18px] text-[#3d3e44]">{d.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
