import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

// Cycles the card-network mark through Visa -> Mastercard -> RuPay -> ...
// by chopping the mark into a small tile grid and flipping each tile in on
// its own 3D axis, staggered diagonally, so the whole mark "shatters" into
// the next one instead of a flat crossfade.
const NETWORKS = ["visa", "mastercard", "rupay"] as const;
type Network = (typeof NETWORKS)[number];

const COLS = 6;
const ROWS = 4;
const BOX_W = 72;
const BOX_H = 44;
const TILE_W = BOX_W / COLS;
const TILE_H = BOX_H / ROWS;

function NetworkMark({ network, ink }: { network: Network; ink: string }) {
  if (network === "visa") {
    return (
      <svg width={BOX_W} height={BOX_H} viewBox="0 0 72 44">
        <text
          x="36"
          y="28"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          fontWeight={700}
          fontSize="21"
          letterSpacing="0.5"
          fill={ink}
        >
          VISA
        </text>
      </svg>
    );
  }
  if (network === "mastercard") {
    return (
      <svg width={BOX_W} height={BOX_H} viewBox="0 0 72 44">
        <circle cx="29" cy="22" r="13" fill="#EB001B" />
        <circle cx="43" cy="22" r="13" fill="#F79E1B" fillOpacity={0.85} />
      </svg>
    );
  }
  return (
    <svg width={BOX_W} height={BOX_H} viewBox="0 0 72 44">
      <text
        x="36"
        y="21"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={800}
        fontSize="14"
      >
        <tspan fill={ink}>Ru</tspan>
        <tspan fill="#F58220">Pay</tspan>
      </text>
      <path d="M13 28 H59" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function NetworkMorph({ ink = "#f5f5f5", cycleMs: CYCLE_MS = 2600, flipMs = 400, staggerMs = 35 }: { ink?: string; cycleMs?: number; flipMs?: number; staggerMs?: number }) {
  const TILE_FLIP_S = flipMs / 1000;
  const STAGGER_S = staggerMs / 1000;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % NETWORKS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [CYCLE_MS]);

  const network = NETWORKS[index];

  return (
    <div className="relative" style={{ width: BOX_W, height: BOX_H }}>
      {Array.from({ length: ROWS }).map((_, row) =>
        Array.from({ length: COLS }).map((_, col) => {
          const delay = (row + col) * STAGGER_S;
          const originX = col * TILE_W + TILE_W / 2;
          const originY = row * TILE_H + TILE_H / 2;
          return (
            <div
              key={`${row}-${col}`}
              className="absolute overflow-hidden"
              style={{
                left: col * TILE_W,
                top: row * TILE_H,
                width: TILE_W,
                height: TILE_H,
                perspective: 240,
              }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={network}
                  className="absolute"
                  style={{
                    left: -col * TILE_W,
                    top: -row * TILE_H,
                    transformOrigin: `${originX}px ${originY}px`,
                  }}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: TILE_FLIP_S, delay, ease: [0.32, 0.72, 0, 1] }}
                >
                  <NetworkMark network={network} ink={ink} />
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })
      )}
    </div>
  );
}
