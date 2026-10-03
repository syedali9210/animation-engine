export interface Bank {
  id: string;
  name: string;
  /** Soft colour blooms washed over the white titanium base, Apple-Card style. */
  bloom: string;
  /** Small colour chip used by the bank picker. */
  swatch: string;
}

// Apple Card is a white titanium slab with a faint colour wash that drifts
// across it. Each bank keeps that same base and only swaps the wash, so the
// theme change reads as light moving over the card rather than a repaint.
const WHITE_BASE =
  "linear-gradient(160deg,#ffffff 0%,#fafafa 40%,#f2f2f4 100%)";

const bloom = (...stops: string[]) => `${stops.join(",")},${WHITE_BASE}`;

export const BANKS: Bank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    swatch: "#2f6fd0",
    bloom: bloom(
      "radial-gradient(120% 90% at 12% 8%, rgba(47,111,208,0.30) 0%, rgba(47,111,208,0) 55%)",
      "radial-gradient(110% 80% at 92% 96%, rgba(120,88,220,0.26) 0%, rgba(120,88,220,0) 58%)"
    ),
  },
  {
    id: "icici",
    name: "ICICI Bank",
    swatch: "#e06a2b",
    bloom: bloom(
      "radial-gradient(120% 90% at 10% 6%, rgba(224,106,43,0.30) 0%, rgba(224,106,43,0) 55%)",
      "radial-gradient(110% 85% at 94% 98%, rgba(200,40,70,0.24) 0%, rgba(200,40,70,0) 58%)"
    ),
  },
  {
    id: "sbi",
    name: "State Bank",
    swatch: "#12a3a3",
    bloom: bloom(
      "radial-gradient(120% 90% at 14% 10%, rgba(18,163,163,0.30) 0%, rgba(18,163,163,0) 55%)",
      "radial-gradient(110% 80% at 90% 94%, rgba(40,120,200,0.24) 0%, rgba(40,120,200,0) 58%)"
    ),
  },
  {
    id: "axis",
    name: "Axis Bank",
    swatch: "#b4368c",
    bloom: bloom(
      "radial-gradient(120% 90% at 10% 8%, rgba(180,54,140,0.30) 0%, rgba(180,54,140,0) 55%)",
      "radial-gradient(110% 85% at 92% 96%, rgba(240,120,60,0.22) 0%, rgba(240,120,60,0) 58%)"
    ),
  },
];
