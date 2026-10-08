import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowCounterClockwise,
  BookOpen,
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  Check,
  Columns,
  Cube,
  Cursor,
  DeviceMobile,
  DeviceRotate,
  DeviceTablet,
  Devices,
  DotsThree,
  DownloadSimple,
  FileZip,
  Gauge,
  HandPointing,
  ImageSquare,
  Keyboard,
  Laptop,
  Moon,
  PaintBucket,
  PenNib,
  PersonArmsSpread,
  Plus,
  SidebarSimple,
  SlidersHorizontal,
  SquaresFour,
  Stack,
  Sun,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ANIMS, byId, htmlUrl, withDefaults, type AnimMeta, type Value, type Values } from "./registry";
import { DEVICES, DUO_MOVE, DeviceFrame, breakpoint, frameSize, viewport, type Device, type DeviceId, type Posture, type ScreenInk } from "./devices";
import Inspector, { CodeExport, Dot, Insights, PropertiesPanel, changedCount, fpsTone, health, issueCount, type Perf } from "./Inspector";
import Library from "./Library";
import { AdjustBar, field } from "./controls";
import { DropOutline, Ghost, LayerHandle, ScreenPanel, aggregate, layerBox, newLayer, type Layer, type Media, type Scene } from "./scene";
import { Button, Count, Dialog, IconButton, Kbd, MenuItem, Popover, Segmented, Sheet, Switch, closePopover, useMedia, type Icon } from "./ui";
import { detectHost, suggest, type Suggestion } from "./suggest";
import { downloadZip } from "./exporter";
import { SIZES, type RenderConfig } from "./studio/config";
import { serverMedia, useExport, type ExportKind } from "./studio/export";
import { StudioExport, StudioInspector, inspectorTitle } from "./studio/Studio";
import { AnimPicker, BG, LayersPanel, TemplateDialog } from "./studio/Layers";
import { addDevice, component as newComponent, defaultComp, devicesOf, scene as newScene, starts, text as newText, total, uid, type Comp, type Template } from "./studio/comp";
import { isDark } from "./studio/look";
import type { Sel } from "./studio/Stage";
import type { FrameSpec, Resolve, ScreenSpec } from "./studio/view";

// the 3D stage brings three.js, so it loads the first time the studio opens
const StudioStage = lazy(() => import("./studio/Stage"));

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
type Mode = "single" | "screen";
type Drag = { anim: string; x: number; y: number; over: { device: string; cx: number; cy: number } | null };
type PhoneSheet = "props" | "insights" | "layers" | "edit" | "export";
const fromHash = () => decodeURIComponent(location.hash.slice(1));

// On a dev machine each device gets its own site (iphone.localhost, duo.localhost, …), so Chrome runs it in its own
// process: one device's main-thread work isn't measured on top of another's. Layers of a built screen share their
// device's site, so they share a main thread the way one app's views do. Frame ids are "device" or "device~layer".
const isolate = location.hostname === "localhost";
const frameOrigin = (fid: string) => {
  const device = fid.split("~")[0];
  return isolate ? `${location.protocol}//${device}.localhost:${location.port}` : location.origin;
};
const SCREEN_BG = (dark: boolean) => (dark ? "#09090b" : "#fafafa");

const VIEWS: { value: View; label: string; icon: Icon; kbd: string }[] = [
  { value: "iphone", label: "iPhone", icon: DeviceMobile, kbd: "1" },
  { value: "duo", label: "iPhone Duo", icon: BookOpen, kbd: "2" },
  { value: "ipad", label: "iPad", icon: DeviceTablet, kbd: "3" },
  { value: "macbook", label: "MacBook", icon: Laptop, kbd: "4" },
  { value: "compare", label: "Compare", icon: Columns, kbd: "5" },
];
const POSTURES: { value: Posture; label: string }[] = [
  { value: "folded", label: "Folded" },
  { value: "half", label: "Half open" },
  { value: "open", label: "Open" },
];

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
const SHORTCUTS: [string, string[]][] = [
  ["Search animations", ["/"]],
  ["Search from anywhere", [MOD, "K"]],
  ["Previous / next animation", ["[", "]"]],
  ["iPhone, iPhone Duo, iPad, MacBook, Compare", ["1", "2", "3", "4", "5"]],
  ["Preview / Studio", ["P"]],
  ["Fold / unfold the iPhone Duo", ["F"]],
  ["Rotate", ["L"]],
  ["Replay", ["R"]],
  ["Emulate reduced motion", ["M"]],
  ["Hairline: redraw as thin lines", ["H"]],
  ["Light / dark theme", ["T"]],
  ["Screen builder: move the picked layer", ["←", "→", "↑", "↓"]],
  ["Screen builder: remove the picked layer", ["Del"]],
  ["Show shortcuts", ["?"]],
];

/** The studio's composition, kept between visits (a first visit starts from the old single-shot settings, if any). */
const loadComp = (): Comp => {
  const c = store.get<Comp | null>("comp", null);
  if (c?.v === 2 && c.scenes?.length) return { ...c, scenes: c.scenes.map((s) => ({ ...s, layers: s.layers.filter((l) => l.kind !== "component" || byId(l.anim)) })) };
  const v = store.get<string>("view", "iphone");
  const old = store.get<{ size?: string; fps?: 30 | 60; backdrop?: string; shadow?: boolean; reflections?: number }>("shot", {});
  const base = defaultComp(v === "compare" ? "iphone" : (v as DeviceId), store.get<Posture>("posture", "open"));
  const phone = matchMedia("(max-width: 767.98px) and (orientation: portrait)").matches;
  return { ...base, size: old.size ?? (phone ? "9x16" : base.size), fps: old.fps ?? base.fps, fill: old.backdrop ?? base.fill, shadow: old.shadow ?? base.shadow, reflections: old.reflections ?? base.reflections };
};

const loadScene = (): Scene => {
  const s = store.get<Scene>("scene", { layers: [], bg: "" });
  return { bg: s.bg ?? "", layers: (s.layers ?? []).filter((l) => byId(l.anim)) };
};

