// Ported from github.com/syedali9210/animation-chat. Scoped/adapted for this
// site: theming lives under `.chat-quiz` (chat-quiz.css) instead of `:root`,
// since the source's own `--card`/`--muted`/`--ring` etc. would otherwise
// collide with this site's real theme tokens of the same name. The icon set
// (originally a static string-per-glyph map in its own icons.ts) is dropped
// in favour of lucide-react, which this site already depends on.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Transition,
  type Variants,
} from "motion/react";
import {
  Check,
  CircleCheck,
  CircleDashed,
  FileSearch,
  Hammer,
  Hash,
  Info,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Trash,
  UserPlus,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import DitherField, { F, PRESETS, SWIRL_TINTS, type Preset } from "./DitherField";
import { BRAND } from "./brand";
import "./chat-quiz.css";
import { params as defaults, type Params } from "./params";

/** Shared card radius — the two cards must read as one family. */
const R = 20;

const LUCIDE: Record<string, LucideIcon> = {
  "rotate-ccw": RotateCcw,
  plus: Plus,
  "user-plus": UserPlus,
  info: Info,
  "layout-grid": LayoutGrid,
  "message-square": MessageSquare,
  "trash-2": Trash,
  hash: Hash,
  send: Send,
  "file-search": FileSearch,
  "wand-sparkles": WandSparkles,
  check: Check,
  "circle-dashed": CircleDashed,
  "circle-check": CircleCheck,
  hammer: Hammer,
  "list-checks": ListChecks,
  zap: Zap,
  mic: Mic,
};

const Icon = ({ name, className = "h-[15px] w-[15px]" }: { name: string; className?: string }) => {
  const Cmp = LUCIDE[name];
  if (!Cmp) return null;
  return <Cmp className={className} strokeWidth={1.9} aria-hidden />;
};

/* ---- motion system ----------------------------------------------------------
   One set of curves, used everywhere. Entrances ease out (fast start, soft
   landing), exits ease in (they should get out of the way), anything the user
   can interrupt is a spring. Timings for the question beats are the ones
   measured off the source recording via motiscope.                            */
type Bezier = [number, number, number, number];
const bez = (s: string) => (s.match(/-?[\d.]+/g) ?? []).map(Number) as Bezier;
let EASE_OUT: Bezier = [0.16, 1, 0.3, 1]; // expo-out: entrances, settles
let EASE_IN: Bezier = [0.7, 0, 0.84, 0]; // expo-in: exits
const EASE_SOFT: Bezier = [0.65, 0, 0.35, 1]; // symmetric: colour + state moves

/** press feedback and other short, interruptible reactions */
let SPRING_SNAP: Transition = { type: "spring", stiffness: 520, damping: 32, mass: 0.7 };
/** shared-layout highlight sliding between rows */
let SPRING_SLIDE: Transition = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 };
/** card <-> pill morph - a critically-damped spring reads smoother than a fixed curve */
let MORPH: Transition = { type: "spring", stiffness: 230, damping: 30, mass: 0.85 };

/* themed via CSS custom properties - Motion resolves var() in `animate`.
   Selection is monochrome on purpose: a saturated blue fought every other colour
   on screen and read like a default. */
const C = {
  text: "var(--text)",
  textOn: "var(--sel-ink)",
  ring: "var(--ring)",
  ringOn: "var(--sel-ink)",
  pillHover: "var(--hover)",
  clear: "rgba(0,0,0,0)",
};

const QUESTIONS = [
  {
    q: "How do you build UI these days?",
    options: [
      "Mostly agents, I review and steer",
      "AI-assisted, but I write the code",
      "Design in Figma, then hand off",
      "By hand, the old-fashioned way",
    ],
  },
  {
    q: "Where do new ideas take shape first?",
    options: ["A prompt to an agent", "A Figma canvas", "Straight into code"],
  },
  {
    q: "What do you still not trust AI with?",
    options: [
      "Visual taste and polish",
      "Architecture decisions",
      "Touching production code",
      "Honestly, I trust it everywhere",
    ],
  },
];

/** Options fade+lift in top-to-bottom behind the new question. */
let listVariants: Variants = {
  enter: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
  exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
};
let rowVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  enter: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.22, ease: EASE_IN },
  },
};

/* ---- marker rail ------------------------------------------------------------
   Icon column + content row, the shape a Marker/timeline takes. */
/** In-progress marker: a rotating arc, the way a Spinner reads in the rail. */
const Spinner = () => (
  <motion.svg
    viewBox="0 0 24 24"
    className="h-full w-full"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
  >
    <path d="M12 3a9 9 0 0 1 9 9" />
    <path d="M12 21a9 9 0 0 1-9-9" opacity={0.25} />
  </motion.svg>
);

/**
 * Thinking is staged, and each stage has its own sub-steps. The rail walks the
 * sub-steps, and when a stage runs out of them it hands over to the next stage
 * (which also swaps the swirl's palette via DitherField's variant table).
 */
const THINKING = [
  {
    label: "Submitting answers",
    icon: "send",
    steps: ["Validating selections", "Packaging context", "Handing off"],
  },
  {
    label: "Reading between the lines",
    icon: "file-search",
    steps: ["Parsing intent", "Matching prior answers"],
  },
  {
    label: "Shaping a response",
    icon: "wand-sparkles",
    steps: ["Drafting", "Tightening copy", "Final pass"],
  },
];
/** flat schedule: one entry per sub-step, so timing is a single index */
const BEATS = THINKING.flatMap((s, stage) =>
  s.steps.map((_, step) => ({ stage, step })),
);
let BEAT_MS = 620;

