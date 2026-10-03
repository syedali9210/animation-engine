import { AnimatePresence, motion } from "motion/react";

// Renders text one character at a time, each new char hopping in with a
// small bounce instead of just appearing — used for the card number and
// holder name as the user types them.
export default function HopChars({ text, className, stiffness = 500, damping = 24 }: { text: string; className?: string; stiffness?: number; damping?: number }) {
  return (
    <span className={className} style={{ display: "inline-flex" }}>
      <AnimatePresence initial={false}>
        {text.split("").map((ch, i) => (
          <motion.span
            key={i}
            initial={{ y: 14, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness, damping, mass: 0.6 }}
            style={{ display: "inline-block", whiteSpace: "pre" }}
          >
            {ch}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
