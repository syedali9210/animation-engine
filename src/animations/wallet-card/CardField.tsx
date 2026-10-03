import { motion } from "motion/react";
import HopChars from "./HopChars";

// An editable field that lives directly on the card face. A real <input> is
// laid transparently over the animated characters — it owns focus, caret,
// selection and the mobile keyboard, while HopChars draws the text that the
// user actually sees. Both layers render the same string in the same metrics,
// so the invisible caret lands exactly where the visible glyphs are.
interface CardFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
  inputMode?: "numeric" | "text";
  ariaLabel: string;
  hop?: { stiffness: number; damping: number };
}

export default function CardField({
  value,
  onChange,
  placeholder,
  className = "",
  inputMode = "text",
  ariaLabel,
  hop,
}: CardFieldProps) {
  const empty = value.length === 0;

  return (
    <span className="relative inline-block">
      {/* Visible layer */}
      {empty ? (
        <span className={`${className} opacity-30 select-none`}>{placeholder}</span>
      ) : (
        <HopChars text={value} className={className} {...hop} />
      )}

      {/* Invisible interactive layer, pinned exactly over the glyphs. */}
      <motion.input
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        whileFocus={{ scale: 1.015 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`${className} absolute inset-0 w-full rounded-md bg-transparent outline-none`}
        style={{
          color: "transparent",
          caretColor: "currentColor",
          // Keep the native selection highlight from covering the animated text.
          WebkitTextFillColor: "transparent",
        }}
      />
    </span>
  );
}
