// The launch-film kit: what every film in "Launch films" is drawn with. A film is a pure function of one clock (t, in
// seconds), so the engine's stepped export renders it exactly; this file holds that clock, the 1920×1080 stage it's
// drawn on, GSAP-named easings, the entrance every title uses, typed text and its caret, words that open from nothing,
// a cursor, and a live product screen (any of the engine's React animations, running inside the film).
import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { byId, withDefaults } from "../../registry";
import "./film.css";

/* ---------------- time and easing (GSAP's names, in comments) ---------------- */

export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** power4.out */
export const out = (x: number) => 1 - (1 - clamp(x)) ** 5;
/** expo.out */
export const expo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)));
/** power3.inOut */
export const inOut = (x: number) => {
  const k = clamp(x);
  return k < 0.5 ? 8 * k ** 4 : 1 - (-2 * k + 2) ** 4 / 2;
};
/** power3.in */
export const acc = (x: number) => clamp(x) ** 4;
/** back.out(s) */
export const back = (x: number, s = 1.7) => {
  const k = clamp(x) - 1;
  return 1 + (s + 1) * k ** 3 + s * k ** 2;
};
export const typed = (s: string, t: number, at: number, cps = 18) =>
  s.slice(0, Math.max(0, Math.min(s.length, Math.floor((t - at) * cps))));
export const typingEnd = (s: string, at: number, cps = 18) => at + s.length / cps;
/** the caret: solid while typing, blinking (0.5 s) when it waits */
export const blink = (t: number, busy: boolean) => (busy || Math.floor(t * 2) % 2 === 0 ? 1 : 0);
export const visible = (t: number, a: number, b: number) => t >= a - 0.05 && t <= b + 0.05;

export type Fx = { at: number; dur?: number; out?: number; outDur?: number; dy?: number; blur?: number; scale?: number; outDy?: number };
/** In: rise from below, out of a blur (power4.out). Out: up and away, blurring (power3.in). */
export function fx(t: number, o: Fx): CSSProperties {
  const i = (o.dur ?? 0.7) <= 0 ? 1 : out(seg(t, o.at, o.at + (o.dur ?? 0.7)));
  const e = o.out == null ? 0 : acc(seg(t, o.out, o.out + (o.outDur ?? 0.35)));
  const dy = (1 - i) * (o.dy ?? 36) + e * (o.outDy ?? -30);
  const blur = (1 - i) * (o.blur ?? 10) + e * 10;
  return {
    opacity: i * (1 - e),
    transform: `translateY(${dy}px) scale(${lerp(o.scale ?? 0.97, 1, i)})`,
    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
  };
}

/** A huge word arriving the way the launch films throw one in: out of a wide motion blur, settling (expo.out). */
export function smear(t: number, at: number, dur = 0.6, from = -90): CSSProperties {
  const k = expo(seg(t, at, at + dur));
  return {
    opacity: k,
    transform: `translateX(${(1 - k) * from}px) scaleX(${lerp(1.22, 1, k)})`,
    filter: k < 1 ? `blur(${(1 - k) * 30}px)` : undefined,
  };
}

/* ---------------- the clock and the stage ---------------- */

/**
 * Seconds since the film mounted. `?t=12.5` holds one frame (for stills); in the engine it loops; in an export (the
 * stepped clock, `?vt=1`) it stops on its last frame, so a frame's clock running a little ahead can't wrap it.
 */
