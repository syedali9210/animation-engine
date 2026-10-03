// Wallet Card — every tunable property. The Animation Engine rewrites this file on export.
export const params = {
  autoplay: true,
  loopMs: 9000,
  demoNumber: "4321 8765 2109 6543",
  demoName: "Syed Ali",
  bank: "hdfc",
  sheetStiffness: 320,
  sheetDamping: 34,
  blur: 28,
  backdropMs: 400,
  hopStiffness: 500,
  hopDamping: 24,
  washMs: 700,
  networkCycleMs: 2600,
  tileFlipMs: 400,
  tileStaggerMs: 35,
};

export type Params = typeof params;