/* ---- composer commands ------------------------------------------------------
   `@` opens the app list; typing an app name drills into its commands. Picking
   one drops a token chip into the input, and whatever you type after it is the
   command's argument.                                                          */
const APPS = [
  {
    name: "Slack",
    slug: "slack",
    tint: "#e01e5a",
    preset: "slack" as Preset,
    commands: [
      "Create channel",
      "Invite users to channel",
      "Get channel info",
      "Send message blocks",
      "Send text message",
    ],
  },
  {
    name: "ClickUp",
    slug: "clickup",
    tint: "#7b68ee",
    preset: "clickup" as Preset,
    commands: ["Create task", "Assign task", "Close task"],
  },
  {
    name: "Cloudflare",
    slug: "cloudflare",
    tint: "#f6821f",
    preset: "cloudflare" as Preset,
    commands: ["Purge cache", "Add DNS record"],
  },
];
type App = (typeof APPS)[number];
type Chip = { app: App; command: string };
/** One flat row for both palettes. `run` is what selecting it does, so the
 *  renderer never has to know which kind of row it's drawing. */
type Row = {
  key: string;
  label: string;
  hint?: string;
  preset: Preset;
  icon?: string; // lucide name
  brand?: App; // brand glyph instead of a lucide one
  run: () => void;
};

/** Pick a lucide glyph for an integration command from its wording. */
const cmdIcon = (c: string) =>
  /create|add/i.test(c)
    ? "plus"
    : /invite|assign/i.test(c)
      ? "user-plus"
      : /info|get/i.test(c)
        ? "info"
        : /blocks/i.test(c)
          ? "layout-grid"
          : /message|send/i.test(c)
            ? "message-square"
            : /purge|close/i.test(c)
              ? "trash-2"
              : "hash";
const MODES = [
  { name: "Build", preset: "build" as Preset, icon: "hammer" },
  { name: "Plan", preset: "plan" as Preset, icon: "list-checks" },
  { name: "Execute", preset: "execute" as Preset, icon: "zap" },
];

/** Real brand glyph, tinted. Paths come from simple-icons (CC0). */
const AppMark = ({
  icon,
  tint,
  size = 14,
}: {
  icon: string;
  tint: string;
  size?: number;
}) => BRAND[icon] ? (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={tint}
    className="shrink-0"
    aria-hidden
  >
    <path d={BRAND[icon]} />
  </svg>
) : null;

/** "Question N of 3" - the digit rolls up on change. */
function Counter({ index }: { index: number }) {
  return (
    <p className="flex items-center gap-[3px] rounded-full bg-[var(--chip)] px-3 py-1.5 text-[12.5px] text-[var(--muted)] select-none sm:text-[13px]">
      Question
      <span className="relative inline-block h-4 w-[7px] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="absolute inset-0 text-center tabular-nums"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
          >
            {index + 1}
          </motion.span>
        </AnimatePresence>
      </span>
      of {QUESTIONS.length}
    </p>
  );
}

/** Expanding ripple left behind by a click, at the click point. */
function Ripple({ at }: { at: { x: number; y: number } | null }) {
  return (
    <AnimatePresence>
      {at && (
        <motion.span
          key={`${at.x}-${at.y}`}
          className="pointer-events-none absolute h-6 w-6 rounded-full border border-blue-400/60 bg-blue-400/15"
          style={{ left: at.x - 12, top: at.y - 12 }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 2.6, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />
      )}
    </AnimatePresence>
  );
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Mirrors params.ts into the motion constants above. Runs every render, so the values are live. */
function tune(p: Params) {
  EASE_OUT = bez(p.easeOut);
  EASE_IN = bez(p.easeIn);
  SPRING_SNAP = { type: "spring", stiffness: p.snapStiffness, damping: p.snapDamping, mass: 0.7 };
  SPRING_SLIDE = { type: "spring", stiffness: p.slideStiffness, damping: p.slideDamping, mass: 0.9 };
  MORPH = { type: "spring", stiffness: p.morphStiffness, damping: p.morphDamping, mass: 0.85 };
  BEAT_MS = p.beatMs;
  listVariants = {
    enter: { transition: { staggerChildren: p.staggerMs / 1000, delayChildren: 0.06 } },
    exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
  };
  rowVariants = {
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    enter: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: p.rowEnterMs / 1000, ease: EASE_OUT } },
    exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: p.rowExitMs / 1000, ease: EASE_IN } },
  };
  [p.stage1, p.stage2, p.stage3].forEach((c, i) => (SWIRL_TINTS[i] = c));
  Object.assign(PRESETS.build, { deep: rgb(p.fieldDeep), bright: rgb(p.fieldBright) });
  Object.assign(F, { cell: p.cell, dot: p.dot, k: p.spring, damp: p.damping, push: p.push, waveSpeed: p.waveSpeed });
}

