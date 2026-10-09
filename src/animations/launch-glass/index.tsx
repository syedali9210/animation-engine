// Glass launch — a 34 s SaaS launch film cut the way the LangEase film is (studied shot by shot): single words blurring
// in on a soft tinted glass world; a word, the product's icon dropping in, a word; a tunnel of live phones flown through
// while the line in the middle changes; a progress bar; a glass orb that draws its check and bursts into confetti; the
// product tilted with a cursor tapping it; a line among flying cards; a black button that turns into the accent when
// it's pressed; a spark flying into a three-word line; the end card.
//
// The words come from the params (the copy writer fills them), the screens are the product's own, running live. Each
// frame is a pure function of t, so the engine's export renders it exactly.
import { type CSSProperties } from "react";
import {
  Confetti,
  Cursor,
  Mark,
  Phone,
  Reveal,
  Screen,
  Spark,
  Stage,
  acc,
  alpha,
  back,
  clamp,
  expo,
  fx,
  inOut,
  lerp,
  mix,
  out,
  seg,
  useClock,
  useFonts,
  visible,
} from "../_film/kit";
import type { params as defaults } from "./params";

type P = typeof defaults;
export const DURATION = 34;

const parts = (s: string, n: number) => {
  const xs = s.split("|").map((x) => x.trim());
  while (xs.length < n) xs.push("");
  return xs;
};

