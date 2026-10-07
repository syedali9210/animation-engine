import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AppleLogo, MagnifyingGlass } from "@phosphor-icons/react";

export type DeviceId = "iphone" | "duo" | "ipad" | "macbook";
/** Foldables only: cover screen, half open (the app keeps to one half, away from the crease), or the inner screen. */
export type Posture = "folded" | "half" | "open";

export interface Device {
  id: DeviceId;
  name: string;
  short: string;
  /** Web viewport in CSS px, portrait. */
  w: number;
  h: number;
  dpr: number;
  hz: number;
  chip: string;
  /** ≈ FP32 GPU throughput from public figures — the knob the GPU-load estimate scales by. */
  tflops: number;
  rotates: boolean;
  /** Foldables: the inner screen and, half open, the half the app keeps to (both natural, unrotated), in pt. */
  fold?: { inner: { w: number; h: number }; half: { w: number; h: number } };
}

// Geometry from Apple's published specs: 402x874pt @3x, 62pt display corners, 126x37pt island;
// 834x1210pt @2x with 18pt corners; 1512x982pt "looks like" with a 32pt menu-bar notch.
// iPhone Duo (Sept 2026): cover 1398x2034px @460ppi = 466x678pt @3x; inner 1878x2670px @430ppi, which App Store
// Connect sizes at 951x669pt (downsampled, so a point is the same physical size on both screens);
// body 117.8mm tall, 84.1mm wide folded, 164.6mm unfolded. Its GPU throughput is an estimate.
export const DEVICES: Device[] = [
  { id: "iphone", name: "iPhone 16 Pro", short: "iPhone", w: 402, h: 874, dpr: 3, hz: 120, chip: "A18 Pro · 6-core GPU", tflops: 2.3, rotates: true },
  {
    id: "duo",
    name: "iPhone Duo",
    short: "Duo",
    w: 466,
    h: 678,
    dpr: 3,
    hz: 120,
    chip: "A20 Pro · 7-core GPU",
    tflops: 2.9,
    rotates: true,
    fold: { inner: { w: 951, h: 669 }, half: { w: 465, h: 669 } },
  },
  { id: "ipad", name: "iPad Pro 11″", short: "iPad", w: 834, h: 1210, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: true },
  { id: "macbook", name: "MacBook Pro 14″", short: "MacBook", w: 1512, h: 950, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: false },
];

