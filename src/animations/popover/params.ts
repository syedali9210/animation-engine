// Popover Menu — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  intervalMs: 2400,
  enterMs: 180,
  exitMs: 120,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  scaleFrom: 0.95,
  originAware: true,
  staggerMs: 0,
  phoneAs: "action sheet",
  shimmer: "transform",
};

export type Params = typeof params;
