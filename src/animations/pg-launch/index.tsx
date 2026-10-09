// provider-guard — the launch film. 46 s on a 120 BPM grid (0.5 s beats, 2 s bars), drawn from one clock: every frame
// is a pure function of t, so the engine's stepped export renders it exactly, frame by frame.
//
// It's cut in the grammar of the SaaS launch films (a hook typed among floating UI fragments, huge blur-in words, a
// reveal on black, phrases in braces, a split screen whose checklist ticks, the product's UI tilted under a dolly with a
// cursor and a macro push, a typed CTA), and it speaks the product's own design language: the Studio's chips, flags,
// timeline and checks are its real markup over its real stylesheet (studio/, copied from packages/studio).
//
// Facts on screen are the published ones: 22 of 51 reasoned calls (vercel/ai#20932), and the call that's caught is a real
// record from the replay (baseten: stop, 4 text tokens billed, 0 chars → recovered on fireworks, 276 chars).
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Cursor, Reveal, Words, acc, back, blink, clamp, expo, fx, inOut, lerp, out, seg, typed, typingEnd, useClock, useFonts, visible } from "../_film/kit";
import "./studio/tokens.css";
import "./studio/app.css";
import "./film.css";

export const DURATION = 46;

/* ---------------- the stage ---------------- */

function useFit() {
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
  return [ref, k] as const;
}

/** How dark the ground is at t: 0 is Vercel's white, 1 its black. */
const DARK: [number, number][] = [
  [0, 0],
  [11.0, 0],
  [11.4, 1],
  [15.0, 1],
  [15.4, 0],
  [32.2, 0],
  [32.5, 1],
  [35.2, 1],
  [35.5, 0],
  [41.1, 0],
  [41.5, 1],
  [46, 1],
];
function darkAt(t: number) {
  for (let i = 1; i < DARK.length; i++) {
    const [b, vb] = DARK[i];
    const [a, va] = DARK[i - 1];
    if (t <= b) return lerp(va, vb, inOut(seg(t, a, b)));
  }
  return 1;
}

export default function Film() {
  useFonts();
  const t = useClock(DURATION);
  const [ref, k] = useFit();
  const d = darkAt(t);
  return (
    <div ref={ref} className="pgf">
      <div className="pgf-stage" style={{ transform: `translate(-50%, -50%) scale(${k})` }}>
        <div className="pgf-bg pgf-light">
          <div className="pgf-grid" />
        </div>
        <div className="pgf-bg pgf-dark" style={{ opacity: d }}>
          <div className="pgf-grid" />
        </div>
        {visible(t, 0, 4.6) && <Hook t={t} />}
        {visible(t, 4.6, 8.6) && <Stat t={t} />}
        {visible(t, 8.6, 11.4) && <NoFallback t={t} />}
        {visible(t, 11.4, 15.4) && <Meet t={t} />}
        {visible(t, 15.4, 19.4) && <Positioning t={t} />}
        {visible(t, 19.4, 23.4) && <Code t={t} />}
        {visible(t, 23.4, 29.4) && <Catch t={t} />}
        {visible(t, 29.4, 32.4) && <SameStream t={t} />}
        {visible(t, 32.4, 35.4) && <Rules t={t} />}
        {visible(t, 35.4, 41.4) && <StudioShot t={t} />}
        {visible(t, 41.4, 46) && <Cta t={t} />}
      </div>
    </div>
  );
}

/* ---------------- the product's own pieces (Studio markup, Studio styles) ---------------- */

type IconProps = { size?: number; className?: string };
function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}
const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5 6.25 11.75 13 5" />
  </Svg>
);
const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 14.25V1.75" />
    <path d="M3.5 2.25h8.75L10.25 5.5l2 3.25H3.5" />
  </Svg>
);
const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.25v4" />
    <path d="M8 4.75h.01" />
  </Svg>
);
const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);

function Chip({ provider, flagged = false, style }: { provider: string; flagged?: boolean; style?: CSSProperties }) {
  return (
    <span className={`chip${flagged ? " chip-flagged" : ""}`} style={style}>
      {flagged && <IconFlag size={12} className="chip-flag" />}
      <span className="text-label-12-mono">{provider}</span>
    </span>
  );
}

/** The served provider, flagged, a line drawing to the retry provider (`p` 0 → 1). */
function CatchPath({ p, from, to }: { p: number; from: string; to: string }) {
  return (
    <span className="provider-path">
      <Chip
        provider={from}
        flagged
        style={{
          transform: `scale(${lerp(0.85, 1, back(seg(p, 0, 0.35), 2.2))})`,
        }}
      />
      <svg className="catch-line" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true" style={{ opacity: seg(p, 0.2, 0.3) }}>
        <path d="M1 5h24" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - inOut(seg(p, 0.25, 0.7))} />
        <path d="m21.5 1.5 3.5 3.5-3.5 3.5" style={{ opacity: seg(p, 0.6, 0.75) }} />
      </svg>
      <Chip provider={to} style={{ opacity: seg(p, 0.65, 0.85) }} />
    </span>
  );
}