export function useClock(duration: number) {
  const q = new URLSearchParams(location.search);
  const hold = Number(q.get("t"));
  const held = Number.isFinite(hold) && hold > 0;
  const once = q.get("vt") === "1";
  const [t, setT] = useState(held ? hold : 0);
  useEffect(() => {
    if (held) return;
    let id = 0;
    const t0 = performance.now();
    const tick = () => {
      const s = (performance.now() - t0) / 1000;
      setT(once ? Math.min(s, duration - 0.001) : s % duration);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [held, once, duration]);
  return t;
}

/** The fonts have to be in before anything measures text. */
export function useFonts() {
  const [, set] = useState(0);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && set((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);
}

/** The film's 1920×1080 stage, scaled to fit whatever frame it plays in (letterboxed, centred). */
export function Stage({
  children,
  background = "#000",
  className = "",
  style,
}: {
  children: ReactNode;
  background?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current!;
    const fit = () => setK(Math.min(el.clientWidth / 1920, el.clientHeight / 1080) || 1);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", background }}>
      <div
        className={className}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1920,
          height: 1080,
          overflow: "hidden",
          transformOrigin: "50% 50%",
          transform: `translate(-50%, -50%) scale(${k})`,
          WebkitFontSmoothing: "antialiased",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------- type ---------------- */

/** Text that opens from nothing to its own width (`p` 0 → 1), the way a word appears between braces. */
export function Reveal({ p, children, style }: { p: number; children: ReactNode; style?: CSSProperties }) {
  const inner = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = inner.current;
    if (el && el.offsetWidth !== w) setW(el.offsetWidth);
  });
  return (
    <span style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", verticalAlign: "bottom", width: w * p, ...style }}>
      <span ref={inner} style={{ display: "inline-block" }}>
        {children}
      </span>
    </span>
  );
}

/** Words rising in one after another. */
export function Words({
  text,
  t,
  at,
  gap = 0.07,
  style,
}: {
  text: string;
  t: number;
  at: number;
  gap?: number;
  style?: (i: number, w: string) => CSSProperties | undefined;
}) {
  return (
    <>
      {text.split(" ").map((w, i, all) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            ...fx(t, { at: at + i * gap, dur: 0.6, dy: 26, blur: 8 }),
            ...style?.(i, w),
          }}
        >
          {w + (i < all.length - 1 ? " " : "")}
        </span>
      ))}
    </>
  );
}

export function Caret({ on, color }: { on: number; color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.07em",
        height: "0.9em",
        marginLeft: "0.05em",
        verticalAlign: "-0.08em",
        borderRadius: 2,
        background: color ?? "currentColor",
        opacity: on,
      }}
    />
  );
}

