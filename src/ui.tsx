import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentType, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  ChatsCircle,
  CirclesThree,
  Compass,
  Confetti,
  CreditCard,
  ForkKnife,
  Layout,
  Robot,
  X,
  type IconProps,
} from "@phosphor-icons/react";
import type { Category } from "./registry";

export type Icon = ComponentType<IconProps>;

export const CATEGORY_ICON: Record<Category, Icon> = {
  "Shaders & GPU": CirclesThree,
  Characters: Robot,
  "Chat & AI": ChatsCircle,
  "Cards & Reveals": CreditCard,
  Navigation: Compass,
  Celebration: Confetti,
  "UI Patterns": Layout,
  "Swiggy App": ForkKnife,
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
type Align = "start" | "center" | "end";

export function Tip({ label, kbd, side = "bottom", align = "center", children }: { label: string; kbd?: string; side?: "top" | "bottom"; align?: Align; children: ReactNode }) {
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
        <span aria-hidden className={`tip tip-${side} ${align === "end" ? "tip-end" : align === "start" ? "tip-start" : ""}`} data-instant={open === "instant"}>
          {label}
          {kbd && <kbd>{kbd}</kbd>}
        </span>
      )}
    </span>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="mono inline-grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-surface-2 px-1 text-micro text-fg-3 shadow-[inset_0_0_0_1px_var(--line)]">{children}</kbd>
);

export function Count({ n, tone = "neutral" }: { n: number; tone?: "warn" | "bad" | "neutral" }) {
  const look = tone === "neutral" ? "bg-surface-3 text-fg-2" : tone === "bad" ? "bg-bad/15 text-bad-ink" : "bg-warn/20 text-warn-ink";
  return <span className={`inline-grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-micro font-medium tabular-nums ${look}`}>{n}</span>;
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
  tipSide,
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
  tipSide?: "top" | "bottom";
}) {
  const iconOnly = !!hideLabels;
  const sizing =
    size === "sm"
      ? `h-6 text-caption ${iconOnly ? "w-7" : "px-2"}`
      : size === "lg"
        ? `h-9 text-ui ${iconOnly ? "w-11" : "px-3.5"}`
        : `h-7 text-body pointer-coarse:h-9 ${iconOnly ? "w-8 pointer-coarse:w-10" : "px-2.5"}`;
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
      className={`${full ? "flex w-full" : "inline-flex"} shrink-0 gap-px rounded-lg bg-surface-2 p-0.5 shadow-[inset_0_0_0_1px_var(--line)]`}
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
            className={`press flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium ${full ? "flex-1" : ""} ${sizing} ${
              on ? "bg-surface text-fg shadow-sm dark:bg-surface-3" : "text-fg-3 hover:text-fg"
            }`}
          >
            {o.icon && <o.icon size={size === "lg" ? 18 : 16} aria-hidden className="shrink-0" />}
            <span className={`truncate ${o.icon && hideLabels ? HIDE_BELOW[hideLabels] : ""}`}>{o.label}</span>
          </button>
        );
        return o.kbd || (o.icon && hideLabels) ? (
          <Tip key={String(o.value)} label={o.label} kbd={o.kbd} side={tipSide}>
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
      className="flex shrink-0 gap-4 border-b px-4"
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
            className={`relative -mb-px flex h-10 items-center gap-1.5 whitespace-nowrap text-body font-medium transition-colors duration-100 focus-visible:outline-offset-[-2px] ${on ? "text-fg" : "text-fg-3 hover:text-fg"}`}
          >
            {o.label}
            {o.badge}
            <span aria-hidden className={`absolute inset-x-0 bottom-0 h-px ${on ? "bg-fg" : "bg-transparent"}`} />
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
  popover,
}: {
  label: string;
  kbd?: string;
  onClick?: () => void;
  children: ReactNode;
  /** a toggle: renders aria-pressed */
  active?: boolean;
  tipSide?: "top" | "bottom";
  tipAlign?: Align;
  size?: "sm" | "md" | "lg";
  className?: string;
  expanded?: boolean;
  disabled?: boolean;
  /** the id of the popover this button opens */
  popover?: string;
}) {
  const box = size === "sm" ? "h-7 w-7 rounded-md" : size === "lg" ? "h-10 w-10 rounded-lg" : "h-8 w-8 rounded-md pointer-coarse:h-10 pointer-coarse:w-10";
  return (
    <Tip label={label} kbd={kbd} side={tipSide} align={tipAlign}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        aria-expanded={expanded}
        disabled={disabled}
        onClick={onClick}
        popoverTarget={popover}
        className={`press grid shrink-0 place-items-center disabled:pointer-events-none disabled:opacity-35 ${box} ${active ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg"} ${className}`}
      >
        {children}
      </button>
    </Tip>
  );
}

