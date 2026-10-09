// Typed launch — a 42 s SaaS launch film cut the way the Numtera film is (studied shot by shot): a hook typed among
// fragments of the live product, one phrase selected and retyped; a question; a huge word; the reveal on the accent;
// the tagline; the product tilted under a dolly; a split screen whose checklist ticks; a keyword in braces that becomes a
// progress bar; a dark interlude where one huge word shrinks into its sentence; a macro across the live screen; they /
// we; the icon with its name typed; a typed CTA, deleted and retyped, on black.
//
// Everything on screen comes from the params (the copy writer fills them) and from the product's own screen, running
// live. Each frame is a pure function of t, so the engine's export renders it exactly.
import { type CSSProperties } from "react";
import {
  Caret,
  Mark,
  Marked,
  alpha,
  mix,
  Phone,
  Reveal,
  Screen,
  Stage,
  Words,
  acc,
  back,
  blink,
  expo,
  fx,
  inOut,
  lerp,
  out,
  seg,
  smear,
  typed,
  typingEnd,
  unmark,
  useClock,
  useFonts,
  visible,
} from "../_film/kit";
import type { params as defaults } from "./params";

type P = typeof defaults;
export const DURATION = 42;

/* ---------------- the grounds ---------------- */

type World = "white" | "accent" | "dark" | "black";
/** Which ground is up when, and the blends between them. */
const WORLDS: [number, World][] = [
  [0, "white"],
  [8.4, "accent"],
  [14.4, "white"],
  [26.0, "dark"],
  [29.0, "white"],
  [36.6, "black"],
];
function grounds(t: number) {
  const w: Record<World, number> = { white: 0, accent: 0, dark: 0, black: 0 };
  for (let i = 0; i < WORLDS.length; i++) {
    const [at, name] = WORLDS[i];
    const next = WORLDS[i + 1]?.[0] ?? Infinity;
    const inK = i === 0 ? 1 : inOut(seg(t, at - 0.25, at + 0.15));
    const outK = next === Infinity ? 0 : inOut(seg(t, next - 0.25, next + 0.15));
    w[name] = Math.max(w[name], inK * (1 - outK));
  }
  return w;
}

/* ---------------- the film ---------------- */

export default function TypedLaunch({ p }: { p: P }) {
  useFonts();
  const t = useClock(DURATION);
  const a = p.accent || "#fc8019";
  const g = grounds(t);
  const layer = (o: number, background: string): CSSProperties => ({ position: "absolute", inset: 0, background, opacity: o });
  return (
    <Stage background="#fff" style={{ fontFamily: '"Geist", "Inter", system-ui, sans-serif', color: "#0a0a0a" }}>
      <div style={layer(1, `radial-gradient(70% 60% at 100% 100%, ${alpha(a, 0.22)} 0%, transparent 70%), #fff`)} />
      <div style={layer(g.accent, `linear-gradient(180deg, #fff 0%, ${mix("#ffffff", a, 0.28)} 46%, ${mix("#ffffff", a, 0.85)} 100%)`)} />
      <div style={layer(g.dark, `radial-gradient(90% 70% at 50% 115%, ${mix(a, "#000000", 0.35)} 0%, #0b0b0e 62%)`)} />
      <div style={layer(g.black, `radial-gradient(60% 60% at 0% 100%, ${alpha(a, 0.35)} 0%, transparent 70%), #000`)} />
      {visible(t, 0, 6.6) && <Hook t={t} p={p} a={a} />}
      {visible(t, 6.6, 8.6) && <StopShot t={t} p={p} />}
      {visible(t, 8.4, 11.6) && <Meet t={t} p={p} a={a} />}
      {visible(t, 11.6, 14.4) && <Tagline t={t} p={p} a={a} />}
      {visible(t, 14.4, 18.0) && <Tilt t={t} p={p} a={a} />}
      {visible(t, 18.0, 23.0) && <Split t={t} p={p} a={a} />}
      {visible(t, 23.0, 26.0) && <Brace t={t} p={p} a={a} />}
      {visible(t, 26.0, 29.0) && <Big t={t} p={p} />}
      {visible(t, 29.0, 32.0) && <Macro t={t} p={p} a={a} />}
      {visible(t, 32.0, 34.6) && <TheyWe t={t} p={p} a={a} />}
      {visible(t, 34.6, 36.6) && <Icon t={t} p={p} a={a} />}
      {visible(t, 36.6, 42) && <Cta t={t} p={p} a={a} />}
    </Stage>
  );
}

