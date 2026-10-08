import { useState, type ReactNode } from "react";
import { CaretUpDown, Check, Copy, Cube, FileZip, Terminal, Warning, WarningCircle } from "@phosphor-icons/react";
import type { AnimMeta, Value, Values } from "./registry";
import { type Device } from "./devices";
import { detectHost, deviceLoad, type Perf, type Suggestion } from "./suggest";
import { ParamRow, field, groupSchema } from "./controls";
import { Button, MenuItem, Switch } from "./ui";

export type { Perf };

export const issueCount = (list: Suggestion[]) => list.filter((s) => s.level === "error" || s.level === "warn").length;
export const changedCount = (a: AnimMeta, o: Values) => Object.entries(o).filter(([k, v]) => v !== a.params[k]).length;

type Tone = "good" | "warn" | "bad" | "idle";
const DOT: Record<Tone, string> = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", idle: "bg-fg-3/40" };
export const Dot = ({ tone, className = "" }: { tone: Tone; className?: string }) => <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]} ${className}`} />;

/** Share of the device's frame budget, in words. */
export const verdict = (x: number): [string, Tone] => (x > 1 ? ["Over budget", "bad"] : x > 0.75 ? ["Heavy", "warn"] : x > 0.4 ? ["Moderate", "warn"] : ["Light", "good"]);
export const fpsTone = (fps: number): Tone => (fps >= 55 ? "good" : fps >= 40 ? "warn" : "bad");

/** Worst case across the devices on stage. */
export function health(devices: Device[], perf: Record<string, Perf>, hostTflops: number) {
  const rows = devices.flatMap((d) => (perf[d.id] ? [{ m: perf[d.id], L: deviceLoad(perf[d.id], d, hostTflops) }] : []));
  if (!rows.length) return null;
  return { fps: Math.min(...rows.map((r) => r.m.fps)), load: Math.max(...rows.map((r) => Math.max(r.L.main, r.L.gpu ?? 0))) };
}

/* ---------------- shell (tablet & desktop): one job at a time, under its own header ---------------- */

export default function Inspector({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <aside id="inspector" aria-label={title} tabIndex={-1} className="flex w-[288px] shrink-0 flex-col border-l bg-surface outline-none xl:w-[312px]">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b pl-4 pr-2.5">
        <h2 className="mr-auto text-body font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}

/* ---------------- properties ---------------- */

export function PropertiesPanel({ anim, values, setParam, big, cols }: { anim: AnimMeta; values: Values; setParam: (k: string, v: Value) => void; big?: boolean; cols?: boolean }) {
  const groups = groupSchema(anim);
  if (!groups.length) return <p className="px-6 py-10 text-center text-body text-fg-3">This one has nothing to tune.</p>;
  return (
    <div className={cols ? "columns-2 gap-0 pb-2 [column-rule:1px_solid_var(--line)]" : "pb-2"}>
      {groups.map(([g, list]) => (
        <section key={g} aria-label={g} className={`break-inside-avoid px-4 pb-3 pt-3.5 ${cols ? "" : "border-b last:border-b-0"}`}>
          <h3 className="pb-1.5 text-caption font-medium text-fg-3">{g}</h3>
          {list.map(([k, s]) => (
            <ParamRow key={k} k={k} s={s} value={values[k]} def={anim.params[k]} set={(v) => setParam(k, v)} big={big} />
          ))}
        </section>
      ))}
    </div>
  );
}

/* ---------------- insights: frame rate, device load and what to fix, behind one chip ---------------- */

const HOSTS: [number, string][] = [
  [2, "Integrated GPU (≈2 TFLOPS)"],
  [4, "Apple M-series or mid laptop (≈4)"],
  [10, "Gaming laptop GPU (≈10)"],
  [20, "Desktop GPU (≈20)"],
];
const HOST = detectHost();

export function Insights({
  devices,
  perf,
  hostTflops,
  setHostTflops,
  nativeDpr,
  setNativeDpr,
  suggestions,
  act,
  breakdown,
}: {
  devices: Device[];
  perf: Record<string, Perf>;
  hostTflops: number;
  setHostTflops: (v: number) => void;
  nativeDpr: boolean;
  setNativeDpr: (v: boolean) => void;
  suggestions: Suggestion[];
  act: (s: Suggestion) => void;
  /** Screen mode: each layer's own numbers */
  breakdown?: { id: string; name: string; perf?: Perf }[];
}) {
  const fix = suggestions.filter((s) => s.level === "error" || s.level === "warn");
  return (
    <div className="scroll-thin max-h-[min(600px,calc(100dvh-96px))] w-[340px] max-w-[calc(100vw-16px)] overflow-y-auto">
      <div className="border-b px-4 pb-3 pt-3.5">
        <p className="text-body font-semibold">Performance</p>
        <p className="mt-0.5 text-caption text-fg-3">Main-thread time is measured here; GPU time is scaled to each device's chip, so it's an estimate.</p>
      </div>
      {devices.map((d) => (
        <DeviceRow key={d.id} d={d} m={perf[d.id]} hostTflops={hostTflops} />
      ))}
      {breakdown && breakdown.length > 1 && (
        <section aria-label="By layer" className="border-b px-4 py-3">
          <h3 className="text-caption font-medium text-fg-3">By layer, on {devices[0].name}</h3>
          <table className="mt-1.5 w-full text-caption">
            <tbody className="tabular-nums">
              {breakdown.map((b) => (
                <tr key={b.id} className="border-t first:border-t-0">
                  <td className="max-w-0 truncate py-1.5 pr-2 font-medium">{b.name}</td>
                  <td className="py-1.5 text-right text-fg-2">{b.perf ? `${Math.round(b.perf.fps)} fps` : "—"}</td>
                  <td className="py-1.5 pl-3 text-right text-fg-2">{b.perf ? `${b.perf.jsMs.toFixed(1)} ms JS` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <section aria-label="Checks" className="border-b px-4 py-3">
        <h3 className="flex items-center justify-between text-body font-semibold">
          Checks
          <span className="text-caption font-normal text-fg-3">{fix.length ? `${fix.length} to fix` : "All clear"}</span>
        </h3>
        {fix.length ? (
          <ul className="mt-2 space-y-3">
            {fix.map((s, i) => {
              const I = s.level === "error" ? WarningCircle : Warning;
              return (
                <li key={i} className="flex gap-2.5">
                  <I size={16} weight="fill" aria-hidden className={`mt-px shrink-0 ${s.level === "error" ? "text-bad-ink" : "text-warn-ink"}`} />
                  <div className="min-w-0">
                    <p className="text-body font-medium">
                      <span className="sr-only">{s.level === "error" ? "Problem: " : "Warning: "}</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-caption text-fg-3">{s.body}</p>
                    {(s.fix || s.action) && (
                      <Button size="sm" className="mt-2" onClick={() => act(s)}>
                        {s.fix ? s.fix.label : s.action === "reduce" ? "Emulate reduced motion" : "Use native pixels"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-caption text-fg-3">Timing, easing and reduced motion follow Emil Kowalski's rules.</p>
        )}
      </section>
      <section aria-label="Measuring" className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="dpr" className="text-body">
            Render at device pixel ratio
          </label>
          <Switch id="dpr" on={nativeDpr} onChange={setNativeDpr} />
        </div>
        <div>
          <label htmlFor="host-gpu" className="text-body">
            This computer's GPU
          </label>
          <span className="relative mt-1.5 block">
            <select id="host-gpu" value={hostTflops} onChange={(e) => setHostTflops(Number(e.target.value))} className={`${field} h-8 w-full cursor-pointer appearance-none pl-2.5 pr-8 text-body`}>
              {HOSTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <CaretUpDown size={13} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          </span>
          {HOST.name && (
            <p className="mono mt-1.5 truncate text-micro text-fg-3" title={HOST.name}>
              {HOST.name}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function DeviceRow({ d, m, hostTflops }: { d: Device; m?: Perf; hostTflops: number }) {
  const L = m && deviceLoad(m, d, hostTflops);
  const [word, tone] = L ? verdict(Math.max(L.main, L.gpu ?? 0)) : ["Measuring…", "idle" as Tone];
  return (
    <section aria-label={d.name} className="border-b px-4 py-3">
      <header className="flex items-center justify-between gap-3">
        <h3 className="truncate text-body font-medium">{d.name}</h3>
        <span className="flex shrink-0 items-center gap-1.5 text-caption text-fg-2">
          <Dot tone={tone} />
          {word}
          {m && <span className="tabular-nums text-fg-3">· {Math.round(m.fps)} fps</span>}
        </span>
      </header>
      {L && m ? (
        <div className="mt-2.5 space-y-2.5">
          <Budget label="Main thread" ms={L.mainMs} budget={L.budget} />
          {L.gpuMs != null ? (
            <Budget label="GPU, estimated" ms={L.gpuMs} budget={L.budget} />
          ) : (
            <p className="text-caption text-fg-3">{m.canvasPx ? "Canvas 2D: the browser doesn't expose its GPU time." : "DOM and SVG: GPU work is compositing, which isn't exposed."}</p>
          )}
        </div>
      ) : (
        <div aria-hidden className="mt-3 space-y-2.5">
          <div className="h-1 w-full animate-pulse rounded-full bg-surface-3 motion-reduce:animate-none" />
          <div className="h-1 w-2/3 animate-pulse rounded-full bg-surface-3 motion-reduce:animate-none" />
        </div>
      )}
    </section>
  );
}

function Budget({ label, ms, budget }: { label: string; ms: number; budget: number }) {
  const x = ms / budget;
  const fill = x > 1 ? "bg-bad" : x > 0.75 ? "bg-warn" : "bg-fg";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-caption">
        <span className="text-fg-2">{label}</span>
        <span className="tabular-nums text-fg-3">
          <span className="font-medium text-fg">{ms.toFixed(1)}</span> / {budget.toFixed(1)} ms
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${label}, time per frame`}
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Number(ms.toFixed(2))}
        aria-valuetext={`${ms.toFixed(1)} of ${budget.toFixed(1)} milliseconds`}
        className="h-1 overflow-hidden rounded-full bg-surface-3"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, x * 100)}%` }} />
      </div>
    </div>
  );
}

/* ---------------- export (the animation's code) ---------------- */

export function CodeExport({ anim, values, exporting, exportZip, say, onMockup }: { anim: AnimMeta; values: Values; exporting: boolean; exportZip: () => void; say: (s: string) => void; onMockup: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="w-[300px] max-w-[calc(100vw-16px)] p-1.5">
      <MenuItem icon={FileZip} disabled={exporting} hint="The source with your values baked in, plus a README." onSelect={exportZip}>
        {exporting ? "Packing…" : `Download ${anim.id}.zip`}
      </MenuItem>
      <MenuItem
        icon={copied ? Check : Copy}
        hint="The current properties, as JSON."
        onSelect={() =>
          navigator.clipboard?.writeText(JSON.stringify(values, null, 2)).then(() => {
            setCopied(true);
            say("Values copied");
            setTimeout(() => setCopied(false), 1400);
          })
        }
      >
        Copy values
      </MenuItem>
      <div className="my-1 border-t" />
      <MenuItem icon={Cube} hint="On a 3D device, as an image or a video for a post or a portfolio." onSelect={onMockup}>
        Make a mockup
      </MenuItem>
      {anim.deps && (
        <div className="mt-1 flex items-start gap-2.5 border-t px-2.5 pb-1.5 pt-2.5">
          <Terminal size={16} aria-hidden className="mt-px shrink-0 text-fg-3" />
          <code className="mono min-w-0 break-words text-caption text-fg-2">npm i {anim.deps.join(" ")}</code>
        </div>
      )}
    </div>
  );
}
