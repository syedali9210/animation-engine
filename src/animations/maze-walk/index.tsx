import { useEffect, useRef } from "react";
import { params as defaults, type Params } from "./params";

/**
 * Ported from the standalone "pet buddy hero" reference (index.html): an
 * isometric maze walkway with a pet that walks back and forth along its
 * centerline (bouncing + pausing at each end), a cursor-following spotlight
 * that reveals a glowing orange copy of the path edges, and depth-based
 * scaling so the pet reads bigger/nearer at the bottom of the frame. All
 * geometry/animation math is a direct port of the reference's vanilla JS —
 * kept close to the original for fidelity, adapted to refs + rAF instead of
 * getElementById + a global IIFE. The walkway surface/stroke are theme
 * tokens (matching Hero's dock/screenshot card color) so it adapts in light
 * mode; the pet's own body colors stay fixed — it's the same character
 * regardless of theme, same as the terracotta accent used elsewhere.
 */

const PET_OUTLINE = "#ffffff";
const PET_EYE = "#141414";
const BG = "var(--pbh-surface)";
const STROKE = "var(--pbh-stroke)";

const MAIN: [number, number][] = [
  [212.082, 228.432], [359.917, 143.079], [507.753, 228.432], [573.871, 190.258],
  [469.865, 130.21], [507.753, 108.336], [647.418, 27.7021], [685.304, 49.5762],
  [787.083, 108.335], [871.773, 59.4395], [909.661, 81.314], [787.083, 152.084],
  [647.42, 71.4502], [545.643, 130.211], [649.647, 190.258], [507.753, 272.181],
  [359.917, 186.828], [249.969, 250.306], [431.236, 354.96], [393.348, 376.835],
  [174.193, 250.306], [212.081, 228.431],
];
const STRIP: [number, number][] = [
  [393.347, 376.837], [308.657, 425.733], [270.769, 403.859], [355.459, 354.963],
];
const DEPTH = 12;

const TOP_PATH_D =
  "M212.082 228.432L359.917 143.079L507.753 228.432L573.871 190.258L469.865 130.21L507.753 108.336L507.755 108.337L647.418 27.7021L685.304 49.5762L685.306 49.5747L787.083 108.335L871.773 59.4395L909.661 81.314L787.083 152.084L647.42 71.4502L545.643 130.211L649.647 190.258L507.753 272.181L359.917 186.828L249.969 250.306L431.236 354.96L393.348 376.835L174.193 250.306L212.081 228.431L212.082 228.432ZM393.347 376.837L308.657 425.733L270.769 403.859L355.459 354.963L393.347 376.837Z";

// Walkway centerline — every segment is a true 30-degree isometric direction.
const WPTS: [number, number][] = [
  [289.71, 414.8], [393.34, 354.96], [212.08, 250.31], [359.92, 164.95],
  [507.75, 250.32], [611.77, 190.26], [507.75, 130.19], [647.42, 49.57],
  [787.08, 130.22], [890.72, 70.38],
];

