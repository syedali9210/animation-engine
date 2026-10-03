// Modal — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  intervalMs: 3000,
  enterMs: 200,
  exitMs: 150,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  scaleFrom: 0.96,
  width: 420,
  radius: 18,
  backdrop: 0.45,
  blur: 0,
  phoneAs: "docked",
  shimmer: "transform",
};

export type Params = typeof params;
