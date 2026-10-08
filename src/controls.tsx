import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwise, CaretUpDown, SlidersHorizontal, X } from "@phosphor-icons/react";
import type { AnimMeta, ParamSpec, Value, Values } from "./registry";
import { bezier } from "./suggest";
import { IconButton, Segmented, Switch, rove } from "./ui";

export const EASINGS: [string, string][] = [
  ["Ease out", "cubic-bezier(0.23, 1, 0.32, 1)"],
  ["Ease in-out", "cubic-bezier(0.77, 0, 0.175, 1)"],
  ["iOS drawer", "cubic-bezier(0.32, 0.72, 0, 1)"],
  ["Expo out", "cubic-bezier(0.16, 1, 0.3, 1)"],
  ["Back out", "cubic-bezier(0.34, 1.56, 0.64, 1)"],
  ["Ease", "cubic-bezier(0.25, 0.1, 0.25, 1)"],
  ["Linear", "cubic-bezier(0, 0, 1, 1)"],
  ["Ease in", "cubic-bezier(0.42, 0, 1, 1)"],
];

/** A hairline box that firms up on hover and takes an ink ring on focus. */
export const field =
  "rounded-md bg-surface text-fg outline-none shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-100 hover:shadow-[inset_0_0_0_1px_var(--fg-3)] focus-visible:shadow-[inset_0_0_0_1px_var(--fg),0_0_0_3px_var(--accent-soft)] dark:bg-surface-2";

export function groupSchema(a: AnimMeta) {
  const groups = new Map<string, [string, ParamSpec][]>();
  for (const [k, s] of Object.entries(a.schema)) {
    const g = s.group ?? "General";
    groups.set(g, [...(groups.get(g) ?? []), [k, s]]);
  }
  return [...groups];
}

type Num = Extract<ParamSpec, { type: "number" }>;
type Sel = Extract<ParamSpec, { type: "select" }>;
const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;

/* ---------------- inputs ---------------- */

/* ---------------- the slider: the field is the control ---------------- */

/** One row that is the control: a soft fill up to the value with a thin handle at its edge, the label inside on the
    left and the value on the right. Click or drag anywhere to set it (touch waits for a sideways move, so the panel
    still scrolls); click the number, press Enter or just type to enter one; arrows step it (Shift ×10); Backspace or a
    double-click puts it back. */
