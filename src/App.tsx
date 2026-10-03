import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  BracketsCurly,
  CaretDown,
  CaretUpDown,
  Columns,
  DeviceMobile,
  DeviceRotate,
  DeviceTablet,
  DownloadSimple,
  Gauge,
  Keyboard,
  Laptop,
  ListChecks,
  Moon,
  PersonArmsSpread,
  Scan,
  SidebarSimple,
  SlidersHorizontal,
  Sun,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ANIMS, byId, htmlUrl, withDefaults, type Value, type Values } from "./registry";
import { DEVICES, DeviceFrame, breakpoint, frameSize, viewport, type Device, type DeviceId } from "./devices";
import Inspector, { Dot, Panel, TAB_LABEL, health, issueCount, verdict, type Ctx, type Perf, type Tab } from "./Inspector";
import Library from "./Library";
import { AdjustBar, field } from "./controls";
import { Button, Count, Dialog, IconButton, Kbd, Logo, Segmented, Sheet, Switch, useMedia, type Icon } from "./ui";
import { detectHost, suggest } from "./suggest";
import { downloadZip } from "./exporter";

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem("anim-engine:" + k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem("anim-engine:" + k, JSON.stringify(v));
    } catch {
      /* private mode: edits just don't persist */
    }
  },
};

type View = DeviceId | "compare";
const fromHash = () => decodeURIComponent(location.hash.slice(1));

// On a dev machine each device frame gets its own site (iphone.localhost, ipad.localhost, …), so Chrome
// runs it in its own process: one device's main-thread work isn't measured on top of another's.
const isolate = location.hostname === "localhost";
const frameOrigin = (device: string) => (isolate ? `${location.protocol}//${device}.localhost:${location.port}` : location.origin);

const VIEWS: { value: View; label: string; icon: Icon; kbd: string }[] = [
  { value: "iphone", label: "iPhone", icon: DeviceMobile, kbd: "1" },
  { value: "ipad", label: "iPad", icon: DeviceTablet, kbd: "2" },
  { value: "macbook", label: "MacBook", icon: Laptop, kbd: "3" },
  { value: "compare", label: "Compare", icon: Columns, kbd: "4" },
];

const PHONE_TABS: { tab: Tab | null; label: string; icon: Icon }[] = [
  { tab: null, label: "Adjust", icon: SlidersHorizontal },
  { tab: "perf", label: "Performance", icon: Gauge },
  { tab: "suggest", label: "Audit", icon: ListChecks },
  { tab: "export", label: "Code", icon: BracketsCurly },
];

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
const SHORTCUTS: [string, string[]][] = [
  ["Search animations", ["/"]],
  ["Search from anywhere", [MOD, "K"]],
  ["Previous / next animation", ["[", "]"]],
  ["iPhone, iPad, MacBook, Compare", ["1", "2", "3", "4"]],
  ["Rotate", ["L"]],
  ["Replay", ["R"]],
  ["Emulate reduced motion", ["M"]],
  ["Light / dark theme", ["T"]],
  ["Show shortcuts", ["?"]],
];

