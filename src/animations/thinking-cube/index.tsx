import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import ThinkingCube from "./ThinkingCube";
import { params as defaults, type Params } from "./params";
import "./thinking-cube.css";

// The demo card from card animation/ThinkingCubeDemo, without the shadcn Card/Button wrappers.
export default function ThinkingCubeDemo({ p = defaults }: { p?: Params }) {
  const [run, setRun] = useState(0);
  // replay on a loop so the assemble -> solve story keeps playing
  useEffect(() => {
    if (!p.loop) return;
    const total = p.coreHoldMs + 26 * p.staggerMs + p.settleMs + p.moves * (p.turnMs + p.turnGapMs + 40) + p.restMs;
    const t = setTimeout(() => setRun((r) => r + 1), total);
    return () => clearTimeout(t);
  }, [p, run]);

  return (
    <div className="w-full max-w-lg rounded-2xl bg-card text-card-foreground shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between border-b px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Thinking</p>
          <p className="text-xs text-muted-foreground">Assembling, then solving.</p>
        </div>
        <button onClick={() => setRun((r) => r + 1)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Run again">
          <RotateCcw className="size-4" />
        </button>
      </div>
      <div className="px-5 py-4">
        {/* remounting on `run` is the reset — no teardown logic to get wrong */}
        <ThinkingCube key={run} seed={p.seed + run} p={p} />
      </div>
    </div>
  );
}