/** "*word*" in a line becomes the accent; everything else stays ink. */
export function Marked({ text, accent }: { text: string; accent: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} style={{ color: accent }}>
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
export const unmark = (s: string) => s.replace(/\*/g, "");

/* ---------------- colour and the product's mark ---------------- */

const rgbOf = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  const n = m ? parseInt(m[1], 16) : 0xfc8019;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** `a` mixed `k` of the way to `b` (hex in, rgb() out). */
export const mix = (a: string, b: string, k: number) => {
  const [x, y] = [rgbOf(a), rgbOf(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`;
};
export const alpha = (a: string, o: number) => `rgba(${rgbOf(a).join(",")},${o})`;

/** The product's mark when it has none of its own: its first letter on the accent, in a rounded tile. */
export function Mark({ name, a, size, glass = false }: { name: string; a: string; size: number; glass?: boolean }) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        flex: "none",
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: glass
          ? `linear-gradient(160deg, rgba(255,255,255,.85), ${alpha(a, 0.35)} 60%, ${alpha(a, 0.75)})`
          : `linear-gradient(160deg, ${mix(a, "#ffffff", 0.25)}, ${a} 55%, ${mix(a, "#000000", 0.2)})`,
        boxShadow: glass
          ? `inset 0 1px 0 rgba(255,255,255,.9), inset 0 0 0 1px rgba(255,255,255,.6), 0 ${size * 0.2}px ${size * 0.5}px -${size * 0.14}px ${alpha(a, 0.55)}`
          : `inset 0 1px 0 rgba(255,255,255,.4), 0 ${size * 0.18}px ${size * 0.45}px -${size * 0.12}px ${alpha(a, 0.55)}`,
        backdropFilter: glass ? "blur(10px)" : undefined,
        color: glass ? mix(a, "#000000", 0.15) : "#fff",
        fontSize: size * 0.56,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 1,
      }}
    >
      {(name.trim()[0] ?? "•").toUpperCase()}
    </span>
  );
}

/* ---------------- the cursor ---------------- */

export function Cursor({
  x,
  y,
  press = 0,
  hand = false,
  size = 1,
}: {
  x: number;
  y: number;
  press?: number;
  hand?: boolean;
  size?: number;
}) {
  const s = size * (1 - 0.12 * press);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 34"
      width={28}
      height={34}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${s})`,
        transformOrigin: "4px 4px",
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))",
        zIndex: 20,
      }}
    >
      {hand ? (
        <path
          d="M10.5 15.5V5.6a2 2 0 0 1 4 0v8.1-2.3a2 2 0 0 1 4 0v2.6-1.6a2 2 0 0 1 4 0v2.8-.8a2 2 0 0 1 4 0v7.4c0 5-3.7 8.7-8.6 8.7h-1.6c-2.6 0-4.4-1-6-3.1l-4.2-5.6a2 2 0 0 1 3.1-2.6l1.3 1.4Z"
          fill="#fff"
          stroke="#111"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M4 3.5v23.2l6.1-5.6 3.9 9.1 4.3-1.9-3.9-8.9h8.5Z" fill="#111" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/* ---------------- a live product screen ---------------- */

export { SCREENS } from "./screens";

/**
 * One of the engine's animations, running live inside the film at a phone's size (402×874, or `w`×`h`), drawn at
 * `scale`. A transform on the box makes it the containing block, so the animation's fixed layers stay inside it.
 */
export function Screen({
  id,
  w = 402,
  h = 874,
  scale = 1,
  radius = 0,
  style,
}: {
  id: string;
  w?: number;
  h?: number;
  scale?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  const meta = byId(id);
  const Comp = useMemo(() => (meta?.load ? lazy(meta.load as () => Promise<{ default: ComponentType<{ p: unknown }> }>) : null), [meta]);
  const p = useMemo(() => (meta ? withDefaults(meta) : {}), [meta]);
  const center = meta?.layout !== "fill";
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        borderRadius: radius,
        transform: "translateZ(0)",
        zoom: scale,
        background: "#fff",
        ...(center ? { display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" } : null),
        ...style,
      }}
    >
      {Comp && (
        <Suspense>
          <Comp p={p} />
        </Suspense>
      )}
    </div>
  );
}

/** A phone around a screen: the black bezel, the island, the rounded glass. `scale` sizes the whole thing. */
export function Phone({ id, scale = 1, shadow = true, children }: { id?: string; scale?: number; shadow?: boolean; children?: ReactNode }) {
  return (
    <div
      style={{
        zoom: scale,
        position: "relative",
        width: 402 + 24,
        height: 874 + 24,
        padding: 12,
        borderRadius: 68,
        background: "#0b0b0c",
        boxShadow: shadow
          ? "inset 0 0 0 1.5px rgba(255,255,255,.12), 0 0 0 1px rgba(0,0,0,.6), 0 60px 120px -40px rgba(0,0,0,.45), 0 20px 50px -20px rgba(0,0,0,.3)"
          : "inset 0 0 0 1.5px rgba(255,255,255,.12)",
      }}
    >
      <div style={{ position: "relative", width: 402, height: 874, borderRadius: 56, overflow: "hidden", transform: "translateZ(0)" }}>
        {children ?? (id ? <Screen id={id} /> : null)}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 11,
            width: 124,
            height: 36,
            marginLeft: -62,
            borderRadius: 20,
            background: "#000",
            zIndex: 30,
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- confetti and a spark ---------------- */

/** A seeded burst: the same pieces every render, so it exports exactly. `p` 0 → 1 is the burst's life. */
export function Confetti({
  p,
  x,
  y,
  colors,
  count = 46,
  spread = 520,
}: {
  p: number;
  x: number;
  y: number;
  colors: string[];
  count?: number;
  spread?: number;
}) {
  if (p <= 0 || p >= 1) return null;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pieces = Array.from({ length: count }, (_, i) => {
    const a = rnd() * Math.PI * 2;
    const v = 0.45 + rnd() * 0.55;
    return { a, v, r: rnd() * 360, s: 10 + rnd() * 16, c: colors[i % colors.length], spin: (rnd() - 0.5) * 900 };
  });
  const k = out(p);
  return (
    <>
      {pieces.map((q, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: x + Math.cos(q.a) * spread * q.v * k,
            top: y + Math.sin(q.a) * spread * 0.62 * q.v * k + 260 * p * p,
            width: q.s,
            height: q.s * 0.62,
            borderRadius: 3,
            background: q.c,
            opacity: 1 - acc(seg(p, 0.6, 1)),
            transform: `rotate(${q.r + q.spin * p}deg) skewX(${(q.v - 0.7) * 40}deg)`,
          }}
        />
      ))}
    </>
  );
}

/** A four-pointed spark. */
export function Spark({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" fill={color} />
    </svg>
  );
}