const LOOK = {
  primary: "bg-accent text-on-accent shadow-xs hover:bg-accent-hover",
  secondary: "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-surface-3",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className = "",
  size = "md",
  popover,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof LOOK;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** the id of the popover this button opens */
  popover?: string;
  label?: string;
}) {
  const sizing = size === "sm" ? "h-7 gap-1.5 rounded-md px-2.5 text-caption" : size === "lg" ? "h-10 gap-2 rounded-lg px-4 text-ui" : "h-8 gap-1.5 rounded-md px-3 text-body pointer-coarse:h-10 pointer-coarse:px-4";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      popoverTarget={popover}
      aria-label={label}
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
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ${lg ? "h-7 w-12" : "h-[18px] w-8"} ${on ? "bg-accent" : "bg-control-off"}`}
    >
      <span
        aria-hidden
        className={`rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-out motion-reduce:transition-none ${lg ? "h-6 w-6" : "h-3.5 w-3.5"} ${on ? `bg-on-accent ${lg ? "translate-x-5" : "translate-x-3.5"}` : "bg-white"}`}
      />
    </button>
  );
}

/** The engine's mark: an easing curve with its two handles, in ink. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <rect width="24" height="24" rx="6" fill="var(--fg)" />
      <path d="M6.5 17C11.5 17 12.5 7 17.5 7" fill="none" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6.5" cy="17" r="1.9" fill="var(--surface)" />
      <circle cx="17.5" cy="7" r="1.9" fill="var(--surface)" />
    </svg>
  );
}

/* ---------- popover: the native [popover] (top layer, light dismiss, Escape), placed against its trigger ---------- */
export function Popover({
  id,
  children,
  align = "start",
  side = "bottom",
  className = "",
  label,
  onToggle,
}: {
  id: string;
  children: ReactNode;
  align?: Align;
  side?: "top" | "bottom";
  className?: string;
  label?: string;
  onToggle?: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const place = () => {
      const t = document.querySelector<HTMLElement>(`[popovertarget="${id}"]`)?.getBoundingClientRect();
      if (!t) return;
      const r = el.getBoundingClientRect();
      const gap = 6;
      let left = align === "start" ? t.left : align === "end" ? t.right - r.width : t.left + t.width / 2 - r.width / 2;
      left = Math.max(8, Math.min(innerWidth - r.width - 8, left));
      const below = t.bottom + gap;
      const top = side === "bottom" && below + r.height < innerHeight - 8 ? below : Math.max(8, t.top - gap - r.height);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.setProperty("--origin", `${top < t.top ? "bottom" : "top"} ${align === "end" ? "right" : align === "start" ? "left" : "center"}`);
    };
    const toggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === "open";
      if (open) place();
      onToggle?.(open);
    };
    el.addEventListener("toggle", toggle);
    return () => el.removeEventListener("toggle", toggle);
  }, [id, align, side, onToggle]);
  return (
    <div ref={ref} id={id} popover="auto" role="dialog" aria-label={label} className={`pop ${className}`}>
      {children}
    </div>
  );
}

/** Closes the popover an action was picked in. */
export const closePopover = (el: Element | null) => (el?.closest("[popover]") as HTMLElement | null)?.hidePopover();

/** One action in a popover menu: icon, label, an optional hint underneath. */
export function MenuItem({ icon: I, children, hint, onSelect, disabled }: { icon?: Icon; children: ReactNode; hint?: string; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        closePopover(e.currentTarget);
        onSelect();
      }}
      className="press flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45"
    >
      {I && <I size={16} aria-hidden className="mt-px shrink-0 text-fg-2" />}
      <span className="min-w-0">
        <span className="block text-body font-medium">{children}</span>
        {hint && <span className="mt-0.5 block text-caption text-fg-3">{hint}</span>}
      </span>
    </button>
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
      <div aria-hidden className="scrim absolute inset-0 z-30 bg-[rgb(9_9_11/0.3)]" data-open={open} onClick={onClose} />
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
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" />
          <div className="flex items-center gap-2 py-2 pl-4 pr-2">
            <h2 id={titleId} className="mr-auto text-ui font-semibold">
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