/** The billed-but-empty rule, as the Studio shows it: the four checks with the recorded values. */
function Evidence({ p = 1 }: { p?: number }) {
  const checks = [
    ["Finish reason", "stop"],
    ["Text tokens billed", "4"],
    ["Text delivered", "0 chars"],
    ["Tool calls", "0"],
  ];
  return (
    <div className="evidence">
      <ul className="checks">
        {checks.map(([label, value], i) => (
          <li key={label} className="check-pass" style={{ opacity: seg(p, i * 0.15, i * 0.15 + 0.2) }}>
            <span className="check-label">{label}</span>
            <span className="check-value text-label-13-mono">
              <code>{value}</code>
            </span>
            <IconCheck className="check-icon" />
          </li>
        ))}
      </ul>
      <p className="evidence-verdict text-label-14" style={{ opacity: seg(p, 0.7, 0.9) }}>
        <IconFlag /> Matched billed-but-empty
      </p>
    </div>
  );
}

function Shield({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.6 4.6 5.4v6.1c0 4.5 3.1 8.2 7.4 9.9 4.3-1.7 7.4-5.4 7.4-9.9V5.4Z" />
      <path d="m8.7 12.1 2.3 2.3 4.4-4.7" />
    </svg>
  );
}

/* ---------------- 0 – 4.6 · the hook: what a 200 hides ---------------- */

function Hook({ t }: { t: number }) {
  const A = "200 OK.";
  const B = " Tokens billed.";
  const C = " Nothing delivered.";
  const [ta, tb, tc] = [0.7, 1.45, 2.5];
  const a = typed(A, t, ta, 16);
  const b = typed(B, t, tb, 17);
  const c = typed(C, t, tc, 17);
  const busy = (t >= ta && t < typingEnd(A, ta, 16)) || (t >= tb && t < typingEnd(B, tb, 17)) || (t >= tc && t < typingEnd(C, tc, 17));
  const dim = 1 - 0.68 * out(seg(t, 3.7, 4.1));
  const line = fx(t, { at: 0.1, dur: 0.4, out: 4.25 });
  const drift = (i: number) => `translate(${(i % 2 ? 1 : -1) * 8 * seg(t, 0, 4.6)}px, ${-22 * seg(t, 0, 4.6) * (1 + (i % 3) * 0.3)}px)`;
  const frags: {
    x: number;
    y: number;
    r: number;
    far?: boolean;
    node: ReactNode;
  }[] = [
    {
      x: 170,
      y: 190,
      r: -3,
      node: (
        <>
          <span className="pgf-dot" style={{ background: "var(--ds-green-700)" }} />
          <span className="pgf-mono">200 OK</span>
          <span className="pgf-mono" style={{ color: "var(--ds-gray-800)" }}>
            POST /api/chat
          </span>
        </>
      ),
    },
    {
      x: 1460,
      y: 170,
      r: 2.5,
      node: (
        <>
          <span className="pgf-mono">zai/glm-5.3-flash</span>
          <span style={{ zoom: 1.5 }}>
            <Chip provider="baseten" />
          </span>
        </>
      ),
    },
    {
      x: 140,
      y: 780,
      r: 2,
      node: (
        <>
          <span style={{ color: "var(--ds-gray-900)" }}>Finish reason</span>
          <code className="pgf-mono">stop</code>
          <IconCheck size={20} />
        </>
      ),
    },
    {
      x: 1490,
      y: 800,
      r: -2,
      node: (
        <>
          <span style={{ color: "var(--ds-gray-900)" }}>Text tokens billed</span>
          <code className="pgf-mono">4</code>
        </>
      ),
    },
    {
      x: 800,
      y: 150,
      r: 1,
      far: true,
      node: (
        <svg width="300" height="26" viewBox="0 0 300 26" aria-hidden="true">
          <line className="lane-bar lane-caught" x1="6" x2="290" y1="13" y2="13" />
          <circle className="mark-reasoning" cx="200" cy="13" r="5" />
          <circle className="mark-reasoning" cx="250" cy="13" r="5" />
          <rect className="mark-finish" x="287" y="3" width="3.5" height="20" />
        </svg>
      ),
    },
    {
      x: 830,
      y: 860,
      r: -1.5,
      far: true,
      node: (
        <>
          <span style={{ color: "var(--ds-gray-900)" }}>Text delivered</span>
          <code className="pgf-mono">0 chars</code>
        </>
      ),
    },
  ];
  return (
    <>
      {frags.map((f, i) => (
        <div
          key={i}
          className="pgf-frag"
          style={{
            left: f.x,
            top: f.y,
            ...fx(t, {
              at: 0.1 + i * 0.09,
              dur: 0.8,
              out: 4.15 + i * 0.02,
              blur: 12,
            }),
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              transform: `${drift(i)} rotate(${f.r}deg)`,
              opacity: f.far ? 0.55 : 1,
              filter: f.far ? "blur(1.2px)" : undefined,
            }}
          >
            {f.node}
          </span>
        </div>
      ))}
      <div className="pgf-row pgf-display" style={{ top: 494, fontSize: 84, ...line }}>
        <span style={{ opacity: dim, whiteSpace: "pre" }}>{a}</span>
        <span style={{ opacity: dim, whiteSpace: "pre" }}>{b}</span>
        <span style={{ whiteSpace: "pre" }}>{c}</span>
        <span className="pgf-caret" style={{ opacity: blink(t, busy) }} />
      </div>
    </>
  );
}

