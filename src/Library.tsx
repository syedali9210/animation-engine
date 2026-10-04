import { useEffect, useRef, useState, type RefObject } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { ANIMS, CATEGORIES, type Values } from "./registry";
import { CATEGORY_ICON, IconButton, Kbd, Logo } from "./ui";

export default function Library({
  id,
  onPick,
  overrides,
  searchRef,
  onClose,
  visible,
  adding,
  onDrag,
}: {
  id: string;
  onPick: (id: string) => void;
  overrides: Record<string, Values>;
  searchRef: RefObject<HTMLInputElement | null>;
  /** set when it's a drawer */
  onClose?: () => void;
  visible: boolean;
  /** Screen builder: a click adds the animation to the screen instead of opening it */
  adding?: boolean;
  /** start dragging an animation out towards a screen (mouse and pen; touch adds with a tap) */
  onDrag?: (id: string, x: number, y: number) => void;
}) {
  const [query, setQuery] = useState("");
  const current = useRef<HTMLButtonElement>(null);
  const press = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragged = useRef(false); // the click that ends a drag isn't a pick
  // keep the animation you're looking at in view: on open, and when [ ] steps through the list
  useEffect(() => {
    if (!visible) return;
    const f = requestAnimationFrame(() => current.current?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(f);
  }, [visible, id]);
  const q = query.trim().toLowerCase();
  const list = ANIMS.filter((a) => !q || [a.name, a.blurb, a.category, ...a.tech].join(" ").toLowerCase().includes(q));
  const groups = CATEGORIES.map((c) => [c, list.filter((a) => a.category === c)] as const).filter(([, l]) => l.length);
  const edited = (aid: string) => Object.entries(overrides[aid] ?? {}).some(([k, v]) => v !== ANIMS.find((a) => a.id === aid)?.params[k]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b pl-4 pr-2">
        <Logo size={22} />
        <h1 className="text-title font-semibold tracking-[-0.01em]">Animation Engine</h1>
        {onClose && (
          <span className="ml-auto">
            <IconButton label="Close library" size="lg" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </span>
        )}
      </div>
      <div className="px-3 pb-1 pt-3">
        <label className="flex h-9 items-center gap-2 rounded-lg bg-surface-2 px-3 text-fg-2 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent">
          <MagnifyingGlass size={16} aria-hidden className="shrink-0" />
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
            placeholder="Search animations"
            className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-2 pointer-coarse:text-[16px] [&::-webkit-search-cancel-button]:hidden"
          />
          <span className="pointer-coarse:hidden">
            <Kbd>/</Kbd>
          </span>
        </label>
      </div>
      <nav aria-label="Animations" className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {groups.map(([c, items]) => {
          const CatIcon = CATEGORY_ICON[c];
          return (
            <section key={c} aria-label={c}>
              <h2 className="flex items-center gap-2 px-2.5 pb-1.5 pt-4 text-caption font-medium text-fg-3">
                <CatIcon size={14} aria-hidden />
                {c}
                <span className="ml-auto tabular-nums">{items.length}</span>
              </h2>
              <ul>
                {items.map((a) => {
                  const on = !adding && a.id === id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        ref={on ? current : undefined}
                        draggable={false}
                        onPointerDown={(e) => {
                          dragged.current = false;
                          if (onDrag && e.button === 0 && e.pointerType !== "touch") press.current = { id: a.id, x: e.clientX, y: e.clientY };
                        }}
                        onPointerMove={(e) => {
                          const p = press.current;
                          if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
                          press.current = null;
                          dragged.current = true;
                          onDrag?.(p.id, e.clientX, e.clientY);
                        }}
                        onPointerUp={() => (press.current = null)}
                        onClick={() => (dragged.current ? (dragged.current = false) : onPick(a.id))}
                        aria-current={on || undefined}
                        aria-label={adding ? `Add ${a.name} to the screen` : undefined}
                        className={`group flex w-full select-none items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-100 pointer-coarse:py-2.5 ${on ? "bg-surface-3" : "hover:bg-surface-2"} ${adding && onDrag ? "cursor-grab" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-body ${on ? "font-medium text-fg" : "text-fg-2 group-hover:text-fg"}`}>{a.name}</span>
                          <span className={`block truncate text-caption ${on ? "text-fg-2" : "text-fg-3"}`}>{a.tech.slice(0, 3).join(" · ")}</span>
                        </span>
                        {edited(a.id) && !adding && (
                          <>
                            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span className="sr-only">(tuned)</span>
                          </>
                        )}
                        {adding && (
                          <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-fg-3 group-hover:bg-surface-3 group-hover:text-fg">
                            <Plus size={14} weight="bold" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!groups.length && <p className="px-3 py-10 text-center text-body text-fg-3">Nothing matches “{query}”.</p>}
      </nav>
      <div className="flex h-11 shrink-0 items-center justify-between border-t px-4 text-caption text-fg-3">
        <span>{ANIMS.length} animations</span>
        <span className="flex items-center gap-1 pointer-coarse:hidden">
          <Kbd>[</Kbd>
          <Kbd>]</Kbd>
          <span className="ml-1">to step</span>
        </span>
      </div>
    </div>
  );
}
