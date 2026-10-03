import type { ComponentType } from "react";

export type Value = string | number | boolean;
export type Values = Record<string, Value>;

/** What a param means to the suggestion rules (Emil Kowalski's timing/easing guidance). */
export type Role = "enter" | "exit" | "press" | "ui" | "stagger" | "scaleFrom" | "bounce" | "blur" | "dpr" | "resolution";
/** `limit`: the longest a "ui"/"enter" duration should run here (Emil: 300ms default; modals and drawers up to 500ms). */
type Base = { label: string; group?: string; hint?: string; reload?: boolean; role?: Role; limit?: number };
export type ParamSpec = Base &
  (
    | { type: "color" }
    | { type: "number"; min: number; max: number; step?: number; unit?: string }
    | { type: "select"; options: string[] }
    | { type: "boolean" }
    | { type: "text" }
    | { type: "easing" }
  );

export const CATEGORIES = [
  "Shaders & GPU",
  "Characters",
  "Chat & AI",
  "Cards & Reveals",
  "Navigation",
  "Celebration",
  "UI Patterns",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** How it behaves, in Emil Kowalski's terms: what starts it, and how often a user sees it. */
export type Trigger = "ambient" | "interaction" | "hover" | "gesture" | "sequence" | "state";
export type Frequency = "constant" | "frequent" | "occasional" | "rare";

export interface AnimMeta {
  /** Folder name — filled in by the registry. */
  id: string;
  name: string;
  category: Category;
  tech: string[];
  blurb: string;
  /** Where the original lives on disk. */
  source: string;
  behavior: { trigger: Trigger; frequency: Frequency };
  /** What the original source does under prefers-reduced-motion. */
  reducedMotion: "full" | "partial" | "none";
  reducedMotionNote: string;
  params: Values;
  schema: Record<string, ParamSpec>;
  /** React animations: the component receives the live values as `p`. */
  load?: () => Promise<{ default: ComponentType<{ p: any }> }>;
  /** Static-page animations live in /public/anim/<id>/index.html. */
  html?: boolean;
  layout?: "center" | "fill";
  /** A UI element users meet over and over — Emil's sub-300ms rules apply. */
  ui?: boolean;
  /** Set when part of it animates a keyboard-initiated action (describes which). */
  keyboard?: string;
  /** Whether hover effects are gated behind (hover: hover) and (pointer: fine). */
  hover?: "gated" | "ungated";
  deps?: string[];
  /** Other animation folders this one imports (bundled into its export). */
  includes?: string[];
  /** Files from /public bundled into the export. */
  assets?: string[];
}

const found = import.meta.glob<{ default: Omit<AnimMeta, "id"> }>("./animations/*/meta.ts", { eager: true });

export const ANIMS: AnimMeta[] = Object.entries(found)
  .map(([path, mod]) => ({ ...mod.default, id: path.split("/")[2] }))
  .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));

export const byId = (id: string | null) => ANIMS.find((a) => a.id === id);

export const htmlUrl = (a: AnimMeta) => `/anim/${a.id}/index.html`;

/** Defaults, plus whatever the user changed. */
export const withDefaults = (a: AnimMeta, v?: Values): Values => ({ ...a.params, ...v });
