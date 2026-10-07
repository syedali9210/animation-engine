import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentType, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  ChatsCircle,
  CirclesThree,
  Compass,
  Confetti,
  CreditCard,
  Cursor,
  CursorClick,
  DeviceMobile,
  HandGrabbing,
  Infinity as Loop,
  Layout,
  PlayCircle,
  Robot,
  ToggleRight,
  X,
  type IconProps,
} from "@phosphor-icons/react";
import type { Category, Trigger } from "./registry";

export type Icon = ComponentType<IconProps>;

export const CATEGORY_ICON: Record<Category, Icon> = {
  "Shaders & GPU": CirclesThree,
  Characters: Robot,
  "Chat & AI": ChatsCircle,
  "Cards & Reveals": CreditCard,
  Navigation: Compass,
  Celebration: Confetti,
  "UI Patterns": Layout,
  Screens: DeviceMobile,
};

export const TRIGGER: Record<Trigger, { icon: Icon; label: string }> = {
  ambient: { icon: Loop, label: "Ambient loop" },
  interaction: { icon: CursorClick, label: "On click" },
  hover: { icon: Cursor, label: "On hover" },
  gesture: { icon: HandGrabbing, label: "Drag gesture" },
  sequence: { icon: PlayCircle, label: "One-shot" },
  state: { icon: ToggleRight, label: "State change" },
};

export function useMedia(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches);
}

/** Arrow keys, Home and End move through a radiogroup / tablist; selection follows focus. */
export function rove<T>(e: KeyboardEvent<HTMLElement>, values: T[], current: T, set: (v: T) => void, role: "radio" | "tab") {
  const i = values.indexOf(current);
  const to = ({ ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: values.length - 1 } as Record<string, number>)[e.key];
  if (to === undefined) return;
  e.preventDefault();
  const n = (to + values.length) % values.length;
  set(values[n]);
  e.currentTarget.querySelectorAll<HTMLElement>(`[role="${role}"]`)[n]?.focus();
}

/* ---------- tooltip: a delay before the first, instant while you move between them (Emil) ---------- */
let lastClosed = 0;
const fine = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;

export function Tip({ label, kbd, side = "bottom", align = "center", children }: { label: string; kbd?: string; side?: "top" | "bottom"; align?: "center" | "end"; children: ReactNode }) {
  const [open, setOpen] = useState<false | "delayed" | "instant">(false);
  const isOpen = useRef(false);
  const timer = useRef(0);
  const show = (now = false) => {
    const instant = now || performance.now() - lastClosed < 500;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        isOpen.current = true;
        setOpen(instant ? "instant" : "delayed");
      },
      instant ? 0 : 500,
    );
  };
  const hide = () => {
    clearTimeout(timer.current);
    if (isOpen.current) lastClosed = performance.now();
    isOpen.current = false;
    setOpen(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && fine && show()}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => e.target.matches(":focus-visible") && show(true)}
      onBlur={hide}
    >
      {children}
      {open && (
        <span aria-hidden className={`tip tip-${side} ${align === "end" ? "tip-end" : ""}`} data-instant={open === "instant"}>
          {label}
          {kbd && <kbd>{kbd}</kbd>}
        </span>
      )}
    </span>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="mono inline-grid h-5 min-w-5 place-items-center rounded-[5px] px-1 text-micro text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)]">{children}</kbd>
);

export function Count({ n, tone = "warn" }: { n: number; tone?: "warn" | "bad" | "neutral" }) {
  const look = tone === "neutral" ? "bg-surface-3 text-fg-2" : tone === "bad" ? "bg-bad/15 text-bad-ink" : "bg-warn/20 text-warn-ink";
  return <span className={`inline-grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-micro font-semibold tabular-nums ${look}`}>{n}</span>;
}

/* ---------- segmented control (radio group) ---------- */
const HIDE_BELOW = { sm: "hidden sm:inline", md: "hidden md:inline", lg: "hidden lg:inline", xl: "hidden xl:inline", "2xl": "hidden 2xl:inline", always: "sr-only" } as const;

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  labelledBy,
  size = "md",
  full,
  hideLabels,
}: {
  value: T;
  options: { value: T; label: string; icon?: Icon; kbd?: string }[];
  onChange: (v: T) => void;
  label?: string;
  labelledBy?: string;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  /** icon options only show their label from this breakpoint up */
  hideLabels?: keyof typeof HIDE_BELOW;
}) {
  const sizing = size === "sm" ? "h-7 px-2.5 text-caption" : size === "lg" ? "h-9 px-3.5 text-ui" : "h-8 px-3 text-body";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      onKeyDown={(e) =>
        rove(
          e,
          options.map((o) => o.value),
          value,
          onChange,
          "radio",
        )
      }
      className={`${full ? "flex w-full" : "inline-flex"} shrink-0 rounded-[10px] bg-surface-2 p-0.5`}
    >
      {options.map((o) => {
        const on = o.value === value;
        const btn = (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.icon && hideLabels ? o.label : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`press flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium ${full ? "flex-1" : ""} ${sizing} ${
              on ? "bg-surface text-fg shadow-sm dark:bg-surface-3" : "text-fg-2 hover:text-fg"
            }`}
          >
            {o.icon && <o.icon size={size === "lg" ? 18 : 16} weight={on ? "fill" : "regular"} aria-hidden className="shrink-0" />}
            <span className={`truncate ${o.icon && hideLabels ? HIDE_BELOW[hideLabels] : ""}`}>{o.label}</span>
          </button>
        );
        return o.kbd ? (
          <Tip key={String(o.value)} label={o.label} kbd={o.kbd}>
            {btn}
          </Tip>
        ) : (
          btn
        );
      })}
    </div>
  );
}

