import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowCounterClockwise, CaretUpDown, ListBullets, X } from "@phosphor-icons/react";
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

function NumberInput({ id, s, value, set, big }: { id: string; s: Num; value: number; set: (v: number) => void; big?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancel = useRef(false);
  const step = s.step ?? 1;
  const fix = (n: number) => Number(Math.min(s.max, Math.max(s.min, n)).toFixed(decimals(step)));
  const commit = () => {
    const n = parseFloat(draft ?? "");
    if (!cancel.current && Number.isFinite(n)) set(fix(n));
    cancel.current = false;
    setDraft(null);
  };
  return (
    <span className={`relative flex shrink-0 items-center ${big ? "w-[104px]" : "w-[76px]"}`}>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            cancel.current = true;
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setDraft(null);
            set(fix(value + (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1)));
          }
        }}
        style={{ paddingRight: s.unit ? 14 + s.unit.length * 7 : 10 }}
        className={`${field} w-full text-right tabular-nums ${big ? "h-10 pl-3 text-[16px]" : "h-7 pl-2 text-body"}`}
      />
      {s.unit && (
        <span aria-hidden className="pointer-events-none absolute right-2 text-caption text-fg-3">
          {s.unit}
        </span>
      )}
    </span>
  );
}

function Slider({ s, value, set, label, big }: { s: Num; value: number; set: (v: number) => void; label: string; big?: boolean }) {
  const pct = ((value - s.min) / (s.max - s.min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      aria-valuetext={`${value}${s.unit ? ` ${s.unit}` : ""}`}
      min={s.min}
      max={s.max}
      step={s.step ?? 1}
      value={value}
      onChange={(e) => set(Number(e.target.value))}
      className={`range ${big ? "range-lg" : ""}`}
      style={{ "--p": `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties}
    />
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
function Control({ k, s, value, set, def, big, id }: RowProps & { id: string }) {
  const lab = `${id}-label`;
  if (s.type === "number")
    return (
      <>
        <Slider s={s} value={Number(value)} set={set} label={s.label} big={big} />
        <NumberInput id={id} s={s} value={Number(value)} set={set} big={big} />
      </>
    );
  if (s.type === "color") return <ColorInput id={id} value={String(value)} def={def} set={set} label={s.label} big={big} />;
  if (s.type === "boolean") return <Switch id={id} on={!!value} onChange={set} labelledBy={lab} size={big ? "lg" : "md"} />;
  if (s.type === "select") return <SelectInput id={id} s={s} value={String(value)} set={set} big={big} labelledBy={lab} />;
  if (s.type === "text")
    return <input id={id} value={String(value)} onChange={(e) => set(e.target.value)} className={`${field} w-full min-w-0 px-2.5 ${big ? "h-10 text-[16px]" : "h-7 text-body"}`} />;
  return <EasingInput id={id} value={String(value)} set={set} big={big} />;
}

/** Inspector row: label on the left (it wraps, never truncates), control on the right; numbers put a full-width slider underneath. */
export function ParamRow(p: RowProps) {
  const { k, s, value, def, set, big } = p;
  const id = `p-${k}`;
  const changed = value !== def;
  const custom = s.type === "easing" && !EASINGS.some(([, v]) => v === value);
  const width = s.type === "text" ? "w-[56%]" : s.type === "easing" || (s.type === "select" && s.options.join("").length > 18) ? "w-[52%]" : "";
  return (
    <div className={big ? "py-2" : "py-1"}>
      <div className={`flex items-center gap-3 ${big ? "min-h-10" : "min-h-8"}`}>
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <label id={`${id}-label`} htmlFor={id} title={s.hint} className={`min-w-0 ${big ? "text-ui" : "text-body"} ${changed ? "font-medium text-fg" : "text-fg-2"}`}>
            {s.label}
            {s.hint && <span className="sr-only">. {s.hint}</span>}
          </label>
          {changed && <ResetButton big={big} label={s.label} onClick={() => set(def)} />}
        </div>
        <div className={`flex shrink-0 items-center justify-end gap-2 ${width}`}>
          {s.type === "number" ? <NumberInput id={id} s={s} value={Number(value)} set={set} big={big} /> : <Control {...p} id={id} />}
        </div>
      </div>
      {s.type === "number" && (
        <div className={big ? "mt-0.5" : "-mt-0.5"}>
          <Slider s={s} value={Number(value)} set={set} label={s.label} big={big} />
        </div>
      )}
      {custom && (
        <div className="mt-1.5 flex">
          <CustomCurve id={id} value={String(value)} set={set} big={big} />
        </div>
      )}
    </div>
  );
}

/* ---------------- phone: one property at a time, chips underneath ---------------- */

export function AdjustBar({ anim, values, setParam, onShowAll }: { anim: AnimMeta; values: Values; setParam: (k: string, v: Value) => void; onShowAll: () => void }) {
  const groups = groupSchema(anim);
  const keys = groups.flatMap(([, l]) => l.map(([k]) => k));
  const [active, setActive] = useState(keys[0]);
  const k = keys.includes(active) ? active : keys[0];
  const chips = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    // braces matter: scrollIntoView returns a promise in current Chrome, and an effect may only return a cleanup
    chips.current.get(k)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [k]);

  if (!k) return null;
  const s = anim.schema[k];
  const value = values[k];
  const def = anim.params[k];
  const set = (v: Value) => setParam(k, v);
  const id = `m-${k}`;
  const changed = value !== def;
  const head = (right?: ReactNode) => (
    <div className="flex min-h-10 items-center gap-1">
      <label id={`${id}-label`} htmlFor={id} className="min-w-0 truncate text-ui font-medium">
        <span className="font-normal text-fg-3">{s.group ?? "General"} · </span>
        {s.label}
      </label>
      {changed && <ResetButton big label={s.label} onClick={() => set(def)} />}
      {right && <span className="ml-auto flex shrink-0 items-center pl-2">{right}</span>}
    </div>
  );

  let body: ReactNode;
  if (s.type === "number")
    body = (
      <>
        {head(<NumberInput id={id} s={s} value={Number(value)} set={set} big />)}
        <Slider s={s} value={Number(value)} set={set} label={s.label} big />
      </>
    );
  else if (s.type === "boolean")
    body = (
      <>
        {head(<Switch id={id} on={!!value} onChange={set} labelledBy={`${id}-label`} size="lg" />)}
        {s.hint && <p className="line-clamp-2 text-caption text-fg-3">{s.hint}</p>}
      </>
    );
  else
    body = (
      <>
        {head()}
        <div className="flex items-center gap-2">
          <Control k={k} s={s} value={value} def={def} set={set} big id={id} />
        </div>
      </>
    );

  return (
    <section aria-label="Adjust" className="shrink-0 border-t bg-surface">
      <div id="adjust-panel" role="tabpanel" aria-labelledby={`chip-${k}`} className="flex h-[100px] flex-col justify-center gap-1 px-4">
        {body}
      </div>
      <div className="flex items-center gap-2 pb-3 pl-3">
        <IconButton label="All properties" size="lg" onClick={onShowAll} className="bg-surface-2">
          <ListBullets size={18} />
        </IconButton>
        <div
          role="tablist"
          aria-label="Properties"
          onKeyDown={(e) => rove(e, keys, k, setActive, "tab")}
          className="no-scrollbar flex min-w-0 flex-1 scroll-px-6 items-center gap-1.5 overflow-x-auto pr-3 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)]"
        >
          {groups.map(([g, list], gi) => (
            <Fragment key={g}>
              {gi > 0 && <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line-strong" />}
              {list.map(([key, spec]) => {
                const on = key === k;
                const edited = values[key] !== anim.params[key];
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      if (el) chips.current.set(key, el);
                      else chips.current.delete(key);
                    }}
                    type="button"
                    role="tab"
                    id={`chip-${key}`}
                    aria-selected={on}
                    aria-controls="adjust-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setActive(key)}
                    className={`press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-body font-medium ${on ? "bg-fg text-surface" : "bg-surface-2 text-fg-2 shadow-[inset_0_0_0_1px_var(--line)]"}`}
                  >
                    {spec.label}
                    {edited && (
                      <>
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? "bg-surface" : "bg-fg"}`} />
                        <span className="sr-only">(changed)</span>
                      </>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
