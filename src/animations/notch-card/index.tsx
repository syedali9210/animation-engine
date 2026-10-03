import DynamicInfoCard from "./DynamicInfoCard";
import { params as defaults, type Params } from "./params";

// Embedded mode is `absolute top-0` against the nearest positioned ancestor — this gives it a
// relative box with room below to expand into.
export default function NotchCard({ p = defaults }: { p?: Params }) {
  return (
    <div className="relative min-h-[220px] w-full">
      <DynamicInfoCard variant="embedded" p={p} />
    </div>
  );
}
