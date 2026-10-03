// Bottom Sheet — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  intervalMs: 3600,
  enterMs: 450,
  exitMs: 300,
  easing: "cubic-bezier(0.32, 0.72, 0, 1)",
  exitEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
  flick: 0.11,
  heightPct: 55,
  radius: 24,
  backdrop: 0.4,
  desktopAs: "dialog",
  scaleFrom: 0.96,
  sheetColor: "",
  shimmer: "transform",
};

export type Params = typeof params;