export default function GlassLaunch({ p }: { p: P }) {
  useFonts();
  const t = useClock(DURATION);
  const a = p.accent || "#fc8019";
  const drift = Math.sin(t * 0.35) * 40;
  return (
    <Stage background={mix("#ffffff", a, 0.05)} style={{ fontFamily: '"Geist", "Inter", system-ui, sans-serif', color: "#16161d" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(45% 45% at ${30 + drift / 20}% ${20 + drift / 30}%, ${alpha(a, 0.13)} 0%, transparent 70%), radial-gradient(50% 50% at ${78 - drift / 25}% ${85 - drift / 30}%, ${alpha(a, 0.16)} 0%, transparent 70%)`,
        }}
      />
      {visible(t, 0, 2.6) && <Words2 t={t} p={p} a={a} />}
      {visible(t, 2.6, 5.4) && <Pair t={t} p={p} a={a} />}
      {visible(t, 5.4, 10.0) && <Tunnel t={t} p={p} a={a} />}
      {visible(t, 10.0, 12.6) && <Progress t={t} p={p} a={a} />}
      {visible(t, 12.6, 14.8) && <Done t={t} p={p} a={a} />}
      {visible(t, 14.8, 18.6) && <Tap t={t} p={p} a={a} />}
      {visible(t, 18.6, 21.6) && <Cards t={t} p={p} a={a} />}
      {visible(t, 21.6, 25.1) && <Button t={t} p={p} a={a} />}
      {visible(t, 24.9, 29.4) && <Trio t={t} p={p} a={a} />}
      {visible(t, 29.4, 34) && <End t={t} p={p} a={a} />}
    </Stage>
  );
}

type S = { t: number; p: P; a: string };

/** Text painted with the accent, light to deep. */
const ink = (a: string): CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${mix(a, "#ffffff", 0.25)} 0%, ${a} 45%, ${mix(a, "#000000", 0.18)} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});
const row = (top: number, extra?: CSSProperties): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  top,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  ...extra,
});
const type = (size: number, weight = 600): CSSProperties => ({
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.04em",
  lineHeight: 1.05,
});

/* ---------------- 0 – 2.6 · two single words ---------------- */

function Words2({ t, p, a }: S) {
  const [w1, w2] = parts(p.words, 2);
  const big = expo(seg(t, 1.0, 1.65));
  const away = acc(seg(t, 2.25, 2.6));
  return (
    <>
      <div style={{ ...row(500), ...type(72, 500), ...ink(a), ...fx(t, { at: 0.15, dur: 0.55, out: 0.85, outDur: 0.25, blur: 14 }) }}>
        {w1}
      </div>
      <div
        style={{
          ...row(400),
          ...type(250, 650),
          ...ink(a),
          opacity: big * (1 - away),
          transform: `scale(${lerp(1.12, 1, big) * lerp(1, 1.25, away)})`,
          filter: `blur(${(1 - big) * 30 + away * 16}px)`,
          paddingBottom: 24,
        }}
      >
        {w2}
      </div>
    </>
  );
}

/* ---------------- 2.6 – 5.4 · a word, the icon dropping in, a word ---------------- */

function Pair({ t, p, a }: S) {
  const [left, right] = parts(p.pair, 2);
  const l = out(seg(t, 2.7, 3.45));
  const r = out(seg(t, 2.79, 3.54));
  const drop = back(seg(t, 3.55, 4.15), 1.6);
  const zoom = inOut(seg(t, 4.75, 5.4));
  const words = 1 - acc(seg(t, 4.7, 5.0));
  const arc = (k: number, side: number): CSSProperties => ({
    display: "inline-block",
    opacity: k * words,
    transform: `translate(${(1 - k) * 112 * side}px, ${(1 - k) * -18 * side}px) rotate(${(1 - k) * 1.2 * side}deg)`,
    filter: k < 1 ? `blur(${(1 - k) * 10}px)` : words < 1 ? `blur(${(1 - words) * 10}px)` : undefined,
  });
  return (
    <div style={{ ...row(470, { height: 150, gap: 44 }), ...type(80, 560) }}>
      <span style={{ ...arc(l, -1), color: "#16161d" }}>{left}</span>
      <span style={{ display: "inline-grid", width: 150, height: 150, placeItems: "center" }}>
        <span
          style={{
            display: "inline-grid",
            opacity: seg(t, 3.55, 3.7) * (1 - seg(t, 5.15, 5.4)),
            transform: `translateY(${(1 - clamp(drop)) * -320}px) rotate(${(1 - clamp(drop)) * -10}deg) scale(${lerp(1, 9, zoom)})`,
            filter: zoom > 0.4 ? `blur(${(zoom - 0.4) * 20}px)` : undefined,
          }}
        >
          <Mark name={p.name} a={a} size={150} glass />
        </span>
      </span>
      <span style={{ ...arc(r, 1), ...ink(a) }}>{right}</span>
    </div>
  );
}

/* ---------------- 5.4 – 10 · a tunnel of live phones ---------------- */

/** Where each phone sits on the tunnel's walls, and which way it faces (towards the middle). */
const WALL = [
  { x: -980, y: 0, ry: 70, rx: 0, z0: 0 },
  { x: 980, y: 40, ry: -70, rx: 0, z0: 560 },
  { x: -60, y: -700, ry: 0, rx: -68, z0: 1120 },
  { x: 80, y: 700, ry: 0, rx: 68, z0: 1680 },
  { x: -980, y: -60, ry: 70, rx: 0, z0: 2240 },
  { x: 980, y: -40, ry: -70, rx: 0, z0: 2800 },
];

function Tunnel({ t, p, a }: S) {
  const lines = parts(p.tunnel, 3);
  const travel = (t - 5.6) * 760;
  const show = seg(t, 5.9, 6.5) * (1 - seg(t, 9.6, 10.0));
  const line = (i: number, at: number, until: number) => (
    <div
      key={i}
      style={{ ...row(498), ...type(84, 600), ...ink(a), ...fx(t, { at, dur: 0.55, out: until, outDur: 0.3, blur: 14, dy: 18 }) }}
    >
      {lines[i]}
    </div>
  );
  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 1000, perspectiveOrigin: "50% 50%", opacity: show }}>
        {WALL.map((w, i) => {
          // flying forward: each phone comes from far away, passes beside the camera, and comes round again
          const z = ((w.z0 + travel) % 3360) - 3000;
          const near = seg(z, -1700, -1100) * (1 - seg(z, 120, 300));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 - 213,
                top: 540 - 449,
                opacity: near,
                transform: `translate3d(${w.x}px, ${w.y}px, ${z}px) rotateY(${w.ry}deg) rotateX(${w.rx}deg)`,
              }}
            >
              <Phone id={p.screen} scale={1} shadow={false} />
            </div>
          );
        })}
      </div>
      {/* a soft halo keeps the line readable over the phones flying past */}
      <div
        style={{
          position: "absolute",
          left: 960 - 620,
          top: 540 - 170,
          width: 1240,
          height: 340,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${mix("#ffffff", a, 0.04)} 0%, ${alpha("#ffffff", 0.85)} 55%, transparent 100%)`,
          opacity: show,
        }}
      />
      {line(0, 5.6, 7.0)}
      {line(1, 7.15, 8.4)}
      {line(2, 8.55, 9.7)}
    </>
  );
}

