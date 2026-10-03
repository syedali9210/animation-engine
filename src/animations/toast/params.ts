// Toast Stack — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  pushMs: 1500,
  lifeMs: 4000,
  enterMs: 300,
  exitMs: 200,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  visible: 3,
  peek: 14,
  stackScale: 0.05,
  gap: 10,
  flick: 0.11,
  desktopPosition: "bottom-right",
  shimmer: "transform",
};

export type Params = typeof params;
