import { AnimatePresence, motion } from "motion/react";
import CardField from "./CardField";
import NetworkMorph from "./NetworkMorph";
import type { Bank } from "./banks";
import type { Params } from "./params";

const CARD_W = 480;
const CARD_H = 300;

// Layered like a real slab catching light: a wide ambient drop, a tighter
// contact shadow, then two inset highlights for the milled top edge.
const CARD_SHADOW = [
  "0px 2px 6px rgba(0,0,0,0.10)",
  "0px 12px 28px rgba(0,0,0,0.14)",
  "0px 32px 64px rgba(0,0,0,0.16)",
  "inset 0px 1px 0px rgba(255,255,255,0.95)",
  "inset 0px -1px 0px rgba(0,0,0,0.06)",
].join(",");

const FOIL_SRC = "/anim/scratch-card/foil-dots.png";
const NOISE_SRC = "/anim/scratch-card/noise.png";

const INK = "#1d1d1f";

interface AtmCardProps {
  bank: Bank;
  cardNumber: string;
  onCardNumberChange: (next: string) => void;
  holderName: string;
  onHolderNameChange: (next: string) => void;
  p: Params;
}

export default function AtmCard({
  bank,
  cardNumber,
  onCardNumberChange,
  holderName,
  onHolderNameChange,
  p,
}: AtmCardProps) {
  const hop = { stiffness: p.hopStiffness, damping: p.hopDamping };
  return (
    <div className="relative w-full" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
      <div
        className="absolute inset-0 overflow-hidden rounded-[26px] bg-white"
        style={{ boxShadow: CARD_SHADOW, color: INK }}
      >
        {/* Bank wash — crossfades when the bank changes, so the colour drifts
            across the titanium instead of snapping. */}
        <AnimatePresence>
          <motion.div
            key={bank.id}
            className="absolute inset-0"
            style={{ background: bank.bloom }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.washMs / 1000, ease: [0.32, 0.72, 0, 1] }}
          />
        </AnimatePresence>

        {/* Specular sweep across the top-left, like light off brushed metal. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 38%)",
          }}
        />

        {/* Scratch-card foil + grain, dialled right down so they read as
            texture in the titanium rather than as a pattern. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{ backgroundImage: `url(${FOIL_SRC})`, backgroundSize: "170%", backgroundPosition: "center" }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-[0.22] mix-blend-multiply"
          style={{ backgroundImage: `url(${NOISE_SRC})`, backgroundRepeat: "repeat", backgroundSize: "128px auto" }}
        />

        {/* Hairline edge. */}
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[26px] ring-1 ring-inset ring-black/[0.07]" />

        {/* ---- Card face content ---- */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8">
          <div className="flex items-start justify-between">
            <motion.p
              key={bank.id}
              initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="font-card text-[17px] font-bold tracking-[-0.01em]"
            >
              {bank.name}
            </motion.p>

            {/* EMV chip */}
            <div
              className="h-[34px] w-[44px] rounded-[7px]"
              style={{
                background:
                  "linear-gradient(135deg,#e8d7a6 0%,#cbb37a 30%,#f2e9cd 52%,#c2a86c 74%,#e4d4a4 100%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.85), 0 1px 2px rgba(0,0,0,0.18)",
              }}
            >
              <div className="grid h-full w-full grid-cols-2 gap-px p-1 opacity-30">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-[1px] bg-black/40" />
                ))}
              </div>
            </div>
          </div>

          <CardField
            ariaLabel="Card number"
            value={cardNumber}
            onChange={onCardNumberChange}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            hop={hop}
            className="font-card text-[27px] font-semibold tracking-[0.06em] tabular-nums"
          />

          <div className="flex items-end justify-between gap-4">
            <CardField
              ariaLabel="Name on card"
              value={holderName}
              onChange={onHolderNameChange}
              placeholder="YOUR NAME"
              hop={hop}
              className="font-card text-[13px] font-semibold uppercase tracking-[0.14em]"
            />
            <NetworkMorph ink={INK} cycleMs={p.networkCycleMs} flipMs={p.tileFlipMs} staggerMs={p.tileStaggerMs} />
          </div>
        </div>
      </div>
    </div>
  );
}
