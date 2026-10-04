import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowCounterClockwise,
  CaretRight,
  CaretUpDown,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  FileCode,
  FileZip,
  Lightbulb,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AnimMeta, Value, Values } from "./registry";
import { breakpoint, viewport, type Device } from "./devices";
import { detectHost, deviceLoad, type Level, type Perf, type Suggestion } from "./suggest";
import { exportFiles, paramsModule } from "./exporter";
import { ParamRow, field, groupSchema } from "./controls";
import { Button, CATEGORY_ICON, Count, IconButton, TRIGGER, Tabs, type Icon } from "./ui";

export type { Perf };
export type Tab = "props" | "perf" | "suggest" | "export";

/** Everything the panels read and change. */
export interface Ctx {
  anim: AnimMeta;
  values: Values;
  overrides: Values;
  setParam: (k: string, v: Value) => void;
  resetParams: () => void;
  devices: Device[];
  perf: Record<string, Perf>;
  reduce: boolean;
  setReduce: (v: boolean) => void;
  nativeDpr: boolean;
  setNativeDpr: (v: boolean) => void;
  hostTflops: number;
  setHostTflops: (v: number) => void;
  landscape: boolean;
  suggestions: Suggestion[];
  exporting: boolean;
  exportZip: () => void;
  /** touch sizing, for the phone sheets */
  big?: boolean;
  /** Screen mode with no layer picked: what the per-animation panels say instead */
  empty?: string;
  /** Screen mode: each layer's own numbers, for the Performance panel */
  breakdown?: { id: string; name: string; perf?: Perf }[];
}

export const TAB_LABEL: Record<Tab, string> = { props: "Properties", perf: "Performance", suggest: "Audit", export: "Code" };
const FREQ = { constant: "Always on screen", frequent: "Seen often", occasional: "Seen occasionally", rare: "Seen rarely" };

export const issueCount = (list: Suggestion[]) => list.filter((s) => s.level === "error" || s.level === "warn").length;
export const changedCount = (a: AnimMeta, o: Values) => Object.entries(o).filter(([k, v]) => v !== a.params[k]).length;

