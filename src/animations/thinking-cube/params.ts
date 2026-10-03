// Thinking Cube — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  loop: true,
  restMs: 1800,
  seed: 1,
  moves: 12,
  coreHoldMs: 1400,
  spawnMs: 460,
  staggerMs: 120,
  settleMs: 700,
  turnMs: 380,
  turnGapMs: 110,
  turnEase: "cubic-bezier(0.32, 0.72, 0, 1)",
  spinSeconds: 20,
  tilt: -24,
  cell: 34,
  seam: 4,
  inner: "#141417",
  right: "#e0392c",
  left: "#ef7d21",
  up: "#f2f2ef",
  down: "#f4cf2a",
  front: "#199e4a",
  back: "#1a5ecb",
};

export type Params = typeof params;
