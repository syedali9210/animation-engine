// vgpu Detail Maps — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  kind: "metal",
  channel: "Composite",
  seed: 1,
  zoom: 1,
  contrast: 1.4,
  animate: true,
  drift: 0.02,
  low: "",
  high: "",
  resolution: 0.5,
};

export type Params = typeof params;