type Tone = "good" | "warn" | "bad" | "idle";
const DOT: Record<Tone, string> = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", idle: "bg-fg-3/40" };
export const Dot = ({ tone, className = "" }: { tone: Tone; className?: string }) => <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[tone]} ${className}`} />;

/** Share of the device's frame budget, in words. */
export const verdict = (x: number): [string, Tone] => (x > 1 ? ["Over budget", "bad"] : x > 0.75 ? ["Heavy", "warn"] : x > 0.4 ? ["Moderate", "warn"] : ["Light", "good"]);

/** Worst case across the devices on stage. */
export function health({ devices, perf, hostTflops }: Pick<Ctx, "devices" | "perf" | "hostTflops">) {
  const rows = devices.flatMap((d) => (perf[d.id] ? [{ m: perf[d.id], L: deviceLoad(perf[d.id], d, hostTflops) }] : []));
  if (!rows.length) return null;
  return { fps: Math.min(...rows.map((r) => r.m.fps)), load: Math.max(...rows.map((r) => Math.max(r.L.main, r.L.gpu ?? 0))) };
}

/* ---------------- shell (tablet & desktop) ---------------- */

export default function Inspector({ ctx, tab, setTab, top, head }: { ctx: Ctx; tab: Tab; setTab: (t: Tab) => void; top: ReactNode; head?: ReactNode }) {
  const issues = issueCount(ctx.suggestions);
  return (
    <aside id="inspector" aria-label="Inspector" tabIndex={-1} className="flex w-[320px] shrink-0 flex-col border-l bg-surface outline-none xl:w-[360px]">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">{top}</div>
      {/* the overview scrolls away under sticky tabs, so short screens keep room for the panel */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {head ?? <Overview ctx={ctx} setTab={setTab} issues={issues} />}
        <div className="sticky top-0 z-10 bg-surface">
          <Tabs
            id="insp"
            label="Inspector"
            value={tab}
            onChange={setTab}
            options={(Object.keys(TAB_LABEL) as Tab[]).map((t) => ({ value: t, label: TAB_LABEL[t], badge: t === "suggest" && issues ? <Count n={issues} /> : undefined }))}
          />
        </div>
        <div id="insp-panel" role="tabpanel" aria-labelledby={`insp-tab-${tab}`} tabIndex={0} className="focus-visible:outline-offset-[-2px]">
          <Panel tab={tab} ctx={ctx} />
        </div>
      </div>
    </aside>
  );
}

export function Panel({ tab, ctx }: { tab: Tab; ctx: Ctx }) {
  if (tab === "perf") return <PerformancePanel {...ctx} />;
  if (ctx.empty) return <p className="px-6 py-10 text-center text-body text-fg-3">{ctx.empty}</p>;
  if (tab === "props") return <PropertiesPanel {...ctx} />;
  if (tab === "suggest") return <AuditPanel {...ctx} />;
  return <CodePanel {...ctx} />;
}

function Chip({ icon: I, children }: { icon?: Icon; children: ReactNode }) {
  return (
    <li className="inline-flex h-6 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-caption text-fg-2">
      {I && <I size={13} aria-hidden />}
      {children}
    </li>
  );
}

function Overview({ ctx, setTab, issues }: { ctx: Ctx; setTab: (t: Tab) => void; issues: number }) {
  const { anim } = ctx;
  const T = TRIGGER[anim.behavior.trigger];
  const h = health(ctx);
  const [loadWord, loadTone] = h ? verdict(h.load) : ["Measuring", "idle" as Tone];
  const Cat = CATEGORY_ICON[anim.category];
  return (
    <div className="px-4 pb-4 pt-4">
      <p className="flex items-center gap-1.5 text-caption font-medium text-fg-3">
        <Cat size={14} aria-hidden />
        {anim.category}
      </p>
      <h2 className="mt-1 text-heading font-semibold tracking-[-0.012em]">{anim.name}</h2>
      <p className="mt-1 line-clamp-2 text-body text-fg-2">{anim.blurb}</p>
      <ul aria-label="Behaviour" className="mt-3 flex flex-wrap gap-1.5">
        <Chip icon={T.icon}>{T.label}</Chip>
        <Chip>{FREQ[anim.behavior.frequency]}</Chip>
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Health label="Frame rate" value={h ? `${Math.round(h.fps)} fps` : "—"} tone={!h ? "idle" : h.fps >= 55 ? "good" : h.fps >= 40 ? "warn" : "bad"} onClick={() => setTab("perf")} />
        <Health label="Device load" value={h ? `${Math.round(h.load * 100)}%` : "—"} title={loadWord} tone={loadTone} onClick={() => setTab("perf")} />
        <Health label="Audit" value={issues ? `${issues} to fix` : "All clear"} tone={issues ? "warn" : "good"} onClick={() => setTab("suggest")} />
      </div>
    </div>
  );
}

export function Health({ label, value, tone, onClick, title }: { label: string; value: string; tone: Tone; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className="press min-w-0 rounded-lg bg-surface-2 px-2.5 py-2 text-left hover:bg-surface-3">
      <span className="block truncate text-caption text-fg-2">{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-body font-semibold tabular-nums">
        <Dot tone={tone} />
        <span className="truncate">{value}</span>
      </span>
    </button>
  );
}

/* ---------------- properties ---------------- */

const RM = { full: ["Respects reduced motion", "good"], partial: ["Partly respects reduced motion", "warn"], none: ["Ignores reduced motion", "bad"] } as const;

export function PropertiesPanel({ anim, values, overrides, setParam, resetParams, big }: Ctx) {
  const edited = changedCount(anim, overrides);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 py-2 pl-4 pr-2.5">
        <p className="text-caption text-fg-3" aria-live="polite">
          {edited ? `${edited} changed from the original` : "Original values"}
        </p>
        <Button size="sm" variant="ghost" disabled={!edited} onClick={resetParams}>
          <ArrowCounterClockwise size={13} aria-hidden />
          Reset all
        </Button>
      </div>
      {groupSchema(anim).map(([g, list]) => (
        <section key={g} aria-label={g} className="border-t px-4 pb-2.5 pt-3">
          <h3 className="pb-1 text-caption font-medium text-fg-3">{g}</h3>
          {list.map(([k, s]) => (
            <ParamRow key={k} k={k} s={s} value={values[k]} def={anim.params[k]} set={(v) => setParam(k, v)} big={big} />
          ))}
        </section>
      ))}
      <About anim={anim} />
    </div>
  );
}

function About({ anim }: { anim: AnimMeta }) {
  const [label, tone] = RM[anim.reducedMotion];
  return (
    <section aria-label="About" className="border-t px-4 py-4">
      <h3 className="text-caption font-medium text-fg-3">About</h3>
      <dl className="mt-3 space-y-3.5">
        <div>
          <dt className="text-caption text-fg-3">Reduced motion</dt>
          <dd className="mt-1 flex gap-2 text-body">
            <Dot tone={tone} className="mt-[5px]" />
            <span>
              <span className="font-medium">{label}.</span> <span className="text-fg-2">{anim.reducedMotionNote}</span>
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-caption text-fg-3">Built with</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {anim.tech.map((t) => (
              <span key={t} className="inline-flex h-6 items-center rounded-md bg-surface-2 px-2 text-caption text-fg-2">
                {t}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-fg-3">Source</dt>
          <dd className="mono mt-1 break-words text-caption text-fg-2">{anim.source}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ---------------- performance ---------------- */

const HOSTS: [number, string][] = [
  [2, "Integrated GPU (≈2 TFLOPS)"],
  [4, "Apple M-series or mid laptop (≈4)"],
  [10, "Gaming laptop GPU (≈10)"],
  [20, "Desktop GPU (≈20)"],
];
const HOST = detectHost();

export function PerformancePanel({ devices, perf, hostTflops, setHostTflops, nativeDpr, landscape, breakdown }: Ctx) {
  return (
    <div className="space-y-4 p-4">
      <p className="text-caption text-fg-3">
        Each frame has {(1000 / 120).toFixed(1)} ms at 120 Hz. Main-thread time is measured in the frame; GPU time is scaled to the device's chip, so treat it as an estimate.
      </p>
      {devices.map((d) => (
        <DeviceCard key={d.id} d={d} m={perf[d.id]} hostTflops={hostTflops} nativeDpr={nativeDpr} landscape={landscape} />
      ))}
      {breakdown && breakdown.length > 0 && (
        <section aria-label="By layer" className="rounded-xl border p-4">
          <h3 className="text-body font-semibold">By layer</h3>
          <p className="mt-0.5 text-caption text-fg-3">On {devices[0].name}. Script and GPU add up; frame work is shared by every layer.</p>
          <table className="mt-3 w-full text-caption">
            <thead className="text-fg-3">
              <tr>
                <th className="pb-1.5 text-left font-normal">Layer</th>
                <th className="pb-1.5 text-right font-normal">fps</th>
                <th className="pb-1.5 text-right font-normal">JS</th>
                <th className="pb-1.5 text-right font-normal">GPU</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {breakdown.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="max-w-0 truncate py-1.5 pr-2 font-medium">{b.name}</td>
                  <td className="py-1.5 text-right">{b.perf ? Math.round(b.perf.fps) : "—"}</td>
                  <td className="py-1.5 text-right">{b.perf ? `${b.perf.jsMs.toFixed(2)} ms` : "—"}</td>
                  <td className="py-1.5 text-right">{b.perf?.gpuMs != null ? `${b.perf.gpuMs.toFixed(2)} ms` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <section className="rounded-xl border p-4">
        <label htmlFor="host-gpu" className="text-body font-medium">
          This computer's GPU
        </label>
        <p className="mt-0.5 text-caption text-fg-3">Auto-detected. Correct it if the estimates look off.</p>
        <span className="relative mt-3 block">
          <select id="host-gpu" value={hostTflops} onChange={(e) => setHostTflops(Number(e.target.value))} className={`${field} h-9 w-full cursor-pointer appearance-none pl-3 pr-8 text-body`}>
            {HOSTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <CaretUpDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-2" />
        </span>
        {HOST.name && (
          <p className="mono mt-2 truncate text-caption text-fg-3" title={HOST.name}>
            {HOST.name}
          </p>
        )}
      </section>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-caption text-fg-3">
        <li className="flex items-center gap-1.5">
          <Dot tone="good" /> Compositor only
        </li>
        <li className="flex items-center gap-1.5">
          <Dot tone="warn" /> Repaints
        </li>
        <li className="flex items-center gap-1.5">
          <Dot tone="bad" /> Layout
        </li>
      </ul>
    </div>
  );
}

function DeviceCard({ d, m, hostTflops, nativeDpr, landscape }: { d: Device; m?: Perf; hostTflops: number; nativeDpr: boolean; landscape: boolean }) {
  const v = viewport(d, landscape);
  const L = m && deviceLoad(m, d, hostTflops);
  const [word, tone] = L ? verdict(Math.max(L.main, L.gpu ?? 0)) : ["Measuring…", "idle" as Tone];
  return (
    <section aria-label={d.name} className="rounded-xl border p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-semibold">{d.name}</h3>
          <p className="mt-0.5 text-caption text-fg-3">
            {d.chip} · {d.hz} Hz · {nativeDpr ? `@${d.dpr}x` : "host pixels"} · {breakpoint(v.w)}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-caption font-medium">
          <Dot tone={tone} />
          {word}
        </span>
      </header>
      {!m || !L ? (
        <div aria-hidden className="mt-4 space-y-3">
          <div className="h-1.5 w-full animate-pulse rounded-full bg-surface-2 motion-reduce:animate-none" />
          <div className="h-1.5 w-2/3 animate-pulse rounded-full bg-surface-2 motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3.5">
            {L.gpuMs != null ? (
              <Budget label="GPU" note="estimated on device" ms={L.gpuMs} budget={L.budget} />
            ) : (
              <p className="text-caption text-fg-3">
                {m.gpuKind === "webgl-untimed"
                  ? "This browser doesn't expose GPU timer queries."
                  : m.canvasPx
                    ? "Canvas 2D: the browser doesn't expose its GPU time."
                    : "DOM / SVG: GPU work is compositing, which isn't exposed. See what animates below."}
              </p>
            )}
            <Budget label="Main thread" note="measured" ms={L.mainMs} budget={L.budget} />
          </div>
          <FpsChart data={m.history} hz={d.hz} />
          <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 border-t pt-3.5">
            <Stat label="Dropped" value={`${(m.dropped * 100).toFixed(1)}%`} />
            <Stat label="JS / frame" value={`${m.jsMs.toFixed(2)} ms`} />
            <Stat label="Work p95" value={`${m.workP95.toFixed(1)} ms`} />
            <Stat label="GPU here" value={m.gpuMs != null ? `${m.gpuMs.toFixed(2)} ms` : "—"} />
            <Stat label="Canvas" value={m.canvasPx ? `${(m.canvasPx / 1e6).toFixed(2)} MP` : "—"} />
            <Stat label="Interval" value={`${m.interval.toFixed(1)} ms`} />
          </dl>
          {m.dom.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-caption text-fg-3">Animating every frame</p>
              <ul className="flex flex-wrap gap-1.5">
                {m.dom.slice(0, 10).map((x) => (
                  <li key={x.kind + x.prop} title={`${x.kind} · about ${Math.round(x.perSec)} changes a second`} className="mono inline-flex h-6 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-caption text-fg-2">
                    <Dot tone={x.kind === "composite" ? "good" : x.kind === "paint" ? "warn" : "bad"} />
                    {x.prop}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Budget({ label, note, ms, budget }: { label: string; note: string; ms: number; budget: number }) {
  const x = ms / budget;
  const fill = x > 1 ? "bg-bad" : x > 0.75 ? "bg-warn" : "bg-accent";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-caption">
        <span className="text-fg-3">
          <span className="font-medium text-fg">{label}</span> · {note}
        </span>
        <span className="tabular-nums text-fg-3">
          <span className="font-medium text-fg">{ms.toFixed(1)}</span> / {budget.toFixed(1)} ms
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${label} time per frame`}
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Number(ms.toFixed(2))}
        aria-valuetext={`${ms.toFixed(1)} of ${budget.toFixed(1)} milliseconds`}
        className="h-1.5 overflow-hidden rounded-full bg-surface-3"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, x * 100)}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-fg-3">{label}</dt>
      <dd className="mt-0.5 truncate text-body font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function FpsChart({ data, hz }: { data: number[]; hz: number }) {
  if (data.length < 2) return null;
  const max = Math.max(hz, ...data) * 1.05;
  const y = (f: number) => 40 - (f / max) * 38;
  const pts = data.map((f, i) => `${(i / (data.length - 1)) * 100},${y(f).toFixed(2)}`).join(" ");
  return (
    <figure className="mt-4">
      <figcaption className="mb-1.5 flex justify-between text-caption text-fg-3">
        <span>Frame rate on this computer</span>
        <span className="tabular-nums">
          <span className="font-medium text-fg">{Math.round(data[data.length - 1])}</span> fps
        </span>
      </figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden>
        {[hz, 60].map((f) => (
          <line key={f} x1="0" x2="100" y1={y(f)} y2={y(f)} stroke="var(--line-strong)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
        <polyline points={`0,40 ${pts} 100,40`} fill="var(--accent-soft)" stroke="none" />
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}

/* ---------------- audit ---------------- */

const LEVEL: Record<Level, { icon: Icon; tone: string; sr: string }> = {
  error: { icon: WarningCircle, tone: "text-bad-ink", sr: "Problem" },
  warn: { icon: Warning, tone: "text-warn-ink", sr: "Warning" },
  tip: { icon: Lightbulb, tone: "text-accent-ink", sr: "Tip" },
  pass: { icon: CheckCircle, tone: "text-good-ink", sr: "Passing" },
};

export function AuditPanel({ suggestions: list, setParam, setReduce, setNativeDpr, big }: Ctx) {
  const fix = list.filter((s) => s.level === "error" || s.level === "warn");
  const tips = list.filter((s) => s.level === "tip");
  const pass = list.filter((s) => s.level === "pass");
  const act = (s: Suggestion) => (s.fix ? setParam(s.fix.key, s.fix.value) : s.action === "reduce" ? setReduce(true) : setNativeDpr(true));
  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="grid grid-cols-3 gap-2">
          <Tally n={fix.length} label="To fix" tone={fix.length ? "warn" : "good"} />
          <Tally n={tips.length} label="Tips" tone="idle" />
          <Tally n={pass.length} label="Passing" tone="good" />
        </div>
        <p className="mt-3 text-caption text-fg-3">Checked against Emil Kowalski's motion rules, your current values and what the stage measured. Reduced motion comes first.</p>
      </div>
      {fix.length > 0 && <Group title="Needs attention" items={fix} act={act} big={big} />}
      {tips.length > 0 && <Group title="Tips" items={tips} act={act} big={big} />}
      {pass.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md text-caption font-medium text-fg-3 hover:text-fg [&::-webkit-details-marker]:hidden">
            <CaretRight size={12} weight="bold" aria-hidden className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
            Passing · {pass.length}
          </summary>
          <ul className="mt-3 space-y-2.5">
            {pass.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-body">
                <CheckCircle size={16} weight="fill" aria-hidden className="mt-px shrink-0 text-good-ink" />
                <span>
                  <span className="sr-only">Passing: </span>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Tally({ n, label, tone }: { n: number; label: string; tone: Tone }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="flex items-center gap-1.5 text-title font-semibold tabular-nums">
        <Dot tone={tone} />
        {n}
      </p>
      <p className="text-caption text-fg-2">{label}</p>
    </div>
  );
}

function Group({ title, items, act, big }: { title: string; items: Suggestion[]; act: (s: Suggestion) => void; big?: boolean }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-caption font-medium text-fg-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((s, i) => {
          const L = LEVEL[s.level];
          return (
            <li key={i} className="flex gap-3 rounded-xl border p-3.5">
              <L.icon size={18} weight="fill" aria-hidden className={`mt-px shrink-0 ${L.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-fg-3">
                  <span className="sr-only">{L.sr}, </span>
                  {s.tag}
                </p>
                <h4 className="mt-0.5 text-body font-semibold">{s.title}</h4>
                <p className="mt-1 text-body text-fg-2">{s.body}</p>
                {s.code && (
                  <details className="group mt-2">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-caption font-medium text-accent-ink [&::-webkit-details-marker]:hidden">
                      <CaretRight size={11} weight="bold" aria-hidden className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
                      Show code
                    </summary>
                    <div className="mt-2">
                      <Code code={s.code} />
                    </div>
                  </details>
                )}
                {(s.fix || s.action) && (
                  <Button size={big ? "md" : "sm"} className="mt-3" onClick={() => act(s)}>
                    {s.fix ? s.fix.label : s.action === "reduce" ? "Emulate reduced motion" : "Use native pixels"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- code ---------------- */

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  return [copied, copy] as const;
}

export function Code({ code }: { code: string }) {
  const [copied, copy] = useCopy();
  return (
    <div className="relative">
      <pre className="mono scroll-thin max-h-[360px] overflow-auto rounded-xl border bg-surface-2 p-3 pr-11 text-caption leading-[1.6] text-fg">{code}</pre>
      <span className="absolute right-1.5 top-1.5">
        <IconButton label={copied ? "Copied" : "Copy"} size="sm" tipAlign="end" onClick={() => copy(code)} className="bg-surface shadow-xs dark:bg-surface-3">
          {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
        </IconButton>
      </span>
    </div>
  );
}

const size = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function CodePanel({ anim, values, overrides, exporting, exportZip, big }: Ctx) {
  const [files, setFiles] = useState<[string, number][] | null>(null);
  const [copied, copy] = useCopy();
  useEffect(() => {
    let live = true;
    setFiles(null);
    exportFiles(anim, values).then((f) => live && setFiles(Object.entries(f).map(([k, x]) => [k, typeof x === "string" ? new Blob([x]).size : x.byteLength])));
    return () => {
      live = false;
    };
  }, [anim, values]);
  const edited = changedCount(anim, overrides);
  const preview = anim.html ? `/* @engine:params */\nconst params = ${JSON.stringify(values, null, 2)};\n/* @engine:end */` : paramsModule(anim, values);
  return (
    <div className="space-y-5 p-4">
      <section aria-label="Export" className="rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
            <FileZip size={20} />
          </span>
          <div className="min-w-0">
            <p className="mono truncate text-body font-medium">{anim.id}-export.zip</p>
            <p className="mt-0.5 text-caption text-fg-2">
              The source with {edited ? `your ${edited} change${edited > 1 ? "s" : ""}` : "the current values"} baked in{anim.html ? ", engine bridge removed" : ""}, plus a README and params.json.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" size={big ? "lg" : "md"} className="flex-1" disabled={exporting} onClick={exportZip}>
            <DownloadSimple size={16} weight="bold" aria-hidden />
            {exporting ? "Packing…" : "Download .zip"}
          </Button>
          <Button size={big ? "lg" : "md"} onClick={() => copy(JSON.stringify(values, null, 2))}>
            {copied ? <Check size={15} weight="bold" aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? "Copied" : "Copy values"}
          </Button>
        </div>
      </section>
      {anim.deps && (
        <section aria-label="Install">
          <h3 className="mb-2 text-caption font-medium text-fg-3">Install</h3>
          <Code code={`npm i ${anim.deps.join(" ")}`} />
        </section>
      )}
      <section aria-label="Files">
        <h3 className="mb-2 text-caption font-medium text-fg-3">Files{files ? ` · ${files.length}` : ""}</h3>
        {!files ? (
          <div aria-hidden className="h-24 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            {files.map(([f, n]) => (
              <li key={f} className="flex items-center gap-2.5 px-3 py-2">
                <FileCode size={15} aria-hidden className="shrink-0 text-fg-3" />
                <span className="mono min-w-0 truncate text-caption">{f}</span>
                <span className="ml-auto shrink-0 text-caption tabular-nums text-fg-3">{size(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Tuned values">
        <h3 className="mb-2 text-caption font-medium text-fg-3">{anim.html ? "Baked into index.html" : `${anim.id}/params.ts`}</h3>
        <Code code={preview} />
      </section>
    </div>
  );
}
