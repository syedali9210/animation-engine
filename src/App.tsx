import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  BookOpen,
  CaretDown,
  CaretUpDown,
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
  PersonArmsSpread,
  Plus,
  SidebarSimple,
  SlidersHorizontal,
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
import { Button, Count, Dialog, IconButton, Kbd, Logo, MenuItem, Popover, Segmented, Sheet, Switch, useMedia, type Icon } from "./ui";
import { detectHost, suggest, type Suggestion } from "./suggest";
import { downloadZip } from "./exporter";
import type { RenderConfig } from "./studio/config";
import { serverMedia, useExport, type ExportKind } from "./studio/export";
import { DEFAULT_SHOT, backdropCss, finishOf, shotPose, sizeOf, type Shot } from "./studio/shot";
import { MockupExport, MockupPanel } from "./studio/Studio";

// the 3D stage brings three.js, so it loads the first time the mockup opens
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
type PhoneSheet = "props" | "insights";
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
  ["Preview / Mockup", ["P"]],
  ["Fold / unfold the iPhone Duo", ["F"]],
  ["Rotate", ["L"]],
  ["Replay", ["R"]],
  ["Emulate reduced motion", ["M"]],
  ["Light / dark theme", ["T"]],
  ["Screen builder: move the picked layer", ["←", "→", "↑", "↓"]],
  ["Screen builder: remove the picked layer", ["Del"]],
  ["Show shortcuts", ["?"]],
];

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

  // Mockup: the device in 3D under studio light, with the live screen on it, exported as a still or a video
  const [studioOn, setStudio] = useState(() => store.get("studio", false));
  const [shot, setShotState] = useState<Shot>(() => ({ ...DEFAULT_SHOT, ...store.get<Partial<Shot>>("shot", {}) }));
  const setShot = useCallback((patch: Partial<Shot>) => setShotState((x) => ({ ...x, ...patch })), []);
  // the move previews on its own unless the system asks for less motion
  const [playing, setPlaying] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const exporter = useExport();

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
  useEffect(() => store.set("posture", posture), [posture]);
  useEffect(() => store.set("mode", mode), [mode]);
  useEffect(() => store.set("keys", keys), [keys]);
  useEffect(() => store.set("studio", studioOn), [studioOn]);
  useEffect(() => store.set("shot", shot), [shot]);
  useEffect(() => {
    const t = setTimeout(() => store.set("scene", scene), 250); // not on every pointer move
    return () => clearTimeout(t);
  }, [scene]);
  useEffect(() => {
    document.title = `${screen ? "Screen builder" : anim.name} · Animation Engine`;
  }, [anim, screen]);
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

  // phones don't get Compare: four devices side by side would be thumbnails; the mockup frames one device
  const studio = studioOn && !phone;
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
  const live = useRef({ values, dark, scene, media });
  live.current = { values, dark, scene, media };
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
  const env = useRef({ wide, keys, screen, sel, vp: firstViewport, layers: scene.layers, phone });
  env.current = { wide, keys, screen, sel, vp: firstViewport, layers: scene.layers, phone };
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
      if (!s.keys) return;
      const go = (dir: number) => {
        setMode("single");
        setId((cur) => ANIMS[(ANIMS.findIndex((a) => a.id === cur) + dir + ANIMS.length) % ANIMS.length].id);
      };
      const map: Record<string, () => void> = {
        "1": () => setView("iphone"),
        "2": () => setView("duo"),
        "3": () => setView("ipad"),
        "4": () => setView("macbook"),
        "5": () => setView("compare"),
        p: () => !s.phone && setStudio((x) => !x),
        f: () => setPosture((p) => (p === "folded" ? "open" : "folded")),
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
  }, [openLibrary, updateLayer]);

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
  const PAD = phone ? 16 : 40;
  const GAP = phone ? 24 : 48;
  // the floating dock under the devices (desktop always; phones only for the Duo's posture or a built screen)
  const DOCK = phone ? (hasDuo || screen ? 56 : 0) : 64;
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

  /* ---------- mockup ---------- */
  const studioDevice = devices[0];
  /** Everything the export's own page needs to draw this exact shot by itself. A still is the shot itself (no move),
      with the screen caught where its library card is: a moment chosen to look good. */
  const renderConfig = async (d: Device, kind: ExportKind): Promise<RenderConfig> => ({
    device: d.id,
    posture,
    landscape: landscape && d.rotates,
    finish: finishOf(shot, d.id).id,
    pose: shotPose(shot, d.id),
    motion: kind === "png" ? "still" : shot.motion,
    duration: shot.duration,
    backdrop: backdropCss(shot),
    shadow: shot.shadow,
    reflections: shot.reflections,
    dark,
    screenBg: screenBgFor(),
    frames: itemsFor(d).map(({ fid, a, l }) => ({
      fid,
      path: a.html ? htmlUrl(a) : "/stage.html",
      query: { ...(a.html ? {} : { a: a.id }), ...(l ? { layer: "1" } : {}), ...(nativeDpr ? { dpr: String(d.dpr) } : {}) },
      values: valuesOf(fid),
      box: l ? layerBox(l) : undefined,
      bare: !!l && (!!media || !!scene.bg || visible.indexOf(l) > 0),
    })),
    media: screen && media ? { url: await serverMedia(media.url), video: media.video } : undefined,
    preroll: kind === "png" ? (screen ? 1800 : (anim.poster?.at ?? 1800)) : 0,
  });
  const exportMockup = (kind: ExportKind) =>
    exporter.run(kind, () => renderConfig(studioDevice, kind), sizeOf(shot), shot.fps, `${screen ? "screen" : anim.id}-${studioDevice.id}-${shot.angle}`);
  const studioStage = studio && (
    <Suspense
      fallback={
        <div className="grid min-h-0 flex-1 place-items-center">
          <Spinner size={22} />
        </div>
      }
    >
      <StudioStage
      d={studioDevice}
      posture={posture}
      landscape={landscape}
      dark={dark}
      ink={inkFor(studioDevice)}
      screenBg={screenBgFor()}
      shot={shot}
      setShot={setShot}
      playing={playing}
      setPlaying={setPlaying}
    >
      {screenFor(studioDevice, 1)}
      </StudioStage>
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
      onClose={wide ? undefined : () => setLibOpen(false)}
      visible={wide || libOpen}
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
      {!wide && (
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
            const f = [...e.dataTransfer.files].find((x) => /^(image|video)\//.test(x.type));
            if (!f) return say("Only images and videos can go behind the screen");
            setMedia(f);
            if (!screen) openScreen();
            say(`${f.name} is now the screen background`);
          }}
        >
          <div className="pointer-events-none flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-overlay px-8 py-7 text-center shadow-lg">
            <ImageSquare size={28} className="text-fg-2" aria-hidden />
            <p className="text-ui font-semibold">Drop to use as the screen background</p>
            <p className="text-body text-fg-2">Images and videos sit behind every animation on the screen you're building.</p>
          </div>
        </div>
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[80] flex justify-center px-4">
        {said && <p className="rounded-full bg-fg px-3.5 py-1.5 text-caption font-medium text-surface shadow-md">{said}</p>}
      </div>
    </>
  );

  /* ---------------- phone: stage, one-property adjust bar, sheets ---------------- */
  if (phone) {
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
              aria-label={screen ? "Screen builder. Open the library" : `${anim.name}, ${anim.category}. Choose another animation`}
              className="press flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
            >
              <Logo size={28} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-ui font-semibold">
                  <span className="truncate">{screen ? "Screen builder" : anim.name}</span>
                  <CaretDown size={12} weight="bold" aria-hidden className="shrink-0 text-fg-3" />
                </span>
                <span className="block truncate text-caption text-fg-3">{screen ? `${visible.length} on the screen` : anim.category}</span>
              </span>
            </button>
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
            <div className="flex h-14 shrink-0 items-center justify-between gap-1 px-2.5">
              <div className="flex items-center gap-1">
                <Segmented size="lg" label="Device" value={shown} onChange={setView} options={VIEWS.slice(0, 4)} hideLabels="always" />
                {rotateBtn}
              </div>
              <div className="flex items-center">
                {rmBtn}
                {replayBtn}
              </div>
            </div>
            {stage}
            {(hasDuo || screen) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-overlay p-1 shadow-md no-scrollbar">
                  {hasDuo && postureSeg}
                  {hasDuo && screen && divider}
                  {screen && pointerSeg}
                </div>
              </div>
            )}
          </main>
          {screen && !layer ? (
            <section aria-label="Screen builder" className="shrink-0 border-t bg-surface px-4 py-4">
              <p className="text-ui font-medium">{scene.layers.length ? "Pick a layer to tune it" : "Build a screen"}</p>
              <p className="mt-0.5 text-caption text-fg-3">Tap an animation on the device to pick it, or add one from the library.</p>
              <div className="mt-3 flex gap-2">
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
            title={content === "insights" ? "Performance" : screen ? "Screen" : "Properties"}
            actions={content === "props" && (!screen || layer) ? resetBtn(true) : undefined}
          >
            {content === "insights" ? (
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
  const crumbs = (
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
          <MockupExport shot={shot} set={setShot} exporting={exporter.state} onExport={exportMockup} />
        ) : (
          <CodeExport anim={subject} values={subjectValues} exporting={exporting} exportZip={exportZip} say={say} />
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
        {replayBtn}
        {divider}
        {insightsChip()}
        <Popover id="insights" side="top" align="end" label="Performance and checks">
          {insights}
        </Popover>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <a href="#inspector" className="skip-link">
        Skip to inspector
      </a>
      {wide && <aside className="w-[272px] shrink-0 border-r">{library}</aside>}

      <main aria-label="Stage" className="relative flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-surface px-2">
          <div className="flex min-w-0 items-center gap-1.5 pl-1">
            {!wide && (
              <IconButton label="Library" kbd="/" expanded={libOpen} onClick={() => openLibrary(!coarse)}>
                <SidebarSimple size={18} />
              </IconButton>
            )}
            {crumbs}
          </div>
          <Segmented
            label="View"
            value={studio ? "mockup" : "preview"}
            onChange={(v) => setStudio(v === "mockup")}
            options={[
              { value: "preview", label: "Preview", icon: Devices },
              { value: "mockup", label: "Mockup", icon: Cube },
            ]}
          />
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
        {studio ? studioStage : stage}
        {dock}
      </main>

      {studio ? (
        <Inspector title="Mockup">
          <MockupPanel d={studioDevice} shot={shot} set={setShot} setDevice={(x) => setView(x)} posture={posture} setPosture={setPosture} />
        </Inspector>
      ) : screen ? (
        <Inspector title="Screen">
          {screenPanel}
          {layer ? (
            <>
              <div className="flex h-11 items-center gap-2 border-y bg-surface-2/50 pl-4 pr-2.5">
                <SlidersHorizontal size={15} aria-hidden className="shrink-0 text-fg-3" />
                <p className="mr-auto truncate text-body font-medium">{subject.name}</p>
                {resetBtn()}
              </div>
              <PropertiesPanel anim={subject} values={subjectValues} setParam={setParam} />
            </>
          ) : (
            scene.layers.length > 0 && <p className="px-6 py-8 text-center text-caption text-fg-3">Pick a layer to tune its properties.</p>
          )}
        </Inspector>
      ) : (
        <Inspector title="Properties" actions={resetBtn()}>
          <PropertiesPanel anim={subject} values={subjectValues} setParam={setParam} />
        </Inspector>
      )}
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
