import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import AtmCard from "./AtmCard";
import { BANKS } from "./banks";
import { params as defaults, type Params } from "./params";
import "./wallet-card.css";

// Apple's standard interface curve — a fast, decisive start that glides to a
// stop with no bounce back. Used for everything that changes size or position.
const EASE_OUT = [0.32, 0.72, 0, 1] as const;

const formatCardNumber = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

export default function AtmCardDemo({ p = defaults }: { p?: Params }) {
  const SHEET_SPRING = { type: "spring" as const, stiffness: p.sheetStiffness, damping: p.sheetDamping, mass: 0.9 };
  const [open, setOpen] = useState(false);
  const [bankId, setBankId] = useState(p.bank);
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");

  const bank = BANKS.find((b) => b.id === bankId) ?? BANKS[0];

  // hands-free demo: open the sheet, type a card number and name, flip through the banks, close
  useEffect(() => {
    if (!p.autoplay) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const run = () => {
      setCardNumber("");
      setHolderName("");
      at(600, () => setOpen(true));
      const digits = p.demoNumber.replace(/\D/g, "").slice(0, 16);
      [...digits].forEach((_, i) => at(1300 + i * 90, () => setCardNumber(formatCardNumber(digits.slice(0, i + 1)))));
      const typed = 1500 + digits.length * 90;
      [...p.demoName].forEach((_, i) => at(typed + i * 70, () => setHolderName(p.demoName.slice(0, i + 1).toUpperCase())));
      const named = typed + p.demoName.length * 70 + 400;
      BANKS.forEach((b, i) => at(named + i * 700, () => setBankId(b.id)));
      at(named + BANKS.length * 700 + 600, () => setOpen(false));
    };
    run();
    const loop = window.setInterval(run, p.loopMs);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [p.autoplay, p.loopMs, p.demoNumber, p.demoName]);

  // Escape closes the sheet, and the page behind it shouldn't scroll while
  // it's up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="relative flex min-h-full w-full items-center justify-center overflow-hidden" style={{ minHeight: "100%" }}>
      {/* Ambient colour bloom behind everything, tinted by the active bank —
          the soft light Apple puts behind Wallet surfaces. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full blur-[120px]"
        animate={{ backgroundColor: bank.swatch, opacity: open ? 0.5 : 0.32 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />

      {!open && (
        <motion.button
          layoutId="card-sheet"
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={SHEET_SPRING}
          className="relative flex items-center gap-3.5 rounded-[22px] border border-white/40 bg-white/55 py-3.5 pl-3.5 pr-6 shadow-[0_8px_32px_rgba(0,0,0,0.14)] backdrop-blur-2xl"
        >
          <motion.span
            layoutId="card-face"
            className="block h-9 w-14 rounded-[9px] shadow-inner"
            style={{ background: bank.bloom }}
          />
          <motion.span
            layoutId="card-label"
            className="font-card text-[15px] font-semibold tracking-[-0.01em] text-neutral-900"
          >
            Choose your card
          </motion.span>
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: `blur(${p.blur}px)` }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: p.backdropMs / 1000, ease: EASE_OUT }}
            style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              layoutId="card-sheet"
              transition={SHEET_SPRING}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Card details"
              className="w-full max-w-[440px] rounded-[34px] border border-white/50 bg-white/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
            >
              <motion.div layoutId="card-face" className="rounded-[26px]">
                <AtmCard
                  bank={bank}
                  cardNumber={cardNumber}
                  onCardNumberChange={(v) => setCardNumber(formatCardNumber(v))}
                  holderName={holderName}
                  onHolderNameChange={(v) => setHolderName(v.toUpperCase().slice(0, 22))}
                  p={p}
                />
              </motion.div>

              <motion.p
                layoutId="card-label"
                className="mt-5 px-1 font-card text-[13px] font-semibold tracking-[-0.01em] text-neutral-500"
              >
                Choose your card
              </motion.p>

              {/* Bank picker — a sliding selection pill, Apple segmented style. */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4, ease: EASE_OUT }}
                className="mt-2 flex gap-1.5 rounded-[18px] bg-black/[0.05] p-1.5"
              >
                {BANKS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBankId(b.id)}
                    className="relative flex-1 rounded-[13px] px-2 py-2.5"
                  >
                    {b.id === bankId && (
                      <motion.span
                        layoutId="bank-pill"
                        transition={SHEET_SPRING}
                        className="absolute inset-0 rounded-[13px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
                      />
                    )}
                    <span className="relative flex flex-col items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: b.swatch }}
                      />
                      <span className="font-card text-[10.5px] font-semibold tracking-[-0.01em] text-neutral-700">
                        {b.name.replace(" Bank", "")}
                      </span>
                    </span>
                  </button>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOpen(false)}
                className="mt-2.5 w-full rounded-[16px] bg-neutral-900 py-3.5 font-card text-[15px] font-semibold tracking-[-0.01em] text-white"
              >
                Done
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
