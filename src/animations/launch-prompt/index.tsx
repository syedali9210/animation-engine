// Prompt launch — a 33 s SaaS launch film cut the way the Claude Design film is (studied shot by shot), on warm paper: a
// pill with the product's name, clicked, opening into a prompt box that types; files attached; Send; the live product
// behind it; status words in italic while it works; the result pulling back into its window; macro shots of the toolbar
// with a hand clicking Comment and a request typed; a status word; the plan ticking off; the screen changing before your
// eyes; a collage; the end card.
//
// The words come from the params (the copy writer fills them), the screens are the product's own, running live. Each
// frame is a pure function of t, so the engine's export renders it exactly.
import { type CSSProperties, type ReactNode } from "react";
import {
  Caret,
  Cursor,
  Mark,
  Phone,
  Screen,
  Stage,
  acc,
  alpha,
  back,
  blink,
  clamp,
  expo,
  fx,
  inOut,
  lerp,
  mix,
  out,
  seg,
  typed,
  typingEnd,
  useClock,
  useFonts,
  visible,
} from "../_film/kit";
import type { params as defaults } from "./params";

type P = typeof defaults;
export const DURATION = 31;

const PAPER = "#f5f4ef";
const INK = "#1f1e1b";
const SERIF = 'Georgia, "Times New Roman", serif';
const list = (s: string, n: number) => {
  const xs = s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  while (xs.length < n) xs.push(xs[xs.length - 1] ?? "");
  return xs;
};

export default function PromptLaunch({ p }: { p: P }) {
  useFonts();
  const t = useClock(DURATION);
  const a = p.accent || "#fc8019";
  return (
    <Stage background={PAPER} style={{ fontFamily: '"Geist", "Inter", system-ui, sans-serif', color: INK }}>
      {visible(t, 0, 9.0) && <PillToPrompt t={t} p={p} a={a} />}
      {visible(t, 9.0, 11.6) && <Status t={t} p={p} a={a} />}
      {visible(t, 11.6, 17.0) && <WindowShot t={t} p={p} a={a} />}
      {visible(t, 17.0, 18.4) && <Word t={t} p={p} a={a} />}
      {visible(t, 18.4, 21.0) && <Plan t={t} p={p} a={a} />}
      {visible(t, 21.0, 24.0) && <Change t={t} p={p} a={a} />}
      {visible(t, 24.0, 27.0) && <Collage t={t} p={p} a={a} />}
      {visible(t, 27.0, 31) && <End t={t} p={p} a={a} />}
    </Stage>
  );
}

type S = { t: number; p: P; a: string };

