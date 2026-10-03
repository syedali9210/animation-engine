import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { Params } from "./params";
import {
  applyMove,
  FACES,
  invert,
  makeCube,
  matrix3d,
  mulberry32,
  scramble,
  spawnOrder,
  type Cubie,
  type Move,
} from "./cube";

const PIECES = 27;
const BOX = 170; // wide enough that the spinning cube's diagonal never clips
const SPAWN_EASE = "cubic-bezier(0.34, 1.4, 0.5, 1)"; // slight overshoot on arrival
const LABEL_EASE = [0.32, 0.72, 0, 1] as const;

// Read by Piece too; ThinkingCube refreshes them from params on every render.
let CELL = 34; // centre-to-centre spacing
let SIZE = 30; // piece size — the 4px difference is the seam
let INNER = "#141417";
let STICKERS: string[] = FACES.map((f) => f.sticker);

/** Phase labels keyed to how many pieces have emerged. */
const ASSEMBLY = [
  { at: 1, label: "Gathering context" },
  { at: 2, label: "Reading the codebase" },
  { at: 8, label: "Mapping dependencies" },
  { at: 20, label: "Drafting a plan" },
] as const;

const SOLVING = ["Applying changes", "Verifying the result"] as const;

type Turn = { move: Move; angle: number; animate: boolean };

