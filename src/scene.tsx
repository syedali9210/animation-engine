import { useRef, type CSSProperties, type PointerEvent as RPE, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeSlash, ImageSquare, Stack, Trash, X } from "@phosphor-icons/react";
import { byId, type AnimMeta, type Values } from "./registry";
import type { Perf } from "./suggest";
import { ColorField } from "./controls";
import { IconButton } from "./ui";

/** One animation placed on the screen you're building. */
export interface Layer {
  id: string;
  anim: string;
  /** centre, as a fraction of the screen, so a layout survives rotation, folding and other devices */
  cx: number;
  cy: number;
  /** size in pt; full-screen animations ignore it */
  w: number;
  h: number;
  fill: boolean;
  hidden?: boolean;
  /** waiting for the animation to report its natural size */
  auto?: boolean;
  values: Values;
}
export interface Scene {
  layers: Layer[];
  /** "" follows the theme */
  bg: string;
}
export type Media = { url: string; video: boolean; name: string };

export const newLayer = (a: AnimMeta, cx = 0.5, cy = 0.5): Layer => ({
  id: Math.random().toString(36).slice(2, 8),
  anim: a.id,
  cx,
  cy,
  w: 340,
  h: 340,
  fill: a.layout === "fill",
  auto: a.layout !== "fill" && !a.html,
  values: {},
});

/** A layer's box inside its screen: centred on (cx, cy), never bigger than the screen. */
export const layerBox = (l: Pick<Layer, "cx" | "cy" | "w" | "h" | "fill">): CSSProperties =>
  l.fill
    ? { position: "absolute", inset: 0 }
    : { position: "absolute", left: `${l.cx * 100}%`, top: `${l.cy * 100}%`, width: l.w, height: l.h, maxWidth: "100%", maxHeight: "100%", transform: "translate(-50%, -50%)" };

const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** The whole screen's cost from its layers. They share one main thread (same site, same process), so frame work
    is the same number seen from each; GPU, script and canvas are each layer's own, so they add up. */
export function aggregate(ps: Perf[]): Perf {
  const sum = (f: (p: Perf) => number) => ps.reduce((s, p) => s + f(p), 0);
  const max = (f: (p: Perf) => number) => Math.max(...ps.map(f));
  const timed = ps.filter((p) => p.gpuMs != null);
  const slowest = ps.reduce((a, b) => (b.fps < a.fps ? b : a));
  return {
    fps: slowest.fps,
    interval: max((p) => p.interval),
    dropped: max((p) => p.dropped),
    workMs: max((p) => p.workMs),
    workP95: max((p) => p.workP95),
    jsMs: sum((p) => p.jsMs),
    gpuMs: timed.length ? timed.reduce((s, p) => s + (p.gpuMs ?? 0), 0) : null,
    gpuP95: timed.length ? timed.reduce((s, p) => s + (p.gpuP95 ?? p.gpuMs ?? 0), 0) : null,
    gpuKind: timed[0]?.gpuKind ?? ps.find((p) => p.gpuKind)?.gpuKind ?? null,
    canvasPx: sum((p) => p.canvasPx),
    dom: [...new Map(ps.flatMap((p) => p.dom).map((x) => [x.kind + x.prop, x])).values()],
    history: slowest.history,
  };
}

/** Drag to move, corner to resize. Sits over a layer while arranging; the chrome keeps one on-screen size at any zoom. */
export function LayerHandle({
  l,
  selected,
  onSelect,
  onChange,
  screen,
  scale,
}: {
  l: Layer;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Layer>) => void;
  screen: { w: number; h: number };
  scale: number;
}) {
  const drag = useRef<{ x: number; y: number; l: Layer; rw: number; rh: number; size: boolean } | null>(null);
  const down = (size: boolean) => (e: RPE<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    const rect = (e.currentTarget.closest("[data-screen]") as HTMLElement).getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, l, rw: rect.width, rh: rect.height, size };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: RPE<HTMLElement>) => {
    const s = drag.current;
    if (!s) return;
    const fx = (e.clientX - s.x) / s.rw;
    const fy = (e.clientY - s.y) / s.rh;
    if (!s.size) return onChange({ cx: clamp(s.l.cx + fx), cy: clamp(s.l.cy + fy) });
    // the top-left corner stays put
    const w = Math.round(Math.max(48, s.l.w + fx * screen.w));
    const h = Math.round(Math.max(48, s.l.h + fy * screen.h));
    onChange({ w, h, cx: s.l.cx + (w - s.l.w) / 2 / screen.w, cy: s.l.cy + (h - s.l.h) / 2 / screen.h, auto: false });
  };
  const up = () => (drag.current = null);
  const k = 1 / scale;
  const a = byId(l.anim);
  return (
    <div
      style={layerBox(l)}
      className="group/layer touch-none"
      onPointerDown={down(false)}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      title={a?.name}
    >
      <div
        className={`absolute inset-0 ${l.fill ? "" : "cursor-move"} ${selected ? "" : "group-hover/layer:shadow-[inset_0_0_0_var(--k)_var(--accent)]"}`}
        style={{ ["--k" as string]: `${1.5 * k}px`, boxShadow: selected ? `inset 0 0 0 ${2 * k}px var(--accent)` : undefined }}
      />
      {selected && !l.fill && (
        <span
          onPointerDown={down(true)}
          className="absolute cursor-nwse-resize rounded-full bg-white shadow-[0_0_0_1px_var(--accent),0_1px_3px_rgb(0_0_0/0.3)]"
          style={{ width: 14 * k, height: 14 * k, right: -7 * k, bottom: -7 * k }}
        />
      )}
    </div>
  );
}

