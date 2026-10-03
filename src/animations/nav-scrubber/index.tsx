import { useEffect, useRef, useState } from "react";
import { params as defaults, type Params } from "./params";

// Same drag / click / arrow-key mechanics as the portfolio's real left-rail Scrubber, scoped to local
// state (the real one syncs with scrollIntoView + IntersectionObserver against page sections).
export default function ScrubberDemo({ p = defaults }: { p?: Params }) {
  const items = p.items.split(",").map((s) => s.trim()).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const index = Math.min(activeIndex, items.length - 1);
  const active = items[index];

  // hands-free demo: step down the list and back
  useEffect(() => {
    if (!p.autoplay) return;
    let dir = 1;
    const t = setInterval(() => {
      if (draggingRef.current) return;
      setActiveIndex((i) => {
        if (i + dir < 0 || i + dir >= items.length) dir = -dir;
        return i + dir;
      });
    }, p.intervalMs);
    return () => clearInterval(t);
  }, [p.autoplay, p.intervalMs, items.length]);

  function indexFromClientY(clientY: number) {
    const track = trackRef.current;
    if (!track) return index;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return Math.round(ratio * (items.length - 1));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    try {
      trackRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic/unsupported pointer id — dragging still works via move events.
    }
    setActiveIndex(indexFromClientY(e.clientY));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    setActiveIndex(indexFromClientY(e.clientY));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // No-op if capture was never established.
    }
  }

  const playheadPercent = items.length > 1 ? (index / (items.length - 1)) * 100 : 0;
  // the original moves the playhead and label with `transition-[top]` — a layout property, kept as-is
  const move = { transitionProperty: "top", transitionDuration: `${p.moveMs}ms`, transitionTimingFunction: p.easing };

  return (
    <div className="flex min-h-[220px] w-full items-center justify-center">
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-orientation="vertical"
          aria-label="Demo section navigation"
          aria-valuemin={0}
          aria-valuemax={items.length - 1}
          aria-valuenow={index}
          aria-valuetext={active}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActiveIndex((i) => Math.min(items.length - 1, i + 1));
            if (e.key === "ArrowUp") setActiveIndex((i) => Math.max(0, i - 1));
          }}
          className="relative flex h-56 w-8 cursor-pointer touch-none flex-col items-center rounded-full border border-border bg-card py-3 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="relative flex h-full w-full flex-col items-center justify-between">
            {Array.from({ length: p.ticks }).map((_, i) => (
              <span key={i} className="h-px w-3 shrink-0 bg-muted-foreground/30" />
            ))}
            <div
              className="pointer-events-none absolute left-1/2 h-1 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ top: `${playheadPercent}%`, background: p.accent, ...move }}
            />
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-full ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[13px] text-muted-foreground shadow-lg"
          style={{ top: `calc(12px + (100% - 24px) * ${playheadPercent / 100})`, ...move }}
        >
          {active}
        </div>
      </div>
    </div>
  );
}
