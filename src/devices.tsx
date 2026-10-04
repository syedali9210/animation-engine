import { useEffect, useState, type ReactNode } from "react";
import { AppleLogo, MagnifyingGlass } from "@phosphor-icons/react";

export type DeviceId = "iphone" | "duo" | "ipad" | "macbook";
/** Foldables only: cover screen, stand (content pinned to the top half), or the inner screen. */
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
  /** Foldables: the inner screen (natural, unrotated) and the half-folded top-half viewport, in pt. */
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
    fold: { inner: { w: 951, h: 669 }, half: { w: 669, h: 465 } },
  },
  { id: "ipad", name: "iPad Pro 11″", short: "iPad", w: 834, h: 1210, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: true },
  { id: "macbook", name: "MacBook Pro 14″", short: "MacBook", w: 1512, h: 950, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: false },
];

export function viewport(d: Device, landscape: boolean, posture: Posture = "open") {
  if (d.fold) {
    if (posture === "half") return { ...d.fold.half }; // the stand posture has one orientation
    const v = posture === "open" ? d.fold.inner : { w: d.w, h: d.h };
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

export function DeviceFrame({ d, landscape, dark, posture = "open", children }: { d: Device; landscape: boolean; dark: boolean; posture?: Posture; children: ReactNode }) {
  if (d.fold)
    return (
      <DuoFrame d={d} landscape={landscape} posture={posture} dark={dark}>
        {children}
      </DuoFrame>
    );
  const v = viewport(d, landscape);
  const ink = dark ? "text-white" : "text-black";
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
            <div className={`pointer-events-none absolute inset-x-0 top-0 ${ink}`} style={{ height: 54, ...SF }}>
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
            <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 text-[13px] font-semibold ${ink}`} style={{ height: 24, ...SF }}>
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
          <div className={`pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] -translate-x-1/2 rounded-full ${dark ? "bg-white/80" : "bg-black/80"}`} style={{ width: phone ? 139 : 200 }} />
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
   swings shut over A. Shut, B's back is the cover screen; open, the A and B fronts are the inner screen.
   The live screen (children) never moves in the DOM, so the animation keeps running across a fold:
   it fades out, its viewport changes while the hinge swings, and it fades back in at the new size,
   the way iOS hands an app from one screen to the other. */

const DUO = {
  pw: 497,
  ph: 711,
  r: 56,
  ring: 3.5,
  cover: { x: 18, y: 16.5, w: 466, h: 678, r: 46 }, // on the shut stack, hinge side on the left
  inner: { x: 21.5, y: 21, w: 951, h: 669, r: 40 },
  fold: 10, // half the crease band the half-folded viewport leaves out
  island: { x: 939, y: 30.5, w: 30, h: 58 }, // cover screen: vertical, top right
  camera: { x: 882, y: 81, d: 11 }, // inner screen: under the display, upper right
};
export const DUO_MOVE = 620; // ms the hinge takes

export function duoFootprint(posture: Posture, landscape: boolean) {
  if (posture === "half") return { w: 920, h: 660 }; // the base reaches towards you, so it's wider than the screen half
  const w = posture === "folded" ? DUO.pw : DUO.pw * 2;
  return landscape ? { w: DUO.ph, h: w } : { w, h: DUO.ph };
}

/** Where the live screen sits in the unrotated model. */
function duoRect(p: Posture) {
  const { pw, cover, inner, fold } = DUO;
  if (p === "folded") return { x: pw + cover.x, y: cover.y, w: cover.w, h: cover.h };
  if (p === "half") return { x: pw + fold, y: inner.y, w: inner.x + inner.w - pw - fold, h: inner.h };
  return { x: inner.x, y: inner.y, w: inner.w, h: inner.h };
}

// Night Sky / Star White titanium
const DUO_MATERIAL = (dark: boolean) =>
  dark
    ? "linear-gradient(140deg,#4a5368 0%,#1f2536 22%,#3a4256 48%,#191e2c 72%,#363e52 100%)"
    : "linear-gradient(140deg,#f6f4f0 0%,#d9d4cc 22%,#f1eee9 48%,#c9c3ba 72%,#e4e0d9 100%)";
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const GLASS = "linear-gradient(118deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%), #050507";

/** One side of a half: titanium band (none along the hinge, where the two halves meet) around black glass. */
function Face({ radius, material, shade, back, hinge, children }: { radius: string; material: string; shade: number; back?: boolean; hinge?: "left" | "right"; children?: ReactNode }) {
  const { ring } = DUO;
  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: radius,
        background: material,
        padding: `${ring}px ${hinge === "right" ? 0 : ring}px ${ring}px ${hinge === "left" ? 0 : ring}px`,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        transition: `border-radius ${DUO_MOVE}ms ${EASE}`,
      }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: radius, background: GLASS, transition: `border-radius ${DUO_MOVE}ms ${EASE}` }}>
        {children}
      </div>
      {/* the half that turns away from the light gets darker */}
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ borderRadius: radius, opacity: shade, transition: `opacity ${DUO_MOVE}ms ${EASE}` }} />
    </div>
  );
}

const DUO_BUTTONS = [
  { right: -3, top: 140, width: 4.5, height: 76 }, // Touch ID side button
  { right: -2.5, top: 420, width: 4, height: 52, opacity: 0.8 }, // Camera Control
  { left: 250, top: -3, width: 56, height: 4.5 }, // volume up
  { left: 318, top: -3, width: 56, height: 4.5 }, // volume down
];

function DuoFrame({ d, landscape, posture, dark, children }: { d: Device; landscape: boolean; posture: Posture; dark: boolean; children: ReactNode }) {
  // the screen shows the posture it has settled in, and hides while the hinge moves
  const target = `${posture}|${landscape}`;
  const [shown, setShown] = useState(target);
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (shown === target) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setOn(false);
    const swap = setTimeout(() => setShown(target), still ? 0 : 140);
    const back = setTimeout(() => setOn(true), still ? 0 : DUO_MOVE + 60);
    return () => {
      clearTimeout(swap);
      clearTimeout(back);
    };
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sp, sl] = shown.split("|") as [Posture, string];
  const shownLand = sl === "true";
  const { pw, ph } = DUO;
  const fp = duoFootprint(posture, landscape);
  const half = posture === "half";
  const theta = posture === "folded" ? 180 : half ? 70 : 0; // B's swing: 180 shut over A, 0 flat
  const move = `transform ${DUO_MOVE}ms ${EASE}`;
  // one function list in every posture, so the browser interpolates each part instead of a matrix
  // half open: the hinge sits low, the screen half stands above it and the base comes towards you
  const root = `translate(${(fp.w - pw * 2) / 2}px, ${half ? 492 - ph / 2 : (fp.h - ph) / 2}px) rotateX(${half ? 14 : 0}deg) rotateZ(${half || landscape ? -90 : 0}deg) translateX(${posture === "folded" ? -pw / 2 : 0}px)`;

  const material = DUO_MATERIAL(dark);
  const spine = posture === "folded" ? 26 : 0;
  const aRadius = `${spine}px ${DUO.r}px ${DUO.r}px ${spine}px`;
  const ink = dark ? "text-white" : "text-black";
  const r = duoRect(sp);
  const v = viewport(d, shownLand, sp);
  const turned = sp === "half" || shownLand; // the model is rotated, so the screen turns back upright
  const screenRadius = sp === "folded" ? DUO.cover.r : sp === "half" ? `${DUO.inner.r}px ${DUO.inner.r}px 0 0` : DUO.inner.r;
  const bar = sp !== "folded" || !shownLand; // phones hide the status bar in landscape
  const fade = `opacity 200ms ${on ? "cubic-bezier(0.23, 1, 0.32, 1)" : "ease"}`;

  return (
    <div className="relative" style={{ width: fp.w, height: fp.h, perspective: 2400 }}>
      <div className="absolute left-0 top-0" style={{ width: pw * 2, height: ph, transformStyle: "preserve-3d", transform: root, transition: move }}>
        {/* A: right half, fixed — Touch ID and Camera Control on its right edge, volume on top */}
        <div className="absolute" style={{ left: pw, top: 0, width: pw, height: ph, transformStyle: "preserve-3d" }}>
          {DUO_BUTTONS.map((b, i) => (
            <span key={i} className="absolute rounded-[2px]" style={{ ...b, background: material }} />
          ))}
          <div className="absolute inset-0" style={{ borderRadius: aRadius, boxShadow: "var(--sh-device)", transition: `border-radius ${DUO_MOVE}ms ${EASE}` }} />
          <Face radius={aRadius} material={material} shade={0} hinge="left">
            <span className="absolute rounded-full bg-white" style={{ left: DUO.camera.x - pw - DUO.ring, top: DUO.camera.y - DUO.ring, width: DUO.camera.d, height: DUO.camera.d, opacity: 0.06 }} />
          </Face>
        </div>
        {/* B: left half, hinged on its right edge; its back is the cover screen */}
        <div
          className="absolute left-0 top-0"
          style={{ width: pw, height: ph, transformOrigin: "100% 50%", transformStyle: "preserve-3d", transform: `rotateY(${theta}deg) translateZ(-1px)`, transition: move }}
        >
          <Face radius={`${DUO.r}px 0 0 ${DUO.r}px`} material={material} shade={(Math.min(theta, 90) / 90) * 0.35} hinge="right" />
          <Face radius={`26px ${DUO.r}px ${DUO.r}px 26px`} material={material} shade={(Math.min(180 - theta, 90) / 90) * 0.5} back>
            {/* hinge spine, then the cover screen and its camera */}
            <span className="absolute inset-y-0 left-0 w-[7px]" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.4), rgba(255,255,255,0.14), rgba(0,0,0,0.25))" }} />
            <span className="absolute bg-[#08080a]" style={{ left: DUO.cover.x - DUO.ring, top: DUO.cover.y - DUO.ring, width: DUO.cover.w, height: DUO.cover.h, borderRadius: DUO.cover.r }} />
            <span className="absolute rounded-full bg-black" style={{ left: DUO.island.x - pw - DUO.ring, top: DUO.island.y - DUO.ring, width: DUO.island.w, height: DUO.island.h }} />
          </Face>
        </div>

        {/* the live screen */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: r.x + r.w / 2 - v.w / 2,
            top: r.y + r.h / 2 - v.h / 2,
            width: v.w,
            height: v.h,
            borderRadius: screenRadius,
            transform: `translateZ(3px) rotate(${turned ? 90 : 0}deg)`,
            opacity: on ? 1 : 0,
            transition: fade,
            pointerEvents: on ? undefined : "none",
          }}
        >
          {children}
          {bar && (
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between text-[15px] font-semibold ${ink}`}
              style={{ height: 34, paddingLeft: 24, paddingRight: sp === "folded" ? 70 : 24, ...SF }}
            >
              <span>9:41</span>
              <span className="flex items-center gap-[6px]">
                <Signal />
                <WiFi />
                <Battery />
              </span>
            </div>
          )}
          {sp !== "half" && (
            <div
              className={`pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] -translate-x-1/2 rounded-full ${dark ? "bg-white/80" : "bg-black/80"}`}
              style={{ width: sp === "folded" && !shownLand ? 124 : 180 }}
            />
          )}
        </div>

        {/* hardware over the live screen: the cover camera, the inner camera, the crease */}
        <span
          className="pointer-events-none absolute rounded-full bg-black"
          style={{ left: DUO.island.x, top: DUO.island.y, width: DUO.island.w, height: DUO.island.h, transform: "translateZ(4px)", opacity: on && sp === "folded" ? 1 : 0, transition: fade }}
        />
        <span
          className="pointer-events-none absolute rounded-full bg-white"
          style={{ left: DUO.camera.x, top: DUO.camera.y, width: DUO.camera.d, height: DUO.camera.d, transform: "translateZ(4px)", opacity: on && sp !== "folded" ? 0.06 : 0, transition: fade }}
        />
        <span
          className="pointer-events-none absolute"
          style={{
            left: pw - 7,
            top: DUO.inner.y,
            width: 14,
            height: DUO.inner.h,
            transform: "translateZ(4px)",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 35%, rgba(0,0,0,0.14) 50%, rgba(255,255,255,0.05) 65%, transparent)",
            opacity: on && sp === "open" ? 1 : 0,
            transition: fade,
          }}
        />
      </div>
    </div>
  );
}