export default function ChatQuiz({ p = defaults }: { p?: Params }) {
  tune(p);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "quiz" | "thinking">("idle");
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [beat, setBeat] = useState(0); // index into BEATS while thinking
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [chip, setChip] = useState<Chip | null>(null);
  const [cursor, setCursor] = useState(0); // highlighted row in the command menu
  const [queue, setQueue] = useState<{ chip: Chip; arg: string }[]>([]);
  const [mode, setMode] = useState(MODES[0]);
  const [modeOpen, setModeOpen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [custom, setCustom] = useState(""); // the user's own answer, if they add one
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // the two card views are both absolute; this spacer height is what the card
  // animates between, measured off whichever view is currently active
  const quizRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(0);
  const [pulse, setPulse] = useState(0); // bump to fire a shockwave through the lattice
  const timers = useRef<number[]>([]);
  // Guards the scheduled advance() in pick() — see there for why.
  const advancing = useRef(false);

  const after = (ms: number, fn: () => void) =>
    timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // hands-free demo loop (params.autoplay): the whole sequence plays without anyone typing
  const replayRef = useRef(replay);
  replayRef.current = replay;
  useEffect(() => {
    if (!p.autoplay) return;
    replayRef.current();
    const t = window.setInterval(() => replayRef.current(), p.loopMs);
    return () => clearInterval(t);
  }, [p.autoplay, p.loopMs]);

  const last = index === QUESTIONS.length - 1;
  const pill = phase === "thinking"; // the collapsed state
  const submitReady = last && picked !== null;
  const question = QUESTIONS[index];
  const thought = BEATS[Math.min(beat, BEATS.length - 1)].stage;
  const subStep = BEATS[Math.min(beat, BEATS.length - 1)].step;

  // track the active view's natural height so the card has something to spring to
  useEffect(() => {
    const el = pill ? pillRef.current : quizRef.current;
    if (!el) return;
    const read = () => setViewH(el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pill, open, index, beat, phase, queue.length, picked]);

  /** hand off from the question card to the staged thinking pill */
  function startThinking() {
    setPhase("thinking");
    setBeat(0);
    setOpen(false);
    // walk the flat schedule; the stage changes whenever its sub-steps run out
    BEATS.forEach((_, i) => i && after(BEAT_MS * i, () => setBeat(i)));
    after(BEAT_MS * BEATS.length + 500, () => {
      setIndex(0);
      setPicked(null);
      setQueue([]);
      setPhase("idle");
    });
  }

  function advance() {
    if (last) {
      startThinking();
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
    setHovered(null); // the shared highlight shouldn't carry over to a new list
  }

  /** Runs the whole sequence hands-free: a command is typed, sent, the card wakes
   *  with a question, each answer lands, then it hands off to thinking. */
  function replay() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const demo: Chip = { app: APPS[0], command: APPS[0].commands[1] };
    setPhase("idle");
    setQueue([]);
    setChip(null);
    setDraft("");
    setIndex(0);
    setPicked(null);
    setCustom("");
    setBeat(0);
    setOpen(false);
    setVoice(false);
    setDismissed(false);

    after(450, () => setChip(demo)); // the action appears in the composer
    after(950, () => setDraft("Pat Wasik")); // ...then its argument
    after(1800, () => {
      setQueue([{ chip: demo, arg: "Pat Wasik" }]);
      setChip(null);
      setDraft("");
      setPhase("quiz"); // card wakes with the first question
    });
    // answer each question, pausing on the choice before moving on
    const answers = [0, 1, 0];
    answers.forEach((a, q) => {
      after(2900 + q * 1300, () => setPicked(a));
      after(3400 + q * 1300, () => {
        if (q < answers.length - 1) {
          setIndex(q + 1);
          setPicked(null);
        } else startThinking();
      });
    });
  }

  function rippleAt(e: React.MouseEvent<HTMLElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - box.left, y: e.clientY - box.top });
  }

  function pick(i: number) {
    setPicked(i);
    // A second pick landing inside the 420ms window (a fast double-tap, easy
    // to hit on a touchscreen) must not schedule a second advance() — two
    // firing back to back both take the "not last" branch and bump `index`
    // twice, pushing it past QUESTIONS' last index and crashing on
    // `question.q`. The ref (unlike `last`, which advance() would otherwise
    // close over stale) is always current at fire time.
    if (!last && !advancing.current) {
      advancing.current = true;
      after(420, () => {
        advancing.current = false;
        advance();
      });
    }
  }

  /* --- palettes ------------------------------------------------------------
     Two triggers, one renderer: `/` is the command palette, `@` picks an app
     and then drills into that app's actions.                                 */
  const slash = !chip && draft.startsWith("/") ? draft.slice(1).trimStart() : null;
  const at = !chip && draft.startsWith("@") ? draft.slice(1).trimStart() : null;
  const query = slash ?? at;
  // once an `@` query names an app, the palette drills into its commands
  const drill =
    at !== null
      ? APPS.find((a) => at.toLowerCase().startsWith(a.name.toLowerCase()))
      : undefined;
  const rest = (drill ? at!.slice(drill.name.length).trim() : (query ?? "")).toLowerCase();

  const menuRows: Row[] = useMemo(() => {
    const match = (s: string) => s.toLowerCase().includes(rest);
    if (drill)
      return drill.commands.filter(match).map((command) => ({
        key: command,
        label: command,
        preset: drill.preset,
        icon: cmdIcon(command),
        run: () => {
          setChip({ app: drill, command });
          setDraft("");
        },
      }));
    if (at !== null)
      return APPS.filter((a) => match(a.name)).map((app) => ({
        key: app.slug,
        label: `@${app.slug}`,
        hint: `${app.commands.length} actions`,
        preset: app.preset,
        brand: app,
        run: () => setDraft(`@${app.name} `),
      }));
    if (slash !== null) {
      const cmds: Row[] = [
        ...MODES.map((m) => ({
          key: m.name,
          label: `/${m.name.toLowerCase()}`,
          hint: "Mode",
          preset: m.preset,
          icon: m.icon,
          run: () => {
            setMode(m);
            setDraft("");
          },
        })),
        {
          key: "voice",
          label: "/voice",
          hint: "Dictate",
          preset: "voice" as Preset,
          icon: "mic",
          run: () => {
            setVoice(true);
            setDraft("");
          },
        },
        {
          key: "apps",
          label: "/apps",
          hint: "Integrations",
          preset: "command" as Preset,
          icon: "layout-grid",
          run: () => setDraft("@"),
        },
      ];
      return cmds.filter((r) => match(r.label.slice(1)));
    }
    return [];
  }, [slash, at, drill, rest]);
  const menuOpen = menuRows.length > 0;
  const active = menuRows[Math.min(cursor, menuRows.length - 1)];

  function choose(row: Row) {
    row.run();
    setCursor(0);
    inputRef.current?.focus();
  }

  /* --- send / run ---------------------------------------------------------- */
  const running = phase === "thinking";
  const canSend = !running && (chip !== null || draft.trim().length > 0);
  /** what the field is currently tuned to — browsing the palette previews each
   *  row's register, otherwise the toolbar mode holds */
  const fieldPreset: Preset = voice
    ? "voice"
    : chip
      ? chip.app.preset
      : menuOpen
        ? (active?.preset ?? "command")
        : query !== null
          ? "command"
          : mode.preset;

  /** Both a typed request and a picked action land the same way: the card above
   *  wakes up and asks a clarifying question first. Thinking comes after that. */
  function send() {
    if (!canSend) return;
    setPulse((n) => n + 1); // the send is the loudest event in the composer
    if (chip) setQueue([{ chip, arg: draft.trim() }]);
    setChip(null);
    setDraft("");
    setDismissed(false);
    setIndex(0);
    setPicked(null);
    setCustom("");
    setBeat(0);
    setPhase("quiz");
  }

  function stop() {
    timers.current.forEach(clearTimeout);
    setPhase("idle");
    setQueue([]);
  }

  /** roving arrow keys through the options, the way a real radiogroup behaves */
  function onListKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const rows = [...e.currentTarget.querySelectorAll("button")];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = (at + dir + rows.length) % rows.length;
    rows[next]?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="chat-quiz relative flex w-full max-w-[760px] flex-col gap-3">
      {/* ---- replay ---- */}
      <div className="flex justify-end gap-2">
        <motion.button
          onClick={replay}
          aria-label="Replay the sequence"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92, rotate: -40 }}
          transition={SPRING_SNAP}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--edge)] bg-[var(--card)] text-[var(--muted)] shadow-[var(--shadow)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
        >
          <Icon name="rotate-ccw" className="h-[15px] w-[15px]" />
        </motion.button>
      </div>

      {/* ---- quiz card / thinking pill ---- */}
      {/* the card only exists once the composer wakes it — idle is an empty slot */}
      <AnimatePresence initial={false} mode="popLayout">
      {phase !== "idle" && !dismissed && (
      <motion.div
        key="card"
        layout
        /* borderRadius must live in `style` - that's the only form Motion
           counter-scales during a layout animation. In `animate` it renders as a
           stretched ellipse mid-morph. 26px on a 49px-tall pill reads as fully
           round on its own, so nothing needs to animate. */
        style={{ borderRadius: R }}
        transition={{ layout: MORPH }}
        className={`relative z-0 overflow-hidden border border-[var(--edge)] bg-[var(--card)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:z-20 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--hair)] before:to-transparent ${
          /* expanded, it shares the composer's box exactly — inset on one side only
             read as a mistake. Only the collapsed pill pulls in, anchored right. */
          pill
            ? `-mb-5 self-center shadow-none ${open ? "w-[92%] sm:w-[86%]" : "w-[88%] sm:w-[78%]"}`
            : "w-full shadow-[var(--shadow)]"
        }`}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
      >
        {/* Both views are permanently absolute and a measured spacer drives the
            height. That's what lets them carry `layout`: Motion counter-scales
            them against the card's scale, so text no longer stretches mid-morph.
            (Previously they swapped relative<->absolute, and `layout` animated
            that positional jump instead — hence the sliding text.) */}
        <motion.div
          layout
          className="relative z-10"
          style={{ height: viewH || undefined }}
          transition={{ layout: MORPH }}
        >
          <motion.div
            layout
            ref={pillRef}
            role="button"
            tabIndex={pill ? 0 : -1}
            aria-expanded={open}
            /* the inactive view stays mounted for the morph, but it must leave the
               a11y tree — otherwise a screen reader announces a button that isn't there */
            aria-hidden={!pill}
            inert={!pill}
            /* target value, not a functional toggle: under StrictMode the updater
               runs twice and `o => !o` lands back where it started */
            onClick={() => setOpen(!open)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              (e.preventDefault(), setOpen(!open))
            }
            /* asymmetric: the pill's lower edge is tucked behind the chat box,
                 so the text is weighted into the half that stays visible */
            className={`absolute inset-x-0 top-0 cursor-pointer pt-3.5 pr-20 pb-4 pl-5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 ${
              pill ? "" : "pointer-events-none"
            }`}
            /* the outgoing view leaves fast, the incoming one waits for the box to
                 be most of the way there - otherwise both are legible at once and
                 the morph reads as mush */
            animate={{ opacity: pill ? 1 : 0 }}
            transition={{
              duration: pill ? 0.3 : 0.12,
              delay: pill ? 0.18 : 0,
              ease: EASE_OUT,
            }}
          >
            {/* the only signifier that this pill opens — without it, nothing tells
                you the steps are in there */}
            <motion.svg
              viewBox="0 0 24 24"
              className="absolute top-[17px] left-5 h-3.5 w-3.5 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: open ? 0 : -90 }}
              transition={SPRING_SLIDE}
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
            {/* same trick as the card: the inactive view leaves the flow rather than
                  unmounting, so the pill's height rides the one morph spring */}
            <div className="relative pl-6">
              <motion.div
                className={`${
                  open ? "relative" : "pointer-events-none absolute inset-x-0 top-0"
                }`}
                animate={{ opacity: open ? 1 : 0, y: open ? 0 : 4 }}
                transition={{ duration: open ? 0.35 : 0.12, ease: EASE_OUT }}
              >
                {/* the action that kicked this off, if one did */}
                {queue[0] && (
                  <div className="mb-2 flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                    <AppMark
                      icon={queue[0].chip.app.slug}
                      tint={queue[0].chip.app.tint}
                      size={12}
                    />
                    <span className="truncate">
                      {queue[0].chip.command}
                      {queue[0].arg && ` ${queue[0].arg}`}
                    </span>
                  </div>
                )}
                <ul className="space-y-1.5">
                  {THINKING.map(({ label, icon, steps }, i) => {
                    const active = i === thought;
                    const done = i < thought;
                    return (
                      <li key={label}>
                        <div className="flex items-center gap-3 text-[13px]">
                          {/* the running stage swaps its glyph for a spinner */}
                          <span
                            className="h-3.5 w-3.5 shrink-0"
                            style={{
                              color: active
                                ? SWIRL_TINTS[i]
                                : done
                                  ? "var(--muted)"
                                  : "var(--faint)",
                            }}
                          >
                            {active ? (
                              <Spinner />
                            ) : done ? (
                              <Icon name="circle-check" className="h-full w-full" />
                            ) : (
                              <Icon name={icon} className="h-full w-full" />
                            )}
                          </span>
                          {active ? (
                            <span
                              className="shimmer"
                              style={
                                { "--shim-base": SWIRL_TINTS[i] } as React.CSSProperties
                              }
                            >
                              {label}
                            </span>
                          ) : (
                            <span
                              className={
                                done ? "text-[var(--muted)]" : "text-[var(--faint)]"
                              }
                            >
                              {label}
                            </span>
                          )}
                        </div>

                        {/* sub-steps, only under the stage that's running */}
                        <AnimatePresence initial={false}>
                          {active && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.32, ease: EASE_OUT }}
                              className="ml-[7px] overflow-hidden border-l border-[var(--edge)] pl-[15px]"
                            >
                              {steps.map((st, j) => (
                                <li
                                  key={st}
                                  className="flex items-center gap-2 pt-1.5 text-[12px]"
                                >
                                  <span
                                    className="h-2.5 w-2.5 shrink-0"
                                    style={{
                                      color:
                                        j < subStep
                                          ? "var(--muted)"
                                          : j === subStep
                                            ? SWIRL_TINTS[i]
                                            : "var(--faint)",
                                    }}
                                  >
                                    <Icon
                                      name={j < subStep ? "check" : "circle-dashed"}
                                      className="h-full w-full"
                                    />
                                  </span>
                                  <span
                                    className={
                                      j === subStep
                                        ? "text-[var(--text)]"
                                        : "text-[var(--faint)]"
                                    }
                                  >
                                    {st}
                                  </span>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
              {/* collapsed: the stage rolls up, the sub-step trails it in muted text */}
              <motion.span
                className={`block h-[19px] w-full overflow-hidden ${
                  open ? "pointer-events-none absolute inset-x-0 top-0" : "relative"
                }`}
                animate={{ opacity: open ? 0 : 1 }}
                transition={{ duration: open ? 0.12 : 0.35, ease: EASE_OUT }}
              >
                <AnimatePresence initial={false}>
                  <motion.span
                    key={thought}
                    className="absolute inset-0 flex items-center gap-2.5 text-[13.5px] whitespace-nowrap"
                    initial={{ y: 16, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -16, opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.42, ease: EASE_OUT }}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: SWIRL_TINTS[thought % SWIRL_TINTS.length] }}
                    >
                      <Spinner />
                    </span>
                    <span
                      className="shimmer shrink-0"
                      style={
                        {
                          "--shim-base": SWIRL_TINTS[thought % SWIRL_TINTS.length],
                        } as React.CSSProperties
                      }
                    >
                      {THINKING[thought].label}
                    </span>
                    <span className="text-[var(--faint)]">·</span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={subStep}
                        className="truncate text-[12.5px] text-[var(--muted)]"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                      >
                        {THINKING[thought].steps[subStep]}
                      </motion.span>
                    </AnimatePresence>
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            layout
            ref={quizRef}
            /* same as the pill view: while it's the inactive one it must be out of
               the a11y tree AND unclickable — a hidden Skip that still fires is a bug */
            aria-hidden={pill}
            inert={pill}
            className={`absolute inset-x-0 top-0 px-4 pt-4 pb-3.5 sm:px-6 sm:pt-5 sm:pb-4 ${
              pill ? "pointer-events-none" : ""
            }`}
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={
              pill
                ? { opacity: 0, filter: "blur(5px)" }
                : { opacity: 1, filter: "blur(0px)" }
            }
            transition={{
              duration: pill ? 0.14 : 0.5,
              delay: pill ? 0 : 0.16,
              ease: EASE_OUT,
            }}
          >
            <motion.button
              aria-label="Dismiss quiz"
              onClick={() => setPhase("idle")}
              whileHover={{ backgroundColor: "var(--hover)" }}
              whileTap={{ scale: 0.92 }}
              className="absolute top-4 right-4 z-20 grid h-7 w-7 place-items-center rounded-full border border-[var(--btn-edge)] text-[var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 sm:top-5 sm:right-5"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </motion.button>

            {/* question + options swap together, keyed on the question index */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                variants={listVariants}
                initial="initial"
                animate="enter"
                exit="exit"
              >
                <motion.h2
                  variants={rowVariants}
                  className="pr-10 text-[15.5px] leading-snug font-semibold tracking-[-0.014em] text-balance text-[var(--title)] sm:text-[17px]"
                >
                  {question.q}
                </motion.h2>

                <div
                  role="radiogroup"
                  onKeyDown={onListKey}
                  onPointerLeave={() => setHovered(null)}
                  className="thin-scroll mt-2.5 max-h-[210px] overflow-y-auto pr-2 sm:mt-3 sm:max-h-[196px]"
                >
                  {question.options.map((opt, i) => {
                    const on = picked === i;
                    return (
                      <motion.button
                        key={opt}
                        variants={rowVariants}
                        role="radio"
                        aria-checked={on}
                        onClick={() => pick(i)}
                        onPointerEnter={() => setHovered(i)}
                        onFocus={() => setHovered(i)}
                        whileTap={{ scale: 0.985 }}
                        transition={SPRING_SNAP}
                        className="relative flex w-full items-center gap-3 rounded-full px-3.5 py-[7px] text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
                      >
                        {/* One highlight per state, shared across rows via layoutId — it
                            slides between options instead of cross-fading in place. */}
                        {hovered === i && !on && (
                          <motion.span
                            layoutId={`hover-${index}`}
                            className="absolute inset-0 rounded-full bg-[var(--hover)]"
                            transition={SPRING_SLIDE}
                          />
                        )}
                        {on && (
                          <motion.span
                            layoutId={`sel-${index}`}
                            className="absolute inset-0 rounded-full bg-[var(--sel)]"
                            transition={SPRING_SLIDE}
                          />
                        )}
                        <motion.span
                          className="relative grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-[1.5px]"
                          animate={{ borderColor: on ? C.ringOn : C.ring }}
                          transition={{ duration: 0.22, ease: EASE_OUT }}
                        >
                          <motion.span
                            className="h-[7px] w-[7px] rounded-full bg-[var(--sel-ink)]"
                            initial={false}
                            animate={{ scale: on ? 1 : 0 }}
                            transition={SPRING_SNAP}
                          />
                        </motion.span>
                        <motion.span
                          className="relative text-[13.5px] tracking-[-0.006em] sm:text-[14.5px]"
                          animate={{ color: on ? C.textOn : C.text }}
                          transition={{ duration: 0.22, ease: EASE_OUT }}
                        >
                          {opt}
                        </motion.span>
                      </motion.button>
                    );
                  })}

                  {/* none of the options fit? write your own — the answer set
                      shouldn't be a dead end */}
                  <motion.div
                    variants={rowVariants}
                    className="relative flex w-full items-center gap-3 rounded-full px-3.5 py-[7px]"
                  >
                    {picked === -1 && (
                      <motion.span
                        layoutId={`sel-${index}`}
                        className="absolute inset-0 rounded-full bg-[var(--sel)]"
                        transition={SPRING_SLIDE}
                      />
                    )}
                    <span
                      className="relative grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-[1.5px] border-dashed"
                      style={{
                        borderColor: picked === -1 ? C.ringOn : "var(--ring)",
                      }}
                    >
                      <motion.span
                        className="h-[7px] w-[7px] rounded-full bg-[var(--sel-ink)]"
                        initial={false}
                        animate={{ scale: picked === -1 ? 1 : 0 }}
                        transition={SPRING_SNAP}
                      />
                    </span>
                    <input
                      value={custom}
                      onChange={(e) => {
                        setCustom(e.target.value);
                        setPicked(e.target.value.trim() ? -1 : null);
                      }}
                      onFocus={() => setHovered(null)}
                      placeholder="Something else…"
                      className="relative w-full bg-transparent text-[13.5px] tracking-[-0.006em] outline-none placeholder:text-[var(--faint)] sm:text-[14.5px]"
                      style={{ color: picked === -1 ? C.textOn : C.text }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-3 flex items-center justify-between">
              <Counter index={index} />
              <motion.button
                layout
                onClick={(e) => {
                  rippleAt(e);
                  advance();
                }}
                whileTap={{ scale: 0.96 }}
                animate={
                  submitReady
                    ? {
                        backgroundColor: `${p.submit}e6`,
                        borderColor: "rgba(147,197,253,0.55)",
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "var(--btn)",
                        borderColor: "var(--btn-edge)",
                        color: "var(--muted)",
                      }
                }
                transition={{
                  duration: 0.35,
                  ease: EASE_SOFT,
                  layout: { duration: 0.35, ease: EASE_OUT },
                }}
                className="relative overflow-hidden rounded-full border px-5 py-2 text-[13.5px] backdrop-blur-sm sm:px-6 sm:text-[14px]"
              >
                {/* invisible sizer drives the pill width; labels roll over it */}
                <span className="relative block overflow-hidden">
                  <span className="invisible">
                    {submitReady ? "Submit" : "Skip"}
                  </span>
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={submitReady ? "submit" : "skip"}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                    >
                      {submitReady ? "Submit" : "Skip"}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {submitReady && <Ripple at={ripple} />}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* ---- chat composer ---- */}
      {/* wrapper exists so the command menu can escape the card's overflow clip */}
      <div className="relative z-10">
        <CommandMenu
          open={menuOpen}
          rows={menuRows}
          cursor={cursor}
          head={drill}
          title={at !== null ? "Apps" : "Commands"}
          onHover={setCursor}
          onPick={choose}
        />
        {/* the upward shadow is what makes the pill read as tucked *behind* this card */}
        <motion.div
          style={{ borderRadius: R }}
          data-dither-surface
          /* no `overflow-hidden` on the card itself — it was clipping the toolbar's
             own dropdowns. Only the canvas needs clipping, so it gets its own layer.
             No focus/command border tint either: the dither already signals both. */
          className="relative h-[102px] border border-[var(--edge)] bg-[var(--card)] shadow-[var(--shadow-up)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:z-20 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--hair)] before:to-transparent"
        >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: R }}
        >
          <DitherField interactive preset={fieldPreset} pulse={pulse} />
        </div>
        {/* column fills the card so the toolbar is pinned to the bottom edge
            rather than floating wherever the text happens to end */}
        <div className="relative z-10 flex h-full flex-col">
        {/* chip + field share a row: the chip is the command, the text after it
            is that command's argument */}
        <div className="flex flex-1 items-start gap-2 px-4 pt-3.5 sm:px-5">
          <AnimatePresence initial={false}>
            {chip && (
              <motion.span
                key={chip.command}
                initial={{ opacity: 0, scale: 0.7, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={SPRING_SNAP}
                className="mt-[1px] flex shrink-0 items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-1.5 text-[13px] whitespace-nowrap"
                style={{
                  color: "var(--title)",
                  background: `${chip.app.tint}1f`,
                  boxShadow: `inset 0 0 0 1px ${chip.app.tint}66`,
                }}
              >
                <AppMark icon={chip.app.slug} tint={chip.app.tint} />
                {chip.command}
                {/* without this the chip is unremovable once the field is empty —
                    backspace alone is not a signifier */}
                <button
                  aria-label="Remove command"
                  onClick={() => {
                    setChip(null);
                    inputRef.current?.focus();
                  }}
                  className="-mr-1 ml-0.5 grid h-4 w-4 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--title)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-2.5 w-2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </motion.span>
            )}
          </AnimatePresence>
          {/* a real field: it looked like an input before, which is a promise the UI
              couldn't keep. Enter sends, Shift+Enter breaks the line. */}
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (menuOpen) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const d = e.key === "ArrowDown" ? 1 : -1;
                  setCursor((c) => (c + d + menuRows.length) % menuRows.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  choose(menuRows[cursor]);
                  return;
                }
                if (e.key === "Escape") return setDraft("");
              }
              // backspace at the very start deletes the chip, like a token field
              if (e.key === "Backspace" && draft === "" && chip)
                return setChip(null);
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              chip
                ? ""
                : running
                  ? "Add a follow-up"
                  : "Ask anything — / for commands, @ for apps"
            }
            rows={1}
            className="h-[26px] w-full resize-none bg-transparent text-[14px] text-[var(--title)] outline-none placeholder:text-[var(--muted)] sm:text-[15px]"
          />
        </div>

        {/* ---- toolbar ---- */}
        <div className="flex items-center gap-2 px-4 pb-3 sm:px-5">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) =>
              setFiles([...(e.target.files ?? [])].map((f) => f.name))
            }
          />
          <ToolButton
            label="Attach files"
            onClick={() => fileRef.current?.click()}
          >
            <path d="M12 5v14M5 12h14" />
          </ToolButton>

          {/* mode: Build / Plan / Execute */}
          <div className="relative">
            <motion.button
              onClick={() => setModeOpen(!modeOpen)}
              whileTap={{ scale: 0.96 }}
              transition={SPRING_SNAP}
              aria-expanded={modeOpen}
              className="flex items-center gap-1.5 rounded-full border border-[var(--btn-edge)] bg-[var(--btn)] py-[5px] pr-2 pl-3 text-[12.5px] text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
            >
              {mode.name}
              <motion.svg
                viewBox="0 0 24 24"
                className="h-3 w-3 text-[var(--muted)]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ rotate: modeOpen ? 180 : 0 }}
                transition={SPRING_SLIDE}
              >
                <path d="M6 9l6 6 6-6" />
              </motion.svg>
            </motion.button>
            <AnimatePresence>
              {modeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="absolute bottom-full left-0 z-40 mb-2 w-[132px] origin-bottom-left rounded-xl border border-[var(--edge)] bg-[var(--card)] p-1 shadow-[var(--shadow)]"
                >
                  {MODES.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        setMode(m);
                        setModeOpen(false);
                      }}
                      className="relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[var(--text)]"
                    >
                      {m.name === mode.name && (
                        <motion.span
                          layoutId="mode-cursor"
                          className="absolute inset-0 rounded-lg bg-[var(--hover)]"
                          transition={SPRING_SLIDE}
                        />
                      )}
                      <Icon
                        name={m.icon}
                        className="relative h-[13px] w-[13px] text-[var(--muted)]"
                      />
                      <span className="relative">{m.name}</span>
                      {m.name === mode.name && (
                        <Icon
                          name="check"
                          className="relative ml-auto h-3 w-3 text-[var(--title)]"
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {files.length > 0 && (
            <span className="truncate text-[12px] text-[var(--muted)]">
              {files.length === 1 ? files[0] : `${files.length} files`}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ToolButton
              label={voice ? "Stop dictation" : "Voice input"}
              onClick={() => setVoice(!voice)}
              active={voice}
              tint={`rgb(${PRESETS.voice.bright.join(",")})`}
            >
              <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
            </ToolButton>
            {/* send doubles as stop while a task runs, the way the source clip does it */}
            <motion.button
          aria-label={running ? "Stop task" : "Send message"}
          onClick={running ? stop : send}
          disabled={!running && !canSend}
          /* opaque, not translucent: it sits over the densest part of the dither
             and a see-through fill disappeared into the dots */
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-[var(--edge)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 disabled:cursor-default"
          animate={
            canSend || running
              ? { backgroundColor: "var(--send-on)", color: "var(--send-ink-on)" }
              : { backgroundColor: "var(--send)", color: "var(--send-ink)" }
          }
          whileHover={canSend || running ? { scale: 1.07 } : undefined}
          whileTap={canSend || running ? { scale: 0.93 } : undefined}
          transition={{ duration: 0.32, ease: EASE_SOFT }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={running ? "stop" : "send"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={SPRING_SNAP}
            >
              {running ? (
                <span className="block h-2.5 w-2.5 rounded-[3px] bg-current" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-[15px] w-[15px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              )}
            </motion.span>
          </AnimatePresence>
            </motion.button>
          </div>
        </div>
        </div>
        </motion.div>
      </div>
      </div>
    </MotionConfig>
  );
}

/** Small ghost icon button used across the composer toolbar. */
function ToolButton({
  label,
  onClick,
  active,
  tint,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  tint?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={{
        color: active && tint ? tint : "var(--text)",
        borderColor: active && tint ? tint : "var(--edge)",
      }}
      transition={SPRING_SNAP}
      /* Fully opaque and matched to the send button: `--btn` is translucent, so
         over the densest dither the disc still read as a smudge, and `--muted`
         ink on top of that was barely there. */
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-[var(--send)] text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </motion.button>
  );
}

/** `/` palette: apps, their commands, modes and voice. Rises from the composer's
 *  top edge and shares its left and right edges. */
function CommandMenu({
  open,
  rows,
  cursor,
  head,
  title,
  onHover,
  onPick,
}: {
  open: boolean;
  rows: Row[];
  cursor: number;
  head?: App;
  title: string;
  onHover: (i: number) => void;
  onPick: (r: Row) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.26, ease: EASE_OUT }}
          /* inset-x-0 so the palette lines up with the composer's own edges */
          className="absolute inset-x-0 bottom-full z-40 mb-2 origin-bottom overflow-hidden border border-[var(--edge)] bg-[var(--card)] shadow-[var(--shadow)]"
          style={{ borderRadius: R }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
            {head && <AppMark icon={head.slug} tint={head.tint} size={13} />}
            <p className="text-[11.5px] font-medium tracking-[0.06em] text-[var(--faint)] uppercase">
              {head ? head.name : title}
            </p>
          </div>

          <div className="max-h-[228px] overflow-y-auto p-1.5 pt-0">
            {rows.map((r, i) => (
              <button
                key={r.key}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the field
                  onPick(r);
                }}
                onPointerEnter={() => onHover(i)}
                className="relative flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-[13px] text-[var(--text)]"
              >
                {i === cursor && (
                  <motion.span
                    layoutId="cmd-cursor"
                    className="absolute inset-0 rounded-[14px] bg-[var(--hover)] ring-1 ring-[var(--edge)] ring-inset"
                    transition={SPRING_SLIDE}
                  />
                )}
                {/* icon sits on its own tile so rows line up whatever the glyph */}
                <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--chip)] text-[var(--muted)]">
                  {r.brand ? (
                    <AppMark icon={r.brand.slug} tint={r.brand.tint} size={13} />
                  ) : (
                    <Icon name={r.icon ?? "hash"} className="h-[13px] w-[13px]" />
                  )}
                </span>
                <span className="relative truncate">{r.label}</span>
                {r.hint && (
                  <span className="relative ml-auto shrink-0 text-[11.5px] text-[var(--faint)]">
                    {r.hint}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