/* ---------------- 4.6 – 8.6 · the number from the issue ---------------- */

function Stat({ t }: { t: number }) {
  const n = Math.round(22 * out(seg(t, 4.75, 5.7)));
  const fill = (22 / 51) * out(seg(t, 5.0, 6.1));
  const o = 8.2;
  const push = lerp(1, 1.06, inOut(seg(t, 4.7, 8.6)));
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: "960px 520px", transform: `scale(${push})` }}>
      <div
        className="pgf-row pgf-display"
        style={{
          top: 290,
          fontSize: 250,
          letterSpacing: "-0.06em",
          ...fx(t, { at: 4.7, dur: 0.8, out: o, blur: 18, dy: 30 }),
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ color: "var(--ds-gray-500)" }}>/51</span>
      </div>
      <div
        className="pgf-abs"
        style={{
          left: 540,
          top: 590,
          width: 840,
          height: 14,
          borderRadius: 7,
          background: "var(--ds-gray-200)",
          ...fx(t, { at: 4.85, out: o, blur: 0, dy: 12 }),
        }}
      >
        <div
          style={{
            width: `${fill * 100}%`,
            height: "100%",
            borderRadius: 7,
            background: "linear-gradient(90deg, var(--ds-red-600), var(--ds-red-800))",
          }}
        />
      </div>
      <div
        className="pgf-row"
        style={{
          top: 648,
          fontSize: 36,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ds-gray-900)",
          ...fx(t, { at: 5.6, out: o }),
        }}
      >
        reasoned calls with tools came back billed and empty
      </div>
      <div
        className="pgf-row pgf-mono"
        style={{
          top: 712,
          fontSize: 22,
          color: "var(--ds-gray-800)",
          ...fx(t, { at: 6.0, out: o }),
        }}
      >
        zai/glm-5.3-flash on baseten · vercel/ai#20932
      </div>
    </div>
  );
}

/* ---------------- 8.6 – 11.4 · why nothing falls back ---------------- */

function NoFallback({ t }: { t: number }) {
  const smear = expo(seg(t, 9.6, 10.25));
  const away = acc(seg(t, 10.95, 11.4));
  return (
    <>
      <div
        className="pgf-row"
        style={{
          top: 500,
          fontSize: 64,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "var(--ds-gray-900)",
          ...fx(t, { at: 8.7, out: 9.4, outDur: 0.25 }),
        }}
      >
        A 200 counts as success.
      </div>
      <div
        className="pgf-row pgf-display"
        style={{
          top: 412,
          fontSize: 250,
          fontWeight: 700,
          letterSpacing: "-0.065em",
          opacity: smear * (1 - away),
          transform: `translateX(${(1 - smear) * -90}px) scale(${lerp(1.22, 1, smear) * lerp(1, 1.04, seg(t, 10.2, 10.95)) * lerp(1, 1.45, away)}, ${lerp(1, 1.04, seg(t, 10.2, 10.95)) * lerp(1, 1.45, away)})`,
          filter: `blur(${(1 - smear) * 30 + away * 14}px)`,
        }}
      >
        No fallback.
      </div>
    </>
  );
}

/* ---------------- 11.4 – 15.4 · meet provider-guard (on black) ---------------- */