export default function ThinkingCube({
  seed = 1,
  className,
  p,
}: {
  seed?: number;
  className?: string;
  p: Params;
}) {
  const { coreHoldMs: CORE_HOLD, spawnMs: SPAWN_MS, staggerMs: STAGGER, settleMs: SETTLE, turnMs: TURN_MS, turnGapMs: TURN_GAP, moves: SOLVE_MOVES, turnEase: EASE_OUT } = p;
  CELL = p.cell;
  SIZE = p.cell - p.seam;
  INNER = p.inner;
  STICKERS = [p.right, p.left, p.up, p.down, p.front, p.back];
  // The scramble is seeded so the server and the client render the same first
  // frame; the solution is just that scramble run backwards.
  const { start, solution, order } = useMemo(() => {
    const moves = scramble(SOLVE_MOVES, mulberry32(seed));
    let cube = makeCube();
    for (const m of moves) cube = applyMove(cube, m);
    return { start: cube, solution: invert(moves), order: spawnOrder(cube) };
  }, [seed, SOLVE_MOVES]);

  const rank = useMemo(() => new Map(order.map((id, i) => [id, i])), [order]);

  const [cubies, setCubies] = useState(start);
  const [spawned, setSpawned] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(r));

    (async () => {
      setSpawned(1);
      await sleep(CORE_HOLD);
      for (let n = 2; n <= PIECES; n++) {
        if (!alive) return;
        setSpawned(n);
        await sleep(STAGGER);
      }
      await sleep(SETTLE);

      for (let i = 0; i < solution.length; i++) {
        if (!alive) return;
        const move = solution[i];
        setStep(i + 1);
        // Park on the new axis at 0° with transitions off, so the browser
        // interpolates a clean single-axis turn instead of blending axes.
        setTurn({ move, angle: 0, animate: false });
        await frame();
        await frame();
        if (!alive) return;
        setTurn({ move, angle: 90 * move.dir, animate: true });
        await sleep(TURN_MS);
        if (!alive) return;
        // Committing the move produces an identical matrix, so with transitions
        // off this is invisible — the pieces just adopt their new home.
        setCubies((cs) => applyMove(cs, move));
        setTurn({ move, angle: 0, animate: false });
        await sleep(TURN_GAP);
      }
      if (alive) setDone(true);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution]);

  const solving = spawned >= PIECES && step > 0;
  const label = done
    ? "Task completed"
    : solving
      ? SOLVING[Math.min(SOLVING.length - 1, Math.floor((step - 1) / (solution.length / SOLVING.length)))]
      : [...ASSEMBLY].reverse().find((s) => spawned >= s.at)?.label ?? ASSEMBLY[0].label;

  const detail = done
    ? `${solution.length} moves · solved`
    : solving
      ? `Move ${step} of ${solution.length}`
      : `${spawned} of ${PIECES} pieces`;

  // One duration for every piece: 0 while a move is being committed or an axis
  // swapped, TURN_MS mid-turn, spawn timing otherwise.
  const duration = turn ? (turn.animate ? TURN_MS : 0) : SPAWN_MS;
  const easing = turn ? EASE_OUT : SPAWN_EASE;

  return (
    <div className={`flex items-center gap-6 ${className ?? ""}`}>
      <div
        aria-hidden
        className="shrink-0 [perspective:900px]"
        style={{ width: BOX, height: BOX }}
      >
        <motion.div
          className="grid h-full w-full place-items-center [transform-style:preserve-3d]"
          animate={done ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.7, ease: LABEL_EASE }}
        >
          {/* Zero-sized and centred, so this element's origin is the cube's
              centre — which is what every piece rotates around. */}
          <motion.div
            className="relative [transform-style:preserve-3d]"
            style={{ rotateX: p.tilt }}
            animate={{ rotateY: 360 }}
            transition={{ duration: p.spinSeconds, ease: "linear", repeat: Infinity }}
          >
            {cubies.map((c) => (
              <Piece
                key={c.id}
                cubie={c}
                visible={(rank.get(c.id) ?? 0) < spawned}
                turn={turn}
                duration={duration}
                easing={easing}
                lit={done}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="min-w-0" role="status" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
            transition={{ duration: 0.32, ease: LABEL_EASE }}
            className="flex items-center gap-2"
          >
            {done && (
              <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}
            <span
              className={`text-[15px] font-semibold tracking-[-0.01em] ${done ? "text-foreground" : "thinking-shimmer"}`}
            >
              {label}
            </span>
          </motion.div>
        </AnimatePresence>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

const Piece = memo(function Piece({
  cubie,
  visible,
  turn,
  duration,
  easing,
  lit,
}: {
  cubie: Cubie;
  visible: boolean;
  turn: Turn | null;
  duration: number;
  easing: string;
  lit: boolean;
}) {
  // Every piece renders the same transform shape — a layer rotation, a
  // translation, its orientation, a scale — so the browser can interpolate it
  // component by component. Pieces outside the turning layer just sit at 0°.
  const active = turn !== null && cubie.pos[turn.move.axis] === turn.move.layer;
  const axis = active ? turn.move.axis : 1;
  const angle = active ? turn.angle : 0;
  const [x, y, z] = visible ? cubie.pos : [0, 0, 0];

  // No will-change on the piece: it spawns at scale 0.01, and promoting it to
  // its own layer locks in a rasterisation at that scale — it blows up to a
  // blurry smear on the way out.
  return (
    <div
      className="absolute [transform-style:preserve-3d]"
      style={{
        width: SIZE,
        height: SIZE,
        left: -SIZE / 2,
        top: -SIZE / 2,
        transform:
          `rotate3d(${+(axis === 0)},${+(axis === 1)},${+(axis === 2)},${angle}deg) ` +
          `translate3d(${x * CELL}px,${y * CELL}px,${z * CELL}px) ` +
          `${matrix3d(cubie.basis)} scale(${visible ? 1 : 0.01})`,
        transitionProperty: "transform",
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: easing,
      }}
    >
      {FACES.map((f, fi) => {
        const outer = cubie.home[f.axis] === f.dir;
        return (
          <div
            key={f.rotate || "front"}
            className="absolute inset-0 rounded-[5px] border border-black/40"
            style={{
              transform: `${f.rotate} translateZ(${SIZE / 2}px)`,
              backgroundColor: outer ? STICKERS[fi] : INNER,
              // Painted front to back: glow, bevel, then the lighting tint.
              boxShadow: [
                outer && lit ? `0 0 9px ${STICKERS[fi]}` : "",
                outer
                  ? "inset 0 0 0 2px rgba(0,0,0,0.32)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.05)",
                `inset 0 0 0 100px ${f.tint}`,
              ]
                .filter(Boolean)
                .join(", "),
              transition: "box-shadow 500ms ease",
            }}
          />
        );
      })}
    </div>
  );
});
