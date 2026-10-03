import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import LinkedinIcon from "./LinkedinIcon";
import GithubIcon from "./GithubIcon";
import { params as defaults, type Params } from "./params";

// Module-level so NotchEar shares them; NotchCard refreshes them from params on every render.
let CARD_BG = defaults.background;
let SPRING = { type: "spring" as const, bounce: defaults.bounce, duration: defaults.durationMs / 1000 };

const SOCIAL_LINKS = [
  { label: "LinkedIn", icon: LinkedinIcon, href: "https://www.linkedin.com/in/syedali138/" },
  { label: "Email", icon: Mail, href: "mailto:syedwali9286@gmail.com" },
  { label: "GitHub", icon: GithubIcon, href: "https://github.com/syedali9210" },
];

function useLiveClock(timeZone: string) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone,
        })
      );
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [timeZone]);

  return now;
}

// Below md (768px) there's no hover, so the notch needs a tap trigger instead.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

// One of the two "ear" pieces that carve a concave curve from the flat top
// edge into the card's rounded bottom corner — the actual notch illusion.
// A clipped box holds an oversized, offset box-shadow copy of the card's
// own color, so only a quarter-circle sliver of it peeks through, joining
// the flat top edge to the card's curve.
function NotchEar({ side, open }: { side: "left" | "right"; open: boolean }) {
  const size = open ? 48 : 24;
  const radius = open ? 32 : 12;
  const isLeft = side === "left";

  return (
    <motion.div
      initial={false}
      animate={{ width: size, height: size, [isLeft ? "left" : "right"]: -size }}
      transition={SPRING}
      className="pointer-events-none absolute top-0 z-0"
    >
      <div
        className="absolute overflow-hidden"
        style={
          isLeft
            ? { top: 0, right: 0, bottom: -24, left: -24 }
            : { top: 0, left: 0, bottom: -24, right: -24 }
        }
      >
        <motion.div
          initial={false}
          animate={{
            borderTopLeftRadius: isLeft ? 0 : radius,
            borderTopRightRadius: isLeft ? radius : 0,
          }}
          transition={SPRING}
          className="absolute inset-0"
          style={{ boxShadow: `${isLeft ? 8 : -8}px -34px 0px 1px ${CARD_BG}` }}
        />
      </div>
    </motion.div>
  );
}

interface DynamicInfoCardProps {
  // Reports the card's live rendered height (ears excluded) so layout below
  // it can track the expand/collapse animation.
  onHeightChange?: (height: number) => void;
  // "fixed" pins the notch to the viewport as page chrome. "embedded"
  // positions it relative to a `relative`-positioned ancestor instead, for
  // reusing the exact same component as a contained showcase piece.
  variant?: "fixed" | "embedded";
  p?: Params;
}

// A persistent, always-on-top profile widget styled after a MacBook notch:
// flush against the top, flat on top, rounded only on the bottom. Collapsed
// it's just avatar + name + live clock; hovering it grows the notch to
// reveal social links and an availability badge. Intentionally stays black
// regardless of site theme — that's the real notch's actual color.
export default function DynamicInfoCard({
  onHeightChange,
  variant = "embedded",
  p = defaults,
}: DynamicInfoCardProps) {
  CARD_BG = p.background;
  SPRING = { type: "spring" as const, bounce: p.bounce, duration: p.durationMs / 1000 };
  const AVAILABLE_GREEN = p.available;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const formatted = useLiveClock(p.timeZone);
  const isMobile = useIsMobile();

  // hands-free demo: open and close on a timer so the morph plays without a cursor
  useEffect(() => {
    if (!p.autoplay) return;
    const t = setInterval(() => setOpen((o) => !o), p.intervalMs);
    return () => clearInterval(t);
  }, [p.autoplay, p.intervalMs]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeightChange) return;
    onHeightChange(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(([entry]) => onHeightChange(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  // Mobile has no hover, so an open notch only closes again on an outside tap.
  useEffect(() => {
    if (!isMobile || !open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isMobile, open]);

  return (
    <div
      className={`left-1/2 z-50 -translate-x-1/2 ${
        variant === "embedded" ? "absolute top-0" : "fixed top-0"
      }`}
    >
      <div
        ref={ref}
        className="relative"
        onMouseEnter={isMobile ? undefined : () => setOpen(true)}
        onMouseLeave={isMobile ? undefined : () => setOpen(false)}
        onClick={isMobile ? () => setOpen((v) => !v) : undefined}
      >
        <NotchEar side="left" open={open} />
        <NotchEar side="right" open={open} />

        <motion.div
          layout
          initial={false}
          animate={{ padding: open ? 12 : 8 }}
          transition={SPRING}
          className="relative z-[1] flex flex-col items-center gap-3 rounded-b-[20px]"
          style={{ backgroundColor: CARD_BG }}
        >
          <motion.div layout className="flex items-center justify-center gap-6 sm:gap-[60px]">
            <span className="flex items-center gap-2">
              <span className="relative flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5">
                <img src="/anim/notch-card/avatar.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[14px] font-medium tracking-[-0.04em] text-white">{p.name}</span>
                <span className="text-[14px] tracking-[-0.04em] text-white/60">{p.role}</span>
              </span>
            </span>
            <span className="text-[14px] font-medium tracking-[-0.04em] whitespace-nowrap text-white tabular-nums">
              {formatted ?? " "}
            </span>
          </motion.div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING}
                className="flex w-full flex-col items-center gap-3 overflow-hidden"
              >
                <div className="flex w-full items-center justify-between gap-8">
                  <div className="flex items-center gap-1">
                    {SOCIAL_LINKS.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        aria-label={link.label}
                        className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                      >
                        <link.icon className="size-3.5 text-white" />
                      </a>
                    ))}
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.04em] whitespace-nowrap"
                    style={{ color: AVAILABLE_GREEN }}
                  >
                    <span className="relative flex size-1.5 shrink-0">
                      <span
                        className="absolute inline-flex size-full animate-ping rounded-full"
                        style={{ backgroundColor: AVAILABLE_GREEN, opacity: 0.5 }}
                      />
                      <span
                        className="relative inline-flex size-1.5 rounded-full"
                        style={{ backgroundColor: AVAILABLE_GREEN, boxShadow: "0px 0px 20px 0px rgba(80,112,86,0.5)" }}
                      />
                    </span>
                    Available
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