/* ---------------- 10 – 12.6 · progress ---------------- */

function Progress({ t, p, a }: S) {
  const swoosh = expo(seg(t, 10.0, 10.55));
  const k = inOut(seg(t, 10.6, 12.0));
  const away = acc(seg(t, 12.25, 12.6));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - away, filter: away > 0 ? `blur(${away * 10}px)` : undefined }}>
      <div style={{ ...row(318), ...type(40, 500), color: mix(a, "#000000", 0.25), ...fx(t, { at: 10.3 }) }}>{p.progress}</div>
      <div style={{ ...row(380), ...type(200, 650), ...fx(t, { at: 10.35, blur: 16 }) }}>
        <span style={ink(a)}>{Math.round(100 * k)}</span>
        <span style={{ color: alpha(a, 0.35) }}>/100</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 510 - (1 - swoosh) * 1400,
          top: 650,
          width: 900,
          height: 26,
          borderRadius: 13,
          background: alpha(a, 0.14),
          filter: swoosh < 1 ? `blur(${(1 - swoosh) * 14}px)` : undefined,
          transform: `scaleX(${lerp(1.6, 1, swoosh)})`,
          transformOrigin: "0 50%",
        }}
      >
        <div
          style={{
            width: `${Math.max(swoosh < 1 ? 100 : 0, 100 * k)}%`,
            height: "100%",
            borderRadius: 13,
            background: `linear-gradient(90deg, ${mix(a, "#ffffff", 0.45)}, ${a})`,
            boxShadow: `0 10px 30px -8px ${alpha(a, 0.55)}`,
            opacity: swoosh < 1 ? 1 : k > 0 ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- 12.6 – 14.8 · done: a glass orb, its check, confetti ---------------- */

function Done({ t, p, a }: S) {
  const orb = back(seg(t, 12.7, 13.25), 1.6);
  const check = inOut(seg(t, 13.35, 13.75));
  const away = acc(seg(t, 14.45, 14.8));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - away, filter: away > 0 ? `blur(${away * 10}px)` : undefined }}>
      <div style={{ ...row(300), ...type(120, 600), ...ink(a), ...fx(t, { at: 12.65, blur: 16 }) }}>{p.done}</div>
      <div
        style={{
          position: "absolute",
          left: 960 - 120,
          top: 520,
          width: 240,
          height: 240,
          borderRadius: "50%",
          transform: `scale(${orb})`,
          background: `radial-gradient(65% 65% at 32% 28%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.4) 30%, ${alpha(a, 0.18 + 0.5 * check)} 75%, ${alpha(a, 0.45 + 0.4 * check)} 100%)`,
          boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.75), inset 0 -18px 40px ${alpha(a, 0.25)}, 0 30px 70px -20px ${alpha(a, 0.6)}`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12.5 10 17.5 19 7"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - check}
          />
        </svg>
      </div>
      <Confetti
        p={seg(t, 13.5, 15.0)}
        x={960}
        y={640}
        colors={[a, mix(a, "#ffffff", 0.45), mix(a, "#000000", 0.25), "#ffd166", "#7c5cff"]}
        count={56}
        spread={700}
      />
    </div>
  );
}

/* ---------------- 14.8 – 18.6 · the product, tilted, a tap ---------------- */

function Tap({ t, p, a }: S) {
  const tilt = expo(seg(t, 14.85, 16.2));
  const dolly = inOut(seg(t, 16.2, 18.6));
  const glide = inOut(seg(t, 16.1, 16.95));
  const press = seg(t, 17.0, 17.1) * (1 - seg(t, 17.15, 17.35));
  const ripple = seg(t, 17.05, 17.7);
  const away = acc(seg(t, 18.25, 18.6));
  const tx = 200;
  const ty = 600;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: 1900,
        opacity: 1 - away,
        filter: away > 0 ? `blur(${away * 12}px)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 960 - 213,
          top: 540 - 449,
          opacity: seg(t, 14.85, 15.2),
          transform: `translateY(${(1 - tilt) * 160}px) rotateX(${lerp(30, 12, tilt) - 4 * dolly}deg) rotateY(${lerp(-34, -16, tilt) + 8 * dolly}deg) rotateZ(${lerp(6, 2, tilt)}deg) scale(${lerp(0.88, 1, tilt) * lerp(1, 1.08, dolly)})`,
        }}
      >
        <Phone>
          <Screen id={p.screen} />
          <span
            style={{
              position: "absolute",
              left: tx - 60 * ripple,
              top: ty - 60 * ripple,
              width: 120 * ripple,
              height: 120 * ripple,
              borderRadius: "50%",
              border: `5px solid ${alpha(a, 0.95 * (1 - ripple))}`,
              background: alpha(a, 0.22 * (1 - ripple)),
            }}
          />
          <Cursor x={lerp(400, tx - 12, glide)} y={lerp(920, ty - 6, glide)} press={press} hand size={2.4} />
        </Phone>
      </div>
    </div>
  );
}

