// Drawer — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  intervalMs: 3200,
  side: "left",
  width: 320,
  enterMs: 350,
  exitMs: 240,
  easing: "cubic-bezier(0.32, 0.72, 0, 1)",
  backdrop: 0.4,
  shimmer: "transform",
};

export type Params = typeof params;
