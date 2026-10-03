import type { ReactNode } from "react";
import { AppleLogo, MagnifyingGlass } from "@phosphor-icons/react";

export type DeviceId = "iphone" | "ipad" | "macbook";

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
}

// Geometry from Apple's published specs: 402x874pt @3x, 62pt display corners, 126x37pt island;
// 834x1210pt @2x with 18pt corners; 1512x982pt "looks like" with a 32pt menu-bar notch.
export const DEVICES: Device[] = [
  { id: "iphone", name: "iPhone 16 Pro", short: "iPhone", w: 402, h: 874, dpr: 3, hz: 120, chip: "A18 Pro · 6-core GPU", tflops: 2.3, rotates: true },
  { id: "ipad", name: "iPad Pro 11″", short: "iPad", w: 834, h: 1210, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: true },
  { id: "macbook", name: "MacBook Pro 14″", short: "MacBook", w: 1512, h: 950, dpr: 2, hz: 120, chip: "M4 · 10-core GPU", tflops: 4.3, rotates: false },
];

export const viewport = (d: Device, landscape: boolean) => (landscape && d.rotates ? { w: d.h, h: d.w } : { w: d.w, h: d.h });

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
export function frameSize(d: Device, landscape: boolean) {
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

export function DeviceFrame({ d, landscape, dark, children }: { d: Device; landscape: boolean; dark: boolean; children: ReactNode }) {
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