function inPoly(p: [number, number], poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inUnion = (p: [number, number]) => inPoly(p, MAIN) || inPoly(p, STRIP);

export default function MazeWalk({ p = defaults }: { p?: Params }) {
  const PET_BODY = p.body, PET_HI = p.highlight, PET_SH = p.shade, PET_SH2 = p.shadeDark;
  // the walk loop reads the latest params every tick
  const pr = useRef(p);
  pr.current = p;
  const svgRef = useRef<SVGSVGElement>(null);
  const wallsRef = useRef<SVGGElement>(null);
  const glowLayerRef = useRef<SVGGElement>(null);
  const spotRef = useRef<SVGCircleElement>(null);
  const petPosRef = useRef<SVGGElement>(null);
  const petMirrorRef = useRef<SVGGElement>(null);
  const petBobRef = useRef<SVGGElement>(null);
  const petScaleRef = useRef<SVGGElement>(null);
  const petShadowRef = useRef<SVGEllipseElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const backViewRef = useRef<SVGGElement>(null);
  const shin1Ref = useRef<SVGRectElement>(null);
  const shin2Ref = useRef<SVGRectElement>(null);
  const shin3Ref = useRef<SVGRectElement>(null);
  const shin4Ref = useRef<SVGRectElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const wallsEl = wallsRef.current;
    const glowLayer = glowLayerRef.current;
    const spot = spotRef.current;
    const petPos = petPosRef.current;
    const petMirror = petMirrorRef.current;
    const petBob = petBobRef.current;
    const petScale = petScaleRef.current;
    const petShadow = petShadowRef.current;
    const eyes = eyesRef.current;
    const backView = backViewRef.current;
    const shins = [shin1Ref.current, shin2Ref.current, shin3Ref.current, shin4Ref.current];
    if (!svg || !wallsEl || !glowLayer || !spot || !petPos || !petMirror || !petBob || !petScale || !petShadow || !eyes || !backView || shins.some((s) => !s)) {
      return;
    }

    const svgNS = "http://www.w3.org/2000/svg";

    // Slab depth: extruded hatched side walls, visible only where the region
    // just below an edge is outside the walkway (bottom-facing edges).
    [MAIN, STRIP].forEach((poly) => {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 1) continue;
        const n = Math.max(1, Math.ceil(len / 6));
        let run: { t0: number; t1: number } | null = null;
        const emit = (r: { t0: number; t1: number }) => {
          const x0 = a[0] + (b[0] - a[0]) * r.t0;
          const y0 = a[1] + (b[1] - a[1]) * r.t0;
          const x1 = a[0] + (b[0] - a[0]) * r.t1;
          const y1 = a[1] + (b[1] - a[1]) * r.t1;
          const q = document.createElementNS(svgNS, "path");
          q.setAttribute("d", `M${x0},${y0} L${x1},${y1} L${x1},${y1 + DEPTH} L${x0},${y0 + DEPTH} Z`);
          q.setAttribute("fill", "url(#pbh-hatch)");
          q.setAttribute("stroke", STROKE);
          q.setAttribute("stroke-width", "0.75");
          wallsEl.appendChild(q);
        };
        for (let k = 0; k < n; k++) {
          const t0 = k / n;
          const t1 = (k + 1) / n;
          const tm = (t0 + t1) / 2;
          const mx = a[0] + (b[0] - a[0]) * tm;
          const my = a[1] + (b[1] - a[1]) * tm;
          const facing = !inUnion([mx, my + 2.5]) && inUnion([mx, my - 2.5]);
          if (facing) {
            if (!run) run = { t0, t1 };
            else run.t1 = t1;
          } else if (run) {
            emit(run);
            run = null;
          }
        }
        if (run) emit(run);
      }
    });

    // Cursor spotlight: orange stroke-only copies of every path edge,
    // visible only inside the radial mask that follows the pointer.
    wallsEl.querySelectorAll("path").forEach((p) => {
      const c = p.cloneNode() as SVGPathElement;
      c.setAttribute("fill", "none");
      c.style.stroke = "var(--pbh-glow)";
      c.setAttribute("stroke-width", "1");
      glowLayer.appendChild(c);
    });
    const topPathEl = svg.querySelector("#pbh-top-path");
    if (topPathEl) {
      const top = topPathEl.cloneNode() as SVGPathElement;
      top.removeAttribute("id");
      top.setAttribute("fill", "none");
      top.style.stroke = "var(--pbh-glow)";
      top.setAttribute("stroke-width", "1.2");
      glowLayer.appendChild(top);
    }

    const onPointerMove = (e: PointerEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = pt.matrixTransform(ctm.inverse());
      spot.setAttribute("cx", String(p.x));
      spot.setAttribute("cy", String(p.y));
      glowLayer.style.opacity = "0.9";
    };
    const onPointerLeave = () => {
      spot.setAttribute("cx", "-200");
      spot.setAttribute("cy", "-200");
      glowLayer.style.opacity = "0";
    };
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerleave", onPointerLeave);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const segs: { x0: number; y0: number; x1: number; y1: number; len: number; start: number }[] = [];
    let total = 0;
    for (let i = 0; i < WPTS.length - 1; i++) {
      const [x0, y0] = WPTS[i];
      const [x1, y1] = WPTS[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({ x0, y0, x1, y1, len, start: total });
      total += len;
    }
    const minY = 49.57;
    const maxY = 414.8;

    const ANCHOR_X = 131.25;
    const ANCHOR_Y = 150;
    const PIX = 3;

    const q = (v: number, s: number) => Math.round(v / s) * s;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    let travelled = 0;
    let dir = 1;
    let paused = false;
    let segIndex = 0;
    let stepPhase = 0;
    let stepTimer = 0;
    let squashUntil = 0;
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let restTimer: ReturnType<typeof setTimeout> | null = null;

    function pose() {
      let idx = segs.findIndex((s) => travelled >= s.start && travelled <= s.start + s.len);
      if (idx === -1) idx = travelled <= 0 ? 0 : segs.length - 1;
      if (idx !== segIndex) {
        segIndex = idx;
        squashUntil = performance.now() + 170;
      }
      const s = segs[idx];
      const t = clamp((travelled - s.start) / s.len, 0, 1);
      const x = lerp(s.x0, s.x1, t);
      const y = lerp(s.y0, s.y1, t);

      const vx = (s.x1 - s.x0) * dir;
      const vy = (s.y1 - s.y0) * dir;
      const facingBack = vy < 0;
      const mirror = vx < 0 ? -1 : 1;

      const depth = lerp(0.68, 1.14, (y - minY) / (maxY - minY));

      return { x, y, facingBack, mirror, depth, moving: !paused };
    }

    function render(p: ReturnType<typeof pose>, now: number) {
      petPos!.setAttribute("transform", `translate(${q(p.x, 1)},${q(p.y, 1)})`);

      let squash = 1;
      if (now < squashUntil) squash = squashUntil - now > 85 ? 0.72 : 0.88;
      petMirror!.setAttribute("transform", `scale(${p.mirror * squash},1)`);

      petScale!.setAttribute(
        "transform",
        `scale(${(pr.current.scale * p.depth).toFixed(4)}) translate(${-ANCHOR_X},${-ANCHOR_Y})`
      );
      petShadow!.setAttribute("rx", String(30 * p.depth));
      petShadow!.setAttribute("ry", String(8 * p.depth));

      backView!.style.opacity = p.facingBack ? "1" : "0";
      eyes!.style.opacity = p.facingBack ? "0" : "1";
      if (!p.facingBack) eyes!.setAttribute("transform", "translate(6,4)");

      const jog = p.moving ? (stepPhase ? pr.current.jog : -pr.current.jog) : 0;
      shins.forEach((sh, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        sh!.setAttribute("transform", `translate(${q(jog * side, PIX)},0)`);
      });
      petBob!.setAttribute("transform", `translate(0,${p.moving && stepPhase ? -3 : 0})`);
    }

    function rest(nextDir: number) {
      paused = true;
      squashUntil = performance.now() + 170;
      restTimer = setTimeout(() => {
        dir = nextDir;
        paused = false;
        squashUntil = performance.now() + 170;
      }, pr.current.pauseMs);
    }

    function frame(now: number) {
      const dt = clamp((now - last) / 1000 || 0.016, 0.001, 0.05);
      last = now;

      if (!paused) {
        travelled += dir * pr.current.speed * dt;
        if (travelled >= total) {
          travelled = total;
          rest(-1);
        } else if (travelled <= 0) {
          travelled = 0;
          rest(1);
        }
        stepTimer += dt * 1000;
        if (stepTimer >= pr.current.stepMs) {
          stepTimer = 0;
          stepPhase = 1 - stepPhase;
        }
      }

      acc += dt;
      if (acc >= 1 / pr.current.fps) {
        acc = 0;
        render(pose(), now);
      }
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      travelled = total * 0.42;
      render(pose(), performance.now());
    } else {
      render(pose(), performance.now());
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (restTimer) clearTimeout(restTimer);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <svg
        ref={svgRef}
        viewBox="0 0 1041 435"
        fill="none"
        className="block w-full overflow-visible"
        style={{ ["--pbh-glow" as string]: p.glow }}
        aria-label="Pixel pet buddy walking the isometric path"
      >
        {/* Dashed guide rays extended way past the viewBox (svg overflow is
            visible) so they run off the screen edges in their own isometric
            direction — the walkway/pet stay clipped to the frame below. */}
        <g aria-hidden>
          <line x1="-1276.4" y1="-801.7" x2="354.625" y2="136.283" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
          <line x1="786.624" y1="152.283" x2="3679.6" y2="1802.3" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
          <line x1="906.375" y1="83.6679" x2="2479.6" y2="-824.6" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
          <line x1="-2395.3" y1="1842.4" x2="178.217" y2="247.561" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
        </g>
        <g clipPath="url(#pbh-frame-clip)">
          <line x1="507.624" y1="272.283" x2="820.624" y2="450.283" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
          <line x1="649.363" y1="190.228" x2="744.363" y2="128.291" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />
          <line x1="551.625" y1="-27.7165" x2="649.839" y2="28.9872" stroke={STROKE} strokeWidth="0.5" strokeDasharray="12 12" />

          <g>
            <g ref={wallsRef} />
            <path id="pbh-top-path" d={TOP_PATH_D} fill={BG} stroke={STROKE} strokeWidth="1" />
          </g>

          <g ref={glowLayerRef} mask="url(#pbh-spot-mask)" style={{ opacity: 0, pointerEvents: "none", transition: "opacity 0.35s ease" }} />

          <g ref={petPosRef} style={{ pointerEvents: "none" }}>
            <g ref={petMirrorRef}>
              <ellipse ref={petShadowRef} cx="0" cy="0" rx="30" ry="8" fill="#000" opacity="0.45" />
              <g ref={petBobRef}>
                <g ref={petScaleRef}>
                  <g fill={PET_SH2}>
                    <use href="#pbh-pet-shape" transform="translate(-24,14)" opacity="0.55" />
                    <use href="#pbh-pet-shape" transform="translate(-12,7)" opacity="0.8" />
                  </g>

                  <g filter="url(#pbh-outline)">
                    <g fill={PET_BODY}>
                      <rect x="56.25" y="0" width="150" height="112.5" />
                      <g>
                        <rect x="56.25" y="0" width="150" height="9.375" fill={PET_HI} />
                        <rect x="56.25" y="9.375" width="9.375" height="93.75" fill={PET_HI} />
                        <rect x="196.875" y="0" width="9.375" height="103.125" fill={PET_SH} />
                        <rect x="56.25" y="103.125" width="150" height="9.375" fill={PET_SH} />
                        <rect x="93.75" y="84.375" width="7.5" height="7.5" fill={PET_SH} opacity="0.45" />
                        <rect x="140.625" y="90" width="7.5" height="7.5" fill={PET_SH} opacity="0.45" />
                        <rect x="121.875" y="72" width="7.5" height="7.5" fill={PET_SH} opacity="0.35" />
                      </g>

                      <g>
                        <rect x="28.125" y="37.5" width="28.125" height="37.5" />
                        <rect x="0" y="37.5" width="28.125" height="37.5" />
                        <rect x="28.125" y="37.5" width="28.125" height="6" fill={PET_HI} />
                      </g>
                      <g>
                        <rect x="206.25" y="37.5" width="28.125" height="37.5" />
                        <rect x="234.375" y="37.5" width="28.125" height="37.5" />
                        <rect x="206.25" y="37.5" width="28.125" height="6" fill={PET_HI} />
                      </g>

                      <g fill={PET_SH}>
                        <g>
                          <rect x="56.25" y="112.5" width="18.75" height="18.75" />
                          <rect ref={shin1Ref} x="56.25" y="125.25" width="18.75" height="24.75" fill={PET_SH2} />
                          <rect x="59.625" y="120.75" width="12" height="9" />
                        </g>
                        <g>
                          <rect x="93.75" y="112.5" width="18.75" height="18.75" />
                          <rect ref={shin2Ref} x="93.75" y="125.25" width="18.75" height="24.75" fill={PET_SH2} />
                          <rect x="97.125" y="120.75" width="12" height="9" />
                        </g>
                        <g>
                          <rect x="150" y="112.5" width="18.75" height="18.75" />
                          <rect ref={shin3Ref} x="150" y="125.25" width="18.75" height="24.75" fill={PET_SH2} />
                          <rect x="153.375" y="120.75" width="12" height="9" />
                        </g>
                        <g>
                          <rect x="187.5" y="112.5" width="18.75" height="18.75" />
                          <rect ref={shin4Ref} x="187.5" y="125.25" width="18.75" height="24.75" fill={PET_SH2} />
                          <rect x="190.875" y="120.75" width="12" height="9" />
                        </g>
                      </g>
                    </g>

                    <g ref={backViewRef} style={{ opacity: 0 }}>
                      <rect x="65.625" y="9.375" width="131.25" height="93.75" fill={PET_SH} opacity="0.6" />
                      <rect x="112.5" y="28" width="37.5" height="30" fill={PET_SH2} opacity="0.5" />
                    </g>

                    <g ref={eyesRef}>
                      <g fill={PET_EYE}>
                        <rect x="75" y="18.75" width="18.75" height="18.75" />
                        <rect x="168.75" y="18.75" width="18.75" height="18.75" />
                        <rect x="78" y="21.75" width="5.5" height="5.5" fill={PET_OUTLINE} />
                        <rect x="171.75" y="21.75" width="5.5" height="5.5" fill={PET_OUTLINE} />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        <defs>
          <clipPath id="pbh-frame-clip">
            <rect x="0.5" y="0.5" width="1040" height="434" />
          </clipPath>

          <pattern id="pbh-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={BG} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={STROKE} strokeWidth="1" opacity="0.65" />
          </pattern>

          <radialGradient id="pbh-spot-grad">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="65%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="pbh-spot-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1041" height="435">
            <circle ref={spotRef} cx="-200" cy="-200" r={p.spotRadius} fill="url(#pbh-spot-grad)" />
          </mask>

          <filter id="pbh-outline" x="-25%" y="-25%" width="150%" height="150%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="d" />
            <feFlood floodColor={PET_SH2} />
            <feComposite in2="d" operator="in" result="o" />
            <feMerge>
              <feMergeNode in="o" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <g id="pbh-pet-shape">
            <rect x="56.25" y="0" width="150" height="112.5" />
            <rect x="0" y="37.5" width="56.25" height="37.5" />
            <rect x="206.25" y="37.5" width="56.25" height="37.5" />
            <rect x="56.25" y="112.5" width="18.75" height="37.5" />
            <rect x="93.75" y="112.5" width="18.75" height="37.5" />
            <rect x="150" y="112.5" width="18.75" height="37.5" />
            <rect x="187.5" y="112.5" width="18.75" height="37.5" />
          </g>
        </defs>
      </svg>
    </div>
  );
}