export function viewport(d: Device, landscape: boolean, posture: Posture = "open") {
  if (d.fold) {
    const v = posture === "open" ? d.fold.inner : posture === "half" ? d.fold.half : { w: d.w, h: d.h };
    return landscape ? { w: v.h, h: v.w } : { ...v };
  }
  return landscape && d.rotates ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

export const BREAKPOINTS = [
  ["2xl", 1536],
  ["xl", 1280],
  ["lg", 1024],
  ["md", 768],
  ["sm", 640],
] as const;
export const breakpoint = (w: number) => BREAKPOINTS.find(([, min]) => w >= min)?.[0] ?? "base";

/* ---------------- frames ---------------- */

const PHONE = { bezel: 15, ring: 4.5, radius: 62 };
const TABLET = { bezel: 44, ring: 4, radius: 18 };
const LAPTOP = { side: 25, top: 25, bottom: 34, menu: 32, base: 22, baseOver: 39 };

/** Outer box of the frame at 1:1, so the stage can fit-scale it. */
export function frameSize(d: Device, landscape: boolean, posture: Posture = "open") {
  if (d.fold) return duoFootprint(posture, landscape);
  const v = viewport(d, landscape);
  if (d.id === "iphone") return { w: v.w + PHONE.bezel * 2 + 8, h: v.h + PHONE.bezel * 2 + 8 };
  if (d.id === "ipad") return { w: v.w + TABLET.bezel * 2 + 6, h: v.h + TABLET.bezel * 2 + 6 };
  return { w: v.w + LAPTOP.side * 2 + LAPTOP.baseOver * 2, h: v.h + LAPTOP.menu + LAPTOP.top + LAPTOP.bottom + LAPTOP.base };
}

type Side = "left" | "right" | "top";
type Button = { side: Side; at: number; len: number };
// Side controls in portrait coordinates (pt from the top / left of the body).
const PHONE_BUTTONS: Button[] = [
  { side: "left", at: 196, len: 34 }, // Action button
  { side: "left", at: 268, len: 62 }, // volume up
  { side: "left", at: 348, len: 62 }, // volume down
  { side: "right", at: 300, len: 98 }, // side button
  { side: "right", at: 600, len: 50 }, // Camera Control
];
const TABLET_BUTTONS: Button[] = [
  { side: "top", at: 760, len: 62 }, // top button (from the left)
  { side: "right", at: 104, len: 52 }, // volume up
  { side: "right", at: 166, len: 52 }, // volume down
];

/** Portrait edge control -> CSS rect on a body of width bw, rotated 90° counter-clockwise when landscape. */
function buttonStyle(b: Button, bw: number, landscape: boolean, out: number) {
  const t = 4;
  if (!landscape) {
    if (b.side === "left") return { left: -out, top: b.at, width: t, height: b.len };
    if (b.side === "right") return { right: -out, top: b.at, width: t, height: b.len };
    return { top: -out, left: b.at, width: b.len, height: t };
  }
  // (x, y) -> (y, W - x): left edge -> bottom, right edge -> top, top edge -> left
  if (b.side === "left") return { bottom: -out, left: b.at, width: b.len, height: t };
  if (b.side === "right") return { top: -out, left: b.at, width: b.len, height: t };
  return { left: -out, top: bw - b.at - b.len, width: t, height: b.len };
}

// Black / Natural Titanium for the phone, Space Black / Silver aluminium for iPad and Mac.
const MATERIAL = {
  titanium: (dark: boolean) =>
    dark
      ? "linear-gradient(140deg,#56565b 0%,#232326 16%,#424247 40%,#1c1c1f 62%,#3d3d42 84%,#2a2a2e 100%)"
      : "linear-gradient(140deg,#efebe5 0%,#bdb8b0 18%,#f3efe9 42%,#aaa59d 64%,#dcd7d0 86%,#c2bdb5 100%)",
  aluminium: (dark: boolean) =>
    dark ? "linear-gradient(140deg,#444448 0%,#1e1e21 30%,#35353a 60%,#19191c 100%)" : "linear-gradient(140deg,#f4f5f7 0%,#c8cbd0 30%,#eef0f2 60%,#babdc3 100%)",
};

/* iOS status-bar glyphs */
const Signal = () => (
  <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
    <rect x="0" y="7" width="3" height="4" rx="1" />
    <rect x="4.67" y="4.67" width="3" height="6.33" rx="1" />
    <rect x="9.33" y="2.33" width="3" height="8.67" rx="1" />
    <rect x="14" y="0" width="3" height="11" rx="1" />
  </svg>
);
const WiFi = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={(size * 11) / 15} viewBox="0 0 15 11" fill="currentColor" aria-hidden>
    <path d="M7.5 2.2c2.1 0 4.06.82 5.52 2.22.13.12.33.12.45-.01l1.03-1.04a.32.32 0 0 0 0-.46A9.73 9.73 0 0 0 7.5.13 9.73 9.73 0 0 0 .5 2.91a.32.32 0 0 0 0 .46l1.03 1.04c.12.13.32.13.45.01A7.97 7.97 0 0 1 7.5 2.2Zm0 3.37c1.16 0 2.28.43 3.13 1.21.13.12.33.12.45-.01l1.03-1.04a.32.32 0 0 0 0-.46 6.46 6.46 0 0 0-9.22 0 .32.32 0 0 0 0 .46l1.03 1.04c.12.13.32.13.45.01a4.61 4.61 0 0 1 3.13-1.21Zm2.03 2.28a.31.31 0 0 0-.01-.46 3.13 3.13 0 0 0-4.04 0 .31.31 0 0 0-.01.46l1.8 1.81c.13.13.33.13.46 0l1.8-1.81Z" />
  </svg>
);
const Battery = ({ size = 27 }: { size?: number }) => (
  <svg width={size} height={(size * 13) / 27} viewBox="0 0 27 13" fill="currentColor" aria-hidden>
    <rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".35" />
    <rect x="2" y="2" width="20" height="9" rx="2.5" />
    <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4" />
  </svg>
);
const SF = { fontFamily: '"SF Pro Display", -apple-system, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif' };

/** iOS lets a screen pick light or dark system ink (UIStatusBarStyle); unasked, it follows the theme. */
export type ScreenInk = { top?: "light" | "dark"; bottom?: "light" | "dark" };
const inks = (dark: boolean, asked?: ScreenInk) => {
  const pick = (k: "top" | "bottom") => (asked?.[k] ?? (dark ? "light" : "dark")) === "light";
  return { top: pick("top") ? "text-white" : "text-black", home: pick("bottom") ? "bg-white/80" : "bg-black/80" };
};

