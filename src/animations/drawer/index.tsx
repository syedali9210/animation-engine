import { useEffect, useState } from "react";
import { AppShell, Bone, PanelBones, Press, useDemoLoop, useMedia } from "../_skeleton/Skeleton";
import { params as defaults, type Params } from "./params";

/**
 * Side drawer: translateX(±100%) -> 0, percentages so it works at any width. Full-bleed (85vw) on
 * phones, fixed width from md up. Reduced motion: opacity only.
 */
export default function Drawer({ p = defaults }: { p?: Params }) {
  const [open, setOpen] = useState(false);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  useDemoLoop(p.autoplay, p.intervalMs, setOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const ms = open ? p.enterMs : p.exitMs;
  const left = p.side === "left";
  return (
    <AppShell shimmer={p.shimmer} action={<Press onClick={() => setOpen(true)}>Menu</Press>}>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black"
        style={{ opacity: open ? p.backdrop : 0, transition: `opacity ${ms}ms ease`, pointerEvents: open ? "auto" : "none" }}
      />
      <nav
        aria-label="Drawer"
        className={`absolute inset-y-0 ${left ? "left-0" : "right-0"} flex flex-col gap-4 bg-card p-5 pt-16 text-card-foreground shadow-2xl ring-1 ring-border md:pt-6`}
        style={{
          width: `min(${p.width}px, 85vw)`,
          transform: reduce || open ? "none" : `translateX(${left ? "-100%" : "100%"})`,
          opacity: reduce ? (open ? 1 : 0) : 1,
          transition: reduce ? `opacity ${ms}ms ease` : `transform ${ms}ms ${p.easing}`,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <Bone className="h-9 w-32" />
        {[70, 56, 64, 48, 60].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="size-8 shrink-0 rounded-lg" />
            <Bone className="h-3.5" style={{ width: `${w}%` }} />
          </div>
        ))}
        <div className="mt-auto">
          <PanelBones lines={2} />
        </div>
      </nav>
    </AppShell>
  );
}
