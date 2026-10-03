import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, Bone, Press, useMedia } from "../_skeleton/Skeleton";
import { params as defaults, type Params } from "./params";

type Item = { id: number; leaving: false | "down" | "left" | "right" };
const H = 64; // toast height

/**
 * Sonner-style stack. CSS transitions (not keyframes) so rapid pushes retarget smoothly; toasts enter
 * from the edge they're anchored to and leave the same way; older ones tuck behind with a small scale;
 * hovering expands the stack (only on real pointers) and pauses the timers, as does a hidden tab;
 * swipe sideways to dismiss — a quick flick counts. Reduced motion: opacity only.
 */
export default function Toasts({ p = defaults }: { p?: Params }) {
  const [items, setItems] = useState<Item[]>([]);
  const [hover, setHover] = useState(false);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const wide = useMedia("(min-width: 768px)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const next = useRef(0);
  const age = useRef(new Map<number, number>());
  const pr = useRef(p);
  pr.current = p;

  const push = useCallback(() => setItems((t) => [...t, { id: ++next.current, leaving: false }]), []);
  const dismiss = useCallback((id: number, dir: Item["leaving"] = "down") => {
    setItems((t) => t.map((x) => (x.id === id ? { ...x, leaving: dir } : x)));
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), pr.current.exitMs);
    age.current.delete(id);
  }, []);

  useEffect(() => {
    if (!p.autoplay) return;
    push();
    const t = setInterval(push, p.pushMs);
    return () => clearInterval(t);
  }, [p.autoplay, p.pushMs, push]);

  // lifetimes tick only while nobody is reading them: paused on hover and in hidden tabs
  const live = useRef({ items, hover });
  live.current = { items, hover };
  useEffect(() => {
    const t = setInterval(() => {
      if (live.current.hover || document.hidden) return;
      for (const x of live.current.items) {
        if (x.leaving) continue;
        const a = (age.current.get(x.id) ?? 0) + 100;
        age.current.set(x.id, a);
        if (a >= pr.current.lifeMs) dismiss(x.id);
      }
    }, 100);
    return () => clearInterval(t);
  }, [dismiss]);

  const pos = wide ? p.desktopPosition : "bottom-center";
  const top = pos.startsWith("top");
  const count = items.filter((x) => !x.leaving).length;
  const expanded = hover && fine;
  // stack slot = live toasts newer than this one (a leaving toast keeps the slot it left from)
  const slot = (t: Item) => items.slice(items.indexOf(t) + 1).filter((x) => !x.leaving).length;

  return (
    <AppShell shimmer={p.shimmer} action={<Press onClick={push}>Toast</Press>}>
      <ol
        aria-live="polite"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={`absolute ${top ? "top-14" : "bottom-6"} ${pos.endsWith("right") ? "right-6" : "left-1/2 -translate-x-1/2"} w-[min(360px,calc(100%-32px))]`}
        // the list is as tall as the expanded stack, so moving between toasts never drops the hover
        style={{ height: expanded ? count * (H + p.gap) : H + p.peek * (p.visible - 1) }}
      >
        {items.map((t) => (
          <Toast key={t.id} t={t} i={slot(t)} p={p} top={top} expanded={expanded} reduce={reduce} onDismiss={dismiss} />
        ))}
      </ol>
    </AppShell>
  );
}

function Toast({ t, i, p, top, expanded, reduce, onDismiss }: { t: Item; i: number; p: Params; top: boolean; expanded: boolean; reduce: boolean; onDismiss: (id: number, dir: Item["leaving"]) => void }) {
  const [shown, setShown] = useState(false);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; t: number; id: number } | null>(null);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true)); // mount hidden, then transition in
    return () => cancelAnimationFrame(r);
  }, []);

  const y = (expanded ? i * (H + p.gap) : i * p.peek) * (top ? 1 : -1);
  const scale = expanded ? 1 : 1 - i * p.stackScale;
  const edge = top ? "-100%" : "100%";
  let transform = `translateX(${dx}px) translateY(${y}px) scale(${scale})`;
  if (!shown || t.leaving === "down") transform = `translateY(${edge})`;
  if (t.leaving === "left" || t.leaving === "right") transform = `translateX(${t.leaving === "left" ? "-" : ""}120%) translateY(${y}px) scale(${scale})`;
  const ms = t.leaving ? p.exitMs : p.enterMs;

  return (
    <li
      onPointerDown={(e) => {
        if (drag.current) return;
        drag.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => drag.current?.id === e.pointerId && setDx(e.clientX - drag.current.x)}
      onPointerUp={(e) => {
        if (drag.current?.id !== e.pointerId) return;
        const v = Math.abs(dx) / Math.max(1, performance.now() - drag.current.t);
        drag.current = null;
        if (Math.abs(dx) > 90 || v > p.flick) onDismiss(t.id, dx < 0 ? "left" : "right");
        setDx(0);
      }}
      className={`absolute inset-x-0 ${top ? "top-0" : "bottom-0"} flex touch-none items-center gap-3 rounded-2xl bg-card px-4 text-card-foreground shadow-lg ring-1 ring-border`}
      style={{
        height: H,
        zIndex: 100 - i,
        transformOrigin: top ? "center bottom" : "center top",
        transform: reduce ? "none" : transform,
        opacity: !shown || t.leaving || i >= p.visible ? 0 : 1,
        transition: drag.current ? "none" : reduce ? `opacity ${ms}ms ease` : `transform ${ms}ms ${p.easing}, opacity ${ms}ms ${p.easing}`,
      }}
    >
      <Bone className="size-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-2/3" />
        <Bone className="h-2.5 w-1/2" />
      </div>
      <Bone className="h-7 w-14 shrink-0 rounded-lg" />
    </li>
  );
}