/* ---------------- 18.6 – 21.6 · a line among flying cards ---------------- */

const FLY = [
  { x: -620, y: -280, d: 0, off: 60 },
  { x: 640, y: -220, d: 0.35, off: 320 },
  { x: -560, y: 300, d: 0.7, off: 520 },
  { x: 600, y: 320, d: 1.05, off: 180 },
  { x: -120, y: -420, d: 1.4, off: 700 },
  { x: 160, y: 430, d: 1.75, off: 420 },
];

function Cards({ t, p, a }: S) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 1200 }}>
        {FLY.map((c, i) => {
          const k = seg(t, 18.65 + c.d, 18.65 + c.d + 1.6);
          if (k <= 0 || k >= 1) return null;
          const z = lerp(-1100, 650, inOut(k));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 - 260,
                top: 540 - 170,
                width: 520,
                height: 340,
                borderRadius: 22,
                overflow: "hidden",
                background: "#fff",
                boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.9), 0 30px 60px -20px ${alpha(a, 0.4)}`,
                opacity: clamp(k * 5) * (1 - seg(k, 0.85, 1)),
                transform: `translate3d(${c.x * (0.6 + k)}px, ${c.y * (0.6 + k)}px, ${z}px) rotateY(${c.x > 0 ? -18 : 18}deg) rotateX(${c.y > 0 ? 12 : -12}deg)`,
                filter: k > 0.75 ? `blur(${(k - 0.75) * 30}px)` : undefined,
              }}
            >
              <div style={{ transform: `translate(${-(402 * 1.3 - 520) / 2}px, ${-c.off * 1.3}px)` }}>
                <Screen id={p.screen} scale={1.3} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ ...row(492), ...type(100, 620), ...ink(a), ...fx(t, { at: 18.75, out: 21.3, blur: 16 }) }}>{p.every}</div>
    </>
  );
}

/* ---------------- 21.6 – 25 · the button, pressed, turning into the accent ---------------- */

function Button({ t, p, a }: S) {
  const glide = inOut(seg(t, 22.35, 23.1));
  const press = seg(t, 23.15, 23.27) * (1 - seg(t, 23.3, 23.6));
  const lit = inOut(seg(t, 23.3, 23.75));
  const shrink = inOut(seg(t, 24.7, 25.05));
  const e = fx(t, { at: 21.7, dur: 0.7, blur: 12 });
  const W = 560;
  const fill: CSSProperties = { position: "absolute", inset: 0, borderRadius: 66 };
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 960 - W / 2,
          top: 540 - 66,
          width: W,
          height: 132,
          display: "grid",
          placeItems: "center",
          ...type(48, 560),
          letterSpacing: "-0.02em",
          color: "#fff",
          filter: e.filter,
          opacity: (e.opacity as number) * (1 - seg(t, 24.95, 25.1)),
          transform: `${e.transform} scale(${(1 - 0.06 * press) * lerp(1, 0.04, shrink)})`,
        }}
      >
        <span style={{ ...fill, background: "#111", boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)" }} />
        <span
          style={{
            ...fill,
            opacity: lit,
            background: `linear-gradient(110deg, ${mix(a, "#ffffff", 0.3)}, ${a} 55%, ${mix(a, "#000000", 0.15)})`,
            boxShadow: `0 30px 70px -20px ${alpha(a, 0.7)}, inset 0 1px 0 rgba(255,255,255,.45)`,
          }}
        />
        <span style={{ position: "relative", opacity: 1 - shrink }}>{p.button}</span>
      </div>
      {t < 23.9 && <Cursor x={lerp(1500, 1040, glide)} y={lerp(900, 560, glide)} press={press} size={1.7} />}
    </>
  );
}

/* ---------------- 25 – 29.4 · a spark, into three words ---------------- */

function Trio({ t, p, a }: S) {
  const words = p.trio.split(" ").filter(Boolean);
  const fly = inOut(seg(t, 25.0, 26.35));
  // the spark's path: up out of the button, over, down to where the last word ends
  const sx = lerp(960, 1300, fly) - Math.sin(fly * Math.PI) * 260;
  const sy = lerp(540, 540, fly) - Math.sin(fly * Math.PI) * 300;
  const landed = seg(t, 26.35, 26.6);
  const twinkle = 1 + 0.12 * Math.sin(t * 6);
  const away = acc(seg(t, 29.05, 29.4));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - away, filter: away > 0 ? `blur(${away * 12}px)` : undefined }}>
      <div style={{ ...row(492, { gap: 26 }), ...type(104, 620) }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              ...(i < words.length - 1 ? ink(a) : { color: "#16161d" }),
              ...fx(t, { at: 26.45 + i * 0.5, dur: 0.6, blur: 16, dy: 20 }),
            }}
          >
            {w}
          </span>
        ))}
        <span style={{ display: "inline-grid", width: 90, opacity: landed }}>
          <Spark size={74} color={a} style={{ transform: `rotate(${t * 40}deg) scale(${twinkle})` }} />
        </span>
      </div>
      {fly > 0 && landed < 1 && (
        <>
          {[0.08, 0.16, 0.24].map((d, i) => (
            <Spark
              key={i}
              size={70 - i * 14}
              color={alpha(a, 0.35 - i * 0.1)}
              style={{
                position: "absolute",
                left: lerp(960, 1300, clamp(fly - d)) - Math.sin(clamp(fly - d) * Math.PI) * 260 - 35,
                top: 540 - Math.sin(clamp(fly - d) * Math.PI) * 300 - 35,
                filter: "blur(4px)",
              }}
            />
          ))}
          <Spark
            size={90}
            color={a}
            style={{
              position: "absolute",
              left: sx - 45,
              top: sy - 45,
              transform: `rotate(${fly * 360}deg)`,
              filter: `drop-shadow(0 0 18px ${alpha(a, 0.7)})`,
            }}
          />
        </>
      )}
    </div>
  );
}

/* ---------------- 29.4 – 34 · the end card ---------------- */

function End({ t, p, a }: S) {
  const pop = back(seg(t, 29.55, 30.05), 1.7);
  const name = out(seg(t, 29.9, 30.5));
  return (
    <>
      <div style={{ ...row(470, { height: 140, gap: 30 * Math.min(1, name * 2) }) }}>
        <span style={{ display: "inline-grid", transform: `scale(${pop})`, opacity: pop > 0.01 ? 1 : 0 }}>
          <Mark name={p.name} a={a} size={132} />
        </span>
        <Reveal p={name}>
          <span style={{ ...type(124, 620), letterSpacing: "-0.05em", color: "#16161d", display: "inline-block", paddingRight: "0.05em" }}>
            {p.name}
          </span>
        </Reveal>
      </div>
      <div
        style={{
          ...row(650),
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 28,
          color: alpha(a, 0.9),
          letterSpacing: "0.02em",
          ...fx(t, { at: 30.6 }),
        }}
      >
        {p.url}
      </div>
    </>
  );
}
