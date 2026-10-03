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
    };
  }
}

const anim = byId(new URLSearchParams(location.search).get("a"));

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
createRoot(root).render(anim?.load ? <Stage /> : <p className="text-sm opacity-60">Unknown animation</p>);