export default function App() {
  // #id in the URL picks the animation, so a link opens straight to it
  const [id, setId] = useState(() => byId(fromHash())?.id ?? byId(store.get("last", ""))?.id ?? ANIMS[0].id);
  const anim = byId(id)!;
  const [overrides, setOverrides] = useState<Record<string, Values>>(() => store.get("values", {}));
  const values = useMemo(() => withDefaults(anim, overrides[id]), [anim, overrides, id]);
  const [view, setView] = useState<View>(() => store.get("view", "iphone"));
  const [landscape, setLandscape] = useState(false);
  const [posture, setPosture] = useState<Posture>(() => store.get("posture", "open"));
  // the pose the Duo's hinge is actually moving to; it can start a beat after a posture change, and the stage zooms with it
  const [duoPose, setDuoPose] = useState({ posture, landscape: false });
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [reduce, setReduce] = useState(false);
  const [nativeDpr, setNativeDpr] = useState(true);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [replay, setReplay] = useState(0);
  const [sheet, setSheet] = useState<PhoneSheet | null>(null); // phone: the panel pulled up over the stage
  const [perf, setPerf] = useState<Record<string, Perf>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inks, setInks] = useState<Record<string, ScreenInk>>({}); // status bar / home indicator ink a screen asked for
  // which document each frame has finished loading (frame key + src), for the loading veil
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  // auto-detected until someone picks a class themselves; only an explicit pick is remembered
  const [hostTflops, setHostTflops] = useState(() => store.get("hostGpu", detectHost().tflops));
  const [libOpen, setLibOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [keys, setKeys] = useState(() => store.get("keys", true)); // WCAG 2.1.4: single-key shortcuts can be turned off
  const [exporting, setExporting] = useState(false);
  const [said, say] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Screen builder: animations placed on one screen, run and measured together
  const [mode, setMode] = useState<Mode>(() => store.get("mode", "single"));
  const [scene, setScene] = useState<Scene>(loadScene);
  const [sel, setSel] = useState<string | null>(null);
  const [arrange, setArrange] = useState(true); // false: pointer goes to the animations instead of moving them
  const [media, setMediaState] = useState<Media | null>(null); // a dropped image/video background, this tab only
  const [drag, setDrag] = useState<Drag | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const screen = mode === "screen";

  // Studio: a composition of scenes (devices in 3D with live screens, components, pictures, titles), exported as a
  // still or a video
  const [studioOn, setStudio] = useState(() => store.get("studio", false));
  const [comp, setCompState] = useState<Comp>(loadComp);
  const setComp = useCallback((fn: (c: Comp) => Comp) => setCompState(fn), []);
  const [cselState, setCsel] = useState<Sel>({ scene: "" });
  // the pick, always one that exists: a deleted scene falls back to the first
  const csel: Sel = comp.scenes.some((s) => s.id === cselState.scene) ? cselState : { scene: comp.scenes[0].id, layer: cselState.layer === BG ? BG : undefined };
  const cscene = comp.scenes.find((s) => s.id === csel.scene)!;
  const [picker, setPicker] = useState<{ title: string; then: (id: string) => void } | null>(null);
  const [templates, setTemplates] = useState(false);
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null);
  // Preview: the hairline treatment over the animation
  const [hl, setHl] = useState(false);
  // the move previews on its own unless the system asks for less motion
  const [playing, setPlaying] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const exporter = useExport();

  // the phone layout is for portrait phones; landscape phones and short windows get the side panel, with tighter
  // margins; the library stays open beside the stage from iPad-landscape widths up
  const phone = useMedia("(max-width: 767.98px) and (orientation: portrait)");
  const short = useMedia("(max-height: 560px)");
  // a tablet held upright: the stage gets the full width, and a panel under it holds the properties or the library
  const tablet = useMedia("(min-width: 768px) and (max-width: 1119.98px) and (orientation: portrait)");
  const [panel, setPanel] = useState<"inspect" | "library">("inspect");
  const [panelOpen, setPanelOpen] = useState(() => store.get("panelOpen", true));
  const wide = useMedia("(min-width: 1120px)");
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
  useEffect(() => store.set("posture", posture), [posture]);
  useEffect(() => store.set("mode", mode), [mode]);
  useEffect(() => store.set("keys", keys), [keys]);
  useEffect(() => store.set("panelOpen", panelOpen), [panelOpen]);
  useEffect(() => store.set("studio", studioOn), [studioOn]);
  useEffect(() => {
    const t = setTimeout(() => store.set("comp", comp), 250);
    return () => clearTimeout(t);
  }, [comp]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 15000);
    return () => clearTimeout(t);
  }, [undo]);
  useEffect(() => {
    const t = setTimeout(() => store.set("scene", scene), 250); // not on every pointer move
    return () => clearTimeout(t);
  }, [scene]);
  useEffect(() => {
    document.title = `${screen ? "Screen builder" : anim.name} · Animation Engine`;
  }, [anim, screen]);
  // a studio export says how it went even after its popover has closed
  const xs = exporter.state;
  useEffect(() => {
    if (xs.phase === "done") say(`Downloaded ${xs.file}`);
    else if (xs.phase === "error") say(xs.message);
  }, [xs]);
  // what a toast says stays a moment, then clears (the live region announces it once)
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => say(""), 2600);
    return () => clearTimeout(t);
  }, [said]);

  // follows the system theme until someone picks one
  const themePicked = useRef(false);
  const flipTheme = () => {
    themePicked.current = true;
    setDark((d) => !d);
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111113" : "#ffffff");
    if (themePicked.current) store.set("dark", dark);
  }, [dark]);

  // phones don't get Compare: four devices side by side would be thumbnails
  const studio = studioOn;
  const shown: View = (phone || studio) && view === "compare" ? "iphone" : view;
  const devices = useMemo(() => (shown === "compare" ? DEVICES : DEVICES.filter((d) => d.id === shown)), [shown]);
  const hasDuo = devices.some((d) => d.fold);

  /* ---------- screen builder state ---------- */
  const visible = screen ? scene.layers.filter((l) => !l.hidden) : [];
  const layer = screen ? (scene.layers.find((l) => l.id === sel) ?? null) : null;
  const subject = layer ? byId(layer.anim)! : anim; // whose properties the inspector shows
  const subjectValues = useMemo(() => (layer ? withDefaults(byId(layer.anim)!, layer.values) : values), [layer, values]);
  const edited = changedCount(subject, layer ? layer.values : (overrides[id] ?? {}));

  const updateLayer = useCallback(
    (lid: string, patch: Partial<Layer>) => setScene((s) => ({ ...s, layers: s.layers.map((l) => (l.id === lid ? { ...l, ...patch } : l)) })),
    [],
  );
  const removeLayer = (lid: string) => {
    setScene((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== lid) }));
    setSel((x) => (x === lid ? null : x));
  };
  const reorderLayer = (lid: string, dir: 1 | -1) =>
    setScene((s) => {
      const i = s.layers.findIndex((l) => l.id === lid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.layers.length) return s;
      const layers = [...s.layers];
      [layers[i], layers[j]] = [layers[j], layers[i]];
      return { ...s, layers };
    });
  /** At the drop point, or (a tap) cascading down the screen so new layers don't land on each other. */
  const addLayer = (aid: string, cx?: number, cy?: number) => {
    const a = byId(aid);
    if (!a) return;
    const n = scene.layers.length;
    const l = newLayer(a, cx ?? 0.5, cy ?? (n ? 0.22 + 0.14 * (n % 5) : 0.5));
    setScene((s) => ({ ...s, layers: [...s.layers, l] }));
    setSel(l.id);
    setMode("screen");
    say(`${a.name} added to the screen`);
  };
  const openScreen = () => {
    if (!scene.layers.length) addLayer(id); // start from what you were looking at
    else setMode("screen");
    setLibOpen(false);
  };
  const stepAnim = (dir: number) => {
    setMode("single");
    setId((cur) => ANIMS[(ANIMS.findIndex((a) => a.id === cur) + dir + ANIMS.length) % ANIMS.length].id);
  };
  const openAnim = (aid: string) => {
    setId(aid);
    setMode("single");
    setLibOpen(false);
  };
  const setMedia = (f: File | null) => {
    if (media) URL.revokeObjectURL(media.url);
    setMediaState(f ? { url: URL.createObjectURL(f), video: f.type.startsWith("video/"), name: f.name } : null);
  };

  // a fresh document means fresh measurements; the theme flips live and rotation/folding resize, so neither reloads
  const docKey = `${mode}|${id}|${shown}|${reduce}|${nativeDpr}|${replay}`;
  const measureKey = `${docKey}|${landscape}|${posture}`;
  useEffect(() => {
    setPerf({});
    setErrors({});
  }, [measureKey]);

  /* ---------- engine <-> iframe messaging ---------- */
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  // the src each frame said "ready" from: until the current document says it, there's nobody to talk to
  const ready = useRef(new WeakMap<HTMLIFrameElement, string>());
  const sent = useRef(new Map<string, string>()); // last params each frame got, so a drag doesn't re-send them
  const live = useRef({ values, dark, scene, media, hl });
  live.current = { values, dark, scene, media, hl };
  const valuesOf = (fid: string): Values => {
    const lid = fid.split("~")[1];
    if (!lid) return live.current.values;
    const l = live.current.scene.layers.find((x) => x.id === lid);
    const a = l && byId(l.anim);
    return a ? withDefaults(a, l.values) : {};
  };
  const post = (fid: string, el: HTMLIFrameElement, msg: object) => el.contentWindow?.postMessage({ source: "anim-engine-host", ...msg }, frameOrigin(fid));
  const sendParams = (fid: string, el: HTMLIFrameElement, force = false) => {
    const v = valuesOf(fid);
    const json = JSON.stringify(v);
    if (!force && sent.current.get(fid) === json) return;
    sent.current.set(fid, json);
    post(fid, el, { type: "params", values: v });
  };
  const isReady = (el: HTMLIFrameElement) => ready.current.get(el) === el.src;
  // A layer is bare (its stand-in skeleton app steps aside) when anything is behind it: a background image, video
  // or colour, or another visible layer under it. Only a lone animation on an empty screen gets the skeleton.
  const bareSent = useRef(new Map<string, boolean>());
  const sendBare = (fid: string, el: HTMLIFrameElement, force = false) => {
    const lid = fid.split("~")[1];
    if (!lid) return;
    const { scene: sc, media: m } = live.current;
    const below = sc.layers.filter((l) => !l.hidden).findIndex((l) => l.id === lid);
    const on = !!m || !!sc.bg || below > 0;
    if (!force && bareSent.current.get(fid) === on) return;
    bareSent.current.set(fid, on);
    post(fid, el, { type: "bare", on });
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.source !== "anim-engine-stage" || typeof d.frame !== "string" || e.origin !== frameOrigin(d.frame)) return;
      const el = frames.current.get(d.frame);
      if (!el || e.source !== el.contentWindow) return; // a frame we already replaced
      if (d.type === "ready") {
        setInks(({ [d.frame]: _, ...rest }) => rest); // a fresh document hasn't asked for anything yet
        ready.current.set(el, el.src);
        post(d.frame, el, { type: "theme", scheme: live.current.dark ? "dark" : "light" });
        sendParams(d.frame, el, true);
        sendBare(d.frame, el, true);
        if (live.current.hl) post(d.frame, el, { type: "hairline", on: true });
      } else if (d.type === "perf") setPerf((p) => ({ ...p, [d.frame]: { ...d, history: [...(p[d.frame]?.history ?? []).slice(-47), d.fps] } }));
      else if (d.type === "error") setErrors((x) => ({ ...x, [d.frame]: d.message }));
      else if (d.type === "status") {
        const ink = (k: string) => (d[k] === "light" || d[k] === "dark" ? d[k] : undefined);
        setInks((x) => ({ ...x, [d.frame]: { top: ink("top"), bottom: ink("bottom") } }));
      } else if (d.type === "size") {
        // a freshly placed animation reports its natural size a few times as it plays; the box follows until
        // someone resizes it by hand
        const lid = d.frame.split("~")[1];
        const l = live.current.scene.layers.find((x) => x.id === lid);
        const fit = (n: number) => Math.round(Math.min(1600, Math.max(80, Number(n) || 0)));
        if (l?.auto) updateLayer(l.id, { w: fit(d.w), h: fit(d.h) });
      }
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, [updateLayer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => frames.current.forEach((el, fid) => isReady(el) && sendParams(fid, el)), [values, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => frames.current.forEach((el, fid) => isReady(el) && sendBare(fid, el)), [scene, media]); // eslint-disable-line react-hooks/exhaustive-deps
  // theme switches live inside every device — no reload, the animation keeps playing
  useEffect(() => frames.current.forEach((el, fid) => isReady(el) && post(fid, el, { type: "theme", scheme: dark ? "dark" : "light" })), [dark]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => frames.current.forEach((el, fid) => isReady(el) && post(fid, el, { type: "hairline", on: hl })), [hl]); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadTimer = useRef(0);
  const setParam = (k: string, v: Value) => {
    if (layer) updateLayer(layer.id, { values: { ...layer.values, [k]: v } });
    else setOverrides((o) => ({ ...o, [id]: { ...o[id], [k]: v } }));
    if (subject.html && subject.schema[k]?.reload) {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => setReplay((r) => r + 1), 400);
    }
  };
  const resetParams = () => {
    if (layer) updateLayer(layer.id, { values: {} });
    else setOverrides(({ [id]: _, ...rest }) => rest);
    if (subject.html) setReplay((r) => r + 1);
  };

  const exportZip = () => {
    setExporting(true);
    downloadZip(subject, subjectValues)
      .then(() => say(`Downloaded ${subject.id}-export.zip`))
      .catch(() => say("Export failed"))
      .finally(() => setExporting(false));
  };

  // the theme a frame loads with is only its first paint; after that it's driven by messages
  const loadTheme = useRef({ key: "", dark });
  if (loadTheme.current.key !== docKey) loadTheme.current = { key: docKey, dark };
  const src = (d: Device, a: AnimMeta, fid: string) => {
    const q = new URLSearchParams({ frame: fid, rm: reduce ? "1" : "0", cs: loadTheme.current.dark ? "dark" : "light", host: location.origin });
    if (nativeDpr) q.set("dpr", String(d.dpr));
    if (!a.html) q.set("a", a.id);
    if (fid.includes("~")) q.set("layer", "1");
    return `${frameOrigin(fid)}${a.html ? htmlUrl(a) : "/stage.html"}?${q}`;
  };
  const previewSrc = (a: AnimMeta) => {
    const q = new URLSearchParams({ frame: "ghost", rm: "0", cs: dark ? "dark" : "light", host: location.origin });
    if (!a.html) q.set("a", a.id);
    return `${location.origin}${a.html ? htmlUrl(a) : "/stage.html"}?${q}`;
  };

  /* ---------- keyboard ---------- */
  const firstViewport = viewport(devices[0], landscape, posture);
  const env = useRef({ wide, tablet, keys, screen, sel, vp: firstViewport, layers: scene.layers, studio: studioOn, csel });
  env.current = { wide, tablet, keys, screen, sel, vp: firstViewport, layers: scene.layers, studio: studioOn, csel };
  const stepRef = useRef(stepAnim);
  stepRef.current = stepAnim;
  const openLibrary = useCallback((focusSearch: boolean) => {
    // the studio's left column is its layers, so there the library is a drawer at every size
    if (env.current.tablet && !env.current.studio) {
      setPanel("library");
      setPanelOpen(true);
    } else if (!env.current.wide || env.current.studio) setLibOpen(true);
    if (focusSearch) requestAnimationFrame(() => searchRef.current?.focus());
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLibrary(true);
        return;
      }
      const t = e.target instanceof Element ? e.target : null;
      const typing = t?.closest("input, textarea, select, [contenteditable]");
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const s = env.current;
      // the picked layer: arrows move it, Delete removes it (not character keys, so they stay on)
      if (s.screen && s.sel && !t?.closest('[role="radiogroup"], [role="tablist"], [role="dialog"], dialog, [popover]')) {
        const l = s.layers.find((x) => x.id === s.sel);
        const step = e.shiftKey ? 10 : 1;
        const by = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
        if (l && by && !l.fill) {
          e.preventDefault();
          updateLayer(l.id, { cx: Math.min(1, Math.max(0, l.cx + by[0] / s.vp.w)), cy: Math.min(1, Math.max(0, l.cy + by[1] / s.vp.h)) });
          return;
        }
        if (l && (e.key === "Delete" || e.key === "Backspace")) {
          e.preventDefault();
          setScene((sc) => ({ ...sc, layers: sc.layers.filter((x) => x.id !== l.id) }));
          setSel(null);
          return;
        }
        if (e.key === "Escape") return setSel(null);
      }
      // the studio's picked layer: Delete removes it
      if (s.studio && s.csel.layer && s.csel.layer !== BG && (e.key === "Delete" || e.key === "Backspace") && !t?.closest('[role="dialog"], dialog, [popover]')) {
        e.preventDefault();
        const { scene: sid, layer: lid } = s.csel;
        setComp((c) => ({ ...c, scenes: c.scenes.map((x) => (x.id === sid ? { ...x, layers: x.layers.filter((l) => l.id !== lid) } : x)) }));
        setCsel({ scene: sid });
        return;
      }
      if (!s.keys) return;
      const map: Record<string, () => void> = {
        "1": () => setView("iphone"),
        "2": () => setView("duo"),
        "3": () => setView("ipad"),
        "4": () => setView("macbook"),
        "5": () => setView("compare"),
        p: () => setStudio((x) => !x),
        f: () => setPosture((p) => (p === "folded" ? "open" : "folded")),
        l: () => setLandscape((x) => !x),
        t: flipTheme,
        m: () => setReduce((x) => !x),
        h: () => setHl((x) => !x),
        r: () => setReplay((x) => x + 1),
        "[": () => stepRef.current(-1),
        "]": () => stepRef.current(1),
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
  }, [openLibrary, updateLayer, setComp]);

  /* ---------- drag an animation out of the library onto a screen ---------- */
  // Listeners go on the moment the drag starts (not in an effect after the next render), so a quick release can't
  // slip past and leave a drag stuck; cancel, Escape and the window losing focus all end it.
  const addRef = useRef(addLayer);
  addRef.current = addLayer;
  const beginDrag = (anim: string, x: number, y: number) => {
    setLibOpen(false);
    getSelection()?.removeAllRanges();
    document.body.classList.add("select-none");
    let over: Drag["over"] = null;
    setDrag({ anim, x, y, over });
    const move = (e: PointerEvent) => {
      // the shield sits over every iframe, so the screen under the pointer is found by looking through it
      const el = document.elementsFromPoint(e.clientX, e.clientY).find((n): n is HTMLElement => n instanceof HTMLElement && !!n.dataset.screen);
      const r = el?.getBoundingClientRect();
      over = el && r ? { device: el.dataset.screen!, cx: (e.clientX - r.left) / r.width, cy: (e.clientY - r.top) / r.height } : null;
      setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, over });
    };
    const end = (drop: boolean) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", cancel);
      removeEventListener("keydown", esc);
      removeEventListener("blur", cancel);
      document.body.classList.remove("select-none");
      if (drop && over) addRef.current(anim, over.cx, over.cy);
      setDrag(null);
    };
    const up = () => end(true);
    const cancel = () => end(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && end(false);
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", cancel);
    addEventListener("keydown", esc);
    addEventListener("blur", cancel);
  };

  // drop an image or video anywhere on the page to put it behind the screen
  useEffect(() => {
    const enter = (e: DragEvent) => e.dataTransfer?.types.includes("Files") && setFileDrag(true);
    addEventListener("dragenter", enter);
    return () => removeEventListener("dragenter", enter);
  }, []);

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
  const sizes = devices.map((d) => (d.fold ? frameSize(d, duoPose.landscape, duoPose.posture) : frameSize(d, landscape, posture)));
  const PAD = phone ? 16 : short ? 12 : 40;
  const GAP = phone ? 24 : 48;
  // the floating dock under the devices (on a phone the Duo's posture gets a second row)
  const DOCK = phone ? 64 + (hasDuo ? 48 : 0) : short ? 56 : 64;
  const fit = Math.min(
    (box.w - PAD * 2 - GAP * (devices.length - 1)) / sizes.reduce((s, f) => s + f.w, 0),
    (box.h - PAD * 2 - DOCK - (compare ? 84 : 44)) / Math.max(...sizes.map((f) => f.h)),
    1,
  );
  const scale = !compare && zoom !== "fit" ? zoom : Math.max(0.05, fit);
  const canRotate = devices.some((d) => d.rotates);
  // when a fold or a rotation changes the device's footprint, the stage zooms with the hinge instead of jumping
  const [morph, setMorph] = useState(false);
  useEffect(() => {
    setMorph(true);
    const t = setTimeout(() => setMorph(false), DUO_MOVE + 150);
    return () => clearTimeout(t);
  }, [duoPose, landscape]);
  const ease = `${DUO_MOVE}ms cubic-bezier(0.32, 0.72, 0, 1)`;

  /* ---------- what the panels read ---------- */
  const stagePerf = useMemo(() => {
    if (!screen) return perf;
    const out: Record<string, Perf> = {};
    for (const d of devices) {
      const ps = visible.map((l) => perf[`${d.id}~${l.id}`]).filter((p): p is Perf => !!p);
      if (ps.length) out[d.id] = aggregate(ps);
    }
    return out;
  }, [screen, perf, devices, visible]);
  const subjectPerf = useMemo(() => {
    if (!layer) return perf;
    return Object.fromEntries(devices.flatMap((d) => (perf[`${d.id}~${layer.id}`] ? [[d.id, perf[`${d.id}~${layer.id}`]]] : [])));
  }, [layer, perf, devices]);
  const suggestions = useMemo(
    () => (screen && !layer ? [] : suggest(subject, subjectValues, subjectPerf, devices, { reduce, nativeDpr, hostTflops })),
    [screen, layer, subject, subjectValues, subjectPerf, devices, reduce, nativeDpr, hostTflops],
  );
  const issues = issueCount(suggestions);
  const act = (s: Suggestion) => (s.fix ? setParam(s.fix.key, s.fix.value) : s.action === "reduce" ? setReduce(true) : setNativeDpr(true));
  const h = health(devices, stagePerf, hostTflops);
  const insights = (
    <Insights
      devices={devices}
      perf={stagePerf}
      hostTflops={hostTflops}
      setHostTflops={(v) => {
        setHostTflops(v);
        store.set("hostGpu", v);
      }}
      nativeDpr={nativeDpr}
      setNativeDpr={setNativeDpr}
      suggestions={suggestions}
      act={act}
      breakdown={screen ? visible.map((l) => ({ id: l.id, name: byId(l.anim)!.name, perf: perf[`${devices[0].id}~${l.id}`] })) : undefined}
    />
  );
  // frame rate at a glance; everything else waits behind it
  const insightsChip = (onClick?: () => void) => (
    <button
      type="button"
      popoverTarget={onClick ? undefined : "insights"}
      onClick={onClick}
      aria-label={`Performance and checks: ${h ? `${Math.round(h.fps)} frames a second` : "measuring"}${issues ? `, ${issues} to fix` : ""}`}
      className="press flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-caption font-medium tabular-nums text-fg-2 hover:bg-surface-2 hover:text-fg"
    >
      <Dot tone={h ? fpsTone(h.fps) : "idle"} />
      {h ? `${Math.round(h.fps)} fps` : "Measuring"}
      {issues > 0 && <Count n={issues} tone="warn" />}
    </button>
  );

  const screenPanel = screen && (
    <ScreenPanel
      scene={scene}
      sel={sel}
      setSel={setSel}
      update={updateLayer}
      remove={removeLayer}
      reorder={reorderLayer}
      setBg={(bg) => setScene((s) => ({ ...s, bg }))}
      media={media}
      setMedia={setMedia}
    />
  );
  const resetBtn = (big?: boolean) =>
    edited > 0 && (
      <Button size={big ? "md" : "sm"} variant="ghost" onClick={resetParams}>
        <ArrowCounterClockwise size={13} aria-hidden />
        Reset
      </Button>
    );

  /* ---------------- phone sheet ---------------- */
  const [lastSheet, setLastSheet] = useState<PhoneSheet | null>(null);
  useEffect(() => {
    if (sheet) return setLastSheet(sheet);
    const t = setTimeout(() => setLastSheet(null), 260); // keep the content while it slides away
    return () => clearTimeout(t);
  }, [sheet]);
  const closeSheet = useCallback(() => setSheet(null), []);

  /** The live frames on a device: the animation, or every visible layer of the built screen. */
  const itemsFor = (d: Device) =>
    screen
      ? visible.map((l) => ({ fid: `${d.id}~${l.id}`, a: byId(l.anim)!, key: `${l.id}-${d.id}-${replay}`, l }))
      : [{ fid: d.id, a: anim, key: `${anim.id}-${d.id}-${replay}`, l: null as Layer | null }];
  // system ink: the top-most layer that asked for one decides (a bare layer asks for nothing)
  const inkFor = (d: Device) => itemsFor(d).map((it) => inks[it.fid]).filter((x) => x?.top || x?.bottom).at(-1);
  const screenBgFor = () => (screen ? scene.bg || SCREEN_BG(dark) : SCREEN_BG(dark));
  /** What's on a device's screen: the background file, then the frames. The stage and the studio both draw it. */
  const screenFor = (d: Device, zoomed: number) => (
    <>
      {screen &&
        media &&
        (media.video ? (
          <video src={media.url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <img src={media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ))}
      {itemsFor(d).map(({ fid, a, key, l }) => {
        const url = src(d, a, fid);
        const doc = `${key}|${url}`;
        return (
          <div key={key} style={l ? layerBox(l) : { position: "absolute", inset: 0 }}>
            <iframe
              ref={(el) => {
                if (el) frames.current.set(fid, el);
                else frames.current.delete(fid);
              }}
              title={`${a.name} on ${d.name}`}
              src={url}
              onLoad={() => setLoaded((x) => ({ ...x, [fid]: doc }))}
              className="block h-full w-full border-0"
              style={{ background: l ? "transparent" : SCREEN_BG(dark) }}
            />
            {loaded[fid] !== doc && (
              <div className="absolute inset-0 grid place-items-center" style={{ background: l ? undefined : SCREEN_BG(dark) }}>
                <Spinner size={22 / zoomed} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  /* ---------- studio ---------- */
  const scheme = (on: boolean) => (on ? "dark" : "light") as "dark" | "light";
  const frameSpec = (a: AnimMeta, key: string, v: Values, d: Device | null, o: { box?: CSSProperties; bare: boolean; layer: boolean }, hairline: boolean, cs: "light" | "dark"): FrameSpec => ({
    key,
    path: a.html ? htmlUrl(a) : "/stage.html",
    query: { ...(a.html ? {} : { a: a.id }), ...(o.layer ? { layer: "1" } : {}), ...(nativeDpr && d ? { dpr: String(d.dpr) } : {}) },
    values: v,
    box: o.box,
    bare: o.bare,
    hairline,
    scheme: cs,
  });
  /** What the composition's references mean right now: a "live" screen is whatever the engine has open. */
  const studioResolve: Resolve = {
    screen(content, d, key, hairline): ScreenSpec {
      if (content.kind === "image") return { frames: [], bg: "#000", image: content.src };
      if (content.kind === "anim") {
        const a = byId(content.id);
        return { frames: a ? [frameSpec(a, `${key}:${a.id}`, withDefaults(a, overrides[a.id]), d, { bare: false, layer: false }, hairline, scheme(dark))] : [], bg: SCREEN_BG(dark) };
      }
      return {
        frames: itemsFor(d).map(({ fid, a, l }) =>
          frameSpec(a, `${key}:${fid}`, valuesOf(fid), d, { box: l ? layerBox(l) : undefined, bare: !!l && (!!media || !!scene.bg || visible.indexOf(l) > 0), layer: !!l }, hairline, scheme(dark)),
        ),
        bg: screenBgFor(),
        media: screen && media ? { url: media.url, video: media.video } : undefined,
      };
    },
    // a component on its own: no stand-in app around it, the composition's background behind it
    component: (aid, key, hairline, cs) => frameSpec(byId(aid)!, key, withDefaults(byId(aid)!, overrides[aid]), null, { bare: true, layer: true }, hairline, cs),
    image: (src) => src,
    dark,
    stepped: false,
    origin: location.origin,
  };
  const liveName = screen ? "the screen you're building" : anim.name;

  /** Everything the export's own page needs to draw the composition by itself. A still is the picked scene, settled,
      with its camera where it's set (no move), and its screens caught where their library card is. */
  const renderConfig = async (kind: ExportKind): Promise<RenderConfig> => {
    const screens: Record<string, ScreenSpec> = {};
    const components: Record<string, FrameSpec> = {};
    for (const s of comp.scenes)
      for (const l of s.layers) {
        if (l.hidden) continue;
        if (l.kind === "device") {
          const sp = studioResolve.screen(l.content, DEVICES.find((d) => d.id === l.device)!, l.id, !!l.hairline);
          screens[l.id] = { ...sp, media: sp.media && { ...sp.media, url: await serverMedia(sp.media.url) } };
        } else if (l.kind === "component") components[`${s.id}:${l.id}`] = studioResolve.component(l.anim, `${s.id}:${l.id}`, !!l.hairline, scheme(isDark(comp.fill)));
      }
    const still = kind === "png";
    const i = comp.scenes.indexOf(cscene);
    const start = still ? starts(comp)[i] + Math.min(1.8, cscene.duration * 0.6) : 0;
    return {
      comp: still ? { ...comp, scenes: comp.scenes.map((s) => ({ ...s, move: "still", arrival: "none" })) } : comp,
      dark,
      screens,
      components,
      start,
      duration: still ? 0 : total(comp),
      preroll: still ? Math.max(0, (screen ? 1800 : (anim.poster?.at ?? 1800)) - start * 1000) : 0,
      transparent: comp.fill === "transparent",
    };
  };
  const slug = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scene";
  const exportComp = (kind: ExportKind) =>
    exporter.run(kind, () => renderConfig(kind), SIZES.find((x) => x.id === comp.size) ?? SIZES[0], comp.fps, `${screen ? "screen" : anim.id}-${kind === "png" ? slug(cscene.name) : "film"}`);
  const studioExport = <StudioExport comp={comp} set={(p) => setComp((c) => ({ ...c, ...p }))} scene={cscene} exporting={exporter.state} onExport={exportComp} />;

  /* adding to the composition */
  const imageInput = useRef<HTMLInputElement>(null);
  const imageThen = useRef<(src: string, file: string, aspect: number) => void>(() => {});
  const pickAnim = (title: string, then: (aid: string) => void) => setPicker({ title, then });
  const pickImage = (then: (src: string, file: string, aspect: number) => void) => {
    imageThen.current = then;
    imageInput.current?.click();
  };
  /** A picture goes to the dev server, so it outlives a reload and the export can load it too. */
  const takeImage = async (f: File) => {
    const blob = URL.createObjectURL(f);
    const aspect = await new Promise<number>((r) => {
      const img = new Image();
      img.onload = () => r(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => r(1);
      img.src = blob;
    });
    let src = blob;
    try {
      src = await serverMedia(blob);
    } catch {
      say("The picture lasts until you reload: run the engine with npm run dev to keep it");
    }
    imageThen.current(src, f.name, aspect);
  };
  const putLayer = (l: Comp["scenes"][number]["layers"][number], patch?: Partial<Comp["scenes"][number]>) => {
    setComp((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === cscene.id ? { ...s, ...patch, layers: [...s.layers, l] } : s)) }));
    setCsel({ scene: cscene.id, layer: l.id });
  };
  const addImageLayer = (src: string, file: string, aspect: number) =>
    putLayer({ id: uid(), kind: "image", src, file, aspect, box: { x: 0.5, y: 0.5, w: aspect > 1 ? 0.42 : 0.26 }, radius: 1.2, enter: "rise" });
  const addToComp = (kind: "scene" | "device" | "component" | "image" | "text", d?: DeviceId) => {
    const s = cscene;
    if (kind === "scene") {
      // the next shot keeps the devices and the camera, so it reads as the same story moving on
      const next = newScene(
        `Scene ${comp.scenes.length + 1}`,
        s.layers.filter((l) => l.kind === "device").map((l) => ({ ...l, id: uid() })),
        { camera: { ...s.camera }, frame: s.frame, transition: "dissolve" },
      );
      setComp((c) => {
        const i = c.scenes.findIndex((x) => x.id === s.id);
        return { ...c, scenes: [...c.scenes.slice(0, i + 1), next, ...c.scenes.slice(i + 1)] };
      });
      setCsel({ scene: next.id });
    } else if (kind === "device" && d) {
      const next = addDevice(s, d);
      if (!next) return say("Every place in this scene has a device: change one in the scene's Devices");
      setComp((c) => ({ ...c, scenes: c.scenes.map((x) => (x.id === s.id ? next : x)) }));
      setCsel({ scene: s.id, layer: next.layers.find((l) => !s.layers.includes(l))!.id });
    } else if (kind === "component")
      pickAnim("Add a component", (aid) => {
        // beside the devices: they move over to one side, the component takes the other
        const devs = devicesOf(s).length > 0;
        const frame = devs && s.frame === "center" ? "left" : s.frame;
        putLayer(newComponent(aid, devs ? { x: frame === "right" ? 0.28 : 0.72, y: 0.5, w: 0.3 } : { x: 0.5, y: 0.5, w: 0.4 }), { frame });
      });
    else if (kind === "image") pickImage(addImageLayer);
    else if (kind === "text") putLayer(newText(anim.name, { x: 0.5, y: 0.12, w: 0.8 }, 4.5));
  };
  const applyTemplate = (t: Template) => {
    const old = comp;
    const made = t.make({ device: shown === "compare" ? "iphone" : shown, posture, name: anim.name, anim: id });
    setComp(() => ({ ...made, size: made.size !== "16x9" ? made.size : old.size, fps: old.fps }));
    setCsel({ scene: made.scenes[0].id });
    setTemplates(false);
    setUndo({
      label: `Started from “${t.name}”`,
      run: () => {
        setComp(() => old);
        setCsel({ scene: old.scenes[0].id });
        setUndo(null);
      },
    });
  };
  const layersPanel = (onPick?: () => void, inSheet?: boolean) => (
    <LayersPanel
      hideTitle={inSheet}
      comp={comp}
      setComp={setComp}
      sel={csel}
      setSel={(x) => {
        setCsel(x);
        onPick?.();
      }}
      onAdd={addToComp}
      onTemplates={() => setTemplates(true)}
      undo={undo ?? undefined}
    />
  );
  const studioInspector = (cols: boolean) => <StudioInspector comp={comp} setComp={setComp} sel={csel} setSel={setCsel} liveName={liveName} pickAnim={pickAnim} pickImage={pickImage} cols={cols} />;

  const studioStage = studio && (
    <Suspense
      fallback={
        <div className="grid min-h-0 flex-1 place-items-center">
          <Spinner size={22} />
        </div>
      }
    >
      <StudioStage
        comp={comp}
        setComp={setComp}
        resolve={studioResolve}
        sel={csel}
        setSel={setCsel}
        playing={playing}
        setPlaying={setPlaying}
        onAddScene={() => addToComp("scene")}
        compact={phone || short}
      />
    </Suspense>
  );

  // devices on row 1 sharing a baseline, captions on row 2, so a caption that wraps never lifts its device
  const stage = (
    <div
      ref={stageRef}
      className="scroll-thin relative min-h-0 flex-1 overflow-auto"
      onPointerDown={(e) => screen && !(e.target as Element).closest("[data-screen]") && setSel(null)}
    >
      <div className="flex min-h-full min-w-full items-center justify-center" style={{ width: "max-content", padding: PAD, paddingBottom: PAD + DOCK }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${devices.length}, auto)`, columnGap: GAP, rowGap: 14 }}>
          {devices.map((d, i) => {
            const v = viewport(d, landscape, posture);
            const items = itemsFor(d);
            const fps = stagePerf[d.id]?.fps;
            const error = items.map((it) => errors[it.fid]).find(Boolean);
            const w = sizes[i].w * scale;
            const dropping = drag?.over?.device === d.id ? drag : null;
            const ink = inkFor(d);
            return (
              <figure key={d.id} className="contents">
                <div
                  style={{ gridColumn: i + 1, gridRow: 1, alignSelf: "end", justifySelf: "center", width: w, height: sizes[i].h * scale, transition: morph ? `width ${ease}, height ${ease}` : undefined }}
                >
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", transition: morph ? `transform ${ease}` : undefined }}>
                    <DeviceFrame d={d} landscape={landscape} dark={dark} posture={posture} onPose={setDuoPose} ink={ink}>
                      <div data-screen={d.id} className="absolute inset-0 overflow-hidden" style={screen ? { background: scene.bg || SCREEN_BG(dark) } : undefined}>
                        {screenFor(d, scale)}
                        {screen &&
                          arrange &&
                          visible.map((l) => (
                            <LayerHandle key={l.id} l={l} selected={l.id === sel} onSelect={() => setSel(l.id)} onChange={(p) => updateLayer(l.id, p)} screen={v} scale={scale} />
                          ))}
                        {screen && !visible.length && !dropping?.over && (
                          <div className="pointer-events-none absolute inset-6 grid place-items-center rounded-[28px] border-2 border-dashed border-line-strong p-8 text-center text-balance">
                            <span>
                              <Plus size={34} aria-hidden className="mx-auto text-fg-3" />
                              <span className="mt-3 block text-[19px] font-semibold text-fg-2">Drop animations here</span>
                              <span className="mt-1 block text-[15px] text-fg-3">{coarse ? "Tap + on a card in the library" : "Drag a card from the library, or press + on it"}</span>
                            </span>
                          </div>
                        )}
                        {dropping?.over && (
                          <DropOutline l={{ cx: dropping.over.cx, cy: dropping.over.cy, w: 340, h: 340, fill: byId(dropping.anim)?.layout === "fill" }} scale={scale} />
                        )}
                      </div>
                    </DeviceFrame>
                  </div>
                </div>
                <figcaption
                  className={`flex flex-wrap content-start items-center justify-center gap-x-2 gap-y-1 text-center text-caption text-fg-3 ${compare ? "flex-col" : ""}`}
                  style={{ gridColumn: i + 1, gridRow: 2, alignSelf: "start", justifySelf: "center", width: compare ? Math.max(w, 96) : undefined, maxWidth: compare ? undefined : Math.max(240, box.w - PAD * 2) }}
                >
                  <span className="font-medium text-fg-2">{compare ? d.short : d.name}</span>
                  <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 tabular-nums">
                    {d.fold && <span>{POSTURES.find((p) => p.value === posture)!.label}</span>}
                    <span>
                      {v.w}×{v.h} · {breakpoint(v.w)}
                    </span>
                    {compare && fps != null && (
                      <span className="flex items-center gap-1.5">
                        <Dot tone={fpsTone(fps)} />
                        {Math.round(fps)} fps
                      </span>
                    )}
                    {reduce && <span className="text-fg-2">Reduced motion</span>}
                  </span>
                  {error && (
                    <span role="alert" className="flex w-full items-start justify-center gap-1.5 pt-1 text-left">
                      <WarningCircle size={14} weight="fill" aria-hidden className="mt-px shrink-0 text-bad-ink" />
                      <span className="mono text-caption text-fg-2">{error}</span>
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
  const tip = phone ? "bottom" : "top"; // the desktop dock sits at the bottom, so its tooltips open upwards
  const divider = <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line-strong" />;
  const rmBtn = (
    <IconButton size={size} label="Emulate reduced motion" kbd="M" tipSide={tip} active={reduce} onClick={() => setReduce(!reduce)}>
      <PersonArmsSpread size={18} />
    </IconButton>
  );
  const hlBtn = (
    <IconButton size={size} label="Hairline: redraw as thin lines" kbd="H" tipSide={tip} active={hl} onClick={() => setHl(!hl)}>
      <PenNib size={18} />
    </IconButton>
  );
  const rotateBtn = (
    <IconButton size={size} label="Rotate" kbd="L" tipSide={tip} active={landscape} disabled={!canRotate} onClick={() => setLandscape(!landscape)}>
      <DeviceRotate size={18} />
    </IconButton>
  );
  const replayBtn = (
    <IconButton size={size} label="Replay" kbd="R" tipSide={tip} onClick={() => setReplay((r) => r + 1)}>
      <ArrowCounterClockwise size={18} />
    </IconButton>
  );
  const themeBtn = (
    <IconButton size={phone ? "lg" : "md"} label={dark ? "Light theme" : "Dark theme"} kbd="T" tipSide={phone ? "bottom" : "top"} tipAlign="start" onClick={flipTheme}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
  const postureSeg = <Segmented size={phone ? "sm" : "md"} label="iPhone Duo posture" value={posture} onChange={setPosture} options={POSTURES} />;
  const pointerSeg = (
    <Segmented
      size={phone ? "sm" : "md"}
      label="Pointer"
      value={arrange ? "arrange" : "interact"}
      onChange={(v) => setArrange(v === "arrange")}
      tipSide={tip}
      hideLabels={phone ? undefined : "always"}
      options={[
        { value: "arrange", label: "Arrange layers", icon: Cursor },
        { value: "interact", label: "Use the animations", icon: HandPointing },
      ]}
    />
  );

  const library = (
    <Library
      id={id}
      overrides={overrides}
      searchRef={searchRef}
      screen={screen}
      onScreen={openScreen}
      layers={scene.layers.length}
      onPick={openAnim}
      onAdd={(x) => {
        addLayer(x);
        setLibOpen(false);
      }}
      onDrag={coarse ? undefined : beginDrag}
      onClose={(wide || tablet) && !studio ? undefined : () => setLibOpen(false)}
      visible={(wide && !studio) || libOpen || (tablet && !studio && panel === "library" && panelOpen)}
      bare={tablet && !studio}
      dark={dark}
      previewSrc={previewSrc}
      footer={
        <>
          {themeBtn}
          {!phone && (
            <IconButton label="Keyboard shortcuts" kbd="?" tipSide="top" onClick={() => setHelp(true)}>
              <Keyboard size={18} />
            </IconButton>
          )}
        </>
      }
    />
  );
  const dragAnim = drag && byId(drag.anim);
  const overlays = (
    <>
      {(studio || (!wide && !tablet)) && (
        <Dialog open={libOpen} onClose={() => setLibOpen(false)} label="Library" className="drawer">
          {library}
        </Dialog>
      )}
      <Dialog open={help} onClose={() => setHelp(false)} label="Keyboard shortcuts" className="modal">
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between border-b py-3 pl-5 pr-3">
            <h2 className="text-ui font-semibold">Keyboard shortcuts</h2>
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
      <AnimPicker open={!!picker} onClose={() => setPicker(null)} onPick={(aid) => picker?.then(aid)} dark={dark} title={picker?.title} />
      <TemplateDialog open={templates} onClose={() => setTemplates(false)} onPick={applyTemplate} />
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void takeImage(f);
        }}
      />
      {drag && dragAnim && (
        <>
          {/* over every iframe, so the pointer stays ours until the drop */}
          <div aria-hidden className="fixed inset-0 z-[90] cursor-grabbing" />
          <Ghost a={dragAnim} x={drag.x} y={drag.y} src={previewSrc(dragAnim)} over={!!drag.over} />
        </>
      )}
      {fileDrag && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgb(9_9_11/0.4)] p-6"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.target === e.currentTarget && setFileDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setFileDrag(false);
            if (studio) {
              const img = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
              if (!img) return say("Only pictures can go into a scene");
              imageThen.current = addImageLayer;
              void takeImage(img);
              return say(`${img.name} added to ${cscene.name}`);
            }
            const f = [...e.dataTransfer.files].find((x) => /^(image|video)\//.test(x.type));
            if (!f) return say("Only images and videos can go behind the screen");
            setMedia(f);
            if (!screen) openScreen();
            say(`${f.name} is now the screen background`);
          }}
        >
          <div className="pointer-events-none flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-overlay px-8 py-7 text-center shadow-lg">
            <ImageSquare size={28} className="text-fg-2" aria-hidden />
            <p className="text-ui font-semibold">{studio ? `Drop to add it to ${cscene.name}` : "Drop to use as the screen background"}</p>
            <p className="text-body text-fg-2">{studio ? "It comes in as a picture layer you can move, resize and animate in." : "Images and videos sit behind every animation on the screen you're building."}</p>
          </div>
        </div>
      )}
      <div aria-live="polite" className={`pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4 ${phone ? "top-[calc(env(safe-area-inset-top)+68px)]" : "bottom-[calc(env(safe-area-inset-bottom)+88px)]"}`}>
        {said && <p className="rounded-full bg-fg px-3.5 py-1.5 text-caption font-medium text-surface shadow-md">{said}</p>}
      </div>
    </>
  );

  const viewSwitch = (
    <Segmented
      label="View"
      value={studio ? "mockup" : "preview"}
      onChange={(v) => setStudio(v === "mockup")}
      options={[
        { value: "preview", label: "Preview", icon: phone ? undefined : Devices },
        { value: "mockup", label: "Studio", icon: phone ? undefined : Cube },
      ]}
    />
  );
  // the stage changes in place: a short fade, so Preview ⇄ Studio reads as one place changing
  const surface = (
    <div key={studio ? "mockup" : "preview"} className="fade-in relative flex min-h-0 flex-1 flex-col">
      {studio ? studioStage : stage}
    </div>
  );

  /* ---------------- phone: one top bar, the stage, one bar of tuning, sheets ---------------- */
  if (phone) {
    const content = sheet ?? lastSheet;
    const DeviceIcon = VIEWS.find((v) => v.value === shown)!.icon;
    const deviceMenu = (
      <>
        <button
          type="button"
          popoverTarget="device-menu"
          aria-label={`Device: ${devices[0].name}`}
          className="press flex h-10 items-center gap-1 rounded-lg pl-2.5 pr-2 text-fg hover:bg-surface-2"
        >
          <DeviceIcon size={18} aria-hidden />
          <CaretUpDown size={12} aria-hidden className="text-fg-3" />
        </button>
        <Popover id="device-menu" side="top" align="start" label="Device">
          <div role="radiogroup" aria-label="Device" className="w-[248px] p-1.5">
            {DEVICES.map((d) => {
              const V = VIEWS.find((x) => x.value === d.id)!;
              const on = shown === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={(e) => {
                    setView(d.id);
                    closePopover(e.currentTarget);
                  }}
                  className="press flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-body hover:bg-surface-2"
                >
                  <V.icon size={18} aria-hidden className="text-fg-2" />
                  <span className="flex-1">{d.name}</span>
                  {on && <Check size={15} weight="bold" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Popover>
      </>
    );
    // the studio on a phone: four labelled places to go, each a sheet
    const picked = inspectorTitle(comp, csel);
    const studioBar = (
      <nav aria-label="Studio" className="grid shrink-0 grid-cols-4 gap-1 border-t bg-surface px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5">
        {(
          [
            { id: "layers", label: "Layers", note: `${comp.scenes.length} scene${comp.scenes.length > 1 ? "s" : ""}`, icon: Stack, open: () => setSheet("layers") },
            { id: "edit", label: "Edit", note: csel.layer === BG ? cscene.name : picked, icon: SlidersHorizontal, open: () => setSheet("edit") },
            {
              id: "bg",
              label: "Background",
              note: "Colour, effects",
              icon: PaintBucket,
              open: () => {
                setCsel({ scene: csel.scene, layer: BG });
                setSheet("edit");
              },
            },
            { id: "export", label: "Export", note: exporter.state.phase === "working" ? "Rendering…" : comp.kind === "png" ? "Image" : "Video", icon: DownloadSimple, open: () => setSheet("export") },
          ] as const
        ).map((b) => {
          const on = b.id === "bg" ? sheet === "edit" && csel.layer === BG : b.id === "edit" ? sheet === "edit" && csel.layer !== BG : sheet === b.id;
          return (
            <button
              key={b.id}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={on}
              onClick={b.open}
              className={`press flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 ${on ? "bg-surface-2 text-fg" : "text-fg-2 hover:bg-surface-2"}`}
            >
              <b.icon size={20} aria-hidden weight={b.id === "export" ? "bold" : "regular"} />
              <span className="text-caption font-medium leading-4 text-fg">{b.label}</span>
              <span className="w-full truncate text-center text-micro leading-3 text-fg-3">{b.note}</span>
            </button>
          );
        })}
      </nav>
    );
    return (
      <div className="flex h-full flex-col bg-canvas">
        <header className="shrink-0 border-b bg-surface pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-1.5 pl-1.5 pr-2">
            <button
              type="button"
              onClick={() => openLibrary(false)}
              aria-haspopup="dialog"
              aria-expanded={libOpen}
              aria-label={screen ? "Screen builder. Open the library" : `${anim.name}, ${anim.category}. Choose another animation`}
              className="press flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-ui font-semibold">
                  <span className="truncate">{screen ? "Screen builder" : anim.name}</span>
                  <CaretDown size={12} weight="bold" aria-hidden className="shrink-0 text-fg-3" />
                </span>
                <span className="block truncate text-caption text-fg-3">{screen ? `${visible.length} on the screen` : anim.category}</span>
              </span>
            </button>
            {viewSwitch}
            <IconButton size="lg" label="More" popover="phone-more">
              <DotsThree size={20} weight="bold" />
            </IconButton>
            <Popover id="phone-more" align="end" label="More">
              <div className="w-[280px] p-1.5">
                <MenuItem icon={screen ? DeviceMobile : Stack} onSelect={() => (screen ? setMode("single") : openScreen())}>
                  {screen ? "Back to the animation" : "Screen builder"}
                </MenuItem>
                <MenuItem icon={Gauge} hint={h ? `${Math.round(h.fps)} fps${issues ? `, ${issues} to fix` : ""}` : "Measuring"} onSelect={() => setSheet("insights")}>
                  Performance and checks
                </MenuItem>
                <MenuItem icon={FileZip} disabled={exporting || (screen && !layer)} onSelect={exportZip}>
                  {exporting ? "Packing…" : "Download the code"}
                </MenuItem>
                <MenuItem icon={dark ? Sun : Moon} onSelect={flipTheme}>
                  {dark ? "Light theme" : "Dark theme"}
                </MenuItem>
              </div>
            </Popover>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <main aria-label="Stage" className="relative flex min-h-0 flex-1 flex-col">
            {surface}
            {!studio && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-3">
                {hasDuo && <div className="pointer-events-auto rounded-xl bg-overlay p-1 shadow-md">{postureSeg}</div>}
                <div role="toolbar" aria-label="Stage" className="pointer-events-auto flex items-center gap-0.5 rounded-xl bg-overlay p-1 shadow-md">
                  {deviceMenu}
                  {rotateBtn}
                  {screen && (
                    <IconButton size="lg" label="Use the animations (off: arrange the layers)" active={!arrange} onClick={() => setArrange(!arrange)}>
                      <HandPointing size={18} />
                    </IconButton>
                  )}
                  {rmBtn}
                  {hlBtn}
                  {replayBtn}
                </div>
              </div>
            )}
          </main>
          {studio ? (
            studioBar
          ) : screen && !layer ? (
            <section aria-label="Screen builder" className="shrink-0 border-t bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
              <p className="px-1 text-caption text-fg-3">{scene.layers.length ? "Tap a layer on the device to tune it." : "Add an animation to start building a screen."}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button size="lg" variant="primary" onClick={() => openLibrary(false)}>
                  <Plus size={16} weight="bold" aria-hidden />
                  Add animation
                </Button>
                <Button size="lg" onClick={() => setSheet("props")}>
                  <Stack size={16} aria-hidden />
                  Layers
                </Button>
              </div>
            </section>
          ) : (
            <AdjustBar anim={subject} values={subjectValues} setParam={setParam} onShowAll={() => setSheet("props")} />
          )}
          <Sheet
            open={!!sheet}
            onClose={closeSheet}
            half={content === "layers" || content === "edit" || content === "export"}
            title={
              content === "layers" ? "Layers" : content === "edit" ? (csel.layer === BG ? "Background" : picked) : content === "export" ? "Export" : content === "insights" ? "Performance" : screen ? "Screen" : "Properties"
            }
            actions={content === "props" && (!screen || layer) ? resetBtn(true) : undefined}
          >
            {content === "layers" ? (
              // picking a layer goes straight to its settings
              <div className="h-full [&>div]:bg-transparent">{layersPanel(() => setSheet("edit"), true)}</div>
            ) : content === "edit" ? (
              studioInspector(false)
            ) : content === "export" ? (
              <div className="[&>div]:w-full [&>div]:max-w-none">{studioExport}</div>
            ) : content === "insights" ? (
              <div className="[&>div]:w-full [&>div]:max-w-none [&>div]:max-h-none">{insights}</div>
            ) : (
              content === "props" && (
                <>
                  {screenPanel}
                  {(!screen || layer) && <PropertiesPanel anim={subject} values={subjectValues} setParam={setParam} big />}
                </>
              )
            )}
          </Sheet>
        </div>
        {overlays}
      </div>
    );
  }

  /* ---------------- tablet & desktop: library | stage | inspector ---------------- */
  const crumbs = !wide || studio ? (
    <button
      type="button"
      onClick={() => openLibrary(!coarse)}
      aria-haspopup="dialog"
      aria-expanded={libOpen}
      aria-label={screen ? "Screen builder. Open the library" : `${anim.name}, ${anim.category}. Choose another animation`}
      className="press flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-body hover:bg-surface-2"
    >
      <span className="truncate font-medium">{screen ? "Screen builder" : anim.name}</span>
      <CaretDown size={11} weight="bold" aria-hidden className="shrink-0 text-fg-3" />
    </button>
  ) : (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-body">
        {screen ? (
          <li aria-current="page" className="truncate font-medium">
            Screen builder
          </li>
        ) : (
          <>
            <li className="hidden shrink-0 text-fg-3 lg:block">{anim.category}</li>
            <li aria-hidden className="hidden text-fg-3 lg:block">
              /
            </li>
            <li aria-current="page" title={anim.blurb} className="truncate font-medium">
              {anim.name}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
  const busy = exporter.state.phase === "working";
  const exportBtn = (
    <>
      <Button variant="primary" popover="export-pop">
        <DownloadSimple size={14} weight="bold" aria-hidden />
        {studio && busy && exporter.state.phase === "working" ? (exporter.state.total > 1 ? `${Math.round((exporter.state.done / exporter.state.total) * 100)}%` : "Rendering…") : "Export"}
      </Button>
      <Popover id="export-pop" align="end" label="Export">
        {studio ? (
          studioExport
        ) : (
          <CodeExport anim={subject} values={subjectValues} exporting={exporting} exportZip={exportZip} say={say} onMockup={() => setStudio(true)} />
        )}
      </Popover>
    </>
  );
  const dock = !studio && (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
      <div role="toolbar" aria-label="Stage" className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-overlay p-1 shadow-md no-scrollbar">
        <Segmented label="Device" value={shown} onChange={setView} options={VIEWS} hideLabels="always" tipSide="top" />
        {rotateBtn}
        {hasDuo && divider}
        {hasDuo && postureSeg}
        {screen && divider}
        {screen && pointerSeg}
        {divider}
        {rmBtn}
        {hlBtn}
        {replayBtn}
        {divider}
        {insightsChip()}
        <Popover id="insights" side="top" align="end" label="Performance and checks">
          {insights}
        </Popover>
      </div>
    </div>
  );

  /** What the inspector shows, wherever it sits: the mockup's settings, the screen's layers, or the properties. */
  const inspectorBody = (cols: boolean) =>
    studio ? (
      studioInspector(cols)
    ) : screen ? (
      <>
        {screenPanel}
        {layer ? (
          <>
            <div className="flex h-11 items-center gap-2 border-y bg-surface-2/50 pl-4 pr-2.5">
              <SlidersHorizontal size={15} aria-hidden className="shrink-0 text-fg-3" />
              <p className="mr-auto truncate text-body font-medium">{subject.name}</p>
              {resetBtn()}
            </div>
            <PropertiesPanel anim={subject} values={subjectValues} setParam={setParam} cols={cols} />
          </>
        ) : (
          scene.layers.length > 0 && <p className="px-6 py-8 text-center text-caption text-fg-3">Pick a layer to tune its properties.</p>
        )}
      </>
    ) : (
      <PropertiesPanel anim={subject} values={subjectValues} setParam={setParam} cols={cols} />
    );
  const inspectTitle = studio ? inspectorTitle(comp, csel) : screen ? "Screen" : "Properties";

  /* ---------------- tablet held upright: the stage full width, a panel under it ---------------- */
  if (tablet) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-surface px-2">
          <div className="flex min-w-0 items-center gap-1 pl-1">
            {crumbs}
            {!screen && (
              <span className="flex items-center">
                <IconButton label="Previous animation" kbd="[" onClick={() => stepAnim(-1)}>
                  <CaretLeft size={16} />
                </IconButton>
                <IconButton label="Next animation" kbd="]" onClick={() => stepAnim(1)}>
                  <CaretRight size={16} />
                </IconButton>
              </span>
            )}
          </div>
          {viewSwitch}
          <div className="flex min-w-0 items-center justify-end gap-1.5">{exportBtn}</div>
        </header>
        <main aria-label="Stage" className="relative flex min-h-0 flex-1 flex-col">
          {surface}
          {dock}
        </main>
        {/* a sheet over the bottom of the stage: the handle says it moves, the header says what's in it */}
        <section
          aria-label={studio ? "Studio" : panel === "library" ? "Library" : inspectTitle}
          className={`flex shrink-0 flex-col rounded-t-2xl border-t bg-surface shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.35)] ${panelOpen ? (studio ? "h-[44%]" : "h-[40%]") : ""}`}
        >
          <button
            type="button"
            aria-label={panelOpen ? "Hide the panel" : "Show the panel"}
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(!panelOpen)}
            className="group flex h-4 shrink-0 cursor-pointer items-end justify-center"
          >
            <span aria-hidden className="h-1 w-10 rounded-full bg-line-strong transition-colors duration-150 group-hover:bg-fg-3" />
          </button>
          {studio ? (
            panelOpen ? (
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,36%)_1fr]">
                <div className="min-h-0 border-r">{layersPanel()}</div>
                <div className="flex min-h-0 flex-col">
                  <div className="flex h-12 shrink-0 items-center gap-2 border-b pl-4 pr-2">
                    <h2 className="mr-auto truncate text-body font-semibold">{inspectTitle}</h2>
                    <IconButton label="Hide the panel" onClick={() => setPanelOpen(false)}>
                      <CaretDown size={18} />
                    </IconButton>
                  </div>
                  <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{studioInspector(false)}</div>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setPanelOpen(true)} className="press flex h-12 items-center gap-2.5 px-4 text-left">
                <Stack size={16} aria-hidden className="text-fg-2" />
                <span className="text-body font-semibold">Layers and settings</span>
                <span className="truncate text-caption text-fg-3">{inspectTitle}</span>
                <CaretUp size={18} aria-hidden className="ml-auto shrink-0 text-fg-2" />
              </button>
            )
          ) : (
            <>
              <div className="flex h-12 shrink-0 items-center gap-2 pl-3 pr-2">
                <Segmented
                  label="Panel"
                  value={panel}
                  onChange={(v) => {
                    setPanel(v);
                    setPanelOpen(true);
                  }}
                  options={[
                    { value: "inspect", label: inspectTitle, icon: SlidersHorizontal },
                    { value: "library", label: "Library", icon: SquaresFour },
                  ]}
                />
                {panel === "inspect" && panelOpen && resetBtn()}
                <span className="ml-auto" />
                <IconButton label={panelOpen ? "Hide the panel" : "Show the panel"} expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
                  {panelOpen ? <CaretDown size={18} /> : <CaretUp size={18} />}
                </IconButton>
              </div>
              {panelOpen && <div className="scroll-thin min-h-0 flex-1 overflow-y-auto border-t">{panel === "library" ? library : inspectorBody(true)}</div>}
            </>
          )}
        </section>
        {overlays}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <a href="#inspector" className="skip-link">
        Skip to inspector
      </a>
      {studio ? <aside className="w-[256px] shrink-0 border-r xl:w-[272px]">{layersPanel()}</aside> : wide && <aside className="w-[272px] shrink-0 border-r">{library}</aside>}

      <main aria-label="Stage" className="relative flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-surface px-2">
          <div className="flex min-w-0 items-center gap-1.5 pl-1">
            {(!wide || studio) && (
              <IconButton label="Library" kbd="/" expanded={libOpen} onClick={() => openLibrary(!coarse)}>
                <SidebarSimple size={18} />
              </IconButton>
            )}
            {crumbs}
            {!screen && (
              <span className="hidden items-center lg:flex">
                <IconButton size="sm" label="Previous animation" kbd="[" onClick={() => stepAnim(-1)}>
                  <CaretLeft size={14} />
                </IconButton>
                <IconButton size="sm" label="Next animation" kbd="]" onClick={() => stepAnim(1)}>
                  <CaretRight size={14} />
                </IconButton>
              </span>
            )}
          </div>
          {viewSwitch}
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            {!studio && !compare && (
              <span className="relative hidden lg:block">
                <select
                  aria-label="Zoom"
                  value={String(zoom)}
                  onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
                  className={`${field} h-8 w-[72px] cursor-pointer appearance-none pl-2.5 pr-6 text-body tabular-nums`}
                >
                  <option value="fit">Fit</option>
                  <option value="0.5">50%</option>
                  <option value="0.75">75%</option>
                  <option value="1">100%</option>
                </select>
                <CaretUpDown size={12} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-3" />
              </span>
            )}
            {exportBtn}
          </div>
        </div>
        {surface}
        {dock}
      </main>

      <Inspector title={inspectTitle} actions={!studio && !screen ? resetBtn() : undefined}>
        {inspectorBody(false)}
      </Inspector>
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