/* ---------- tabs ---------- */
export function Tabs<T extends string>({ value, onChange, options, label, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; badge?: ReactNode }[]; label: string; id: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(e) =>
        rove(
          e,
          options.map((o) => o.value),
          value,
          onChange,
          "tab",
        )
      }
      className="flex shrink-0 gap-3 border-b px-4"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            id={`${id}-tab-${o.value}`}
            aria-selected={on}
            aria-controls={`${id}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative -mb-px flex h-10 items-center gap-1.5 whitespace-nowrap rounded-t-md text-body font-medium transition-colors duration-100 focus-visible:outline-offset-[-2px] ${on ? "text-fg" : "text-fg-2 hover:text-fg"}`}
          >
            {o.label}
            {o.badge}
            <span aria-hidden className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full ${on ? "bg-fg" : "bg-transparent"}`} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- buttons ---------- */
export function IconButton({
  label,
  kbd,
  onClick,
  children,
  active,
  tipSide,
  tipAlign,
  size = "md",
  className = "",
  expanded,
  disabled,
}: {
  label: string;
  kbd?: string;
  onClick: () => void;
  children: ReactNode;
  /** a toggle: renders aria-pressed */
  active?: boolean;
  tipSide?: "top" | "bottom";
  tipAlign?: "center" | "end";
  size?: "sm" | "md" | "lg";
  className?: string;
  expanded?: boolean;
  disabled?: boolean;
}) {
  const box = size === "sm" ? "h-7 w-7 rounded-md" : size === "lg" ? "h-10 w-10 rounded-[10px]" : "h-8 w-8 rounded-lg";
  return (
    <Tip label={label} kbd={kbd} side={tipSide} align={tipAlign}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        aria-expanded={expanded}
        disabled={disabled}
        onClick={onClick}
        className={`press grid shrink-0 place-items-center disabled:pointer-events-none disabled:opacity-35 ${box} ${active ? "bg-accent-soft text-accent-ink" : "text-fg-2 hover:bg-surface-2 hover:text-fg"} ${className}`}
      >
        {children}
      </button>
    </Tip>
  );
}

const LOOK = {
  primary: "bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(16_20_60/0.2)] hover:bg-accent-hover",
  secondary: "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--line-strong),var(--sh-xs)] hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-surface-3",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof LOOK;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizing = size === "sm" ? "h-7 gap-1.5 rounded-md px-2.5 text-caption" : size === "lg" ? "h-10 gap-2 rounded-[10px] px-4 text-ui" : "h-8 gap-1.5 rounded-lg px-3 text-body";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium disabled:pointer-events-none disabled:opacity-45 ${sizing} ${LOOK[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Switch({ on, onChange, label, id, labelledBy, size = "md" }: { on: boolean; onChange: (v: boolean) => void; label?: string; id?: string; labelledBy?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ${lg ? "h-7 w-12" : "h-5 w-9"} ${on ? "bg-accent" : "bg-control-off"}`}
    >
      <span
        aria-hidden
        className={`rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.28)] transition-transform duration-200 ease-out motion-reduce:transition-none ${lg ? "h-6 w-6" : "h-4 w-4"} ${on ? (lg ? "translate-x-5" : "translate-x-4") : ""}`}
      />
    </button>
  );
}

/** The engine's mark: an easing curve with its two handles, on the accent. */
export function Logo({ size = 24 }: { size?: number }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b7bf0" />
          <stop offset="1" stopColor="#4646c0" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${id})`} />
      <path d="M6.5 17C11.5 17 12.5 7 17.5 7" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6.5" cy="17" r="1.9" fill="#fff" />
      <circle cx="17.5" cy="7" r="1.9" fill="#fff" />
    </svg>
  );
}

/* ---------- native <dialog>: drawer or centred modal ---------- */
export function Dialog({ open, onClose, label, className, children }: { open: boolean; onClose: () => void; label: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-label={label} className={className} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </dialog>
  );
}

/* ---------- phone bottom sheet: non-modal, swipe or flick down to close (Emil: velocity, not distance) ---------- */
export function Sheet({ open, onClose, title, actions, children }: { open: boolean; onClose: () => void; title: string; actions?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; id: number } | null>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  // focus moves in on open and back to whatever opened it on close
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && close.current();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y;
    // friction past the top instead of a wall
    ref.current!.style.transform = `translateY(${dy > 0 ? dy : -Math.sqrt(-dy) * 2}px)`;
  };
  const end = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    const dy = e.clientY - d.y;
    const el = ref.current!;
    el.style.transform = "";
    el.style.transition = "";
    if (dy > 120 || dy / (performance.now() - d.t) > 0.11) onClose();
  };

  return (
    <>
      <div aria-hidden className="scrim absolute inset-0 z-30 bg-[rgb(8_10_20/0.28)]" data-open={open} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-open={open}
        inert={!open}
        className="sheet absolute inset-x-0 bottom-0 z-40 flex h-[78%] flex-col rounded-t-[20px] bg-surface shadow-lg outline-none"
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={(e) => {
            if (drag.current || (e.target as Element).closest("button")) return; // one finger at a time
            drag.current = { y: e.clientY, t: performance.now(), id: e.pointerId };
            e.currentTarget.setPointerCapture(e.pointerId);
            ref.current!.style.transition = "none";
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />
          <div className="flex items-center gap-2 py-2 pl-4 pr-2">
            <h2 id={titleId} className="mr-auto text-title font-semibold">
              {title}
            </h2>
            {actions}
            <IconButton label="Close" size="lg" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain border-t pb-[env(safe-area-inset-bottom)]">{children}</div>
      </div>
    </>
  );
}
