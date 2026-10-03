import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Params } from "./params";

// A pixel-exact replica of the Framer University "Image Scratch" card
// (https://scratcher.learnframer.site/): a 480x300 black credit-card with a
// dotted foil surface that scratches off under a grungy 70px brush to reveal
// whatever's hiding underneath. The foil is the actual production technique
// from Framer's ImageScratch module — an overlay image painted onto a
// canvas, erased along the pointer path with `destination-out` stamps of a
// custom brush image.
const CARD_W = 480;
const CARD_H = 300;

// Coverage is tracked on a coarse grid rather than by reading canvas pixels
// every frame — cheap to update, plenty accurate for "have they scratched
// most of it off yet." Once past the threshold the foil fades the rest of
// the way out and the surface stops listening for more scratches, handing
// pointer control to whatever `reveal` content sits underneath.

const FOIL_SRC = "/anim/scratch-card/foil-dots.png";
const BRUSH_SRC = "/anim/scratch-card/brush-grunge.png";
const NOISE_SRC = "/anim/scratch-card/noise.png";

const CARD_SHADOW =
  "0px 10px 20px 0px rgba(0,0,0,0.15), 0px 20px 40px 0px rgba(0,0,0,0.2), 0px 30px 60px 0px rgba(0,0,0,0.1), 0.5px 0.5px 0px 0px rgba(255,255,255,0.1) inset, 4px 4px 15px 0px rgba(255,255,255,0.05) inset";

interface ScratchCardProps {
  caption?: string;
  // What's hiding under the foil — mounted only once the card is mostly
  // scratched off, so an entrance animation plays right as it's revealed
  // instead of running hidden underneath.
  reveal: ReactNode;
  p: Params;
}

export default function ScratchCard({
  caption = "Experiment and prototype",
  reveal,
  p,
}: ScratchCardProps) {
  const BRUSH_SIZE = p.brushSize;
  const GRID = p.grid;
  const REVEAL_THRESHOLD = p.threshold;
  const frameRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foilRef = useRef<HTMLImageElement | null>(null);
  const brushRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const clearedRef = useRef<boolean[]>(new Array(GRID * GRID).fill(false));
  // The card is a fixed 480x300 design scaled uniformly to whatever width
  // it's given, so every proportion survives on small screens instead of
  // reflowing.
  const [scale, setScale] = useState(1);
  const [revealed, setRevealed] = useState(false);

  // Layout effect so the very first paint is already scaled — otherwise a
  // phone flashes the full 480px card for a frame before shrinking.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / CARD_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  // Paint the dotted foil over the scratch surface (cover-fit, dpr-sharp).
  const paintFoil = useCallback(() => {
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    const img = foilRef.current;
    if (!surface || !canvas || !img) return;
    const w = surface.clientWidth;
    const h = surface.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "source-over";
    const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = img.naturalWidth * cover;
    const sh = img.naturalHeight * cover;
    ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
    clearedRef.current = new Array(GRID * GRID).fill(false);
    setRevealed(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    load(FOIL_SRC).then(
      (img) => {
        if (cancelled) return;
        foilRef.current = img;
        paintFoil();
      },
      () => undefined
    );
    load(BRUSH_SRC).then(
      (img) => {
        if (cancelled) return;
        brushRef.current = img;
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [paintFoil]);

  // Pointer position in the surface's own (unscaled) coordinate space —
  // getBoundingClientRect is shrunk by the card's scale transform, the
  // canvas backing store is not.
  const getPoint = (e: PointerEvent) => {
    const surface = surfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * surface.clientWidth,
      y: ((e.clientY - rect.top) / rect.height) * surface.clientHeight,
    };
  };

  // Marks the coarse grid cells under a stamp as cleared and flips
  // `revealed` once enough of the surface has been scratched off.
  const markCleared = (x: number, y: number, w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    const gx = Math.floor((x / w) * GRID);
    const gy = Math.floor((y / h) * GRID);
    const reach = Math.max(1, Math.ceil((BRUSH_SIZE / Math.min(w, h)) * GRID));
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        clearedRef.current[cy * GRID + cx] = true;
      }
    }
    const count = clearedRef.current.reduce((n, c) => n + (c ? 1 : 0), 0);
    if (count / (GRID * GRID) >= REVEAL_THRESHOLD) setRevealed(true);
  };

  const stamp = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const half = BRUSH_SIZE / 2;
    ctx.globalCompositeOperation = "destination-out";
    const brush = brushRef.current;
    if (brush && brush.naturalWidth > 0) {
      ctx.drawImage(brush, x - half, y - half, BRUSH_SIZE, BRUSH_SIZE);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
    }
    markCleared(x, y, w, h);
  };

  // stopPropagation keeps any surrounding swipe/drag surface from reading a
  // scratch as a drag. Once revealed, the surface stops handling pointers
  // at all so a draggable reveal underneath gets uncontested events.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (revealed) return;
    e.stopPropagation();
    const surface = surfaceRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    const pt = getPoint(e);
    if (!ctx || !pt || !surface) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic/stale pointers can't be captured — scratching still works,
      // the stroke just ends at the surface's edge.
    }
    drawingRef.current = true;
    lastRef.current = pt;
    stamp(ctx, pt.x, pt.y, surface.clientWidth, surface.clientHeight);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (revealed || !drawingRef.current) return;
    e.stopPropagation();
    const surface = surfaceRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    const pt = getPoint(e);
    if (!ctx || !pt || !surface) return;
    // Interpolate stamps between events so fast swipes leave a continuous
    // scratch instead of a dotted line.
    const last = lastRef.current;
    if (last) {
      const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
      const steps = Math.max(1, Math.ceil(dist / (BRUSH_SIZE * 0.2)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        stamp(
          ctx,
          last.x + (pt.x - last.x) * t,
          last.y + (pt.y - last.y) * t,
          surface.clientWidth,
          surface.clientHeight
        );
      }
    } else {
      stamp(ctx, pt.x, pt.y, surface.clientWidth, surface.clientHeight);
    }
    lastRef.current = pt;
  };

  const endStroke = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    drawingRef.current = false;
    lastRef.current = null;
  };

  return (
    <div ref={frameRef} className="relative w-full" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
      <div
        className="absolute top-0 left-0 overflow-clip rounded-[20px]"
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          boxShadow: CARD_SHADOW,
          background: p.cardColor,
        }}
      >
        {/* The scratch surface spans the entire card face — every pixel of
            foil is scratchable, edge to edge. */}
        <div
          ref={surfaceRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          className="absolute inset-0 overflow-hidden rounded-[20px]"
          style={{ touchAction: "none" }}
        >
          {revealed && <div className="absolute inset-0">{reveal}</div>}
          <canvas
            ref={canvasRef}
            style={{ transitionDuration: `${p.fadeMs}ms` }}
            className={`pointer-events-none absolute inset-0 block h-full w-full transition-opacity ${
              revealed ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Caption rides above the foil — it never scratches off. */}
        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[2] p-2 font-mono text-xs font-medium tracking-[0.03em] text-[#e8e8e8]">
          <p>{caption}</p>
        </div>

        {/* Film-grain wash over the whole card. */}
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[20px] opacity-40 mix-blend-overlay"
          style={{ backgroundImage: `url(${NOISE_SRC})`, backgroundRepeat: "repeat", backgroundSize: "109px auto" }}
        />
      </div>
    </div>
  );
}