type S = { t: number; p: P; a: string };

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
const display = (size: number, weight = 600): CSSProperties => ({
  fontSize: size,
  fontWeight: weight,
  letterSpacing: "-0.045em",
  lineHeight: 1,
});

/* ---------------- 0 – 6.6 · the hook, among fragments of the product ---------------- */

/** "Dinner takes [ten apps/one tap]" → the part before, the phrase typed first, the phrase it's retyped as. */
function parseHook(s: string) {
  const m = /^(.*)\[([^/\]]*)\/([^\]]*)\](.*)$/.exec(s);
  return m ? { pre: m[1], old: m[2], neu: m[3], post: m[4] } : { pre: s, old: "", neu: "", post: "" };
}

function Hook({ t, p, a }: S) {
  const h = parseHook(p.hook);
  const t0 = 0.6;
  const first = h.pre + h.old;
  const tSel = typingEnd(first, t0, 16) + 0.45;
  const tDel = tSel + 0.6;
  const shownFirst = typed(first, t, t0, 16);
  const sel = h.old ? seg(t, tSel, tSel + 0.22) : 0;
  const deleted = h.old && t >= tDel;
  const neu = deleted ? typed(h.neu + h.post, t, tDel + 0.05, 16) : "";
  const busy = (t >= t0 && t < typingEnd(first, t0, 16)) || (deleted && t < typingEnd(h.neu + h.post, tDel + 0.05, 16));
  const preShown = shownFirst.slice(0, h.pre.length);
  const oldShown = shownFirst.slice(h.pre.length);
  // fragments of the live product: windows onto different parts of its screen, floating round the line
  const frags = [
    { x: 120, y: 120, w: 330, h: 170, off: 40, r: -3 },
    { x: 1480, y: 100, w: 320, h: 190, off: 300, r: 2.5 },
    { x: 80, y: 730, w: 300, h: 200, off: 520, r: 2 },
    { x: 1520, y: 760, w: 330, h: 170, off: 700, r: -2.5 },
    { x: 830, y: 860, w: 280, h: 150, off: 170, r: 1.5, far: true },
  ];
  return (
    <>
      {frags.map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: f.x,
            top: f.y,
            ...fx(t, { at: 0.1 + i * 0.12, dur: 0.9, out: 6.25 + i * 0.03, blur: 14 }),
          }}
        >
          <div
            style={{
              width: f.w,
              height: f.h,
              borderRadius: 18,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 18px 40px -18px rgba(0,0,0,.28)",
              transform: `translateY(${-26 * seg(t, 0, 6.6)}px) rotate(${f.r}deg)`,
              opacity: f.far ? 0.6 : 1,
              filter: f.far ? "blur(1.5px)" : undefined,
            }}
          >
            <div style={{ transform: `translate(${-(402 * 0.82 - f.w) / 2}px, ${-f.off * 0.82}px)` }}>
              <Screen id={p.screen} scale={0.82} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ ...row(480), ...display(84), ...fx(t, { at: 0.2, dur: 0.4, out: 4.55 }) }}>
        <span style={{ whiteSpace: "pre" }}>{preShown}</span>
        {!deleted && (
          <span
            style={{
              whiteSpace: "pre",
              position: "relative",
              color: sel > 0 ? "#fff" : undefined,
              background: sel > 0 ? `linear-gradient(90deg, ${a} ${sel * 100}%, transparent ${sel * 100}%)` : undefined,
              borderRadius: 6,
            }}
          >
            {oldShown}
          </span>
        )}
        {deleted && <span style={{ whiteSpace: "pre", color: a }}>{neu}</span>}
        <Caret on={blink(t, !!busy)} color={a} />
      </div>
      <div
        style={{ ...row(500), fontSize: 64, fontWeight: 500, letterSpacing: "-0.03em", color: "#3a3a3a", ...fx(t, { at: 4.85, out: 6.3 }) }}
      >
        {p.question}
      </div>
    </>
  );
}