export function DeviceFrame({
  d,
  landscape,
  dark,
  posture = "open",
  onPose,
  ink: asked,
  children,
}: {
  d: Device;
  landscape: boolean;
  dark: boolean;
  posture?: Posture;
  /** what the screen under them asked for: light or dark status bar (top) and home indicator (bottom) */
  ink?: ScreenInk;
  /** foldables: the pose the hinge is moving to, as it starts moving */
  onPose?: (p: { posture: Posture; landscape: boolean }) => void;
  children: ReactNode;
}) {
  if (d.fold)
    return (
      <DuoFrame d={d} landscape={landscape} posture={posture} dark={dark} onPose={onPose} ink={asked}>
        {children}
      </DuoFrame>
    );
  const v = viewport(d, landscape);
  const ink = dark ? "text-white" : "text-black";
  const bar = inks(dark, asked);
  const land = landscape && d.rotates;

  if (d.id === "macbook") {
    const L = LAPTOP;
    const lidW = v.w + L.side * 2;
    const lidH = v.h + L.menu + L.top + L.bottom;
    return (
      <div className="relative" style={{ width: lidW + L.baseOver * 2, height: lidH + L.base }}>
        {/* lid */}
        <div className="absolute" style={{ left: L.baseOver, top: 0, width: lidW, height: lidH, borderRadius: "22px 22px 8px 8px", background: MATERIAL.aluminium(dark), padding: 2.5, boxShadow: "0 0 0 0.5px rgb(0 0 0 / 0.14)" }}>
          <div className="h-full w-full bg-black" style={{ borderRadius: "19.5px 19.5px 6px 6px", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }} />
        </div>
        {/* screen: menu bar strip (with the notch) + web viewport */}
        <div className="absolute overflow-hidden bg-black" style={{ left: L.baseOver + L.side, top: L.top, width: v.w, height: v.h + L.menu, borderRadius: "10px 10px 3px 3px" }}>
          <div className={`flex items-center justify-between px-[18px] text-[13px] ${ink}`} style={{ ...SF, height: L.menu, background: dark ? "rgba(30,30,32,0.94)" : "rgba(242,242,244,0.94)" }}>
            <div className="flex items-center gap-[22px]">
              <AppleLogo size={15} weight="fill" />
              <b className="font-semibold">Safari</b>
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>History</span>
              <span>Window</span>
            </div>
            <div className="flex items-center gap-[18px]">
              <Battery size={24} />
              <WiFi size={15} />
              <MagnifyingGlass size={14} weight="bold" />
              <span>Fri 2 Oct&nbsp;&nbsp;9:41</span>
            </div>
          </div>
          <div className="relative" style={{ width: v.w, height: v.h }}>
            {children}
          </div>
          {/* notch: 190 x 32, flush with the top edge, camera inside */}
          <div className="absolute left-1/2 top-0 grid -translate-x-1/2 place-items-center bg-black" style={{ width: 190, height: L.menu, borderRadius: "0 0 10px 10px" }}>
            <span className="h-[7px] w-[7px] rounded-full bg-[#10151f] ring-1 ring-[#222c3b]" />
          </div>
        </div>
        {/* base: front lip with the thumb scoop */}
        <div
          className="absolute left-0"
          style={{
            top: lidH - 2,
            width: lidW + L.baseOver * 2,
            height: L.base,
            borderRadius: "2px 2px 20px 20px",
            background: dark ? "linear-gradient(#57575c,#2a2a2d 35%,#131315)" : "linear-gradient(#f4f5f7,#cfd2d6 40%,#9da1a7)",
            boxShadow: "var(--sh-device)",
          }}
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: 170, height: 7, borderRadius: "0 0 9px 9px", background: dark ? "#19191b" : "#b4b7bc" }} />
        </div>
      </div>
    );
  }

  const phone = d.id === "iphone";
  const S = phone ? PHONE : TABLET;
  const out = phone ? 4 : 3; // controls stick out of the band
  const bw = v.w + S.bezel * 2;
  const bh = v.h + S.bezel * 2;
  const material = phone ? MATERIAL.titanium(dark) : MATERIAL.aluminium(dark);
  const ear = (v.w - 126) / 2; // status-bar slots either side of the Dynamic Island
  return (
    <div className="relative" style={{ width: bw + out * 2, height: bh + out * 2 }}>
      <div className="absolute" style={{ left: out, top: out, width: bw, height: bh }}>
        {(phone ? PHONE_BUTTONS : TABLET_BUTTONS).map((b, i) => (
          <span key={i} className="absolute rounded-[2px]" style={{ ...buttonStyle(b, d.w + S.bezel * 2, land, out - 1), background: material }} />
        ))}
        <div className="absolute inset-0" style={{ borderRadius: S.radius + S.bezel, background: material, padding: S.ring, boxShadow: "var(--sh-device), inset 0 0 0 0.5px rgba(255,255,255,0.18)" }}>
          <div className="h-full w-full bg-black" style={{ borderRadius: S.radius + S.bezel - S.ring, boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.6)" }} />
        </div>
        <div className="absolute overflow-hidden bg-black" style={{ left: S.bezel, top: S.bezel, width: v.w, height: v.h, borderRadius: S.radius }}>
          {children}
          {phone && !land && (
            <div className={`pointer-events-none absolute inset-x-0 top-0 ${bar.top}`} style={{ height: 54, ...SF }}>
              <span className="absolute grid place-items-center text-[17px] font-semibold tracking-[-0.4px]" style={{ left: 0, top: 18, width: ear, height: 22 }}>
                9:41
              </span>
              <span className="absolute flex items-center justify-center gap-[6px]" style={{ right: 0, top: 18, width: ear, height: 22 }}>
                <Signal />
                <WiFi />
                <Battery />
              </span>
            </div>
          )}
          {!phone && (
            <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 text-[13px] font-semibold ${bar.top}`} style={{ height: 24, ...SF }}>
              <span>
                9:41 <span className="ml-1 font-medium">Fri 2 Oct</span>
              </span>
              <span className="flex items-center gap-[6px]">
                <WiFi size={14} />
                <span className="text-[12px]">100%</span>
                <Battery size={24} />
              </span>
            </div>
          )}
          {/* Dynamic Island: 126 x 37pt, 11pt from the top edge (left edge in landscape) */}
          {phone && <div className="pointer-events-none absolute rounded-full bg-black" style={land ? { left: 11, top: (v.h - 126) / 2, width: 37, height: 126 } : { top: 11, left: ear, width: 126, height: 37 }} />}
          <div className={`pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] -translate-x-1/2 rounded-full ${bar.home}`} style={{ width: phone ? 139 : 200 }} />
        </div>
        {/* iPad Pro M4: front camera on the landscape edge */}
        {!phone && (
          <span
            className="absolute h-[8px] w-[8px] rounded-full bg-[#10151f] ring-1 ring-[#222c3b]"
            style={land ? { left: "50%", top: S.bezel / 2 - 4, marginLeft: -4 } : { right: S.bezel / 2 - 4, top: "50%", marginTop: -4 }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- iPhone Duo: a book-style foldable, modelled in 3D ----------------
   Unrotated model (pt): hinge vertical at x = 497; A = right half (fixed, buttons on it), B = left half that
   swings shut over A. Each half is a 5.2 mm slab of titanium with glass on both faces.
   Shut, B's back is the cover screen. Open, A and B fronts are one inner screen; Apple's layout keeps the right
   half (A) identical to the cover screen, so that's where the app lives while the device moves:
     opening  — the cover turns off, B swings away and reveals the app already on A's half, then the app widens
                across the whole screen;
     closing  — the app narrows onto A's half, B swings over it and the magnets snap it shut, then the app is
                on the cover screen, in the same place;
     half     — the app stays on A's half, away from the crease (book stance, or stand when rotated).
   The live screen never moves in the DOM, so the animation keeps running and genuinely resizes. */

const DUO = {
  pw: 497,
  ph: 711,
  t: 31, // each half is 5.2 mm thick
  gap: 5, // 0.9 mm between the inner screens when shut
  r: 56, // outer corners
  spine: 24, // hinge-side corners once shut, where the hinge cover rounds them
  cover: { x: 18, y: 16.5, w: 466, h: 678, r: 46 }, // on the shut stack, hinge side on the left
  inner: { x: 21.5, y: 21, w: 951, h: 669, r: 40 },
  fold: 10, // half the crease band the half-open screen keeps clear of
  camera: { x: 444, y: 72, d: 12 }, // cover screen coords: punch hole under the status circle
  udc: { x: 929, y: 72, d: 11 }, // inner screen coords: under the display, same column
};
export const DUO_MOVE = 620; // ms the hinge takes
const GROW = 380; // the app resizing onto / off the second half
const CLOSE = 470; // a hand closes it most of the way…
const SNAP = 130; // …and the magnets take the last few degrees
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
// the rounded corners of the metal band, filled by stacked slices; the straight runs are solid faces
const SLICES = Array.from({ length: 15 }, (_, i) => -DUO.t / 2 + 1 + (i * (DUO.t - 2)) / 14);

type Screen = "cover" | "half" | "full";
const SCREEN_OF: Record<Posture, Screen> = { folded: "cover", half: "half", open: "full" };
const THETA: Record<Posture, number> = { folded: 180, half: 70, open: 0 }; // B's swing: 180 shut over A, 0 flat

export function duoFootprint(posture: Posture, landscape: boolean) {
  if (posture === "half") return landscape ? { w: 900, h: 760 } : { w: 1000, h: 840 }; // the near page looms larger
  const w = posture === "folded" ? DUO.pw : DUO.pw * 2;
  return landscape ? { w: DUO.ph, h: w } : { w, h: DUO.ph };
}

/** Where the camera stands. One function list everywhere, so the browser interpolates each part, not a matrix. */
function duoPose(p: Posture, land: boolean) {
  const fp = duoFootprint(p, land);
  let tx = (fp.w - DUO.pw * 2) / 2;
  let ty = (fp.h - DUO.ph) / 2;
  let rx = 0;
  let ry = 0;
  // pitch is negative to look down on it. Stand: a 110° hinge seen from ~25° above is the screen half nearly face-on
  // with the base laid towards you, so the model needs only a few degrees of pitch
  if (p === "half" && !land) [tx, ty, rx, ry] = [tx - 24, ty - 6, -14, -24]; // book, standing on its edges: right page turned to you
  if (p === "half" && land) [tx, ty, rx, ry] = [tx, ty + 120, -6, -14]; // stand: hinge low, screen half up, base on the table towards you
  return `translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${land ? -90 : 0}deg) translateX(${p === "folded" ? -DUO.pw / 2 : 0}px)`;
}

/** Where the live screen sits in the model, and how far forward. */
function duoScreen(s: Screen) {
  const { pw, t, gap, cover, inner, fold } = DUO;
  if (s === "cover") return { x: pw + cover.x, y: cover.y, w: cover.w, h: cover.h, z: 1.5 * t + gap + 0.6 };
  if (s === "half") return { x: pw + fold, y: inner.y, w: inner.x + inner.w - pw - fold, h: inner.h, z: t / 2 + 0.6 };
  return { x: inner.x, y: inner.y, w: inner.w, h: inner.h, z: t / 2 + 0.6 };
}

// Night Sky / Star White, mirror-polished: a polished edge is bright in the middle and dark at the rims
const DUO_TONE = (dark: boolean) => (dark ? { rim: [30, 35, 50], shine: [150, 160, 184], back: "#1b2130" } : { rim: [176, 170, 160], shine: [252, 250, 246], back: "#e9e5de" });
const band = (dark: boolean, i: number) => {
  const { rim, shine } = DUO_TONE(dark);
  const k = 1 - Math.abs((2 * i) / (SLICES.length - 1) - 1) ** 1.6;
  return `rgb(${rim.map((c, j) => Math.round(c + (shine[j] - c) * k)).join(",")})`;
};
const GLASS = "linear-gradient(118deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 36%), #050507";

/** The status bar iOS 27 gives iPhone Duo: one circle in the corner — battery around it, signal as dots, Wi-Fi in the middle. */
function StatusCircle() {
  const r = 11;
  const c = 2 * Math.PI * r;
  const span = 0.75 * c; // the battery's three quarters of the ring
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r={r} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.2" strokeDasharray={`${span} ${c}`} transform="rotate(-90 13 13)" />
      <circle cx="13" cy="13" r={r} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={`${span * 0.78} ${c}`} transform="rotate(-90 13 13)" />
      {[0, 1, 2, 3].map((i) => {
        const a = ((200 + i * 20) * Math.PI) / 180; // the last quarter, eight o'clock to eleven
        return <circle key={i} cx={13 + r * Math.cos(a)} cy={13 + r * Math.sin(a)} r="1.35" fill="currentColor" opacity={i < 3 ? 1 : 0.3} />;
      })}
      <path d="M13 16.6l1.5-1.5a2.1 2.1 0 0 0-3 0Zm-2.6-2.6.8.8a2.6 2.6 0 0 1 3.6 0l.8-.8a3.7 3.7 0 0 0-5.2 0Zm-1.6-1.6.8.8a4.9 4.9 0 0 1 6.8 0l.8-.8a6 6 0 0 0-8.4 0Z" fill="currentColor" />
    </svg>
  );
}

function DuoFrame({ d, landscape, posture, dark, onPose, ink: asked, children }: { d: Device; landscape: boolean; posture: Posture; dark: boolean; onPose?: (p: { posture: Posture; landscape: boolean }) => void; ink?: ScreenInk; children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>(SCREEN_OF[posture]);
  const [theta, setTheta] = useState(THETA[posture]);
  const [pose, setPose] = useState({ posture, landscape }); // where the camera is, and which way the device is turned
  const [move, setMove] = useState(`${DUO_MOVE}ms ${EASE}`); // how B and the camera are moving right now
  const [grow, setGrow] = useState(false); // the screen's box is animating between half and full width
  const [on, setOn] = useState(true); // the screen fades only while the device turns on its side
  const now = useRef({ screen, theta, pose });
  now.current = { screen, theta, pose };
  const report = useRef(onPose);
  report.current = onPose;

  useEffect(() => {
    const goal = SCREEN_OF[posture];
    const from = { ...now.current, landscape: now.current.pose.landscape };
    // already there (first render, or a change that undid itself): just say where we are
    if (from.pose.posture === posture && from.landscape === landscape && from.screen === goal && from.theta === THETA[posture]) {
      report.current?.({ posture, landscape });
      return;
    }
    const steps: [number, () => void][] = [];
    const aim = (ms: number, ease: string, angle: number) => () => {
      setMove(`${ms}ms ${ease}`);
      setTheta(angle);
      setPose({ posture, landscape });
      report.current?.({ posture, landscape });
    };
    if (from.landscape !== landscape) {
      // turning it on its side: the screen fades, the device turns, iOS lays the app out again
      steps.push([0, () => setOn(false)], [140, () => (setScreen(goal), aim(DUO_MOVE, EASE, THETA[posture])())], [DUO_MOVE, () => setOn(true)]);
    } else {
      // off the screen we're leaving: the app narrows onto A's half, or the cover turns off
      if (from.screen === "full" && goal !== "full") steps.push([0, () => (setGrow(true), setScreen("half"))], [GROW, () => setGrow(false)]);
      else if (from.screen === "cover" && goal !== "cover") steps.push([0, () => setScreen("half")]);
      // the hinge, with the camera
      if (posture === "folded") steps.push([0, aim(CLOSE, "cubic-bezier(0.3, 0.6, 0.4, 1)", 164)], [CLOSE, aim(SNAP, "cubic-bezier(0.6, 0, 1, 0.5)", 180)], [SNAP, () => setScreen("cover")]);
      else steps.push([0, aim(DUO_MOVE, EASE, THETA[posture])]);
      // onto the screen we're arriving at: once flat, the app widens across both halves
      if (goal === "full" && from.screen !== "full") steps.push([DUO_MOVE, () => (setGrow(true), setScreen("full"))], [GROW, () => setGrow(false)]);
    }
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let at = 0;
    const timers = steps.map(([dt, fn]) => window.setTimeout(fn, (at += still ? 0 : dt)));
    return () => timers.forEach(clearTimeout);
  }, [posture, landscape]);

  const { pw, ph, t, gap, r } = DUO;
  const fp = duoFootprint(pose.posture, pose.landscape);
  const half = pose.posture === "half";
  const shut = pose.posture === "folded";
  const hinge = shut ? DUO.spine : 0;
  const screenBg = dark ? "#09090b" : "#fafafa";
  const turned = pose.landscape;
  const s = duoScreen(screen);
  const v = turned ? { w: s.h, h: s.w } : { w: s.w, h: s.h };
  const R = DUO.inner.r;
  const corners = screen === "cover" ? `${DUO.cover.r}px` : screen === "full" ? `${R}px` : turned ? `${R}px ${R}px 0 0` : `0 ${R}px ${R}px 0`;
  const bar = inks(dark, asked);
  const swing = `transform ${move}`;
  const shade = `opacity ${move}`;
  const radius = (a: string) => ({ borderRadius: a, transition: `border-radius ${move}` });
  const aR = `${hinge}px ${r}px ${r}px ${hinge}px`; // A: outer corners right
  const bR = `${r}px ${hinge}px ${hinge}px ${r}px`; // B: outer corners left
  const bBackR = `${hinge}px ${r}px ${r}px ${hinge}px`; // B's back is mirrored

  // one half: an extruded slab — slices give the rounded corners their thickness, solid faces the straight runs
  const metal = (dir: string) => `linear-gradient(${dir}, ${band(dark, 0)}, ${band(dark, 7)} 50%, ${band(dark, 14)})`;
  const edge = (style: CSSProperties, rot: string, dir: string) => (
    <div className="absolute" style={{ ...style, background: metal(dir), transform: rot, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transition: `all ${move}` }} />
  );
  const slab = (rad: string, side: "A" | "B") => {
    const [left, right] = side === "A" ? [hinge, r] : [r, hinge]; // corner radius at each end
    const outer = side === "A" ? pw - t / 2 : -t / 2;
    const inside = side === "A" ? -t / 2 : pw - t / 2;
    return (
      <>
        {SLICES.map((z, i) => (
          <div key={i} className="absolute inset-0" style={{ ...radius(rad), background: band(dark, i), transform: `translateZ(${z}px)` }} />
        ))}
        {edge({ left, width: pw - left - right, top: -t / 2, height: t }, "rotateX(90deg)", "to bottom")}
        {edge({ left, width: pw - left - right, top: ph - t / 2, height: t }, "rotateX(-90deg)", "to bottom")}
        {edge({ left: outer, width: t, top: r, height: ph - 2 * r }, `rotateY(${side === "A" ? 90 : -90}deg)`, "to right")}
        {edge({ left: inside, width: t, top: hinge, height: ph - 2 * hinge }, `rotateY(${side === "A" ? -90 : 90}deg)`, "to right")}
      </>
    );
  };
  // glass sits a hair inside the metal, so a thin polished rim shows from the front; none along the hinge, where
  // the two screens meet
  const glass = (rad: string, z: number, back = false, children?: ReactNode, hingeSide?: "left" | "right") => (
    <div
      className="absolute overflow-hidden"
      style={{
        inset: `2.5px ${hingeSide === "right" ? 0 : 2.5}px 2.5px ${hingeSide === "left" ? 0 : 2.5}px`,
        ...radius(rad),
        background: GLASS,
        transform: `${back ? "rotateY(180deg) " : ""}translateZ(${z}px)`,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="relative" style={{ width: fp.w, height: fp.h, perspective: 2600 }}>
      {/* contact shadow on the table, for the half-open stances */}
      <div
        aria-hidden
        className="absolute rounded-[50%]"
        style={{
          left: "8%",
          right: "8%",
          bottom: pose.landscape ? "2%" : "5%",
          height: pose.landscape ? "22%" : "9%",
          background: `radial-gradient(closest-side, rgba(10,12,20,${dark ? 0.7 : 0.32}), rgba(10,12,20,${dark ? 0.25 : 0.1}) 60%, transparent)`,
          filter: "blur(8px)",
          opacity: half ? 1 : 0,
          transition: `opacity ${move}`,
        }}
      />
      <div className="absolute left-0 top-0" style={{ width: pw * 2, height: ph, transformStyle: "preserve-3d", transform: duoPose(pose.posture, pose.landscape), transition: swing }}>
        {/* A: right half, fixed — Touch ID and Camera Control on its right edge, volume on top */}
        <div className="absolute" style={{ left: pw, top: 0, width: pw, height: ph, transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0" style={{ ...radius(aR), boxShadow: "var(--sh-device)", transform: `translateZ(${-t / 2 - 1}px)`, opacity: half ? 0 : 1, transition: shade }} />
          {slab(aR, "A")}
          {[
            { right: -2, top: 140, width: 4, height: 76 },
            { right: -1.5, top: 420, width: 3.5, height: 52 },
            { left: 250, top: -2, width: 56, height: 4 },
            { left: 318, top: -2, width: 56, height: 4 },
          ].flatMap((b, i) =>
            [-7, 0, 7].map((z) => <span key={`${i}${z}`} className="absolute rounded-[2px]" style={{ ...b, background: band(dark, 5), transform: `translateZ(${z}px)` }} />),
          )}
          {glass(
            aR,
            t / 2,
            false,
            <span className="absolute" style={{ left: 0, top: DUO.inner.y - 1.5, right: DUO.inner.x - 1.5, bottom: DUO.inner.y - 1.5, background: screenBg, borderRadius: `0 ${R}px ${R}px 0` }}>
              <span className="absolute rounded-full bg-white" style={{ left: DUO.inner.x + DUO.udc.x - pw - DUO.udc.d / 2, top: DUO.udc.y - DUO.udc.d / 2, width: DUO.udc.d, height: DUO.udc.d, opacity: 0.06 }} />
            </span>,
            "left",
          )}
        </div>

        {/* B: left half, hinged at A's screen surface so the two screens close face to face */}
        <div
          className="absolute left-0 top-0"
          style={{ width: pw, height: ph, transformStyle: "preserve-3d", transformOrigin: `100% 50% ${t / 2 + gap / 2}px`, transform: `rotateY(${theta}deg)`, transition: swing }}
        >
          <div className="absolute inset-0" style={{ ...radius(bR), boxShadow: "var(--sh-device)", transform: `translateZ(${-t / 2 - 1}px)`, opacity: theta < 90 && !half ? 1 : 0, transition: shade }} />
          {slab(bR, "B")}
          {glass(
            bR,
            t / 2,
            false,
            <>
              {/* the inner screen's left half stays lit: on the way open, and beside the app when half open */}
              <span
                className="absolute"
                style={{
                  left: DUO.inner.x - 1.5,
                  top: DUO.inner.y - 1.5,
                  right: 0,
                  bottom: DUO.inner.y - 1.5,
                  borderRadius: `${R}px 0 0 ${R}px`,
                  background: `linear-gradient(to left, rgba(0,0,0,${dark ? 0.45 : 0.12}), transparent 14%), linear-gradient(160deg, rgba(255,255,255,${dark ? 0.04 : 0.5}), transparent 55%), ${screenBg}`,
                }}
              />
              <span className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: (Math.min(theta, 90) / 90) * (dark ? 0.3 : 0.14), transition: shade }} />
            </>,
            "right",
          )}
          {glass(
            bBackR,
            t / 2,
            true,
            <>
              {/* the cover screen, off unless the app is on it, and its punch-hole camera */}
              <span className="absolute bg-[#08080a]" style={{ left: DUO.cover.x - 1.5, top: DUO.cover.y - 1.5, width: DUO.cover.w, height: DUO.cover.h, borderRadius: DUO.cover.r }} />
              <span
                className="absolute rounded-full bg-black shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.08)]"
                style={{ left: DUO.cover.x + DUO.camera.x - DUO.camera.d / 2 - 1.5, top: DUO.cover.y + DUO.camera.y - DUO.camera.d / 2 - 1.5, width: DUO.camera.d, height: DUO.camera.d }}
              />
              <span className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: (Math.min(180 - theta, 90) / 90) * 0.55, transition: shade }} />
            </>,
          )}
        </div>

        {/* behind the seam where the two glass halves meet, so open it reads as one sheet of glass, not a metal line */}
        <span
          aria-hidden
          className="pointer-events-none absolute bg-[#050507]"
          style={{ left: pw - 3, top: 2.5, width: 6, height: ph - 5, transform: `translateZ(${t / 2 - 0.4}px)`, opacity: theta === 0 ? 1 : 0, transition: shade }}
        />

        {/* the live screen */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: s.x + s.w / 2 - v.w / 2,
            top: s.y + s.h / 2 - v.h / 2,
            width: v.w,
            height: v.h,
            borderRadius: corners,
            background: screenBg,
            transform: `translateZ(${s.z}px) rotate(${turned ? 90 : 0}deg)`,
            opacity: on ? 1 : 0,
            transition: [`opacity 200ms ${on ? "cubic-bezier(0.23, 1, 0.32, 1)" : "ease"}`, ...(grow ? ["left", "top", "width", "height"].map((k) => `${k} ${GROW}ms ${EASE}`) : [])].join(", "),
            pointerEvents: on ? undefined : "none",
          }}
        >
          {children}
          {/* iOS 27 on iPhone Duo: the status circle tucked into the top-right corner, the time under it */}
          <div className={`pointer-events-none absolute right-[9px] top-[9px] flex w-[26px] flex-col items-center gap-[3px] ${bar.top}`} style={SF}>
            <StatusCircle />
            <span className="text-[11px] font-semibold leading-none tracking-[-0.2px]">9:41</span>
          </div>
          {!(turned && screen === "half") && (
            <div className={`pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] -translate-x-1/2 rounded-full ${bar.home}`} style={{ width: v.w < 560 ? 124 : 180 }} />
          )}
        </div>

        {/* hardware in front of the live screen: the cover camera, the inner camera, the crease */}
        <span
          className="pointer-events-none absolute rounded-full bg-black shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.08)]"
          style={{
            left: pw + DUO.cover.x + DUO.camera.x - DUO.camera.d / 2,
            top: DUO.cover.y + DUO.camera.y - DUO.camera.d / 2,
            width: DUO.camera.d,
            height: DUO.camera.d,
            transform: `translateZ(${duoScreen("cover").z + 0.5}px)`,
            opacity: screen === "cover" && on ? 1 : 0,
          }}
        />
        <span
          className="pointer-events-none absolute rounded-full bg-white"
          style={{
            left: DUO.inner.x + DUO.udc.x - DUO.udc.d / 2,
            top: DUO.inner.y + DUO.udc.y - DUO.udc.d / 2,
            width: DUO.udc.d,
            height: DUO.udc.d,
            transform: `translateZ(${t / 2 + 1.2}px)`,
            opacity: screen !== "cover" && on ? 0.06 : 0,
          }}
        />
        <span
          className="pointer-events-none absolute"
          style={{
            left: pw - 16,
            top: DUO.inner.y,
            width: 32,
            height: DUO.inner.h,
            transform: `translateZ(${t / 2 + 1.2}px)`,
            // the nano-texture all but hides the fold: a faint dip in the light, no line
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.035) 38%, rgba(0,0,0,0.045) 50%, rgba(255,255,255,0.035) 62%, transparent)",
            opacity: screen === "full" && !grow && on ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />
      </div>
    </div>
  );
}