export function SliderField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  def,
  set,
  big,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** the original value: changed values show it, and reset to it */
  def?: number;
  set: (v: number) => void;
  big?: boolean;
  hint?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<string | null>(null); // the draft while typing a value
  const [dragging, setDragging] = useState(false);
  const press = useRef<{ x: number; y: number; id: number; live: boolean } | null>(null);
  const cancel = useRef(false);
  const places = decimals(step);
  const clamp = (n: number) => Number(Math.min(max, Math.max(min, n)).toFixed(places));
  const snap = (n: number) => clamp(min + Math.round((n - min) / step) * step);
  const at = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    return snap(min + ((x - r.left) / r.width) * (max - min));
  };
  const p = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const changed = def !== undefined && value !== def;
  const text = `${value}${unit ? ` ${unit}` : ""}`;
  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!cancel.current && Number.isFinite(n)) set(clamp(n));
    cancel.current = false;
    setEditing(null);
    requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
  };
  const end = () => {
    press.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={box}
      id={id}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={text}
      aria-describedby={hint ? `${id}-hint` : undefined}
      title={hint ? `${hint}\nDrag to set · click the number to type · double-click to reset` : "Drag to set · click the number to type · double-click to reset"}
      data-dragging={dragging || undefined}
      onPointerDown={(e) => {
        if (editing !== null || e.button !== 0) return;
        const live = e.pointerType !== "touch"; // touch decides between a scroll and a slide first
        press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, live };
        if (!live) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        set(at(e.clientX));
      }}
      onPointerMove={(e) => {
        const s = press.current;
        if (!s || e.pointerId !== s.id) return;
        if (!s.live) {
          const dx = Math.abs(e.clientX - s.x);
          const dy = Math.abs(e.clientY - s.y);
          if (dy > 8 && dy > dx) return void (press.current = null); // a scroll
          if (dx < 6) return;
          s.live = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }
        set(at(e.clientX));
      }}
      onPointerUp={(e) => {
        const s = press.current;
        if (s && !s.live && e.pointerId === s.id) set(at(e.clientX)); // a tap sets where it landed
        end();
      }}
      onPointerCancel={end}
      onDoubleClick={() => def !== undefined && set(def)}
      onKeyDown={(e) => {
        if (editing !== null) return;
        const k = e.key;
        const big10 = e.shiftKey ? 10 : 1;
        const to =
          k === "ArrowRight" || k === "ArrowUp" ? value + step * big10
          : k === "ArrowLeft" || k === "ArrowDown" ? value - step * big10
          : k === "PageUp" ? value + (max - min) / 10
          : k === "PageDown" ? value - (max - min) / 10
          : k === "Home" ? min
          : k === "End" ? max
          : null;
        if (to !== null) {
          e.preventDefault();
          set(k === "Home" || k === "End" ? to : snap(to));
        } else if (k === "Enter" || k === "F2") {
          e.preventDefault();
          setEditing(String(value));
        } else if ((k === "Backspace" || k === "Delete") && def !== undefined) {
          e.preventDefault();
          set(def);
        } else if (/^[0-9.\-]$/.test(k)) {
          e.preventDefault();
          setEditing(k);
        }
      }}
      className={`group/sl relative flex cursor-ew-resize touch-pan-y select-none items-center overflow-hidden rounded-md bg-surface shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-100 hover:shadow-[inset_0_0_0_1px_var(--fg-3)] focus-visible:shadow-[inset_0_0_0_1px_var(--fg),0_0_0_3px_var(--accent-soft)] dark:bg-surface-2 ${big ? "h-11" : "h-8"}`}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 bg-[var(--slider-fill)] transition-colors duration-150 group-hover/sl:bg-[var(--slider-fill-hover)] group-data-[dragging]/sl:bg-[var(--slider-fill-hover)]" style={{ width: `${p * 100}%` }} />
      <span
        aria-hidden
        className="absolute top-1/2 w-[2px] -translate-y-1/2 rounded-full bg-fg/60 opacity-0 transition-[height,opacity] duration-150 ease-out group-hover/sl:opacity-100 group-focus-visible/sl:opacity-100 group-data-[dragging]/sl:bg-fg group-data-[dragging]/sl:opacity-100"
        style={{ left: `max(2px, calc(${p * 100}% - 2px))`, height: dragging ? (big ? 22 : 16) : big ? 16 : 12 }}
      />
      <span className={`relative min-w-0 flex-1 truncate pl-2.5 ${big ? "text-ui" : "text-body"} ${changed ? "font-medium text-fg" : "text-fg-2"}`}>{label}</span>
      {editing !== null ? (
        <input
          autoFocus
          aria-label={`${label}: type a value`}
          inputMode="decimal"
          defaultValue={editing}
          onPointerDown={(e) => e.stopPropagation()}
          onFocus={(e) => (editing.length > 1 ? e.currentTarget.select() : e.currentTarget.setSelectionRange(1, 1))}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
            else if (e.key === "Escape") {
              cancel.current = true;
              e.currentTarget.blur();
            }
          }}
          className={`relative mr-1 h-[calc(100%-8px)] w-[84px] rounded bg-surface px-1.5 text-right tabular-nums text-fg shadow-[inset_0_0_0_1px_var(--fg)] outline-none ${big ? "text-[16px]" : "text-body"}`}
        />
      ) : (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={() => setEditing(String(value))}
          className={`relative flex h-full shrink-0 cursor-text items-center pl-2 pr-2.5 tabular-nums text-fg decoration-fg-3 decoration-dotted underline-offset-4 hover:underline ${unit && /^[a-z]/i.test(unit) ? "gap-1" : ""} ${big ? "text-ui" : "text-body"}`}
        >
          {value}
          {unit && <span className="text-fg-2">{unit}</span>}
        </button>
      )}
      {hint && (
        <span id={`${id}-hint`} className="sr-only">
          {hint}
        </span>
      )}
    </div>
  );
}