/* ---------------- 6.6 – 8.4 · stop ---------------- */

function StopShot({ t, p }: { t: number; p: P }) {
  const [first, ...rest] = p.stop.split(" ");
  const shrink = inOut(seg(t, 7.35, 7.85));
  return (
    <div style={{ ...row(540 - lerp(330, 100, shrink) / 2, { height: lerp(330, 100, shrink) }), ...fx(t, { at: 0, dur: 0, out: 8.3, outDur: 0.25 }) }}>
      <span style={{ ...display(lerp(330, 100, shrink), 700), letterSpacing: "-0.06em", ...smear(t, 6.65, 0.55) }}>{first}</span>
      <Reveal p={out(seg(t, 7.5, 7.95))}>
        <span style={{ ...display(100, 600), marginLeft: 26, display: "inline-block" }}>
          <Words
            text={rest.join(" ")}
            t={t}
            at={7.7}
            gap={0.1}
            style={(i) => (i === rest.length - 1 ? { color: `rgba(10,10,10,${0.35 + 0.65 * seg(t, 7.95, 8.15)})` } : undefined)}
          />
        </span>
      </Reveal>
    </div>
  );
}

/* ---------------- 8.4 – 11.6 · meet the product (on the accent) ---------------- */

function Meet({ t, p, a }: S) {
  const focus = expo(seg(t, 8.6, 9.3));
  const settle = inOut(seg(t, 9.45, 10.0));
  const icon = back(seg(t, 10.25, 10.7), 1.8);
  const size = lerp(400, 150, settle) * lerp(1, 0.82, inOut(seg(t, 10.2, 10.7)));
  const nameIn = out(seg(t, 9.6, 10.2));
  return (
    <div style={{ ...row(540 - size / 2, { height: size, gap: 28 * Math.min(1, settle + icon) }), ...fx(t, { at: 0, dur: 0, out: 11.3 }) }}>
      <span
        style={{
          ...display(size, 700),
          letterSpacing: "-0.06em",
          opacity: focus,
          filter: focus < 1 ? `blur(${(1 - focus) * 34}px)` : undefined,
          transform: `scale(${lerp(1.35, 1, focus)})`,
        }}
      >
        Meet
      </span>
      <span style={{ display: "inline-grid", placeItems: "center", width: size * 0.86 * Math.min(1, icon), overflow: "visible" }}>
        <span style={{ opacity: icon > 0.01 ? 1 : 0, transform: `scale(${icon})`, display: "inline-grid" }}>
          <Mark name={p.name} a={a} size={size * 0.86} />
        </span>
      </span>
      <Reveal p={nameIn}>
        <span style={{ ...display(size, 700), letterSpacing: "-0.06em", color: mix(a, "#000000", 0.08), paddingRight: "0.05em" }}>
          {p.name}
        </span>
      </Reveal>
    </div>
  );
}

/* ---------------- 11.6 – 14.4 · the tagline ---------------- */