function Meet({ t }: { t: number }) {
  const inn = expo(seg(t, 11.5, 12.15));
  const p = inOut(seg(t, 12.3, 12.95));
  const size = lerp(320, 108, p);
  const mark = back(seg(t, 12.55, 13.0), 1.8);
  const name = out(seg(t, 12.6, 13.25));
  const tag = "AI SDK middleware for Vercel AI Gateway";
  const leave = fx(t, { at: 0, dur: 0, out: 14.95, outDur: 0.4 });
  return (
    <div style={{ ...leave, position: "absolute", inset: 0 }}>
      <div
        className="pgf-row pgf-display"
        style={{
          top: 540 - size / 2 - 34 * p,
          height: size,
          gap: 30 * p,
          color: "#fff",
          fontSize: size,
          opacity: inn,
          filter: inn < 1 ? `blur(${(1 - inn) * 30}px)` : undefined,
          transform: `scale(${lerp(1.08, 1, inn)})`,
        }}
      >
        <span>Meet</span>
        <span
          className="pgf-mark"
          style={{
            width: 108 * mark,
            height: 108 * mark,
            opacity: seg(t, 12.55, 12.7),
          }}
        >
          <Shield size={60 * mark} />
        </span>
        <Reveal p={name}>
          <span style={{ fontSize: 108 }}>provider-guard</span>
        </Reveal>
      </div>
      <div className="pgf-row pgf-mono" style={{ top: 640, fontSize: 30, color: "var(--ds-gray-700)" }}>
        {typed(tag, t, 13.3, 32)}
        <span
          className="pgf-caret"
          style={{
            opacity: t > 13.25 ? blink(t, t < typingEnd(tag, 13.3, 32)) : 0,
            color: "#fff",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- 15.4 – 19.4 · the line ---------------- */

function Positioning({ t }: { t: number }) {
  const up = out(seg(t, 16.5, 17.0));
  const open = inOut(seg(t, 17.25, 17.95));
  const o = 18.95;
  const blue = "var(--ds-blue-700)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        ...fx(t, { at: 0, dur: 0, out: o }),
      }}
    >
      <div className="pgf-row pgf-display" style={{ top: 440 - 64 * up, fontSize: 72, opacity: 1 - 0.6 * up }}>
        <Words text="The gateway catches errors." t={t} at={15.5} />
      </div>
      <div className="pgf-row pgf-display" style={{ top: 540, fontSize: 72 }}>
        <Words text="provider-guard catches" t={t} at={16.75} />
        <span
          style={{
            color: blue,
            opacity: seg(t, 17.15, 17.3),
            marginLeft: 22 * seg(t, 17.15, 17.3),
          }}
        >
          {"{"}
        </span>
        <Reveal p={open} style={{ color: blue }}>
          <span
            style={{
              padding: "0 0.12em",
              filter: open < 1 ? `blur(${(1 - open) * 8}px)` : undefined,
            }}
          >
            successes that aren&rsquo;t
          </span>
        </Reveal>
        <span style={{ color: blue, opacity: seg(t, 17.15, 17.3) }}>{"}"}</span>
      </div>
    </div>
  );
}

/* ---------------- 19.4 – 23.4 · one line of middleware ---------------- */

function Code({ t }: { t: number }) {
  const tilt = expo(seg(t, 19.55, 21.0));
  const dolly = inOut(seg(t, 21.0, 23.0));
  const macro = inOut(seg(t, 21.9, 23.05));
  const away = acc(seg(t, 23.05, 23.4));
  const line5 = "  middleware: guard(),";
  const shown = typed(line5, t, 20.55, 22);
  const hi = back(seg(t, 21.45, 21.8), 1.6);
  return (
    <>
      <div className="pgf-row pgf-display" style={{ top: 150, fontSize: 48, ...fx(t, { at: 19.5, out: 21.8 }) }}>
        One line of middleware.
      </div>
      <div
        className="pgf-abs"
        style={{
          left: 400,
          top: 300,
          width: 1120,
          height: 470,
          perspective: 1800,
          opacity: 1 - away,
          filter: away > 0 ? `blur(${away * 12}px)` : undefined,
        }}
      >
        <div
          className="pgf-card"
          style={{
            position: "absolute",
            inset: 0,
            opacity: seg(t, 19.55, 19.9),
            transformOrigin: "372px 318px",
            transform: `translateY(${(1 - tilt) * 140}px) scale(${lerp(0.9, 1, tilt) * lerp(1, 1.04, dolly) * lerp(1, 1.75, macro) * lerp(1, 1.4, away)}) rotateX(${lerp(26, 8, tilt) - 5 * dolly - 3 * macro}deg) rotateY(${lerp(-20, -6, tilt) + 5 * dolly + 1 * macro}deg)`,
          }}
        >
          <div className="pgf-bar">
            <i />
            <i />
            <i />
            <span
              className="pgf-mono"
              style={{
                marginLeft: 16,
                fontSize: 18,
                color: "var(--ds-gray-800)",
              }}
            >
              app/api/chat/route.ts
            </span>
          </div>
          <div className="pgf-code">
            <div>
              <span className="kw">import</span> <span className="pn">{"{"}</span> guard <span className="pn">{"}"}</span>{" "}
              <span className="kw">from</span> <span className="str">&apos;provider-guard&apos;</span>
            </div>
            <div>&nbsp;</div>
            <div>
              <span className="kw">const</span> model <span className="pn">=</span> <span className="fn">wrapLanguageModel</span>
              <span className="pn">({"{"}</span>
            </div>
            <div>
              {"  "}model<span className="pn">:</span> <span className="fn">gateway</span>
              <span className="pn">(</span>
              <span className="str">&apos;zai/glm-5.3-flash&apos;</span>
              <span className="pn">),</span>
            </div>
            <div style={{ position: "relative" }}>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "13.75ch",
                  top: 3,
                  width: "7.5ch",
                  height: 44,
                  borderRadius: 8,
                  background: "var(--ds-blue-200)",
                  boxShadow: "0 0 0 2px var(--ds-blue-600)",
                  opacity: clamp(hi * 1.5),
                  transform: `scale(${lerp(0.7, 1, hi)})`,
                }}
              />
              <span style={{ position: "relative" }}>
                {shown.slice(0, 14)}
                <span className="fn">{shown.slice(14, 19)}</span>
                <span className="pn">{shown.slice(19)}</span>
                <span
                  className="pgf-caret"
                  style={{
                    opacity: t > 20.4 && t < 21.45 ? blink(t, t < typingEnd(line5, 20.55, 22)) : 0,
                    color: "var(--ds-blue-700)",
                  }}
                />
              </span>
            </div>
            <div>
              <span className="pn">{"})"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- 23.4 – 29.4 · the catch, side by side ---------------- */

function Catch({ t }: { t: number }) {
  const o = 29.0;
  const empty = t >= 25.0;
  const streamed = "Here's the summary you asked for. The thread settles on three decisions, and the open question is the";
  const answer = typed(streamed, t, 27.75, 52);
  const lines: {
    at: number;
    icon: ReactNode;
    label: string;
    value?: string;
    color?: string;
  }[] = [
    {
      at: 24.55,
      icon: <IconCheck size={22} />,
      label: "finish reason",
      value: "stop",
    },
    {
      at: 24.9,
      icon: <IconCheck size={22} />,
      label: "text tokens billed",
      value: "4",
    },
    {
      at: 25.25,
      icon: <IconCheck size={22} />,
      label: "text delivered",
      value: "0 chars",
    },
    {
      at: 25.6,
      icon: <IconCheck size={22} />,
      label: "tool calls",
      value: "0",
    },
    {
      at: 26.1,
      icon: <IconFlag size={22} />,
      label: "matched billed-but-empty",
      color: "#ff6166",
    },
  ];
  const retry = t >= 27.45;
  const spin = (t * 360 * 1.4) % 360;
  const spark = inOut(seg(t, 27.45, 27.85));
  const lean = inOut(seg(t, 24.3, 26.2)) * (1 - inOut(seg(t, 26.9, 27.6)));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "1360px 520px",
        transform: `scale(${lerp(1, 1.42, lean)}) translateX(${-60 * lean}px)`,
      }}
    >
      <div className="pgf-abs pgf-label" style={{ left: 190, top: 262, ...fx(t, { at: 23.5, out: o }) }}>
        your app
      </div>
      <div className="pgf-abs pgf-label" style={{ left: 990, top: 262, ...fx(t, { at: 23.6, out: o }) }}>
        guard()
      </div>
      {/* the app: a chat that should be answering */}
      <div
        className="pgf-abs pgf-card"
        style={{
          left: 180,
          top: 300,
          width: 760,
          height: 470,
          padding: 32,
          display: "grid",
          alignContent: "start",
          gap: 22,
          ...fx(t, { at: 23.5, dur: 0.8, out: o, dy: 60 }),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>Assistant</span>
          <span style={{ zoom: 1.4 }}>
            <span className="chip">
              <span className="text-label-12-mono">zai/glm-5.3-flash</span>
            </span>
          </span>
        </div>
        <div
          className="pgf-bubble"
          style={{
            justifySelf: "end",
            maxWidth: 520,
            background: "var(--ds-gray-100)",
          }}
        >
          Summarize this thread for me.
        </div>
        <div
          className="pgf-bubble"
          style={{
            justifySelf: "start",
            minHeight: 120,
            width: 600,
            boxShadow: `0 0 0 1px ${retry ? "var(--ds-gray-alpha-400)" : empty ? "var(--ds-red-400)" : "var(--ds-gray-alpha-400)"}`,
          }}
        >
          {!empty && (
            <span style={{ display: "inline-flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="pgf-dot"
                  style={{
                    background: "var(--ds-gray-600)",
                    opacity: 0.35 + 0.65 * Math.abs(Math.sin((t * 3.2 - i * 0.35) * Math.PI)),
                  }}
                />
              ))}
            </span>
          )}
          {empty && (
            <>
              {answer}
              <span
                className="pgf-caret"
                style={{
                  opacity: blink(t, retry && answer.length < streamed.length),
                }}
              />
            </>
          )}
        </div>
        <div
          className="pgf-mono"
          style={{
            fontSize: 18,
            color: retry ? "var(--ds-green-900)" : "var(--ds-red-900)",
            opacity: seg(t, 25.0, 25.3),
          }}
        >
          {retry ? "fireworks · recovered · 276 chars delivered" : "baseten · 200 OK · 4 tokens billed · 0 chars"}
        </div>
      </div>
      {/* the guard: the checks it ran, as they run */}
      <div
        className="pgf-abs pgf-term"
        style={{
          left: 980,
          top: 300,
          width: 760,
          height: 470,
          ...fx(t, { at: 23.6, dur: 0.8, out: o, dy: 60 }),
        }}
      >
        <div className="pgf-bar">
          <i />
          <i />
          <i />
          <span className="pgf-mono" style={{ marginLeft: 16, fontSize: 18, color: "#8f8f8f" }}>
            attempt 1 · baseten · zai/glm-5.3-flash
          </span>
        </div>
        <div style={{ padding: "26px 34px" }}>
          {lines.map((l) => (
            <div
              key={l.label}
              className="pgf-tline"
              style={{
                color: l.color,
                opacity: seg(t, l.at, l.at + 0.2),
                transform: `translateX(${(1 - out(seg(t, l.at, l.at + 0.35))) * -14}px)`,
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  transform: `scale(${back(seg(t, l.at + 0.05, l.at + 0.35), 2.4)})`,
                }}
              >
                {l.icon}
              </span>
              <span>{l.label}</span>
              <span style={{ color: "#a1a1a1" }}>{l.value}</span>
            </div>
          ))}
          <div
            className="pgf-tline"
            style={{
              color: retry ? "#3ec75b" : "#ededed",
              opacity: seg(t, 26.65, 26.85),
            }}
          >
            <span style={{ display: "inline-grid" }}>
              {retry ? (
                <IconCheck size={22} />
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${spin}deg)` }} aria-hidden="true">
                  <circle cx="11" cy="11" r="8" fill="none" stroke="#3a3a3a" strokeWidth="2.4" />
                  <path d="M11 3a8 8 0 0 1 8 8" fill="none" stroke="#ededed" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span>{retry ? "recovered on fireworks" : "retrying once on fireworks…"}</span>
            <span style={{ color: "#a1a1a1" }}>{retry ? "276 chars" : ""}</span>
          </div>
        </div>
      </div>
      {/* spliced into the same stream: the answer travels back to the app */}
      {spark > 0 && spark < 1 && (
        <div
          className="pgf-abs"
          style={{
            left: lerp(1010, 860, spark),
            top: lerp(640, 560, spark),
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--ds-blue-600)",
            boxShadow: "0 0 24px 6px rgba(50,145,255,.55)",
          }}
        />
      )}
    </div>
  );
}

/* ---------------- 29.4 – 32.4 · the same stream (the Studio's timeline) ---------------- */

function SameStream({ t }: { t: number }) {
  // the real call: attempt 1 on baseten 0–300 ms, attempt 2 on fireworks from 325 ms to 1196 ms
  const end = 1196;
  const tau = end * inOut(seg(t, 29.9, 31.7));
  const W = 600;
  const x = (ms: number) => 4 + (ms / end) * (W - 12);
  const pop = (ms: number) => back(clamp((tau - ms) / 90), 2.2);
  const lanes = [
    {
      y: 34,
      from: 0,
      to: 300,
      label: "Attempt 1 · baseten",
      note: "",
      caught: true,
      parts: [
        ["r", 209],
        ["r", 263],
        ["f", 300],
      ] as const,
    },
    {
      y: 84,
      from: 325,
      to: 1196,
      label: "Attempt 2 · fireworks",
      note: "  spliced into the same stream",
      caught: false,
      parts: [
        ["r", 508],
        ["r", 552],
        ["x", 1175],
        ["f", 1196],
      ] as const,
    },
  ];
  const o = 32.0;
  return (
    <>
      <div className="pgf-row pgf-display" style={{ top: 196, fontSize: 72, ...fx(t, { at: 29.5, out: o }) }}>
        Retried once. Same stream.
      </div>
      <div
        className="pgf-abs"
        style={{
          left: 170,
          top: 350,
          width: 1580,
          height: 520,
          perspective: 2000,
          ...fx(t, { at: 29.55, dur: 0.9, out: o, dy: 50, blur: 12 }),
        }}
      >
        <div
          className="pgf-card"
          style={{
            position: "absolute",
            inset: 0,
            padding: "44px 40px 30px",
            transform: `rotateX(${lerp(18, 4, expo(seg(t, 29.55, 30.9))) - 2 * seg(t, 30.9, 32)}deg) rotateY(${lerp(-12, -3, expo(seg(t, 29.55, 30.9))) + 3 * seg(t, 30.9, 32)}deg) scale(${lerp(0.94, 1, expo(seg(t, 29.55, 30.9))) * lerp(1, 1.04, seg(t, 30.9, 32))})`,
          }}
        >
          <span className="text-heading-20" style={{ display: "block", zoom: 1.6, marginBottom: 6 }}>
            Timeline
          </span>
          <figure className="timeline" style={{ margin: 0 }}>
            <svg
              viewBox={`0 0 ${W} 120`}
              width={1500}
              height={300}
              aria-hidden="true"
              style={{ maxWidth: "none", width: 1500, height: 300 }}
            >
              {[0, 500, 1000].map((ms) => (
                <g key={ms}>
                  <line className="axis-grid" x1={x(ms)} x2={x(ms)} y1={0} y2={100} />
                  <text className="axis-label" x={x(ms)} y={114} textAnchor={ms === 0 ? "start" : "middle"}>
                    {ms === 0 ? "0 ms" : `${ms} ms`}
                  </text>
                </g>
              ))}
              {lanes.map((l) => {
                const shown = tau > l.from;
                return (
                  <g key={l.label} style={{ opacity: shown ? 1 : 0 }}>
                    <text className="lane-label" x={x(l.from)} y={l.y - 12}>
                      {l.label}
                      {l.note && <tspan className="lane-note">{l.note}</tspan>}
                    </text>
                    <line
                      className={`lane-bar${l.caught ? " lane-caught" : ""}`}
                      x1={x(l.from)}
                      x2={x(Math.min(l.to, Math.max(l.from, tau)))}
                      y1={l.y}
                      y2={l.y}
                    />
                    {l.parts.map(([kind, ms], i) => {
                      const s = pop(ms);
                      if (s <= 0) return null;
                      const cx = x(ms);
                      return kind === "r" ? (
                        <circle key={i} className="mark mark-reasoning" cx={cx} cy={l.y} r={3.5 * s} />
                      ) : kind === "x" ? (
                        <rect key={i} className="mark mark-text" x={cx - 3.25 * s} y={l.y - 3.25 * s} width={6.5 * s} height={6.5 * s} />
                      ) : (
                        <rect key={i} className="mark mark-finish" x={cx - 1.25} y={l.y - 6 * s} width={2.5} height={12 * s} />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </figure>
          <div
            className="legend"
            style={{
              zoom: 2,
              justifyContent: "center",
              opacity: seg(t, 30.2, 30.6),
            }}
          >
            {[
              ["mark-reasoning", "Reasoning", "c"],
              ["mark-text", "Text", "s"],
              ["mark-finish", "Finish", "f"],
            ].map(([cls, label, shape]) => (
              <span key={label} className="legend-item">
                <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
                  {shape === "c" ? (
                    <circle className={`mark ${cls}`} r={3.5} />
                  ) : shape === "s" ? (
                    <rect className={`mark ${cls}`} x={-3.25} y={-3.25} width={6.5} height={6.5} />
                  ) : (
                    <rect className={`mark ${cls}`} x={-1.25} y={-6} width={2.5} height={12} />
                  )}
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- 32.4 – 35.4 · the rules it keeps (on black) ---------------- */

function Rules({ t }: { t: number }) {
  const rules = ["never after a tool call", "no prompts stored", "zero dependencies"];
  const blue = "#3291ff";
  return (
    <>
      {rules.map((r, i) => {
        const at = 32.55 + i * 0.95;
        const last = i === rules.length - 1;
        const open = inOut(seg(t, at + 0.05, at + 0.42)) * (last ? 1 : 1 - inOut(seg(t, at + 0.75, at + 0.93)));
        const on = t >= at && (last ? t < 35.4 : t < at + 0.95);
        if (!on) return null;
        const fade = last ? 1 - acc(seg(t, 35.05, 35.35)) : 1;
        return (
          <div key={r} className="pgf-row pgf-display" style={{ top: 498, fontSize: 84, color: "#fff", opacity: fade }}>
            <span style={{ color: blue }}>{"{"}</span>
            <Reveal p={open}>
              <span
                style={{
                  padding: "0 0.22em",
                  display: "inline-block",
                  filter: open < 1 ? `blur(${(1 - open) * 10}px)` : undefined,
                }}
              >
                {r}
              </span>
            </Reveal>
            <span style={{ color: blue }}>{"}"}</span>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- 35.4 – 41.4 · the Studio, watching it work ---------------- */

const ROWS: [string, string, string, string, string][] = [
  ["12s ago", "zai/glm-4.7", "zai", "268 / 291", "929 ms"],
  ["31s ago", "zai/glm-5.3-flash", "zai", "126 / 2", "1.1 s"],
  ["48s ago", "zai/glm-4.7", "baseten", "113 / 0", "824 ms"],
  ["1m ago", "zai/glm-5.3-flash", "baseten", "219 / 2", "873 ms"],
  ["1m ago", "zai/glm-5.3-flash", "zai", "212 / 2", "665 ms"],
  ["2m ago", "zai/glm-5.3-flash", "zai", "67 / 2", "844 ms"],
  ["2m ago", "zai/glm-4.7", "zai", "309 / 188", "932 ms"],
  ["3m ago", "zai/glm-5.3-flash", "baseten", "145 / 2", "726 ms"],
];

function StudioShot({ t }: { t: number }) {
  const tilt = expo(seg(t, 35.6, 37.1));
  const dolly = inOut(seg(t, 37.1, 39.4));
  const arrive = out(seg(t, 36.95, 37.4));
  const caught = seg(t, 37.0, 37.9);
  const sheet = expo(seg(t, 38.55, 39.2));
  const macro = inOut(seg(t, 39.45, 40.75));
  const away = acc(seg(t, 41.0, 41.4));
  // the cursor, in the window's own pixels: in from the lower right, onto the new row, a press, then off to the side
  const glide = inOut(seg(t, 37.55, 38.3));
  const cx = lerp(1060, 560, glide) + 140 * inOut(seg(t, 38.7, 39.3));
  const cy = lerp(600, 214, glide) + 120 * inOut(seg(t, 38.7, 39.3));
  const press = seg(t, 38.32, 38.4) * (1 - seg(t, 38.45, 38.6));
  const n = arrive > 0.5 ? 1 : 0;
  return (
    <>
      <div
        className="pgf-abs pgf-display"
        style={{
          left: 160,
          top: 70,
          fontSize: 52,
          ...fx(t, { at: 35.5, out: 38.4 }),
        }}
      >
        {typed("And a Studio to watch it work.", t, 35.5, 30)}
      </div>
      <div
        className="pgf-abs"
        style={{
          left: 166,
          top: 168,
          width: 1593,
          height: 891,
          perspective: 2200,
          opacity: 1 - away,
          filter: away > 0 ? `blur(${away * 12}px)` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "1276px 515px",
            opacity: seg(t, 35.6, 35.95),
            transform: `translate(${-470 * macro}px, ${(1 - tilt) * 150 - 40 * dolly - 120 * macro}px) scale(${lerp(0.9, 1, tilt) * lerp(1, 1.03, dolly) * lerp(1, 1.85, macro) * lerp(1, 1.3, away)}) rotateX(${lerp(22, 7, tilt) - 4 * dolly - 3 * macro}deg) rotateY(${lerp(-16, -6, tilt) + 4 * dolly + 2 * macro}deg)`,
          }}
        >
          <div style={{ zoom: 1.35 }}>
            <div className="pgf-window">
              <div className="banner text-label-13">
                <IconInfo />
                <span>Replay reconstructed from data published in vercel/ai#20932 and #21207. No live traffic.</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 24px 10px",
                }}
              >
                <span className="text-heading-16">provider-guard</span>
                <span className="badge badge-blue">
                  <span className="badge-text">Replay · vercel/ai#20932, #21207</span>
                </span>
              </div>
              <div className="pgf-tabs">
                <span className="pgf-tab pgf-tab-on">Feed</span>
                <span className="pgf-tab">Providers</span>
              </div>
              <div className="feed-summary" style={{ padding: "14px 24px 8px" }}>
                <p className="text-label-13" style={{ color: "var(--ds-gray-900)" }}>
                  {83 + n} calls · {9 + n} caught · {9 + n} recovered
                </p>
              </div>
              <table className="table feed-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Time", "Model", "Provider", "Result", "Tokens", "Duration"].map((h) => (
                      <th key={h} scope="col" style={{ textAlign: "left", paddingLeft: 24 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ transform: `translateY(${-44 * (1 - arrive)}px)` }}>
                  <tr
                    className="feed-row"
                    style={{
                      opacity: arrive,
                      background: `rgba(252, 0, 53, ${0.05 * (1 - seg(t, 38.0, 38.8)) * arrive})`,
                    }}
                  >
                    <td className="col-time text-label-13" style={{ paddingLeft: 24 }}>
                      0s ago
                    </td>
                    <td className="col-model text-label-13-mono" style={{ paddingLeft: 24 }}>
                      zai/glm-5.3-flash
                    </td>
                    <td className="col-provider" style={{ paddingLeft: 24 }}>
                      <CatchPath p={caught} from="baseten" to="fireworks" />
                    </td>
                    <td className="col-result text-label-14" style={{ paddingLeft: 24 }}>
                      <span className="result result-recovered" style={{ opacity: seg(t, 37.6, 37.85) }}>
                        <IconCheck className="result-check" />
                        Caught → recovered on fireworks
                      </span>
                    </td>
                    <td className="col-tokens text-label-13-mono" style={{ paddingLeft: 24 }}>
                      4 / 2
                    </td>
                    <td className="col-duration text-label-13-mono" style={{ paddingLeft: 24 }}>
                      1.2 s
                    </td>
                  </tr>
                  {ROWS.map(([time, model, provider, tokens, dur], i) => (
                    <tr key={i} className="feed-row">
                      <td className="col-time text-label-13" style={{ paddingLeft: 24 }}>
                        {time}
                      </td>
                      <td className="col-model text-label-13-mono" style={{ paddingLeft: 24 }}>
                        {model}
                      </td>
                      <td className="col-provider" style={{ paddingLeft: 24 }}>
                        <Chip provider={provider} />
                      </td>
                      <td className="col-result text-label-14" style={{ paddingLeft: 24 }}>
                        <span className="result result-quiet">
                          <IconCheck />
                          Delivered
                        </span>
                      </td>
                      <td className="col-tokens text-label-13-mono" style={{ paddingLeft: 24 }}>
                        {tokens}
                      </td>
                      <td className="col-duration text-label-13-mono" style={{ paddingLeft: 24 }}>
                        {dur}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* the call, opened: why it was caught */}
              <div
                className="pgf-sheet"
                style={{
                  transform: `translateX(${(1 - sheet) * 500}px)`,
                  opacity: sheet > 0 ? 1 : 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="text-heading-20">Call Anatomy</span>
                  <IconX />
                </div>
                <span className="text-label-14-mono">zai/glm-5.3-flash</span>
                <span
                  className="text-label-13"
                  style={{
                    color: "var(--ds-gray-900)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  0s ago · stream · <IconCheck size={14} /> Caught → recovered on fireworks
                </span>
                <CatchPath p={1} from="baseten" to="fireworks" />
                <span className="text-heading-16" style={{ marginTop: 10 }}>
                  Why It Was Caught
                </span>
                <span className="text-label-13" style={{ color: "var(--ds-gray-900)" }}>
                  Attempt 1 · baseten
                </span>
                <Evidence p={seg(t, 38.9, 39.9)} />
              </div>
              <Cursor x={cx} y={cy} press={press} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- 41.4 – 46 · npm i provider-guard (on black) ---------------- */

function Cta({ t }: { t: number }) {
  const cmd = "npm i provider-guard";
  const at = 41.7;
  return (
    <>
      <div
        className="pgf-row pgf-mono"
        style={{
          top: 430,
          fontSize: 88,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#fff",
          ...fx(t, { at: 41.5, dur: 0.5, blur: 6 }),
        }}
      >
        <span style={{ color: "#5c5c5c" }}>$&nbsp;</span>
        {typed(cmd, t, at, 18)}
        <span className="pgf-caret" style={{ opacity: blink(t, t < typingEnd(cmd, at, 18)) }} />
      </div>
      <div
        className="pgf-row"
        style={{
          top: 592,
          fontSize: 30,
          color: "#a1a1a1",
          letterSpacing: "-0.01em",
          ...fx(t, { at: 43.0 }),
        }}
      >
        provider-guard-demo.vercel.app
      </div>
      <div
        className="pgf-row pgf-mono"
        style={{
          top: 642,
          fontSize: 24,
          color: "#8f8f8f",
          ...fx(t, { at: 43.15 }),
        }}
      >
        github.com/syedali9210/provider-guard
      </div>
      <div
        className="pgf-row"
        style={{
          top: 990,
          fontSize: 18,
          color: "#5c5c5c",
          ...fx(t, { at: 43.7, blur: 4, dy: 10 }),
        }}
      >
        The empty answers are replayed from vercel/ai#20932 · Not affiliated with Vercel
      </div>
    </>
  );
}
