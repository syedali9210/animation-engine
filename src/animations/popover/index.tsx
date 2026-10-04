import { useEffect, useRef, useState } from "react";
import { AppShell, Bone, useDemoLoop, useMedia } from "../_skeleton/Skeleton";
import { params as defaults, type Params } from "./params";

/**
 * Dropdown menu that scales in from its trigger (transform-origin at the trigger's corner, not the
 * centre — flip "Origin-aware" off to feel the difference). Below 640px it becomes an action sheet
 * from the bottom edge. Exit is faster than enter. Reduced motion: opacity only.
 */
export default function Popover({ p = defaults }: { p?: Params }) {
  const [open, setOpen] = useState(false);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const phone = !useMedia("(min-width: 640px)");
  const sheet = phone && p.phoneAs === "action sheet";
  const ref = useRef<HTMLDivElement>(null);
  useDemoLoop(p.autoplay, p.intervalMs, setOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onDown);
    };
  }, []);

  const ms = open ? p.enterMs : p.exitMs;
  const hidden = sheet ? "translateY(100%)" : `scale(${p.scaleFrom})`;
  const items = [62, 48, 70, 54, 40];

  const trigger = (
    <button
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-haspopup="menu"
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none"
    >
      Options
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );

  const menu = (
    <div
      role="menu"
      className={`${sheet ? "fixed inset-x-3 bottom-3 rounded-[22px] p-2" : "absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl p-1.5"} z-20 bg-card text-card-foreground shadow-xl ring-1 ring-border`}
      style={{
        transformOrigin: sheet ? "center bottom" : p.originAware ? "top right" : "center",
        transform: reduce || open ? "none" : hidden,
        opacity: open ? 1 : 0,
        transition: reduce ? `opacity ${ms}ms ease` : `transform ${ms}ms ${p.easing}, opacity ${ms}ms ${p.easing}`,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {items.map((w, i) => (
        <div
          key={i}
          role="menuitem"
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5"
          style={{
            opacity: open || !p.staggerMs ? 1 : 0,
            transition: p.staggerMs && !reduce ? `opacity ${ms}ms ease ${open ? i * p.staggerMs : 0}ms` : undefined,
          }}
        >
          <Bone className="size-5 shrink-0 rounded-md" />
          <Bone className="h-3" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );

  return (
    <AppShell
      shimmer={p.shimmer}
      anchored
      action={
        <div ref={ref} className="relative">
          {trigger}
          {menu}
        </div>
      }
    />
  );
}