function Tagline({ t, p, a }: S) {
  const away = inOut(seg(t, 13.25, 14.1));
  const words = p.tagline.split(" ");
  return (
    <div
      style={{
        ...row(500),
        ...display(88),
        transform: `translateY(${-120 * away}px) scale(${lerp(1, 0.62, away)})`,
        opacity: 1 - seg(t, 13.85, 14.25),
        filter: away > 0.5 ? `blur(${(away - 0.5) * 12}px)` : undefined,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...fx(t, { at: 11.7 + i * 0.09, dur: 0.6, dy: 30, blur: 10 }) }}>
          <Marked text={w} accent={a} />
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}

/* ---------------- 14.4 – 18 · the product, tilted under a dolly ---------------- */

function Tilt({ t, p, a }: S) {
  const tilt = expo(seg(t, 14.45, 16.0));
  const dolly = inOut(seg(t, 15.6, 18.0));
  const away = acc(seg(t, 17.65, 18.0));
  const words = p.feature.split(" ");
  const half = Math.ceil(words.length / 2);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 420,
          top: 70,
          width: 700,
          height: 960,
          perspective: 1800,
          opacity: 1 - away,
          filter: away > 0 ? `blur(${away * 14}px)` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 30,
            transformOrigin: "50% 50%",
            opacity: seg(t, 14.45, 14.8),
            transform: `translateX(${(1 - tilt) * 160}px) translateY(${(1 - tilt) * 60}px) rotateY(${lerp(-40, -18, tilt) + 12 * dolly}deg) rotateX(${lerp(16, 7, tilt) - 3 * dolly}deg) rotateZ(${lerp(-4, -1, tilt)}deg) scale(${lerp(0.9, 1, tilt) * lerp(1, 1.07, dolly)})`,
          }}
        >
          <Phone id={p.screen} scale={0.98} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 170,
          top: 400,
          textAlign: "right",
          ...display(76),
          color: mix(a, "#000000", 0.12),
          ...fx(t, { at: 15.0, out: 17.6 }),
        }}
      >
        {words.slice(0, half).join(" ")}
        <br />
        {words.slice(half).join(" ")}
      </div>
    </>
  );
}

/* ---------------- 18 – 23 · the split screen: the product, and its checklist ticking ---------------- */