/** Where a dragged animation will land. */
export function DropOutline({ l, scale }: { l: Pick<Layer, "cx" | "cy" | "w" | "h" | "fill">; scale: number }) {
  return <div className="pointer-events-none rounded-[6px] bg-accent/10" style={{ ...layerBox(l), outline: `${2 / scale}px dashed var(--accent)`, outlineOffset: -2 / scale }} />;
}

/** Follows the pointer while you drag an animation out of the library, playing it live. */
export function Ghost({ a, x, y, src, over }: { a: AnimMeta; x: number; y: number; src: string; over: boolean }) {
  return (
    <div className="pointer-events-none fixed z-[95] w-[200px] overflow-hidden rounded-xl bg-surface shadow-lg" style={{ left: x + 16, top: y + 16, opacity: over ? 0.85 : 1 }}>
      <div className="relative h-[150px] overflow-hidden bg-canvas">
        <iframe src={src} title="" aria-hidden tabIndex={-1} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: 400, height: 300, transform: "scale(0.5)" }} />
      </div>
      <p className="flex items-center justify-between gap-2 border-t px-3 py-2 text-caption">
        <span className="truncate font-medium">{a.name}</span>
        <span className="shrink-0 text-fg-3">{over ? "Release to drop" : "Drag onto a screen"}</span>
      </p>
    </div>
  );
}

/** Inspector head in Screen mode: what's on the screen, in what order, over what background. */
export function ScreenPanel({
  scene,
  sel,
  setSel,
  update,
  remove,
  reorder,
  setBg,
  media,
  setMedia,
  health,
}: {
  scene: Scene;
  sel: string | null;
  setSel: (id: string | null) => void;
  update: (id: string, patch: Partial<Layer>) => void;
  remove: (id: string) => void;
  reorder: (id: string, dir: 1 | -1) => void;
  setBg: (c: string) => void;
  media: Media | null;
  setMedia: (f: File | null) => void;
  health: ReactNode;
}) {
  const layers = [...scene.layers].reverse(); // front first, like a layers panel
  return (
    <div className="px-4 pb-4 pt-4">
      <p className="flex items-center gap-1.5 text-caption font-medium text-fg-3">
        <Stack size={14} aria-hidden />
        Screen builder
      </p>
      <h2 className="mt-1 text-heading font-semibold tracking-[-0.012em]">Your screen</h2>
      <p className="mt-1 text-body text-fg-2">
        {scene.layers.length
          ? "Every animation runs together on one screen, so the numbers are the screen's, not one piece's."
          : "Drag animations from the library onto the device, or click one to drop it in the middle."}
      </p>
      {health}
      <section aria-label="Layers" className="mt-5">
        <h3 className="mb-1.5 flex items-center justify-between text-caption font-medium text-fg-3">
          Layers <span className="tabular-nums">{scene.layers.length}</span>
        </h3>
        {!layers.length ? (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-caption text-fg-3">Nothing on the screen yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {layers.map((l) => {
              const a = byId(l.anim);
              const on = l.id === sel;
              return (
                <li key={l.id} className={`flex items-center gap-0.5 rounded-lg pl-1 pr-1 ${on ? "bg-surface-3" : "hover:bg-surface-2"}`}>
                  <button type="button" aria-pressed={on} onClick={() => setSel(on ? null : l.id)} className="min-w-0 flex-1 rounded-md px-1.5 py-1.5 text-left">
                    <span className={`block truncate text-body ${l.hidden ? "text-fg-3 line-through" : on ? "font-medium text-fg" : "text-fg-2"}`}>{a?.name ?? l.anim}</span>
                    <span className={`block truncate text-caption ${on ? "text-fg-2" : "text-fg-3"}`}>
                      {l.fill ? "Full screen" : `${l.w}×${l.h} at ${Math.round(l.cx * 100)}%, ${Math.round(l.cy * 100)}%`}
                    </span>
                  </button>
                  <IconButton size="sm" label={l.hidden ? `Show ${a?.name}` : `Hide ${a?.name}`} active={l.hidden} onClick={() => update(l.id, { hidden: !l.hidden })}>
                    {l.hidden ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </IconButton>
                  <IconButton size="sm" label="Bring forward" onClick={() => reorder(l.id, 1)}>
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton size="sm" label="Send backward" onClick={() => reorder(l.id, -1)}>
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton size="sm" label={`Remove ${a?.name}`} tipAlign="end" onClick={() => remove(l.id)}>
                    <Trash size={14} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-label="Screen background" className="mt-5">
        <h3 className="mb-2 text-caption font-medium text-fg-3">Background</h3>
        <div className="flex flex-wrap items-center gap-2">
          <ColorField id="scene-bg" label="Screen background" value={scene.bg} def="" set={setBg} />
          <label className="press inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-body font-medium text-fg shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
            <ImageSquare size={15} aria-hidden />
            {media ? "Replace" : "Image or video"}
            <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setMedia(e.target.files[0])} />
          </label>
          {media && (
            <IconButton size="md" label="Remove background file" onClick={() => setMedia(null)}>
              <X size={14} />
            </IconButton>
          )}
        </div>
        <p className="mt-2 text-caption text-fg-3">{media ? `${media.name} · kept for this tab only.` : "Or drop an image or video file anywhere on the page."}</p>
      </section>
    </div>
  );
}
