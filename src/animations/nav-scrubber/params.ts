// Nav Scrubber — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  items: "Intro, Details, Gallery, Notes, Credits",
  ticks: 24,
  autoplay: true,
  intervalMs: 1200,
  moveMs: 300,
  easing: "cubic-bezier(0, 0, 0.2, 1)",
  accent: "#db744f",
};

export type Params = typeof params;