function Split({ t, p, a }: S) {
  const checks = p.checks
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const o = 22.7;
  const at = (i: number) => 18.85 + i * 0.85;
  const link = inOut(seg(t, 18.55, 19.1));
  return (
    <>
      <div style={{ position: "absolute", left: 300, top: 120, ...fx(t, { at: 18.05, dur: 0.9, out: o, dy: 70 }) }}>
        <Phone id={p.screen} scale={0.92} />
      </div>
      {/* the link between them, a diamond riding it */}
      <div
        style={{
          position: "absolute",
          left: 734,
          top: 539,
          height: 2,
          width: 260 * link,
          background: `linear-gradient(90deg, transparent, ${alpha(a, 0.7)})`,
          opacity: 1 - seg(t, o, o + 0.3),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 734 + 250 * link,
          top: 532,
          width: 16,
          height: 16,
          background: a,
          transform: "rotate(45deg)",
          boxShadow: `0 0 18px 4px ${alpha(a, 0.5)}`,
          opacity: link * (1 - seg(t, o, o + 0.3)),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1000,
          top: 270,
          width: 760,
          height: 540,
          borderRadius: 24,
          background: "#0a0a0a",
          color: "#ededed",
          boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 50px 100px -40px rgba(0,0,0,.55)",
          padding: "34px 40px",
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          ...fx(t, { at: 18.25, dur: 0.9, out: o, dy: 70 }),
        }}
      >
        <div style={{ display: "flex", gap: 9, marginBottom: 34 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: "#2c2c2c" }} />
          ))}
          <span style={{ marginLeft: 14, fontSize: 19, color: "#8a8a8a", letterSpacing: "0.02em" }}>{p.name.toLowerCase()} · live</span>
        </div>
        {checks.map((c, i) => {
          const tick = back(seg(t, at(i) + 0.42, at(i) + 0.7), 2.2);
          const bar = inOut(seg(t, at(i) + 0.05, at(i) + 0.5));
          return (
            <div
              key={i}
              style={{
                marginBottom: 26,
                opacity: seg(t, at(i), at(i) + 0.2),
                transform: `translateX(${(1 - out(seg(t, at(i), at(i) + 0.4))) * -16}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28 }}>
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: `2px solid ${tick > 0.05 ? a : "#3a3a3a"}`,
                    background: tick > 0.05 ? a : "transparent",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: `scale(${tick})` }}
                    aria-hidden="true"
                  >
                    <path d="M3 8.5 6.25 11.75 13 5" />
                  </svg>
                </span>
                <span>{c}</span>
              </div>
              <div
                style={{
                  marginLeft: 48,
                  marginTop: 12,
                  height: 4,
                  borderRadius: 2,
                  background: "#1f1f1f",
                  overflow: "hidden",
                  opacity: 1 - seg(t, at(i) + 0.55, at(i) + 0.8),
                }}
              >
                <div style={{ height: "100%", width: `${bar * 100}%`, background: a }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- 23 – 26 · the keyword in braces, then a progress bar ---------------- */

function parseBrace(s: string) {
  const m = /^(.*)\{([^}]*)\}(.*)$/.exec(s);
  return m ? { pre: m[1], word: m[2], post: m[3] } : { pre: s, word: "", post: "" };
}

function Brace({ t, p, a }: S) {
  const b = parseBrace(p.brace);
  const open = inOut(seg(t, 23.6, 24.15));
  const morph = inOut(seg(t, 24.55, 25.0));
  const fill = inOut(seg(t, 24.9, 25.75));
  return (
    <>
      <div
        style={{
          ...row(492),
          ...display(88),
          opacity: 1 - morph,
          filter: morph > 0 ? `blur(${morph * 12}px)` : undefined,
          transform: `scale(${lerp(1, 0.9, morph)})`,
        }}
      >
        <Words text={b.pre.trim()} t={t} at={23.1} />
        <span style={{ color: a, marginLeft: 22, opacity: seg(t, 23.5, 23.65) }}>{"{"}</span>
        <Reveal p={open}>
          <span style={{ color: a, padding: "0 0.14em", display: "inline-block" }}>{b.word}</span>
        </Reveal>
        <span style={{ color: a, opacity: seg(t, 23.5, 23.65) }}>{"}"}</span>
        <span style={{ whiteSpace: "pre" }}>{b.post}</span>
      </div>
      {/* the word becomes the thing doing it */}
      <div
        style={{
          position: "absolute",
          left: 960 - lerp(160, 520, morph),
          top: 470,
          width: lerp(320, 1040, morph),
          height: 140,
          borderRadius: 26,
          background: `linear-gradient(135deg, ${mix(a, "#ffffff", 0.15)}, ${a})`,
          boxShadow: `0 40px 80px -30px ${alpha(a, 0.6)}`,
          opacity: morph * (1 - seg(t, 25.75, 26.0)),
          transform: `scale(${lerp(0.7, 1, morph)})`,
          padding: "30px 44px",
          color: "#fff",
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 40,
          overflow: "hidden",
        }}
      >
        {typed(`${b.word}...`, t, 24.85, 14)}
        <div style={{ marginTop: 22, height: 10, borderRadius: 5, background: "rgba(255,255,255,.3)" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 5, background: "#fff" }} />
        </div>
      </div>
    </>
  );
}

/* ---------------- 26 – 29 · one huge word shrinking into its sentence (dark) ---------------- */

function Big({ t, p }: { t: number; p: P }) {
  const [first, ...rest] = p.big.split(" ");
  const k = inOut(seg(t, 26.75, 27.35));
  const size = lerp(330, 110, k);
  return (
    <div style={{ ...row(540 - size / 2, { height: size, color: "#fff" }), ...fx(t, { at: 0, dur: 0, out: 28.65 }) }}>
      <span style={{ ...display(size, 600), ...fx(t, { at: 26.1, dur: 0.5, blur: 24, dy: 0, scale: 1.12 }) }}>{first}</span>
      <Reveal p={out(seg(t, 27.0, 27.5))}>
        <span style={{ ...display(110, 600), marginLeft: 30, display: "inline-block" }}>
          <Words text={rest.join(" ")} t={t} at={27.25} gap={0.1} />
        </span>
      </Reveal>
    </div>
  );
}

/* ---------------- 29 – 32 · a macro across the live product ---------------- */

function Macro({ t, p, a }: S) {
  const glide = inOut(seg(t, 29.1, 31.9));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 210,
          top: 140,
          width: 1500,
          height: 800,
          borderRadius: 34,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 50px 110px -40px rgba(0,0,0,.35)",
          ...fx(t, { at: 29.05, dur: 0.8, out: 31.7, dy: 40, scale: 1.04 }),
        }}
      >
        <div style={{ transform: `translate(${-lerp(30, 150, glide)}px, ${-lerp(120, 1500, glide)}px)` }}>
          <Screen id={p.screen} scale={3.9} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 88,
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 22,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: mix(a, "#000000", 0.2),
          ...fx(t, { at: 29.2, out: 31.6 }),
        }}
      >
        {p.name} · live
      </div>
    </>
  );
}

/* ---------------- 32 – 34.6 · they / we ---------------- */

function TheyWe({ t, p, a }: S) {
  return (
    <>
      <div style={{ ...row(492), ...display(88), ...fx(t, { at: 32.1, out: 33.0, outDur: 0.3, blur: 14 }) }}>{p.they}</div>
      <div style={{ ...row(492), ...display(96), color: a, ...fx(t, { at: 33.2, out: 34.35, blur: 16 }) }}>{p.we}</div>
    </>
  );
}

/* ---------------- 34.6 – 36.6 · the icon, and its name typed ---------------- */

function Icon({ t, p, a }: S) {
  const pop = back(seg(t, 34.7, 35.15), 1.7);
  const slide = inOut(seg(t, 35.25, 35.7));
  const size = lerp(220, 130, slide);
  return (
    <div style={{ ...row(540 - size / 2, { height: size, gap: 34 * slide }), ...fx(t, { at: 0, dur: 0, out: 36.35 }) }}>
      <span style={{ display: "inline-grid", transform: `scale(${pop})`, opacity: pop > 0.01 ? 1 : 0 }}>
        <Mark name={p.name} a={a} size={size} />
      </span>
      <span style={{ ...display(130, 650), letterSpacing: "-0.05em", color: mix(a, "#000000", 0.1) }}>
        {typed(p.name, t, 35.55, 14)}
        {t > 35.5 && <Caret on={blink(t, t < typingEnd(p.name, 35.55, 14))} color={a} />}
      </span>
    </div>
  );
}

/* ---------------- 36.6 – 42 · the CTA, typed on black ---------------- */

function Cta({ t, p, a }: S) {
  const first = unmark(p.tagline);
  const t1 = 36.85;
  const e1 = typingEnd(first, t1, 26);
  const del = Math.max(0, first.length - Math.floor((t - (e1 + 0.5)) * 70));
  const deleting = t >= e1 + 0.5;
  const t2 = e1 + 0.5 + first.length / 70 + 0.15;
  const cta = typed(p.cta, t, t2, 16);
  const text = !deleting ? typed(first, t, t1, 26) : del > 0 ? first.slice(0, del) : cta;
  const busy = (t >= t1 && t < e1) || (deleting && t < typingEnd(p.cta, t2, 16));
  return (
    <>
      <div style={{ ...row(486), ...display(t >= t2 ? 96 : 72), color: "#fff", ...fx(t, { at: 36.7, dur: 0.4, blur: 6 }) }}>
        <span style={{ whiteSpace: "pre" }}>{text}</span>
        <Caret on={blink(t, busy)} color="#fff" />
      </div>
      <div
        style={{
          ...row(620),
          fontSize: 30,
          color: alpha(a, 1),
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          letterSpacing: "0.02em",
          ...fx(t, { at: t2 + 0.6 }),
        }}
      >
        {p.url}
      </div>
    </>
  );
}
