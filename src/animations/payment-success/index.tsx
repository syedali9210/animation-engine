import { useRef, useState, useCallback, useLayoutEffect } from "react";
import gsap from "gsap";
import Buddy, { BuddyParts } from "./Buddy";
import Coin, { CoinParts } from "./Coin";
import { burstConfetti } from "./confetti";
import { params as defaults, type Params } from "./params";
import "./payment-success.css";

const RADIUS = 42;
const GROUND_Y = 250;
const STAGE_W = 300;
const STAGE_H = 340;

export default function PaymentSuccessScene({ p = defaults }: { p?: Params }) {
  const stageRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<SVGGElement>(null);
  const speedLinesRef = useRef<SVGGElement>(null);
  const confettiRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGGElement>(null);

  const coinPartsRef = useRef<CoinParts | null>(null);
  const rollBuddyRef = useRef<BuddyParts | null>(null);
  const celebrateBuddyRef = useRef<BuddyParts | null>(null);

  const [readyCount, setReadyCount] = useState(0);
  const [playKey, setPlayKey] = useState(0);

  const bump = useCallback(() => setReadyCount((c) => c + 1), []);

  const onCoinReady = useCallback(
    (p: CoinParts) => {
      coinPartsRef.current = p;
      bump();
    },
    [bump]
  );
  const onRollBuddyReady = useCallback(
    (p: BuddyParts) => {
      rollBuddyRef.current = p;
      bump();
    },
    [bump]
  );
  const onCelebrateBuddyReady = useCallback(
    (p: BuddyParts) => {
      celebrateBuddyRef.current = p;
      bump();
    },
    [bump]
  );

  const ready = readyCount >= 3;

  // what @gsap/react's useGSAP does: a gsap.context scoped to the stage, reverted on cleanup
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      const coin = coinPartsRef.current!;
      const rollBuddy = rollBuddyRef.current!;
      const celebrateBuddy = celebrateBuddyRef.current!;
      const rig = rigRef.current!;
      const speedLines = speedLinesRef.current!;
      const confettiContainer = confettiRef.current!;
      const text = textRef.current!;

      const BUDDY_ON_COIN_Y = -RADIUS - 72;

      // clear any confetti left over from a previous run (its tweens live
      // outside this GSAP context since they're spawned async via tl.call)
      gsap.killTweensOf(confettiContainer.children);
      while (confettiContainer.firstChild) {
        confettiContainer.removeChild(confettiContainer.firstChild);
      }

      // ---- initial states ----
      gsap.set(rig, { x: 340, y: GROUND_Y - RADIUS });
      gsap.set(coin.spin, { rotation: 0, transformOrigin: "50% 50%" });
      gsap.set(coin.shadow, { opacity: 0.9 });

      gsap.set(rollBuddy.root, {
        x: -50,
        y: BUDDY_ON_COIN_Y - 60,
        opacity: 0,
        scale: 0.85,
        rotation: 0,
        transformOrigin: "50% 100%",
      });
      gsap.set([rollBuddy.legL, rollBuddy.legR], { rotation: 0 });
      gsap.set(rollBuddy.legL, { transformOrigin: "50% 0%" });
      gsap.set(rollBuddy.legR, { transformOrigin: "50% 0%" });
      gsap.set(rollBuddy.armL, { transformOrigin: "100% 50%", rotation: 0 });
      gsap.set(rollBuddy.armR, { transformOrigin: "0% 50%", rotation: 0 });
      gsap.set(rollBuddy.trumpet, { opacity: 0 });

      gsap.set(Array.from(speedLines.children), { opacity: 0 });

      gsap.set(celebrateBuddy.root, {
        x: STAGE_W / 2 - 50,
        y: 190,
        opacity: 0,
        scale: 0.7,
        transformOrigin: "50% 50%",
      });
      gsap.set(celebrateBuddy.armR, { transformOrigin: "0% 50%", rotation: 0 });
      gsap.set(celebrateBuddy.armL, { transformOrigin: "100% 50%", rotation: 0 });
      gsap.set(celebrateBuddy.legL, { transformOrigin: "50% 0%" });
      gsap.set(celebrateBuddy.legR, { transformOrigin: "50% 0%" });
      gsap.set(celebrateBuddy.trumpet, { opacity: 0 });
      gsap.set(celebrateBuddy.trumpetBell, { transformOrigin: "50% 50%" });

      gsap.set(text, { opacity: 0, y: 14 });

      // ================= TIMELINE =================
      const tl = gsap.timeline();
      tl.timeScale(p.speed);

      // --- Phase 1: coin slides in ---
      tl.to(rig, { x: 185, duration: 0.7, ease: "power3.out" }, 0);
      tl.to(coin.spin, { rotation: 70, duration: 0.7, ease: "power3.out" }, 0);

      // --- buddy hops onto the coin ---
      tl.to(
        rollBuddy.root,
        { opacity: 1, y: BUDDY_ON_COIN_Y, scale: 1, duration: 0.5, ease: "bounce.out" },
        0.35
      );

      // --- a couple of walking steps ---
      const stepStart = 0.85;
      tl.to(rollBuddy.legL, { rotation: -20, duration: 0.12, yoyo: true, repeat: 3 }, stepStart);
      tl.to(
        rollBuddy.legR,
        { rotation: 20, duration: 0.12, yoyo: true, repeat: 3 },
        stepStart + 0.12
      );

      // --- settle into a balanced "riding the wheel" crouch ---
      const rollStart = 1.35;
      tl.to(rollBuddy.legL, { rotation: -14, duration: 0.15 }, rollStart);
      tl.to(rollBuddy.legR, { rotation: 14, duration: 0.15 }, rollStart);
      tl.to(rollBuddy.armL, { rotation: 24, duration: 0.15 }, rollStart);
      tl.to(rollBuddy.armR, { rotation: -24, duration: 0.15 }, rollStart);
      tl.to(rollBuddy.root, { rotation: -6, duration: 0.15 }, rollStart);
      tl.to(
        rollBuddy.root,
        // ported: finite (was repeat -1) so the timeline has an end to loop from; outlasts the ride
        { y: `-=3`, duration: 0.055, yoyo: true, repeat: 40, ease: "sine.inOut" },
        rollStart + 0.15
      );

      // --- accelerating roll: coin spins faster & faster while rolling left ---
      const rollLabel = rollStart;
      tl.to(rig, { x: 150, duration: 0.9, ease: "none" }, rollLabel)
        .to(coin.spin, { rotation: "+=360", duration: 0.9, ease: "none" }, rollLabel)
        .to(rig, { x: 60, duration: 0.55, ease: "none" })
        .to(coin.spin, { rotation: "+=360", duration: 0.55, ease: "none" }, "<")
        .to(speedLines.children, { opacity: 0.55, duration: 0.2 }, "<")
        .to(rig, { x: -60, duration: 0.4, ease: "none" })
        .to(coin.spin, { rotation: "+=540", duration: 0.4, ease: "none" }, "<")
        .to(rig, { x: -280, duration: 0.28, ease: "none" })
        .to(coin.spin, { rotation: "+=720", duration: 0.28, ease: "none" }, "<")
        .to(speedLines.children, { opacity: 0, duration: 0.25 }, "<");

      // ================= Phase 2: celebration =================
      const celebrateStart = rollLabel + 0.9 + 0.55 + 0.4 + 0.28 + 0.2;

      tl.to(
        celebrateBuddy.root,
        { opacity: 1, y: 174, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
        celebrateStart
      );

      // raise trumpet to mouth
      tl.to(celebrateBuddy.armR, { rotation: -75, duration: 0.3, ease: "power2.out" }, "<0.15");
      tl.to(celebrateBuddy.trumpet, { opacity: 1, duration: 0.15 }, "<");

      // blow pulses on the bell
      tl.to(
        celebrateBuddy.trumpetBell,
        { scale: 1.18, duration: 0.13, yoyo: true, repeat: 5, transformOrigin: "0% 50%" },
        ">"
      );

      // confetti poppers
      tl.call(
        () => {
          burstConfetti(gsap, confettiContainer, [
            { x: 26, y: 305, dir: 1 },
            { x: STAGE_W - 26, y: 305, dir: -1 },
          ], p.confetti);
        },
        undefined,
        "<"
      );
      tl.call(
        () => {
          burstConfetti(gsap, confettiContainer, [
            { x: 26, y: 305, dir: 1 },
            { x: STAGE_W - 26, y: 305, dir: -1 },
          ], p.confetti);
        },
        undefined,
        "<0.5"
      );

      // hopping in place
      tl.to(
        celebrateBuddy.root,
        { y: "-=16", duration: 0.26, yoyo: true, repeat: 9, ease: "power1.inOut" },
        "<-0.1"
      );
      tl.to(
        [celebrateBuddy.earL, celebrateBuddy.earR],
        { rotation: 8, duration: 0.26, yoyo: true, repeat: 9, transformOrigin: "50% 100%" },
        "<"
      );

      // success text
      tl.to(text, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "<0.1");

      // ported: reduced motion lands on the end state — no rolling, no confetti
      if (p.reducedMotion && matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tl.progress(1, true);
        return;
      }
      if (p.loop) tl.eventCallback("onComplete", () => gsap.delayedCall(p.loopDelayMs / 1000, () => setPlayKey((k) => k + 1)));
    }, stageRef);
    return () => ctx.revert();
    // speed/confetti/loop are read when the timeline is built; the next replay picks up changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, playKey]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="ps-card relative rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          // empty colours follow the theme (payment-success.css); set them to pin a palette
          background: p.bgTop || p.bgBottom ? `radial-gradient(120% 100% at 50% 0%, ${p.bgTop || p.bgBottom} 0%, ${p.bgBottom || p.bgTop} 70%)` : "var(--ps-bg)",
        }}
      >
        <svg
          ref={stageRef}
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          width={STAGE_W}
          height={STAGE_H}
          style={{ overflow: "hidden", display: "block" }}
        >
          {/* ground line */}
          <line
            x1={0}
            y1={GROUND_Y + 2}
            x2={STAGE_W}
            y2={GROUND_Y + 2}
            style={{ stroke: "var(--ps-ground)" }}
            strokeWidth={2}
          />

          {/* rolling rig: coin + buddy riding it */}
          <g ref={rigRef}>
            <g ref={speedLinesRef}>
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={30 + i * 14}
                  y={-6 + i * 10}
                  width={26}
                  height={4}
                  rx={2}
                  style={{ fill: "var(--ps-ink)" }}
                />
              ))}
            </g>
            <Coin id="roll" radius={RADIUS} onReady={onCoinReady} face={p.coinFace} edge={p.coinEdge} />
            <Buddy id="roll" onReady={onRollBuddyReady} body={p.buddy} shade={p.buddyShade} />
          </g>

          {/* celebration buddy */}
          <Buddy id="celebrate" onReady={onCelebrateBuddyReady} body={p.buddy} shade={p.buddyShade} />

          {/* confetti particles get appended here */}
          <g ref={confettiRef} id="confetti-container" />

          {/* success text */}
          <g ref={textRef}>
            <text
              x={STAGE_W / 2}
              y={300}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              style={{ fill: "var(--ps-ink)" }}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {p.title}
            </text>
            <text
              x={STAGE_W / 2}
              y={320}
              textAnchor="middle"
              fontSize={12}
              style={{ fill: "var(--ps-sub)" }}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {p.amount} sent to {p.recipient}
            </text>
          </g>
        </svg>
      </div>

      <button
        onClick={() => setPlayKey((k) => k + 1)}
        className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-95 transition"
      >
        Replay
      </button>
    </div>
  );
}
