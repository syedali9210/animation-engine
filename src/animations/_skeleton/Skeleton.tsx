import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import "./skeleton.css";

/** matchMedia as state. (Inside the engine, the stage bridge answers prefers-reduced-motion for its emulation.) */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return match;
}

/** Opens and closes on a timer so a pattern plays without anyone clicking. */
export function useDemoLoop(on: boolean, everyMs: number, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!on) return;
    let open = false;
    const flip = () => setOpen((open = !open));
    const first = setTimeout(flip, 500);
    const t = setInterval(flip, everyMs / 2);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [on, everyMs, setOpen]);
}

/** Inside the engine's screen builder: true when this animation has a background or other layers behind it,
    and the stand-in app should make way. Outside the engine (an exported pattern) it is always false. */
export function useBare() {
  return useSyncExternalStore(
    (cb) => window.engine?.onBare?.(cb) ?? (() => {}),
    () => !!window.engine?.bare,
  );
}

export const Bone = ({ className = "", style }: { className?: string; style?: CSSProperties }) => <div className={`skel ${className}`} style={style} />;

/** A loading-state app screen. Phone: a single column. md+: a sidebar appears. lg+: a three-up grid.
    Bare (something already behind it on a built screen): only the pattern itself, over what's there.
    `anchored`: the pattern grows out of its trigger (a popover), so the trigger stays. */
export function AppShell({ shimmer, children, action, anchored }: { shimmer: string; children?: ReactNode; action?: ReactNode; anchored?: boolean }) {
  const bare = useBare();
  return (
    <div className={`skel-${shimmer} absolute inset-0 flex overflow-hidden text-foreground ${bare ? "" : "bg-background"}`}>
      {!bare && (
        <aside className="hidden w-56 shrink-0 flex-col gap-3 border-r p-5 md:flex">
          <Bone className="mb-3 h-8 w-28" />
          {[78, 64, 70, 52, 60, 46].map((w, i) => (
            <Bone key={i} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </aside>
      )}
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-16 md:p-6">
        <header className="flex items-center gap-3">
          {!bare && <Bone className="size-10 shrink-0 rounded-full" />}
          {/* kept when bare, so the trigger (and a popover anchored to it) stays in its place */}
          <div className="flex-1 space-y-2">
            {!bare && (
              <>
                <Bone className="h-3.5 w-1/3" />
                <Bone className="h-3 w-1/4" />
              </>
            )}
          </div>
          {/* the demo trigger belongs to the stand-in app, so it goes too — unless the pattern grows out of it */}
          {bare && !anchored ? <div className="invisible">{action}</div> : action}
        </header>
        {!bare && (
          <>
            <Bone className="h-36 shrink-0 rounded-2xl md:h-48" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-border">
                  <Bone className="size-11 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-3 w-3/4" />
                    <Bone className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      {children}
    </div>
  );
}

/** Placeholder content for a sheet / dialog / drawer body. */
export function PanelBones({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-4">
      <Bone className="h-5 w-1/2" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Bone key={i} className="h-3" style={{ width: `${92 - i * 14}%` }} />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Bone className="h-10 flex-1 rounded-xl" />
        <Bone className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

/** Pressable that answers the press (Emil: scale 0.97 on :active, 160ms ease-out). */
export function Press({ onClick, children, className = "", label }: { onClick: () => void; children: ReactNode; className?: string; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
