import { useEffect, useRef, useState } from "react";
import { AppShell, PanelBones, Press, useDemoLoop, useMedia } from "../_skeleton/Skeleton";
import { params as defaults, type Params } from "./params";

/**
 * Bottom sheet on phones, centred dialog from md (768px) up — the usual responsive split.
 * Sheet: translateY(100%) -> 0 on the iOS drawer curve; drag to dismiss, where a quick flick
 * (velocity) counts as much as distance, and dragging up past the top meets friction.
 * Dialog: scale + opacity from the centre (modals aren't anchored to a trigger).
 * Reduced motion: opacity only, no travel.
 */
export default function BottomSheet({ p = defaults }: { p?: Params }) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const wide = useMedia("(min-width: 768px)");
  const dialog = wide && p.desktopAs === "dialog";
  const sheetRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number; id: number } | null>(null);
  useDemoLoop(p.autoplay && !dragging, p.intervalMs, setOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dialog || start.current) return; // ignore a second finger mid-drag
    start.current = { y: e.clientY, t: performance.now(), id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current || e.pointerId !== start.current.id) return;
    const dy = e.clientY - start.current.y;
    setDrag(dy > 0 ? dy : dy * 0.15); // friction instead of a hard stop above the top
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current || e.pointerId !== start.current.id) return;
    const dy = e.clientY - start.current.y;
    const velocity = Math.abs(dy) / Math.max(1, performance.now() - start.current.t);
    const h = sheetRef.current?.offsetHeight ?? 1;
    start.current = null;
    setDragging(false);
    setDrag(0);
    if (dy > 0 && (dy > h * 0.35 || velocity > p.flick)) setOpen(false);
  };

  const ms = open ? p.enterMs : p.exitMs;
  const ease = open ? p.easing : p.exitEasing;
  const transition = dragging ? "none" : reduce ? `opacity ${ms}ms ease` : `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`;
  const h = sheetRef.current?.offsetHeight || 400;
  const backdrop = open ? p.backdrop * (1 - Math.min(1, Math.max(0, drag) / h)) : 0;

  const sheetTransform = reduce ? "none" : dialog ? `scale(${open ? 1 : p.scaleFrom})` : open ? `translateY(${drag}px)` : "translateY(100%)";

  return (
    <AppShell shimmer={p.shimmer} action={<Press onClick={() => setOpen(true)}>Open sheet</Press>}>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black"
        style={{ opacity: backdrop, transition: dragging ? "none" : `opacity ${ms}ms ease`, pointerEvents: open ? "auto" : "none" }}
      />
      <div className={`pointer-events-none absolute inset-0 flex justify-center ${dialog ? "items-center p-6" : "items-end"}`}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Sheet"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="w-full touch-none bg-card p-5 pt-3 text-card-foreground shadow-2xl ring-1 ring-border"
          style={{
            maxWidth: dialog ? 440 : undefined,
            minHeight: dialog ? undefined : `${p.heightPct}%`,
            borderRadius: dialog ? p.radius : `${p.radius}px ${p.radius}px 0 0`,
            background: p.sheetColor || undefined,
            transform: sheetTransform,
            opacity: reduce || dialog ? (open ? 1 : 0) : 1,
            transition,
            pointerEvents: open ? "auto" : "none",
            transformOrigin: "center",
            paddingBottom: dialog ? 20 : 34,
          }}
        >
          {!dialog && <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/40" />}
          <PanelBones lines={4} />
        </div>
      </div>
    </AppShell>
  );
}