export default function App() {
  // #id in the URL picks the animation, so a link opens straight to it
  const [id, setId] = useState(() => byId(fromHash())?.id ?? byId(store.get("last", ""))?.id ?? ANIMS[0].id);
  const anim = byId(id)!;
  const [overrides, setOverrides] = useState<Record<string, Values>>(() => store.get("values", {}));
  const values = useMemo(() => withDefaults(anim, overrides[id]), [anim, overrides, id]);
  const [view, setView] = useState<View>(() => store.get("view", "iphone"));
  const [landscape, setLandscape] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [reduce, setReduce] = useState(false);
  const [nativeDpr, setNativeDpr] = useState(true);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [replay, setReplay] = useState(0);
  const [tab, setTab] = useState<Tab>("props");
  const [sheet, setSheet] = useState<Tab | null>(null); // phone: the panel pulled up over the stage
  const [perf, setPerf] = useState<Record<string, Perf>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // which document each device frame has finished loading (frame key + src), for the loading veil
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  // auto-detected until someone picks a class themselves; only an explicit pick is remembered
  const [hostTflops, setHostTflops] = useState(() => store.get("hostGpu", detectHost().tflops));
  const [libOpen, setLibOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [keys, setKeys] = useState(() => store.get("keys", true)); // WCAG 2.1.4: single-key shortcuts can be turned off
  const [exporting, setExporting] = useState(false);
  const [said, say] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // the phone layout is for portrait phones; landscape phones and short windows get the side panel
  const phone = useMedia("(max-width: 767.98px) and (orientation: portrait)");
  const wide = useMedia("(min-width: 1280px)");
  const coarse = useMedia("(pointer: coarse)");

  useEffect(() => {
    store.set("last", id);
    history.replaceState(null, "", `#${id}`);
  }, [id]);
  useEffect(() => {
    const onHash = () => byId(fromHash()) && setId(fromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => store.set("values", overrides), [overrides]);
  useEffect(() => store.set("view", view), [view]);
  useEffect(() => store.set("keys", keys), [keys]);
  useEffect(() => {
    document.title = `${anim.name} · Animation Engine`;
  }, [anim]);

  // follows the system theme until someone picks one
  const themePicked = useRef(false);
  const flipTheme = () => {
    themePicked.current = true;
    setDark((d) => !d);
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#18191b" : "#ffffff");
    if (themePicked.current) store.set("dark", dark);
  }, [dark]);

  // phones don't get Compare: three devices side by side would be thumbnails
  const shown: View = phone && view === "compare" ? "iphone" : view;
  const devices = useMemo(() => (shown === "compare" ? DEVICES : DEVICES.filter((d) => d.id === shown)), [shown]);

  // a fresh document means fresh measurements (theme flips live, so it isn't in here)
  const loadKey = `${id}|${shown}|${landscape}|${reduce}|${nativeDpr}|${replay}`;
  useEffect(() => {
    setPerf({});
    setErrors({});
  }, [loadKey]);

  /* ---------- engine <-> iframe messaging ---------- */
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  // the src each frame said "ready" from: until the current document says it, there's nobody to talk to
  const ready = useRef(new WeakMap<HTMLIFrameElement, string>());
  const live = useRef({ values, dark });
  live.current = { values, dark };
  const post = (frame: string, el: HTMLIFrameElement, msg: object) => el.contentWindow?.postMessage({ source: "anim-engine-host", ...msg }, frameOrigin(frame));
  const broadcast = (msg: object) => frames.current.forEach((el, f) => ready.current.get(el) === el.src && post(f, el, msg));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.source !== "anim-engine-stage" || e.origin !== frameOrigin(d.frame)) return;
      const el = frames.current.get(d.frame);
      if (!el || e.source !== el.contentWindow) return; // a frame we already replaced
      if (d.type === "ready") {
        ready.current.set(el, el.src);
        post(d.frame, el, { type: "theme", scheme: live.current.dark ? "dark" : "light" });
        post(d.frame, el, { type: "params", values: live.current.values });
      } else if (d.type === "perf") setPerf((p) => ({ ...p, [d.frame]: { ...d, history: [...(p[d.frame]?.history ?? []).slice(-47), d.fps] } }));
      else if (d.type === "error") setErrors((x) => ({ ...x, [d.frame]: d.message }));
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, []);
  useEffect(() => broadcast({ type: "params", values }), [values]);
  // theme switches live inside every device — no reload, the animation keeps playing
  useEffect(() => broadcast({ type: "theme", scheme: dark ? "dark" : "light" }), [dark]);

  const reloadTimer = useRef(0);
  const setParam = (k: string, v: Value) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], [k]: v } }));
    if (anim.html && anim.schema[k]?.reload) {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => setReplay((r) => r + 1), 400);
    }
  };
  const resetParams = () => {
    setOverrides(({ [id]: _, ...rest }) => rest);
    if (anim.html) setReplay((r) => r + 1);
  };

  const exportZip = () => {
    setExporting(true);
    say("");
    downloadZip(anim, values)
      .then(() => say(`Downloaded ${anim.id}-export.zip`))
      .catch(() => say("Export failed"))
      .finally(() => setExporting(false));
  };

  // the theme a frame loads with is only its first paint; after that it's driven by messages
  const loadTheme = useRef({ key: "", dark });
  if (loadTheme.current.key !== loadKey) loadTheme.current = { key: loadKey, dark };
  const src = (d: Device) => {
    const q = new URLSearchParams({ frame: d.id, rm: reduce ? "1" : "0", cs: loadTheme.current.dark ? "dark" : "light", host: location.origin });
    if (nativeDpr) q.set("dpr", String(d.dpr));
    if (!anim.html) q.set("a", anim.id);
    return `${frameOrigin(d.id)}${anim.html ? htmlUrl(anim) : "/stage.html"}?${q}`;
  };

  /* ---------- keyboard ---------- */
  const env = useRef({ wide, keys });
  env.current = { wide, keys };
  const openLibrary = useCallback((focusSearch: boolean) => {
    if (!env.current.wide) setLibOpen(true);
    if (focusSearch) requestAnimationFrame(() => searchRef.current?.focus());
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLibrary(true);
        return;
      }
      const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.metaKey || e.ctrlKey || e.altKey || typing || !env.current.keys) return;
      const go = (dir: number) => setId((cur) => ANIMS[(ANIMS.findIndex((a) => a.id === cur) + dir + ANIMS.length) % ANIMS.length].id);
      const map: Record<string, () => void> = {
        "1": () => setView("iphone"),
        "2": () => setView("ipad"),
        "3": () => setView("macbook"),
        "4": () => setView("compare"),
        l: () => setLandscape((x) => !x),
        t: flipTheme,
        m: () => setReduce((x) => !x),
        r: () => setReplay((x) => x + 1),
        "[": () => go(-1),
        "]": () => go(1),
        "/": () => openLibrary(true),
        "?": () => setHelp(true),
      };
      const fn = map[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [openLibrary]);

  /* ---------- stage fit ---------- */
  const [box, setBox] = useState({ w: 800, h: 600 });
  const observer = useRef<ResizeObserver | null>(null);
  // a callback ref: the stage element changes when the layout switches between phone and desktop
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    observer.current.observe(el);
  }, []);
  const compare = devices.length > 1;
  const sizes = devices.map((d) => frameSize(d, landscape));
  const PAD = phone ? 16 : 40;
  const GAP = phone ? 24 : 48;
  const fit = Math.min(
    (box.w - PAD * 2 - GAP * (devices.length - 1)) / sizes.reduce((s, f) => s + f.w, 0),
    (box.h - PAD * 2 - (compare ? 84 : 44)) / Math.max(...sizes.map((f) => f.h)),
    1,
  );
  const scale = !compare && zoom !== "fit" ? zoom : Math.max(0.05, fit);
  const canRotate = devices.some((d) => d.rotates);

  const suggestions = useMemo(() => suggest(anim, values, perf, devices, { reduce, nativeDpr, hostTflops }), [anim, values, perf, devices, reduce, nativeDpr, hostTflops]);
  const issues = issueCount(suggestions);
  const ctx: Ctx = {
    anim,
    values,
    overrides: overrides[id] ?? {},
    setParam,
    resetParams,
    devices,
    perf,
    reduce,
    setReduce,
    nativeDpr,
    setNativeDpr,
    hostTflops,
    setHostTflops: (v) => {
      setHostTflops(v);
      store.set("hostGpu", v);
    },
    landscape,
    suggestions,
    exporting,
    exportZip,
  };

  /* ---------------- phone sheet ---------------- */
  const [lastSheet, setLastSheet] = useState<Tab | null>(null);
  useEffect(() => {
    if (sheet) return setLastSheet(sheet);
    const t = setTimeout(() => setLastSheet(null), 260); // keep the content while it slides away
    return () => clearTimeout(t);
  }, [sheet]);
  const closeSheet = useCallback(() => setSheet(null), []);

  // devices on row 1 sharing a baseline, captions on row 2, so a caption that wraps never lifts its device
  const stage = (
    <div ref={stageRef} className="scroll-thin relative min-h-0 flex-1 overflow-auto">
      <div className="flex min-h-full min-w-full items-center justify-center" style={{ width: "max-content", padding: PAD }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${devices.length}, auto)`, columnGap: GAP, rowGap: 12 }}>
          {devices.map((d, i) => {
            const v = viewport(d, landscape);
            const fps = perf[d.id]?.fps;
            const frameKey = `${anim.id}-${d.id}-${landscape}-${replay}`;
            const url = src(d);
            const doc = `${frameKey}|${url}`;
            const w = sizes[i].w * scale;
            return (
              <figure key={d.id} className="contents">
                <div style={{ gridColumn: i + 1, gridRow: 1, alignSelf: "end", justifySelf: "center", width: w, height: sizes[i].h * scale }}>
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                    <DeviceFrame d={d} landscape={landscape} dark={dark}>
                      <iframe
                        key={frameKey}
                        ref={(el) => {
                          if (el) frames.current.set(d.id, el);
                          else frames.current.delete(d.id);
                        }}
                        title={`${anim.name} on ${d.name}`}
                        src={url}
                        onLoad={() => setLoaded((l) => ({ ...l, [d.id]: doc }))}
                        className="block border-0"
                        style={{ width: v.w, height: v.h, background: dark ? "#09090b" : "#fafafa" }}
                      />
                      {loaded[d.id] !== doc && (
                        <div className="absolute inset-0 grid place-items-center" style={{ background: dark ? "#09090b" : "#fafafa" }}>
                          <Spinner size={22 / scale} />
                        </div>
                      )}
                    </DeviceFrame>
                  </div>
                </div>
                <figcaption
                  className={`flex flex-wrap content-start items-center justify-center gap-x-2 gap-y-1 text-center text-caption ${compare ? "flex-col" : ""}`}
                  style={{ gridColumn: i + 1, gridRow: 2, alignSelf: "start", justifySelf: "center", width: compare ? Math.max(w, 96) : undefined, maxWidth: compare ? undefined : Math.max(240, box.w - PAD * 2) }}
                >
                  <span className="font-medium text-fg">{compare ? d.short : d.name}</span>
                  <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <span className="tabular-nums text-fg-2">
                      {v.w}×{v.h}
                    </span>
                    <span className="rounded-[5px] bg-surface-3 px-1.5 text-micro font-medium leading-[18px] text-fg-2">{breakpoint(v.w)}</span>
                    {fps != null && (
                      <span className="flex items-center gap-1.5 tabular-nums text-fg-2">
                        <Dot tone={fps >= 55 ? "good" : fps >= 40 ? "warn" : "bad"} />
                        {Math.round(fps)} fps
                      </span>
                    )}
                    {reduce && <span className="rounded-[5px] bg-accent-soft px-1.5 text-micro font-medium leading-[18px] text-accent-ink">Reduced motion</span>}
                  </span>
                  {errors[d.id] && (
                    <span role="alert" className="flex w-full items-start justify-center gap-1.5 pt-1 text-left">
                      <WarningCircle size={14} weight="fill" aria-hidden className="mt-px shrink-0 text-bad-ink" />
                      <span className="mono text-caption text-fg-2">{errors[d.id]}</span>
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );

  const size = phone ? "lg" : "md";
  const toggles = (
    <>
      <IconButton size={size} label="Emulate reduced motion" kbd="M" active={reduce} onClick={() => setReduce(!reduce)}>
        <PersonArmsSpread size={18} weight={reduce ? "fill" : "regular"} />
      </IconButton>
      <IconButton size={size} label="Device pixel ratio" active={nativeDpr} onClick={() => setNativeDpr(!nativeDpr)}>
        <Scan size={18} weight={nativeDpr ? "bold" : "regular"} />
      </IconButton>
    </>
  );
  const rotateBtn = (
    <IconButton size={size} label={landscape ? "Portrait" : "Landscape"} kbd="L" active={landscape} disabled={!canRotate} onClick={() => setLandscape(!landscape)}>
      <DeviceRotate size={18} />
    </IconButton>
  );
  const replayBtn = (
    <IconButton size={size} label="Replay" kbd="R" tipAlign="end" onClick={() => setReplay((r) => r + 1)}>
      <ArrowCounterClockwise size={18} />
    </IconButton>
  );
  const themeBtn = (
    <IconButton size={size} label={dark ? "Light theme" : "Dark theme"} kbd="T" tipAlign={phone ? "end" : "center"} onClick={flipTheme}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
  const library = (
    <Library
      id={id}
      overrides={overrides}
      searchRef={searchRef}
      onPick={(x) => {
        setId(x);
        setLibOpen(false);
      }}
      onClose={wide ? undefined : () => setLibOpen(false)}
      visible={wide || libOpen}
    />
  );
  const overlays = (
    <>
      {!wide && (
        <Dialog open={libOpen} onClose={() => setLibOpen(false)} label="Library" className="drawer">
          {library}
        </Dialog>
      )}
      <Dialog open={help} onClose={() => setHelp(false)} label="Keyboard shortcuts" className="modal">
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between border-b py-3 pl-5 pr-3">
            <h2 className="text-title font-semibold">Keyboard shortcuts</h2>
            <IconButton label="Close" onClick={() => setHelp(false)}>
              <X size={16} />
            </IconButton>
          </div>
          <dl className="scroll-thin min-h-0 overflow-y-auto px-5 py-1">
            {SHORTCUTS.map(([what, ks]) => (
              <div key={what} className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
                <dt className="text-body text-fg-2">{what}</dt>
                <dd className="flex shrink-0 gap-1">
                  {ks.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
            <div>
              <p id="keys-label" className="text-body font-medium">
                Single-key shortcuts
              </p>
              <p className="mt-0.5 text-caption text-fg-3">Turn these off if they get in the way of a screen reader or voice control.</p>
            </div>
            <Switch on={keys} onChange={setKeys} labelledBy="keys-label" />
          </div>
        </div>
      </Dialog>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </>
  );

  /* ---------------- phone: stage, one-property adjust bar, tab bar, sheets ---------------- */
  if (phone) {
    const h = health(ctx);
    const content = sheet ?? lastSheet;
    return (
      <div className="flex h-full flex-col bg-canvas">
        <header className="shrink-0 border-b bg-surface pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-1 px-1.5">
            <button
              type="button"
              onClick={() => openLibrary(false)}
              aria-haspopup="dialog"
              aria-expanded={libOpen}
              aria-label={`${anim.name}, ${anim.category}. Choose another animation`}
              className="press flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2"
            >
              <Logo size={30} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-ui font-semibold">
                  <span className="truncate">{anim.name}</span>
                  <CaretDown size={13} weight="bold" aria-hidden className="shrink-0 text-fg-3" />
                </span>
                <span className="block truncate text-caption text-fg-3">
                  {anim.category} · {ANIMS.findIndex((a) => a.id === id) + 1} of {ANIMS.length}
                </span>
              </span>
            </button>
            {themeBtn}
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <main aria-label="Stage" className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-14 shrink-0 items-center justify-between gap-1 px-2.5">
              <div className="flex items-center gap-1">
                <Segmented size="lg" label="Device" value={shown} onChange={setView} options={VIEWS.slice(0, 3)} hideLabels="always" />
                {rotateBtn}
              </div>
              <div className="flex items-center">
                {toggles}
                {replayBtn}
              </div>
            </div>
            {stage}
          </main>
          <AdjustBar anim={anim} values={values} setParam={setParam} onShowAll={() => setSheet("props")} />
          <Sheet open={!!sheet} onClose={closeSheet} title={TAB_LABEL[content ?? "props"]}>
            {content && <Panel tab={content} ctx={{ ...ctx, big: true }} />}
          </Sheet>
        </div>

        <nav aria-label="Panels" className="flex shrink-0 border-t bg-surface pb-[env(safe-area-inset-bottom)]">
          {PHONE_TABS.map(({ tab: t, label, icon: I }) => {
            const on = t === null ? sheet === null || sheet === "props" : sheet === t;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => setSheet(on && t ? null : t)}
                className={`flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-micro font-medium transition-colors duration-100 ${on ? "text-fg" : "text-fg-3"}`}
              >
                <span className="relative">
                  <I size={22} weight={on ? "fill" : "regular"} aria-hidden />
                  {t === "suggest" && issues > 0 && (
                    <span className="absolute -right-3 -top-1.5">
                      <Count n={issues} />
                    </span>
                  )}
                  {t === "perf" && h && <Dot tone={verdict(h.load)[1]} className="absolute -right-1 -top-0.5 ring-2 ring-surface" />}
                </span>
                {label}
              </button>
            );
          })}
        </nav>
        {overlays}
      </div>
    );
  }

  /* ---------------- tablet & desktop: library | stage | inspector, each with its own header ---------------- */
  return (
    <div className="flex h-full">
      <a href="#inspector" className="skip-link">
        Skip to inspector
      </a>
      {wide && <aside className="w-[264px] shrink-0 border-r">{library}</aside>}

      <main aria-label="Stage" className="flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-surface px-2">
          <div className="flex min-w-0 items-center gap-2">
            {!wide && (
              <>
                <IconButton label="Library" kbd="/" expanded={libOpen} onClick={() => openLibrary(!coarse)}>
                  <SidebarSimple size={18} />
                </IconButton>
                <span className="hidden min-w-0 items-center gap-2 lg:flex">
                  <Logo size={20} />
                  <span className="truncate text-body font-semibold">Animation Engine</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Segmented label="Device" value={shown} onChange={setView} options={VIEWS} hideLabels="lg" />
            {rotateBtn}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-0.5">
            {toggles}
            {!compare && (
              <span className="relative ml-1 hidden lg:block">
                <select
                  aria-label="Zoom"
                  value={String(zoom)}
                  onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
                  className={`${field} h-8 w-[76px] cursor-pointer appearance-none pl-2.5 pr-7 text-body tabular-nums`}
                >
                  <option value="fit">Fit</option>
                  <option value="0.5">50%</option>
                  <option value="0.75">75%</option>
                  <option value="1">100%</option>
                </select>
                <CaretUpDown size={13} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-2" />
              </span>
            )}
            {replayBtn}
          </div>
        </div>
        {stage}
      </main>

      <Inspector
        ctx={ctx}
        tab={tab}
        setTab={setTab}
        top={
          <>
            {themeBtn}
            <IconButton label="Keyboard shortcuts" kbd="?" onClick={() => setHelp(true)}>
              <Keyboard size={18} />
            </IconButton>
            <Button variant="primary" className="ml-auto" disabled={exporting} onClick={exportZip}>
              <DownloadSimple size={15} weight="bold" aria-hidden />
              {exporting ? "Packing…" : "Export"}
            </Button>
          </>
        }
      />
      {overlays}
    </div>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="animate-spin text-fg-3 motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2" role="img" aria-label="Loading">
      <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" opacity=".2" />
    </svg>
  );
}