/** The accent's asterisk, turning while something works. */
function Star({ a, size, spin }: { a: string; size: number; spin: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${spin}deg)`, flex: "none" }}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="11" y="1.5" width="2.2" height="9" rx="1.1" fill={a} transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}

/** "Searching" → "✳ Searching…" in the italic the films use for what's happening. */
function StatusPill({ a, word, t, size = 56, card = true }: { a: string; word: string; t: number; size?: number; card?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.32,
        padding: card ? `${size * 0.42}px ${size * 0.7}px` : 0,
        borderRadius: size * 0.36,
        background: card ? "#fff" : "transparent",
        boxShadow: card ? "0 0 0 1px rgba(0,0,0,.05), 0 24px 60px -24px rgba(0,0,0,.35)" : undefined,
        fontFamily: SERIF,
        fontStyle: "italic",
        fontSize: size,
        letterSpacing: "-0.01em",
        color: INK,
        whiteSpace: "nowrap",
      }}
    >
      <Star a={a} size={size * 0.85} spin={t * 140} />
      {word}…
    </span>
  );
}

/** Where a phone at `z` sits to be centred in the frame (the phone zooms itself; its box doesn't). */
const PHONE_Z = 1.12;
const phoneAt = (z = PHONE_Z): CSSProperties => ({ position: "absolute", left: 960 - (426 * z) / 2, top: 540 - (898 * z) / 2 });

const center = (top: number, extra?: CSSProperties): CSSProperties => ({
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

/* ---------------- 0 – 9 · the pill, clicked open into a prompt that types ---------------- */

function Icon({ d }: { d: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 54,
        height: 54,
        borderRadius: 14,
        boxShadow: "inset 0 0 0 1.5px #e6e3da",
        color: "#6f6b62",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {d}
      </svg>
    </span>
  );
}

function PillToPrompt({ t, p, a }: S) {
  const files = list(p.files, 2).slice(0, 2);
  const hover = seg(t, 1.95, 2.1);
  const press = seg(t, 2.25, 2.35) * (1 - seg(t, 2.4, 2.6));
  const m = inOut(seg(t, 2.55, 3.25));
  const W = lerp(420, 1080, m);
  const H = lerp(124, 300, m);
  const t0 = 3.55;
  const shown = typed(p.prompt, t, t0, 24);
  const done = typingEnd(p.prompt, t0, 24);
  const behind = inOut(seg(t, 6.3, 7.6));
  const glide = inOut(seg(t, 7.55, 8.25));
  const send = seg(t, 8.3, 8.4) * (1 - seg(t, 8.45, 8.65));
  const leave = inOut(seg(t, 8.55, 9.0));
  // the cursor: first to the pill, later to Send
  const cx = t < 3 ? lerp(1500, 1000, inOut(seg(t, 1.3, 2.05))) : lerp(1300, 960 + W / 2 - 120, glide);
  const cy = t < 3 ? lerp(900, 545, inOut(seg(t, 1.3, 2.05))) : lerp(900, 540 + H / 2 - 64, glide);
  return (
    <>
      {/* the product, arriving behind the prompt while it's written */}
      <div
        style={{
          ...phoneAt(),
          opacity: behind,
          filter: `blur(${(1 - behind) * 16 + 3 * (1 - leave)}px) brightness(${lerp(1, 0.94, 1 - leave)})`,
          transform: `scale(${lerp(1.08, 1, behind)})`,
        }}
      >
        <Phone id={p.screen} scale={PHONE_Z} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 960 - W / 2,
          top: 540 - H / 2,
          width: W,
          height: H,
          borderRadius: lerp(26, 30, m),
          background: m > 0 ? "#fff" : mix("#ffffff", "#e7e4dc", hover * 0.9 + 0.1),
          boxShadow:
            m > 0
              ? `0 0 0 1px rgba(0,0,0,.06), 0 ${30 * m}px ${80 * m}px -30px rgba(0,0,0,.35)`
              : `0 0 0 1px rgba(0,0,0,${0.04 + 0.04 * hover})`,
          transform: `scale(${(1 - 0.04 * press) * lerp(1, 0.92, leave)})`,
          opacity: (fx(t, { at: 0.1, dur: 0.8, blur: 12 }).opacity as number) * (1 - leave),
          filter: leave > 0 ? `blur(${leave * 10}px)` : undefined,
          overflow: "hidden",
        }}
      >
        {/* the pill's face */}
        <div
          style={{
            ...center(0, { bottom: 0, gap: 22 }),
            opacity: 1 - seg(m, 0, 0.4),
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: "-0.035em",
          }}
        >
          <Mark name={p.name} a={a} size={66} />
          {p.name}
        </div>
        {/* the prompt's face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "34px 40px",
            opacity: seg(m, 0.55, 1),
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 16, minHeight: 50 }}>
            {files.map((f, i) => {
              const pop = back(seg(t, 5.9 + i * 0.35, 6.3 + i * 0.35), 2);
              return (
                <span
                  key={f}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: "#f1efe8",
                    fontFamily: '"Geist Mono", ui-monospace, monospace',
                    fontSize: 21,
                    color: "#4a463e",
                    transform: `scale(${pop})`,
                    opacity: pop > 0.01 ? 1 : 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21Z" />
                    <path d="M14 2.5v4h4" />
                  </svg>
                  {f}
                </span>
              );
            })}
          </div>
          <div style={{ flex: 1, fontSize: 36, lineHeight: "48px", letterSpacing: "-0.015em", color: shown ? INK : "#9a958a" }}>
            {shown || "Describe what you want…"}
            {t >= t0 - 0.2 && <Caret on={blink(t, t >= t0 && t < done)} color={a} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d={<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 2v3M12 19v3M2 12h3M19 12h3" />} />
            <Icon d={<path d="m19 11-7.4 7.4a5 5 0 0 1-7-7L12 4a3.3 3.3 0 0 1 4.7 4.7l-7.3 7.4a1.7 1.7 0 0 1-2.4-2.4l6.8-6.8" />} />
            <span
              style={{
                marginLeft: 6,
                padding: "13px 22px",
                borderRadius: 14,
                boxShadow: "inset 0 0 0 1.5px #e6e3da",
                fontSize: 22,
                color: "#5b574f",
              }}
            >
              Import
            </span>
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 14,
                background: a,
                color: "#fff",
                fontSize: 23,
                fontWeight: 560,
                opacity: shown.length > 0 ? 1 : 0.45,
                transform: `scale(${1 - 0.06 * send})`,
                boxShadow: shown.length > 0 ? `0 12px 30px -12px ${alpha(a, 0.8)}` : undefined,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M4 3.5 21 12 4 20.5l2.5-8.5Z" />
              </svg>
              Send
            </span>
          </div>
        </div>
      </div>
      {t > 1.25 && t < 8.85 && <Cursor x={cx} y={cy} press={t < 3 ? press : send} size={1.9} />}
    </>
  );
}

/* ---------------- 9 – 11.6 · it works: status words over the result ---------------- */

function Status({ t, p, a }: S) {
  const words = list(p.status, 3);
  const i = t < 10.3 ? 0 : 1;
  const swap = seg(t, 10.15, 10.45);
  const away = acc(seg(t, 11.3, 11.6));
  return (
    <>
      <div style={{ ...phoneAt(), opacity: 1 - away * 0.3 }}>
        <Phone id={p.screen} scale={PHONE_Z} />
      </div>
      <div style={{ ...center(476), ...fx(t, { at: 9.05, dur: 0.55, out: 11.25, blur: 12, dy: 20 }) }}>
        <span
          style={{
            display: "inline-block",
            filter: Math.abs(swap - 0.5) < 0.5 ? `blur(${(1 - Math.abs(swap - 0.5) * 2) * 8}px)` : undefined,
          }}
        >
          <StatusPill a={a} word={words[i]} t={t} />
        </span>
      </div>
    </>
  );
}

/* ---------------- 11.6 – 17 · the result in its window; the toolbar, close; a comment ---------------- */

function WindowShot({ t, p, a }: S) {
  const pull = expo(seg(t, 11.6, 13.2));
  const macro = inOut(seg(t, 14.0, 14.8));
  const back2 = inOut(seg(t, 16.75, 17.0));
  const hand = inOut(seg(t, 14.6, 15.25));
  const click = seg(t, 15.3, 15.38) * (1 - seg(t, 15.42, 15.6));
  const lit = seg(t, 15.35, 15.5);
  const pop = back(seg(t, 15.55, 15.95), 1.6);
  const comment = typed(p.comment, t, 15.95, 30);
  const sendAt = typingEnd(p.comment, 15.95, 30) + 0.15;
  // the camera: from the phone, out to the window, then into its toolbar
  const zoomOut = lerp(2.2, 1, pull);
  const toolbarZoom = lerp(1, 2.35, macro) * lerp(1, 0.6, back2);
  const ox = lerp(960, 1520, macro);
  const oy = lerp(560, 185, macro);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${ox}px ${oy}px`,
        transform: `scale(${zoomOut * toolbarZoom})`,
        opacity: 1 - seg(t, 16.8, 17.0),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 110,
          width: 1600,
          height: 880,
          borderRadius: 24,
          background: "#fff",
          boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 60px 140px -50px rgba(0,0,0,.35)",
          overflow: "hidden",
          opacity: seg(t, 11.65, 12.0),
        }}
      >
        {/* the bar: dots, the project, the tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 70, padding: "0 26px", boxShadow: "inset 0 -1px #ece9e1" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: "#e4e1d8" }} />
          ))}
          <span style={{ marginLeft: 16, fontSize: 20, color: "#5b574f" }}>{p.name} · Preview</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {["Tweaks", "Comment", "Edit text"].map((b) => (
              <span
                key={b}
                style={{
                  padding: "9px 16px",
                  borderRadius: 11,
                  fontSize: 19,
                  background: b === "Comment" && lit > 0 ? a : "#fff",
                  color: b === "Comment" && lit > 0 ? "#fff" : "#3d3a33",
                  boxShadow: b === "Comment" && lit > 0 ? `0 8px 20px -8px ${alpha(a, 0.7)}` : "inset 0 0 0 1.5px #e6e3da",
                  transform: b === "Comment" ? `scale(${1 - 0.06 * click})` : undefined,
                }}
              >
                {b}
              </span>
            ))}
          </span>
        </div>
        {/* left: the conversation */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 70,
            bottom: 0,
            width: 520,
            padding: 28,
            boxShadow: "inset -1px 0 #ece9e1",
            display: "grid",
            alignContent: "start",
            gap: 16,
          }}
        >
          <span
            style={{
              justifySelf: "end",
              maxWidth: 420,
              padding: "14px 18px",
              borderRadius: 16,
              background: "#f1efe8",
              fontSize: 20,
              lineHeight: "28px",
            }}
          >
            {p.prompt}
          </span>
          {list(p.status, 3).map((w, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 19, color: "#6f6b62" }}>
              <Star a={a} size={18} spin={0} />
              {w}
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#2e9a5b"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ marginLeft: "auto" }}
              >
                <path d="M3 8.5 6.25 11.75 13 5" />
              </svg>
            </span>
          ))}
        </div>
        {/* right: the result, live */}
        <div
          style={{
            position: "absolute",
            left: 520,
            right: 0,
            top: 70,
            bottom: 0,
            background: "#faf9f6",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ zoom: 0.86 }}>
            <Phone id={p.screen} shadow={false} />
          </div>
        </div>
        {/* the comment, under its button */}
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 82,
            width: 520,
            padding: 22,
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 30px 70px -24px rgba(0,0,0,.35)",
            transform: `scale(${pop})`,
            transformOrigin: "80% 0",
            opacity: pop > 0.01 ? 1 : 0,
          }}
        >
          <div style={{ fontSize: 17, color: "#7a756b", marginBottom: 10 }}>Ask {p.name} to change something</div>
          <div
            style={{
              minHeight: 64,
              padding: "12px 14px",
              borderRadius: 12,
              boxShadow: `inset 0 0 0 1.5px ${alpha(a, 0.6)}`,
              fontSize: 20,
              lineHeight: "28px",
            }}
          >
            {comment}
            <Caret on={blink(t, t < sendAt - 0.15)} color={a} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, fontSize: 18 }}>
            <span style={{ padding: "9px 16px", borderRadius: 10, boxShadow: "inset 0 0 0 1.5px #e6e3da" }}>Cancel</span>
            <span
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                background: a,
                color: "#fff",
                transform: `scale(${1 - 0.06 * seg(t, sendAt, sendAt + 0.08) * (1 - seg(t, sendAt + 0.1, sendAt + 0.25))})`,
              }}
            >
              Send
            </span>
          </div>
        </div>
        {t > 14.4 && (
          <Cursor
            x={lerp(1200, 1260, hand) + (t > 16.0 ? 260 * inOut(seg(t, 16.0, sendAt)) : 0)}
            y={lerp(420, 26, hand) + (t > 16.0 ? 250 * inOut(seg(t, 16.0, sendAt)) : 0)}
            press={click}
            hand
            size={1.4}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- 17 – 18.4 · a status word, alone ---------------- */

function Word({ t, p, a }: S) {
  const words = list(p.status, 3);
  return (
    <div style={{ ...center(470), ...fx(t, { at: 17.05, dur: 0.5, out: 18.1, blur: 16, dy: 16 }) }}>
      <StatusPill a={a} word={words[2]} t={t} size={120} card={false} />
    </div>
  );
}

/* ---------------- 18.4 – 21 · the plan, ticking off ---------------- */

function Plan({ t, p, a }: S) {
  const steps = list(p.plan, 4).slice(0, 4);
  const at = (i: number) => 18.85 + i * 0.48;
  const done = steps.filter((_, i) => t >= at(i) + 0.2).length;
  return (
    <div style={{ position: "absolute", left: 360, top: 200, width: 1200, ...fx(t, { at: 18.45, dur: 0.6, out: 20.7, blur: 12, dy: 30 }) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26, fontSize: 30, color: "#6f6b62" }}>
        <Star a={a} size={28} spin={t * 140} />
        Plan
        <span style={{ marginLeft: "auto", fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: 24 }}>
          {done}/{steps.length}
        </span>
      </div>
      {steps.map((s, i) => {
        const k = back(seg(t, at(i), at(i) + 0.3), 2.2);
        const struck = clamp(seg(t, at(i) + 0.15, at(i) + 0.45));
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              height: 112,
              padding: "0 30px",
              marginBottom: 12,
              borderRadius: 20,
              background: "#fff",
              boxShadow: "0 0 0 1px rgba(0,0,0,.05)",
            }}
          >
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 46,
                height: 46,
                borderRadius: 10,
                background: k > 0.05 ? "#2e9a5b" : "transparent",
                boxShadow: k > 0.05 ? undefined : "inset 0 0 0 2.5px #cfcbc1",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: `scale(${k})` }}
                aria-hidden="true"
              >
                <path d="M3 8.5 6.25 11.75 13 5" />
              </svg>
            </span>
            <span style={{ position: "relative", fontSize: 46, letterSpacing: "-0.02em", color: struck > 0.5 ? "#a39e93" : INK }}>
              {s}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "54%",
                  height: 3,
                  width: `${struck * 100}%`,
                  background: "#a39e93",
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 21 – 24 · the screen changing before your eyes ---------------- */

function Change({ t, p, a }: S) {
  const sweep = inOut(seg(t, 21.9, 22.9));
  return (
    <>
      <div style={{ ...phoneAt(), ...fx(t, { at: 21.0, dur: 0.6, out: 23.7, blur: 12, dy: 40 }) }}>
        <Phone scale={PHONE_Z}>
          <Screen id={p.screen} />
          {/* the changed screen, swept in from the top: the same app, its colours turned for the dark */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `inset(0 0 ${(1 - sweep) * 100}% 0)`,
              filter: "invert(0.92) hue-rotate(180deg) saturate(1.1)",
            }}
          >
            <Screen id={p.screen} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${sweep * 100}%`,
              height: 3,
              background: a,
              boxShadow: `0 0 24px 6px ${alpha(a, 0.6)}`,
              opacity: sweep > 0 && sweep < 1 ? 1 : 0,
            }}
          />
        </Phone>
      </div>
      <div style={{ ...center(130), ...fx(t, { at: 21.2, dur: 0.5, out: 23.55, blur: 12, dy: 16 }) }}>
        <StatusPill a={a} word={p.change} t={t} size={48} />
      </div>
    </>
  );
}

/* ---------------- 24 – 27 · a collage ---------------- */

function Collage({ t, p, a }: S) {
  const pull = expo(seg(t, 24.05, 25.6));
  const drift = inOut(seg(t, 25.0, 27.0));
  const cells = [-2, -1, 0, 1, 2];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "960px 540px",
        transform: `scale(${lerp(2.0, 0.92, pull) * lerp(1, 0.96, drift)}) rotate(${lerp(-3, -1, pull)}deg)`,
        opacity: 1 - acc(seg(t, 26.7, 27.0)),
      }}
    >
      {cells.map((c) => (
        <div
          key={c}
          style={{
            ...phoneAt(0.78),
            left: 960 - (426 * 0.78) / 2 + c * 380,
            top: 540 - (898 * 0.78) / 2 + (c % 2 ? 60 : -30),
            opacity: c === 0 ? 1 : seg(t, 24.3 + Math.abs(c) * 0.12, 24.7 + Math.abs(c) * 0.12),
          }}
        >
          <Phone scale={0.78}>
            <div style={{ transform: `translateY(${-Math.abs(c) * 160}px)` }}>
              <Screen id={p.screen} h={874 + 400} />
            </div>
          </Phone>
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 70,
          textAlign: "center",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 40,
          color: mix(a, "#000000", 0.2),
          ...fx(t, { at: 25.4, out: 26.7 }),
        }}
      >
        {p.collage}
      </div>
    </div>
  );
}

/* ---------------- 27 – 33 · the end card ---------------- */

function End({ t, p, a }: S) {
  const pop = back(seg(t, 27.15, 27.65), 1.7);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "960px 540px",
        transform: `scale(${lerp(1, 1.05, inOut(seg(t, 27.2, 31)))})`,
      }}
    >
      <div style={{ ...center(400, { gap: 30 }), ...fx(t, { at: 27.1, dur: 0.6, blur: 14 }) }}>
        <span style={{ display: "inline-grid", transform: `scale(${pop})` }}>
          <Mark name={p.name} a={a} size={128} />
        </span>
        <span style={{ fontSize: 124, fontWeight: 620, letterSpacing: "-0.05em" }}>{p.name}</span>
      </div>
      <div style={{ ...center(590), fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: "#5b574f", ...fx(t, { at: 27.8 }) }}>
        {p.tagline}
      </div>
      <div style={{ ...center(690), fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: 28, color: a, ...fx(t, { at: 28.3 }) }}>
        {p.url}
      </div>
    </div>
  );
}