const AUTO_SWATCH = "linear-gradient(135deg, #ffffff 0 50%, #1c2024 50% 100%)";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const longHex = (h: string) => (h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h).toLowerCase();

export { ColorInput as ColorField };

function ColorInput({ id, value, def, set, label, big }: { id: string; value: string; def: Value; set: (v: string) => void; label: string; big?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const auto = value === "";
  const commit = () => {
    const v = (draft ?? "").trim();
    if (HEX.test(v)) set(longHex(v));
    else if (v === "" && draft !== null && def === "") set("");
    setDraft(null);
  };
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className={`relative shrink-0 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg ${big ? "h-10 w-10" : "h-7 w-7"}`}
        style={{ background: auto ? AUTO_SWATCH : value }}
      >
        <input type="color" aria-label={`${label}: pick a colour`} value={auto ? "#808080" : value} onChange={(e) => set(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
      <input
        id={id}
        value={draft ?? (auto ? "" : value.toUpperCase())}
        placeholder="Auto"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`${field} mono min-w-0 uppercase placeholder:font-sans placeholder:normal-case placeholder:text-fg-3 ${big ? "h-10 w-[112px] px-3 text-[16px]" : "h-7 w-[84px] px-2 text-caption"}`}
      />
      {def === "" && !auto && (
        <IconButton label="Back to auto (follows theme)" size={big ? "lg" : "sm"} onClick={() => set("")}>
          <X size={big ? 16 : 13} weight="bold" />
        </IconButton>
      )}
    </span>
  );
}

function SelectInput({ id, s, value, set, big, labelledBy }: { id: string; s: Sel; value: string; set: (v: string) => void; big?: boolean; labelledBy: string }) {
  if (s.options.length <= 3 && s.options.join("").length <= 18)
    return <Segmented size={big ? "lg" : "sm"} full={big} labelledBy={labelledBy} value={value} onChange={set} options={s.options.map((o) => ({ value: o, label: o }))} />;
  return (
    <span className="relative min-w-0 flex-1">
      <select id={id} value={value} onChange={(e) => set(e.target.value)} className={`${field} w-full cursor-pointer appearance-none truncate pl-2.5 pr-7 ${big ? "h-10 text-[16px]" : "h-7 text-body"}`}>
        {s.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <CaretUpDown size={12} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-3" />
    </span>
  );
}

export function Curve({ value, size = 24, className = "" }: { value: string; size?: number; className?: string }) {
  const [x1, y1, x2, y2] = bezier(value);
  return (
    <svg viewBox="-6 -10 52 60" width={size} height={size} aria-hidden className={`shrink-0 ${className}`}>
      <path d="M0 40 L40 0" stroke="var(--line-strong)" strokeWidth="2" fill="none" />
      <path d={`M0 40 C${x1 * 40} ${40 - y1 * 40} ${x2 * 40} ${40 - y2 * 40} 40 0`} stroke="var(--fg)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function EasingInput({ id, value, set, big }: { id: string; value: string; set: (v: string) => void; big?: boolean }) {
  const preset = EASINGS.find(([, v]) => v === value)?.[0] ?? "Custom";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <Curve value={value} size={big ? 32 : 22} />
      <span className="relative min-w-0 flex-1">
        <select
          id={id}
          value={preset}
          onChange={(e) => e.target.value !== "Custom" && set(EASINGS.find(([n]) => n === e.target.value)![1])}
          className={`${field} w-full cursor-pointer appearance-none truncate pl-2.5 pr-7 ${big ? "h-10 text-[16px]" : "h-7 text-body"}`}
        >
          {EASINGS.map(([n]) => (
            <option key={n}>{n}</option>
          ))}
          <option>Custom</option>
        </select>
        <CaretUpDown size={12} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-3" />
      </span>
    </span>
  );
}

/** Just the four control points; the cubic-bezier() around them is implied. */
function CustomCurve({ id, value, set, big }: { id: string; value: string; set: (v: string) => void; big?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="relative flex min-w-0 flex-1 items-center">
      <span aria-hidden className={`mono pointer-events-none absolute left-2.5 text-fg-3 ${big ? "text-[15px]" : "text-caption"}`}>
        cubic-bezier
      </span>
      <input
        aria-label="Custom cubic-bezier: x1, y1, x2, y2"
        id={`${id}-custom`}
        value={draft ?? bezier(value).join(", ")}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = bezier(draft ?? "");
          if (draft !== null && n.length === 4) set(`cubic-bezier(${n.join(", ")})`);
          setDraft(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`${field} mono w-full pr-2.5 text-right ${big ? "h-10 pl-32 text-[15px]" : "h-7 pl-24 text-caption"}`}
      />
    </span>
  );
}

function ResetButton({ label, onClick, big }: { label: string; onClick: () => void; big?: boolean }) {
  return (
    <IconButton label={`Reset ${label}`} size={big ? "md" : "sm"} onClick={onClick}>
      <ArrowCounterClockwise size={big ? 15 : 13} />
    </IconButton>
  );
}

/* ---------------- one property ---------------- */

interface RowProps {
  k: string;
  s: ParamSpec;
  value: Value;
  def: Value;
  set: (v: Value) => void;
  big?: boolean;
}

/** The control for one property, without its label. */
function Control({ s, value, set, def, big, id }: RowProps & { id: string }) {
  const lab = `${id}-label`;
  if (s.type === "number") return <SliderField id={id} label={s.label} value={Number(value)} min={s.min} max={s.max} step={s.step} unit={s.unit} def={Number(def)} set={set} big={big} hint={s.hint} />;
  if (s.type === "color") return <ColorInput id={id} value={String(value)} def={def} set={set} label={s.label} big={big} />;
  if (s.type === "boolean") return <Switch id={id} on={!!value} onChange={set} labelledBy={lab} size={big ? "lg" : "md"} />;
  if (s.type === "select") return <SelectInput id={id} s={s} value={String(value)} set={set} big={big} labelledBy={lab} />;
  if (s.type === "text")
    return <input id={id} value={String(value)} onChange={(e) => set(e.target.value)} className={`${field} w-full min-w-0 px-2.5 ${big ? "h-10 text-[16px]" : "h-7 text-body"}`} />;
  return <EasingInput id={id} value={String(value)} set={set} big={big} />;
}

/** Inspector row: a number is one slider field; anything else is its label on the left (it wraps, never truncates)
    and its control on the right, at the slider's height. */
export function ParamRow(p: RowProps) {
  const { k, s, value, def, set, big } = p;
  const id = `p-${k}`;
  const changed = value !== def;
  if (s.type === "number")
    return (
      <div className={big ? "py-1" : "py-[3px]"}>
        <Control {...p} id={id} />
      </div>
    );
  const custom = s.type === "easing" && !EASINGS.some(([, v]) => v === value);
  const width = s.type === "text" ? "w-[56%]" : s.type === "easing" || (s.type === "select" && s.options.join("").length > 18) ? "w-[52%]" : "";
  return (
    <div className={big ? "py-1" : "py-[3px]"}>
      <div className={`flex items-center gap-3 ${big ? "min-h-11" : "min-h-8"}`}>
        <div className="flex min-w-0 flex-1 items-center gap-0.5 pl-2.5">
          <label id={`${id}-label`} htmlFor={id} title={s.hint} className={`min-w-0 ${big ? "text-ui" : "text-body"} ${changed ? "font-medium text-fg" : "text-fg-2"}`}>
            {s.label}
            {s.hint && <span className="sr-only">. {s.hint}</span>}
          </label>
          {changed && <ResetButton big={big} label={s.label} onClick={() => set(def)} />}
        </div>
        <div className={`flex shrink-0 items-center justify-end gap-2 ${width}`}>
          <Control {...p} id={id} />
        </div>
      </div>
      {custom && (
        <div className="mt-1.5 flex">
          <CustomCurve id={id} value={String(value)} set={set} big={big} />
        </div>
      )}
    </div>
  );
}

/* ---------------- phone: one property at a time, chips underneath ---------------- */

/** A scrolling row of chips that picks what the strip above it shows. */
export function ChipTabs<T extends string>({
  label,
  items,
  value,
  onChange,
  panel,
}: {
  label: string;
  items: { id: T; label: string; edited?: boolean; sep?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  /** the id of the strip the chips control */
  panel: string;
}) {
  const chips = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    // braces matter: scrollIntoView returns a promise in current Chrome, and an effect may only return a cleanup
    chips.current.get(value)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(e) =>
        rove(
          e,
          items.map((i) => i.id),
          value,
          onChange,
          "tab",
        )
      }
      className="no-scrollbar flex min-w-0 flex-1 scroll-px-6 items-center gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)]"
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Fragment key={it.id}>
            {it.sep && <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-line-strong" />}
            <button
              ref={(el) => {
                if (el) chips.current.set(it.id, el);
                else chips.current.delete(it.id);
              }}
              type="button"
              role="tab"
              id={`${panel}-chip-${it.id}`}
              aria-selected={on}
              aria-controls={panel}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(it.id)}
              className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-body font-medium ${on ? "bg-fg text-surface" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)]"}`}
            >
              {it.label}
              {it.edited && (
                <>
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? "bg-surface" : "bg-fg"}`} />
                  <span className="sr-only">(changed)</span>
                </>
              )}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/** The phone's tuning bar: the picked property in one 44pt row, the chips that pick it under that. */
export function AdjustBar({ anim, values, setParam, onShowAll }: { anim: AnimMeta; values: Values; setParam: (k: string, v: Value) => void; onShowAll: () => void }) {
  const groups = groupSchema(anim);
  const keys = groups.flatMap(([, l]) => l.map(([k]) => k));
  const [active, setActive] = useState(keys[0]);
  const k = keys.includes(active) ? active : keys[0];
  if (!k) return null;
  const s = anim.schema[k];
  const value = values[k];
  const def = anim.params[k];
  const set = (v: Value) => setParam(k, v);
  const id = `m-${k}`;
  const changed = value !== def;
  const items = groups.flatMap(([, list], gi) => list.map(([key, spec], i) => ({ id: key, label: spec.label, edited: values[key] !== anim.params[key], sep: gi > 0 && i === 0 })));

  return (
    <section aria-label="Adjust" className="shrink-0 border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      <div id="adjust-panel" role="tabpanel" aria-labelledby={`adjust-panel-chip-${k}`} className="px-3 pt-3">
        {s.type === "number" ? (
          <Control k={k} s={s} value={value} def={def} set={set} big id={id} />
        ) : (
          <div className={`flex h-11 items-center gap-2 ${s.type === "boolean" ? "rounded-md bg-surface pl-3 pr-1 shadow-[inset_0_0_0_1px_var(--line-strong)] dark:bg-surface-2" : "pl-1"}`}>
            <label id={`${id}-label`} htmlFor={id} title={s.hint} className={`min-w-0 flex-1 truncate text-ui ${changed ? "font-medium text-fg" : "text-fg-2"}`}>
              {s.label}
            </label>
            {changed && <ResetButton big label={s.label} onClick={() => set(def)} />}
            <span className={`flex min-w-0 items-center justify-end ${s.type === "boolean" ? "shrink-0 pr-1" : "max-w-[62%]"}`}>
              <Control k={k} s={s} value={value} def={def} set={set} big id={id} />
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 py-2.5 pl-3">
        <ChipTabs label="Properties" items={items} value={k} onChange={setActive} panel="adjust-panel" />
        <span className="shrink-0 pr-2">
          <IconButton label="All properties" size="lg" onClick={onShowAll}>
            <SlidersHorizontal size={18} />
          </IconButton>
        </span>
      </div>
    </section>
  );
}
