import { useEffect, useState } from "react";
import { AppShell, PanelBones, Press, useDemoLoop, useMedia } from "../_skeleton/Skeleton";
import { params as defaults, type Params } from "./params";

/**
 * Centred dialog: scale from just under 1 plus opacity, origin centre (modals aren't anchored to a
 * trigger, so they're the one popup that keeps transform-origin: center). Exit is faster than enter.
 * Below 640px it can dock to the bottom edge instead. Reduced motion: opacity only.
 */
export default function Modal({ p = defaults }: { p?: Params }) {
  const [open, setOpen] = useState(false);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const phone = !useMedia("(min-width: 640px)");
  const docked = phone && p.phoneAs === "docked";
  useDemoLoop(p.autoplay, p.intervalMs, setOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const ms = open ? p.enterMs : p.exitMs;
  const hidden = docked ? "translateY(24px)" : `scale(${p.scaleFrom})`;
  return (
    <AppShell shimmer={p.shimmer} action={<Press onClick={() => setOpen(true)}>Open dialog</Press>}>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="absolute inset-0"
        style={{
          background: `rgba(0,0,0,${p.backdrop})`,
          backdropFilter: p.blur ? `blur(${p.blur}px)` : undefined,
          opacity: open ? 1 : 0,
          transition: `opacity ${ms}ms ease`,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <div className={`pointer-events-none absolute inset-0 flex justify-center p-4 ${docked ? "items-end pb-8" : "items-center"}`}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dialog"
          className="w-full bg-card p-6 text-card-foreground shadow-2xl ring-1 ring-border"
          style={{
            maxWidth: p.width,
            borderRadius: p.radius,
            opacity: open ? 1 : 0,
            transform: reduce || open ? "none" : hidden,
            transformOrigin: "center",
            transition: reduce ? `opacity ${ms}ms ease` : `transform ${ms}ms ${p.easing}, opacity ${ms}ms ${p.easing}`,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <PanelBones lines={3} />
        </div>
      </div>
    </AppShell>
  );
}
