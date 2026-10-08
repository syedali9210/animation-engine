import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MagnifyingGlass, Plus, Stack, X } from "@phosphor-icons/react";
import { ANIMS, CATEGORIES, type AnimMeta, type Category, type Values } from "./registry";
import { CATEGORY_ICON, IconButton, Kbd, Logo, rove } from "./ui";

/** The library: every animation as a card with its still; hovering one plays it live. The screen you're building
    sits on top, like an inbox above the projects. */
export default function Library({
  id,
  onPick,
  onAdd,
  overrides,
  searchRef,
  onClose,
  visible,
  screen,
  onScreen,
  layers,
  onDrag,
  dark,
  previewSrc,
  footer,
  bare,
}: {
  id: string;
  /** open an animation */
  onPick: (id: string) => void;
  /** put an animation on the screen you're building */
  onAdd: (id: string) => void;
  overrides: Record<string, Values>;
  searchRef: RefObject<HTMLInputElement | null>;
  /** set when it's a drawer */
  onClose?: () => void;
  visible: boolean;
  /** the screen builder is open */
  screen: boolean;
  onScreen: () => void;
  /** animations on the screen */
  layers: number;
  /** start dragging an animation out towards a screen (mouse and pen; touch adds with the + button) */
  onDrag?: (id: string, x: number, y: number) => void;
  dark: boolean;
  previewSrc: (a: AnimMeta) => string;
  footer: ReactNode;
  /** inside a panel that has its own header: no logo row */
  bare?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const current = useRef<HTMLButtonElement>(null);
  // keep the animation you're looking at in view: on open, and when [ ] steps through the list
  useEffect(() => {
    if (!visible) return;
    const f = requestAnimationFrame(() => current.current?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(f);
  }, [visible, id]);
  const q = query.trim().toLowerCase();
  const list = ANIMS.filter((a) => !q || [a.name, a.blurb, a.category, ...a.tech].join(" ").toLowerCase().includes(q));
  const groups = CATEGORIES.filter((c) => cat === "All" || c === cat)
    .map((c) => [c, list.filter((a) => a.category === c)] as const)
    .filter(([, l]) => l.length);
  const cats = ["All", ...CATEGORIES] as const;
  const edited = (a: AnimMeta) => Object.entries(overrides[a.id] ?? {}).some(([k, v]) => v !== a.params[k]);

  return (
    <div className="flex h-full flex-col bg-surface">
      {!bare && (
        <div className="flex h-12 shrink-0 items-center gap-2.5 pl-4 pr-2">
          <Logo size={20} />
          <h1 className="text-body font-semibold tracking-[-0.01em]">Animation Engine</h1>
          {onClose && (
            <span className="ml-auto">
              <IconButton label="Close library" size="lg" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </span>
          )}
        </div>
      )}
      <div className={`space-y-1 px-3 pb-3 ${bare ? "pt-3" : ""}`}>
        <label className="flex h-8 items-center gap-2 rounded-md bg-surface px-2.5 text-fg-3 shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--fg)] dark:bg-surface-2">
          <MagnifyingGlass size={15} aria-hidden className="shrink-0" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search animations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              } else if (e.key === "Escape") e.currentTarget.blur();
              if (e.key === "Enter" && list[0]) onPick(list[0].id);
            }}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-3 pointer-coarse:text-[16px] [&::-webkit-search-cancel-button]:hidden"
          />
          <span className="pointer-coarse:hidden">
            <Kbd>/</Kbd>
          </span>
        </label>
        <button
          type="button"
          onClick={onScreen}
          aria-current={screen || undefined}
          className={`press flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-body ${screen ? "bg-surface-3 font-medium text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg"}`}
        >
          <Stack size={16} aria-hidden className="shrink-0" />
          Screen builder
          {layers > 0 && <span className="ml-auto text-caption tabular-nums text-fg-3">{layers}</span>}
        </button>
      </div>
      <nav aria-label="Animations" className="scroll-thin min-h-0 flex-1 overflow-y-auto border-t px-3 pb-6">
        {/* narrows the grid to one group; stays put while the grid scrolls */}
        <div className="sticky top-0 z-10 -mx-3 bg-surface pb-1 pt-3">
          <div
            role="radiogroup"
            aria-label="Show"
            onKeyDown={(e) => rove(e, [...cats], cat, setCat, "radio")}
            className="no-scrollbar flex gap-1 overflow-x-auto px-3 [mask-image:linear-gradient(to_right,#000_calc(100%-20px),transparent)]"
          >
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cat === c}
                tabIndex={cat === c ? 0 : -1}
                onClick={() => setCat(c)}
                className={`press h-7 shrink-0 rounded-full px-2.5 text-caption font-medium pointer-coarse:h-9 pointer-coarse:px-3.5 ${cat === c ? "bg-fg text-surface" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:text-fg"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {groups.map(([c, items]) => {
          const CatIcon = CATEGORY_ICON[c];
          return (
            <section key={c} aria-label={c}>
              <h2 className="flex items-center gap-1.5 px-0.5 pb-2.5 pt-4 text-caption font-medium text-fg-3">
                <CatIcon size={14} aria-hidden />
                {c}
                <span className="ml-auto tabular-nums">{items.length}</span>
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-2 gap-y-3.5">
                {items.map((a) => (
                  <Card
                    key={a.id}
                    a={a}
                    on={!screen && a.id === id}
                    cardRef={!screen && a.id === id ? current : undefined}
                    edited={edited(a)}
                    screen={screen}
                    onPick={() => onPick(a.id)}
                    onAdd={() => onAdd(a.id)}
                    onDrag={onDrag}
                    dark={dark}
                    previewSrc={previewSrc}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {!groups.length && (
          <p className="px-3 py-10 text-center text-body text-fg-3">
            {query ? `Nothing matches “${query}”` : "Nothing here yet"}
            {cat !== "All" && (
              <>
                {" in "}
                {cat}.{" "}
                <button type="button" onClick={() => setCat("All")} className="font-medium text-fg underline decoration-fg-3 underline-offset-4">
                  Search everything
                </button>
              </>
            )}
          </p>
        )}
      </nav>
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-t px-2">
        {footer}
        <span className="ml-auto pr-2 text-caption tabular-nums text-fg-3">{ANIMS.length} animations</span>
      </div>
    </div>
  );
}

/* the card's still is cropped from an iPhone-sized page: its top for a full-screen app, else around the middle */
const PAGE = { w: 402, h: 874 };
const cropTop = (a: AnimMeta) => {
  const ch = (PAGE.w * 3) / 4;
  const y = a.poster?.y ?? (a.layout === "fill" ? 0 : 0.5);
  return Math.round(Math.min(PAGE.h - ch, Math.max(0, y * PAGE.h - ch / 2)));
};
const fine = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;

function Card({
  a,
  on,
  cardRef,
  edited,
  screen,
  onPick,
  onAdd,
  onDrag,
  dark,
  previewSrc,
}: {
  a: AnimMeta;
  on: boolean;
  cardRef?: RefObject<HTMLButtonElement | null>;
  edited: boolean;
  screen: boolean;
  onPick: () => void;
  onAdd: () => void;
  onDrag?: (id: string, x: number, y: number) => void;
  dark: boolean;
  previewSrc: (a: AnimMeta) => string;
}) {
  const [poster, setPoster] = useState(true); // false once its still turns out to be missing
  // hover: after a beat, the live animation replaces the still (one card at a time, mouse only)
  const [live, setLive] = useState<{ scale: number } | null>(null);
  const [shown, setShown] = useState(false);
  const thumb = useRef<HTMLSpanElement>(null);
  const timer = useRef(0);
  const press = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false); // the click that ends a drag isn't a pick
  useEffect(() => () => clearTimeout(timer.current), []);
  const Cat = CATEGORY_ICON[a.category];
  const stop = () => {
    clearTimeout(timer.current);
    setLive(null);
    setShown(false);
  };

  return (
    <li
      className="group relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !fine) return;
        timer.current = window.setTimeout(() => setLive({ scale: (thumb.current?.clientWidth ?? 120) / PAGE.w }), 350);
      }}
      onPointerLeave={stop}
    >
      <button
        type="button"
        ref={cardRef}
        draggable={false}
        onPointerDown={(e) => {
          dragged.current = false;
          if (screen && onDrag && e.button === 0 && e.pointerType !== "touch") press.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
          press.current = null;
          dragged.current = true;
          stop();
          onDrag?.(a.id, e.clientX, e.clientY);
        }}
        onPointerUp={() => (press.current = null)}
        onClick={() => (dragged.current ? (dragged.current = false) : onPick())}
        aria-current={on || undefined}
        title={a.blurb}
        className={`block w-full select-none rounded-lg text-left ${screen && onDrag ? "cursor-grab" : ""}`}
      >
        <span
          ref={thumb}
          className={`relative block aspect-[4/3] overflow-hidden rounded-lg bg-canvas transition-shadow duration-150 ${
            on ? "shadow-[0_0_0_1.5px_var(--fg)]" : "shadow-[0_0_0_1px_var(--line)] group-hover:shadow-[0_0_0_1px_var(--line-strong)]"
          }`}
        >
          {poster ? (
            <img src={`/thumbs/${a.id}-${dark ? "dark" : "light"}.webp`} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setPoster(false)} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center text-fg-3">
              <Cat size={22} />
            </span>
          )}
          {live && (
            <iframe
              src={previewSrc(a)}
              title=""
              aria-hidden
              tabIndex={-1}
              onLoad={() => setTimeout(() => setShown(true), 150)}
              className="pointer-events-none absolute left-0 origin-top-left border-0 transition-opacity duration-200"
              style={{ width: PAGE.w, height: PAGE.h, top: -cropTop(a) * live.scale, transform: `scale(${live.scale})`, opacity: shown ? 1 : 0 }}
            />
          )}
          {edited && (
            <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-fg shadow-[0_0_0_1.5px_var(--surface)]">
              <span className="sr-only">(tuned)</span>
            </span>
          )}
        </span>
        <span className={`mt-1.5 block truncate px-0.5 text-caption font-medium ${on ? "text-fg" : "text-fg-2 group-hover:text-fg"}`}>{a.name}</span>
      </button>
      {screen && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${a.name} to the screen`}
          className="press absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-surface text-fg shadow-sm hover:bg-surface-2"
        >
          <Plus size={13} weight="bold" aria-hidden />
        </button>
      )}
    </li>
  );
}
