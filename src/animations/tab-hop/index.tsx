import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import PetBuddyTabHop from "./PetBuddyTabHop";
import { params as defaults, type Params } from "./params";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Small standalone tab strip hosting PetBuddyTabHop — the portfolio's own lives inside its
// design-system TabsList. Same contract: a rect (relative to this container) for the active tab.
export default function TabHop({ p = defaults }: { p?: Params }) {
  const tabs = p.tabs.split(",").map((t) => t.trim()).filter(Boolean);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const btn = btnRefs.current[active];
    if (!btn) return;
    setRect({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
  }, [active, p.tabs]);

  // hands-free demo: hop to the next tab every few seconds
  useLayoutEffect(() => {
    if (!p.autoplay) return;
    const t = setInterval(() => setActive((i) => (i + 1) % tabs.length), p.intervalMs);
    return () => clearInterval(t);
  }, [p.autoplay, p.intervalMs, tabs.length]);

  return (
    <div className="flex min-h-[220px] w-full items-center justify-center">
      <div className="relative inline-flex items-center gap-1 rounded-full bg-muted p-1.5">
        {tabs.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => setActive(i)}
            className="relative z-10 flex h-8 items-center rounded-full px-4 text-[13px] font-medium whitespace-nowrap transition-colors"
            style={{ color: active === i ? "var(--foreground)" : "var(--muted-foreground)" }}
          >
            {active === i && (
              <motion.span
                layoutId="tab-hop-indicator"
                className="absolute inset-0 rounded-full bg-card shadow-sm"
                transition={{ type: "spring", duration: p.indicatorMs / 1000, bounce: p.indicatorBounce }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
        <PetBuddyTabHop rect={rect} p={p} />
      </div>
    </div>
  );
}
