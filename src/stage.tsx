import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { byId, withDefaults, type Values } from "./registry";
import "./stage.css";

declare global {
  interface Window {
    engine?: {
      reduce: boolean;
      scheme: "dark" | "light";
      params: Values | null;
      onParams(fn: (v: Values) => void): () => void;
      onTheme(fn: (scheme: "dark" | "light") => void): () => void;
      report(type: string, data: object): void;
      /** placed on a built screen with something behind it */
      bare: boolean;
      onBare(fn: (bare: boolean) => void): () => void;
    };
  }
}

const q = new URLSearchParams(location.search);
const anim = byId(q.get("a"));
// placed on a built screen: let the screen's background through, and say how big the animation is
const layer = q.get("layer") === "1";

// No MotionConfig here on purpose: each animation keeps exactly the reduced-motion behaviour its source has,
// so the engine's emulation shows the truth (Chat Quiz brings its own MotionConfig, others don't).
function Stage() {
  const a = anim!;
  const [p, setP] = useState(() => withDefaults(a, window.engine?.params ?? undefined));
  useEffect(() => window.engine?.onParams((v) => setP(withDefaults(a, v))), [a]);
  const Comp = useMemo(() => lazy(a.load!), [a]);
  // params flagged `reload` are read once at setup, so changing one remounts the animation
  const key = Object.keys(a.schema).filter((k) => a.schema[k].reload).map((k) => String(p[k])).join("|");
  return (
    <Suspense>
      <Comp key={key} p={p} />
    </Suspense>
  );
}

const root = document.getElementById("root")!;
root.className = anim?.layout === "fill" ? "fill" : "center";
if (layer) {
  document.documentElement.style.background = document.body.style.background = "transparent";
  // natural size of a centred animation: the box around everything it paints (wrappers are often full width,
  // so their own boxes say nothing), largest over its first seconds so a card that expands later still fits
  const paints = (el: Element) => {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return false; // the <svg> speaks for its paths
    if (/^(img|svg|canvas|video)$/i.test(el.tagName)) return true;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.opacity === "0") return false;
    return (
      !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor) ||
      cs.backgroundImage !== "none" ||
      cs.boxShadow !== "none" ||
      (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") ||
      [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
    );
  };
  let w = 0;
  let h = 0;
  const measure = () => {
    if (anim?.layout === "fill") return;
    const rects = [...root.querySelectorAll("*")].filter(paints).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1);
    if (!rects.length) return;
    w = Math.max(w, Math.max(...rects.map((r) => r.right)) - Math.min(...rects.map((r) => r.left)));
    h = Math.max(h, Math.max(...rects.map((r) => r.bottom)) - Math.min(...rects.map((r) => r.top)));
    window.engine?.report("size", { w: Math.ceil(w) + 64, h: Math.ceil(h) + 64 }); // room to breathe and to move
  };
  for (const t of [800, 2200, 4500]) setTimeout(measure, t);
}
createRoot(root).render(anim?.load ? <Stage /> : <p className="text-sm opacity-60">Unknown animation</p>);
