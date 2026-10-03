import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Params } from "./params";

// The portfolio's spring tiers (lib/springs.ts): fast = 80ms no bounce, slow = 240ms with a little.
const spring = {
  fast: { type: "spring" as const, duration: 0.08, bounce: 0 },
  slow: { type: "spring" as const, duration: 0.24, bounce: 0.12 },
};
const PET_EYE = "#141414";
const PET_GLINT = "#ffffff";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const SPRITE_W = 22;
const SPRITE_H = 24;
const REST_TRANSITION = { left: spring.slow, y: spring.fast, rotate: spring.fast };

/**
 * A tiny mascot perched on top of the active tab, in the same TabsList
 * container as the sliding selection indicator. On tab switch it leaps from
 * the old tab to the new one (crouch, arc, squash-stretch, dust poof on
 * landing) instead of just sliding over — reads as the buddy picking the
 * tab rather than a second indicator.
 */
export default function PetBuddyTabHop({ rect, p }: { rect: Rect | null; p: Params }) {
  const PET_BODY = p.body, PET_HI = p.highlight, PET_SH = p.shade, PET_SH2 = p.shadeDark;
  const [hopping, setHopping] = useState(false);
  const [hopId, setHopId] = useState(0);
  const [blink, setBlink] = useState(false);
  const prevLeft = useRef<number | null>(null);
  const dir = useRef(1);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cx = rect ? rect.left + rect.width / 2 - SPRITE_W / 2 : null;

  useEffect(() => {
    if (cx == null) return;
    if (prevLeft.current != null && Math.abs(cx - prevLeft.current) > 0.5) {
      dir.current = cx > prevLeft.current ? 1 : -1;
      setHopping(true);
      setHopId((k) => k + 1);
      if (hopTimer.current) clearTimeout(hopTimer.current);
      hopTimer.current = setTimeout(() => setHopping(false), p.hopMs);
    }
    prevLeft.current = cx;
    return () => {
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, [cx]);

  // Idle blink, same cadence family as the full-size rig's blink loop.
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const cycle = () => {
      if (!alive) return;
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        t = setTimeout(cycle, p.blinkMs + Math.random() * 1800);
      }, 120);
    };
    t = setTimeout(cycle, 2200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  if (cx == null || !rect) return null;

  const hop = { duration: p.hopMs / 1000, times: [0, 0.12, 0.55, 1] };
  const hopTransition = { left: spring.slow, y: hop, rotate: hop };
  const squashTransition = hop;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute z-30"
        style={{ top: rect.top - SPRITE_H, width: SPRITE_W, height: SPRITE_H }}
        initial={false}
        animate={
          hopping
            ? { left: cx, y: [0, 2, -p.hopHeight, 0], rotate: [0, dir.current * -p.lean, dir.current * p.lean * 0.7, 0] }
            : { left: cx, y: 0, rotate: 0 }
        }
        transition={hopping ? hopTransition : REST_TRANSITION}
      >
        <motion.svg
          viewBox="0 0 22 24"
          width={SPRITE_W}
          height={SPRITE_H}
          className="absolute inset-x-0 bottom-0"
          style={{ transformOrigin: "50% 100%", overflow: "visible" }}
          initial={false}
          animate={hopping ? { scaleY: [1, p.squash, p.stretch, 1], scaleX: [1, 1 + (1 - p.squash) * 0.44, 1 - (p.stretch - 1) * 0.6, 1] } : { scaleY: 1, scaleX: 1 }}
          transition={hopping ? squashTransition : { duration: 0.12 }}
        >
          <rect x="3" y="18" width="5" height="5" rx="1" fill={PET_SH2} />
          <rect x="14" y="18" width="5" height="5" rx="1" fill={PET_SH2} />
          <rect x="1" y="3" width="20" height="16" rx="3" fill={PET_BODY} />
          <rect x="1" y="3" width="20" height="4" rx="2" fill={PET_HI} />
          <rect x="15" y="3" width="6" height="13" rx="2" fill={PET_SH} opacity="0.55" />
          <rect x="5" y="9" width="4" height="4" fill={PET_EYE} opacity={blink ? 0.15 : 1} />
          <rect x="13" y="9" width="4" height="4" fill={PET_EYE} opacity={blink ? 0.15 : 1} />
          <rect x="6" y="10" width="1.3" height="1.3" fill={PET_GLINT} />
          <rect x="14" y="10" width="1.3" height="1.3" fill={PET_GLINT} />
        </motion.svg>
      </motion.div>

      <AnimatePresence>
        {hopping && (
          <motion.div
            key={hopId}
            className="pointer-events-none absolute z-20 flex gap-1"
            style={{ left: cx + SPRITE_W / 2 - 6, top: rect.top - 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: (p.hopMs / 1000) * 0.88, delay: (p.hopMs / 1000) * 0.59, times: [0, 0.35, 1] }}
          >
            <span className="block h-1 w-1 rounded-full" style={{ background: PET_SH2 }} />
            <span className="block h-1.5 w-1.5 rounded-full" style={{ background: PET_SH2 }} />
            <span className="block h-1 w-1 rounded-full" style={{ background: PET_SH2 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
